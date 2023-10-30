import { BaseModel, HasMany, HasOne, ManyToMany, column, hasMany, hasOne, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import Chart, { ChartStatus, ChartUnicodeMetadata } from "App/models/Chart";
import { DateTime } from "luxon";

export const DEFAULT_ATTRIBUTES: ChartSetAttributes = {
    is_unavailable: false,
    unavailable_reason: ""
};

export interface ChartSetAttributes {
    is_unavailable: boolean;
    unavailable_reason: string;
}

/**
 * A representation of a set of charts for the game.
 */
export default class ChartSet extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    /**
     * The artist of the song used in the set.
     */
    @column()
    public artist: string;

    /**
     * The title of the song used in the set.
     */
    @column()
    public title: string;

    /**
     * The difficulty name of the set.
     */
    @column()
    public difficulty_name: string;

    /**
     * The tags of the set that are used for searching.
     */
    @column()
    public tags: string;

    /**
     * The description of the c.
     */
    @column()
    public description: string;

    /**
     * The source material of the set's song.
     */
    @column()
    public source: string | null;

    /**
     * The unicode metadata of the set if any.
     */
    @column({
        columnName: "unicode_metadata"
    })
    public unicodeMetadata: ChartUnicodeMetadata | null;

    /**
     * The status of the set.
     */
    @column()
    public status: ChartStatus;

    /**
     * The attributes of the set.
     */
    @column()
    public attributes: ChartSetAttributes;

    @column({
        serializeAs: null,
        columnName: "creator_id"
    })
    public creator_id: number;

    /**
     * The player that created this set.
     */
    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "creator_id"
    })
    public creator: HasOne<typeof Account>;
    
    /**
     * The people who nominated this set for ranked.
     */
    @manyToMany(() => Account, {
        localKey: "id",
        pivotForeignKey: "chartset_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "account_id",
        pivotTable: "chart_set_nominations"
    })
    public nominators: ManyToMany<typeof Account>;

    /**
     * The people who favorited this set.
     */
    @manyToMany(() => Account, {
        localKey: "id",
        pivotForeignKey: "set_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "account_id",
        pivotTable: "chart_set_favorites"
    })
    public favorites: ManyToMany<typeof Account>;

    @hasMany(() => Chart, {
        localKey: "id",
        foreignKey: "set_id"
    })
    public charts: HasMany<typeof Chart>;
    
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
        columnName: "ranked_on",
    })
    public rankedOn: DateTime | null;
}