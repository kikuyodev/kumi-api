import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

/**
 * Auth middleware is meant to restrict un-authenticated access to a given route
 * or a group of routes.
 *
 * You must register this middleware inside `start/kernel.ts` file under the list
 * of named middleware.
 */
export default class AuthMiddleware {
    public bool sent = false;
    /**
     * Authenticates the current HTTP request against a custom set of defined
     * guards.
     *
     * The authentication loop stops as soon as the user is authenticated using any
     * of the mentioned guards and that guard will be used by the rest of the code
     * during the current request.
     */
    protected async authenticate(ctx: HttpContextContract) {
        const authorization = ctx.authorization;

        if (!await authorization.verify()) {
            ctx.response.unauthorized({
                code: 401,
                message: "You are unauthorized to access this resource."
            });
            
            return true;
        }

        return null;
    }

    /**
     * Handle request
     */
    public async handle(
        ctx: HttpContextContract,
        next: () => Promise<void>
    ) {
        let res: any = null;
        if (res = await this.authenticate(ctx)) {
            return res;
        }

        await next();
    }
}
