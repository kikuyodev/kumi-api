/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import "./routes/cart"
| import "./routes/customer"
|
*/

import Route from "@ioc:Adonis/Core/Route";

Route.group(() => {
	// /api/v1
	Route.group(() => {
		// /api/v1/accounts
		Route.group(() => {
			Route.post("/register", "AccountsController.register");
			Route.post("/login", "AccountsController.login");
			Route.get("/", "AccountsController.fetchAll").middleware("auth:web,api");
			Route.get("/me", "AccountsController.fetch").middleware("auth:web").middleware("allow:web");
			Route.patch("/me", "AccountsController.modifySelf").middleware("auth:web").middleware("allow:web");
			Route.get("/me/settings", "AccountsController.fetchSettings").middleware("auth:web").middleware("allow:web");
			Route.patch("/me/settings", "AccountsController.modifySettings").middleware("auth:web").middleware("allow:web");
			Route.get("/:id", "AccountsController.fetch").where("id", Route.matchers.number());
			Route.patch("/:id", "AccountsController.modify").where("id", Route.matchers.number()).middleware("auth:web,api");
		}).prefix("/accounts");
		
		// /api/v1/groups
		Route.group(() => {
			Route.get("/:id", "GroupsController.fetch").where("id", Route.matchers.number());
		}).prefix("/groups");

		// /api/v1/charts
		Route.group(() => {
			Route.get("/:id", "ChartsController.fetch").where("id", Route.matchers.number());
			Route.get("/:id/scores", "ChartsController.fetchScores").where("id", Route.matchers.number());
		}).prefix("/charts");

		// /api/v1/chartsets
		Route.group(() => {
			Route.get("/search", "ChartSetsController.search");
			Route.get("/:id", "ChartSetsController.fetch").where("id", Route.matchers.number());
			Route.post("/:id/nominations", "ChartSetsController.nominate").where("id", Route.matchers.number()).middleware("auth:web");
			Route.get("/:id/comments", "ChartSetsController.fetchComments").where("id", Route.matchers.number());
			Route.post("/:id/comments", "ChartSetsController.postComment").where("id", Route.matchers.number()).middleware("auth:web");
			Route.patch("/:id/comments/:commentId", "ChartSetsController.modifyComment").where("id", Route.matchers.number()).where("commentId", Route.matchers.number()).middleware("auth:web");
			Route.patch("/:id/comments/:commentId/pin", "ChartSetsController.pinComment").where("id", Route.matchers.number()).where("commentId", Route.matchers.number()).middleware("auth:web");
			Route.delete("/:id/comments/:commentId", "ChartSetsController.deleteComment").where("id", Route.matchers.number()).where("commentId", Route.matchers.number()).middleware("auth:web");

			Route.group(() => {
				Route.post("/submit", "ChartSubmissionsController.submit");
				Route.post("/update", "ChartSubmissionsController.update");
			}) 

			// /api/v1/chartset/:id/moddings
			Route.group(() => {
				Route.get("/", "ChartModdingController.fetchAll");
				Route.post("/", "ChartModdingController.post").middleware("auth:web");
				Route.patch("/:postId", "ChartModdingController.modify").where("postId", Route.matchers.number()).middleware("auth:web");
			}).prefix("/:id/modding");
		}).prefix("/chartsets");

		// /api/v1/rankings
		Route.group(() => {
			Route.get("/", "RankingsController.fetch");
		}).prefix("/rankings");

		// /api/v1/websocket
		Route.get("/websocket/token", "WebsocketController.fetchToken").middleware("auth:web");

		// /api/v1/chat
		Route.group(() => {
			Route.put("/:id/join", "ChatController.join").middleware("auth:web");
			Route.post("/:id/send", "ChatController.send").middleware("auth:web");
		}).prefix("/chat");
	}).prefix("/v1");
}).prefix("/api").middleware("silent:web,api");

Route.group(() => {
	Route.get("/avatars/:id", "AvatarFilesController.fetch").where("id", Route.matchers.number());
	Route.get("/previews/:id", "ChartSetFilesController.fetchPreview").where("id", Route.matchers.number());
	Route.get("/backgrounds/:id", "ChartSetFilesController.fetchBackground").where("id", Route.matchers.number());
}).prefix("/cdn");