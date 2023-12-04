import { BaseModel, HasOne, afterFetch, afterFind, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Group from "../Group";
import Forum, { ForumFlags } from "./Forum";

export enum ForumPermissions {
    CanView = 1 << 0,
    CanPostThreads = 1 << 1,
    CanPostReplies = 1 << 2,
    CanModerateForum = 1 << 3,
    CanUseTags = 1 << 4,
}

export default class ForumPermission extends BaseModel {
    @column({
        isPrimary: true,
    })
    public id: number;

    @column({
        serializeAs: null,
        columnName: "forum_id"
    })
    public forumId: number;

    @column({
        serializeAs: null,
        columnName: "group_id"
    })
    public groupId: number;

    @column()
    public permissions: number;

    public has(permission: ForumPermissions) {
        return (this.permissions & permission) === permission
    }
}