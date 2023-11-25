import Application from "@ioc:Adonis/Core/Application";
import Drive from "@ioc:Adonis/Core/Drive";
import { writeFile } from "fs/promises";
import { unlinkSync } from "fs";
import { ffmpeg, probe } from "eloquent-ffmpeg";
import { createHash } from "crypto";
import MeiliSearch from "App/services/MeiliSearch";
import Account from "../../models/Account";
import Chart, { ChartStatus } from "../../models/charts/Chart";
import ChartSet from "../../models/charts/ChartSet";

export class ChartProcessor {
    public static async initCharts(databaseSet: ChartSet, charts: Chart[], chartsToCreate: any[], user: Account) {
        let idx = 0;
        
        for (const chart of charts) {
            // add the author as the default creator
            await chart.related("creators").attach([user.id]);

            // replace the chart id & set id in the original file
            const setIdRegex = new RegExp("(?:CHART_SET_ID|chart_set_id)\\s?=\\s?-1", "g");
            const idRegex = new RegExp("(?:CHART_ID|chart_id)\\s?=\\s?-1", "g");
            let chartDataString = chartsToCreate[idx].originalData;

            chartDataString = chartDataString.replace(setIdRegex, `CHART_SET_ID = ${chart.chartSetId}`);
            chartDataString = chartDataString.replace(idRegex, `CHART_ID = ${chart.id}`);

            const buffer = Buffer.from(chartDataString);

            await ChartProcessor.pushChartFiles(databaseSet!.id, `${chart.id}.kch`, buffer);

            chart.mapChecksum = createHash("sha256").update(buffer).digest("hex");

            await ChartProcessor.saveStatisticsFor(chart, chartsToCreate[idx]);
            await chart.save();
            idx++;
        }
    }

    public static async pushChartFiles(setId: number, file: string, data: Buffer) {
        await Drive.put(`sets/${setId}/${file}`, data);
    }

    public static async saveStatisticsFor(chart: Chart, dataChart: any) {
        // probe the chart's music file to get the duration
        const tempPath = Application.tmpPath(`music/${chart.id}`);
        await writeFile(tempPath, dataChart.music);
        
        const probeResult = await probe(tempPath);
        chart.statistics = {
            drain_length: 0,
            total_length: 0,
            music_length: 0,
            notes: [],
            note_count: 0
        }

        chart.statistics.music_length = probeResult.duration;

        // get the length according to the very last note
        const lastNote = dataChart.notes[dataChart.notes.length - 1];

        if (lastNote) {
            chart.statistics.drain_length = lastNote.end ?? lastNote.start;
            chart.statistics.total_length = lastNote.end ?? lastNote.start;
        }

        chart.statistics.notes = dataChart.notes;
        chart.statistics.note_count = dataChart.notes.length;
    }
    
    public static async savePreviewAudio(setId: number, previewTime: number, data: any) {
        // save the file to a temporary location
        // and then use ffmpeg to create a preview
        const file = Application.tmpPath(`previews/${setId}`);
        await writeFile(file, data);
        
        const probeResult = await probe(file);

        if (previewTime == 0) {
            previewTime = probeResult.duration * 0.4;
            console.log(probeResult)
        }

        const cmd = ffmpeg()

        cmd
            .input(file)
            .start(previewTime)
            .duration(10000)
        
        cmd.output(Application.tmpPath(`files/previews/${setId}.${probeResult.format}`));

        const proc = await cmd.spawn()
        await proc.complete();

        // delete the temporary file
        unlinkSync(file);
    }

    public static async indexChartSet(chartSet: ChartSet) {
        const index = MeiliSearch.index("chartsets");
        const set =
        {
            id: chartSet.id,
            artist: chartSet.artist,
            artist_romanized: chartSet.romanisedMetadata?.artist_romanised,
            title: chartSet.title,
            title_romanized: chartSet.romanisedMetadata?.title_romanised,
            source: chartSet.source,
            source_romanized: chartSet.romanisedMetadata?.source_romanised,
            tags: chartSet.tags,
            status: Object.keys(ChartStatus).find((key) => ChartStatus[key] === chartSet.status),
            creators: chartSet.charts.reduce((acc, chart) => {
                const creators = chart.creators.map((creator) => creator.username);
                acc.push(...creators.filter((creator) => !acc.includes(creator)));

                return acc;
            }, [] as string[]),
            bpm: chartSet.charts[0]?.difficulty.bpms,
            length: chartSet.charts[0]?.statistics.music_length,
            drain: chartSet.charts[0]?.statistics.drain_length,
        }

        return index.updateDocuments([set]);
    }
}