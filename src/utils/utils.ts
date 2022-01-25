import {
    App,
    Notice,
    parseYaml,
    setIcon,
    TextComponent,
    TFile
} from "obsidian";
import Color from "color";

import { BaseMapType, BlockParameters } from "src/@types";
import { LAT_LONG_DECIMALS } from "./constants";
import { DESCRIPTION_ICON } from ".";
import t from "src/l10n/locale";

const locale = window.moment.locale;

export function formatNumber(number: number, digits: number) {
    return new Intl.NumberFormat(locale(), {
        style: "decimal",
        maximumFractionDigits: digits
    }).format(number);
}

export function formatLatLng(latlng: L.LatLng) {
    return {
        lat: formatNumber(latlng.lat, LAT_LONG_DECIMALS),
        lng: formatNumber(latlng.lng, LAT_LONG_DECIMALS)
    };
}

export async function copyToClipboard(loc: L.LatLng): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        navigator.clipboard
            .writeText(
                `${formatNumber(loc.lat, LAT_LONG_DECIMALS)}, ${formatNumber(
                    loc.lng,
                    LAT_LONG_DECIMALS
                )}`
            )
            .then(() => {
                new Notice(t("Coordinates copied to clipboard."));
                resolve();
            })
            .catch(() => {
                new Notice(
                    t(
                        "There was an error trying to copy coordinates to clipboard."
                    )
                );
                reject();
            });
    });
}

export function renderError(el: HTMLElement, error: string): void {
    let pre = createEl("pre", { attr: { id: "leaflet-error" } });
    pre.setText(`\`\`\`leaflet
${t("There was an error rendering the map")}:

${error}
\`\`\``);
    el.replaceWith(pre);
}

export function log(verbose: boolean, id: string, message: string) {
    if (!verbose) return;
    console.log(`Obsidian Leaflet Map ${id}: ${message}`);
}

export function getHex(color: string): string {
    return Color(color).hex();
}

export function getImageDimensions(url: string): Promise<any> {
    return new Promise(function (resolved, reject) {
        var i = new Image();
        i.onload = function () {
            const { width, height } = i;
            i.detach();
            resolved({ w: width, h: height });
        };
        i.onerror = () => {
            new Notice(t("There was an issue getting the image dimensions."));
            reject();
        };

        i.src = url;
    });
}

