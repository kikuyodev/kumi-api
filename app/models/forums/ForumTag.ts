import { BaseModel, column } from "@ioc:Adonis/Lucid/Orm";

export default class ForumTag extends BaseModel {
    @column({
        isPrimary: true
    })
    public id: number;

    @column()
    public name: string;

    @column()
    public color: string;

    @column()
    public order: number;

    @column({
        serializeAs: null,
        columnName: "forums"
    })
    public forumIds: number[];
}