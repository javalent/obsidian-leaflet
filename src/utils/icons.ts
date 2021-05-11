import { fas } from "@fortawesome/free-solid-svg-icons";
import {
    IconDefinition,
    IconName,
    findIconDefinition,
    icon,
    library,
    AbstractElement,
    toHtml
} from "@fortawesome/fontawesome-svg-core";

library.add(fas);

export const iconNames = Object.values(fas).map((i) => i.iconName);

export function getIcon(iconName: string): IconDefinition {
    if (!iconName) return null;
    return findIconDefinition({
        iconName: iconName as IconName,
        prefix: "fas"
    });
}

export {
    fas,
    icon,
    findIconDefinition,
    IconDefinition,
    IconName,
    AbstractElement,
    toHtml
};
