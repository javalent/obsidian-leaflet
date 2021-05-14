import {
    Modal,
    App,
    TextComponent,
    Setting,
    ButtonComponent,
    FuzzySuggestModal,
    FuzzyMatch,
    Scope,
    SuggestModal,
    TFile,
    BlockCache,
    HeadingCache,
    CachedMetadata,
    Command
} from "obsidian";
import { createPopper, Instance as PopperInstance } from "@popperjs/core";

import {
    findIconDefinition,
    IconName,
    icon,
    toHtml,
    AbstractElement,
    getIcon,
    iconNames
} from "./icons";

import ObsidianLeaflet from "../main";

import { IMarker } from "../@types/";
import LeafletMap from "src/leaflet";
import { Marker } from "./map";

class Suggester<T> {
    owner: SuggestModal<T>;
    items: T[];
    suggestions: HTMLDivElement[];
    selectedItem: number;
    containerEl: HTMLElement;
    constructor(
        owner: SuggestModal<T>,
        containerEl: HTMLElement,
        scope: Scope
    ) {
        this.containerEl = containerEl;
        this.owner = owner;
        containerEl.on(
            "click",
            ".suggestion-item",
            this.onSuggestionClick.bind(this)
        );
        containerEl.on(
            "mousemove",
            ".suggestion-item",
            this.onSuggestionMouseover.bind(this)
        );

        scope.register([], "ArrowUp", () => {
            this.setSelectedItem(this.selectedItem - 1, true);
            return false;
        });

        scope.register([], "ArrowDown", () => {
            this.setSelectedItem(this.selectedItem + 1, true);
            return false;
        });

        scope.register([], "Enter", (evt) => {
            this.useSelectedItem(evt);
            return false;
        });

        scope.register([], "Tab", (evt) => {
            this.chooseSuggestion(evt);
            return false;
        });
    }
    chooseSuggestion(evt: KeyboardEvent) {
        if (!this.items || !this.items.length) return;
        const currentValue = this.items[this.selectedItem];
        if (currentValue) {
            this.owner.onChooseSuggestion(currentValue, evt);
        }
    }
    onSuggestionClick(event: MouseEvent, el: HTMLDivElement): void {
        event.preventDefault();
        if (!this.suggestions || !this.suggestions.length) return;

        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
        this.useSelectedItem(event);
    }

    onSuggestionMouseover(event: MouseEvent, el: HTMLDivElement): void {
        if (!this.suggestions || !this.suggestions.length) return;
        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
    }
    empty() {
        this.containerEl.empty();
    }
    setSuggestions(items: T[]) {
        this.containerEl.empty();
        const els: HTMLDivElement[] = [];

        items.forEach((item) => {
            const suggestionEl = this.containerEl.createDiv("suggestion-item");
            this.owner.renderSuggestion(item, suggestionEl);
            els.push(suggestionEl);
        });
        this.items = items;
        this.suggestions = els;
        this.setSelectedItem(0, false);
    }
    useSelectedItem(event: MouseEvent | KeyboardEvent) {
        if (!this.items || !this.items.length) return;
        const currentValue = this.items[this.selectedItem];
        if (currentValue) {
            this.owner.selectSuggestion(currentValue, event);
        }
    }
    wrap(value: number, size: number): number {
        return ((value % size) + size) % size;
    }
    setSelectedItem(index: number, scroll: boolean) {
        const nIndex = this.wrap(index, this.suggestions.length);
        const prev = this.suggestions[this.selectedItem];
        const next = this.suggestions[nIndex];

        if (prev) prev.removeClass("is-selected");
        if (next) next.addClass("is-selected");

        this.selectedItem = nIndex;

        if (scroll) {
            next.scrollIntoView(false);
        }
    }
}

