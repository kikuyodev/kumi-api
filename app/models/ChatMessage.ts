import { BaseModel, HasOne, afterCreate, afterFetch, afterFind, column, hasOne } from "@ioc:Adonis/Lucid/Orm";
import Account from "App/models/Account";
import ChatChannel from "App/models/ChatChannel";
import { DateTime } from "luxon";

export default class ChatMessage extends BaseModel {
    @column({ isPrimary: true })
    public id: number;

    @column({
        columnName: "channel_id",
        serializeAs: null
    })
    public channelId: number;

    @hasOne(() => ChatChannel, {
        foreignKey: "id",
        localKey: "channelId"
    })
    public channel: HasOne<typeof ChatChannel>;

    @column({
        columnName: "account_id",
        serializeAs: null
    })
    public accountId: number;

    @hasOne(() => Account, {
        foreignKey: "id",
        localKey: "accountId"
    })
    public account: HasOne<typeof Account>;

    @column()
    public content: string;

    @column.dateTime({
        autoCreate: true,
        columnName: "created_at",
        serializeAs: null
    })
    public createdAt: DateTime;

    @afterCreate()
    @afterFind()
    public static async preloadRelations(message: ChatMessage) {
        await message.load((loader) => {
            loader
                .load("account")
                .load("channel");
        });
    }
}