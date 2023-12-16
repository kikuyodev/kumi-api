import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import Chart, { ChartStatus } from "App/models/charts/Chart";
import ChartModdingPost, { ChartModdingPostStatus, ChartModdingPostType } from "App/models/charts/ChartModdingPost";
import ChartSet from "App/models/charts/ChartSet";
import { Permissions } from "App/util/Constants";
import ChartModdingEvent from "../models/charts/ChartModdingEvent";
import { DateTime } from "luxon";
import { ChartProcessor } from "../structures/charts/ChartProcessor";

export default class ChartModdingsController {
    public async fetchAll({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet)
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");

        const posts = await ChartModdingPost.query().where("set_id", chartSet.id);
        const events = await ChartModdingEvent.query().where("set_id", chartSet.id);

        return {
            code: 200,
            data: {
                posts: posts,
                events
            },
            meta: {
                can_nominate:
                    (chartSet.status < ChartStatus.Qualified
                        && chartSet.status !== ChartStatus.WorkInProgress
                        && chartSet.nominators.length < chartSet.attributes.nominators_required
                        && authorization.account?.has(Permissions.NOMINATE_CHARTS)) ?? false,
                can_moderate_posts: authorization.account?.has(Permissions.MODERATE_CHARTS) ?? false,
                posts: {
                    ...posts.reduce((acc, post) => {
                        return {
                            ...acc,
                            [post.id]: {
                                can_reply: post.type !== ChartModdingPostType.System && post.status !== ChartModdingPostStatus.Resolved && authorization.account !== undefined,
                                can_resolve: post.status === ChartModdingPostStatus.Open && (
                                    authorization.account?.has(Permissions.MODERATE_CHARTS)
                                    || (post.chart?.creators.find((c) => c.id === authorization.account?.id))
                                    || chartSet.creator.id === authorization.account?.id
                                    || post.author.id === authorization.account?.id
                                ) && authorization.account !== undefined,
                                can_reopen: post.status === ChartModdingPostStatus.Resolved && authorization.account !== undefined,
                                can_edit: post.type !== ChartModdingPostType.System && (post.author.id === authorization.account?.id || authorization.account?.has(Permissions.MODERATE_CHARTS)) && authorization.account !== undefined,
                            }
                        };
                    }, {})
                }
            }
        };
    }

