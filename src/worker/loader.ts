import { App, Events, Notice, Platform } from "obsidian";

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

            const worker = new ImageWorker();

            this.workers.set(id, worker);

            let count = 0;
            worker.onmessage = async (event) => {
                layer = event.data.data;

                layer.id = event.data.id;
                layer.alias = blob.alias;
                let mimeType: string;
                if (blob.extension) {
                    mimeType = lookupMimeType(blob.extension);
                }
                layer.data = "data:" + mimeType + layer.data;
                const { h, w } = await this.getImageDimensions(layer.data);
                layer.h = h;
                layer.w = w;
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
        }
    }

    async toDataURL(blob: Blob): Promise<{ data: string }> {
        //determine link type
        return new Promise(async (resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    let data = reader.result.slice(
                        reader.result.indexOf(";base64,")
                    );

                    resolve({ data });
                } else {
                    reject();
                }
            };
            console.log("🚀 ~ file: loader.ts ~ line 1 ~ blob", blob);

            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    getImageDimensions(url: string): Promise<{ h: number; w: number }> {
        return new Promise(function (resolved, reject) {
            var i = new Image();
            i.onload = function () {
                const { width, height } = i;
                i.detach();
                resolved({ w: width, h: height });
            };
            i.onerror = () => {
                new Notice("There was an issue getting the image dimensions.");
                reject();
            };

            i.src = url;
        });
    }
}
