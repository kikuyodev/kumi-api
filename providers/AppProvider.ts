import type { ApplicationContract } from "@ioc:Adonis/Core/Application";
import MeiliSearch from "App/services/MeiliSearch";

export default class AppProvider {
	constructor(protected app: ApplicationContract) {
	}

	public register() {
		// Register your own bindings
	}

	public async boot() {
		// IoC container is ready
		if (this.app.environment === "web") {
			await import("../start/webhook");
			await import("../start/socket");
			await import("../start/meilisearch");
			await import("../start/wiki");
		}
	}

	public async ready() {
		// create indexes for meilisearch
		if (this.app.environment === "web") {
			MeiliSearch.index("chartsets").updateFilterableAttributes([
				"status",
				"creators",
				"bpm"
			]);
		}
	}

	public async shutdown() {
		// Cleanup, since app is going down
	}
}
