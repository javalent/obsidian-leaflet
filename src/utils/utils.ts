import { Notice } from "obsidian";
import { nanoid } from "nanoid";

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

export { compare as compareVersions } from "compare-versions";
