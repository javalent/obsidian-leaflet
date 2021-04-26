import { MarkerData } from "src/@types";

export function parseMarker(data: string[]): MarkerData {
    let [type, lat, long, link, layer] = data;
    let loc: [number, number] = [undefined, undefined];

    if (!type || !type.length || type === "undefined") {
        type = "default";
    }
    if (!lat || !lat.length || isNaN(Number(lat))) {
        lat = undefined;
    } else {
        loc[0] = Number(lat);
    }
    if (!long || !long.length || isNaN(Number(long))) {
        long = undefined;
    } else {
        loc[1] = Number(long);
    }

    if (!link || !link.length || link === "undefined") {
        link = undefined;
    } else if (/\[\[[\s\S]+\]\]/.test(link)) {
        //obsidian wiki-link
        [, link] = link.match(/\[\[([\s\S]+)\]\]/);
    }

    if (!layer || !layer.length || layer === "undefined") {
        layer = undefined;
    }

    return {
        type: type,
        loc: loc,
        link: link,
        layer: layer,
        id: undefined
    };
}
