import Application from "@ioc:Adonis/Core/Application";
import Drive from "@ioc:Adonis/Core/Drive";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { schema } from "@ioc:Adonis/Core/Validator";
import Account from "App/models/Account";
import Chart, { ChartStatus } from "App/models/Chart";
import ChartSet from "App/models/ChartSet";
import { unlinkSync } from "fs";
import StreamZip from "node-stream-zip";
import { createHash } from "crypto";
import { Exception } from "@adonisjs/core/build/standalone";
import Logger from "@ioc:Adonis/Core/Logger";

const KCH_HEADER = Buffer.from("#KUMI CHART FORMAT v1");

export default class ChartSubmissionsController {
    public static CHART_VERSION = 0;

    public async submit(ctx: HttpContextContract) {
        const { request, auth } = ctx;
        const charts = await this.validateAndParseChartSet(ctx);

        const basis = charts[0];
        let databaseSet: ChartSet | null = null;

        if (!basis) {
            throw new Exception("The provided chart set does not contain any charts.", 400, "E_NO_CHARTS_PROVIDED");
        }

        Logger.trace("processing chart set submission for database entry.", {
            charts: charts.length,
            basis: basis.chart,
            metadata: basis.metadata,
            events: basis.events.length,
            timing: basis.timing,
            background: basis.expectedBackgroundFile,
            music: basis.musicFile,
            status: basis.status,
        });

        const chartsToCreate = await this.createCreatableCharts(charts, basis);
        const user = auth.use("web").user;

        if (basis.chart.chartSetId !== -1) {
            const existingSet = await ChartSet.findBy("id", basis.chart.chartSetId);
            Logger.trace("found existing chart set.", { id: basis.chart.chartSetId });

            if (existingSet) {
                throw new Exception("The chart set you are trying to submit already exists.", 400, "E_SET_ALREADY_EXISTS");
                // TODO: move this to an update endpoint
                /*const ownCharts = existingSet.charts.filter((chart) => chart.creators.find((creator) => creator.id === user!.id) !== undefined);

                if (ownCharts.length === 0) {
                    throw new Exception(403, "You cannot update a chart set that you did not create, or have not contributed to.");
                }

                // filter unsubmitted charts out from the set
                charts = charts.filter((chart) => chart.chart.chartId === -1);*/
            }
        } else {
            Logger.trace("creating new chart set.");

            databaseSet = await ChartSet.create({
                creatorId: user!.id,
                artist: basis.metadata.artist,
                title: basis.metadata.title,
                source: basis.metadata.source,
                description: request.input("description", "No description has been provided!"),
                tags: basis.metadata.tags,
                status: basis.status,
                romanisedMetadata: {
                    artist_romanised: basis.metadata.artistRomanised,
                    title_romanised: basis.metadata.titleRomanised,
                    source_romanised: basis.metadata.sourceRomanised,
                },
            });
        }

        // create the charts
        chartsToCreate.forEach(c => { c.chartSetId = databaseSet!.id; });
        const databaseCharts = await Chart.createMany(chartsToCreate.map(c => {
            const newObject = Object.assign({}, c);

            delete newObject.originalData;

            return newObject;
        }));
        let idx = 0;

        for (const chart of databaseCharts) {
            // add the author as the default creator
            await chart.related("creators").attach([user!.id]);

            // replace the chart id & set id in the original file
            const setIdRegex = new RegExp("(?:CHART_SET_ID|chart_set_id)\\s?=\\s?-1", "g");
            const idRegex = new RegExp("(?:CHART_ID|chart_id)\\s?=\\s?-1", "g");
            let chartDataString = chartsToCreate[idx].originalData;

            chartDataString = chartDataString.replace(setIdRegex, `CHART_SET_ID = ${chart.chartSetId}`);
            chartDataString = chartDataString.replace(idRegex, `CHART_ID = ${chart.id}`);

            const buffer = Buffer.from(chartDataString);

            await this.pushChartFiles(databaseSet!.id, `${chart.id}.kch`, buffer);
            idx++;

            chart.mapChecksum = createHash("sha256").update(buffer).digest("hex");
            await chart.save();
        }

        Logger.trace("storing music and background files.", {
            background: basis.expectedBackgroundFile,
            music: basis.musicFile,
        });

        // add the basis files
        await this.pushChartFiles(databaseSet!.id, basis.expectedBackgroundFile, basis.background);
        await this.pushChartFiles(databaseSet!.id, basis.musicFile, basis.music);

        // update the internal data of the set
        databaseSet!.internalData = {
            background: basis.expectedBackgroundFile,
            background_hash: createHash("sha256").update(basis.background).digest("hex"),
            music: basis.musicFile,
            music_hash: createHash("sha256").update(basis.music).digest("hex"),
        };

        Logger.trace("saving chart set to database.", databaseSet!.serialize());
        await databaseSet?.save();

        // to get charts alongside the set
        const newDatabaseSet = await ChartSet.findBy("id", databaseSet!.id);

        return {
            code: 200,
            message: "The chart set has been submitted successfully!",
            data: {
                set: newDatabaseSet?.serialize()
            },
            meta: {
                charts: databaseCharts.map((chart, idx) => {
                    const chartFile = charts[idx];
                    return {
                        chart: {
                            id: chart.id,
                        },
                        original_hash: createHash("sha256").update(chartFile.originalData).digest("hex"),
                    };
                })
            }
        };
    }

