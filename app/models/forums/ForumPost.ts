import { BaseModel, HasOne, afterFetch, afterFind, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "../Account";
import ForumThread from "./ForumThread";
import { DateTime } from "luxon";

export default class ForumPost extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column({
        serializeAs: null,
        columnName: "thread_id"
    })
    public threadId: number;

    @hasOne(() => ForumThread, {
        localKey: "threadId",
        foreignKey: "id"
    })
    public thread: HasOne<typeof ForumThread>;

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
    public body: string;
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

    @afterFetch()
    public static async loadThread(post: ForumPost[]) {
        for (const p of post) {
            await p.load("author");

            if (p.editorId) {
                await p.load("editor");
            }
        }
    }

    @afterFind()
    public static async loadThreadFind(post: ForumPost) {
        await post.load("thread");
    }
}