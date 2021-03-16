import { parse } from "@fortawesome/fontawesome-svg-core";
import {
    PluginSettingTab,
    Setting,
    App,
    Notice,
    ButtonComponent,
    Modal,
    TextComponent,
} from "obsidian";

import {
    findIconDefinition,
    IconLookup,
    icon,
    toHtml,
    AbstractElement,
    getIcon,
} from "./icons";

export const DEFAULT_SETTINGS: ObsidianAppData = {
    mapMarkers: [],
    defaultMarker: {
        type: "default",
        iconName: "map-marker",
        color: "#dddddd",
        transform: { size: 6, x: 0, y: -2 },
    },
    markerIcons: [],
    color: "#dddddd",
    lat: 39.983334,
    long: -82.983330
};

import ObsidianLeaflet from "./main";

export class ObsidianLeafletSettingTab extends PluginSettingTab {
    plugin: ObsidianLeaflet;
    newMarker: Marker;
    constructor(app: App, plugin: ObsidianLeaflet) {
        super(app, plugin);
        this.plugin = plugin;
        this.newMarker = {
            type: "",
            iconName: null,
            color: this.plugin.AppData.defaultMarker.iconName
                ? this.plugin.AppData.defaultMarker.color
                : this.plugin.AppData.color,
            layer: false,
            transform: this.plugin.AppData.defaultMarker.transform,
        };
    }

    async display(): Promise<void> {
        let { containerEl } = this;

        containerEl.empty();

        containerEl.createEl("h2", { text: "Obsidian Leaflet Settings" });

        new Setting(containerEl)
            .setName('Default Latitude')
            .setDesc('Real-world maps will open to this latitude if not specified.')
            .addText(text => {
                text.setPlaceholder(`${this.plugin.AppData.lat}`);
                text.onChange(v => {
                    if (isNaN(Number(v))) {
                        ObsidianLeafletSettingTab.setValidationError(text, 'Latitude must be a number.');
                        return;
                    }
                    ObsidianLeafletSettingTab.removeValidationError(text);
                    this.plugin.AppData.lat = Number(v);
                    text.inputEl.addEventListener('blur', async () => {
                        this.display();
                    })
                })
            });
        new Setting(containerEl)
            .setName('Default Longitude')
            .setDesc('Real-world maps will open to this longitude if not specified.')
            .addText(text => {
                text.setPlaceholder(`${this.plugin.AppData.long}`);
                text.onChange(v => {
                    if (isNaN(Number(v))) {
                        ObsidianLeafletSettingTab.setValidationError(text, 'Longitude must be a number.');
                        return;
                    }
                    ObsidianLeafletSettingTab.removeValidationError(text);
                    this.plugin.AppData.long = Number(v);
                    console.log("🚀 ~ file: settings.ts ~ line 90 ~ ObsidianLeafletSettingTab ~ display ~ Number(v);", Number(v))
                });

                text.inputEl.addEventListener('blur', async () => {
                    this.display();
                })
            });

        let baseSetting = new Setting(containerEl)
            .setName("Base Map Marker")
            .setDesc("Leave blank to have full-sized marker symbols instead.")
            .addText(text => {
                text.setPlaceholder("Icon Name").setValue(
                    this.plugin.AppData.defaultMarker.iconName
                        ? this.plugin.AppData.defaultMarker.iconName
                        : ""
                );
                text.inputEl.addEventListener("blur", async evt => {
                    let target = evt.target as HTMLInputElement;
                    let new_value: string = target.value;

                    if (!new_value.length) {
                        if (this.plugin.AppData.markerIcons.length == 0) {
                            new Notice(
                                "Add additional markers to remove the default."
                            );
                            target.value = this.plugin.AppData.defaultMarker.iconName;
                            return;
                        }

                        this.plugin.AppData.defaultMarker.iconName = null;
                        this.plugin.AppData.markerIcons.forEach(
                            marker => (marker.layer = false)
                        );

                        await this.plugin.saveSettings();

                        this.display();
                        return;
                    }
                    if (
                        !findIconDefinition({
                            iconName: new_value,
                        } as IconLookup)
                    ) {
                        new Notice(
                            "The selected icon does not exist in Font Awesome Free."
                        );
                        return;
                    }

                    this.plugin.AppData.defaultMarker.iconName = new_value;

                    await this.plugin.saveSettings();

                    this.display();
                });
            });

        if (this.plugin.AppData.defaultMarker.iconName) {
            this.createColorPicker(
                baseSetting,
                this.plugin.AppData.defaultMarker
            );
        }
        let additionalMarkers = containerEl.createDiv();
        additionalMarkers.addClass("additional-markers-container");

        new Setting(additionalMarkers)
            .setHeading()
            .setName("Additional Map Markers")
            .setDesc(
                "These markers will be available in the right-click menu on the map."
            )
            .addButton(
                (button: ButtonComponent): ButtonComponent => {
                    let b = button
                        .setTooltip("Add Additional")
                        .onClick(async () => {
                            let newMarkerModal = new MarkerModal(
                                this.app,
                                this.plugin,
                                this.newMarker
                            );
                            newMarkerModal.open();
                            newMarkerModal.onClose = async () => {
                                if (
                                    !this.newMarker.type ||
                                    !this.newMarker.iconName
                                ) {
                                    return;
                                }
                                this.plugin.AppData.markerIcons.push(
                                    this.newMarker
                                );
                                this.newMarker = {
                                    type: "",
                                    iconName: null,
                                    color: this.plugin.AppData.defaultMarker
                                        .iconName
                                        ? this.plugin.AppData.defaultMarker
                                            .color
                                        : this.plugin.AppData.color,
                                    layer: true,
                                    transform: this.plugin.AppData.defaultMarker.transform,
                                };
                                await this.plugin.saveSettings();

                                this.display();
                            };
                        });
                    b.buttonEl.appendChild(
                        icon(
                            findIconDefinition({
                                iconName: "plus",
                            } as IconLookup)
                        ).node[0]
                    );
                    return b;
                }
            );
        this.plugin.AppData.markerIcons.forEach(marker => {
            let setting = new Setting(additionalMarkers)
                .setName(marker.type)
                .addExtraButton(b =>
                    b.onClick(() => {
                        let newMarkerModal = new MarkerModal(
                            this.app,
                            this.plugin,
                            marker
                        );
                        newMarkerModal.open();
                        newMarkerModal.onClose = async () => {
                            await this.plugin.saveSettings();
                            this.display();
                            if (
                                !this.newMarker.type ||
                                !this.newMarker.iconName
                            ) {
                                return;
                            }
                        };
                    })
                )
                .addExtraButton(b =>
                    b.setIcon("trash").onClick(() => {
                        this.plugin.AppData.markerIcons = this.plugin.AppData.markerIcons.filter(
                            m => m != marker
                        );
                        this.display();
                    })
                );
            let iconNode: AbstractElement = icon(getIcon(marker.iconName), {
                transform: marker.layer ? marker.transform : null,
                mask: marker.layer
                    ? getIcon(this.plugin.AppData.defaultMarker?.iconName)
                    : null,
                classes: ["full-width"],
            }).abstract[0];

            iconNode.attributes = {
                ...iconNode.attributes,
                style: `color: ${marker.color}`,
            };
            let markerIconDiv = createDiv();
            markerIconDiv.setAttribute("style", "width: 16px;");
            markerIconDiv.innerHTML = toHtml(iconNode);
            setting.controlEl.insertBefore(
                markerIconDiv,
                setting.controlEl.children[0]
            );
        });

        await this.plugin.saveSettings();
    }

