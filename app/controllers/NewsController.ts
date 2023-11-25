import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import WikiGitService from "../services/WikiGitService";

export default class NewsController {
    public async index({ params }: HttpContextContract) {
        const { slug } = params;

        try {
            return {
                code: 200,
                data: {
                    posts: (await WikiGitService.refreshPosts())?.map((post) => {
                        // omit content
                        delete post.content;

                        return post;
                    });
                }
            }

        } catch (e: any) {
            throw new Exception(e.message, e.status);
        }
    }

    public async fetch({ params }: HttpContextContract) {
        const { slug } = params;

        try {
            return {
                code: 200,
                data: {
                    post: (await WikiGitService.refreshPosts())?.find((post) => post.slug === slug)
                }
            }

        } catch (e: any) {
            throw new Exception(e.message, e.status);
        }
    }
}