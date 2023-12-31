import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import { Permissions } from "../util/Constants";
import NoPermissionException from "../exceptions/NoPermissionException";
import Forum from "../models/forums/Forum";
import { Exception } from "@adonisjs/core/build/standalone";
import Account from "../models/Account";

export default class ForumsController {
    public async index({ authorization }: HttpContextContract) {
        const forums = await Forum.query().orderBy("order", "asc").whereNull("parentId");

        return {
            code: 200,
            data: {
                forums: (await Promise.all(forums.map(async (forum) => await ForumsController.trueSerialize(forum, authorization.account)))).filter((forum) => forum !== undefined)
            }
        };
    }

    public async fetch({ request, authorization }: HttpContextContract) {
        const forum = await Forum.findBy("id", request.param("id"));

        if (!forum || forum.isCategory) {
            throw new Exception("Forum not found", 404, "E_FORUM_NOT_FOUND");
        }

        console.log("fetch");

        if (!await forum.can("view", authorization.account)) {
            throw new Exception("You do not have permission to view this forum", 403, "E_NO_PERMISSION");
        }

        return {
            code: 200,
            data: {
                forum: await ForumsController.trueSerialize(forum, authorization.account)
            }
        };
    }

    public async create({ request, authorization }: HttpContextContract) {
        const payload = await request.validate({
            schema: schema.create({
                name: schema.string(),
                description: schema.string(),
                order: schema.number([
                    rules.unsigned()
                ]),
                private: schema.boolean.optional(),
                allowed_groups: schema.array.optional().members(schema.number()),
                moderator_groups: schema.array.optional().members(schema.number()),
                parent: schema.number.optional([
                    rules.exists({ table: "forums", column: "id" })
                ])
            }),
            messages: {
                "name.required": "A name is required",
                "description.required": "A description is required"
            } 
        });

        if (!authorization.account?.has(Permissions.MANAGE_FORUMS)) {
            throw new NoPermissionException("MANAGE_FORUMS");
        }

        const finalPayload: any = {
            name: payload.name,
            description: payload.description,
            order: payload.order,
        };

        if (payload.private) {
            finalPayload.private = payload.private;
        }

        if (payload.allowed_groups) {
            finalPayload.allowedGroupIds = payload.allowed_groups;
        }

        if (payload.moderator_groups) {
            finalPayload.moderatorGroupIds = payload.moderator_groups;
        }

        if (payload.parent) {
            finalPayload.parentId = payload.parent;
        }

        const forum = await Forum.create(finalPayload);

        return {
            code: 200,
            data: {
                forum
            }
        };
    }

    public static async trueSerialize(forum: Forum, account?: Account) {
        // reshaping the forum object to be more useful
        const newChildren: (any | undefined)[] = [];

        if (forum.children) {
            for (const child of forum.children) {
                if (await child?.can("view", account)) {
                    newChildren.push(await ForumsController.trueSerialize(child, account));
                }
            }

            // @ts-expect-error
            forum.children = newChildren;
        }

        if (!await forum.can("view", account)) {
            return undefined;
        }

        return forum;
    }
}