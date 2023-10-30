import { BaseModel, HasOne, ManyToMany, beforeSave, column, hasOne, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Hash from "@ioc:Adonis/Core/Hash";
import Group from "App/models/Group";
import { DateTime } from "luxon";

export default class Account extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column()
    public username: string;

    @column({
        serializeAs: null
    })
    public email: string;

    @column({
        serializeAs: null
    })
    public password: string;

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

    @column.dateTime({
        autoCreate: true,
        columnName: "logged_in_at",
        serializeAs: null
    })
    public loggedInAt: DateTime;

    @column({
        serializeAs: null,
        columnName: "default_group_id",
    })
    public defaultGroupId: number | null;

    @hasOne(() => Group, {
        foreignKey: "id",
        localKey: "default_group_id"
    })
    public defaultGroup: HasOne<typeof Group>;

    @manyToMany(() => Group, {
        localKey: "id",
        pivotForeignKey: "account_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "group_id",
        pivotTable: "account_groups"
    })
    public groups: ManyToMany<typeof Group>;

    @beforeSave()
    public static async hashPassword(account: Account) {
        if (account.$dirty.password) {
            account.password = await Hash.make(account.password);
        }
    }
}