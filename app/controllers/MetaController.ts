import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Database from "@ioc:Adonis/Lucid/Database";
import WebsocketService from "../services/WebsocketService";

export default class MetaController {
    public async stats(_: HttpContextContract) {
        return {
            code: 200,
            data: {
                statistics: {
                    accounts: {
                        total: parseInt((await Database.rawQuery("SELECT COUNT(*) FROM accounts")).rows[0].count),
                        online: WebsocketService.accountConnections.size
                    },
                    charts: parseInt((await Database.rawQuery("SELECT COUNT(*) FROM charts")).rows[0].count),
                }
            }
        }
    }
}