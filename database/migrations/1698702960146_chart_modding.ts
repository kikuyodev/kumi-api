import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {

  public async up () {
    this.schema.createTable("chart_modding_posts", (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id").onDelete("CASCADE");
      table.integer("chart_id").nullable().unsigned().references("charts.id").onDelete("CASCADE");
      table.integer("author_id").nullable().unsigned().references("accounts.id");
      table.integer("parent_id").nullable().unsigned().references("chart_modding_posts.id").onDelete("CASCADE");
      table.integer("editor_id").nullable().unsigned().references("accounts.id");
      table.integer("done_by_id").nullable().unsigned().references("accounts.id");
      table.text("message").notNullable();
      table.integer("type").notNullable();
      table.integer("status").notNullable().defaultTo(0);
      table.jsonb("attributes").defaultTo("{}");


      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
      table.timestamp("deleted_at", { useTz: true });
    });

    this.schema.createTable("chart_modding_events", (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id").onDelete("CASCADE");
      table.integer("parent_id").nullable().unsigned().references("chart_modding_posts.id").onDelete("CASCADE");
      table.integer("player_id").nullable().unsigned().references("accounts.id");
      table.integer("type").notNullable();
      table.string("alternate_message").nullable();

      table.timestamp("created_at", { useTz: true });
    });
  }

  public async down () {
    this.schema.dropTable("chart_modding_events");
    this.schema.dropTable("chart_modding_posts");
  }
}
