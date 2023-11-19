import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  public async up() {
    this.schema.createTable("chat_channels", (table) => {
      table.increments("id").primary();
      table.string("name", 32).notNullable();
      table.string("tag", 32).notNullable().unique();
      table.text("description").nullable();
      table.integer("type").notNullable();
      table.string("allowed_groups", 128).notNullable().defaultTo("");
    });

    this.schema.createTable("chat_messages", (table) => {
      table.increments("id").primary();
      table.integer("account_id").notNullable().unsigned().references("accounts.id");
      table.integer("channel_id").notNullable().unsigned().references("chat_channels.id");
      table.text("content").notNullable();
      table.timestamp("created_at", { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable("chat_messages");
    this.schema.dropTable("chat_channels");
  }
}