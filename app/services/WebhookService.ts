import { EmbedBuilder, WebhookClient } from "discord.js";
import Env from "@ioc:Adonis/Core/Env";
import Logger from "@ioc:Adonis/Core/Logger";
import Account from "App/models/Account";
import Group from "App/models/Group";

class WebhookService {
    public booted = false;

    // Webhooks
    private groupWebhook: WebhookClient;

    public boot() {
        if (this.booted) {
            return;
        }

        Logger.debug("booting WebhookService...");

        this.groupWebhook = new WebhookClient({
            url: Env.get("GROUP_UPDATE_WEBHOOK")
        });

        Logger.debug("WebhookService booted!");
        this.booted = true;
    }

    public sendGroupMessage(group: Group, account: Account, added: boolean) {
        let color = parseInt(group.color.slice(1), 16);
        let message = `Account \`${account.username}\` was added to group \`${group.name}\``;
        let title = "Added to Group";
        
        if (added === false) {
            // lower the lightness
            color -= 0x111111;
            message = `Account \`${account.username}\` was removed from group \`${group.name}\``;
            title = "Removed from Group";
        }

        const embed = new EmbedBuilder();

        embed
            .setTitle(title)
            .setDescription(message)
            .setColor(color)
            .setTimestamp(new Date());

        this.groupWebhook.send({
            embeds: [
                embed
            ]
        });
    }
}

export default new WebhookService();