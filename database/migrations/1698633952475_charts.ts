import BaseSchema from "@ioc:Adonis/Lucid/Schema";
import { DEFAULT_DIFFICULTY } from "App/models/Chart";
import { DEFAULT_ATTRIBUTES } from "App/models/ChartSet";

export default class extends BaseSchema {
  public async up () {
    this.schema.createTable("charts", (table) => {
      table.increments("id").primary();
      table.string("artist", 128).notNullable();
      table.string("title", 128).notNullable();
      table.string("difficulty_name", 64).notNullable();
      table.string("tags", 128).notNullable();
      table.text("description").notNullable();
      table.string("source", 128).nullable();
      table.jsonb("unicode_metadata").nullable();
      table.jsonb("difficulty").defaultTo(JSON.stringify(DEFAULT_DIFFICULTY));
      table.string("map_checksum", 32).notNullable();
      table.integer("status").notNullable();
      table.integer("creator_id").notNullable();
      table.integer("set_id").notNullable();

      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });

    this.schema.createTable("chart_creators", (table) => {
      table.increments("id").primary();
      table.integer("chart_id").notNullable().unsigned().references("charts.id");
      table.integer("account_id").notNullable().unsigned().references("accounts.id");
      table.integer("relationship").notNullable();
      table.unique(["chart_id", "account_id"]);
    });
    
    this.schema.createTable("chart_sets", (table) => {
      table.increments("id").primary();
      table.string("artist", 128).notNullable();
      table.string("title", 128).notNullable();
      table.string("difficulty_name", 64).notNullable();
      table.string("tags", 128).notNullable();
      table.text("description").notNullable();
      table.jsonb("unicode_metadata").nullable();
      table.jsonb("attributes").defaultTo(JSON.stringify(DEFAULT_ATTRIBUTES));
      table.string("source", 128).nullable();
      table.integer("status").notNullable();
      table.integer("creator_id").notNullable();
      table.timestamp("ranked_on", { useTz: true }).nullable();

      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });

    this.schema.createTable("chart_set_nominations", (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id");
      table.integer("account_id").notNullable().unsigned().references("accounts.id");
      table.unique(["set_id", "account_id"]);
    });

    this.schema.createTable("chart_set_favorites", (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id");
      table.integer("account_id").notNullable().unsigned().references("accounts.id");
      table.unique(["set_id", "account_id"]);
    });
  }

  public async down () {
    this.schema.dropTable("charts");
    this.schema.dropTable("chart_creators");
    this.schema.dropTable("chart_sets");
    this.schema.dropTable("chart_set_nominations");
    this.schema.dropTable("chart_set_favorites");
  }
}

