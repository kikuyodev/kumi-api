import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import Account from "../models/Account";

export default class RankingsController {
    public async fetch({ request }: HttpContextContract) {
        const { id } = request.params();
        const payload = await request.validate({
            schema: schema.create({
                page: schema.number.optional(),
                limit: schema.number.optional([
                    rules.range(100, 1000)
                ]),
                country: schema.string.optional(),
                type: schema.enum.optional(["ranked", "total"])
            })
        });

        const accountQuery = Account.query()
            .orderBy(payload.type == "ranked" ? "ranked_score" : "total_score", "desc")

        if (payload.country)
            accountQuery.where("country_code", payload.country.toUpperCase());
    
        const accounts = await accountQuery.paginate(payload.page ?? 1, payload.limit ?? 100);
        accounts.baseUrl("/api/v1/rankings");

        return {
            code: 200,
            ...accounts.serialize()
        };
    }
}