    public async update(ctx: HttpContextContract) {
        const { request, auth } = ctx;
        const charts = await this.validateAndParseChartSet(ctx);
        const basis = charts[0];

        if (!basis) {
            throw new Exception("The provided chart set does not contain any charts.", 400, "E_NO_CHARTS_PROVIDED");
        }

        if (basis.chart.chartSetId === -1) {
            throw new Exception("The chart set you are trying to update does not exist.", 400, "E_SET_NOT_FOUND");
        }

        const existingSet = await ChartSet.findBy("id", basis.chart.chartSetId);

        if (!existingSet) {
            throw new Exception("The chart set you are trying to update does not exist.", 400, "E_SET_NOT_FOUND");
        }

        if (existingSet.creatorId !== auth.use("web").user!.id) {
            throw new Exception("You cannot update a chart set that you did not create.", 403, "E_SET_NOT_OWNED");
        }

        const newCharts: any[] = [];
        const seenIds: number[] = [];
        const filesToAdd: Map<string, Buffer> = new Map();

        for (const chart of charts) {
            if (await Drive.exists(`sets/${existingSet.id}/${chart.expectedBackgroundFile}`) === false) {
                filesToAdd.set(chart.expectedBackgroundFile, chart.background);
            } else {
                const hash = createHash("sha256").update(chart.background).digest("hex");
                const existingFile = await Drive.get(`sets/${existingSet.id}/${chart.expectedBackgroundFile}`);
                const existingHash = createHash("sha256").update(existingFile).digest("hex");

                if (hash !== existingHash) {
                    await this.pushChartFiles(existingSet.id, chart.expectedBackgroundFile, chart.background);
                }
            }

            if (await Drive.exists(`sets/${existingSet.id}/${chart.musicFile}`) === false) {
                filesToAdd.set(chart.musicFile, chart.music);
            } else {
                const hash = createHash("sha256").update(chart.music).digest("hex");
                const existingFile = await Drive.get(`sets/${existingSet.id}/${chart.musicFile}`);
                const existingHash = createHash("sha256").update(existingFile).digest("hex");

                if (hash !== existingHash) {
                    await this.pushChartFiles(existingSet.id, chart.musicFile, chart.background);
                }
            }

            if (chart.chart.chartId === -1) {
                newCharts.push(chart);
                continue;
            }

            // check if the chart exists in the database
            const existingChart = await Chart.findBy("id", chart.chart.chartId);

            if (!existingChart) {
                newCharts.push(chart);
                continue;
            }

            // assert that the chart is part of the set
            if (existingChart.chartSetId !== existingSet.id) {
                throw new Exception(`The chart file "${chart.file}" is not a part of this set.`, 400, "E_CHART_NOT_PART_OF_SET");
            }

            // check if any of the data has changed
            // if it has, update the database
            const toCheck = ["artist", "title", "source", "tags"];
            const toCheckChart = ["difficultyName", "status"];
            const toCheckMetadata = ["artistRomanised", "titleRomanised", "sourceRomanised"];

            console.log(chart);

            for (const key of toCheck) {
                const pushKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
                if (existingChart[pushKey] !== chart[key]) {
                    existingChart[pushKey] = chart.metadata[key] ?? null;
                }
            }

            for (const key of toCheckChart) {
                const pushKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
                if (existingChart[pushKey] !== chart.chart[key]) {
                    // turn the key into snake case
                    existingChart[pushKey] = chart.chart[key];
                }
            }

            if (existingChart.difficulty.bpms.length !== chart.timing.bpms.length
                || existingChart.difficulty.bpms.some((bpm, idx) => bpm !== chart.timing.bpms[idx])) {
                existingChart.difficulty.bpms = chart.timing.bpms;
            }

            for (const key of toCheckMetadata) {
                const pushKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
                if (existingChart.romanisedMetadata[pushKey] !== chart.metadata[key]) {
                    existingChart.romanisedMetadata[pushKey] = chart.metadata[key];
                }
            }

            // change the checksum of the chart
            existingChart.mapChecksum = createHash("sha256").update(chart.originalData).digest("hex");
            await existingChart.save();

            // add the seens ids
            seenIds.push(existingChart.id);
        }

        // check if there are any charts that need to be removed
        const chartsToRemove = existingSet.charts.filter((chart) => !seenIds.includes(chart.id));

        if (chartsToRemove.length > 0) {
            await Chart.query().whereIn("id", chartsToRemove.map((chart) => chart.id)).delete();

            // delete the file
            for (const chart of chartsToRemove) {
                await Drive.delete(`sets/${existingSet.id}/${chart.id}.kch`);
            }
        }

        const chartsToCreate = await this.createCreatableCharts(charts, basis);
        const user = auth.use("web").user;

        // create the new chart if needed
        const newDatabaseCharts = await Chart.createMany(newCharts.map(c => {
            const newObject = Object.assign({}, c);

            delete newObject.originalData;

            return newObject;
        }));
        let idx = 0;

        for (const chart of newDatabaseCharts) {
            // add the author as the default creator
            await chart.related("creators").attach([user!.id]);

            // replace the chart id & set id in the original file
            const setIdRegex = new RegExp("(?:CHART_SET_ID|chart_set_id)\\s?=\\s?-1", "g");
            const idRegex = new RegExp("(?:CHART_ID|chart_id)\\s?=\\s?-1", "g");
            let chartDataString = chartsToCreate[idx].originalData;

            chartDataString = chartDataString.replace(setIdRegex, `CHART_SET_ID = ${chart.chartSetId}`);
            chartDataString = chartDataString.replace(idRegex, `CHART_ID = ${chart.id}`);

            const buffer = Buffer.from(chartDataString);

            await this.pushChartFiles(existingSet!.id, `${chart.id}.kch`, buffer);
            idx++;

            chart.mapChecksum = createHash("sha256").update(buffer).digest("hex");
            await chart.save();
        }

        if (request.input("description")) {
            existingSet.description = request.input("description");
        }

        if (request.input("status")) {
            existingSet.status = request.input("status");
        }

        // change set metadata to the basis
        existingSet.artist = basis.metadata.artist;
        existingSet.title = basis.metadata.title;
        existingSet.source = basis.metadata.source ?? null;
        existingSet.tags = basis.metadata.tags;
        existingSet.romanisedMetadata = {
            artist_romanised: basis.metadata.artistRomanised,
            title_romanised: basis.metadata.titleRomanised,
            source_romanised: basis.metadata.sourceRomanised,
        };

        // update the internal data of the set
        existingSet!.internalData = {
            background: basis.expectedBackgroundFile,
            background_hash: createHash("sha256").update(basis.background).digest("hex"),
            music: basis.musicFile,
            music_hash: createHash("sha256").update(basis.music).digest("hex"),
        };

        console.log(existingSet);

        Logger.trace("saving chart set to database.", existingSet!.serialize());
        await existingSet?.save();

        // to get charts alongside the set
        const newDatabaseSet = await ChartSet.findBy("id", existingSet!.id);

        return {
            code: 200,
            message: "The chart set has been updated successfully!",
            data: {
                set: newDatabaseSet?.serialize()
            },
            meta: {
                charts: newDatabaseCharts.map((chart, idx) => {
                    const chartFile = charts[idx];
                    return {
                        chart: {
                            id: chart.id,
                        },
                        original_hash: createHash("sha256").update(chartFile.originalData).digest("hex"),
                    };
                })
            }
        };
    }


