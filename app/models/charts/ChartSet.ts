import { BaseModel, HasMany, HasOne, ManyToMany, afterFetch, afterFind, afterSave, afterUpdate, column, computed, hasMany, hasOne, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import Chart, { ChartRomanisedMetadata, ChartStatus } from "App/models/charts/Chart";
import { DateTime } from "luxon";

/// The minimum number of nominators required to nominate a set.
/// This is a constant because it's used in multiple places, and
/// should be scaled manually in accordance to the number of
/// players in the game, or depending on the game's direction.
///
/// Changing this value will not affect existing sets.
///
/// Changelog:
/// 11/07/2023 - Initial value (1)
///
export const REQUIRED_NOMINATORS = 1; 

export const DEFAULT_ATTRIBUTES: ChartSetAttributes = {
    is_unavailable: false,
    unavailable_reason: "",
    nominators_required: REQUIRED_NOMINATORS
};

export interface ChartSetAttributes {
    is_unavailable: boolean;
    unavailable_reason: string;
    nominators_required: number;
}

export interface ChartSetInternalData {
    background: string;
    background_hash: string;
    music: string;
    music_hash: string;
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
     * The tags of the set that are used for searching.
     */
    @column()
    public tags: string;

    /**
     * The description of the set.
     */
    @column()
    public description: string;

    /**
     * The source material of the set's song.
     */
    @column()
    public source: string | null;

    /**
     * The romanised metadata of the set if any.
     */
    @column({
        columnName: "romanised_metadata"
    })
    public romanisedMetadata: ChartRomanisedMetadata | null;

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
    /**
     * The attributes of the set.
     */
    @column({
        serializeAs: null,
        columnName: "internal_data"
    })
    public internalData: ChartSetInternalData;

    @column({
        serializeAs: null,
        columnName: "creator_id"
    })
    public creatorId: number;

    /**
     * The player that created this set.
     */
    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "creatorId"
    })
    public creator: HasOne<typeof Account>;
    
    /**
     * The people who nominated this set for ranked.
     */
    @manyToMany(() => Account, {
        localKey: "id",
        pivotForeignKey: "set_id",
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
        foreignKey: "chartSetId"
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
        columnName: "deleted_at",
    })
    public deletedAt: DateTime | null;

    @column.dateTime({
        columnName: "ranked_on",
    })
    public rankedOn: DateTime | null;

    @computed()
    public get deleted() {
        return this.deletedAt !== null;
    }

    @afterFind()
    @afterSave()
    @afterUpdate()
    public static async preloadSingleRelations(set: ChartSet) {
        await set.load((loader) => {
            loader
                .load("creator")
                .load("charts")
                .load("nominators")
                .load("favorites");
        });
    }
    
    @afterFetch()
    public static async preloadMultipleRelations(sets: ChartSet[]) {
        await Promise.all(sets.map((set) => ChartSet.preloadSingleRelations(set)));
    }
}