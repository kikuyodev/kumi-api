import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import Forum from "../models/forums/Forum";
import { Exception } from "@adonisjs/core/build/standalone";
import ForumThread, { ForumThreadFlags } from "../models/forums/ForumThread";
import ForumPost from "../models/forums/ForumPost";
import { Permissions } from "../util/Constants";
import { DateTime } from "luxon";
import Database from "@ioc:Adonis/Lucid/Database";
import ForumsController from "./ForumsController";

export default class ForumTopicsController {
    public async index({ request, authorization }: HttpContextContract) {
        const forum = await Forum.findBy("id", request.param("id"));
        const payload = await request.validate({
            schema: schema.create({
                page: schema.number.optional(),
                limit: schema.number.optional([
                    rules.range(1, 50)
                ])
            })
        });

        if (!forum || forum.isCategory) {
            throw new Exception("Forum not found", 404, "E_FORUM_NOT_FOUND");
        }

        if (!await forum.can("view", authorization.account)) {
            throw new Exception("You do not have permission to view this forum", 403, "E_NO_PERMISSION");
        }

        const threads = await ForumThread.query().where("forumId", forum!.id).orderBy("created_at", "desc").paginate(payload.page ?? 1, payload.limit ?? 25);
        threads.baseUrl(`/api/v1/forums/${forum!.id}/threads`);
        const serialize = threads.serialize();

        const threadMetadata = {};

        for (const thread of serialize.data) {
            const id = parseInt(thread.id); // why is this a string
            threadMetadata[id] = {
                is_read: false,
            };

            if (authorization.account) {
                const lastRead = await Database.query()
                    .from("forum_threads_read")
                    .where("user_id", authorization.account.id)
                    .where("thread_id", thread.id)
                    .first();

                console.log(thread.last_post.created_at);

                if (lastRead) {
                    threadMetadata[id].is_read = new Date(thread.last_post.created_at) <= lastRead.last_read_at;
                }
            }
        }

        return {
            code: 200,
            data: {
                threads: serialize.data,
            },
            meta: {
                ...serialize.meta,
                threads: threadMetadata
            }
        };
    }

    public async indexPosts({ request, authorization }: HttpContextContract) {
        const thread = await ForumThread.findBy("id", request.param("threadId"));

        if (!thread) {
            throw new Exception("Thread not found", 404, "E_THREAD_NOT_FOUND");
        }

        const payload = await request.validate({
            schema: schema.create({
                page: schema.number.optional(),
                limit: schema.number.optional([
                    rules.range(1, 50)
                ])
            })
        });

        if (!await thread.forum.can("view", authorization.account)) {
            throw new Exception("You do not have permission to view this thread", 403, "E_NO_PERMISSION");
        }

        const query = ForumPost.query()
            .where("threadId", thread.id)
            .orderBy("created_at", "asc");

        if (!await thread.forum.can("moderate_forums", authorization.account)) {
            // omit deleted posts
            query.whereNull("deleted_at");
        }

        const posts = await query.paginate(payload.page ?? 1, payload.limit ?? 25);
        posts.baseUrl(`/api/v1/forums/threads/${thread.id}/posts`);

        if (authorization.account) {
            // mark thread as read
            const lastRead = await Database.query()
                .from("forum_threads_read")
                .where("user_id", authorization.account.id)
                .where("thread_id", thread.id)
                .first();

            if (!lastRead) {
                await Database.insertQuery().table("forum_threads_read").insert({
                    user_id: authorization.account.id,
                    thread_id: thread.id,
                    last_read_at: DateTime.now().toSQL()
                });
            } else {
                await Database.query()
                    .from("forum_threads_read")
                    .where("user_id", authorization.account.id)
                    .where("thread_id", thread.id)
                    .update({
                        last_read_at: DateTime.now().toSQL()
                    });
            }
        }

        return {
            code: 200,
            data: {
                posts: posts.serialize().data
            },
            meta: {
                ...posts.serialize().meta,
                posts: {
                    ...(await posts.reduce(async (acc, post) => {
                        return {
                            ...acc,
                            [post.id]: {
                                can_edit: post.authorId === authorization.account?.id || await thread.forum.can("moderate_forums", authorization.account),
                                can_delete: post.authorId === authorization.account?.id || await thread.forum.can("moderate_forums", authorization.account),
                            }
                        };
                    }, {}))
                }
            }
        };
    }

