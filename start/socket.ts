import Ws from "App/services/WebsocketService";
import { Connection } from "App/structures/Connection";
import { EventHandler } from "App/structures/EventHandler";
import { OpCode, SocketEvent } from "App/structures/SocketEvent";

(async () => {
    await EventHandler.registerAll();
    await Ws.boot();

    Ws.io.on("connection", (socket) => {
        // get random id
        const id = Math.random().toString(36).substring(7);
        const connection =  new Connection(socket);
        Ws.connections.set(id, connection);
        
        socket.on("message", (message) => {
            const data = SocketEvent.fromJSON(message.toString());
    
            if (!data) {
                return socket.close(4000, "Invalid JSON");
            }
    
            if (!connection.authenticated) {
                if (!data || data.op !== OpCode.AUTHENTICATE) {
                    return socket.close(4001, "Not authenticated");
                }
            }
    
            const handler = EventHandler.handlers.get(data.op);

            if (!handler || !handler.canHandle(data)) {
                return socket.close(4002, "Invalid data");
            }

            handler.handle(connection, data);
        });
    });
})();