export abstract class SuggestionModal<T> extends FuzzySuggestModal<T> {
    items: T[] = [];
    suggestions: HTMLDivElement[];
    popper: PopperInstance;
    scope: Scope = new Scope();
    suggester: Suggester<FuzzyMatch<T>>;
    suggestEl: HTMLDivElement;
    promptEl: HTMLDivElement;
    emptyStateText: string = "No match found";
    limit: number = 100;
    constructor(app: App, inputEl: HTMLInputElement, items: T[]) {
        super(app);
        this.inputEl = inputEl;
        this.items = items;

        this.suggestEl = createDiv("suggestion-container");

        this.contentEl = this.suggestEl.createDiv("suggestion");

        this.suggester = new Suggester(this, this.contentEl, this.scope);

        this.scope.register([], "Escape", this.close.bind(this));

        this.inputEl.addEventListener("input", this.onInputChanged.bind(this));
        this.inputEl.addEventListener("focus", this.onInputChanged.bind(this));
        this.inputEl.addEventListener("blur", this.close.bind(this));
        this.suggestEl.on(
            "mousedown",
            ".suggestion-container",
            (event: MouseEvent) => {
                event.preventDefault();
            }
        );
    }
    empty() {
        this.suggester.empty();
    }
    onInputChanged(): void {
        const inputStr = this.modifyInput(this.inputEl.value);
        const suggestions = this.getSuggestions(inputStr);
        if (suggestions.length > 0) {
            this.suggester.setSuggestions(suggestions.slice(0, this.limit));
        } else {
            this.onNoSuggestion();
        }
        this.open();
    }

    modifyInput(input: string): string {
        return input;
    }
    onNoSuggestion() {
        this.empty();
        this.renderSuggestion(
            null,
            this.contentEl.createDiv("suggestion-item")
        );
    }
    open(): void {
        // TODO: Figure out a better way to do this. Idea from Periodic Notes plugin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any>this.app).keymap.pushScope(this.scope);

        document.body.appendChild(this.suggestEl);
        this.popper = createPopper(this.inputEl, this.suggestEl, {
            placement: "bottom-start",
            modifiers: [
                {
                    name: "offset",
                    options: {
                        offset: [0, 10]
                    }
                },
                {
                    name: "flip",
                    options: {
                        fallbackPlacements: ["top"]
                    }
                }
            ]
        });
    }

    close(): void {
        // TODO: Figure out a better way to do this. Idea from Periodic Notes plugin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any>this.app).keymap.popScope(this.scope);

        this.suggester.setSuggestions([]);
        if (this.popper) {
            this.popper.destroy();
        }

        this.suggestEl.detach();
    }
    createPrompt(prompts: HTMLSpanElement[]) {
        if (!this.promptEl)
            this.promptEl = this.suggestEl.createDiv("prompt-instructions");
        let prompt = this.promptEl.createDiv("prompt-instruction");
        for (let p of prompts) {
            prompt.appendChild(p);
        }
    }
    abstract onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void;
    abstract getItemText(arg: T): string;
    abstract getItems(): T[];
}

export class PathSuggestionModal extends SuggestionModal<
    TFile | BlockCache | HeadingCache
