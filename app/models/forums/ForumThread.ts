import { BaseModel, HasMany, HasOne, afterCreate, afterFetch, afterFind, column, hasMany, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Forum from "./Forum";
import Account from "../Account";
import ForumPost from "./ForumPost";
import { DateTime } from "luxon";

export interface ForumThreadMetadata {

}

export enum ForumThreadFlags {
    Locked = 1 << 0,
    Pinned = 1 << 1
}

export default class ForumThread extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;
    
    @column()
    public title: string;

    @column({
        serializeAs: null,
        columnName: "forum_id"
    })
    public forumId: number;

    @hasOne(() => Forum, {
        localKey: "forumId",
        foreignKey: "id"
    })
    public forum: HasOne<typeof Forum>;

    @column({
        serializeAs: null,
        columnName: "author_id"
    })
    public authorId: number;

    @hasOne(() => Account, {
        localKey: "authorId",
        foreignKey: "id"
    })
    public author: HasOne<typeof Account>;

    @column()
    public flags: number;

    @column()
    public metadata: ForumThreadMetadata;

    @hasMany(() => ForumPost, {
        localKey: "id",
        foreignKey: "threadId"
    })
    public posts: HasMany<typeof ForumPost>;

    @column()
    public views: number;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at"
    })
    public createdAt: DateTime;

    @column.dateTime({
        autoCreate: true,
        autoUpdate: true,
        columnName: "updated_at"
    })
    public updatedAt: DateTime;

    @hasOne(() => ForumPost, {
        localKey: "id",
        foreignKey: "threadId",
        serializeAs: "last_post",
        onQuery: (query) => query.limit(1).orderBy("id", "desc")
    })
    public lastPost: HasOne<typeof ForumPost>;

    @hasOne(() => ForumPost, {
        localKey: "id",
        foreignKey: "threadId",
        serializeAs: null,
        onQuery: (query) => query.limit(1).orderBy("id", "asc")
    })
    public firstPost: HasOne<typeof ForumPost>;


    public is(flag: ForumThreadFlags) {
        return (this.flags & flag) === flag;
    }

    @afterCreate()
    @afterFind()
    public static async loadRelations(thread: ForumThread) {
        await thread.load("author");
        await thread.load("forum");
    }

    @afterFetch()
    public static async loadRelationsAll(threads: ForumThread[]) {
        for (const thread of threads) {
            await thread.load((loader) => {
                loader.load("author");
                loader.load("lastPost");
            });
        }
    }
}