    public async fetch({ request, authorization }: HttpContextContract) {
        const thread = await ForumThread.findBy("id", request.param("threadId"));

        if (!thread) {
            throw new Exception("Thread not found", 404, "E_THREAD_NOT_FOUND");
        }

        await thread.load("forum");

        if (!await thread.forum.can("view", authorization.account)) {
            throw new Exception("You do not have permission to view this thread", 403, "E_NO_PERMISSION");
        }

        return {
            code: 200,
            data: {
                thread
            },
            meta: {
                can_reply: !await thread.is(ForumThreadFlags.Locked) || await thread.forum.can("post_replies", authorization.account),
                can_edit: await thread.authorId === authorization.account?.id || await thread.forum.can("moderate_forums", authorization.account),
                can_delete: await thread.authorId === authorization.account?.id || await thread.forum.can("moderate_forums", authorization.account),
                can_move: await thread.forum.can("moderate_forums", authorization.account),
                can_pin: await thread.forum.can("moderate_forums", authorization.account),
                can_lock: await thread.forum.can("moderate_forums", authorization.account),
            }
        };
    }

    public async create({ request, authorization }: HttpContextContract) {
        const payload = await request.validate({
            schema: schema.create({
                title: schema.string(),
                body: schema.string()
            }),
            messages: {
                "title.required": "A title is required",
                "body.required": "A body is required"
            }
        });


        const forum = await Forum.findBy("id", request.param("id"));

        if (!forum || forum.isCategory) {
            throw new Exception("Forum not found", 404, "E_FORUM_NOT_FOUND");
        }

        if (!await forum.can("post_threads", authorization.account)) {
            throw new Exception("You do not have permission to post threads in this forum", 403, "E_NO_PERMISSION");
        }

        const thread = await ForumThread.create({
            title: payload.title,
            forumId: forum.id,
            authorId: authorization.account?.id
        });

        // create parent post
        await ForumPost.create({
            threadId: thread.id,
            body: payload.body,
            authorId: authorization.account?.id
        });

        await thread.refresh();

        return {
            code: 200,
            data: {
                thread
            }
        };
    }

    public async reply({ request, authorization }: HttpContextContract) {
        const payload = await request.validate({
            schema: schema.create({
                body: schema.string()
            }),
            messages: {
                "body.required": "A body is required"
            }
        });

        const thread = await ForumThread.findBy("id", request.param("threadId"));

        if (!thread) {
            throw new Exception("Thread not found", 404, "E_THREAD_NOT_FOUND");
        }

        if (!await thread.forum.can("post_replies", authorization.account)) {
            throw new Exception("You do not have permission to post replies in this thread", 403, "E_NO_PERMISSION");
        }

        const post = await ForumPost.create({
            threadId: thread.id,
            body: payload.body,
            authorId: authorization.account?.id
        });

        // delete all previous read markers
        await Database.query()
            .from("forum_threads_read")
            .where("thread_id", thread.id)
            .delete();

        return {
            code: 200,
            data: {
                post
            }
        };
    }

