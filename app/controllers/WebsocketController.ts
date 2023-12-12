import Redis from "@ioc:Adonis/Addons/Redis";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { randomBytes } from "crypto";

export default class WebsocketController {
    public async fetchToken({ authorization }: HttpContextContract) {
        // generate random token
        const token = await this.generateToken();

        await Redis.lpush("kumi.server:tokens", token);
        await Redis.set(`kumi.server:tokens:${token}`, authorization.account!.id);

        return {
            code: 200,
            data: {
                token,
            }
        };
    }

    public async generateToken() {
        // generate random token
        const token = randomBytes(48).toString("hex");

        if (await Redis.get(`kumi.server:tokens:${token}`)) {
            // TODO: use lpos instead of this
            // currently its missing from ioredis entirely
            return this.generateToken();
        }

        return token;
    }
        
}