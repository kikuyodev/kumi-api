import Application from "@ioc:Adonis/Core/Application";
import Drive from "@ioc:Adonis/Core/Drive";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { schema } from "@ioc:Adonis/Core/Validator";
import Chart, { ChartStatus } from "App/models/charts/Chart";
import ChartSet from "App/models/charts/ChartSet";
import StreamZip from "node-stream-zip";
import { createHash } from "crypto";
import { Exception } from "@adonisjs/core/build/standalone";
import Logger from "@ioc:Adonis/Core/Logger";
import { ChartParser } from "../structures/charts/ChartParser";
import { ChartProcessor } from "../structures/charts/ChartProcessor";
import { DateTime } from "luxon";

export default class ChartSubmissionsController {
    public static CHART_VERSION = 0;

    public async submit(ctx: HttpContextContract) {
        const { request, authorization } = ctx;
        const charts = await this.validateAndParseChartSet(ctx);

        const basis = charts[0];
        let databaseSet: ChartSet | null = null;

        console.log(charts)

        if (!basis || charts.length === 0) {
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

        const chartsToCreate = await ChartParser.createCreatableCharts(charts, basis);
        const user = authorization.account;

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
            delete newObject.music;
            delete newObject.background;
            delete newObject.musicFile;
            delete newObject.expectedBackgroundFile;
            delete newObject.notes;

            console.log(newObject)

            return newObject;
        }));

        await ChartProcessor.initCharts(databaseSet!, databaseCharts, chartsToCreate, user!);

        Logger.trace("storing music and background files.", {
            background: basis.expectedBackgroundFile,
            music: basis.musicFile,
        });

        // add the basis files
        await ChartProcessor.pushChartFiles(databaseSet!.id, basis.expectedBackgroundFile, basis.background);
        await ChartProcessor.pushChartFiles(databaseSet!.id, basis.musicFile, basis.music);

        // update the internal data of the set
        databaseSet!.internalData = {
            background: basis.expectedBackgroundFile,
            background_hash: createHash("sha256").update(basis.background).digest("hex"),
            music: basis.musicFile,
            music_hash: createHash("sha256").update(basis.music).digest("hex"),
        };

        Logger.trace("saving chart set to database.", databaseSet!.serialize());
        await databaseSet?.save();

        const newDatabaseSet = await ChartSet.findBy("id", databaseSet!.id);

        await ChartProcessor.savePreviewAudio(newDatabaseSet!.id, basis.chart.previewTime, basis.music);

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
        const { request, authorization } = ctx;
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

        if (existingSet.creatorId !== authorization.account.id) {
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
                    await ChartProcessor.pushChartFiles(existingSet.id, chart.expectedBackgroundFile, chart.background);
                }
            }

            if (await Drive.exists(`sets/${existingSet.id}/${chart.musicFile}`) === false) {
                filesToAdd.set(chart.musicFile, chart.music);
            } else {
                const hash = createHash("sha256").update(chart.music).digest("hex");
                const existingFile = await Drive.get(`sets/${existingSet.id}/${chart.musicFile}`);
                const existingHash = createHash("sha256").update(existingFile).digest("hex");

                if (hash !== existingHash) {
                    await ChartProcessor.pushChartFiles(existingSet.id, chart.musicFile, chart.background);
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
            for (const chartRemove of await Chart.query().whereIn("id", chartsToRemove.map((chart) => chart.id))) {
                chartRemove.deletedAt = DateTime.now();
                await chartRemove.save();
            }

            // delete the file
            for (const chart of chartsToRemove) {
                await Drive.delete(`sets/${existingSet.id}/${chart.id}.kch`);
            }
        }

        const chartsToCreate = await ChartParser.createCreatableCharts(charts, basis);
        const user = authorization.account;

        // create the new chart if needed
        const newDatabaseCharts = await Chart.createMany(newCharts.map(c => {
            const newObject = Object.assign({}, c);

            delete newObject.originalData;

            return newObject;
        }));

        await ChartProcessor.initCharts(existingSet!, newDatabaseCharts, chartsToCreate, user!);

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
        await ChartProcessor.indexChartSet(newDatabaseSet!);

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

        Logger.trace("processing chart set submission for file entry.");
        return await ChartParser.fromZip(payload, set);
    }
}