    private async pushChartFiles(setId: number, file: any, data: any) {
        await Drive.put(`sets/${setId}/${file}`, data);
    }

    private async validateAndParseChartSet({ request }: HttpContextContract) {
        const payload = await request.validate({
            schema: schema.create({
                set: schema.file({
                    extnames: ["zip", "kcs"]
                }),
                description: schema.string.optional(),
                status: schema.enum.optional([ChartStatus.Pending.toString(), ChartStatus.WorkInProgress.toString()] as const),
            }),
            messages: {
                required: "You must provide a chart set to submit to the server.",
            }
        });

        await payload.set.move(Application.tmpPath("data"));

        const set = new StreamZip.async({
            file: payload.set.filePath
        });

        const entries = Object.values(await set.entries());
        const charts: any[] = [];

        Logger.trace("processing chart set submission for file entry.", {
            entries: entries.length,
            status: payload.status ?? ChartStatus.Pending,
        });

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
                const chartData = await this.parseChartFile(data);
                chartData.file = entry.name;
                chartData.status = payload.status ?? ChartStatus.Pending;

                Logger.trace("finished parsing chart file.");

                // check for the audio file
                // and also the background file
                chartData.music = await set.entryData(chartData.chart.musicFile);
                chartData.musicFile = chartData.chart.musicFile;
                chartData.background = await set.entryData(chartData.expectedBackgroundFile);

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

    private async parseChartFile(data: Buffer) {
        const stringData = data.toString();
        let section = "";
        const chartData: any = {
            metadata: {},
            chart: {
                chartSetId: -1,
                chartId: -1,
                creators: []
            },
            events: [],
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

                    // the 3rd value is the BPM
                    chartData.timing.bpms.push(parseFloat(timingValues[2]));
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

    private async createCreatableCharts(charts: any[], basis: any) {
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
                mapChecksum: "",
                originalData: chart.originalData,
            };

            Logger.trace("finished processing chart file.", data);
            chartsToCreate.push(data);
        }

        return chartsToCreate;
    }
}