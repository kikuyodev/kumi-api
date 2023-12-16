import { Octokit } from "@octokit/rest";
import Env from "@ioc:Adonis/Core/Env";

export interface NewsPost {

}

export interface WikiArticle { }

class WikiGitService {
    public booted = false;
    private kit: Octokit;

    public posts: any[] = [];
    public articles: any[] = [];

    async boot() {
        if (this.booted) {
            return;
        }

        this.kit = new Octokit({
            auth: Env.get("GITHUB_TOKEN")
        });

        this.booted = true;
    }

    public async refreshArticles() {
        if (!this.booted) {
            return [];
        }

        const articles = await this.kit.repos.getContent({
            owner: "kikuyodev",
            repo: "kumi-wiki",
            path: "articles"
        }) as any;

        return await this.readArticles(articles.data, []);
    }

    private async readArticles(pages: any, final: any[], path = ""): Promise<any[]> {
        for (const page of pages) {
            if (page.type === "dir") {
                const files = await this.kit.repos.getContent({
                    owner: "kikuyodev",
                    repo: "kumi-wiki",
                    path: page.path
                }) as any;

                await this.readArticles(files.data, final, page.path);
            } else {
                const split = page.path.split("/");
                split.shift();
                const locale = split.pop().replace(".md", "");
                const safePath = split.join("/");
                const safeTitle = split[split.length - 1].replace("_", " ");

                const content = await this.kit.repos.getContent({
                    owner: "kikuyodev",
                    repo: "kumi-wiki",
                    path: page.path
                }) as any;

                const article = Buffer.from(content.data.content, "base64").toString("utf-8");

                final.push({
                    slug: page.name.replace(".md", ""),
                    path: safePath,
                    title: safeTitle,
                    locale: locale,
                    content: article.toString().replace(/---(.|\n)*---/, "").trim(),
                    configuration: await this.parseConfiguration(article)
                });
            }
        }

        this.articles = final;

        return final;
    }


    public async refreshPosts() {
        if (!this.booted) {
            return;
        }

        const years = await this.kit.repos.getContent({
            owner: "kikuyodev",
            repo: "kumi-wiki",
            path: "newsposts"
        }) as any;

        const posts: any[] = [];
        let idx = 0;

        for (const year of years.data) {
            const files = await this.kit.repos.getContent({
                owner: "kikuyodev",
                repo: "kumi-wiki",
                path: `newsposts/${year.name}`
            }) as any;

            for (const file of files.data) {
                const content = await this.kit.repos.getContent({
                    owner: "kikuyodev",
                    repo: "kumi-wiki",
                    path: `newsposts/${year.name}/${file.name}`
                }) as any;

                const post = Buffer.from(content.data.content, "base64").toString("utf-8");

                posts.push(await this.parsePost(idx++, post, content.data));
            }
        }

        this.posts = posts;
        return posts;
    }

    private async parsePost(id: number, post: string, data: any) {
        const config = await this.parseConfiguration(post);
        
        // remove the configuration from the post
        post = post.replace(/---(.|\n)*---/, "").trim();

        return {
            id: id,
            slug: data.name.replace(".md", ""),
            title: config["title"],
            posted_at: new Date(config["date"]),
            author: config["author"],
            content: post.toString(),
            headline: config["headline"],
            banner: config["banner"],
            configuration: config
        };
    }

    private async parseConfiguration(data: string) {
        const config = {};
        if (data.toString().startsWith("---")) {
            const configuration = data.toString().split("---")[1];
            const lines = configuration.split("\n");

            lines.forEach((line) => {
                if (!line.includes(": ")) {
                    return;
                }

                const [key, value] = line.split(": ");
                config[key.trim()] = value.trim();
            });
        }

        return config;
    }
}

export default new WikiGitService();