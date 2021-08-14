import { App, Events, Platform } from "obsidian";

import { getType as lookupMimeType } from "mime/lite";

import { getBlob } from "../utils";

import ImageWorker from "./image.worker";

export default class Loader extends Events {
    workers: Map<string, Worker> = new Map();
    constructor(public app: App) {
        super();
    }
    async load(id: string, layers: string[]) {
        for (let image of layers) {
            let blob = await getBlob(encodeURIComponent(image), this.app),
                layer: {
                    data: string;
                    alias: string;
                    id: string;
                    h: number;
                    w: number;
                };
            if (Platform.isDesktop) {
                const worker = new ImageWorker();

                this.workers.set(id, worker);

                let count = 0;
                worker.onmessage = (event) => {
                    layer = event.data.data;

                    layer.id = event.data.id;
                    layer.alias = blob.alias;
                    let mimeType: string;
                    if (blob.extension) {
                        mimeType = lookupMimeType(blob.extension);
                    }
                    layer.data = "data:" + mimeType + layer.data;

                    this.trigger(`${id}-layer-data-ready`, layer);
                    count++;
                    if (count === layers.length - 1) {
                        worker.terminate();
                        this.workers.delete(id);
                    }
                };

                worker.postMessage({
                    blobs: [blob],
                    type: "url"
                });
            } else {
                console.log("Mobile platform!")
                layer = {
                    id: blob.id,
                    alias: blob.alias,
                    ...(await this.toDataURL(blob.blob))
                };
                let mimeType: string;
                if (blob.extension) {
                    mimeType = lookupMimeType(blob.extension);
                }
                layer.data = "data:" + mimeType + layer.data;
                console.log("🚀 ~ file: loader.ts ~ line 65 ~ layer", layer);
                this.trigger(`${id}-layer-data-ready`, layer);
            }
        }
    }

    async toDataURL(
        blob: Blob
    ): Promise<{ data: string; h: number; w: number }> {
        //determine link type
        return new Promise(async (resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    let data = reader.result.slice(
                        reader.result.indexOf(";base64,")
                    );
                    resolve({ data, h, w });
                } else {
                    reject();
                }
            };

            const bitmap = await createImageBitmap(blob);
            const { height: h, width: w } = bitmap;

            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