export function getId() {
    return "ID_xyxyxyxyxyxy".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export { compare as compareVersions } from "compare-versions";

export const setValidationError = function (
    textInput: TextComponent,
    message?: string
) {
    textInput.inputEl.addClass("is-invalid");
    if (message) {
        textInput.inputEl.parentElement.addClasses([
            "has-invalid-message",
            "unset-align-items"
        ]);
        textInput.inputEl.parentElement.parentElement.addClass(
            ".unset-align-items"
        );
        let mDiv = textInput.inputEl.parentElement.querySelector(
            ".invalid-feedback"
        ) as HTMLDivElement;

        if (!mDiv) {
            mDiv = createDiv({ cls: "invalid-feedback" });
        }
        mDiv.innerText = message;
        mDiv.insertAfter(textInput.inputEl);
    }
};
export const removeValidationError = function (textInput: TextComponent) {
    textInput.inputEl.removeClass("is-invalid");
    textInput.inputEl.parentElement.removeClasses([
        "has-invalid-message",
        "unset-align-items"
    ]);
    textInput.inputEl.parentElement.parentElement.removeClass(
        ".unset-align-items"
    );

    if (textInput.inputEl.parentElement.children[1]) {
        textInput.inputEl.parentElement.removeChild(
            textInput.inputEl.parentElement.children[1]
        );
    }
};

export function getHeight(el: HTMLElement, height: string): string {
    try {
        if (!/\d+(px|%)/.test(height))
            throw new Error(t("Unparseable height provided."));
        if (/\d+%/.test(height)) {
            const element = el.closest(".markdown-preview-view");

            let [, perc] = height.match(/(\d+)%/);

            let computedStyle = getComputedStyle(element);

            let clHeight = element.clientHeight; // height with padding

            clHeight -=
                parseFloat(computedStyle.paddingTop) +
                parseFloat(computedStyle.paddingBottom);

            height = `${(clHeight * Number(perc)) / 100}px`;
        }
    } catch (e) {
        new Notice(
            t("There was a problem with the provided height. Using 500px.")
        );
        height = "500px";
    } finally {
        return height;
    }
}

export async function getBlob(url: string, app: App) {
    let response, blob: Blob, extension: string, alias: string;
    url = decodeURIComponent(url);
    try {
        if (/https?:/.test(url)) {
            //url
            response = await fetch(url);
            blob = await response.blob();
        } else if (/obsidian:\/\/open/.test(url)) {
            //obsidian link
            let [, filePath] = url.match(/\?vault=[\s\S]+?&file=([\s\S]+)/);

            filePath = decodeURIComponent(filePath);
            let file = app.vault.getAbstractFileByPath(filePath);
            if (!file) throw new Error();
            extension = (file as TFile).extension;
            let buffer = await app.vault.readBinary(file as TFile);
            blob = new Blob([new Uint8Array(buffer)]);
        } else {
            //file exists on disk;
            let file = app.metadataCache.getFirstLinkpathDest(
                parseLink(url).split("|").shift(),
                ""
            );
            if (!file) throw new Error();

            extension = file.extension;

            let buffer = await app.vault.readBinary(file);
            blob = new Blob([new Uint8Array(buffer)]);
            alias = (
                url.includes("|") ? url.split("|").pop() : file.basename
            ).replace(/(\[|\])/g, "");
        }
    } catch (e) {
        console.error(e);
    }
    return { blob, id: encodeURIComponent(url), alias, extension };
}

export function parseLink(link: string) {
    return link?.replace(/(\[|\])/g, "");
}

type MarkerType =
    | "marker"
    | "markerFile"
    | "markerFolder"
    | "markerTag"
    | "commandMarker"
    | "filterTag";

/** Parses source block and returns an object of block parameters
 * 1. First, it tries to parse the source as YAML. If the YAML parser fails, it tries to parse it manually.
 * 2. Next, it pulls out multiple images defined in the source. If there are multiple image tags, YAML will return only the last,
 * so it detects that to return them all correctly.
 * 3. Next, it pulls out markers defined in the source block. This is clunky to support previous version's syntax, but works.
 */
export function getParamsFromSource(source: string): BlockParameters {
    let params: BlockParameters = {};

    /** Pull out links */

    const links = source.match(/\[\[([^\[\]]*?)\]\]/g) ?? [];
    for (let link of links) {
        source = source.replace(
            link,
            `LEAFLET_INTERNAL_LINK_${links.indexOf(link)}`
        );
    }

    /** Pull out tags */

    try {
        params = parseYaml(source);
    } catch (e) {
        params = Object.fromEntries(
            source.split("\n").map((l) => l.split(/:\s?/))
        );
    } finally {
        if (!params) params = {};
        let image: string[], layers: string[];

        if (links.length) {
            let stringified = JSON.stringify(params);

            for (let link of links) {
                stringified = stringified.replace(
                    `LEAFLET_INTERNAL_LINK_${links.indexOf(link)}`,
                    link
                );
                source = source.replace(
                    `LEAFLET_INTERNAL_LINK_${links.indexOf(link)}`,
                    link
                );
            }
            params = JSON.parse(stringified);
        }

        /** Get Images from Parameters */
        if ((source.match(/^\bimage\b:[\s\S]*?$/gm) ?? []).length > 1) {
            layers = (source.match(/^\bimage\b:([\s\S]*?)$/gm) || []).map(
                (p) => p.split("image: ")[1]
            );
        }

        if (typeof params.image === "string") {
            image = [params.image];
        } else if (params.image instanceof Array) {
            image = [...params.image];
        } else {
            image = ["real"];
        }

        params.layers = layers ?? [...image];

        params.image = params.layers[0];

        let obj: {
            marker: string[];
            markerFile: string[];
            markerFolder: string[];
            markerTag: string[][];
            filterTag: string[][];
            commandMarker: string[];
            geojson: string[];
            linksTo: string[];
            linksFrom: string[];
            overlay: string[];
        } = {
            marker: [],
            markerFile: [],
            markerFolder: [],
            markerTag: [],
            filterTag: [],
            commandMarker: [],
            geojson: [],
            linksTo: [],
            linksFrom: [],
            overlay: []
        };

        if (
            /* /(command)?[mM]arker(File|Folder|Tag)?:/ */ new RegExp(
                `(${Object.keys(obj).join("|")})`
            ).test(source)
        ) {
            //markers defined in code block;

            //Pull Markers

            Object.keys(obj).forEach((type: MarkerType) => {
                let r = new RegExp(`^\\b${type}\\b:\\s?([\\s\\S]*?)$`, "gm");

                switch (type) {
                    case "filterTag":
                    case "markerTag": {
                        if ((source.match(r) || []).length > 1) {
                            //defined separately
                            obj[type] = (source.match(r) || []).map((p) =>
                                p
                                    .split(new RegExp(`(?:${type}):\\s?`))[1]
                                    ?.trim()
                                    .split(/,\s?/)
                            );
                        } else if (params[type] instanceof Array) {
                            obj[type] = params[type].map((param) => {
                                if (param instanceof Array) return param;
                                return [param];
                            });
                        } else if (params[type] !== undefined && params) {
                            obj[type] = [[params[type] as unknown as string]];
                        }
                        break;
                    }
                    case "markerFile": {
                        if ((source.match(r) || []).length > 1) {
                            //defined separately
                            obj[type] = (source.match(r) || []).map((p) =>
                                p
                                    .split(new RegExp(`(?:${type}):\\s?`))[1]
                                    ?.trim()
                            );
                        } else if (params[type] instanceof Array) {
                            obj[type] = params[type].flat(2) as string[];
                        } else if (params[type] !== undefined) {
                            obj[type] = [params[type] as unknown as string];
                        }
                        break;
                    }
                    default: {
                        if ((source.match(r) || []).length > 1) {
                            //defined separately
                            obj[type] = (source.match(r) || []).map((p) =>
                                parseYaml(
                                    p
                                        .split(
                                            new RegExp(`(?:${type}):\\s?`)
                                        )[1]
                                        ?.trim()
                                )
                            );
                        } else if (params[type] instanceof Array) {
                            obj[type] = params[type];
                        } else if (params[type] !== undefined) {
                            obj[type] = [params[type] as unknown as string];
                        }
                    }
                }
            });
        }
        Object.assign(params, obj);

        return params;
    }
}

export function getGroupSeparator(locale: string) {
    const numberWithDecimalSeparator = 1000.1;
    return Intl.NumberFormat(locale)
        .formatToParts(numberWithDecimalSeparator)
        .find((part) => part.type === "group").value;
}

export function catchError(
    target: BaseMapType,
    name: string,
    descriptor: PropertyDescriptor
) {
    const original = descriptor.value;
    if (typeof original === "function") {
        descriptor.value = function (...args: any[]) {
            try {
                return original.apply(this, args);
            } catch (e) {
                //throw error here
                console.error(target, name, e, original);
                renderError(
                    this.contentEl?.parentElement ?? this.contentEl,
                    e.message
                );
            }
        };
    }
}

export function catchErrorAsync(
    target: BaseMapType,
    name: string,
    descriptor: PropertyDescriptor
) {
    const original = descriptor.value;
    if (typeof original === "function") {
        descriptor.value = async function (...args: any[]) {
            try {
                return await original.apply(this, args);
            } catch (e) {
                //throw error here
                console.error(target, name, e, original);
                renderError(
                    this.contentEl?.parentElement ?? this.contentEl,
                    e.message
                );
            }
        };
    }
}


