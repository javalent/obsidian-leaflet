import {
    PluginSettingTab,
    Setting,
    App,
    Notice,
    ButtonComponent,
    TFolder
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
    setValidationError,
    getMarkerIcon,
    DEFAULT_TILE_SERVER,
    DEFAULT_ATTRIBUTION,
    DEFAULT_TILE_SUBDOMAINS
} from "src/utils";
import { IconSuggestionModal } from "src/modals";

import { FolderSuggestionModal } from "src/modals/path";
import type ObsidianLeaflet from "src/main";
import t from "src/l10n/locale";
import { TooltipDisplay, SavedMarkerProperties, MapMarkerData } from "types";

export class ObsidianLeafletSettingTab extends PluginSettingTab {
    plugin: ObsidianLeaflet;

    constructor(app: App, plugin: ObsidianLeaflet) {
        super(app, plugin);
        this.plugin = plugin;
    }
    get data() {
        return this.plugin.data;
    }
    async display(): Promise<void> {
        let { containerEl } = this;

        containerEl.empty();

        containerEl.addClass("obsidian-leaflet-settings");

        this.createSettings(containerEl.createDiv());

        let defaultMarker = containerEl.createDiv(
            "additional-markers-container"
        );
        this.createDefaultMarkerSettings(defaultMarker);

        let additionalMarkers = containerEl.createDiv(
            "additional-markers-container"
        );

        this.createAdditionalMarkerSettings(additionalMarkers);
        const div = containerEl.createDiv("coffee");
        div.createEl("a", {
            href: "https://www.buymeacoffee.com/valentine195"
        }).createEl("img", {
            attr: {
                src: "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"
            }
        });
        await this.plugin.saveSettings();
    }
    createSettings(containerEl: HTMLElement) {
        const importSetting = new Setting(containerEl);
        importSetting
            .setName(t("Import marker CSV file"))
            .setDesc(
                t(
                    "This setting is experimental and could cause marker data issues. Use at your own risk."
                )
            )
        const input = createEl("input", {
            attr: {
                type: "file",
                name: "merge",
                accept: ".csv"
            }
        });
        importSetting.addButton((b) => {
            b.setButtonText(t("Choose file")).setTooltip(t("Upload CSV file"));
            b.buttonEl.addClass("leaflet-file-upload");
            b.buttonEl.appendChild(input);
            b.onClick(() => input.click());
        });

        input.onchange = async () => {
            const { files } = input;

            if (!files.length) return;
            try {
                const csv = await files[0].text(),
                    markersToAdd: Map<string, SavedMarkerProperties[]> =
                        new Map(),
                    parsed = parseCSV<string[]>(csv);

                if (parsed.data && parsed.data.length) {
                    for (let i = 0; i < parsed.data.length; i++) {
                        let data = parsed.data[i];
                        if (!data || data.length < 6) continue;
                        let [map, type, lat, long, link, layer, id] = data.map(
                            (l) => l.replace(/"/g, "")
                        );
                        if (!map || !map.length || map === "undefined") {
                            new Notice(
                                t("Map not specified for line %1", `${i + 1}`)
                            );
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
                                t(
                                    "Could not parse latitude for line %1",
                                    `${i + 1}`
                                )
                            );
                            continue;
                        }
                        if (!long || !long.length || isNaN(Number(long))) {
                            new Notice(
                                t(
                                    "Could not parse longitude for line %1",
                                    `${i + 1}`
                                )
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
                            percent: undefined,
                            link: link,
                            layer: layer,
                            id: id,
                            command: false,
                            description: null,
                            mutable: true,
                            minZoom: null,
                            maxZoom: null,
                            tooltip: "hover"
                        });
                        markersToAdd.set(data[0], mapMap);
                    }

                    for (let [id, markers] of [...markersToAdd]) {
                        if (
                            !this.data.mapMarkers.find(({ id: p }) => p == id)
                        ) {
                            const map: MapMarkerData = {
                                id: id,
                                files: [],
                                lastAccessed: Date.now(),
                                markers: [],
                                overlays: [],
                                shapes: [],
                                locked: false
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
                                    marker.type as string,
                                    marker.loc,
                                    undefined,
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
                    t("There was an error while importing %1", files[0].name)
                );
                console.error(e);
            }

            input.value = null;
        };

        let exportSetting = new Setting(containerEl);
        exportSetting
            .setName(t("Export marker data"))
            .setDesc(t("Export all marker data to a CSV file."))
            .addButton((b) => {
                b.setButtonText(t("Export")).onClick(() => {
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
        const configSetting = new Setting(containerEl)
            .setName(t("Default config directory"))
            .addText(async (text) => {
                let folders = this.app.vault
                    .getAllLoadedFiles()
                    .filter((f) => f instanceof TFolder);

                text.setPlaceholder(
                    this.data.configDirectory ?? this.app.vault.configDir
                );
                const modal = new FolderSuggestionModal(this.app, text, [
                    ...(folders as TFolder[])
                ]);

                modal.onClose = async () => {
                    if (!text.inputEl.value) {
                        this.data.configDirectory = null;
                    } else {
                        const exists = await this.app.vault.adapter.exists(
                            text.inputEl.value
                        );

                        if (!exists) {
                            //confirm}

                            this.data.configDirectory = text.inputEl.value;
                            await this.plugin.saveSettings();
                        }
                    }
                };

                text.inputEl.onblur = async () => {
                    if (!text.inputEl.value) {
                        return;
                    }
                    const exists = await this.app.vault.adapter.exists(
                        text.inputEl.value
                    );

                    this.data.configDirectory = text.inputEl.value;

                    await this.plugin.saveSettings();
                    this.display();
                };
            })
            .addExtraButton((b) => {
                b.setTooltip(t("Reset to default"))
                    .setIcon("undo-glyph")
                    .onClick(async () => {
                        this.data.configDirectory = null;
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });
        configSetting.descEl.createSpan({
            text: t("Please back up your data before changing this setting.")
        });
        configSetting.descEl.createEl("br");
        configSetting.descEl.createSpan({
            text: `${t("Current directory")}: `
        });
        const configDirectory =
            this.data.configDirectory ?? this.app.vault.configDir;
        configSetting.descEl.createEl("code", {
            text: configDirectory
        });

        new Setting(containerEl)
            .setName(t("Default marker tooltip behavior"))
            .setDesc(
                t(
                    "New markers will be created to this setting by default. Can be overridden per-marker."
                )
            )
            .addDropdown((drop) => {
                drop.addOption("always", t("Always"));
                drop.addOption("hover", t("Hover"));
                drop.addOption("never", t("Never"));
                drop.setValue(
                    this.plugin.data.displayMarkerTooltips ?? "hover"
                ).onChange((value: TooltipDisplay) => {
                    this.plugin.data.displayMarkerTooltips = value;
                });
            });
        new Setting(containerEl)
            .setName(t("Enable draw mode by default"))
            .setDesc(
                t(
                    "The draw control will be added to maps by default. Can be overridden with the draw map block parameter."
                )
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.data.enableDraw)

                    .onChange(async (v) => {
                        this.data.enableDraw = v;

                        await this.plugin.saveSettings();

                        this.display();
                    })
            );
        new Setting(containerEl)
            .setName(t("Display note preview"))
            .setDesc(
                t(
                    "Markers linked to notes will show a note preview when hovered."
                )
            )
            .addToggle((toggle) =>
                toggle.setValue(this.data.notePreview).onChange(async (v) => {
                    this.data.notePreview = v;

                    await this.plugin.saveSettings();

                    this.display();
                })
            );
        new Setting(containerEl)
            .setName(t("Display overlay tooltips"))
            .setDesc(t("Overlay tooltips will display when hovered."))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.data.displayOverlayTooltips)
                    .onChange(async (v) => {
                        this.data.displayOverlayTooltips = v;

                        await this.plugin.saveSettings();
                        this.display();
                    })
            );
        new Setting(containerEl)
            .setName(t("Copy coordinates on shift-click"))
            .setDesc(
                t(
                    "Map coordinates will be copied to the clipboard when shift-clicking."
                )
            )
            .addToggle((toggle) =>
                toggle.setValue(this.data.copyOnClick).onChange(async (v) => {
                    this.data.copyOnClick = v;

                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        new Setting(containerEl).setName('Map').setHeading();
        new Setting(containerEl)
            .setName(t("Default latitude"))
            .setDesc(
                t(
                    "Real-world maps will open to this latitude if not specified."
                )
            )
            .addText((text) => {
                text.setValue(`${this.data.lat}`);
                text.onChange((v) => {
                    if (isNaN(Number(v))) {
                        setValidationError(
                            text,
                            t("Latitude must be a number.")
                        );
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
            .setName(t("Default longitude"))
            .setDesc(
                t(
                    "Real-world maps will open to this longitude if not specified."
                )
            )
            .addText((text) => {
                text.setValue(`${this.data.long}`);
                text.onChange((v) => {
                    if (isNaN(Number(v))) {
                        setValidationError(
                            text,
                            t("Longitude must be a number.")
                        );
                        return;
                    }
                    removeValidationError(text);
                    this.data.long = Number(v);
                });

                text.inputEl.addEventListener("blur", async () => {
                    this.display();
                });
            });
        new Setting(containerEl)
            .setName(t("Default units"))
            .setDesc(t("Select the default system of units for the map."))
            .addDropdown((d) => {
                d.addOption("imperial", t("Imperial"))
                    .addOption("metric", t("Metric"))
                    .setValue(this.plugin.data.defaultUnitType)
                    .onChange(async (v: "imperial" | "metric") => {
                        this.plugin.data.defaultUnitType = v;
                        await this.plugin.saveSettings();
                    });
            });
        new Setting(containerEl)
            .setName(t("Default tile server"))
            .setDesc(
                t(
                    "It is up to you to ensure you have proper access to this tile server."
                )
            )
            .addText((t) => {
                t.setValue(this.plugin.data.defaultTile).onChange((v) => {
                    this.plugin.data.defaultTile = v;
                    this.plugin.saveSettings();
                });
            })
            .addExtraButton((b) =>
                b
                    .setIcon("reset")
                    .setTooltip(t("Reset"))
                    .onClick(() => {
                        this.plugin.data.defaultTile = DEFAULT_TILE_SERVER;

                        this.createMapSettings(containerEl);
                        this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName(t("Default tile server subdomains"))
            .setDesc(
                t(
                    "Available subdomains for this tile server concurrent requests."
                )
            )
            .addText((t) => {
                t.setValue(this.plugin.data.defaultTileSubdomains).onChange(
                    (v) => {
                        this.plugin.data.defaultTileSubdomains = v;
                        this.plugin.saveSettings();
                    }
                );
            })
            .addExtraButton((b) =>
                b
                    .setIcon("reset")
                    .setTooltip(t("Reset"))
                    .onClick(() => {
                        this.plugin.data.defaultTileSubdomains =
                            DEFAULT_TILE_SUBDOMAINS;

                        this.createMapSettings(containerEl);
                        this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName(t("Default tile server attribution"))
            .setDesc(
                t(
                    "Please ensure your attribution meets all requirements set by the tile server."
                )
            )
            .addTextArea((t) => {
                t.setValue(this.plugin.data.defaultAttribution).onChange(
                    (v) => {
                        this.plugin.data.defaultAttribution = v;
                        this.plugin.saveSettings();
                    }
                );
            })
            .addExtraButton((b) =>
                b
                    .setIcon("reset")
                    .setTooltip(t("Reset"))
                    .onClick(() => {
                        this.plugin.data.defaultAttribution =
                            DEFAULT_ATTRIBUTION;

                        this.createMapSettings(containerEl);
                        this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName(t("Default tile server (dark mode)"))
            .setDesc(
                t(
                    "It is up to you to ensure you have proper access to this tile server."
                )
            )
            .addText((t) => {
                t.setValue(this.plugin.data.defaultTileDark).onChange((v) => {
                    this.plugin.data.defaultTileDark = v;
                    this.plugin.saveSettings();
                });
            })
            .addExtraButton((b) =>
                b
                    .setIcon("reset")
                    .setTooltip(t("Reset"))
                    .onClick(() => {
                        this.plugin.data.defaultTileDark = DEFAULT_TILE_SERVER;
                        this.createMapSettings(containerEl);
                        this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl).setName('Markers').setHeading();
    }
    createDefaultMarkerSettings(defaultMarker: HTMLDivElement) {
        let defaultSetting = new Setting(defaultMarker)
            .setName(t("Default map marker"))
            .setDesc(t("This marker is always available."));
        let iconDisplay = defaultSetting.settingEl.createDiv({
            attr: {
                style: `align-self: start; margin: 0 18px; font-size: 24px; color: ${this.data.defaultMarker.color};`
            }
        });

        iconDisplay.appendChild(getMarkerIcon(this.data.defaultMarker).node);

        let settings = defaultMarker.createDiv({
            cls: "additional-markers"
        });
        const input = createEl("input", {
            attr: {
                type: "file",
                name: "image",
                accept: "image/*"
            }
        });
        const defaultMarkerIconSetting = new Setting(settings)
            .setName(t("Icon name"))
            .addText((text) => {
                text.setPlaceholder(t("Icon name")).setValue(
                    !this.data.defaultMarker.isImage
                        ? this.data.defaultMarker.iconName
                        : ""
                );

                const validate = async () => {
                    const new_value = text.inputEl.value;

                    if (!new_value.length) {
                        setValidationError(
                            text,
                            t("A default marker must be defined.")
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
                            t(
                                "The selected icon does not exist in Font Awesome Free."
                            )
                        );
                        return;
                    }

                    removeValidationError(text);
                    this.data.defaultMarker.iconName = new_value;
                    this.data.defaultMarker.isImage = false;

                    await this.plugin.saveMarkerTypes();

                    this.display();
                };

                const modal = new IconSuggestionModal(
                    this.app,
                    text,
                    iconNames
                );

                modal.onClose = validate;

                text.inputEl.onblur = validate;
            })
            .addButton((b) => {
                b.setButtonText(t("Upload image")).setTooltip(
                    t("Upload image")
                );
                b.buttonEl.addClass("leaflet-file-upload");
                b.buttonEl.appendChild(input);
                b.onClick(() => input.click());
            });

        /** Image Uploader */
        input.onchange = async () => {
            const { files } = input;

            if (!files.length) return;

            const image = files[0];
            const reader = new FileReader();
            reader.onloadend = (evt) => {
                var image = new Image();
                image.onload = () => {
                    // Resize the image
                    const canvas = document.createElement("canvas"),
                        max_size = 24;
                    let width = image.width,
                        height = image.height;
                    if (width >= height && width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    } else if (height >= width && height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    canvas
                        .getContext("2d")
                        .drawImage(image, 0, 0, width, height);

                    this.data.defaultMarker.isImage = true;
                    this.data.defaultMarker.imageUrl =
                        canvas.toDataURL("image/png");

                    this.plugin.saveMarkerTypes();
                    this.display();

                    //defaultMarkerIconSetting.settingEl.appendChild(canvas);
                };
                image.src = evt.target.result.toString();
            };
            reader.readAsDataURL(image);

            input.value = null;
        };
        if (!this.data.defaultMarker.isImage) {
            let colorInput = new Setting(settings).setName(t("Marker color"));

            let colorInputNode = colorInput.controlEl.createEl("input", {
                attr: {
                    type: "color",
                    value: this.data.defaultMarker.color
                }
            });
            colorInputNode.oninput = ({ target }) => {
                this.data.defaultMarker.color = (
                    target as HTMLInputElement
                ).value;

                iconDisplay.children[0].setAttribute(
                    "style",
                    `color: ${this.data.defaultMarker.color}`
                );
            };
            colorInputNode.onchange = async ({ target }) => {
                this.data.defaultMarker.color = (
                    target as HTMLInputElement
                ).value;
                this.display();
            };

            new Setting(settings)
                .setName(t("Layer base marker"))
                .setDesc(
                    t("Use as base layer for additional markers by default.")
                )
                .addToggle((t) => {
                    t.setValue(this.data.layerMarkers);
                    t.onChange(async (v) => {
                        this.data.layerMarkers = v;
                        this.data.markerIcons.forEach(
                            (marker) => (marker.layer = v)
                        );

                        await this.plugin.saveMarkerTypes();

                        this.display();
                        return;
                    });
                });
        }
    }
    createAdditionalMarkerSettings(additionalMarkers: HTMLDivElement) {
        new Setting(additionalMarkers)
            .setName(t("Additional map markers"))
            .setDesc(
                t(
                    "These markers will be available in the right-click menu on the map."
                )
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip(t("Add Additional"))
                    .onClick(async () => {
                        const newMarker =
                            await this.plugin.createNewMarkerType();
                        if (!newMarker) return;
                        this.data.markerIcons.push(newMarker);
                        await this.plugin.saveMarkerTypes();

                        this.display();
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
        this.plugin.markerIcons.slice(1).forEach((marker) => {
            let setting = new Setting(markers)
                .addExtraButton((b) =>
                    b.onClick(async () => {
                        const edit = await this.plugin.createNewMarkerType({
                            original: marker.markerIcon
                        });
                        if (!edit || !edit.type || !edit.iconName) {
                            return;
                        }

                        if (edit.type != marker.type) {
                            this.data.mapMarkers.forEach(({ markers }) => {
                                markers = markers.map((m) => {
                                    if (m.type == marker.type) {
                                        m.type = edit.type;
                                    }
                                    return m;
                                });
                            });
                        }

                        await this.plugin.saveMarkerTypes();
                        this.display();
                    })
                )
                .addExtraButton((b) =>
                    b.setIcon("trash").onClick(async () => {
                        this.data.markerIcons = this.data.markerIcons.filter(
                            (m) => m !== marker.markerIcon
                        );
                        await this.plugin.saveMarkerTypes();
                        this.display();
                    })
                );

            let markerIconDiv = createDiv({
                cls: "marker-icon-display"
            });
            markerIconDiv.innerHTML = marker.html;
            let name = setting.nameEl.createDiv("marker-type-display");
            name.appendChild(markerIconDiv);
            name.appendText(marker.type);
            if (marker.markerIcon.tags && marker.markerIcon.tags.length) {
                setting.setDesc(marker.markerIcon.tags.join(", "));
            }
        });
    }
}
