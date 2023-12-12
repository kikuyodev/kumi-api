import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {
  protected tableName = "sessions";

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");
      table.integer("account_id").unsigned().references("id").inTable("accounts").onDelete("CASCADE");
      table.string("token").notNullable().unique();

      table.timestamp("created_at", { useTz: true }).notNullable();
      table.timestamp("expires_at", { useTz: true }).nullable();
    });
  }

  public async down () {
    this.schema.dropTable("sessions");
  }
}
