import { App, Events, Notice } from "obsidian";

import { parseLink } from "../utils";
import { ImageLayerData } from "../types";
import t from "src/l10n/locale";

export default class Loader extends Events {
    constructor(public app: App) {
        super();
    }
    async loadImage(id: string, layers: string[]): Promise<void> {
        for (let image of layers) {
            const { link, id: layerId, alias } = await this.getLink(image);

            const { h, w } = await this.getImageDimensions(link);
            const layer = {
                data: link,
                h,
                w,
                alias,
                id: layerId
            };
            this.trigger(`${id}-layer-data-ready`, layer);
        }
    }

    async loadImageAsync(
        id: string,
        layers: string[]
    ): Promise<ImageLayerData> {
        return new Promise(async (resolve, reject) => {
            for (let image of layers) {
                const { link, id: layerId, alias } = await this.getLink(image);

                const { h, w } = await this.getImageDimensions(link);
                const layer = {
                    data: link,
                    h,
                    w,
                    alias,
                    id: layerId
                };
                resolve(layer);
            }
        });
    }
    unload() {}
    getImageDimensions(url: string): Promise<{ h: number; w: number }> {
        return new Promise(function (resolved, reject) {
            var i = new Image();
            i.onload = function () {
                const { width, height } = i;
                i.detach();
                resolved({ w: width, h: height });
            };
            i.onerror = () => {
                new Notice(
                    t("There was an issue getting the image dimensions.")
                );
                reject();
            };

            i.src = url;
        });
    }
    async getLink(url: string) {
        url = decodeURIComponent(url);
        let type: "link" | "file";
        let link: string, alias: string;
        try {
            if (/https?:/.test(url)) {
                //url
                type = "link";
                const [linkpath, aliaspath] = parseLink(url).split("|");
                link = linkpath;
                alias = aliaspath;
            } else {
                type = "file";
                const [linkpath, aliaspath] = parseLink(url).split("|");
                alias = aliaspath && aliaspath.length ? aliaspath : null;
                let file = this.app.metadataCache.getFirstLinkpathDest(
                    linkpath,
                    ""
                );
                if (!file) throw new Error();
                link = this.app.vault.getResourcePath(file);
            }
        } catch (e) {
            console.error(e);
        }
        return { link, id: encodeURIComponent(url), alias };
    }
}
