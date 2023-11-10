import { Connection } from "App/structures/Connection";
import { EventHandler } from "App/structures/EventHandler";
import { OpCode, SocketEvent } from "App/structures/SocketEvent";
import { schema, validator } from "@ioc:Adonis/Core/Validator";
import WebsocketService from "App/services/WebsocketService";
import Logger from "@ioc:Adonis/Core/Logger";

enum AuthenticationLocation {
    Web,
    Game,
}

interface AuthenticateData {
    account: number;
    token: string;
    location: AuthenticationLocation;
}

export default class AuthenticateHandler extends EventHandler {
    public handled: OpCode = OpCode.AUTHENTICATE;
    
    public async handle(connection: Connection, event: SocketEvent<AuthenticateData>) {
        const account = WebsocketService.expectedTokens.get(event.data.token);

        Logger.trace("AuthenticateHandler:handle", { account, token: event.data.token });

        if (!account || account.id !== event.data.account) {
            return connection.close(4003, "Invalid token");
        }

        connection.authenticated = true;
        connection.account = account;
        WebsocketService.expectedTokens.delete(event.data.token);

        if (!WebsocketService.accountConnections.has(account.id)) {
            WebsocketService.accountConnections.set(account.id, new Set());
        }

        WebsocketService.accountConnections.get(account.id)?.add(connection);
    }

    public async validate(event: SocketEvent): Promise<void> {
        await validator.validate({
            schema: schema.create({
                account: schema.number(),
                token: schema.string(),
            }),
            data: event.data,
        });
    }
}