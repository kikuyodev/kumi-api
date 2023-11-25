import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Drive from "@ioc:Adonis/Core/Drive";
import Logger from "@ioc:Adonis/Core/Logger";
import ChartSet from "App/models/charts/ChartSet";
import sharp from "sharp";
import { Readable } from "node:stream";
import { Exception } from "@adonisjs/core/build/standalone";

const musicFormats = ["mp3", "ogg", "wav", "flac", "m4a", "aac" ];

export default class ChartSetFilesController {
    public async fetchPreview({ request, response }: HttpContextContract) {
        const { id } = request.params();

        const preview = await this.getPath("previews", id, musicFormats);
        
        if (!preview)
            return response.noContent();

        Logger.trace(`serving preview ${id} from ${preview}`);
        return response.stream(await Drive.getStream(preview));
    }
    
    public async fetchBackground({ request, response }: HttpContextContract) {
        const { id } = request.params();
        let { format, keepAspectRatio, scalar } = request.qs();
        format = format?.toLowerCase();

        const chartSet = await ChartSet.findOrFail(id);
        const background = await this.getPath(`sets/${id}`, chartSet.internalData.background);

        if (!background)
            return response.noContent(); // TODO: default background

        Logger.trace(`serving background ${id} from ${background}`);

        let stream = await Drive.get(background);

        if (format !== undefined && (format !== "orig" || format !== "original")) {
            const metadata = await sharp(stream).metadata();

            const originalWidth = metadata.width!;
            const originalHeight = metadata.height!;
            let newWidth = originalWidth;
            let newHeight = originalHeight;

            {
                const newSize = conserveAspectRatioResize(originalWidth, originalHeight, 1920, 1080);
                newWidth = newSize.width;
                newHeight = newSize.height;
            }

            let webCardSize = { width: 376, height: 144 };
            let webChartInfoSize = { width: 1152, height: 168 };
            let webScoreSize = { width: 1040, height: 52 };

            if (keepAspectRatio !== undefined) {
                webCardSize = conserveAspectRatioResize(originalWidth, originalHeight, webCardSize.width, webCardSize.height);
                webChartInfoSize = conserveAspectRatioResize(originalWidth, originalHeight, webChartInfoSize.width, webChartInfoSize.height);
                webScoreSize = conserveAspectRatioResize(originalWidth, originalHeight, webScoreSize.width, webScoreSize.height);
            }

            let size = { width: newWidth, height: newHeight };


            switch (format) {
                case "card": size = webCardSize; break;
                case "chartinfo": size = webChartInfoSize; break;
                case "score": size = webScoreSize; break;
            }
            
            if (scalar !== undefined) {
                const scalarValue = parseFloat(scalar);

                if (isNaN(scalarValue))
                    throw new Exception("Invalid scalar value", 400, "E_INVALID_SCALAR_VALUE")
                if (scalarValue <= 0)
                    throw new Exception("Scalar value must be greater than 0", 400, "E_INVALID_SCALAR_VALUE")
                if (scalarValue > 3)
                    throw new Exception("Scalar value must be less than or equal to 3", 400, "E_INVALID_SCALAR_VALUE")
                
                size.width = Math.floor(size.width * scalarValue);
                size.height = Math.floor(size.height * scalarValue);

                console.log(size);
            }
            
            const card = await sharp(stream).resize({
                width: size.width,
                height: size.height,
                fit: "cover",
                position: "center"
            }).toFormat("png")
              .toBuffer();

            return response.stream(Readable.from(card));
        }

        function conserveAspectRatioResize(width: number, height: number, maxWidth: number, maxHeight: number) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;

            let newWidth = width;
            let newHeight = height;

            if (widthRatio > heightRatio) {
                newWidth = maxWidth;
                newHeight = Math.ceil(newWidth * (height / width));
            } else {
                newHeight = maxHeight;
                newWidth = Math.ceil(newHeight * (width / height));
            }

            return { width: newWidth, height: newHeight };
        }

        return response.stream(Readable.from(stream));
    }

    private async getPath(folder: string, id: string, formats?: string[]) {
        if (formats) {
            for (const extension of formats) {
                console.log(`${folder}/${id}.${extension}`);
                if (await Drive.exists(`${folder}/${id}.${extension}`)) {
                    return `${folder}/${id}.${extension}`;
                }
            }
        }

        if (await Drive.exists(`${folder}/${id}`)) {
            return `${folder}/${id}`;
        }

        return undefined;
    }
}