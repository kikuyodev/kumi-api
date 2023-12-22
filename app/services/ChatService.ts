import ChatChannel from "../models/ChatChannel";
import { Channel } from "../structures/Channel";
 
class ChatService {
    public channels: Channel[] = [];
    
    async boot() {
        const channels = await ChatChannel.all();

        for (const chatChannel of channels) {
            const channel = new Channel(chatChannel);
            await channel.fetch();

            this.channels.push(channel);
        }
    }

    async get(id: number | string): Promise<Channel | undefined> {
        return this.channels.find((channel) => channel.channel.id === id || channel.channel.tag === id);
    }
}

export default new ChatService();