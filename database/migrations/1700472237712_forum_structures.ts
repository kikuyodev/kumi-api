import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  public async up() {
    this.schema.createTable("forums", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("description").notNullable();
      table.integer("order").unsigned().notNullable();
      table.integer("parent_id").unsigned().nullable();
      table.integer("flags").defaultTo(0);
      table.jsonb("groups").defaultTo("[]"); // groups that can view and post in this forum if it's private/protected
      table.jsonb("moderator_groups").defaultTo("[]"); // groups that can moderate this forum
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("created_at", { useTz: true })
    });

    this.schema.createTable("forum_permissions", (table) => {
      table.increments("id").primary();
      table.integer("forum_id").unsigned().notNullable().references("forums.id").onDelete("CASCADE");
      table.integer("group_id").unsigned().notNullable().references("groups.id").onDelete("CASCADE");
      table.integer("permissions").unsigned().defaultTo(0);
    });

    this.schema.createTable("forum_threads", (table) => {
      table.increments("id").primary();
      table.string("title").notNullable();
      table.integer("forum_id").unsigned().notNullable().references("forums.id").onDelete("CASCADE");
      table.integer("author_id").unsigned().notNullable().references("accounts.id").onDelete("CASCADE");
      table.integer("flags").unsigned().defaultTo(0);
      table.jsonb("metadata").defaultTo("{}");

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
      table.timestamp("deleted_at", { useTz: true })
    });

    this.schema.createTable("forum_posts", (table) => {
      table.increments("id").primary();
      table.integer("thread_id").unsigned().notNullable().references("forum_threads.id").onDelete("CASCADE");
      table.integer("author_id").unsigned().notNullable().references("accounts.id").onDelete("CASCADE");
      table.integer("editor_id").unsigned().nullable().references("accounts.id").onDelete("CASCADE");
      table.integer("flags").unsigned().defaultTo(0);
      table.text("body").notNullable();

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
      table.timestamp("deleted_at", { useTz: true })
    });

    this.schema.createTable("forum_tags", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("color").notNullable();
      table.integer("order").unsigned().notNullable();
      table.jsonb("forums").defaultTo("[]"); // forums that this tag is used in
    });

    this.schema.createTable("forum_thread_tags", (table) => {
      table.integer("thread_id").unsigned().notNullable().references("forum_threads.id").onDelete("CASCADE");
      table.integer("tag_id").unsigned().notNullable().references("forum_tags.id").onDelete("CASCADE");
      table.primary(["thread_id", "tag_id"]);
    });
  }

  public async down() {
    this.schema.dropTable("forum_permissions");
    this.schema.dropTable("forum_thread_tags");
    this.schema.dropTable("forum_tags");
    this.schema.dropTable("forum_posts");
    this.schema.dropTable("forum_threads");
    this.schema.dropTable("forums");
  }
}
