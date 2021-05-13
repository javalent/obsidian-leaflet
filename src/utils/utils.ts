import { App, Notice, TFile } from "obsidian";
import { nanoid } from "nanoid";
import { getType as lookupMimeType } from "mime/lite";

export function getImageDimensions(url: string): Promise<any> {
    return new Promise(function (resolved, reject) {
        var i = new Image();
        i.onload = function () {
            resolved({ w: i.width, h: i.height });
        };
        i.onerror = () => {
            new Notice("There was an issue getting the image dimensions.");
            reject();
        };

        i.src = url;
    });
}

export function getId() {
    return nanoid(6);
}

export async function toDataURL(url: string, app: App): Promise<string> {
    //determine link type
    try {
        let response, blob: Blob, mimeType: string;
        url = decodeURIComponent(url);
        if (/https?:/.test(url)) {
            //url
            response = await fetch(url);
            blob = await response.blob();
        } else if (/obsidian:\/\/open/.test(url)) {
            //obsidian link
            let [, filePath] = url.match(/\?vault=[\s\S]+?&file=([\s\S]+)/);

            filePath = decodeURIComponent(filePath);
            let file = app.vault.getAbstractFileByPath(filePath);
            if (!file || !(file instanceof TFile)) throw new Error();

            let buffer = await app.vault.readBinary(file);
            blob = new Blob([new Uint8Array(buffer)]);
        } else {
            //file exists on disk
            let file = app.metadataCache.getFirstLinkpathDest(
                url.replace(/(\[|\])/g, ""),
                ""
            );
            if (!file || !(file instanceof TFile)) throw new Error();

            mimeType =
                lookupMimeType(file.extension) || "application/octet-stream";
            let buffer = await app.vault.readBinary(file);
            blob = new Blob([new Uint8Array(buffer)]);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    let base64 =
                        "data:" +
                        mimeType +
                        reader.result.slice(reader.result.indexOf(";base64,"));
                    resolve(base64);
                } else {
                    new Notice("There was an error reading the image file.");
                    reject();
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error(e);
        new Notice(`There was an error reading the image file: ${url}`);
    }
}

export { compare as compareVersions } from "compare-versions";
