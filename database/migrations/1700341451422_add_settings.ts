import BaseSchema from "@ioc:Adonis/Lucid/Schema"
import { DEFAULT_SETTINGS } from "../../app/models/Account"

export default class extends BaseSchema {
  protected tableName = "accounts"

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.jsonb("settings").defaultTo({
        version: 0
      });
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn("settings");
    })
  }
}
