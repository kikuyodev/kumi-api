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
			Route.get("/", "AccountsController.fetchAll").middleware("auth:web,api");
			Route.get("/me", "AccountsController.fetch").middleware("auth:web").middleware("allow:web");
			Route.patch("/me", "AccountsController.modifySelf").middleware("auth:web").middleware("allow:web");
			Route.get("/:id", "AccountsController.fetch");
			Route.patch("/:id", "AccountsController.modify").middleware("auth:web,api");
			Route.post("/register", "AccountsController.register");
			Route.post("/login", "AccountsController.login");
		}).prefix("/accounts");
		
		// /api/v1/groups
		Route.group(() => {
			// /api/v1/groups/:id
			Route.get("/:id", "GroupsController.fetch");
		}).prefix("/groups");

		// /api/v1/charts
		Route.group(() => {
			// /api/v1/charts/submissions
			Route.group(() => {
				Route.post("/submit", "ChartSubmissionsController.submit");
				Route.post("/update", "ChartSubmissionsController.update");
			}).prefix("/submissions").middleware("auth:web");
		}).prefix("/charts");

		// /api/v1/chartsets
		Route.group(() => {
			Route.get("/:id", "ChartSetsController.fetch");
			Route.post("/:id/nominations", "ChartSetsController.nominate").middleware("auth:web");
		}).prefix("/chartsets");

		// /api/v1/websocket
		Route.get("/websocket/token", "WebsocketController.fetchToken").middleware("auth:web");
		Route.get("/websocket/check", "WebsocketController.token");

		// /api/v1/chat
		Route.group(() => {
			Route.put("/:id/join", "ChatController.join").middleware("auth:web");
			Route.post("/:id/send", "ChatController.send").middleware("auth:web");
		}).prefix("/chat");
	}).prefix("/v1");
}).prefix("/api").middleware("silent:web,api");

Route.group(() => {
	Route.get("/avatars/:id", "AvatarFilesController.fetch");
}).prefix("/cdn");