import { Connection } from "App/structures/Connection";
import { OpCode, SocketEvent } from "App/structures/SocketEvent";
import { readdirSync } from "fs";

export abstract class EventHandler {
    public static handlers: Map<OpCode, EventHandler> = new Map();
    public handled: OpCode = OpCode.UNKNOWN;

    public canHandle(event: SocketEvent): boolean {
        try {
            this.validate(event);
        } catch {
            return false;
        }

        return true;
    }

    public abstract handle(connection: Connection, event: SocketEvent): Promise<void>;
    public abstract validate(event: SocketEvent): Promise<void>;

    public static async registerAll() {
        const files = readdirSync(__dirname + "/../handlers");
        
        for (const importPath of files) {
            const handlerClass = (await import(`App/handlers/${importPath}`)).default;
            const handler = new handlerClass();
            
            if (handler instanceof EventHandler) {
                this.handlers.set(handler.handled, handler);
            }
        }
    }
}