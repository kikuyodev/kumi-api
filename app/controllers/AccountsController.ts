import { Exception } from "@adonisjs/core/build/standalone";
import Application from "@ioc:Adonis/Core/Application";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import NoPermissionException from "App/exceptions/NoPermissionException";
import Account, { DEFAULT_SETTINGS } from "App/models/Account";
import Group from "App/models/Group";
import { Permissions } from "App/util/Constants";
import Drive from "@ioc:Adonis/Core/Drive";
import Logger from "@ioc:Adonis/Core/Logger";
import WebhookService from "App/services/WebhookService";
import geoip from "geoip-lite";
import { TCountryCode } from "countries-list";
import ChartSet from "../models/charts/ChartSet";

// schema for modifying an account
const groupIdSchema = schema.array.optional().members(schema.number([
    rules.exists({ table: "groups", column: "id" })
]));

const modifySchema = schema.create({
    avatar: schema.file.optional({
        size: "2mb",
        extnames: ["jpg", "png", "gif", "webp"]
    }),
    banner: schema.file.optional({
        size: "2mb",
        extnames: ["jpg", "png", "gif", "webp"]
    }),
    groups: schema.object.optional().members({
        add: groupIdSchema,
        remove: groupIdSchema
    }),
    biography: schema.string.optional({
        trim: true,
        escape: true
    }),
    reason: schema.string.optional({
        trim: true,
        escape: true
    })
});

export default class AccountsController {
    public async index({ request, auth }: HttpContextContract) {
        const accountSearchLimit = auth.user?.has(Permissions.MANAGE_ACCOUNTS) ? 1000 : 10;

        const payload = await request.validate({
            schema: schema.create({
                page: schema.number.optional(),
                limit: schema.number.optional([
                    rules.range(1, accountSearchLimit)
                ])
            })
        });

        const accounts = await Account.query().paginate(payload.page ?? 1, payload.limit ?? 10)
        accounts.baseUrl("/api/v1/accounts");

        if (auth.user?.has(Permissions.MANAGE_ACCOUNTS)) {
            // TODO: load admin only data when we have any
        }

        Logger.trace("accounts fetched", { count: accounts.length });

        return {
            code: 200,
            ...accounts.serialize()
        };
    }

    public async fetch({ request, auth }: HttpContextContract) {
        const { id } = request.params();
        const account = await Account.find(id ?? auth.user?.id);

        if (!account)
            throw new Exception("This account does not exist.", 404, "E_ACCOUNT_NOT_FOUND");

        if (auth.user?.has(Permissions.MANAGE_ACCOUNTS)) {
            // get invisible data
        }

        Logger.trace("account fetched", { id: account.id, username: account.username });

        return {
            code: 200,
            data: {
                account: {
                    ...account.serialize(),
                    ranking: {
                        ...await account.getRankingStatistics(),
                        history: await account.getRankingHistory()
                    }
                }
            },
            meta: this.provideFetchMetadata(auth.user!, account)
        };
    }

    public async fetchUserCharts({ request, auth }) {
        const { id } = request.params();
        const account = await Account.find(id ?? auth.user?.id);

        if (!account)
            throw new Exception("This account does not exist.", 404, "E_ACCOUNT_NOT_FOUND");

        const charts = await ChartSet.query()
            .where("creator_id", account.id)
            .orderBy("updated_at", "desc");

        await account.load("nominations");

        return {
            code: 200,
            data: {
                charts: charts.map((chart) => chart.serialize()),
                nominations: account.nominations.map((nomination) => nomination.serialize())
            }
        };
    }

    public async fetchSettings({ auth }: HttpContextContract) {
        const account = auth.user!;

        // make sure settings are up to date
        if (account.settings.version !== DEFAULT_SETTINGS.version) {
            for (const key in DEFAULT_SETTINGS) {
                if (account.settings[key] === undefined) {
                    account.settings[key] = DEFAULT_SETTINGS[key];
                }
            }

            account.settings.version = DEFAULT_SETTINGS.version;
            await account.save();
        }

        return {
            code: 200,
            data: {
                settings: account.settings
            }
        };
    }

    public async modify(ctx: HttpContextContract) {
        if (!ctx.auth.user?.has(Permissions.MANAGE_ACCOUNTS))
            throw new NoPermissionException("MANAGE_ACCOUNTS");

        const { id } = ctx.request.params();
        const account = await Account.find(id);

        if (!account)
            throw new Exception("This account does not exist.", 404, "E_ACCOUNT_NOT_FOUND");

        return await this.modifyAccount(account, ctx);
    }

    public async modifySelf(ctx: HttpContextContract) {
        return await this.modifyAccount(ctx.auth.user!, ctx);
    }

