import BaseSchema from "@ioc:Adonis/Lucid/Schema"

export default class extends BaseSchema {
  protected tableName = "accounts"

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.text("biography").nullable()
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn("biography")
    })
  }
}
