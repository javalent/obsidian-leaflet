import { Modal, Setting, TextComponent, Notice, Events } from "obsidian";
import { BaseMapType, ObsidianLeaflet } from "src/@types";
import { Marker } from "src/layer";
import { CommandSuggestionModal, PathSuggestionModal } from "src/modals";
import { getId } from "src/utils";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

import { LeafletSymbol } from "src/utils/leaflet-import";
import t from "src/l10n/locale";
const L = window[LeafletSymbol];

class SimpleLeafletMap extends Events {
    markers: Marker[] = [];
    layer: L.TileLayer | L.ImageOverlay;
    original: BaseMapType;
    containerEl: HTMLElement;
    map: L.Map;
    constructor(map: BaseMapType, el: HTMLElement) {
        super();
        this.original = map;
        this.containerEl = el;
    }

    async render(): Promise<void> {
        return new Promise(async (resolve) => {
            //TODO: REWRITE
            /* const layerData = this.original.mapLayers.map(
                ({ data, id, layer }) => {
                    const bounds =
                        layer instanceof L.ImageOverlay
                            ? layer.getBounds()
                            : this.original.bounds;
                    return { data, id, bounds };
                }
            );
            this.layer = await this.getLayerData(layerData);

            this.map = L.map(this.containerEl, {
                crs: this.original.CRS,
                maxZoom: this.original.zoom.max,
                minZoom: this.original.zoom.min,
                zoomDelta: this.original.zoom.delta,
                zoomSnap: this.original.zoom.delta,
                zoom: this.original.zoom.default,
                worldCopyJump: this.original.type === "real",
                layers: [this.layer],
                center: this.original.initialCoords
            });

            if (this.original.type == "image") {
                this.map.fitBounds(this.original.bounds);
                this.map.panTo(this.original.bounds.getCenter(), {
                    animate: false
                });
                this.map.setMaxBounds(this.original.bounds);
                this.map.on("baselayerchange", ({ layer }) => {
                    // need to do this to prevent panning animation for some reason
                    this.map.setMaxBounds([undefined, undefined]);
                    layer = layer.getLayers()[0];
                    this.map.panTo(this.original.bounds.getCenter(), {
                        animate: false
                    });
                    this.map.setMaxBounds(this.original.bounds);
                });
            }

            this.addMarkers(); */

            resolve();
        });
    }
    addMarkers() {
        for (let oldMarker of this.original.markers.filter(
            ({ mutable }) => mutable
        )) {
            this.createMarker(
                oldMarker.type,
                oldMarker.loc,
                oldMarker.link,
                oldMarker.id,
                oldMarker.layer,
                oldMarker.mutable,
                oldMarker.command,
                oldMarker.percent
            );
        }
    }
    createMarker(
        type: string,
        loc: L.LatLng,
        link: string | undefined = undefined,
        id: string,
        layer: string | undefined = undefined,
        mutable: boolean,
        command: boolean,
        percent: [number, number] = undefined
    ) {
        const mapIcon = this.original.markerIcons.get(type).icon;

        const marker = new Marker(this.original, {
            id: id,
            type: type || "default",
            loc: loc,
            link: link,
            icon: mapIcon,
            layer: layer,
            mutable: mutable,
            command: command,
            zoom: this.original.zoom.max,
            percent: percent,
            description: null
        });

        //marker.leafletInstance.addTo(this.map);
        this.map.addLayer(marker.leafletInstance);

        marker.leafletInstance.closeTooltip();

        this.markers.push(marker);
    }
    async getLayerData(
        layerData: { data: string; id: string; bounds: L.LatLngBounds }[]
    ) {
        let layer, mapLayers;
        if (this.original.type === "real") {
            layer = L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
            );
            const group = L.layerGroup([layer]);

            mapLayers = [
                {
                    group: group,
                    layer: layer,
                    id: "real",
                    data: "real"
                }
            ];
        } else {
            mapLayers = await Promise.all(
                layerData.map(async (layer) => {
                    /* let southWest = this.original.map.unproject(
                        [0, h],
                        this.original.zoom.max - 1
                    );
                    let northEast = this.original.map.unproject(
                        [w, 0],
                        this.original.zoom.max - 1
                    ); */

                    let mapLayer = L.imageOverlay(layer.data, layer.bounds);
                    return {
                        group: L.layerGroup([mapLayer]),
                        layer: mapLayer,
                        id: layer.id,
                        data: layer.data
                    };
                })
            );

            layer = mapLayers[0].layer;
        }

