import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {

  public async up () {
    this.schema.table("accounts", (table) => {
      table.jsonb("attributes").defaultTo("{}");
    });
  }

  public async down () {
    this.schema.table("accounts", (table) => {
      table.dropColumn("attributes");
    });
  }
}
