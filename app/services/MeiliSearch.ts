import MeiliSearch from "meilisearch";
import Env from "@ioc:Adonis/Core/Env";

class MeiliSearchService {
    private search: MeiliSearch;
    private booted: boolean = false;

    constructor() {
    }

    public boot() {
        if (this.booted) {
            return;
        }

        this.booted = true;
        this.search = new MeiliSearch({
            host: Env.get("MEILISEARCH_HOST"),
            apiKey: Env.get("MEILISEARCH_MASTER_KEY")
        });
    }

    public index(name: string) {
        return this.search.index(name);
    }
}

export default new MeiliSearchService();