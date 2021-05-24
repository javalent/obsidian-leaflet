import {
    PluginSettingTab,
    Setting,
    App,
    Notice,
    ButtonComponent
} from "obsidian";
import { parse as parseCSV, unparse as unparseCSV } from "papaparse";

import {
    findIconDefinition,
    IconName,
    icon,
    getIcon,
    getId,
    iconNames,
    removeValidationError,
    setValidationError
} from "./utils";
import { CreateMarkerModal, IconSuggestionModal } from "./modals";

import {
    IMapMarkerData,
    IMarker,
    IMarkerData,
    ObsidianLeaflet
} from "./@types/";

import { latLng } from "leaflet";

export class ObsidianLeafletSettingTab extends PluginSettingTab {
    plugin: ObsidianLeaflet;
    newMarker: IMarker;

    constructor(app: App, plugin: ObsidianLeaflet) {
        super(app, plugin);
        this.plugin = plugin;

        this.newMarker = {
            type: "",
            iconName: null,
            color: this.data.layerMarkers
                ? this.data.defaultMarker.color
                : this.data.color,
            layer: this.data.layerMarkers,
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

        this.createMarkerSettings(containerEl);

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
                this.data.defaultMarker.iconName = new_value;

                await this.plugin.saveSettings();

                this.display();
            };

            const modal = new IconSuggestionModal(this.app, text, iconNames);

            modal.onClose = validate;

            text.inputEl.onblur = validate;
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
            .addButton((button: ButtonComponent): ButtonComponent => {
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
            });
        let markers = additionalMarkers.createDiv({
            cls: "additional-markers"
        });
        this.data.markerIcons.forEach((marker) => {
            let setting = new Setting(markers) /* 
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
    createMarkerSettings(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Display Note Preview")
            .setDesc(
                "Markers linked to notes will show a note preview when hovered."
            )
            .addToggle((toggle) =>
                toggle.setValue(this.data.notePreview).onChange(async (v) => {
                    this.data.notePreview = v;

                    await this.plugin.saveSettings();
                    this.display();
                })
            );
        new Setting(containerEl)
            .setName("Copy Coordinates on Shift-Click")
            .setDesc(
                "Map coordinates will be copied to the clipboard when shift-clicking."
            )
            .addToggle((toggle) =>
                toggle.setValue(this.data.copyOnClick).onChange(async (v) => {
                    this.data.copyOnClick = v;

                    await this.plugin.saveSettings();
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
                    markersToAdd: Map<string, IMarkerData[]> = new Map(),
                    parsed = parseCSV<string[]>(csv);

                if (parsed.data && parsed.data.length) {
                    for (let i = 0; i < parsed.data.length; i++) {
                        let data = parsed.data[i];
                        if (!data || data.length < 6) continue;
                        let [map, type, lat, long, link, layer, id] = data.map(
                            (l) => l.replace(/"/g, "")
                        );
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

                        if (!link || !link.length || link === "undefined") {
                            link = undefined;
                        } else if (/\[\[[\s\S]+\]\]/.test(link)) {
                            //obsidian wiki-link
                            [, link] = link.match(/\[\[([\s\S]+)\]\]/);
                        }
                        if (!id || !id.length || id === "undefined") {
                            id = getId();
                        }
                        if (!markersToAdd.has(map)) markersToAdd.set(map, []);
                        const mapMap = markersToAdd.get(data[0]);
                        mapMap.push({
                            type: type,
                            loc: [Number(lat), Number(long)],
                            link: link,
                            layer: layer,
                            id: id,
                            command: false,
                            zoom: null
                        });
                        markersToAdd.set(data[0], mapMap);
                    }

                    for (let [id, markers] of [...markersToAdd]) {
                        if (
                            !this.data.mapMarkers.find(({ id: p }) => p == id)
                        ) {
                            const map: IMapMarkerData = {
                                id: id,
                                files: [],
                                lastAccessed: Date.now(),
                                markers: [],
                                overlays: []
                            };
                            this.data.mapMarkers.push(map);
                        }

                        if (this.plugin.maps.find(({ id: p }) => p == id)) {
                            let map = this.plugin.maps.find(
                                ({ id: p }) => p == id
                            ).map;
                            for (let marker of markers) {
                                map.markers = map.markers.filter(
                                    ({ id }) => id != marker.id
                                );
                                map.createMarker(
                                    this.plugin.markerIcons.find(
                                        ({ type }) => type === marker.type
                                    ),
                                    latLng(marker.loc),
                                    marker.link,
                                    marker.id,
                                    marker.layer
                                );
                            }
                        } else {
                            let map = this.data.mapMarkers.find(
                                ({ id: p }) => p == id
                            );
                            for (let marker of markers) {
                                map.markers = map.markers.filter(
                                    ({ id }) => id != marker.id
                                );
                                map.markers.push(marker);
                            }
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
                    for (let { id: mapId, markers } of this.data.mapMarkers) {
                        for (let { type, loc, link, layer, id } of markers) {
                            csv.push([
                                mapId,
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
