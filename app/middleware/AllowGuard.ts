import { AuthenticationException } from "@adonisjs/auth/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import SessionRequiredException from "App/exceptions/SessionRequiredException";
import { AuthorizationType } from "../contracts/AuthorizationContract";

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
                throw new AuthenticationException("You need to be logged in to access this endpoint.", "E_SESSION_REQUIRED", "web");
            }
        }

        await next();
    }
}