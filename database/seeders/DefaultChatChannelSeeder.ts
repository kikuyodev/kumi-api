import BaseSeeder from "@ioc:Adonis/Lucid/Seeder";
import ChatChannel, { ChatChannelType } from "../../app/models/ChatChannel";

export default class extends BaseSeeder {
    public async run() {
        await ChatChannel.createMany([
            {
                name: "main",
                type: ChatChannelType.Public,
                tag: "main",
                description: "The main chat channel for Kumi."
            }
        ]);
    }
}