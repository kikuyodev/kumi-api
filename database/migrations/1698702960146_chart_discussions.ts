import BaseSchema from "@ioc:Adonis/Lucid/Schema";

export default class extends BaseSchema {

  public async up () {
    this.schema.createTable("chart_discussion_posts", (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id").onDelete("CASCADE");
      table.integer("chart_id").nullable().unsigned().references("charts.id").onDelete("CASCADE");
      table.integer("author_id").notNullable().unsigned().references("accounts.id");
      table.integer("parent_id").nullable().unsigned().references("chart_discussion_posts.id").onDelete("CASCADE");
      table.text("message").notNullable();
      table.integer("type").notNullable();

      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });

    this.schema.createTable("chart_events", (table) => {
      table.increments("id").primary();
      table.integer("set_id").notNullable().unsigned().references("chart_sets.id").onDelete("CASCADE");
      table.integer("parent_id").nullable().unsigned().references("chart_discussion_posts.id").onDelete("CASCADE");
      table.integer("player_id").nullable().unsigned().references("accounts.id");
      table.integer("type").notNullable();
      table.string("alternate_message").nullable();

      table.timestamp("created_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true });
    });
  }

  public async down () {
    this.schema.dropTable("chart_events");
    this.schema.dropTable("chart_discussion_posts");
  }
}

import { BaseModel, HasOne, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import ChartDiscussionPost from "App/models/ChartDiscussionPost";
import ChartSet from "App/models/ChartSet";

export enum ChartDiscussionEventType {
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

export class ChartDiscussionEvent extends BaseModel {
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
    public type: ChartDiscussionEventType;


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