import { fas } from "@fortawesome/free-solid-svg-icons";

import {
    findIconDefinition,
    icon,
    library,
    IconParams,
    Layer
} from "@fortawesome/fontawesome-svg-core";
import type {
    IconDefinition,
    IconName
} from "@fortawesome/fontawesome-svg-core";
import { Icon } from "src/@types";

library.add(fas);

export const DESCRIPTION_ICON = "obsidian-leaflet-plugin-icon-description";
export const DESCRIPTION_ICON_SVG = icon(getIcon("info-circle")).html[0];
export const BULLSEYE = "obsidian-leaflet-plugin-icon-bullseye";
export const BULLSEYE_ICON_SVG = icon(getIcon("bullseye")).html[0];
export const VIEW_ICON = "obsidian-leaflet-plugin-icon-map";
export const VIEW_ICON_SVG = icon(getIcon("map-marked-alt")).html[0];

export const iconNames = Object.values(fas).map((i) => i.iconName);

export function getIcon(iconName: string): IconDefinition {
    if (!iconName) return null;
    return findIconDefinition({
        iconName: iconName as IconName,
        prefix: "fas"
    });
}

import {
    faEyeSlash,
    faHeart,
    faMagic,
    faDeaf,
    faSpider,
    faHandsHelping,
    faGhost,
    faSlash,
    faWalking,
    faMountain,
    faSkullCrossbones,
    faBed,
    faBolt,
    faLink,
    faDizzy,
    faSkull
} from "@fortawesome/free-solid-svg-icons";

import { layer } from "@fortawesome/fontawesome-svg-core";
const paralyzed = layer((push) => {
    push(icon(faWalking));
    push(icon(faSlash));
}).node[0];
export const StatusMap: Map<string, Element> = new Map([
    [
        "Blinded",
        icon(faEyeSlash, { attributes: { stroke: "coral", "stroke-width": 1 } })
            .node[0]
    ],
    [
        "Charmed",
        icon(faHeart, { attributes: { stroke: "coral", "stroke-width": 1 } })
            .node[0]
    ],
    ["Concentrating", icon(faMagic).node[0]],
    ["Deafened", icon(faDeaf).node[0]],
    ["Frightened", icon(faSpider).node[0]],
    ["Grappled", icon(faHandsHelping).node[0]],
    ["Incapacitated", icon(faSkull).node[0]],
    ["Invisible", icon(faGhost).node[0]],
    ["Paralyzed", paralyzed],
    ["Petrified", icon(faMountain).node[0]],
    ["Poisoned", icon(faSkullCrossbones).node[0]],
    ["Prone", icon(faBed).node[0]],
    ["Reacted", icon(faBolt).node[0]],
    ["Restrained", icon(faLink).node[0]],
    ["Stunned", icon(faDizzy).node[0]],
    ["Unconscious", icon(faSkull).node[0]]
]);

interface InternalMarkerIcon {
    html: string;
    node: Element;
}

export function getMarkerIcon(
    marker: Icon,
    params?: IconParams
): InternalMarkerIcon {
    if (!marker) return null;

    if (marker.isImage) {
        let element = new Image();
        element.src = marker.imageUrl;

        const ret = {
            html: element.outerHTML,
            node: element
        };

        return ret;
    }

    const i = icon(getIcon(marker.iconName), params);
    return {
        html: i.html[0],
        node: i.node[0]
    };
}

export { fas, icon, findIconDefinition, IconDefinition, IconName };
