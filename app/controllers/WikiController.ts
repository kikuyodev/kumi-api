import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import WikiGitService from "../services/WikiGitService";

export default class WikiController {
    public async fetch({ params }: HttpContextContract) {
        const pages = await WikiGitService.refreshArticles();
        const { language } = params;
        const path = params["*"];
        
        const articles = pages.filter((page) => page.path === path.join("/"));


        if (articles.length == 0 ) {
            throw new Exception("Article not found", 404, "E_ARTICLE_NOT_FOUND");
        }

        const article = articles.find((article) => article.locale == language);

        if (!article) {
            throw new Exception("Article not found", 404, "E_ARTICLE_NOT_FOUND");
        }

        return {
            code: 200,
            data: {
                page: {
                    title: article.title,
                    language: article.locale,
                    content: article.content,
                    available_languages: articles.map((article) => article.locale),
                    configuration: article.configuration
                }
            }   
        }
    }
}