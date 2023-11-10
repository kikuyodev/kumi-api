import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import WebsocketService from "App/services/WebsocketService";
import { randomBytes } from "crypto";

export default class WebsocketController {
    public async fetchToken({ auth }: HttpContextContract) {
        // generate random token
        const token = randomBytes(48).toString("hex");
        WebsocketService.addExpectedToken(token, auth.user!);

        return {
            code: 200,
            data: {
                token,
            }
        };
    }

    public async check() {
        
    }
}