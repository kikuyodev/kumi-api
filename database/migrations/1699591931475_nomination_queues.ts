import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "nomination_queue";

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id");
      table.timestamp("created_at", { useTz: true });
      table.timestamp("ranked_at", { useTz: true });
    });
  }

  public async down () {
    this.schema.dropTable(this.tableName);
  }
}
