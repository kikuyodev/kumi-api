import { BaseModel, HasOne, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import ChartDiscussionPost from "App/models/ChartDiscussionPost";
import ChartSet from "App/models/ChartSet";

export enum ChartEventType {
    MetadataChanged,
    ChartAdded,
    ChartRemoved,

    ChartSetNominated,
    ChartSetDisqualified,
    ChartSetQualified,
    ChartSetRanked,
    ChartSetUnranked,

    ChartDiscussionPostDeleted,
    ChartDiscussionPostResolved,
    ChartDiscussionPostReopened
}

export default class ChartEvent extends BaseModel {
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
        localKey: "set_id"
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
    @hasOne(() => ChartDiscussionPost, {
        foreignKey: "id",
        localKey: "parent_id"
    })
    public parent: HasOne<typeof ChartDiscussionPost>;

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
        localKey: "player_id"
    })
    public player: HasOne<typeof Account>;

    /**
     * An alternate message that is attached to this event, if any.
     */
    @column({
        columnName: "alternate_message"
    })
    public alternateMessage: string | null;
}