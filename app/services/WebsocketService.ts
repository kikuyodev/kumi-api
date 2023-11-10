import AdonisServer from "@ioc:Adonis/Core/Server";
import { WebSocketServer } from "ws";
import Account from "App/models/Account";
import { Connection } from "App/structures/Connection";
import Logger from "@ioc:Adonis/Core/Logger";
import { SocketEvent } from "App/structures/SocketEvent";
import ChatChannel from "App/models/ChatChannel";
import { Channel } from "App/structures/Channel";

class WebsocketService {
    private booted = false;
    public io: WebSocketServer;
    public connections: Map<string, Connection> = new Map();
    public accountConnections: Map<number, Set<Connection>> = new Map();
    public expectedTokens: Map<string, Account> = new Map();
    public channels: Channel[] = [];

    public addExpectedToken(token: string, account: Account) {
        this.expectedTokens.set(token, account);
    }

    public async boot() {
        if (this.booted) {
            return;
        }

        Logger.debug("booting websocket server...");

        this.io = new WebSocketServer({
            port: 6666,
            server: AdonisServer.instance
        });
        this.booted = true;
        
        const channels = await ChatChannel.all();

        for (const channel of channels) {
            this.channels.push(new Channel(channel));
        }

        Logger.debug("Websocket server booted!");
    }

    public channel(id: number | string): Channel | undefined {
        return this.channels.find((channel) => channel.channel.id === id || channel.channel.tag === id);
    }
    public sendToAccount(account: Account | number, data: SocketEvent) {
        const connections = this.accountConnections.get(account instanceof Account ? account.id : account);

        if (!connections) {
            return;
        }

        for (const connection of connections) {
            connection.send(data);
        }
    }
}

export default new WebsocketService();