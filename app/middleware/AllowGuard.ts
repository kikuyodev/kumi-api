
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import SessionRequiredException from "App/exceptions/SessionRequiredException";
import { AuthorizationType } from "../contracts/AuthorizationContract";
import { Exception } from "@adonisjs/core/build/standalone";

export default class AllowGuard {
    public async handle(
        { authorization }: HttpContextContract,
        next: () => Promise<void>,
        guards?: string[]
    ) {
        let allowed = authorization.authorized;
        if (!authorization.checked) {
            allowed = await authorization.verify();
        }

        if (guards?.includes("api")) {
            if (!allowed) {
                throw new SessionRequiredException();
            }

            if (authorization.type !== AuthorizationType.Web) {
                throw new Exception("You need to be logged in to access this endpoint.", 401, "E_SESSION_REQUIRED");
            }
        }

        await next();
    }
}