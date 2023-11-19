import { EmbedBuilder, WebhookClient } from "discord.js";
import Env from "@ioc:Adonis/Core/Env";
import Logger from "@ioc:Adonis/Core/Logger";
import Account from "App/models/Account";
import Group from "App/models/Group";

const DOMAIN = Env.get("DOMAIN");

function url(path: string) {
    return `${DOMAIN}${path}`;
}

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

    public sendGroupMessage(group: Group, account: Account, added: boolean, reason?: string) {
        let color = parseInt(group.color.slice(1), 16);
        let message = `was **added** to`;
        let title = "\🎵 Added to Group";
        
        if (added === false) {
            // lower the lightness
            color -= 0x111111;
            message = `was **removed** from`;
            title = "\🙁 Removed from Group";
        }

        const date = new Date();
        const embed = new EmbedBuilder();

        embed
            .setTitle(title)
            .setDescription(`\`${account.username}\`](${url(`/accounts/${account.id}`)}) ${message}\n[${group.name}](${url(`/groups/${group.id}`)})\n<t:1698866460:R>`)
            .setColor(color)
            .setThumbnail(url(`/cdn/avatars/${account.id}`))
            .setTimestamp(new Date());

        this.groupWebhook.send({
            embeds: [
                embed
            ]
        });
    }
}

export default new WebhookService();