import { BaseModel, HasMany, HasOne, afterCreate, afterFetch, afterFind, column, computed, hasMany, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import Chart from "App/models/charts/Chart";
import ChartSet from "App/models/charts/ChartSet";
import { DateTime } from "luxon";

export enum ChartModdingPostType {
    Note,
    Suggestion,
    Comment,
    Problem,
    Praise,
    Reply,
    System,
}

export enum ChartModdingPostStatus {
    None,
    Resolved,
    Open
}

export interface ChartModdingPostAttributes {
    timestamp?: number;
    resolved?: boolean;
    reopened?: boolean;
    muted?: boolean;
}

export default class ChartModdingPost extends BaseModel {
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
     * The set that this modding post belongs to
     */
    @hasOne(() => ChartSet, {
        foreignKey: "id",
        localKey: "chartSetId"
    })
    public set: HasOne<typeof ChartSet>;

    @column({
        serializeAs: null,
        columnName: "chart_id"
    })
    public chartId: number | null;

    /**
     * The chart that this modding post is tied to.
     */
    @hasOne(() => Chart, {
        foreignKey: "id",
        localKey: "chartId"
    })
    public chart: HasOne<typeof Chart>;

    @column({
        serializeAs: null,
        columnName: "author_id"
    })
    public authorId: number | null;

    /**
     * The player that created this modding post.
     */
    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "authorId"
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
    @hasOne(() => ChartModdingPost, {
        foreignKey: "id",
        localKey: "parentId"
    })
    public parent: HasOne<typeof ChartModdingPost>;

    @hasMany(() => ChartModdingPost, {
        foreignKey: "parentId",
        localKey: "id"
    })
    public children: HasMany<typeof ChartModdingPost>;

    /**
     * The message of the post.
     */
    @column()
    public message: string;

    /**
     * The type of the post.
     */
    @column()
    public type: ChartModdingPostType;

    /**
     * The status of the post.
     */
    @column()
    public status: ChartModdingPostStatus;

    /**
     * The attributes of the post.
     */
    @column()
    public attributes: ChartModdingPostAttributes;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
    })
    public createdAt: DateTime;

    @column.dateTime({
        columnName: "updated_at",
    })
    public updatedAt: DateTime | null;

    @column.dateTime({
        columnName: "deleted_at",
    })
    public deletedAt: DateTime | null;

    @column({
        serializeAs: null,
        columnName: "editor_id"
    })
    public editorId: number | null;

    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "editorId"
    })
    public editor: HasOne<typeof Account>;

    @column({
        serializeAs: null,
        columnName: "done_by_id"
    })
    public doneById: number | null;

    /**
     * Whether or not this post was enacted by someone.
     * This property can only be utilized by system posts.
     */
    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "doneById",
        serializeAs: "done_by"
    })
    public doneBy: HasOne<typeof Account>;

    /**
     * A property that acts as a convenience over the web interface.
     */
    @computed({
        serializeAs: "has_parent"
    })
    public get hasParent() {
        return this.parentId !== null;
    }

    @computed({
        serializeAs: "is_edited"
    })
    public get isEdited() {
        return this.updatedAt !== null;
    }

    @afterCreate()
    @afterFind()
    public static async attachRelations(post: ChartModdingPost) {
        await post.load((loader) => {
            loader
                .load("children")
                .load("set")

            if (post.authorId)
                loader.load("author");

            if (post.parentId)
                loader.load("parent")

            if (post.chartId)
                loader.load("chart");

            if (post.editorId)
                loader.load("editor");

            if (post.doneById)
                loader.load("doneBy");
        })

    }

    @afterFetch()
    public static async attachRelationsFetch(posts: ChartModdingPost[]) {
        for (const post of posts) {
            await post.load((loader) => {
                // omit set and parent, as we don't need them
                loader
                    .load("children");

                if (post.authorId)
                    loader.load("author");

                if (post.chartId)
                    loader.load("chart");

                if (post.editorId)
                    loader.load("editor");

                if (post.doneById)
                    loader.load("doneBy");
            });
        }
    }
}