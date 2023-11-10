import { BaseModel, column } from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";

export default class Badge extends BaseModel {
    @column({ isPrimary: true })
    public id: number;

    @column()
    public identifier: string;

    @column()
    public name: string;

    @column()
    public description: string;

    @column({
        columnName: "asset_url"
    })
    public assetUrl: string;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
        serializeAs: null
    })
    public createdAt: DateTime;

    @column.dateTime({
        autoCreate: true,
        autoUpdate: true,
        columnName: "updated_at",
        serializeAs: null
    })
    public updatedAt: DateTime;

    public serializeExtras() {
        return {
            awarded_at: this.$extras.pivot_awarded_at
        };
    }
}