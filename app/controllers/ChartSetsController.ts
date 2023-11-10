import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import ChartSet from "App/models/ChartSet";
import Logger from "@ioc:Adonis/Core/Logger";
import NoPermissionException from "App/exceptions/NoPermissionException";
import { Permissions } from "App/util/Constants";
import Database from "@ioc:Adonis/Lucid/Database";
import { ChartStatus } from "App/models/Chart";

export default class ChartSetsController {
    public async fetch({ request }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        Logger.trace("fetching chart set", chartSet);

        return {
            code: 200,
            data: {
                set: chartSet.serialize()
            }
        };
    }

    public async nominate({ request, auth }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!auth.user?.has(Permissions.NOMINATE_CHARTS)) {
            throw new NoPermissionException("NOMINATE_CHARTS");
        }

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        if (chartSet.status !== ChartStatus.Pending) {
            throw new Exception("This set is not pending.", 400, "E_SET_NOT_PENDING");
        }

        if (chartSet.nominators.find((n) => n.id === auth.user?.id)) {
            console.log(chartSet.nominators);
            throw new Exception("You have already nominated this set.", 400, "E_ALREADY_NOMINATED");
        }

        chartSet.related("nominators").attach([auth.user.id]);
        chartSet.save();

        const newChartSet = await ChartSet.findBy("id", id);
        
        if (newChartSet!.nominators.length >= newChartSet!.attributes.nominators_required) {
            // the set has enough nominators, so we can add it to the queue
            newChartSet!.status = ChartStatus.Qualified;

            for (const chart of newChartSet!.charts) {
                chart.status = ChartStatus.Qualified;
                chart.save();
            }

            newChartSet!.save();

            // ranked in 3 days
            const date = new Date();
            date.setDate(date.getDate() + 3);

            await Database.insertQuery().table("nomination_queue").insert({
                set_id: newChartSet!.id,
                ranked_at: date
            });
        }

        return {
            code: 200,  
            data: {
                set: newChartSet.serialize()
            }
        };
    }
}