import { TextComponent, App, FuzzyMatch } from "obsidian";
import { findIconDefinition, icon, IconName } from "src/utils";
import { SuggestionModal } from "./suggester";

export class IconSuggestionModal extends SuggestionModal<IconName> {
    icons: IconName[];
    icon: IconName;
    text: TextComponent;
    constructor(app: App, input: TextComponent, items: IconName[]) {
        super(app, input.inputEl, items);
        this.icons = [...items];
        this.text = input;
        //this.getItem();

        this.createPrompts();

        this.inputEl.addEventListener("input", this.getItem.bind(this));
    }
    createPrompts() {}
    getItem() {
        const v = this.inputEl.value,
            icon = this.icons.find((iconName) => iconName === v.trim());
        if (icon == this.icon) return;
        this.icon = icon;
        if (this.icons) this.onInputChanged();
    }
    getItemText(item: IconName) {
        return item;
    }
    onChooseItem(item: IconName) {
        this.text.setValue(item);
        this.icon = item;
    }
    selectSuggestion({ item }: FuzzyMatch<IconName>) {
        this.text.setValue(item);
        this.onClose();

        this.close();
    }
    renderSuggestion(result: FuzzyMatch<IconName>, el: HTMLElement) {
        let { item, match: matches } = result || {};
        let content = el.createDiv({
            cls: "suggestion-content icon"
        });
        if (!item) {
            content.setText(this.emptyStateText);
            content.parentElement.addClass("is-selected");
            return;
        }

        const matchElements = matches.matches.map((m) => {
            return createSpan("suggestion-highlight");
        });
        for (let i = 0; i < item.length; i++) {
            let match = matches.matches.find((m) => m[0] === i);
            if (match) {
                let element = matchElements[matches.matches.indexOf(match)];
                content.appendChild(element);
                element.appendText(item.substring(match[0], match[1]));

                i += match[1] - match[0] - 1;
                continue;
            }

            content.appendText(item[i]);
        }

        const iconDiv = createDiv({
            cls: "suggestion-flair"
        });
        iconDiv.appendChild(
            icon(
                findIconDefinition({
                    iconName: item,
                    prefix: "fas"
                })
            ).node[0]
        );

        content.prepend(iconDiv);
    }
    getItems() {
        return this.icons;
    }
}
