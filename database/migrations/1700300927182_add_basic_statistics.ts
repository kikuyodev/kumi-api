import BaseSchema from "@ioc:Adonis/Lucid/Schema"

export default class extends BaseSchema {

  public async up () {
    this.schema.table("accounts", (table) => {
      table.integer("ranked_score").defaultTo(0);
      table.integer("total_score").defaultTo(0);
      table.integer("total_playtime").defaultTo(0);
      table.integer("total_playcount").defaultTo(0);
      table.integer("maximum_combo").defaultTo(0);
    })
  }

  public async down () {
    this.schema.table("accounts", (table) => {
      table.dropColumn("ranked_score");
      table.dropColumn("total_score");
      table.dropColumn("total_playtime");
      table.dropColumn("total_playcount");
      table.dropColumn("maximum_combo");
    })
  }
}
