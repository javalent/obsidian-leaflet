import { Modal, Notice, Setting, TextComponent } from "obsidian";

import { ObsidianLeaflet, LeafletMap, IOverlayData, Marker } from "../@types";

import { PathSuggestionModal } from "./path";
import { CommandSuggestionModal } from "./command";
import {
    getGroupSeparator,
    removeValidationError,
    setValidationError
} from "src/utils";

import { UNIT_NAME_ALIASES } from "src/utils";
import convert from "convert";
import { TooltipDisplay } from "src/@types/map";
export class MarkerContextModal extends Modal {
    deleted: boolean = false;
    tempMarker: Marker;
    modal: CommandSuggestionModal | PathSuggestionModal;
    limit: number = 100;
    constructor(
        public plugin: ObsidianLeaflet,
        public marker: Marker,
        public map: LeafletMap
    ) {
        super(plugin.app);
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
                    let commands = this.app.commands.listCommands();

                    let value =
                        commands.find(({ id }) => id == this.marker.link)
                            ?.name ?? this.marker.link;

                    text.setPlaceholder("Command").setValue(value);
                    this.modal = new CommandSuggestionModal(this.app, text, [
                        ...commands
                    ]);

                    this.modal.onClose = (item) => {
                        this.tempMarker.link = item.id;
                    };

                    text.inputEl.onblur = async () => {
                        this.tempMarker.link =
                            commands.find(
                                ({ name, id }) =>
                                    name == text.inputEl.value ||
                                    id == text.inputEl.value
                            )?.id ?? text.inputEl.value;
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
        new Setting(this.contentEl)
            .setName("Display Tooltip")
            .setDesc(
                !this.plugin.AppData.displayMarkerTooltips &&
                    (!this.tempMarker.tooltip ||
                        this.tempMarker.tooltip === "hover")
                    ? "This tooltip will not display because marker tooltips are turned off globally."
                    : ""
            )
            .addDropdown((drop) => {
                drop.addOption("hover", "Hover");
                drop.addOption("never", "Never");
                drop.setValue(this.tempMarker.tooltip ?? "hover").onChange(
                    async (value: TooltipDisplay) => {
                        this.tempMarker.tooltip = value;
                        this.display();
                    }
                );
            });

        new Setting(this.contentEl)
            .setName("Min Zoom")
            .setDesc(
                "Only display above this zoom. Current map minimum: " +
                    this.map.zoom.min
            )
            .addText((text) => {
                let warned = false;
                text.inputEl.onkeydown = (evt) => {
                    if (
                        !/^(\d*\.?\d*|Backspace|Delete|Arrow\w+|\-|Tab)$/.test(
                            evt.key
                        )
                    ) {
                        if (!warned) {
                            warned = true;
                            new Notice("Minimum zoom must be a number.");
                        }
                        evt.preventDefault();
                        return false;
                    }
                };
                if (this.tempMarker.minZoom != null)
                    text.setValue(`${this.tempMarker.minZoom}`);
                text.onChange((v) => {
                    this.tempMarker.minZoom = Number(v);
                });
            });
        new Setting(this.contentEl)
            .setName("Max Zoom")
            .setDesc(
                "Only display below this zoom. Current map maximum: " +
                    this.map.zoom.max
            )
            .addText((text) => {
                let warned = false;
                text.inputEl.onkeydown = (evt) => {
                    if (
                        !/^(\d*\.?\d*|Backspace|Delete|Arrow\w+|\-|Tab)$/.test(
                            evt.key
                        )
                    ) {
                        if (!warned) {
                            warned = true;
                            new Notice("Maximum zoom must be a number.");
                        }
                        evt.preventDefault();
                        return false;
                    }
                };
                text.onChange((v) => {
                    this.tempMarker.maxZoom = Number(v);
                });
                if (this.tempMarker.maxZoom != null)
                    text.setValue(`${this.tempMarker.maxZoom}`);
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

export class OverlayContextModal extends Modal {
    deleted: boolean = false;
    tempOverlay: IOverlayData;
    modal: CommandSuggestionModal | PathSuggestionModal;
    limit: number = 100;
    constructor(
        public plugin: ObsidianLeaflet,
        public overlay: IOverlayData,
        public map: LeafletMap
    ) {
        super(plugin.app);
        this.overlay = overlay;
        this.plugin = plugin;
        this.map = map;

        this.tempOverlay = Object.assign(
            Object.create(Object.getPrototypeOf(this.overlay)),
            this.overlay
        );
        if (this.modal) this.modal.close();
    }
    async display() {
        this.contentEl.empty();

        let radiusInput: TextComponent;
        let radius = this.tempOverlay.radius;
        if (this.map.type == "image") {
            radius = radius * this.map.scale;
        }
        new Setting(this.contentEl)
            .setName("Overlay Radius")
            .setDesc(
                `Circle radius in ${
                    UNIT_NAME_ALIASES[this.tempOverlay.unit] ?? "meters"
                }.`
            )
            .addText((t) => {
                radiusInput = t;
                const regex = new RegExp(
                    `\\${getGroupSeparator(this.map.locale) ?? ","}`,
                    "g"
                );
                t.setValue(
                    `${this.map.distanceFormatter
                        .format(radius)
                        .replace(regex, "")}`
                );
                t.inputEl.onblur = () => {
                    if (
                        isNaN(Number(t.inputEl.value)) &&
                        Number(t.inputEl.value) > 0
                    ) {
                        setValidationError(
                            radiusInput,
                            "Radius must be greater than 0."
                        );
                        t.inputEl.value = `${radius}`;
                        return;
                    }
                    removeValidationError(radiusInput);

                    let newRadius = convert(Number(t.inputEl.value))
                        .from(this.tempOverlay.unit ?? "m")
                        .to(this.map.type == "image" ? this.map.unit : "m");
                    if (this.map.type == "image") {
                        newRadius = newRadius / this.map.scale;
                    }

                    this.tempOverlay.radius = Number(newRadius);
                };
            });

        const desc = new Setting(this.contentEl)
            .setName("Overlay Description")
            .addText((t) => {
                t.setValue(this.tempOverlay.desc).onChange((v) => {
                    this.tempOverlay.desc = v;
                });
            });

        const color = new Setting(this.contentEl).setName("Overlay Color");
        /** convert color to hex */
        let colorOfOverlay = this.tempOverlay.color;
        if (!/#\w{3,6}/.test(colorOfOverlay)) {
            const canvas = createEl("canvas");
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = colorOfOverlay;
            colorOfOverlay = ctx.fillStyle;
        }
        let colorInputNode = color.controlEl.createEl("input", {
            attr: {
                type: "color",
                value: colorOfOverlay
            }
        });
        colorInputNode.oninput = (evt) => {
            this.tempOverlay.color = (evt.target as HTMLInputElement).value;
        };
        colorInputNode.onchange = async (evt) => {
            this.tempOverlay.color = (evt.target as HTMLInputElement).value;

            this.display();
        };

        new Setting(this.contentEl)
            .setName("Display Tooltip")
            .setDesc(
                !this.plugin.AppData.displayMarkerTooltips &&
                    (!this.tempOverlay.tooltip ||
                        this.tempOverlay.tooltip === "hover")
                    ? "This tooltip will not display because marker tooltips are turned off globally."
                    : ""
            )
            .addDropdown((drop) => {
                drop.addOption("hover", "Hover");
                drop.addOption("never", "Never");
                drop.setValue(this.tempOverlay.tooltip ?? "hover").onChange(
                    async (value: TooltipDisplay) => {
                        this.tempOverlay.tooltip = value;

                        this.display();
                    }
                );
            });

        new Setting(this.contentEl).addButton((b) => {
            b.setIcon("trash")
                .setWarning()
                .setTooltip("Remove Overlay")
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
