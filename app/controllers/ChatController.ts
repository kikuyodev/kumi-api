import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { ChatChannelType } from "App/models/ChatChannel";
import ChatService from "../services/ChatService";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import WebsocketService from "../services/WebsocketService";

export default class ChatController {
    public async index({ request, authorization }: HttpContextContract) {
        return {
            code: 200,
            data: {
                channels: ChatService.channels.map((channel) => channel.channel.serialize()),
            }
        };
    }

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
        
        return {
            code: 200,
            data: {
                channel: channelModel!.serialize(),
            }
        };
    }

    public async send({ request, authorization }: HttpContextContract) {
        const { id } = request.params();
        const payload = await request.validate({
            schema: schema.create({
                message: schema.string.optional([
                    rules.maxLength(255),
                ]),
                content: schema.string.optional([
                    rules.maxLength(255),
                ]),
            })
        });

        if (!payload.message && !payload.content)
            throw new Exception("Content is required", 400, "E_INVALID_PAYLOAD");

        const channel = await ChatService.get(id);
        const channelModel = channel?.channel;

        if (!channel)
            throw new Exception("Channel not found", 404, "E_CHANNEL_NOT_FOUND");

        const message = await channel.send(authorization.account!, payload.message ?? payload.content ?? "");

        return {
            code: 200,
            data: {
                message: message.serialize(),
            }
        };
    }
}