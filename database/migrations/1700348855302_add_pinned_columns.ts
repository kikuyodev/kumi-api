import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "comments";

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.boolean("pinned").defaultTo(false);
    });
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn("pinned");
    });
  }
}
