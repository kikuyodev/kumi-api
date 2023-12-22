import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { ChatChannelType } from "App/models/ChatChannel";
import ChatService from "../services/ChatService";
import { rules, schema } from "@ioc:Adonis/Core/Validator";
import { Permissions } from "../util/Constants";
import ChatMessage from "../models/ChatMessage";

export default class ChatController {
    public async join({ request, authorization }: HttpContextContract) {
        const { id } = request.params();

        const channel = await ChatService.get(id);
        const channelModel = channel?.channel;
        
        if (!channel)
            throw new Exception("Channel not found", 404, "E_CHANNEL_NOT_FOUND");

        // check if user is allowed to join
        if (channelModel!.type === ChatChannelType.Private) {
            const groups = await channelModel!.allowedGroups();

            if (!groups.some((group) => authorization.account?.groups.find((userGroup) => userGroup.id === group.id)))
                throw new Exception("You are not allowed to join this channel", 403, "E_NOT_ALLOWED");
        }

        // join the channel
        await channel.join(authorization.account!);

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
                message: schema.string([
                    rules.maxLength(255),
                ]),
            })
        });

        const channel = await ChatService.get(id);
        const channelModel = channel?.channel;

        if (!channel)
            throw new Exception("Channel not found", 404, "E_CHANNEL_NOT_FOUND");

        // check if user is allowed to join
        if (channelModel!.type === ChatChannelType.Private) {
            const groups = await channelModel!.allowedGroups();

            if (!groups.some((group) => authorization.account?.groups.find((userGroup) => userGroup.id === group.id)))
                throw new Exception("You are not allowed to send messasges to this channel", 403, "E_NOT_ALLOWED");
        }

        // check if the user is in the channel
        if (!channel.participants.has(authorization.account!.id))
            throw new Exception("You are not in this channel", 403, "E_NOT_IN_CHANNEL");

        const message = await channel.send(authorization.account!, payload.message);

        return {
            code: 200,
            data: {
                message: message.serialize(),
            }
        };
    }

    public async deleteMessage({ request, authorization }: HttpContextContract) {
        if (authorization.account?.has(Permissions.MODERATE_CHAT_CHANNELS))
            // permission restricted to moderators only
            throw new Exception("You are not allowed to delete messages", 403, "E_NOT_ALLOWED");

        const { id } = request.params();
    ]
}