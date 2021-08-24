import { fas } from "@fortawesome/free-solid-svg-icons";
import {
    findIconDefinition,
    icon,
    library,
    IconParams
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

export const iconNames = Object.values(fas).map((i) => i.iconName);

export function getIcon(iconName: string): IconDefinition {
    if (!iconName) return null;
    return findIconDefinition({
        iconName: iconName as IconName,
        prefix: "fas"
    });
}

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
