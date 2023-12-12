import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import ChatChannel, { ChatChannelType } from "App/models/ChatChannel";
import WebsocketService from "App/services/WebsocketService";
import { OpCode, SocketEvent } from "App/structures/SocketEvent";

export default class ChatController {
    public async join({ request, authorization }: HttpContextContract) {
        const { id } = request.params();

        const channel = WebsocketService.channel(id);
        const channelModel = channel?.channel;
        
        if (!channel)
            throw new Exception("Channel not found", 404, "E_CHANNEL_NOT_FOUND");

        // check if user is allowed to join
        if (channelModel!.type === ChatChannelType.Private) {
            const groups = await channelModel!.allowedGroups();

            if (!groups.some((group) => authorization.account?.groups.find((userGroup) => userGroup.id === group.id)))
                throw new Exception("You are not allowed to join this channel", 403, "E_NOT_ALLOWED");
        }

        WebsocketService.channel(channelModel!.id)?.join(authorization.account!);

        return {
            code: 200,
            data: {
                channel: channelModel!.serialize(),
            }
        };
    }

    public async send({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const { message } = request.body();

        const channel = WebsocketService.channel(id);

        if (!channel)
            throw new Exception("Channel not found", 404, "E_CHANNEL_NOT_FOUND");

        const messageData = await channel.send(authorization.account!, message);

        if (!messageData)
            throw new Exception("Could not send message", 500, "E_COULD_NOT_SEND_MESSAGE");

        return {
            code: 200,
            data: {
                message: messageData.serialize(),
            }
        };
    }
}