    public async modify({ request, authorization }: HttpContextContract) {
        const payload = await request.validate({
            schema: schema.create({
                title: schema.string.optional(),
                body: schema.string.optional(),
                lock: schema.boolean.optional(),
                unlock: schema.boolean.optional(),
                pin: schema.boolean.optional(),
                forum: schema.number.optional([
                    rules.exists({ table: "forums", column: "id" })
                ])
            })
        });

        const thread = await ForumThread.findBy("id", request.param("threadId"));

        if (!thread) {
            throw new Exception("Thread not found", 404, "E_THREAD_NOT_FOUND");
        }

        if (thread.authorId !== authorization.account?.id && !await thread.forum.can("moderate_forums", authorization.account)) {
            throw new Exception("You do not have permission to modify this thread", 403, "E_NO_PERMISSION");
        }

        if (payload.title) {
            thread.title = payload.title;
        }

        if (payload.body) {
            // edit the first post
            const post = await ForumPost.findBy("threadId", thread.id);
        }

        if (payload.lock) {
            if (!await thread.forum.can("moderate_forums", authorization.account)) {
                throw new Exception("You do not have permission to lock this thread", 403, "E_NO_PERMISSION");
            }

            thread.flags = thread.flags | ForumThreadFlags.Locked;
        }

        if (payload.unlock) {
            if (!await thread.forum.can("moderate_forums", authorization.account)) {
                throw new Exception("You do not have permission to unlock this thread", 403, "E_NO_PERMISSION");
            }

            thread.flags = thread.flags & ~ForumThreadFlags.Locked;
        }

        if (payload.pin) {
            if (!await thread.forum.can("moderate_forums", authorization.account)) {
                throw new Exception("You do not have permission to pin this thread", 403, "E_NO_PERMISSION");
            }

            thread.flags = thread.flags | ForumThreadFlags.Pinned;
        } else if (payload.pin === false) {
            if (!await thread.forum.can("moderate_forums", authorization.account)) {
                throw new Exception("You do not have permission to unpin this thread", 403, "E_NO_PERMISSION");
            }

            thread.flags = thread.flags & ~ForumThreadFlags.Pinned;
        }

        if (payload.forum) {
            if (!await thread.forum.can("moderate_forums", authorization.account)) {
                throw new Exception("You do not have permission to move this thread", 403, "E_NO_PERMISSION");
            }

            // fetch forum
            const forum = await Forum.findBy("id", payload.forum);

            if (!forum || forum.isCategory) {
                throw new Exception("Forum not found", 404, "E_FORUM_NOT_FOUND");
            }

            thread.forumId = forum.id;
        }

        thread.updatedAt = DateTime.now();
        await thread.save();

        return {
            code: 200,
            data: {
                thread
            }
        };
    }

    public async modifyPost({ request, authorization }: HttpContextContract) {
        const payload = await request.validate({
            schema: schema.create({
                body: schema.string.optional(),
            })
        });

        const post = await ForumPost.findBy("id", request.param("postId"));

        if (!post) {
            throw new Exception("Post not found", 404, "E_POST_NOT_FOUND");
        }

        if (post.authorId !== authorization.account?.id && !await post.thread.forum.can("moderate_forums", authorization.account)) {
            throw new Exception("You do not have permission to modify this post", 403, "E_NO_PERMISSION");
        }

        if (payload.body) {
            post.body = payload.body;
        }

        post.updatedAt = DateTime.now();
        post.editorId = authorization.account?.id ?? null;

        await post.save();

        return {
            code: 200,
            data: {
                post
            }
        };
    }

    public async delete({ request, authorization }: HttpContextContract) {
        const thread = await ForumThread.findBy("id", request.param("threadId"));

        if (!thread) {
            throw new Exception("Thread not found", 404, "E_THREAD_NOT_FOUND");
        }

        if (thread.authorId !== authorization.account?.id && !await thread.forum.can("moderate_forums", authorization.account)) {
            throw new Exception("You do not have permission to delete this thread", 403, "E_NO_PERMISSION");
        }

        await thread.delete();

        return {
            code: 200,
            data: {
                thread
            }
        };
    }

    public async deletePost({ request, authorization }: HttpContextContract) {
        const post = await ForumPost.findBy("id", request.param("postId"));

        if (!post) {
            throw new Exception("Post not found", 404, "E_POST_NOT_FOUND");
        }

        if (post.authorId !== authorization.account?.id && !await post.thread.forum.can("moderate_forums", authorization.account)) {
            throw new Exception("You do not have permission to delete this post", 403, "E_NO_PERMISSION");
        }

        // check if this is the first post
        const thread = await ForumThread.findBy("id", post.threadId);
        // delete the thread

        if (!thread) {
            throw new Exception("Thread not found", 404, "E_THREAD_NOT_FOUND");
        }

        await thread.load("firstPost");
        if (thread.firstPost.id === post.id) {
            await thread.delete(); // TODO: use deleted at instead

            return {
                code: 200,
                data: {
                    post,
                    thread
                }
            };
        }

        post.deletedAt = DateTime.now();
        await post.save();

        return {
            code: 200,
            data: {
                post
            }
        };
    }
}