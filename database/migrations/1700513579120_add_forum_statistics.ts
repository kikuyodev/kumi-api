import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {

  public async up () {
    this.schema.table("accounts", (table) => {
      table.integer("forum_level").unsigned().defaultTo(0);
      table.integer("forum_exp").unsigned().defaultTo(0);
      table.integer("forum_reputation").defaultTo(0);
    })
  }

  public async down () {
    this.schema.table("accounts", (table) => {
      table.dropColumn("forum_level");
      table.dropColumn("forum_exp");
      table.dropColumn("forum_reputation");
    })
  }
}
