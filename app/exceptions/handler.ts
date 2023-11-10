/*
|--------------------------------------------------------------------------
| Http Exception Handler
|--------------------------------------------------------------------------
|
| AdonisJs will forward all exceptions occurred during an HTTP request to
| the following class. You can learn more about exception handling by
| reading docs.
|
| The exception handler extends a base `HttpExceptionHandler` which is not
| mandatory, however it can do lot of heavy lifting to handle the errors
| properly.
|
*/

import Logger from "@ioc:Adonis/Core/Logger";
import HttpExceptionHandler from "@ioc:Adonis/Core/HttpExceptionHandler";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import NoPermissionException from "App/exceptions/NoPermissionException";

const ignoreStacksOf = [
	NoPermissionException,
];

export default class ExceptionHandler extends HttpExceptionHandler {
	constructor () {
		super(Logger);
	}
	
	public async handle(error: any, ctx: HttpContextContract): Promise<any> {
		// If the error is an instance of anything in the ignoreStacksOf array, then
		// we can just delete the stack property to prevent it from being sent to the
		// client.
		if (ignoreStacksOf.some((e) => error instanceof e)) {
			delete error.stack;
		}

		await super.handle(error, ctx);

		// Assign the error code to the response body
		ctx.response.lazyBody[0] = Object.assign({ code: error.status, }, ctx.response.lazyBody[0]);
	}
}
