import { BaseModel, HasMany, HasOne, PreloaderContract, afterCreate, afterFetch, afterFind, column, computed, hasMany, hasOne } from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import Account from "./Account";
import ChartSet from "./charts/ChartSet";

export enum CommentSourceType {
    ChartSet
}

export default class Comment extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column({
        serializeAs: null,
        columnName: "source_id"
    })
    public sourceId: number;

    @column()
    public message;

    @column({
        serializeAs: null,
        columnName: "source_type"
    })
    public sourceType: CommentSourceType;

    @column({
        serializeAs: null,
        columnName: "author_id"
    })
    public authorId: number;

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
        columnName: "parent_id"
    })
    public parentId: number | null;

    /**
     * The parent post of this post, if any.
     */
    @hasOne(() => Comment, {
        foreignKey: "id",
        localKey: "parentId"
    })
    public parent: HasOne<typeof Comment>;

    @hasMany(() => Comment, {
        foreignKey: "parentId",
        localKey: "id"
    })
    public children: HasMany<typeof Comment>;

    // SOURCE SECTION //
    
    @hasOne(() => ChartSet, {
        foreignKey: "id",
        localKey: "sourceId"
    })
    public set: HasOne<typeof ChartSet>;

    // SOURCE SECTION END //

    @column()
    public pinned: boolean;

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


    @computed()
    public get edited() {
        return this.updatedAt !== null;
    }
    
    @computed()
    public get deleted() {
        return this.deletedAt !== null;
    }


    @afterCreate()
    @afterFind()
    public static async attachRelations(comment: Comment) {
        await comment.load((loader) => {
            loader
                .load("children")
                .load("author")

            if (comment.parentId) {
                loader.load("parent");
            }

            Comment.loadTypeRelations(comment, loader);
        })
    }

    @afterFetch()
    public static async afterFetch(comments: Comment[]) {
        for (const comment of comments) {
            await comment.load((loader) => {
                loader
                    .load("children")
                    .load("author")

                Comment.loadTypeRelations(comment, loader);
            });
        }
    }

    public static loadTypeRelations(comment: Comment, loader: PreloaderContract<Comment>) {
        switch (comment.sourceType) {
            case CommentSourceType.ChartSet:
                loader.load("set");
                break;
        }
    }
}