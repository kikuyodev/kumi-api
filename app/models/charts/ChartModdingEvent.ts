import { BaseModel, HasOne, afterFetch, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import ChartModdingPost from "App/models/charts/ChartModdingPost";
import ChartSet from "App/models/charts/ChartSet";
import { DateTime } from "luxon";

export enum ChartEventType {
    MetadataChanged,
    ChartAdded,
    ChartRemoved,

    ChartSetNominated,
    ChartSetQualified,
    ChartSetDisqualified,
    ChartSetReset,
    ChartSetRanked,
    ChartSetUnranked,

    ChartModdingPostDeleted,
    ChartModdingPostResolved,
    ChartModdingPostReopened
}

export default class ChartModdingEvent extends BaseModel {
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
     * The set that this event belongs to
     */
    @hasOne(() => ChartSet, {
        foreignKey: "id",
        localKey: "chartSetId"
    })
    public set: HasOne<typeof ChartSet>;

    @column({
        serializeAs: null,
        columnName: "parent_id"
    })
    public parentId: number | null;

    /**
     * The parent post of this event, if it's attached to any.
     */
    @hasOne(() => ChartModdingPost, {
        foreignKey: "id",
        localKey: "parentId"
    })
    public parent: HasOne<typeof ChartModdingPost>;

    /**
     * The type of event that this is.
     */
    @column()
    public type: ChartEventType;


    @column({
        serializeAs: null,
        columnName: "player_id"
    })
    public playerId: number | null;

    /**
     * The player this event relates to, if any.
     */
    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "playerId"
    })
    public player: HasOne<typeof Account>;

    /**
     * An alternate message that is attached to this event, if any.
     */
    @column({
        columnName: "alternate_message"
    })
    public alternateMessage: string | null;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
    })
    public createdAt: DateTime;

    public static async sendNominationEvent(set: ChartSet, nominator: Account) {
        const event = await ChartModdingEvent.create({
            chartSetId: set.id,
            playerId: nominator.id,
            type: set.nominators.length === set.attributes.nominators_required ? ChartEventType.ChartSetQualified : ChartEventType.ChartSetNominated
        });

        return event;
    }

    public static async sendDisqualificationEvent(set: ChartSet, disqualifier: Account) {
        let event: ChartModdingEvent;

        if (set.nominators.length === set.attributes.nominators_required) {
            event = await ChartModdingEvent.create({
                chartSetId: set.id,
                playerId: disqualifier.id,
                type: ChartEventType.ChartSetDisqualified
            });
        } else {
            event = await ChartModdingEvent.create({
                chartSetId: set.id,
                playerId: disqualifier.id,
                type: ChartEventType.ChartSetReset
            });
        }

        return event;
    }

    @afterFetch()
    public static async attachRelations(events: ChartModdingEvent[]) {
        events.forEach((event) => {
            console.log(event.playerId);
            event.load((loader) => {
                if (event.playerId)
                    loader.load("player");

                if (event.parentId)
                    loader.load("parent");
            });
        });
    }
}