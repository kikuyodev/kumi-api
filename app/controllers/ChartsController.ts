import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Chart from "App/models/charts/Chart";

export default class ChartsController {
    public async fetch({ request }: HttpContextContract) {
        const { id } = request.params();
        const chart = await Chart.find(id);

        if (!chart)
            throw new Exception("This chart does not exist.", 404, "E_NOT_FOUND");

        return {
            code: 200,
            data: {
                chart: chart.serialize()
            }
        };
    }

    public async fetchScores({ request }: HttpContextContract) {
        const { id } = request.params();
        const chart = await Chart.find(id);

        if (!chart)
            throw new Exception("This chart does not exist.", 404, "E_NOT_FOUND");

        return {
            code: 200,
            data: {
                scores: [] // scores don't exist yet
            }
        };
    }
}