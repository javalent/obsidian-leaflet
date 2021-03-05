import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
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
