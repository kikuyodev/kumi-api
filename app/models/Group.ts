import { BaseModel, column } from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";

export default class Group extends BaseModel {
    @column({ isPrimary: true })
    public id: number;

    @column()
    public identifier: string;

    @column()
    public name: string;

    @column()
    public tag: string;

    @column()
    public description: string;

    @column()
    public color: string;

    @column()
    public visible: boolean;
    
    @column()
    public priority: number;

    @column({
        serializeAs: null
    })
    public permissions: number;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
    })
    public createdAt: DateTime;

    @column.dateTime({
        autoCreate: true,
        autoUpdate: true,
        columnName: "updated_at",
    })
    public updatedAt: DateTime;
}