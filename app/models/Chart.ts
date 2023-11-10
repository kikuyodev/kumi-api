import { BaseModel, HasOne, ManyToMany, afterFetch, afterFind, column, hasOne, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import ChartSet from "App/models/ChartSet";
import { DateTime } from "luxon";

export enum ChartStatus {
    WorkInProgress,
    Pending,
    Ranked,
    Qualified,
    Graveyard
}

export interface ChartDifficulty {
    bpms: string[];
    difficulty: number;
}

export interface ChartRomanisedMetadata {
    artist_romanised?: string;
    title_romanised?: string;
    source_romanised?: string;
}

/**
 * A representation of a chart for the game.
 * 
 * Contains the chart's name, difficulty, and all of the metadata
 * for the chart.
 */
export default class Chart extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    /**
     * The artist of the song used in the chart.
     */
    @column()
    public artist: string;

    /**
     * The title of the song used in the chart.
     */
    @column()
    public title: string;

    /**
     * The difficulty name of the chart.
     */
    @column({
        columnName: "difficulty_name"
    })
    public difficultyName: string;

    /**
     * The tags of the chart that are used for searching.
     */
    @column()
    public tags: string;

    /**
     * The source material of the chart's song.
     */
    @column()
    public source: string | null;

    /**
     * The unicode metadata of the chart if any.
     */
    @column({
        columnName: "romanised_metadata"
    })
    public romanisedMetadata: ChartRomanisedMetadata;

    /**
     * The difficulty data of the chart.
     */
    @column()
    public difficulty: ChartDifficulty;

    /**
     * The MD5 checksum of the chart's file.
     */
    @column({
        columnName: "map_checksum"
    })
    public mapChecksum: string;

    /**
     * The individual status of the chart, distinguishing it from the set if needed.
     */
    @column()
    public status: ChartStatus;

    /**
     * The players that created this chart.
     */
    @manyToMany(() => Account, {
        localKey: "id",
        pivotForeignKey: "chart_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "account_id",
        pivotTable: "chart_creators",
        //pivotColumns: ["relationship"]
    })
    public creators: ManyToMany<typeof Account>;

    @column({
        serializeAs: null,
        columnName: "set_id"
    })
    public chartSetId: number;

    /**
     * The set that this chart belongs to.
     */
    @hasOne(() => ChartSet, {
        foreignKey: "id",
        localKey: "chartSetId"
    })
    public set: HasOne<typeof ChartSet>;

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

    @afterFind()
    public static async preloadRelationsSingle(chart: Chart) {
        // here we load the set as we are only loading a single chart
        // typically this will only be used when getting a singular chart
        // over an API call

        // fetch is for when the chart set is being found from the database
        await chart.load((loader) => {
            loader
                .load("set")
                .load("creators");
        });
    }
    
    @afterFetch()
    public static async preloadRelations(charts: Chart[]) {
        for (const chart of charts) {
            await chart.load("creators");
        }
    }
}