> {
    file: TFile;
    files: TFile[];
    text: TextComponent;
    cache: CachedMetadata;
    constructor(app: App, input: TextComponent, items: TFile[]) {
        super(app, input.inputEl, items);
        this.files = [...items];
        this.text = input;
        //this.getFile();

        this.createPrompts();

        this.inputEl.addEventListener("input", this.getFile.bind(this));
    }
    createPrompts() {
        this.createPrompt([
            createSpan({
                cls: "prompt-instruction-command",
                text: "Type #"
            }),
            createSpan({ text: "to link heading" })
        ]);
        this.createPrompt([
            createSpan({
                cls: "prompt-instruction-command",
                text: "Type ^"
            }),
            createSpan({ text: "to link blocks" })
        ]);
        this.createPrompt([
            createSpan({
                cls: "prompt-instruction-command",
                text: "Note: "
            }),
            createSpan({
                text: "Blocks must have been created already"
            })
        ]);
    }
    getFile() {
        const v = this.inputEl.value,
            file = this.app.metadataCache.getFirstLinkpathDest(
                v.split(/[\^#]/).shift() || "",
                ""
            );
        if (file == this.file) return;
        this.file = file;
        if (this.file)
            this.cache = this.app.metadataCache.getFileCache(this.file);
        this.onInputChanged();
    }
    getItemText(item: TFile | HeadingCache | BlockCache) {
        if (item instanceof TFile) return item.path;
        if (Object.prototype.hasOwnProperty.call(item, "heading")) {
            return (<HeadingCache>item).heading;
        }
        if (Object.prototype.hasOwnProperty.call(item, "id")) {
            return (<BlockCache>item).id;
        }
    }
    onChooseItem(item: TFile | HeadingCache | BlockCache) {
        if (item instanceof TFile) {
            this.text.setValue(item.basename);
            this.file = item;
            this.cache = this.app.metadataCache.getFileCache(this.file);
        } else if (Object.prototype.hasOwnProperty.call(item, "heading")) {
            this.text.setValue(
                this.file.basename + "#" + (<HeadingCache>item).heading
            );
        } else if (Object.prototype.hasOwnProperty.call(item, "id")) {
            this.text.setValue(
                this.file.basename + "^" + (<BlockCache>item).id
            );
        }
    }
    selectSuggestion({ item }: FuzzyMatch<TFile | BlockCache | HeadingCache>) {
        let link: string;
        if (item instanceof TFile) {
            link = item.basename;
        } else if (Object.prototype.hasOwnProperty.call(item, "heading")) {
            link = this.file.basename + "#" + (<HeadingCache>item).heading;
        } else if (Object.prototype.hasOwnProperty.call(item, "id")) {
            link = this.file.basename + "^" + (<BlockCache>item).id;
        }

        this.text.setValue(link);
        this.onClose();

        this.close();
    }
    renderSuggestion(
        result: FuzzyMatch<TFile | BlockCache | HeadingCache>,
        el: HTMLElement
    ) {
        let { item, match: matches } = result || {};
        let content = el.createDiv({
            cls: "suggestion-content"
        });
        if (!item) {
            content.setText(this.emptyStateText);
            content.parentElement.addClass("is-selected");
            return;
        }

        if (item instanceof TFile) {
            let pathLength = item.path.length - item.name.length;
            const matchElements = matches.matches.map((m) => {
                return createSpan("suggestion-highlight");
            });
            for (
                let i = pathLength;
                i < item.path.length - item.extension.length - 1;
                i++
            ) {
                let match = matches.matches.find((m) => m[0] === i);
                if (match) {
                    let element = matchElements[matches.matches.indexOf(match)];
                    content.appendChild(element);
                    element.appendText(item.path.substring(match[0], match[1]));

                    i += match[1] - match[0] - 1;
                    continue;
                }

                content.appendText(item.path[i]);
            }
            el.createDiv({
                cls: "suggestion-note",
                text: item.path
            });
        } else if (Object.prototype.hasOwnProperty.call(item, "heading")) {
            content.setText((<HeadingCache>item).heading);
            content.prepend(
                createSpan({
                    cls: "suggestion-flair",
                    text: `H${(<HeadingCache>item).level}`
                })
            );
        } else if (Object.prototype.hasOwnProperty.call(item, "id")) {
            content.setText((<BlockCache>item).id);
        }
    }
    get headings() {
        if (!this.file) return [];
        if (!this.cache) {
            this.cache = this.app.metadataCache.getFileCache(this.file);
        }
        return this.cache.headings || [];
    }
    get blocks() {
        if (!this.file) return [];
        if (!this.cache) {
            this.cache = this.app.metadataCache.getFileCache(this.file);
        }
        return Object.values(this.cache.blocks || {}) || [];
    }
    getItems() {
        const v = this.inputEl.value;
        if (/#/.test(v)) {
            this.modifyInput = (i) => i.split(/#/).pop();
            return this.headings;
        } else if (/\^/.test(v)) {
            this.modifyInput = (i) => i.split(/\^/).pop();
            return this.blocks;
        }
        return this.files;
    }
}

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
            command = this.commands.find((c) => c.name === v.trim());
        if (command == this.command) return;
        this.command = command;
        if (this.command)
            /* this.cache = this.app.metadataCache.getFileCache(this.command); */
            this.onInputChanged();
    }
    getItemText(item: Command) {
        return item.name;
    }
    onChooseItem(item: Command) {
        this.text.setValue(item.name);
        this.command = item;
    }
    selectSuggestion({ item }: FuzzyMatch<Command>) {
        let link = item.name;

        this.text.setValue(link);
        this.onClose();

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
    }
    getItems() {
        return this.commands;
    }
}

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

export class MarkerContextModal extends Modal {
    plugin: ObsidianLeaflet;
    marker: Marker;
    map: LeafletMap;
    deleted: boolean = false;
    tempMarker: Marker;
    modal: CommandSuggestionModal | PathSuggestionModal;
    limit: number = 100;
    constructor(
        app: App,
        plugin: ObsidianLeaflet,
        marker: Marker,
        map: LeafletMap
    ) {
        super(app);
        this.marker = marker;
        this.plugin = plugin;
        this.map = map;

        this.tempMarker = Object.assign(
            Object.create(Object.getPrototypeOf(this.marker)),
            this.marker
        );
        if (this.modal) this.modal.close();
    }
    async display() {
        this.contentEl.empty();
        new Setting(this.contentEl)
            .setName("Execute Command")
            .setDesc("The marker will execute an Obsidian command on click")
            .addToggle((t) => {
                t.setValue(this.tempMarker.command || false).onChange((v) => {
                    this.tempMarker.command = v;
                    this.tempMarker.link = "";
                    this.display();
                });
            });

        if (this.tempMarker.command) {
            new Setting(this.contentEl)
                .setName("Command to Execute")
                .setDesc("Name of Obsidian Command to execute")
                .addText((text) => {
                    //@ts-expect-error
                    let { commands } = this.app.commands;

                    text.setPlaceholder("Command").setValue(this.marker.link);
                    this.modal = new CommandSuggestionModal(this.app, text, [
                        ...(Object.values(commands) as Command[])
                    ]);

                    this.modal.onClose = async () => {
                        this.tempMarker.link = text.inputEl.value;
                    };

                    text.inputEl.onblur = async () => {
                        this.tempMarker.link = text.inputEl.value;
                    };
                });
        } else {
            new Setting(this.contentEl)
                .setName("Note to Open")
                .setDesc("Path of note to open")
                .addText((text) => {
                    let files = this.app.vault.getFiles();

                    text.setPlaceholder("Path").setValue(this.marker.link);
                    this.modal = new PathSuggestionModal(this.app, text, [
                        ...files
                    ]);

                    this.modal.onClose = async () => {
                        this.tempMarker.link = text.inputEl.value;
                    };

                    text.inputEl.onblur = async () => {
                        this.tempMarker.link = text.inputEl.value;
                    };
                });
        }
        new Setting(this.contentEl)
            .setName("Marker Type")
            .addDropdown((drop) => {
                drop.addOption("default", "Default");
                this.plugin.AppData.markerIcons.forEach((marker) => {
                    drop.addOption(
                        marker.type,
                        marker.type[0].toUpperCase() +
                            marker.type.slice(1).toLowerCase()
                    );
                });
                drop.setValue(this.marker.type).onChange(async (value) => {
                    let newMarker =
                        value == "default"
                            ? this.plugin.AppData.defaultMarker
                            : this.plugin.AppData.markerIcons.find(
                                  (m) => m.type == value
                              );
                    this.tempMarker.type = newMarker.type;
                });
            });

        new Setting(this.contentEl).addButton((b) => {
            b.setIcon("trash")
                .setWarning()
                .setTooltip("Delete Marker")
                .onClick(async () => {
                    this.deleted = true;

                    this.close();
                    await this.plugin.saveSettings();
                });
            return b;
        });
    }
    onOpen() {
        this.display();
    }
}
export class CreateMarkerModal extends Modal {
    marker: IMarker;
    tempMarker: IMarker;
    plugin: ObsidianLeaflet;
    constructor(app: App, plugin: ObsidianLeaflet, marker: IMarker) {
        super(app);
        this.marker = marker;
        this.plugin = plugin;

        this.tempMarker = { ...this.marker };
    }
    get data() {
        return this.plugin.AppData;
    }

    async display(focusEl?: string): Promise<void> {
        let containerEl = this.contentEl;
        containerEl.empty();

        let createNewMarker = containerEl.createDiv();
        createNewMarker.addClass("additional-markers-container");
        //new Setting(createNewMarker).setHeading().setName("Create New Marker");

        let iconDisplayAndSettings = createNewMarker.createDiv();
        iconDisplayAndSettings.addClass("marker-creation-modal");
        let iconSettings = iconDisplayAndSettings.createDiv();
        let iconDisplay = iconDisplayAndSettings.createDiv();

        let typeTextInput: TextComponent;
        let markerName = new Setting(iconSettings)
            .setName("Marker Name")
            .addText((text) => {
                typeTextInput = text
                    .setPlaceholder("Marker Name")
                    .setValue(this.tempMarker.type);
                typeTextInput.onChange((new_value) => {
                    if (
                        this.data.markerIcons.find(
                            (marker) => marker.type == new_value
                        ) &&
                        this.tempMarker.type != this.marker.type
                    ) {
                        setValidationError(
                            typeTextInput,
                            "Marker name already exists."
                        );
                        return;
                    }

                    if (new_value.length == 0) {
                        setValidationError(
                            typeTextInput,
                            "Marker name cannot be empty."
                        );
                        return;
                    }

                    removeValidationError(typeTextInput);

                    this.tempMarker.type = new_value;
                });
            });

        let iconTextInput: TextComponent;
        let iconName = new Setting(iconSettings)
            .setName("Marker Icon")
            .setDesc("Font Awesome icon name (e.g. map-marker).")
            .addText((text) => {
                text.setPlaceholder("Icon Name").setValue(
                    this.tempMarker.iconName ? this.tempMarker.iconName : ""
                );

                const validate = async () => {
                    const new_value = text.inputEl.value;

                    if (!new_value.length) {
                        setValidationError(
                            text,
                            "A default marker must be defined."
                        );
                        return;
                    }
                    if (
                        !findIconDefinition({
                            iconName: new_value as IconName,
                            prefix: "fas"
                        })
                    ) {
                        setValidationError(
                            text,
                            "The selected icon does not exist in Font Awesome Free."
                        );
                        return;
                    }

                    removeValidationError(text);
                    this.tempMarker.iconName = new_value;

                    await this.plugin.saveSettings();

                    this.display();
                };

                const modal = new IconSuggestionModal(
                    this.app,
                    text,
                    iconNames
                );

                modal.onClose = validate;

                text.inputEl.onblur = validate;

                return iconTextInput;
            });

        if (this.tempMarker.iconName) {
            let iconNode: AbstractElement = icon(
                getIcon(
                    this.tempMarker.layer
                        ? this.data.defaultMarker.iconName
                        : this.tempMarker.iconName
                ),
                {
                    classes: ["full-width-height"]
                }
            ).abstract[0];

            iconNode.attributes = {
                ...iconNode.attributes,
                style: `color: ${this.tempMarker.color}`
            };
            //let marker = iconDisplay;
            let iconDisplayHeight =
                markerName.settingEl.getBoundingClientRect().height +
                iconName.settingEl.getBoundingClientRect().height;
            iconDisplay.setAttribute(
                "style",
                `height: ${iconDisplayHeight}px; padding: 1rem; position: relative;`
            );
            iconDisplay.innerHTML = toHtml(iconNode);

            if (this.tempMarker.layer) {
                let iconOverlay = icon(getIcon(this.tempMarker.iconName), {
                    transform: this.tempMarker.transform
                }).node[0].children[0] as SVGGraphicsElement;
                let iconPath = iconOverlay.getElementsByTagName("path")[0];

                let fill = this.getFillColor(this.modalEl);

                iconPath.setAttribute("fill", fill[0]);
                iconPath.setAttribute("fill-opacity", `1`);
                iconPath.setAttribute("stroke-width", "1px");
                iconPath.setAttribute("stroke", "black");
                iconPath.setAttribute("stroke-dasharray", "50,50");

                let transformSource = iconOverlay
                    .children[0] as SVGGraphicsElement;
                let svgElement = iconDisplay.getElementsByTagName("svg")[0],
                    xPath = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "path"
                    ),
                    yPath = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "path"
                    );

                xPath.setAttribute("stroke", "red");
                xPath.setAttribute("stroke-width", "0");
                xPath.setAttribute("d", "M192,0 L192,512");

                yPath.setAttribute("stroke", "red");
                yPath.setAttribute("stroke-width", "0");
                yPath.setAttribute("d", "M0,256 L384,256");

                svgElement.appendChild(xPath);
                svgElement.appendChild(yPath);
                let units = {
                    width: 512 / 16,
                    height: 512 / 16
                };

                svgElement.appendChild(iconOverlay);

                /** Fix x/y positioning due to different icon sizes */
                iconOverlay.transform.baseVal.getItem(0).setTranslate(192, 256);

                let clickedOn: boolean = false,
                    offset: { x: number; y: number } = { x: 0, y: 0 },
                    transform: SVGTransform;

                this.plugin.registerDomEvent(
                    (iconOverlay as unknown) as HTMLElement,
                    "mousedown",
                    (evt) => {
                        let CTM = svgElement.getScreenCTM();
                        offset = {
                            x: (evt.clientX - CTM.e) / CTM.a,
                            y: (evt.clientY - CTM.f) / CTM.d
                        };

                        let transforms = transformSource.transform.baseVal;
                        if (
                            transforms.numberOfItems === 0 ||
                            transforms.getItem(0).type !=
                                SVGTransform.SVG_TRANSFORM_TRANSLATE
                        ) {
                            let translate = svgElement.createSVGTransform();
                            translate.setTranslate(0, 0);
                            // Add the translation to the front of the transforms list
                            transformSource.transform.baseVal.insertItemBefore(
                                translate,
                                0
                            );
                        }

                        transform = transforms.getItem(0);
                        offset.x -= transform.matrix.e;
                        offset.y -= transform.matrix.f;

                        clickedOn = true;
                    }
                );
                this.plugin.registerDomEvent(
                    this.containerEl,
                    "mouseup",
                    (evt) => {
                        offset = { x: 0, y: 0 };
                        xPath.setAttribute("stroke-width", "0");
                        yPath.setAttribute("stroke-width", "0");
                        clickedOn = false;
                    }
                );
                this.plugin.registerDomEvent(
                    (iconOverlay as unknown) as HTMLElement,
                    "mousemove",
                    (evt) => {
                        if (clickedOn) {
                            evt.preventDefault();
                            let CTM = svgElement.getScreenCTM();
                            let coords = {
                                x: (evt.clientX - CTM.e) / CTM.a,
                                y: (evt.clientY - CTM.f) / CTM.d
                            };

                            //snap to x/y
                            let x = coords.x - offset.x,
                                y = coords.y - offset.y;
                            if (Math.abs(x) <= 32 && evt.shiftKey) {
                                xPath.setAttribute("stroke-width", "8");
                                x = 0;
                            } else {
                                xPath.setAttribute("stroke-width", "0");
                            }
                            if (Math.abs(y) <= 32 && evt.shiftKey) {
                                yPath.setAttribute("stroke-width", "8");
                                y = 0;
                            } else {
                                yPath.setAttribute("stroke-width", "0");
                            }

                            transform.setTranslate(x, y);

                            this.tempMarker.transform.x =
                                transform.matrix.e / units.width;
                            this.tempMarker.transform.y =
                                transform.matrix.f / units.height;
                        }
                    }
                );
            }
        }

        new Setting(createNewMarker)
            .setName("Layer Icon")
            .setDesc("The icon will be layered on the base icon, if any.")
            .addToggle((toggle) => {
                toggle.setValue(this.tempMarker.layer).onChange((v) => {
                    this.tempMarker.layer = v;
                    this.display();
                });
                if (this.data.defaultMarker.iconName == null) {
                    toggle
                        .setDisabled(true)
                        .setTooltip("Add a base marker to layer this icon.");
                }
            });
        let colorInput = new Setting(createNewMarker)
            .setName("Icon Color")
            .setDesc("Override default icon color.");
        let colorInputNode = colorInput.controlEl.createEl("input", {
            attr: {
                type: "color",
                value: this.tempMarker.color
            }
        });
        colorInputNode.oninput = (evt) => {
            this.tempMarker.color = (evt.target as HTMLInputElement).value;

            iconDisplay.children[0].setAttribute(
                "style",
                `color: ${this.tempMarker.color}`
            );
        };
        colorInputNode.onchange = async (evt) => {
            this.tempMarker.color = (evt.target as HTMLInputElement).value;

            this.display();
        };

        let add = new Setting(createNewMarker);

        add.addButton(
            (button: ButtonComponent): ButtonComponent => {
                let b = button.setTooltip("Save").onClick(async () => {
                    // Force refresh
                    let error = false;
                    if (
                        this.data.markerIcons.find(
                            (marker) => marker.type == this.tempMarker.type
                        ) &&
                        this.tempMarker.type != this.marker.type
                    ) {
                        setValidationError(
                            typeTextInput,
                            "Marker type already exists."
                        );
                        error = true;
                    }

                    if (this.tempMarker.type.length == 0) {
                        setValidationError(
                            typeTextInput,
                            "Marker name cannot be empty."
                        );
                        error = true;
                    }
                    if (
                        !findIconDefinition({
                            iconName: iconTextInput.inputEl.value as IconName,
                            prefix: "fas"
                        })
                    ) {
                        setValidationError(iconTextInput, "Invalid icon name.");
                        error = true;
                    }

                    if (!this.tempMarker.iconName) {
                        setValidationError(
                            iconTextInput,
                            "Icon cannot be empty."
                        );
                        error = true;
                    }

                    if (error) {
                        return;
                    }

                    this.marker.type = this.tempMarker.type;
                    this.marker.iconName = this.tempMarker.iconName;
                    this.marker.color = this.tempMarker.color;
                    this.marker.layer = this.tempMarker.layer;
                    this.marker.transform = this.tempMarker.transform;

                    this.close();
                });
                b.buttonEl.appendChild(
                    icon(
                        findIconDefinition({
                            iconName: "save",
                            prefix: "fas"
                        })
                    ).node[0]
                );
                return b;
            }
        );
        add.addExtraButton((b) => {
            b.setIcon("cross")
                .setTooltip("Cancel")
                .onClick(() => {
                    this.close();
                });
        });

        if (focusEl) {
            (this.contentEl.querySelector(
                `#${focusEl}`
            ) as HTMLInputElement).focus();
        }
    }

    onOpen() {
        this.display();
    }

    getFillColor(el: HTMLElement): string[] {
        let fill = getComputedStyle(el).getPropertyValue("background-color");

        if (fill.includes("rgb")) {
            // Choose correct separator
            let sep = fill.indexOf(",") > -1 ? "," : " ";
            // Turn "rgb(r,g,b)" into [r,g,b]
            let rgbArr = fill.split("(")[1].split(")")[0].split(sep);
            let r = (+rgbArr[0]).toString(16),
                g = (+rgbArr[1]).toString(16),
                b = (+rgbArr[2]).toString(16);

            if (r.length == 1) r = "0" + r;
            if (g.length == 1) g = "0" + g;
            if (b.length == 1) b = "0" + b;

            return ["#" + r + g + b, rgbArr[3] ? `${+rgbArr[3]}` : "1"];
        }
        if (fill.includes("#")) {
            return [fill, "1"];
        }
    }
}

/* export class BulkEditMarkerModal extends Modal {
    constructor(app: App) {}
} */

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
