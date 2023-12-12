import { AuthorizationContract } from "../app/contracts/AuthorizationContract";

declare module "@ioc:Adonis/Core/HttpContext" {
    interface HttpContextContract {
        authorization: AuthorizationContract;
    }
  }