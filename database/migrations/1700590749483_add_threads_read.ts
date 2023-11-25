import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = "forum_threads_read";

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.integer("user_id").unsigned().references("id").inTable("accounts").onDelete("CASCADE");
      table.integer("thread_id").unsigned().references("id").inTable("forum_threads").onDelete("CASCADE");
      table.timestamp("last_read_at", { useTz: true });
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
