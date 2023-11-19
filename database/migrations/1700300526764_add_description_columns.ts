import BaseSchema from "@ioc:Adonis/Lucid/Schema"

export default class extends BaseSchema {
  public async up () {
    this.schema.table("groups", (table) => {
      table.text("description").nullable();
    });
  }

  public async down () {
    this.schema.table("groups", (table) => {
      table.dropColumn("description");
    });
  }
}
