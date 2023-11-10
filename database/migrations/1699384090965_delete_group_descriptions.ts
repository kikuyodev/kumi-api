import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "groups";

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn("description");
    });
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.text("description").nullable();
    });
  }
}
