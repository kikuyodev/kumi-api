import { BaseModel, HasOne, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
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

    @column({
        serializeAs: null
    })
    public parentId: number | null;

    @hasOne(() => Group)
    public parent: HasOne<typeof Group>;

    public getPermissions(): number {
        // Manually calculate permissions
        if (this.parent) {
            return this.permissions | this.parent.getPermissions();
        }

        return this.permissions;
    }
}