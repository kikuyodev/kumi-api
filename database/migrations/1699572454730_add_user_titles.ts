import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "accounts";

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.string("title", 32).nullable();
    });
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn("title");
    });
  }
}
