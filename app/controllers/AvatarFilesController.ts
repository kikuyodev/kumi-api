import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Drive from "@ioc:Adonis/Core/Drive";
import Logger from "@ioc:Adonis/Core/Logger";

export default class AvatarFilesController {
    public async fetch({ request, response }: HttpContextContract) {
        const { id } = request.params();

        let path = await this.getPath(id);

        if (!path) {
            path = await this.getPath("default");

            if (!path) {
                Logger.warn("default avatar not found. it is highly recommended to create a default avatar and place it in the avatars folder.");
                return response.noContent();
            }
        }

        Logger.trace(`serving avatar ${id} from ${path}`);

        // set mime type
        response.type(`image/${path.split(".").pop()}`);

        return response.stream(await Drive.getStream(path));
    }

    private async getPath(id: string) {
        for (const extension of ["jpg", "png", "gif", "webp"]) {
            if (await Drive.exists(`avatars/${id}.${extension}`)) {
                return `avatars/${id}.${extension}`;
            }
        }

        return undefined;
    }
}