import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import Account from "App/models/Account";

export default class AccountsController {
    public async create(ctx: HttpContextContract) {
        try {
            const payload = await ctx.request.validate({
                schema: schema.create({
                    username: schema.string([
                        rules.trim(),
                        rules.alpha({
                            allow: ["underscore", "space"]
                        }),
                        rules.unique({ table: "accounts", column: "username", caseInsensitive: true }),
                        rules.minLength(3),
                        rules.maxLength(16)
                    ]),
                    email: schema.string([
                        rules.email(),
                        rules.unique({ table: "accounts", column: "email", caseInsensitive: true })
                    ]),
                    password: schema.string([
                        rules.minLength(8),
                        rules.maxLength(64)
                    ])
                }),

                messages: {
                    required: "The {{ field }} field is required",
                    minLength: "The {{ field }} field must be at least {{ options.minLength }} characters",
                    maxLength: "The {{ field }} field must be at most {{ options.maxLength }} characters",

                    "email.email": "The email field must be a valid email address",
                    "username.alpha": "The username must only contain letters, numbers, underscores, and spaces",
                    "username.unique": "An account with that username already exists",
                }
            });

            // create the account
            const account = await Account.create(payload);

            // return the account
            return {
                code: 201,
                message: "Account created",
                data: account.serialize()
            };
        } catch (error: any) {
            return ctx.response.badRequest({
                code: 400,
                errors: error.messages.errors
            });
        }
    }

    public async login(ctx: HttpContextContract) {
        if (!ctx.request.hasBody()) {
            return ctx.response.badRequest({
                code: 400,
                message: "Missing request body"
            });
        }

        if (!ctx.request.input("username") || !ctx.request.input("password")) {
            return ctx.response.badRequest({
                code: 400,
                message: "Missing required fields"
            });
        }

        const body = ctx.request.only(["username", "password"]);

        // attempt to login
        const account = await ctx.auth.use("web").attempt(body.username, body.password);

        return {
            code: 200,
            message: "Login successful",
            data: account.serialize()
        };
    }
}