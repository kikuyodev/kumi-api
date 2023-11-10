import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {

  public async up () {
    this.schema.createTable("badges", (table) => {
      table.increments("id").primary();
      table.string("name", 128).notNullable();
      table.string("description", 128).notNullable();
      table.string("asset_url", 128).notNullable();
      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });

    this.schema.createTable("badge_owners", (table) => {
      table.increments("id").primary();
      table.integer("account_id").notNullable().unsigned().references("accounts.id");
      table.integer("badge_id").notNullable().unsigned().references("badges.id");
      table.timestamp("awarded_at", { useTz: true });
      table.unique(["account_id", "badge_id"]);
    });
  }

  public async down () {
    this.schema.dropTable("badge_owners");
    this.schema.dropTable("badges");
  }
}
