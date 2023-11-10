import { AuthenticationException } from "@adonisjs/auth/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import ApiKeyRequiredException from "App/exceptions/ApiKeyRequiredException";
import SessionRequiredException from "App/exceptions/SessionRequiredException";
import Logger from "@ioc:Adonis/Core/Logger";

export default class AllowGuard {
    public async handle(
        { auth }: HttpContextContract,
        next: () => Promise<void>,
        guards?: string[]
    ) {
        Logger.trace(`AllowGuard: ${guards}`);

        if (guards?.includes("api")) {
            if (auth.use("web").isAuthenticated) {
                throw new SessionRequiredException();
            }

            await auth.use("api").authenticate();
        } else if (guards?.includes("web")) {
            if (auth.use("api").isAuthenticated) {
                throw new ApiKeyRequiredException();
            }

            await auth.use("web").authenticate();

            if (!auth.use("web").isLoggedIn) {
                throw new AuthenticationException("You need to be logged in to access this endpoint.", "E_SESSION_REQUIRED", "web");
            }
        }

        await next();
    }
}