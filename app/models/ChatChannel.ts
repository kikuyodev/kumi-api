import { BaseModel, column, computed } from "@ioc:Adonis/Lucid/Orm";
import Group from "App/models/Group";

export enum ChatChannelType {
    Public,
    Private,
    System,
    // Everything after this is a channel type that should not be stored in the database
    // They are used to identify the channel type in the code aswell
    PrivateMessage,
}

export default class ChatChannel extends BaseModel {
    @column({ isPrimary: true })
    public id: number;

    @column()
    public name: string;

    @column()
    public type: ChatChannelType;

    @column()
    public tag: string;

    @column()
    public description: string;

    @column({
        prepare: (value: string[]) => value.join(","),
        consume: (value: string) => value.split(","),
        columnName: "allowed_groups",
    })
    public allowedGroupIds: string[];

    public async allowedGroups() {
        return await Group.query().whereIn("id", this.allowedGroupIds);
    }
}