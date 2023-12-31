import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "comments";

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id").primary();
      table.integer("source_id").notNullable();
      table.integer("source_type").notNullable();
      table.integer("author_id").notNullable();
      table.integer("editor_id").nullable();
      table.integer("parent_id").nullable();
      table.text("message").notNullable();

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true }).nullable();
      table.timestamp("deleted_at", { useTz: true }).nullable();
    });
  }

  public async down () {
    this.schema.dropTable(this.tableName);
  }
}
