import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

export default class GroupsController {
    public async fetch({ request }: HttpContextContract) {
        const { id } = request.params();
    }
}