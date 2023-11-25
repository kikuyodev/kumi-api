import BaseSchema from "@ioc:Adonis/Lucid/Schema"

export default class extends BaseSchema {

  public async up () {
    this.schema.table("forum_threads", (table) => {
      table.integer("views").defaultTo(0);
    })
  }

  public async down () {
    this.schema.table("forum_threads", (table) => {
      table.dropColumn("views");
    });
  }
}
