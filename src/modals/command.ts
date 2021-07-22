import { App, Command, FuzzyMatch, TextComponent } from "obsidian";
import { SuggestionModal } from "./suggester";

export class CommandSuggestionModal extends SuggestionModal<Command> {
    commands: Command[];
    command: Command;
    text: TextComponent;
    constructor(app: App, input: TextComponent, items: Command[]) {
        super(app, input.inputEl, items);
        this.commands = [...items];
        this.text = input;
        //this.getItem();

        this.createPrompts();

        this.inputEl.addEventListener("input", this.getItem.bind(this));
    }
    createPrompts() {}
    getItem() {
        const v = this.inputEl.value,
            command = this.commands.find(
                (c) => c.name === v.trim() || c.id === v.trim()
            );
        if (command == this.command) return;
        this.command = command;
        if (this.command) this.onInputChanged();
    }
    getItemText(item: Command) {
        return item.name + item.id;
    }
    onChooseItem(item: Command) {
        this.text.setValue(item.name);
        this.command = item;
    }
    selectSuggestion({ item }: FuzzyMatch<Command>) {
        let link = item.id;

        this.text.setValue(item.name);
        this.onClose(item);

        this.close();
    }
    renderSuggestion(result: FuzzyMatch<Command>, el: HTMLElement) {
        let { item, match: matches } = result || {};

        let content = el.createDiv({
            cls: "suggestion-content"
        });
        if (!item) {
            content.setText(this.emptyStateText);
            content.parentElement.addClass("is-selected");
            return;
        }

        const matchElements = matches.matches.map((m) => {
            return createSpan("suggestion-highlight");
        });

        for (let i = 0; i < item.name.length; i++) {
            let match = matches.matches.find((m) => m[0] === i);
            if (match) {
                let element = matchElements[matches.matches.indexOf(match)];
                content.appendChild(element);
                element.appendText(item.name.substring(match[0], match[1]));

                i += match[1] - match[0] - 1;
                continue;
            }

            content.appendText(item.name[i]);
        }
        let note = el.createDiv({
            cls: "suggestion-note"
        });
        for (
            let i = item.name.length;
            i < item.name.length + item.id.length;
            i++
        ) {
            let match = matches.matches.find((m) => m[0] === i);
            if (match) {
                let element = matchElements[matches.matches.indexOf(match)];
                note.appendChild(element);
                element.appendText(
                    item.id.substring(
                        match[0] - item.name.length,
                        match[1] - item.name.length
                    )
                );

                i += match[1] - match[0] - 1;
                continue;
            }

            note.appendText(item.id[i - item.name.length]);
        }
    }
    getItems() {
        return this.commands;
    }
    onClose(item?: Command) {}
}
