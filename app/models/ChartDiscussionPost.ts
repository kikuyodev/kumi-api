import { BaseModel, HasMany, HasOne, column, hasMany, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import Chart from "App/models/Chart";
import ChartSet from "App/models/ChartSet";
import { DateTime } from "luxon";

export enum ChartDiscussionPostType {
    Suggestion,
    Comment,
    Problem,
    Praise
}

export default class ChartDiscussionPost extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;
    
    @column({
        serializeAs: null,
        columnName: "set_id"
    })
    public chartSetId: number;

    /**
     * The set that this discussion post belongs to
     */
    @hasOne(() => ChartSet, {
        foreignKey: "id",
        localKey: "set_id"
    })
    public set: HasOne<typeof ChartSet>;
    
    @column({
        serializeAs: null,
        columnName: "chart_id"
    })
    public chartId: number | null;

    /**
     * The chart that this discussion post is tied to.
     */
    @hasOne(() => Chart, {
        foreignKey: "id",
        localKey: "chart_id"
    })
    public chart: HasOne<typeof Chart> | null;

    @column({
        serializeAs: null,
        columnName: "author_id"
    })
    public authorId: number;

    /**
     * The player that created this discussion post.
     */
    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "author_id"
    })
    public author: HasOne<typeof Account>;

    @column({
        serializeAs: null,
        columnName: "parent_id"
    })
    public parentId: number | null;

    /**
     * The parent post of this post, if any.
     */
    @hasOne(() => ChartDiscussionPost, {
        foreignKey: "id",
        localKey: "parentId"
    })
    public parent: HasOne<typeof ChartDiscussionPost>;

    @hasMany(() => ChartDiscussionPost, {
        foreignKey: "parentId",
        localKey: "id"
    })
    public children: HasMany<typeof ChartDiscussionPost>;

    /**
     * The message of the post.
     */
    @column()
    public message: string;

    /**
     * The type of the post.
     */
    @column()
    public type: ChartDiscussionPostType;
    
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