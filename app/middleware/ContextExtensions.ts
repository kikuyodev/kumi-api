import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { AuthorizationContract } from "../contracts/AuthorizationContract";

export default class ContextExtensions {
    public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
        ctx["authorization"] = new AuthorizationContract(ctx);
        
        await next();
    }
}