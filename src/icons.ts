import { far } from "@fortawesome/free-regular-svg-icons";
import { fas, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import {
    IconDefinition,
	IconLookup,
	findIconDefinition,
	icon,
	library,
	AbstractElement,
	toHtml,
} from "@fortawesome/fontawesome-svg-core";

library.add(fas);

const iconNames = Object.values(fas)
	.map(i => i.iconName)
	.join("|");

export function getIcon(iconName: string): IconDefinition {
	if (!iconName) return null;
	return findIconDefinition({
		iconName: iconName,
	} as IconLookup)
}

export {
	far,
	fas,
	icon,
	findIconDefinition,
	IconDefinition,
	IconLookup,
	iconNames,
	AbstractElement,
	toHtml,
};