    createColorPicker(
        setting: Setting,
        marker: Marker,
        insertAfter?: HTMLInputElement
    ) {
        if (setting.controlEl.querySelector(".color-picker")) {
            setting.controlEl.removeChild(
                setting.controlEl.querySelector(".color-picker")
            );
        }

        let colorContainer = document.createElement("div");
        /* setting.controlEl.createDiv({
            cls: "marker-icon-display color-picker",
        }); */

        colorContainer.addClasses(["marker-icon-display", "color-picker"]);

        if (insertAfter) {
            setting.controlEl.insertBefore(
                colorContainer,
                insertAfter.nextSibling
            );
        } else {
            setting.controlEl.appendChild(colorContainer);
        }

        let buttonEl: HTMLButtonElement;

        colorContainer.appendChild(
            colorContainer.createEl(
                "button",
                {
                    cls: "button",
                },
                el => {
                    buttonEl = el;
                    if (
                        marker.type == "default" ||
                        !this.plugin.AppData.defaultMarker.iconName
                    ) {
                        el.appendChild(
                            icon(getIcon(marker.iconName), {
                                styles: {
                                    color: marker.color
                                        ? marker.color
                                        : this.plugin.AppData.defaultMarker
                                            .color,
                                },
                            }).node[0]
                        );
                    } else {
                        let i = icon(getIcon(marker.iconName), {
                            transform: { size: 6, x: 0, y: -2 },
                            mask: getIcon(
                                this.plugin.AppData.defaultMarker.iconName
                            ),
                            styles: {
                                color: marker.color
                                    ? marker.color
                                    : this.plugin.AppData.defaultMarker.color,
                            },
                        }).abstract[0];
                        i.attributes = {
                            ...i.attributes,
                            style: `color: ${marker.color
                                ? marker.color
                                : this.plugin.AppData.defaultMarker.color
                                }`,
                        };

                        let html = toHtml(i);
                        let temp = document.createElement("div");
                        temp.innerHTML = html;
                        el.appendChild(temp.children[0]);
                    }
                    el.addClass(`${marker.type}-map-marker`);
                    if (
                        this.plugin.AppData.defaultMarker.iconName &&
                        !marker.color
                    )
                        el.addClass("default-map-marker");
                }
            )
        );

        colorContainer.appendChild(
            colorContainer.createEl(
                "input",
                {
                    attr: { type: "color" },
                },
                el => {
                    el.oninput = evt => {
                        let iconNodes = this.containerEl.querySelectorAll(
                            `.${marker.type}-map-marker > svg`
                        );

                        if (marker.type !== "default")
                            buttonEl.removeClass("default-map-marker");

                        iconNodes.forEach(node =>
                            node.setAttribute(
                                "style",
                                `color: ${(evt.target as HTMLInputElement).value
                                }`
                            )
                        );
                    };

                    el.onchange = async evt => {
                        marker.color = (evt.target as HTMLInputElement).value;

                        await this.plugin.saveSettings();
                        this.display();
                    };
                }
            )
        );
    }

