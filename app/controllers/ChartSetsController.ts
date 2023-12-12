import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import ChartSet from "App/models/charts/ChartSet";
import Logger from "@ioc:Adonis/Core/Logger";
import NoPermissionException from "App/exceptions/NoPermissionException";
import { Permissions } from "App/util/Constants";
import Database from "@ioc:Adonis/Lucid/Database";
import { ChartStatus } from "App/models/charts/Chart";
import { rules, schema, validator } from "@ioc:Adonis/Core/Validator";
import MeiliSearch from "App/services/MeiliSearch";
import ChartModdingEvent from "../models/charts/ChartModdingEvent";
import Comment, { CommentSourceType } from "../models/Comment";
import CommentsController from "./CommentsController";
import { ChartProcessor } from "../structures/charts/ChartProcessor";
import { DateTime } from "luxon";

export default class ChartSetsController {
    public async fetch({ request }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        Logger.trace("fetching chart set", chartSet);

        return {
            code: 200,
            data: {
                set: chartSet.serialize()
            }
        };
    }

    public async modify({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        // this is a destructive action, so we need to make sure
        // that this endpoint is only accessible to users who have it
        // it's only destructive because it relies on changing the
        // files automatically too
        if (!authorization.account?.has(Permissions.MANAGE_CHART_METADATA)) {
            throw new Exception("You do not have permission to modify this set.", 403, "E_NO_PERMISSION");
        }

        const payload = await request.validate({
            schema: schema.create({
                title: schema.string.optional(),
                description: schema.string.optional(),
                artist: schema.string.optional(),
                source: schema.string.optional(),
                status: schema.enum.optional(Object.values(ChartStatus))
            })
        });

        if (payload.status) {
            if (payload.status == ChartStatus.Qualified || payload.status == ChartStatus.Ranked) {
                if (!authorization.account?.has(Permissions.MANAGE_CHARTS)) {
                    throw new Exception("You do not have permission to use these statuses.", 403, "E_NO_PERMISSION");
                }
            }

            if (chartSet.status == ChartStatus.Qualified || chartSet.status == ChartStatus.Ranked) {
                if (!authorization.account?.has(Permissions.MANAGE_CHARTS)) {
                    throw new Exception("You do not have permission to modify this set.", 403, "E_NO_PERMISSION");
                }
            }

            chartSet.status = payload.status as ChartStatus;
        }

        // TODO: change metadata

        await chartSet.save();
        await chartSet.refresh();

        return {
            code: 200,
            data: {
                set: chartSet.serialize()
            }
        };
    }

    public async nominate({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!authorization.account?.has(Permissions.NOMINATE_CHARTS)) {
            throw new NoPermissionException("NOMINATE_CHARTS");
        }

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        if (chartSet.status !== ChartStatus.Pending) {
            throw new Exception("This set is not in pending status.", 400, "E_SET_NOT_PENDING");
        }

        if (chartSet.nominators.find((n) => n.id === authorization.account?.id)) {
            console.log(chartSet.nominators);
            throw new Exception("You have already nominated this set.", 400, "E_ALREADY_NOMINATED");
        }

        chartSet.related("nominators").attach([authorization.account.id]);
        
        if (chartSet!.nominators.length + 1 >= chartSet!.attributes.nominators_required) {
            // the set has enough nominators, so we can add it to the queue
            chartSet!.status = ChartStatus.Qualified;

            for (const chart of chartSet!.charts) {
                chart.status = ChartStatus.Qualified;
                chart.save();
            }

            chartSet.rankedOn = DateTime.now();
            await chartSet!.save();
            await ChartProcessor.indexChartSet(chartSet);

            // ranked in 3 days
            const date = new Date();
            date.setDate(date.getDate() + 3);

            await Database.insertQuery().table("nomination_queue").insert({
                set_id: chartSet!.id,
                ranked_at: date
            });
        }

        chartSet.save();
        await chartSet.refresh();
        await ChartModdingEvent.sendNominationEvent(chartSet, authorization.account);

        return {
            code: 200,  
            data: {
                set: chartSet!.serialize()
            }
        };
    }

    public async search({ request }: HttpContextContract) {
        const searchPayload = request.only(["query", "page", "limit"]);
        const validatedPayload = await validator.validate({
            schema: schema.create({
                query: schema.string.optional(),
                page: schema.number.optional(),
                status: schema.enum.optional(Object.values(ChartStatus)),
                limit: schema.number.optional([
                    rules.range(1, 100)
                ])
            }),
            data: searchPayload
        });

        validatedPayload.query = validatedPayload.query ?? "";

        const setIndex = MeiliSearch.index("chartsets");
        const isFilterRegex = /\w([><!=]=?)\w/;
        const filters = validatedPayload.query.split(" ").filter((q) => isFilterRegex.test(q) || q.includes("=="));
        const query = validatedPayload.query.split(" ").filter((q) => !isFilterRegex.test(q));

        for (const idx in filters) {
            const x = filters[idx];
            const y = isFilterRegex.exec(x);

            if (x.includes("==")) {
                filters[idx] = x.replace("==", "=");
                continue;
            }

            // get the two sides of the filter
            const sides = x.split(y![0]);
            console.log(sides);

            // remove any equals signs
            sides[0] = sides[0].replace("=", "");
            sides[1] = sides[1].replace("=", "");

            // set the filter
            filters[idx] = `${sides[0]}${y![0]}${sides[1]}`;
        }

        console.log({
            limit: validatedPayload.limit ?? 50,
            filter: filters.join(" AND "),
            page: validatedPayload.page ?? 1,
        });
    
        const results = await setIndex.search(query.join(" "), {
            limit: validatedPayload.limit ?? 50,
            filter: filters.join(" AND "),
            page: validatedPayload.page ?? 1,
        });

        const charts = await ChartSet.findMany(results.hits.map((h) => h.id));

        return {
            code: 200,
            data: {
                results: charts.map((c) => c.serialize())
            },
            meta: {
                total: results.totalHits,
                per_page: results.hitsPerPage,
                last_page: results.totalPages,
                first_page: 1
            }
        };
    }

    public async fetchComments({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        const query = Comment.query()
            .where("source_id", chartSet.id)
            .where("source_type", CommentSourceType.ChartSet);

        if (!authorization.account?.has(Permissions.MODERATE_COMMENTS)) {
            query.whereNull("deleted_at");
        }

        const comments = await query;

        return {
            code: 200,
            data: {
                comments: comments.filter((c) => c.parentId === null).map((c) => c.serialize())
            },
            meta: {
                can_pin: authorization.account?.has(Permissions.MODERATE_COMMENTS) || chartSet.creator.id === authorization.account?.id,
                comments: {
                    ...comments.reduce((acc, c) => {
                        return {
                            ...acc,
                            [c.id]: {
                                can_reply: authorization.account !== undefined && !c.deleted,
                                can_edit: authorization.account?.has(Permissions.MODERATE_COMMENTS) || c.authorId === authorization.account?.id,
                                can_delete: authorization.account?.has(Permissions.MODERATE_COMMENTS) || c.authorId === authorization.account?.id,
                            }
                        };
                    }, {})
                }
            }
        };
    }

    public async postComment({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        const payload = await request.validate({
            schema: schema.create({
                message: schema.string(),
                parent: schema.number.optional([
                    rules.exists({
                        table: "comments",
                        column: "id"
                    })
                ]),
                pinned: schema.boolean.optional()
            })
        });

        const finalPayload: any = {
            sourceId: chartSet.id,
            sourceType: CommentSourceType.ChartSet,
            authorId: authorization.account!.id,
            message: payload.message,
        };

        if (payload.pinned) {
            if (!authorization.account?.has(Permissions.MODERATE_COMMENTS) || chartSet.creator.id !== authorization.account.id) {
                throw new Exception("You do not have permission to pin this comment.", 403, "E_NO_PERMISSION");
            }

            if (payload.parent) {
                throw new Exception("You cannot pin a reply.", 400, "E_INVALID_PARENT");
            }

            finalPayload.pinned = true;
        }

        if (payload.parent) {
            const parent = await Comment.findBy("id", payload.parent);

            if (parent?.deleted) {
                throw new Exception("You cannot reply to a deleted comment.", 400, "E_INVALID_PARENT");
            }

            finalPayload.parentId = payload.parent;
        }

        const comment = await Comment.create(finalPayload);

        return {
            code: 200,
            data: {
                comment: comment.serialize()
            }
        };
    }

    public async pinComment({ request, authorization }: HttpContextContract) {
        const { id, commentId } = request.params();
        const chartSet = await ChartSet.findBy("id", id);
        const comment = await Comment.findBy("id", commentId);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        if (!comment) {
            throw new Exception("This comment does not exist.", 404, "E_COMMENT_NOT_FOUND");
        }

        if (!authorization.account?.has(Permissions.MODERATE_COMMENTS) && chartSet.creator.id !== authorization.account?.id) {
            throw new Exception("You do not have permission to pin this comment.", 403, "E_NO_PERMISSION");
        }

        comment.pinned = !comment.pinned;
        await comment.save();

        return {
            code: 200,
            data: {
                comment: comment.serialize()
            }
        };
    }

    public async modifyComment({ request, authorization }: HttpContextContract) {
        const { id, commentId } = request.params();
        const chartSet = await ChartSet.findBy("id", id);
        const comment = await Comment.findBy("id", commentId);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        if (!comment) {
            throw new Exception("This comment does not exist.", 404, "E_COMMENT_NOT_FOUND");
        }

        if (comment.sourceId !== chartSet.id) {
            throw new Exception("This comment does not belong to this set.", 400, "E_INVALID_COMMENT");
        }

        const payload = await request.validate({
            schema: schema.create({
                message: schema.string(),
            })
        });

        return await CommentsController.modifyComment(comment, authorization, payload.message);
    }

    public async deleteComment({ request, authorization }: HttpContextContract) {
        const { id, commentId } = request.params();
        const chartSet = await ChartSet.findBy("id", id);
        const comment = await Comment.findBy("id", commentId);

        if (!chartSet) {
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");
        }

        if (!comment) {
            throw new Exception("This comment does not exist.", 404, "E_COMMENT_NOT_FOUND");
        }

        if (comment.sourceId !== chartSet.id) {
            throw new Exception("This comment does not belong to this set.", 400, "E_INVALID_COMMENT");
        }

        return await CommentsController.deleteComment(comment, authorization);
    }
        
}