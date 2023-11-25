import Logger from "@ioc:Adonis/Core/Logger";
import { Exception } from "@adonisjs/core/build/standalone";
import Account from "../../models/Account";
import { StreamZipAsync } from "node-stream-zip";
import { ChartStatus } from "App/models/charts/Chart";
import { unlinkSync } from "fs";

const KCH_HEADER = Buffer.from("#KUMI CHART FORMAT v1");

export class ChartParser {
    private _data: Buffer;
    
    constructor(data: Buffer) {
        this._data = data;
    }

    public async parseFile() {
        const stringData = this._data.toString();
        let section = "";
        const chartData: any = {
            metadata: {},
            chart: {
                chartSetId: -1,
                chartId: -1,
                previewTime: 0,
                creators: []
            },
            events: [],
            notes: [],
            timing: {
                bpms: [],
            },
            expectedBackgroundFile: "",
            originalData: stringData,
        };

        // split the data into lines
        const lines = stringData.trim().split("\n");

        for (let line of lines) {
            if (!line)
                continue;

            line = line.trim();

            // check if the line is a section header
            if (line.startsWith("[#") && line.endsWith("]")) {
                section = line.slice(2, line.length - 1).toLowerCase();
                continue;
            }

            const [key, value] = line.split(/\s?=\s?/g);

            if (!value && ["chart", "metadata"].includes(section))
                continue;

            switch (section) {
                case "metadata":
                    // parse the metadata
                    this.parseMetadata(chartData.metadata, key.toLowerCase(), value);
                    break;

                case "chart":
                    // parse the chart data
                    this.parseChart(chartData.chart, key.toLowerCase(), value);
                    break;

                case "events":
                    // we only want the initial setter
                    // 0 is the set background event
                    if (!line.startsWith("0,")) {
                        chartData.events.push(line);
                        continue;
                    }

                    // split by only the first comma
                    chartData.events.push(line);
                    const file = line.split(",").slice(1).join(",");

                    if (file.startsWith("\"") && file.endsWith("\"")) {
                        chartData.expectedBackgroundFile = file.slice(1, file.length - 1);
                    } else {
                        chartData.expectedBackgroundFile = file;
                    }

                    break;

                case "timings":
                    // parse the timing data
                    // we only want uninherited timing points
                    if (!line.startsWith("0,"))
                        continue;

                    const timingValues = line.split(",");
                    
                    if (timingValues.length < 3)
                        continue;
                    
                    // the 3rd value is the BPM
                    chartData.timing.bpms.push(parseFloat(timingValues[2]));
                    break;

                case "notes":
                    const noteValues = line.split(",");

                    if (noteValues.length < 2)
                        continue;
                    
                    // TODO: only accept certain types of notes
                    const note = {
                        type: parseInt(noteValues[0]),
                        start: parseFloat(noteValues[1]),
                        end: noteValues.length > 3 ? parseFloat(noteValues[2]) : null,
                    };

                    chartData.notes.push(note);
                    break;

                default:
                    break;
            }
        }

        return chartData;
    }

    private parseMetadata(metadata: any, key: string, value: string) {
        switch (key) {
            case "artist":
                metadata.artist = value;
                break;

            case "artist_romanized":
            case "artist_romanised":
                metadata.artistRomanised = value;
                break;

            case "title":
                metadata.title = value;
                break;

            case "title_romanized":
            case "title_romanised":
                metadata.titleRomanised = value;
                break;

            case "source":
                metadata.source = value;
                break;

            // Not actually used at the moment

            // Only concern against adding it is that it shouldn't be required in any
            // ranking criteria because you can't *really* search for the original
            // source using the romanised version of it's title.
            case "source_romanized":
            case "source_romanised":
                metadata.sourceRomanised = value;
                break;

            case "tags":
                metadata.tags = value;
                break;
        }
    }

