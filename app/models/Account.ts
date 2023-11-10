import { BaseModel, ManyToMany, afterFetch, afterFind, beforeSave, column, computed, manyToMany } from "@ioc:Adonis/Lucid/Orm";
import Hash from "@ioc:Adonis/Core/Hash";
import Group from "App/models/Group";
import { DateTime } from "luxon";
import Logger from "@ioc:Adonis/Core/Logger";
import Badge from "App/models/Badge";
import { TCountryCode, getCountryData } from "countries-list";

export const DEFAULT_ATTRIBUTES: AccountAttributes = {
};

export interface AccountAttributes {
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

    @computed()
    public get title() {
        return this._title ?? this.primary?.name ?? null;
    }

    @computed()
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

    @manyToMany(() => Group, {
        localKey: "id",
        pivotForeignKey: "account_id",
        relatedKey: "id",
        pivotRelatedForeignKey: "group_id",
        pivotTable: "account_groups",
        onQuery: (query) => {
            query.orderBy("priority", "desc");
        }
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

    @beforeSave()
    public static async hashPassword(account: Account) {
        Logger.trace(`hashing password for ${account.username}`);
        
        if (account.$dirty.password) {
            account.password = await Hash.make(account.password);
        }
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
}