    private async modifyAccount(account: Account, { request, response, auth }: HttpContextContract) {
        const payload = await request.validate({
            schema: modifySchema,
        });

        const userPrimaryGroup = auth.user?.groups[0];
        const targetPrimaryGroup = account.groups[0];

        const changed: string[] = [];

        if ((targetPrimaryGroup?.priority ?? 0) >= (userPrimaryGroup?.priority ?? 0)) {
            if (account.id === auth.user?.id) {
                // user is modifying themselves
            } else if (userPrimaryGroup?.identifier === "dev") {
                // user is a developer and can modify anyone
            } else {
                throw new Exception("You cannot modify an account with a higher group priority than yourself.", 400, "E_INVALID_GROUP_PRIORITY");
            }
        }

        if (payload.avatar) {
            for (const extension of ["jpg", "png", "gif", "webp"]) {
                if (await Drive.exists(`avatars/${account.id}.${extension}`)) {
                    Drive.delete(`avatars/${account.id}.${extension}`);
                }
            }

            await payload.avatar.move(Application.tmpPath("files/avatars"), {
                name: `${account.id}.${payload.avatar.extname}`,
                overwrite: true
            });

            changed.push("avatar");
        }

        if (payload.banner) {
            for (const extension of ["jpg", "png", "gif", "webp"]) {
                if (await Drive.exists(`banners/${account.id}.${extension}`)) {
                    Drive.delete(`banners/${account.id}.${extension}`);
                }
            }

            await payload.banner.move(Application.tmpPath("files/banners"), {
                name: `${account.id}.${payload.banner.extname}`,
                overwrite: true
            });

            changed.push("banner");
        }

        if (payload.groups) {
            for (const groupId of payload.groups.add ?? []) {
                const group = await Group.findOrFail(groupId);
                const userPrimaryGroup = auth.user?.groups[0];
                const addMessage = auth.user?.id === account.id
                    ? "You cannot yourself to a group with a higher priority than your primary group."
                    : "You cannot add a group to an account with a higher priority than your primary group.";

                if (account.groups.find((g) => g.id === group.id)) {
                    continue;
                }

                if (group.priority >= (userPrimaryGroup?.priority ?? 0)) {
                    throw new Exception(addMessage, 400, "E_INVALID_GROUP_PRIORITY");
                }

                WebhookService.sendGroupMessage(group, account, true, auth.user?.id === account.id ? payload.reason : undefined);
                await account.related("groups").attach([group.id]);
                changed.push(`group:${group.id}`);
            }

            for (const groupId of payload.groups.remove ?? []) {
                const group = await Group.findOrFail(groupId);
                const userPrimaryGroup = account.groups[0];
                const removeMessage = auth.user?.id === account.id
                    ? "You cannot yourself to a group with a higher priority than your primary group."
                    : "You cannot remove a group from an account with a higher priority than your primary group.";
                
                if (!account.groups.find((g) => g.id === group.id)) {
                    continue;
                }

                if (group.priority >= userPrimaryGroup?.priority ?? 0) {
                    throw new Exception(removeMessage, 400, "E_INVALID_GROUP_PRIORITY");
                }

                WebhookService.sendGroupMessage(group, account, false);
                await account.related("groups").detach([group.id]);
                changed.push(`group:${group.id}`);
            }
        }

        if (payload.biography) {
            account.biography = payload.biography;

            changed.push("biography");
        }

        if (changed.length !== 0) {
            await account.save();
            await account.refresh();
            
            Logger.trace("account modified", { id: account.id, username: account.username, changes: changed });

            return {
                code: 200,
                message: "Account modified",
                data: {
                    changes: changed,
                    account: account.serialize()
                }
            };
        } else {
            return response.notModified({
                code: 304,
                message: "Account not modified"
            });
        }
    }

    public async register(ctx: HttpContextContract) {
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

                "email.unique": "An account with that email already exists",
                "email.email": "The email field must be a valid email address",
                "username.alpha": "The username must only contain letters, numbers, underscores, and spaces",
                "username.unique": "An account with that username already exists",
            }
        });

        const ipLookup = geoip.lookup(ctx.request.ip());
        const country = {
            code: "XX"
        };

        if (!ipLookup) {
            Logger.warn("failed to lookup ip address");
        } else {
            country.code = ipLookup.country;
        }

        const account = await Account.create({
            ...payload,
            countryCode: country.code as TCountryCode
        });

        await account.load((loader) => {
            loader
                .load("groups", (query) => query.orderBy("priority"));
        });

        Logger.trace("account created", { id: account.id, username: account.username });

        return {
            code: 201,
            message: "Account created",
            data: {
                account: account.serialize()
            }
        };
    }

    public async login({ request, response, auth }: HttpContextContract) {
        try {
            if (await auth.use("web").check()) {
                const account = auth.use("web").user;

                return {
                    code: 200,
                    message: "Login successful",
                    data: {
                        account: account?.serialize(),
                    }
                };
            }
        } catch (error: any) {
            // not remembered
        }

        if (!request.hasBody()) {
            return response.badRequest({
                code: 400,
                message: "Missing request body"
            });
        }

        const body = await request.validate({
            schema: schema.create({
                username: schema.string(),
                password: schema.string(),
                remember: schema.boolean.optional()
            })
        });

        try {
            const account = await auth.use("web").attempt(body.username, body.password, body.remember ?? false);

            Logger.trace("account logged in", { id: account.id, username: account.username });

            return {
                code: 200,
                message: "Login successful",
                data: {
                    account: account.serialize(),
                }
            };
        } catch (error: any) {
            console.dir(error, { depth: 4 });

            return response.badRequest({
                code: 400,
                message: "Invalid credentials"
            });
        }
    }

    private provideFetchMetadata(account: Account, target: Account) {
        if (!account) {
            return {
                can_restrict: false,
                can_update: false,
            };
        }

        return {
            is_admin: account.has(Permissions.MANAGE_ACCOUNTS),
            can_restrict: account.has(Permissions.MODERATE_ACCOUNTS) && (
                (account.groups[0]?.priority ?? 0) > (target.groups[0]?.priority ?? 0)
            ),
            can_update: account.has(Permissions.MANAGE_ACCOUNTS) || account.id === target.id,
        };
    }
}