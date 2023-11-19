import { BaseModel, afterFetch, column, computed } from "@ioc:Adonis/Lucid/Orm";
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

    @computed({
        serializeAs: "has_page"
    })
    public get hasPage() {
        return this.$original.description !== null && this.$original.description !== undefined;
    }

    @afterFetch()
    public static async afterFetch(groups: Group[]) {
        for (const group of groups) {
            // here, we commit cardinal sins
            // today's cardinal sin is:
            //
            // forcing a property that isn't meant to be
            // undefined as undefined, so that it doesn't
            // show up in the JSON response when we serialize
            // a set of groups

            // @ts-ignore
            group.description = undefined;
        }
    }
}