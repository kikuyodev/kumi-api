import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { rules, schema, validator } from "@ioc:Adonis/Core/Validator";
import WikiGitService from "../services/WikiGitService";

export default class NewsController {
    public async index({ request }: HttpContextContract) {
        const searchPayload = request.only(["year"]);
        const validatedPayload = await validator.validate({
            schema: schema.create({
                year: schema.number.optional(),
                limit: schema.number.optional([
                    rules.range(1, 50)
                ])
            }),
            data: searchPayload
        });


        try {
            return {
                code: 200,
                data: {
                    posts: WikiGitService.posts.map((post) => {
                        // omit content
                        return {
                            ...post,
                            content: undefined
                        };
                    }).filter((post) => {
                        if (validatedPayload.year) {
                            return post.posted_at.getFullYear() === validatedPayload.year;
                        }

                        return true;
                    }).slice(0, validatedPayload.limit || 10),
                    years: WikiGitService.posts.map((post) => post.posted_at.getFullYear()).filter((year, index, self) => self.indexOf(year) === index)
                }
            };

        } catch (e: any) {
            throw new Exception(e.message, e.status);
        }
    }

    public async fetch({ params }: HttpContextContract) {
        const { slug } = params;

        const postIndex = WikiGitService.posts.findIndex((post) => post.slug === slug);

        if (postIndex === -1) {
            throw new Exception("Post not found", 404, "E_POST_NOT_FOUND");
        }

        const post = WikiGitService.posts[postIndex];
        const previousPost = WikiGitService.posts[postIndex - 1];
        const nextPost = WikiGitService.posts[postIndex + 1];

        try {
            return {
                code: 200,
                data: {
                    post
                },
                meta: {
                    previous: previousPost,
                    next: nextPost
                }
            };

        } catch (e: any) {
            throw new Exception(e.message, e.status);
        }
    }
}