    private async parseChart(chartData: any, key: string, value: string) {
        switch (key) {
            case "creator":
                chartData.creators.push(value);
                break;

            case "creators":
                const values = value.split(/\s?,\s?/g);

                chartData.creators.push(...values);
                break;

            case "difficulty_name":
                chartData.difficultyName = value;
                break;

            case "initial_scroll_speed":
                chartData.initialScrollSpeed = parseFloat(value);
                break;

            case "preview_time":
                chartData.previewTime = parseFloat(value);
                break;

            case "music_file":
                chartData.musicFile = value;
                break;

            case "chart_set_id":
                chartData.chartSetId = parseInt(value);
                break;

            case "chart_id":
                chartData.chartId = parseInt(value);
                break;
        }

        // ensure that the chart set and chart id are set to -1 if they are not present
        if (!chartData.chartSetId) {
            chartData.chartSetId = -1;
        } else if (!chartData.chartId) {
            chartData.chartId = -1;
        }
    }

    public static async fromZip(payload: any, set: StreamZipAsync) {
        const entries = Object.values(await set.entries());
        const charts: any[] = [];

        // Sort entries by time from oldest to newest
        // Ideally, the oldest chart should be used for the base
        // when it comes to metadata, and checking for who should
        // be credited for the chart.
        entries.sort((a, b) => a.time - b.time);

        for (const entry of entries) {
            const data = await set.entryData(entry.name);

            // Check if the file is a KCH file
            if (data.subarray(0, KCH_HEADER.length).toString() !== KCH_HEADER.toString()) {
                continue;
            }

            try {
                Logger.trace("parsing chart file.", {
                    name: entry.name,
                    size: entry.size,
                    time: entry.time,
                });
                const parser = new ChartParser(data);
                const chartData = await parser.parseFile();
                chartData.file = entry.name;
                chartData.status = payload.status ?? ChartStatus.Pending;

                Logger.trace("finished parsing chart file.");

                // check for the audio file
                // and also the background file
                chartData.music = await set.entryData(chartData.chart.musicFile);
                chartData.musicFile = chartData.chart.musicFile;
                chartData.background = await set.entryData(chartData.expectedBackgroundFile);

                console.log(chartData);

                charts.push(chartData);
            } catch (e: any) {
                await set.close();
                unlinkSync(payload.set.filePath!);

                // rethrow the error
                throw e;
            }
        }

        await set.close();
        unlinkSync(payload.set.filePath!);

        return charts;
    }
    
    public static async createCreatableCharts(charts: any[], basis: any) {
        const chartsToCreate: any[] = [];

        for (const chart of charts) {
            // check if the metadata is the same as the basis
            // if it isn't throw an error
            if (chart.metadata.artist !== basis.metadata.artist ||
                chart.metadata.artistRomanised !== basis.metadata.artistRomanised ||
                chart.metadata.title !== basis.metadata.title ||
                chart.metadata.titleRomanised !== basis.metadata.titleRomanised ||
                chart.metadata.source !== basis.metadata.source ||
                chart.metadata.sourceRomanised !== basis.metadata.sourceRomanised ||
                chart.metadata.tags !== basis.metadata.tags) {
                throw new Exception("The metadata for all charts must be the same.", 400, "E_METADATA_MISMATCH");
            }

            // get the chart creators by username
            for (const creator of chart.chart.creators) {
                const user = await Account.findBy("username", creator);

                if (!user) {
                    throw new Exception(`The user ${creator} does not exist, but was specified as a creator.`, 400, "E_USER_NOT_FOUND");
                }
            }

            const data = {
                chartSetId: 0,
                artist: chart.metadata.artist,
                title: chart.metadata.title,
                source: chart.metadata.source,
                tags: chart.metadata.tags,
                status: chart.status,
                difficultyName: chart.chart.difficultyName,
                difficulty: {
                    bpms: chart.timing.bpms,
                    difficulty: 0,
                },
                creators: chart.chart.creators,
                romanisedMetadata: {
                    artist_romanised: chart.metadata.artistRomanised,
                    title_romanised: chart.metadata.titleRomanised,
                    source_romanised: chart.metadata.sourceRomanised,
                },
                notes: chart.notes,
                music: chart.music,
                background: chart.background,
                musicFile: chart.musicFile,
                expectedBackgroundFile: chart.expectedBackgroundFile,
                mapChecksum: "",
                originalData: chart.originalData,
            };

            Logger.trace("finished processing chart file.", data);
            chartsToCreate.push(data);
        }

        return chartsToCreate;
    }
}