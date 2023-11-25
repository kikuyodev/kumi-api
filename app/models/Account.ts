import { BaseModel, HasMany, ManyToMany, ModelQueryBuilderContract, afterFetch, afterFind, beforeFind, beforeSave, column, computed, hasMany, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Hash from "@ioc:Adonis/Core/Hash";
import Group from "App/models/Group";
import { DateTime } from "luxon";
import Logger from "@ioc:Adonis/Core/Logger";
import Badge from "App/models/Badge";
import { TCountryCode, getCountryData } from "countries-list";
import Database from "@ioc:Adonis/Lucid/Database";
import WebsocketService from "../services/WebsocketService";
import ChartSet from "./charts/ChartSet";
import ForumPost from "./forums/ForumPost";

function GET_MAX_EXP(level: number) {
    level = level + 1;
    return Math.floor(5 / 6 * level * (2 * level * level + 27 * level + 91));
}

export const DEFAULT_ATTRIBUTES: AccountAttributes = {
};

export interface AccountAttributes {
}

export const DEFAULT_SETTINGS: AccountSettings = {
    version: 0
};

export interface AccountSettings {
    version: number;
}

export interface RankingStatistics {
    global_rank: number;
    country_rank: number;
}

export interface RankingHistory {
    timestamp: DateTime;
    ranks: RankingStatistics;
}

export default class Account extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column()
    public username: string;

    @column({
        serializeAs: null
    })
    public email: string;

    @column({
        serializeAs: null
    })
    public password: string;
    
    @column({
        serializeAs: null,
        columnName: "remember_me"
    })
    public rememberMeToken: string;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
    })
    public createdAt: DateTime;

    @column({
        serializeAs: null,
        columnName: "country_code"
    })
    public countryCode: TCountryCode;

    @column.dateTime({
        autoCreate: true,
        autoUpdate: true, 
        columnName: "updated_at",
    })
    public updatedAt: DateTime;

    @column.dateTime({
        autoCreate: true,
        columnName: "logged_in_at",
        serializeAs: null
    })
    public loggedInAt: DateTime;

    @column({
        columnName: "title"
    })
    private _title: string;

    @column()
    public biography: string;

    @column({
        serializeAs: null
    })
    public settings: AccountSettings;

    @computed()
    public get title() {
        return this._title ?? this.safePrimary?.name ?? null;
    }

    @computed({
        serializeAs: null
    })
    public get primary() {
        return this.groups?.[0] ?? null;
    }

    @computed()
    public get country() {
        const data = getCountryData(this.countryCode);
        return {
            code: data.iso2,
            name: data.name,
            native: data.native
        };
    }

    @column({
        serializeAs: null,
        columnName: "ranked_score"
    })
    public rankedScore: number;

    @column({
        serializeAs: null,
        columnName: "total_score"
    })
    public totalScore: number;

    @column({
        serializeAs: null,
        columnName: "total_playtime"
    })
    public totalPlaytime: number;

    @column({
        serializeAs: null,
        columnName: "total_playcount"
    })
    public totalPlaycount: number;

    @column({
        serializeAs: null,
        columnName: "maximum_combo"
    })
    public maxCombo: number;

    @computed()
    public get statistics() {
        return {
            ranked_score: this.rankedScore,
            total_score: this.totalScore,
            total_playtime: this.totalPlaytime,
            total_playcount: this.totalPlaycount,
            maximum_combo: this.maxCombo
        }
    }

    @column({
        serializeAs: null,
        columnName: "forum_level"
    })
    public forumLevel: number;

    @column({
        serializeAs: null,
        columnName: "forum_exp"
    })
    public forumExp: number;

    @column({
        serializeAs: null,
        columnName: "forum_reputation"
    })
    public forumReputation: number;

    @computed({
        serializeAs: "forum_statistics"
    })
    public get forumStatistics() {
        return {
            level: this.forumLevel,
            total_exp: this.forumExp,
            max_exp: GET_MAX_EXP(this.forumLevel),
            exp_progress: (this.forumExp / GET_MAX_EXP(this.forumLevel)) * 100,
            reputation: this.forumReputation,
            posts: parseInt(this.$extras.posts_count)
        };
    }

    @manyToMany(() => Group, {
        localKey: "id",
        pivotForeignKey: "account_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "group_id",
        pivotTable: "account_groups",
        onQuery: (query) => {
            query.orderBy("priority", "desc");
        },
        serializeAs: null
    })
    public groups: ManyToMany<typeof Group>;

    @manyToMany(() => Badge, {
        localKey: "id",
        pivotForeignKey: "account_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "badge_id",
        pivotTable: "badge_owners"
    }) 
    public badges: ManyToMany<typeof Badge>;

    @manyToMany(() => ChartSet, {
        localKey: "id",
        pivotForeignKey: "account_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "set_id",
        pivotTable: "chart_set_nominations"
    })
    public nominations: ManyToMany<typeof ChartSet>;

    @hasMany(() => ForumPost, {
        foreignKey: "authorId",
        localKey: "id"
    })
    public posts: HasMany<typeof ForumPost>;

    @beforeSave()
    public static async hashPassword(account: Account) {
        Logger.trace(`hashing password for ${account.username}`);
        
        if (account.$dirty.password) {
            account.password = await Hash.make(account.password);
        }
    }

    @computed({
        serializeAs: "groups"
    })
    public get safeGroups() {
        return this.groups.filter(group => group.visible === true);
    }   

    @computed({
        serializeAs: "primary"
    })
    public get safePrimary() {
        return this.safeGroups[0] ?? null;
    }

    @computed()
    public get status() {
        return WebsocketService.accountConnections.has(this.id) ? "online" : "offline";
    }
    
    @beforeFind()
    public static async preloadQuery(query: ModelQueryBuilderContract<typeof Account>) {
        // get post count
        query.withCount("posts").as("post_count");
    }

    @afterFetch()
    @afterFind()
    public static async preloadRelations(account: Account[] | Account) {
        if (Array.isArray(account)) {
            await Promise.all(account.map((acc) => Account.preloadRelations(acc)));
        } else {
            await account.load((loader) => {
                loader
                    .load("groups")
                    .load("badges",  (query) => {
                        query.pivotColumns(["awarded_at"]);
                    });
            });
        }
    }

    public has(permissions: number): boolean {
        const total = this.groups.reduce((total, group) => {
            return total | group.permissions;
        }, 0);

        return (total & permissions) === permissions;
    }

    public async getRankingStatistics(): Promise<RankingStatistics> {
        const query = await Database.rawQuery(`
            WITH ranked AS (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY ranked_score DESC) AS global_rank,
                    ROW_NUMBER() OVER (PARTITION BY country_code ORDER BY ranked_score DESC) AS country_rank,
                    id
                FROM accounts
            )
            SELECT
                global_rank,
                country_rank
            FROM ranked WHERE id = ?
        `, [this.id])

        return {
            // parseInt is required because the query returns a string
            global_rank: parseInt(query.rows[0].global_rank),
            country_rank: parseInt(query.rows[0].country_rank)
        };
    }

    public async getRankingHistory(): Promise<RankingHistory[]> {
        const history = await Database.query<RankingHistory>()
            .select("timestamp", "ranks")
            .from("rank_history")
            .where("account_id", this.id)
            .orderBy("timestamp", "desc")
            .limit(99);

        const now = await this.getRankingStatistics();

        return [
            {
                timestamp: DateTime.local(),
                ranks: now
            },
            ...history
        ];
    }

    public async giveExp(exp: number) {
        const query = await Database.rawQuery(`
            UPDATE accounts
            SET forum_exp = forum_exp + ?
            WHERE id = ?
        `, [exp, this.id]);

        this.forumExp += exp;

        if (this.forumExp >= GET_MAX_EXP(this.forumLevel)) {
            // level up
            const query = await Database.rawQuery(`
                UPDATE accounts
                SET forum_level = forum_level + 1
                WHERE id = ?
            `, [this.id]);

            this.forumLevel += 1;
        }
    }
}