        return layer;
    }

    fit(...markers: Marker[]) {
        if (!markers.length) {
            this.map.fitWorld();
            return;
        }
        const group = L.featureGroup(
            markers.map(({ leafletInstance }) => leafletInstance)
        );

        this.map.fitBounds(group.getBounds().pad(0.5), {
            maxZoom: this.original.zoom.default
        });
    }

    remove() {
        this.map.remove();
    }
}
class EditMarkerControl extends FontAwesomeControl {
    map: BaseMapType;
    controlEl: HTMLElement;
    plugin: ObsidianLeaflet;
    simple: SimpleLeafletMap;
    isOpen: boolean = false;
    constructor(
        opts: FontAwesomeControlOptions,
        map: BaseMapType,
        plugin: ObsidianLeaflet
    ) {
        super(opts, map.leafletInstance);
        this.map = map;
        this.plugin = plugin;
    }

    async onClick(evt: MouseEvent) {
        if (!this.enabled) {
            return;
        }
        if (this.isOpen) return;
        const modal = new Modal(this.plugin.app);
        modal.contentEl.empty();
        modal.titleEl.setText(t("Bulk Edit Markers"));

        const mapEl = modal.contentEl.createDiv({
            cls: "bulk-edit-map block-language-leaflet",
            attr: {
                style: "height: 250px;width: auto;margin: auto;margin-bottom: 1rem; "
            }
        });

        this.simple = new SimpleLeafletMap(this.map, mapEl);

        await this.simple.render();

        const markersEl = modal.contentEl.createDiv("bulk-edit-markers");
        let internalMarkersEl = markersEl.createDiv("bulk-edit-markers");
        this.display(internalMarkersEl);

        //

        const save = new Setting(createDiv())
            .addButton((button) => {
                button
                    .setTooltip("Save")
                    .setIcon("checkmark")
                    .onClick(() => {
                        this.onClose(this.simple.markers);
                        modal.close();
                    });
            })
            .addExtraButton((b) => {
                b.setIcon("cross")
                    .setTooltip("Cancel")
                    .onClick(() => {
                        modal.close();
                    });
            });
        const deleteAll = new Setting(createDiv()).addButton((button) => {
            button.setButtonText(t("Delete All")).onClick(() => {
                this.simple.markers.forEach((marker) => marker.remove());
                this.simple.markers = [];
                this.display(internalMarkersEl);
            });
        });
        save.infoEl.appendChild(deleteAll.controlEl.children[0]);
        markersEl.appendChild(save.settingEl);

        modal.open();
        this.isOpen = true;
        modal.onClose = () => {
            this.isOpen = false;
            if (this.simple) {
                this.simple.remove();
            }
            delete this.simple;
        };

        this.simple.map.invalidateSize();

        this.simple.fit(...this.simple.markers);
    }
    onClose(markers: Marker[]) {
        return;
    }
    display(markersEl: HTMLElement) {
        markersEl.empty();
        new Setting(markersEl)
            .setName(
                `${this.simple.markers.length} ${
                    this.simple.markers.length != 1 ? t("markers") : t("marker")
                }`
            )
            .addButton((b) => {
                b.setIcon("plus-with-circle")
                    .setTooltip(t("Add New"))
                    .onClick(() => {
                        this.simple.createMarker(
                            "default",
                            L.latLng(
                                this.map.initialCoords[0],
                                this.map.initialCoords[1]
                            ),
                            "",
                            getId(),
                            this.map.mapLayers[0].id,
                            true,
                            false
                        );
                        this.display(markersEl);
                    });
            });
        const markersHolder = markersEl.createDiv("bulk-edit-markers-holder");
        for (let marker of this.simple.markers) {
            let markerSetting = new Setting(
                markersHolder.createDiv("bulk-edit-marker-instance")
            );

            let lat: TextComponent, long: TextComponent;
            markerSetting
                .addDropdown((d) => {
                    d.addOption("default", "Default");
                    this.plugin.data.markerIcons.forEach((marker) => {
                        d.addOption(
                            marker.type,
                            marker.type[0].toUpperCase() +
                                marker.type.slice(1).toLowerCase()
                        );
                    });
                    d.setValue(marker.type);
                    d.onChange((value) => {
                        marker.type = value;
                        marker.icon = this.map.markerIcons.get(value);
                    });
                })
                .addText((text) => {
                    lat = text;
                    text.setValue(`${marker.loc.lat}`);
                    text.inputEl.onblur = (v) => {
                        try {
                            let lat = Number(text.getValue());
                            marker.setLatLng(L.latLng(lat, marker.loc.lng));
                        } catch (e) {
                            text.setValue(`${marker.loc.lat}`);
                            new Notice(
                                t(
                                    "There was an issue with the provided latitude."
                                )
                            );
                        }
                    };
                })
                .addText((text) => {
                    long = text;
                    text.setValue(`${marker.loc.lng}`);
                    text.inputEl.onblur = (v) => {
                        try {
                            let lng = Number(text.getValue());
                            marker.setLatLng(L.latLng(marker.loc.lat, lng));
                        } catch (e) {
                            text.setValue(`${marker.loc.lng}`);
                            new Notice(
                                t(
                                    "There was an issue with the provided longitude."
                                )
                            );
                        }
                    };
                })
                .addText((text) => {
                    text.setPlaceholder(t("Path"));
                    let modal;
                    if (marker.command) {
                        const commands =
                            this.plugin.app.commands.listCommands();
                        text.setValue(
                            this.plugin.app.commands.findCommand(marker.link)
                                ?.name ?? t("No command found!")
                        );
                        modal = new CommandSuggestionModal(
                            this.plugin.app,
                            text,
                            [...commands]
                        );
                    } else {
                        text.setValue(marker.link);
                        const files = this.plugin.app.vault.getFiles();
                        modal = new PathSuggestionModal(this.plugin.app, text, [
                            ...files
                        ]);
                    }
                    modal.onClose = () => {
                        marker.link = text.getValue();
                    };
                    text.inputEl.onblur = () => {
                        marker.link = text.getValue();
                    };
                })
                .addExtraButton((b) =>
                    b.setIcon("trash").onClick(() => {
                        marker.leafletInstance.remove();
                        this.simple.markers = this.simple.markers.filter(
                            (m) => m != marker
                        );
                        markerSetting.settingEl.detach();
                    })
                );

            markerSetting.infoEl.detach();

            marker.leafletInstance.on("drag", () => {
                lat.setValue(`${marker.leafletInstance.getLatLng().lat}`);
                long.setValue(`${marker.leafletInstance.getLatLng().lng}`);
                marker.loc = marker.leafletInstance.getLatLng();
            });

            marker.leafletInstance.on("mouseover", () => {
                markerSetting.controlEl.addClass("bulk-setting-hover");
                markerSetting.controlEl.scrollIntoView(false);
            });
            marker.leafletInstance.on("mouseout", () => {
                markerSetting.controlEl.removeClass("bulk-setting-hover");
            });
            markerSetting.controlEl.addEventListener("mouseenter", () => {
                marker.leafletInstance
                    .getElement()
                    .addClasses(["bulk-setting-hover", "marker"]);
                this.simple.fit(marker);
            });
            markerSetting.controlEl.addEventListener("mouseleave", () => {
                marker.leafletInstance
                    .getElement()
                    .removeClasses(["bulk-setting-hover", "marker"]);
            });
        }
    }
}

export function editMarkers(
    opts: L.ControlOptions,
    map: BaseMapType,
    plugin: ObsidianLeaflet
) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "map-marker",
        cls: "leaflet-control-edit-markers",
        tooltip: t("Bulk Edit Markers")
    };
    return new EditMarkerControl(options, map, plugin);
}
