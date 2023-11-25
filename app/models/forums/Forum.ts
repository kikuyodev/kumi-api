import { BaseModel, HasMany, HasOne, afterFetch, afterFind, column, computed, hasMany, hasOne } from "@ioc:Adonis/Lucid/Orm";
import { DateTime } from "luxon";
import ForumThread from "./ForumThread";
import Account from "../Account";
import { Permissions } from "../../util/Constants";
import ForumPermission, { ForumPermissions } from "./ForumPermission";

export enum ForumFlags {
    Private = 1 << 0,
    Protected = 1 << 1,
    Locked = 1 << 2,
    Archived = 1 << 3,
}

type CanUnion
    = "view"
    | "post_threads"
    | "post_replies"
    | "moderate_forums";

export default class Forum extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column()
    public name: string;

    @column()
    public description: string;

    @column()
    public order: number;

    @column({
        serializeAs: null,
        columnName: "parent_id"
    })
    public parentId: number | null;

    @hasOne(() => Forum, {
        localKey: "id",
        foreignKey: "parentId"
    })
    public parent: HasOne<typeof Forum>;
    
    @hasMany(() => Forum, {
        localKey: "id",
        foreignKey: "parentId"
    })
    public children: HasMany<typeof Forum>;

    @column()
    public flags: number;

    @column.dateTime({
        serializeAs: null,
        columnName: "created_at",
        autoCreate: true
    })
    public createdAt: DateTime;

    @hasOne(() => ForumThread, {
        localKey: "id",
        foreignKey: "forumId",
        serializeAs: "last_thread",
        onQuery: (query) => {
            query.orderBy("created_at", "desc").limit(1);
        }
    })
    public lastThread: HasOne<typeof ForumThread>;

    @hasMany(() => ForumPermission, {
        localKey: "id",
        foreignKey: "forumId",
        serializeAs: null
    })
    public permissions: HasMany<typeof ForumPermission>;

    @computed({
        serializeAs: "is_category"
    })
    public get isCategory() {
        return !this.parentId;
    }

    public async is(flag: ForumFlags) {
        if (this.parentId && this.flags === 0) {
            // TODO: optimize sql queries
            const parent = await Forum.find(this.parentId);
            return await parent?.is(flag);
        }

        return (this.flags & flag) === flag;
    }

    public async can(what: CanUnion, account?: Account) {
        if (what === "view") {
            if (await this.is(ForumFlags.Private)) {
                return await this.has(ForumPermissions.CanView, account);
            }

            // all users can view public forums
            return true;
        } else if (what === "post_threads") {
            if (await this.is(ForumFlags.Protected) || await this.is(ForumFlags.Private)) {
                return await this.has(ForumPermissions.CanPostThreads, account);
            }

            // all users can post in public forums
            return true;
        } else if (what === "post_replies") {
            if (await this.is(ForumFlags.Protected) || await this.is(ForumFlags.Private)) {
                return await this.has(ForumPermissions.CanPostReplies, account);
            }

            // all users can post in public forums
            return true;
        } else if (what === "moderate_forums") {
            return account?.has(Permissions.MANAGE_FORUMS) ?? this.has(ForumPermissions.CanModerateForum, account);
        }

        return false;
    }

    public async has(forumPermission: ForumPermissions, account?: Account) {
        return this.permissions.some((permission) => {
            const group = account?.groups.find((group) => group.id === permission.groupId);

            if (!group) {
                return false;
            }

            return permission.has(forumPermission);
        });
    }

    public async reshape(account?: Account) {
        // recursively go through all children and reshape them
        // if they are not allowed to view, remove them
        // etc
        let forceVisible = false;
        for (const child of this.children ?? []) {
            child.reshape(account);

            if (child.$extras.visible) {
                // if the child is not private, then we can view it
                // so we can view this category
                forceVisible = true;
            }
        }

        // set the extras
        this.$extras.visible = true;
        this.$extras.can_post_threads = false;

        if (!forceVisible && !this.has(ForumPermissions.CanView, account)) {
            this.$extras.visible = false;
        }
    }

    public static async getPermissions(forum: Forum) {
        const forumPermissions = await ForumPermission.query().where("forum_id", forum.id);

        if (forum.parentId) {
            const parentPermissions = await this.getPermissions(await Forum.find(forum.parentId) as Forum);

            // filter out permissions that are already in the child
            // child permissions override parent permissions
            for (const parentPermission of parentPermissions) {
                if (forumPermissions.find((forumPermission) => forumPermission.groupId === parentPermission.groupId)) {
                    continue;
                }

                forumPermissions.push(parentPermission);
            }
        }

        return forumPermissions;
    }

    @afterFetch()
    public static async afterFetchHook(categories: Forum[]) {
        for (const category of categories) {
            // @ts-expect-error
            category.permissions = await Forum.getPermissions(category);

            await category.load((loader) => {
                loader.load("children");
                loader.load("lastThread");
            })
        }
    }

    @afterFind()
    public static async afterFindHook(category: Forum) {
        // @ts-expect-error
        category.permissions = await Forum.getPermissions(category);

        await category.load((loader) => {
            loader.load("lastThread");
        })
    }
}