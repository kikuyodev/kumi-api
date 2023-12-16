import { AuthorizationContract } from "App/contracts/AuthorizationContract";

declare module "@ioc:Adonis/Core/HttpContext" {
    interface HttpContextContract {
        authorization: AuthorizationContract;
    }
}