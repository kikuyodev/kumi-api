import { BaseModel, HasOne, ManyToMany, column, hasOne, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import ChartSet from "App/models/ChartSet";
import { DateTime } from "luxon";

export enum ChartStatus {
    Pending,
    WorkInProgress,
    Ranked,
    Qualified,
    Graveyard
}

export enum ChartCreatorRelationship {
    Creator,
    Collaborator
}

export type AccountWithChartRelationship = Account & {
    relationship: ChartCreatorRelationship;
}

export const DEFAULT_DIFFICULTY: ChartDifficulty = {
    bpms: [],
    difficulty: 0
};

export interface ChartDifficulty {
    bpms: string[];
    difficulty: number;
}

export interface ChartUnicodeMetadata {
    artist_unicode: string;
    title_unicode: string;
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
    @column()
    public difficulty_name: string;

    /**
     * The tags of the chart that are used for searching.
     */
    @column()
    public tags: string;

    /**
     * The description of the chart.
     */
    @column()
    public description: string;

    /**
     * The source material of the chart's song.
     */
    @column()
    public source: string | null;

    /**
     * The unicode metadata of the chart if any.
     */
    @column({
        columnName: "unicode_metadata"
    })
    public unicodeMetadata: ChartUnicodeMetadata | null;

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

    @column({
        serializeAs: null,
        columnName: "creator_id"
    })
    public creatorId: number;

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
        localKey: "set_id"
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
}