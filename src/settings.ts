import {
    PluginSettingTab,
    Setting,
    App,
    Notice,
    ButtonComponent
} from "obsidian";
import { v4 as uuidv4 } from "uuid";
import { parse as parseCSV, unparse as unparseCSV } from "papaparse";

import {
    findIconDefinition,
    IconName,
    icon,
    toHtml,
    AbstractElement,
    getIcon
} from "./utils/icons";

import {
    MapMarkerData,
    Marker,
    MarkerData,
    ObsidianAppData
} from "./@types/index";

export const DEFAULT_SETTINGS: ObsidianAppData = {
    mapMarkers: [],
    defaultMarker: {
        type: "default",
        iconName: "map-marker",
        color: "#dddddd",
        transform: { size: 6, x: 0, y: -2 }
    },
    markerIcons: [],
    color: "#dddddd",
    lat: 39.983334,
    long: -82.98333,
    notePreview: false,
    layerMarkers: true
};

import ObsidianLeaflet from "./main";
import {
    CreateMarkerModal,
    removeValidationError,
    setValidationError
} from "./utils/modals";

export class ObsidianLeafletSettingTab extends PluginSettingTab {
    plugin: ObsidianLeaflet;
    newMarker: Marker;

    constructor(app: App, plugin: ObsidianLeaflet) {
        super(app, plugin);
        this.plugin = plugin;

        this.newMarker = {
            type: "",
            iconName: null,
            color: this.data.layerMarkers
                ? this.data.defaultMarker.color
                : this.data.color,
            layer: false,
            transform: this.data.defaultMarker.transform
        };
    }
    get data() {
        return this.plugin.AppData;
    }
    async display(): Promise<void> {
        let { containerEl } = this;

        containerEl.empty();

        containerEl.createEl("h2", { text: "Obsidian Leaflet Settings" });

        this.createCSVSetting(containerEl);

        this.createNotePreviewSetting(containerEl);

        this.createLatLongSetting(containerEl);

        let defaultMarker = containerEl.createDiv(
            "additional-markers-container"
        );
        this.createDefaultMarkerSettings(defaultMarker);

        let additionalMarkers = containerEl.createDiv(
            "additional-markers-container"
        );

        this.createAdditionalMarkerSettings(additionalMarkers);

        await this.plugin.saveSettings();
    }
    createDefaultMarkerSettings(defaultMarker: HTMLDivElement) {
        let defaultSetting = new Setting(defaultMarker)
            .setHeading()
            .setName("Default Map Marker")
            .setDesc("This marker is always available.");
        let iconDisplay = defaultSetting.settingEl.createDiv({
            attr: {
                style: `align-self: start; margin: 0 18px; font-size: 24px; color: ${this.data.defaultMarker.color};`
            }
        });
        iconDisplay.appendChild(
            icon(
                findIconDefinition({
                    iconName: this.data.defaultMarker.iconName as IconName,
                    prefix: "fas"
                })
            ).node[0]
        );
        let settings = defaultMarker.createDiv({
            cls: "additional-markers"
        });
        new Setting(settings).setName("Marker Icon").addText((text) => {
            text.setPlaceholder("Icon Name").setValue(
                this.data.defaultMarker.iconName
                    ? this.data.defaultMarker.iconName
                    : ""
            );
            text.inputEl.addEventListener("blur", async (evt) => {
                let target = evt.target as HTMLInputElement;
                let new_value: string = target.value;

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
                this.data.defaultMarker.iconName = new_value;

                await this.plugin.saveSettings();

                this.display();
            });
        });
        let colorInput = new Setting(settings).setName("Marker Color");

        let colorInputNode = colorInput.controlEl.createEl("input", {
            attr: {
                type: "color",
                value: this.data.defaultMarker.color
            }
        });
        colorInputNode.oninput = ({ target }) => {
            this.data.defaultMarker.color = (target as HTMLInputElement).value;

            iconDisplay.children[0].setAttribute(
                "style",
                `color: ${this.data.defaultMarker.color}`
            );
        };
        colorInputNode.onchange = async ({ target }) => {
            this.data.defaultMarker.color = (target as HTMLInputElement).value;
            this.display();
        };

        new Setting(settings)
            .setName("Layer Base Marker")
            .setDesc("Use as base layer for additional markers by default.")
            .addToggle((t) => {
                t.setValue(this.data.layerMarkers);
                t.onChange(async (v) => {
                    this.data.layerMarkers = v;
                    this.data.markerIcons.forEach(
                        (marker) => (marker.layer = v)
                    );

                    await this.plugin.saveSettings();

                    this.display();
                    return;
                });
            });
    }
    createAdditionalMarkerSettings(additionalMarkers: HTMLDivElement) {
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
                            let newMarkerModal = new CreateMarkerModal(
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
                                this.data.markerIcons.push(this.newMarker);
                                this.newMarker = {
                                    type: "",
                                    iconName: null,
                                    color: this.data.layerMarkers
                                        ? this.data.defaultMarker.color
                                        : this.data.color,
                                    layer: true,
                                    transform: this.data.defaultMarker.transform
                                };
                                await this.plugin.saveSettings();

                                this.display();
                            };
                        });
                    b.buttonEl.appendChild(
                        icon(
                            findIconDefinition({
                                iconName: "plus",
                                prefix: "fas"
                            })
                        ).node[0]
                    );
                    return b;
                }
            );
        let markers = additionalMarkers.createDiv({
            cls: "additional-markers"
        });
        this.data.markerIcons.forEach((marker) => {
            let setting = new Setting(
                markers
            ) /* 
                .setName(marker.type) */
                .addExtraButton((b) =>
                    b.onClick(() => {
                        const tempMarker = { ...marker };
                        let newMarkerModal = new CreateMarkerModal(
                            this.app,
                            this.plugin,
                            marker
                        );
                        newMarkerModal.open();
                        newMarkerModal.onClose = async () => {
                            if (!marker.type || !marker.iconName) {
                                return;
                            }

                            if (tempMarker.type != marker.type) {
                                this.data.mapMarkers.forEach(({ markers }) => {
                                    markers = markers.map((m) => {
                                        if (m.type == tempMarker.type) {
                                            m.type = marker.type;
                                        }
                                        return m;
                                    });
                                });
                            }

                            await this.plugin.saveSettings();
                            this.display();
                        };
                    })
                )
                .addExtraButton((b) =>
                    b.setIcon("trash").onClick(() => {
                        this.data.markerIcons = this.data.markerIcons.filter(
                            (m) => m != marker
                        );
                        this.display();
                    })
                );
            let iconNode = icon(getIcon(marker.iconName), {
                transform: marker.layer ? marker.transform : null,
                mask: marker.layer
                    ? getIcon(this.data.defaultMarker.iconName)
                    : null
            }).node[0];

            /* iconNode.attributes = {
                ...iconNode.attributes,
                style: `color: ${marker.color}`
            }; */
            let markerIconDiv = createDiv({
                cls: "marker-icon-display",
                attr: {
                    style: `color: ${marker.color};`
                }
            });
            markerIconDiv.appendChild(iconNode);
            let name = setting.nameEl.createDiv("marker-type-display");
            name.appendChild(markerIconDiv);
            name.appendText(marker.type);
        });
    }
    createLatLongSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Default Latitude")
            .setDesc(
                "Real-world maps will open to this latitude if not specified."
            )
            .addText((text) => {
                text.setValue(`${this.data.lat}`);
                text.onChange((v) => {
                    if (isNaN(Number(v))) {
                        setValidationError(text, "Latitude must be a number.");
                        return;
                    }
                    removeValidationError(text);
                    this.data.lat = Number(v);
                    text.inputEl.addEventListener("blur", async () => {
                        this.display();
                    });
                });
            });
        new Setting(containerEl)
            .setName("Default Longitude")
            .setDesc(
                "Real-world maps will open to this longitude if not specified."
            )
            .addText((text) => {
                text.setValue(`${this.data.long}`);
                text.onChange((v) => {
                    if (isNaN(Number(v))) {
                        setValidationError(text, "Longitude must be a number.");
                        return;
                    }
                    removeValidationError(text);
                    this.data.long = Number(v);
                });

                text.inputEl.addEventListener("blur", async () => {
                    this.display();
                });
            });
    }
    createNotePreviewSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Display Note Preview")
            .setDesc(
                "Markers linked to notes will show a note preview when hovered."
            )
            .addToggle((toggle) =>
                toggle.setValue(this.data.notePreview).onChange((v) => {
                    this.data.notePreview = v;
                    this.display();
                })
            );
    }
    createCSVSetting(containerEl: HTMLElement) {
        let importSetting = new Setting(containerEl);
        importSetting.setDesc(
            "This setting is experimental and could cause marker data issues. Use at your own risk."
        );
        let name = importSetting.nameEl.createDiv({
            cls: "use-csv-marker"
        });
        name.appendChild(
            icon(
                findIconDefinition({
                    iconName: "exclamation-triangle",
                    prefix: "fas"
                })
            ).node[0]
        );
        name.appendChild(createSpan({ text: "Import Marker CSV File" })); //.setName("Use CSV Marker File");

        const label = importSetting.controlEl.createEl("label", {
            cls: "leaflet-file-upload",
            text: "Choose File"
        });
        const input = label.createEl("input", {
            attr: {
                type: "file",
                name: "merge",
                accept: ".csv"
            }
        });
        input.onchange = async () => {
            const { files } = input;

            if (!files.length) return;
            try {
                const csv = await files[0].text(),
                    markersToAdd: Map<string, MarkerData[]> = new Map(),
                    parsed = parseCSV<string[]>(csv);

                if (parsed.data && parsed.data.length) {
                    for (let i = 0; i < parsed.data.length; i++) {
                        let data = parsed.data[i];
                        if (!data || data.length < 6) continue;
                        let [
                            map,
                            type,
                            lat,
                            long,
                            link,
                            layer,
                            id
                        ] = data.map((l) => l.replace(/"/g, ""));
                        if (!map || !map.length || map === "undefined") {
                            new Notice("Map not specified for line " + i + 1);
                            continue;
                        }
                        if (
                            !type ||
                            !type.length ||
                            type === "undefined" ||
                            (type != "default" &&
                                !this.data.markerIcons.find(
                                    ({ type: t }) => t == type
                                ))
                        ) {
                            type = "default";
                        }
                        if (!lat || !lat.length || isNaN(Number(lat))) {
                            new Notice(
                                "Could not parse latitude for line " + i + 1
                            );
                            continue;
                        }
                        if (!long || !long.length || isNaN(Number(long))) {
                            new Notice(
                                "Could not parse longitude for line " + i + 1
                            );
                            continue;
                        }

                        if (!link || !link.length || link === "undefined")
                            link = undefined;
                        if (!id || !id.length || id === "undefined")
                            id = uuidv4();

                        if (!markersToAdd.has(map)) markersToAdd.set(map, []);
                        const mapMap = markersToAdd.get(data[0]);
                        mapMap.push({
                            type: type,
                            loc: [Number(lat), Number(long)],
                            link: link,
                            layer: layer,
                            id: id
                        });
                        markersToAdd.set(data[0], mapMap);
                    }

                    for (let [path, markers] of [...markersToAdd]) {
                        if (
                            !this.data.mapMarkers.find(
                                ({ path: p }) => p == path
                            )
                        ) {
                            const map: MapMarkerData = {
                                path: path,
                                file: path.split(".md")[0] + ".md",
                                markers: []
                            };
                            this.data.mapMarkers.push(map);
                        }
                        let map = this.data.mapMarkers.find(
                            ({ path: p }) => p == path
                        );
                        for (let marker of markers) {
                            map.markers = map.markers.filter(
                                ({ id }) => id != marker.id
                            );
                            map.markers.push(marker);
                        }
                    }
                    await this.plugin.saveSettings();
                    new Notice("Marker file successfully imported.");
                }
            } catch (e) {
                new Notice(
                    "There was an error while importing " + files[0].name
                );
                console.error(e);
            }

            input.value = null;
        };

        let exportSetting = new Setting(containerEl);
        exportSetting
            .setName("Export Marker Data")
            .setDesc("Export all marker data to a CSV file.")
            .addButton((b) => {
                b.setButtonText("Export").onClick(() => {
                    let csv = [];
                    for (let { path, markers } of this.data.mapMarkers) {
                        for (let { type, loc, link, layer, id } of markers) {
                            csv.push([
                                path,
                                type,
                                loc[0],
                                loc[1],
                                link,
                                layer,
                                id
                            ]);
                        }
                    }

                    let csvFile = new Blob([unparseCSV(csv)], {
                        type: "text/csv"
                    });
                    let downloadLink = document.createElement("a");
                    downloadLink.download = "leaflet_marker_data.csv";
                    downloadLink.href = window.URL.createObjectURL(csvFile);
                    downloadLink.style.display = "none";
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                });
            });
    }
}

/*         csvMarkerSetting
            .setDesc(
                "Marker data will also be stored in a specified CSV file. Data will always be backed up in the plugin folder."
            )
            .addToggle((toggle) =>
                toggle
                    .setTooltip("Warning: Experimental")
                    .setValue(this.data.useCSV)
                    .onChange((v) => {
                        if (v) {
                            let confirm = new Modal(this.plugin.app),
                                saved = false;
                            confirm.titleEl.createEl("h3", {
                                text: "Warning: Experimental Feature",
                                attr: { style: "margin-bottom: 0;" }
                            });
                            let { contentEl } = confirm;
                            contentEl.createEl("p", {
                                text:
                                    "This setting is experimental and could cause marker data corruption issues."
                            });
                            contentEl.createEl("p", {
                                text:
                                    "Marker data will continue to be saved locally in the plugin folder."
                            });
                            contentEl.createEl("p", {
                                text: "Are you sure you want to turn it on?"
                            });

                            let footerEl = contentEl.createDiv();
                            let footerButtons = new Setting(footerEl);
                            footerButtons.addButton((b) => {
                                b.setTooltip("Confirm")
                                    .setIcon("checkmark")
                                    .onClick(async () => {
                                        saved = true;
                                        confirm.close();
                                    });
                                return b;
                            });
                            footerButtons.addExtraButton((b) => {
                                b.setIcon("cross")
                                    .setTooltip("Cancel")
                                    .onClick(() => {
                                        saved = false;
                                        confirm.close();
                                    });
                                return b;
                            });

                            confirm.onClose = async () => {
                                if (saved) {
                                    this.data.useCSV = true;
                                    this.plugin.saveSettings();
                                    this.display();
                                }
                            };

                            confirm.open();
                        } else {
                            this.data.useCSV = v;
                            this.display();
                        }
                    })
            );

        if (this.data.useCSV) {
            let csv = containerEl.createDiv({
                attr: {
                    style: "margin-left: 12px; margin-right: 12px;"
                }
            });

            let location = new Setting(csv)
                .setName("File Location")
                .setDesc(`${this.data.csvPath}`)
                .addText((t) => {
                    t.setPlaceholder("Example: folder 1/folder 2");
                    let folders = new Map<string, TFolder>();
                    folders.set("/", this.app.vault.getRoot());
                    const recursiveFolderAdd = (folder: TFolder) => {
                        if (folder.parent) {
                            folders.set(folder.parent.path, folder.parent);
                        }
                        if (folder.children) {
                            folder.children.forEach((child) => {
                                recursiveFolderAdd(child as TFolder);
                            });
                        }
                    };
                    recursiveFolderAdd(this.app.vault.getRoot());
                    let modal = new SuggestionModal<TFolder>(
                        this.app,
                        t.inputEl,
                        [...folders].map((f) => f[1])
                    );

                    modal.getItemText = (folder) => folder.path;
                    modal.selectSuggestion = async (folder, evt) => {
                        this.data.csvPath = folder.item.path;
                        modal.close();
                        await this.plugin.saveSettings();
                        this.display();
                    };
                });

        } */
