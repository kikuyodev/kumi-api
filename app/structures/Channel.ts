import Redis from "@ioc:Adonis/Addons/Redis";
import ChatChannel from "../models/ChatChannel";
import Account from "../models/Account";
import ChatMessage from "../models/ChatMessage";

export class Channel {
    public channel: ChatChannel;
    public participants: Set<number>;

    constructor(channel: ChatChannel) {
        this.channel = channel;
        this.participants = new Set();
    }

    async join(account: Account) {
        // Check if the account is already in the channel
        // We want to remove from redis and add again to make sure the account is at the top of the list
        if (this.participants.has(account.id) || await Redis.sismember(`kumi.server:chat:${this.channel.id}:participants`, account.id)) {
            await Redis.srem(`kumi.server:chat:${this.channel.id}:participants`, account.id);
        }

        await Redis.sadd(`kumi.server:chat:${this.channel.id}:participants`, account.id);
        this.participants.add(account.id);

        // enqueue the join event
        await Redis.lpush("kumi.queue:chat:events", JSON.stringify({
            type: "join",
            channel: this.channel.serialize(),
            account: account.serialize(),
        }));
    }

    async send(account: Account, message: string) {
        // check if the user is in the channel
        console.log(account)
        if (!this.participants.has(account.id)) {
            throw new Error("User is not in the channel");
        }

        const dbMessage = await ChatMessage.create({
            accountId: account.id,
            channelId: this.channel.id,
            content: message,
        });
            
        // enqueue the send event
        await Redis.lpush("kumi.queue:chat:events", JSON.stringify({
            type: "message_create",
            channel: this.channel.serialize(),
            account: account.serialize(),
            data: dbMessage.serialize(),
        }));

        return dbMessage;
    }

    async delete(messageId: number) {
        const message = await ChatMessage.find(messageId);

        if (!message) {
            throw new Error("Message not found");
        }

        if (message.channelId !== this.channel.id) {
            throw new Error("Message not in channel");
        }

        await message.delete();

        // enqueue the delete event
        await Redis.lpush("kumi.queue:chat:events", JSON.stringify({
            type: "message_delete",
            channel: this.channel.serialize(),
            data: message.serialize(),
        }));
    }

    async fetch() {
        this.participants = new Set();

        // get the participants of the channel from redis
        const participants = await Redis.smembers(`kumi.server:chat:${this.channel.id}:participants`);


        for (const participant of participants) {
            const id = parseInt(participant);
            const account = await Account.find(id);
            if (!account) {
                continue;
            }

            this.participants.add(account.id);
        }
    }
}