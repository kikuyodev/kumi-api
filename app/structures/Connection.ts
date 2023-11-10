import Account from "App/models/Account";
import { SocketEvent } from "App/structures/SocketEvent";
import WebSocket from "ws";

export class Connection {
    private socket: WebSocket;
    public authenticated = false;
    public account: Account;

    constructor(socket: WebSocket) {
        this.socket = socket;
    }

    public send(data: SocketEvent) {
        this.socket.send(JSON.stringify(data));
    }

    public close(code: number, reason: string) {
        this.socket.close(code, reason);
    }
}