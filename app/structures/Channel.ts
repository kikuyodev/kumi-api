import Account from "App/models/Account";
import ChatChannel from "App/models/ChatChannel";
import ChatMessage from "App/models/ChatMessage";
import WebsocketService from "App/services/WebsocketService";
import { OpCode, SocketEvent } from "App/structures/SocketEvent";

export class Channel {
    public channel: ChatChannel;
    public participants: Set<number> = new Set();

     constructor(channel: ChatChannel) {
        this.channel = channel;
    }

    public join(account: Account) {
        this.participants.add(account.id);
        WebsocketService.sendToAccount(account, new SocketEvent(OpCode.DISPATCH, {
            channel: this.channel.serialize(),
        }, "CREATE_CHAT_CHANNEL"));
    }

    public async send(author: Account, message: string) {
        if (!this.participants.has(author.id)) {
            return;
        }

        const databaseMessage = await ChatMessage.create({
            channelId: this.channel.id,
            accountId: author.id,
            content: message
        });

        for (const participant of this.participants) {
            WebsocketService.sendToAccount(participant, new SocketEvent(OpCode.DISPATCH, {
                message: databaseMessage.serialize(),
            }, "CREATE_CHAT_MESSAGE"));
        }

        return databaseMessage;
    }
}