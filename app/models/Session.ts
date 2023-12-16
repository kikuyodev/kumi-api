import { BaseModel, column } from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";

export default class Session extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column()
    public accountId: number;

    @column()
    public token: string;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
    })
    public createdAt: DateTime;

    @column.dateTime({
        autoCreate: true,
        autoUpdate: true,
        columnName: "expires_at",
    })
    public expiresAt: DateTime;
}