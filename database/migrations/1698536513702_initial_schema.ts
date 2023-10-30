import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
	public async up() {
		// create the groups table
		this.schema.createTable("groups", (table) => {
			table.increments("id").primary();
			table.string("name", 32).notNullable();
			table.string("tag", 32).notNullable().unique();
			table.string("identifier", 32).notNullable;
			table.string("description", 128).nullable();
			table.string("color", 7).nullable();
			table.bigint("permissions").defaultTo(0);
			
			table.timestamp("created_at", { useTz: true });
			table.timestamp("updated_at", { useTz: true });

			// create the parent group foreign key
			table.integer("parent_id")
				.unsigned()
				.nullable()
				.references("groups.id");
		});

		// create the accounts table
		this.schema.createTable("accounts", (table) => {
			table.increments("id").primary();
			table.string("username", 32).notNullable().unique();
			table.string("email", 64).notNullable().unique();
			table.string("password").notNullable();
			table.timestamp("created_at", { useTz: true });
			table.timestamp("updated_at", { useTz: true });
			table.timestamp("logged_in_at", { useTz: true }).nullable();

			// create the default group foreign key
			table.integer("default_group_id")
				.unsigned()
				.nullable()
				.references("groups.id");
		});

		// create the account_groups pivot table
		this.schema.createTable("account_groups", (table) => {
			table.increments("id").primary();
			table.integer("account_id").notNullable().unsigned().references("accounts.id");
			table.integer("group_id").notNullable().unsigned().references("groups.id");
			table.unique(["account_id", "group_id"]);
		});
	}

	public async down() {
		// drop the groups table
		this.schema.dropTable("groups");

		// drop the accounts table
		this.schema.dropTable("accounts");

		// drop the account_groups pivot table
		this.schema.dropTable("account_groups");
	}
}