    static setValidationError(textInput: TextComponent, message?: string) {
        textInput.inputEl.addClass("is-invalid");
        if (message) {
            textInput.inputEl.parentElement.addClasses([
                "has-invalid-message",
                "unset-align-items",
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
    }
    static removeValidationError(textInput: TextComponent) {
        textInput.inputEl.removeClass("is-invalid");
        textInput.inputEl.parentElement.removeClasses([
            "has-invalid-message",
            "unset-align-items",
        ]);
        textInput.inputEl.parentElement.parentElement.removeClass(
            ".unset-align-items"
        );

        if (textInput.inputEl.parentElement.children[1]) {
            textInput.inputEl.parentElement.removeChild(
                textInput.inputEl.parentElement.children[1]
            );
        }
    }

}

class MarkerModal extends Modal {
    marker: Marker;
    tempMarker: Marker;
    plugin: ObsidianLeaflet;
    constructor(app: App, plugin: ObsidianLeaflet, marker: Marker) {
        super(app);
        this.marker = marker;
        this.plugin = plugin;

        this.tempMarker = { ...this.marker };
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
            .addText(text => {
                typeTextInput = text
                    .setPlaceholder("Marker Name")
                    .setValue(this.tempMarker.type);
                typeTextInput.onChange(new_value => {
                    if (
                        this.plugin.AppData.markerIcons.find(
                            marker => marker.type == new_value
                        ) &&
                        this.tempMarker.type != this.marker.type
                    ) {
                        ObsidianLeafletSettingTab.setValidationError(
                            typeTextInput,
                            "Marker type already exists."
                        );
                        return;
                    }

                    if (new_value.length == 0) {
                        ObsidianLeafletSettingTab.setValidationError(
                            typeTextInput,
                            "Marker name cannot be empty."
                        );
                        return;
                    }

                    ObsidianLeafletSettingTab.removeValidationError(typeTextInput);

                    this.tempMarker.type = new_value;
                });
            });

        let iconTextInput: TextComponent;
        let iconName = new Setting(iconSettings)
            .setName("Marker Icon")
            .setDesc("Font Awesome icon name (e.g. map-marker).")
            .addText(text => {
                iconTextInput = text
                    .setPlaceholder("Icon Name")
                    .setValue(
                        this.tempMarker.iconName ? this.tempMarker.iconName : ""
                    )
                    .onChange(
                        async (new_value): Promise<void> => {
                            let icon = findIconDefinition({
                                iconName: new_value,
                            } as IconLookup);

                            if (!icon) {
                                ObsidianLeafletSettingTab.setValidationError(
                                    iconTextInput,
                                    "Invalid icon name."
                                );
                                return;
                            }

                            if (new_value.length == 0) {
                                ObsidianLeafletSettingTab.setValidationError(
                                    iconTextInput,
                                    "Icon cannot be empty."
                                );
                                return;
                            }

                            ObsidianLeafletSettingTab.removeValidationError(iconTextInput);
                            this.tempMarker.iconName = icon.iconName;

                            this.display("icon_name");
                        }
                    );
                iconTextInput.inputEl.id = "icon_name";
                return iconTextInput;
            });

        if (this.tempMarker.iconName) {
            let iconNode: AbstractElement = icon(
                getIcon(
                    this.tempMarker.layer
                        ? this.plugin.AppData.defaultMarker.iconName
                        : this.tempMarker.iconName
                ),
                {
                    classes: ["full-width-height"],
                }
            ).abstract[0];

            iconNode.attributes = {
                ...iconNode.attributes,
                style: `color: ${this.tempMarker.color}`,
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
                    transform: this.tempMarker.transform,
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
                    height: 512 / 16,
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
                    evt => {
                        let CTM = svgElement.getScreenCTM();
                        offset = {
                            x: (evt.clientX - CTM.e) / CTM.a,
                            y: (evt.clientY - CTM.f) / CTM.d,
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
                    evt => {
                        offset = { x: 0, y: 0 };
                        xPath.setAttribute("stroke-width", "0");
                        yPath.setAttribute("stroke-width", "0");
                        clickedOn = false;
                    }
                );
                this.plugin.registerDomEvent(
                    (iconOverlay as unknown) as HTMLElement,
                    "mousemove",
                    evt => {
                        if (clickedOn) {
                            evt.preventDefault();
                            let CTM = svgElement.getScreenCTM();
                            let coords = {
                                x: (evt.clientX - CTM.e) / CTM.a,
                                y: (evt.clientY - CTM.f) / CTM.d,
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
            .addToggle(toggle => {
                toggle.setValue(this.tempMarker.layer).onChange(v => {
                    this.tempMarker.layer = v;
                    this.display();
                });
                if (this.plugin.AppData.defaultMarker.iconName == null) {
                    toggle
                        .setDisabled(true)
                        .setTooltip("Add a base marker to layer this icon.");
                }
            });
        let colorInput = new Setting(createNewMarker)
            .setName("Icon Color")
            .setDesc("Override default icon color.");
        let colorInputNode = document.createElement("input");
        colorInputNode.setAttribute("type", "color");
        colorInputNode.setAttribute("value", this.tempMarker.color);
        colorInputNode.oninput = evt => {
            this.tempMarker.color = (evt.target as HTMLInputElement).value;

            iconDisplay.children[0].setAttribute(
                "style",
                `color: ${this.tempMarker.color}`
            );
        };
        colorInputNode.onchange = async evt => {
            this.tempMarker.color = (evt.target as HTMLInputElement).value;

            this.display();
        };
        colorInput.controlEl.appendChild(colorInputNode);

        let add = new Setting(createNewMarker);

        add.addButton(
            (button: ButtonComponent): ButtonComponent => {
                let b = button.setTooltip("Save").onClick(async () => {
                    // Force refresh
                    let error = false;
                    if (
                        this.plugin.AppData.markerIcons.find(
                            marker => marker.type == this.tempMarker.type
                        ) &&
                        this.tempMarker.type != this.marker.type
                    ) {
                        ObsidianLeafletSettingTab.setValidationError(
                            typeTextInput,
                            "Marker type already exists."
                        );
                        error = true;
                    }

                    if (this.tempMarker.type.length == 0) {
                        ObsidianLeafletSettingTab.setValidationError(
                            typeTextInput,
                            "Marker name cannot be empty."
                        );
                        error = true;
                    }
                    if (
                        !findIconDefinition({
                            iconName: iconTextInput.inputEl.value,
                        } as IconLookup)
                    ) {
                        ObsidianLeafletSettingTab.setValidationError(
                            iconTextInput,
                            "Invalid icon name."
                        );
                        error = true;
                    }

                    if (!this.tempMarker.iconName) {
                        ObsidianLeafletSettingTab.setValidationError(
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
                        } as IconLookup)
                    ).node[0]
                );
                return b;
            }
        );
        add.addExtraButton(b => {
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
        let fill = getComputedStyle(el).getPropertyValue(
            "background-color"
        );

        if (fill.includes("rgb")) {
            // Choose correct separator
            let sep = fill.indexOf(",") > -1 ? "," : " ";
            // Turn "rgb(r,g,b)" into [r,g,b]
            let rgbArr = fill
                .split("(")[1]
                .split(")")[0]
                .split(sep);
            let r = (+rgbArr[0]).toString(16),
                g = (+rgbArr[1]).toString(16),
                b = (+rgbArr[2]).toString(16);

            if (r.length == 1) r = "0" + r;
            if (g.length == 1) g = "0" + g;
            if (b.length == 1) b = "0" + b;

            return [
                "#" + r + g + b,
                rgbArr[3] ? `${+rgbArr[3]}` : "1",
            ];
        }
        if (fill.includes("#")) {
            return [fill, "1"];
        }
    }
}
