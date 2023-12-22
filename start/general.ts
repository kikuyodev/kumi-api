import ChatService from "../app/services/ChatService";

(async () => {
    // general sockets
    await ChatService.boot();
})();
