import BaseSchema from "@ioc:Adonis/Lucid/Schema"

export default class extends BaseSchema {
  protected tableName = "rank_history"

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
			table.integer("account_id").notNullable().unsigned().references("accounts.id");
      table.jsonb("ranks").defaultTo("{}");

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp("timestamp", { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