    public async post({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const payload = await request.validate({
            schema: schema.create({
                type: schema.enum.optional([
                    // i hate enums
                    ChartModdingPostType.Note,
                    ChartModdingPostType.Suggestion,
                    ChartModdingPostType.Comment,
                    ChartModdingPostType.Problem,
                    ChartModdingPostType.Praise
                ].map((v) => v.toString())),
                chart: schema.number.optional([
                    rules.exists({
                        table: "charts",
                        column: "id"
                    })
                ]),
                parent: schema.number.optional([
                    rules.exists({
                        table: "chart_modding_posts",
                        column: "id"
                    })
                ]),
                attributes: schema.object.optional().members({
                    timestamp: schema.number.optional(),
                    resolved: schema.boolean.optional(),
                    reopened: schema.boolean.optional(),
                    muted: schema.boolean.optional()
                }),
                message: schema.string()
            })
        });

        const chartSet = await ChartSet.findBy("id", id);

        if (!chartSet)
            throw new Exception("This set does not exist.", 404, "E_SET_NOT_FOUND");

        const type = parseInt(payload.type!);

        const finalPayload: Record<string, any> = {
            type: type,
            chartSetId: chartSet!.id,
            authorId: authorization.account!.id,
            message: payload.message,
            status: (type === ChartModdingPostType.Problem || type === ChartModdingPostType.Suggestion)
                ? ChartModdingPostStatus.Open
                : ChartModdingPostStatus.None
        };

        // check if the chart is in the set
        let chart: Chart | undefined = undefined;
        if (payload.chart) {
            chart = chartSet.charts.find((c) => c.id === payload.chart);

            if (!chart)
                throw new Exception("This chart does not exist in this set.", 404, "E_CHART_NOT_FOUND");

            finalPayload.chartId = chart.id;
        }

        const systemPosts: any[] = [];

        if (payload.parent) {
            if (payload.type)
                throw new Exception("You cannot specify a type when replying to a post.", 400, "E_INVALID_TYPE");

            const parent = await ChartModdingPost.findBy("id", payload.parent);

            if (!parent)
                throw new Exception("This parent post does not exist.", 404, "E_PARENT_NOT_FOUND");

            if (parent.type === ChartModdingPostType.System)
                throw new Exception("You cannot reply to a system post.", 400, "E_INVALID_PARENT");

            finalPayload.parentId = parent.id;
            finalPayload.type = ChartModdingPostType.Reply;
        } else {
            if (!payload.type)
                throw new Exception("You must specify a type when creating a new post.", 400, "E_INVALID_TYPE");
        }


        if (payload.attributes) {
            if (payload.parent) {
                const parent = await ChartModdingPost.findBy("id", payload.parent);

                if (!parent)
                    throw new Exception("This parent post does not exist.", 404, "E_PARENT_NOT_FOUND");

                if (parent.type !== ChartModdingPostType.Problem && parent.type !== ChartModdingPostType.Suggestion)
                    throw new Exception("You cannot specify attributes when replying to a post that is not a problem, or a suggestion.", 400, "E_INVALID_ATTRIBUTES");

                if (payload.attributes.resolved !== undefined) {
                    if (payload.attributes.resolved === true) {
                        if (parent.status === ChartModdingPostStatus.Resolved)
                            throw new Exception("This post is already resolved.", 400, "E_POST_ALREADY_RESOLVED");

                        // only let creators resolve posts
                        // moderators can resolve posts on any chart
                        if (authorization.account?.has(Permissions.MODERATE_CHARTS)) {
                            parent.status = ChartModdingPostStatus.Resolved;
                            parent.save();
                        } else if (payload.chart) {
                            // check if the user is the creator of the chart
                            if (chart!.creators.find((c) => c.id === authorization.account!.id)) {
                                parent.status = ChartModdingPostStatus.Resolved;
                                parent.save();
                            } else {
                                throw new Exception("You must be the creator of this chart to resolve this post.", 403, "E_NO_PERMISSION");
                            }
                        } else {
                            // only let the creator of the set resolve posts
                            if (chartSet!.creator.id === authorization.account!.id) {
                                parent.status = ChartModdingPostStatus.Resolved;
                                parent.save();
                            } else {
                                throw new Exception("You must be the creator of this set to resolve this post.", 403, "E_NO_PERMISSION");
                            }
                        }

                        systemPosts.push({
                            type: ChartModdingPostType.System,
                            parentId: parent.id,
                            chartId: chart?.id,
                            chartSetId: chartSet!.id,
                            doneById: authorization.account!.id,
                            message: "",
                            attributes: {
                                resolved: payload.attributes.resolved
                            }
                        });
                    }
                }

                if (payload.attributes.reopened !== undefined) {
                    if (payload.attributes.reopened === true) {
                        if (parent.status === ChartModdingPostStatus.Open)
                            throw new Exception("This post is already open.", 400, "E_POST_ALREADY_OPEN");

                        // anyone can reopen posts if they're resolved
                        // this is to allow anyone to disagree with the resolution
                        parent.status = ChartModdingPostStatus.Open;
                        await parent.save();

                        systemPosts.push({
                            type: ChartModdingPostType.System,
                            parentId: parent.id,
                            chartId: chart?.id,
                            chartSetId: chartSet!.id,
                            doneById: authorization.account!.id,
                            message: "",
                            attributes: {
                                reopened: payload.attributes.reopened
                            }
                        });
                    }
                }


                if (payload.attributes.muted !== undefined) {
                    // only moderators can mute posts
                    if (!authorization.account?.has(Permissions.MODERATE_CHARTS))
                        throw new Exception("You do not have permission to mute posts.", 403, "E_NO_PERMISSION");

                    // todo: mute the post
                }
            }

            if (payload.attributes.timestamp !== undefined) {
                if (payload.parent)
                    throw new Exception("You cannot specify an exact timestamp when replying to a post.", 400, "E_INVALID_ATTRIBUTES");

                if (!payload.chart)
                    throw new Exception("You must specify a chart when creating a new post with a timestamp.", 400, "E_INVALID_CHART");

                if (payload.attributes.timestamp < 0)
                    throw new Exception("The timestamp cannot be negative.", 400, "E_INVALID_TIMESTAMP");

                finalPayload.attributes = {
                    timestamp: payload.attributes.timestamp
                };
            }
        }

        if (finalPayload.type === ChartModdingPostType.Problem) {
            if (authorization.account?.has(Permissions.DISQUALIFY_CHARTS)) {
                // reset the nomination status of the chart
                await ChartModdingEvent.sendDisqualificationEvent(chartSet, authorization.account!);
                
                for (const nominator of chartSet.nominators) {
                    chartSet.related("nominators").detach([nominator.id]);
                }
    
                if (chartSet.status === ChartStatus.Qualified) {
                    chartSet.status = ChartStatus.Pending;
    
                    for (const chart of chartSet!.charts) {
                        if (chart.status == ChartStatus.Qualified) {
                            chart.status = ChartStatus.Pending;
                        }
                        chart.save();
                    }
    
                    chartSet.rankedOn = null;
                    await chartSet.save();
                    await ChartProcessor.indexChartSet(chartSet);
                }
            } else {
                // do nothing
            }
        }

        const post = await ChartModdingPost.create(finalPayload);

        if (systemPosts.length > 0) {
            await ChartModdingPost.createMany(systemPosts);
        }

        return {
            code: 200,
            data: {
                post: post.serialize()
            }
        };
    }

    public async modify({ request, authorization }: HttpContextContract) {
        const { postId } = request.params();
        const payload = await request.validate({
            schema: schema.create({
                message: schema.string()
            })
        });

        const post = await ChartModdingPost.findBy("id", postId);

        if (!post)
            throw new Exception("This post does not exist.", 404, "E_POST_NOT_FOUND");

        if (post.type === ChartModdingPostType.System)
            throw new Exception("You cannot edit a system post.", 400, "E_INVALID_POST");

        if (post.author.id !== authorization.account?.id && !authorization.account?.has(Permissions.MODERATE_CHARTS))
            throw new Exception("You do not have permission to edit this post.", 403, "E_NO_PERMISSION");

        post.message = payload.message;

        // set the editor if the user is not a moderator
        if (post.author.id == authorization.account?.id) {
            post.editorId = authorization.account!.id;
        } else {
            post.editorId = null;
        }

        post.updatedAt = DateTime.now();

        await post.save();
        await post.refresh();

        return {
            code: 200,
            data: {
                post: post.serialize()
            }
        };
    }
}