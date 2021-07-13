import { LAT_LONG_DECIMALS } from "../utils/constants";
import { icon } from "../utils/icons";
import { getId, log } from "../utils";

import { CommandSuggestionModal, PathSuggestionModal } from "../modals";

import { Events, Modal, Notice, Setting, TextComponent } from "obsidian";
import { IconName } from "@fortawesome/free-solid-svg-icons";

import { LeafletMap, ObsidianLeaflet } from "../@types";
import { Marker } from "./map";
import { LeafletSymbol } from "src/utils/leaflet-import";

const L = window[LeafletSymbol];

export class DistanceDisplay extends L.Control {
    controlEl: HTMLElement;
    textEl: HTMLSpanElement;
    line: L.Polyline;
    popups: [L.Popup, L.Popup];
    constructor(
        opts: L.ControlOptions,
        line: L.Polyline,
        public map: LeafletMap
    ) {
        super(opts);
        this.line = line;
        this.popups = [
            L.popup({
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            }),
            L.popup({
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            })
        ];
    }
    initEvents() {
        this.controlEl.onmouseenter = this.onMouseEnter.bind(this);
        this.controlEl.onclick = this.onClick.bind(this);
        this.controlEl.onmouseleave = this.onMouseLeave.bind(this);
    }
    onMouseEnter() {
        if (this.line) {
            const latlngs = this.line.getLatLngs() as L.LatLng[];

            this.popups[0].setLatLng(latlngs[0]);
            this.popups[0].setContent(
                `[${latlngs[0].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[0].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.map.openPopup(this.popups[0]);

            this.popups[1].setLatLng(latlngs[1]);
            this.popups[1].setContent(
                `[${latlngs[1].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[1].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.map.openPopup(this.popups[1]);

            this.line.setStyle({ color: "blue", dashArray: "4 1" });
            this.line.addTo(this.map.map);
        }
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        if (this.line) {
            this.map.map.fitBounds(
                L.latLngBounds(
                    this.line.getLatLngs()[0] as L.LatLng,
                    this.line.getLatLngs()[1] as L.LatLng
                ),
                {
                    duration: 0.5,
                    easeLinearity: 0.1,
                    animate: true,
                    padding: [5, 5]
                }
            );
        }
    }
    onMouseLeave() {
        if (this.line) {
            this.line.remove();
        }
        this.map.map.closePopup(this.popups[0]);
        this.map.map.closePopup(this.popups[1]);
    }
    onAdd() {
        /* this.map = map; */
        this.controlEl = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-distance-control hidden"
        );
        this.textEl = this.controlEl.createSpan();
        this.textEl.setText(`0 ${this.map.unit}`);

        this.initEvents();

        return this.controlEl;
    }
    setText(text: string) {
        this.textEl.setText(text);
        return this;
    }
}
export const distanceDisplay = function (
    opts: L.ControlOptions,
    line: L.Polyline,
    map: LeafletMap
) {
    return new DistanceDisplay(opts, line, map);
};

interface FontAwesomeControlOptions extends L.ControlOptions {
    icon: IconName;
    cls: string;
    tooltip: string;
}
abstract class FontAwesomeControl extends L.Control {
    icon: IconName;
    controlEl: HTMLElement;
    cls: string;
    tooltip: string;
    leafletInstance: L.Map;
    link: HTMLElement;
    enabled: boolean = true;
    constructor(opts: FontAwesomeControlOptions, leafletMap: L.Map) {
        super(opts);
        this.leafletInstance = leafletMap;
        this.icon = opts.icon;
        this.cls = opts.cls;
        this.tooltip = opts.tooltip;
    }
    onAdd(leafletMap: L.Map) {
        this.leafletInstance = leafletMap;
        this.controlEl = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-control " + this.cls
        );
        this.link = this.controlEl.createEl("a", {
            cls: this.cls + "-icon",
            href: "#",
            title: this.tooltip
        });
        this.link.appendChild(
            icon({ prefix: "fas", iconName: this.icon }).node[0]
        );
        this.controlEl.children[0].setAttrs({
            "aria-label": this.tooltip
        });
        L.DomEvent.on(this.controlEl, "click", this.onClick.bind(this));

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.added();

        return this.controlEl;
    }
    abstract onClick(evt: MouseEvent): void;
    added() {}
    disable() {
        if (!this.enabled) return;
        this.controlEl.addClass("disabled");
        this.enabled = false;
    }
    enable() {
        if (this.enabled) return;
        this.controlEl.removeClass("disabled");
        this.enabled = true;
    }
}

class EditMarkerControl extends FontAwesomeControl {
    map: LeafletMap;
    controlEl: HTMLElement;
    plugin: ObsidianLeaflet;
    simple: SimpleLeafletMap;
    isOpen: boolean = false;
    constructor(
        opts: FontAwesomeControlOptions,
        map: LeafletMap,
        plugin: ObsidianLeaflet
    ) {
        super(opts, map.map);
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
        modal.titleEl.setText("Bulk Edit Markers");

        const mapEl = modal.contentEl.createDiv({
            cls: "bulk-edit-map",
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
            button.setButtonText("Delete All").onClick(() => {
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
                `${this.simple.markers.length} marker${
                    this.simple.markers.length != 1 ? "s" : ""
                }`
            )
            .addButton((b) => {
                b.setIcon("plus-with-circle")
                    .setTooltip("Add New")
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
                    this.plugin.AppData.markerIcons.forEach((marker) => {
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
                .addText((t) => {
                    lat = t;
                    t.setValue(`${marker.loc.lat}`);
                    t.inputEl.onblur = (v) => {
                        try {
                            let lat = Number(t.getValue());
                            marker.setLatLng(L.latLng(lat, marker.loc.lng));
                        } catch (e) {
                            t.setValue(`${marker.loc.lat}`);
                            new Notice(
                                "There was an issue with the provided longitude."
                            );
                        }
                    };
                })
                .addText((t) => {
                    long = t;
                    t.setValue(`${marker.loc.lng}`);
                    t.inputEl.onblur = (v) => {
                        try {
                            let lng = Number(t.getValue());
                            marker.setLatLng(L.latLng(marker.loc.lat, lng));
                        } catch (e) {
                            t.setValue(`${marker.loc.lng}`);
                            new Notice(
                                "There was an issue with the provided longitude."
                            );
                        }
                    };
                })
                .addText((t) => {
                    t.setPlaceholder("Path");
                    let modal;
                    if (marker.command) {
                        const commands =
                            this.plugin.app.commands.listCommands();
                        t.setValue(
                            this.plugin.app.commands.findCommand(marker.link)
                                ?.name ?? "Command not found!"
                        );
                        modal = new CommandSuggestionModal(this.plugin.app, t, [
                            ...commands
                        ]);
                    } else {
                        t.setValue(marker.link);
                        const files = this.plugin.app.vault.getFiles();
                        modal = new PathSuggestionModal(this.plugin.app, t, [
                            ...files
                        ]);
                    }
                    modal.onClose = () => {
                        marker.link = t.getValue();
                    };
                    t.inputEl.onblur = () => {
                        marker.link = t.getValue();
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
    map: LeafletMap,
    plugin: ObsidianLeaflet
) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "map-marker",
        cls: "leaflet-control-edit-markers",
        tooltip: "Bulk Edit Markers"
    };
    return new EditMarkerControl(options, map, plugin);
}

class SimpleLeafletMap extends Events {
    markers: Marker[] = [];
    layer: L.TileLayer | L.ImageOverlay;
    original: LeafletMap;
    containerEl: HTMLElement;
    map: L.Map;
    constructor(map: LeafletMap, el: HTMLElement) {
        super();
        this.original = map;
        this.containerEl = el;
    }

    async render(): Promise<void> {
        return new Promise(async (resolve) => {
            const layerData = this.original.mapLayers.map(
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

            this.addMarkers();

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

class ZoomControl extends FontAwesomeControl {
    controlEl: any;
    map: LeafletMap;
    constructor(opts: FontAwesomeControlOptions, map: LeafletMap) {
        super(opts, map.map);
        this.map = map;

        this.map.on("markers-updated", () => {
            if (this.map.markers.length) {
                this.enable();
            } else {
                this.disable();
            }
        });
    }
    onClick(evt: MouseEvent) {
        if (!this.enabled) {
            return;
        }
        const group = L.featureGroup(
            this.map.displayedMarkers.map(
                ({ leafletInstance }) => leafletInstance
            )
        );
        if (!group || !group.getLayers().length) {
            this.leafletInstance.fitWorld();
            return;
        }
        log(
            this.map.verbose,
            this.map.id,
            `Moving to display ${group.getLayers().length} markers.`
        );
        this.leafletInstance.fitBounds(
            group.getBounds(),
            {
                maxZoom: this.leafletInstance.getBoundsZoom(group.getBounds())
            } /* {
            duration: 0.5,
            easeLinearity: 0.1,
            animate: true,
            padding: [50, 50]
        } */
        );
    }
}

export function zoomControl(opts: L.ControlOptions, map: LeafletMap) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "map-marked-alt",
        cls: "leaflet-control-zoom-markers",
        tooltip: "Show All Markers"
    };
    return new ZoomControl(options, map);
}

class ResetZoomControl extends FontAwesomeControl {
    map: LeafletMap;
    constructor(opts: FontAwesomeControlOptions, map: LeafletMap) {
        super(opts, map.map);
        this.map = map;
    }
    onClick(evt: MouseEvent) {
        log(
            this.map.verbose,
            this.map.id,
            `Resetting map view to [${this.map.initialCoords[0]}, ${this.map.initialCoords[1]}].`
        );
        this.leafletInstance.setView(
            this.map.initialCoords,
            this.map.zoom.default
        );
    }
}

export function resetZoomControl(opts: L.ControlOptions, map: LeafletMap) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "bullseye",
        cls: "leaflet-control-reset-zoom",
        tooltip: "Reset View"
    };
    return new ResetZoomControl(options, map);
}

class FilterMarkers extends FontAwesomeControl {
    map: LeafletMap;
    section: HTMLElement;
    inputs: HTMLInputElement[];
    constructor(opts: FontAwesomeControlOptions, map: LeafletMap) {
        super(opts, map.map);
        this.map = map;
        this.map.on("markers-updated", () => {
            if (this.map.markers.length || this.map.overlays.length) {
                this.enable();
            } else {
                this.disable();
            }
        });
    }
    onClick(evt: MouseEvent) {
        this.expand();
    }
    added() {
        //add hidden filter objects

        this.section = L.DomUtil.create(
            "section",
            this.cls + "-list",
            this.controlEl
        );

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.link.dataset["draggable"] = "false";

        L.DomEvent.on(
            this.controlEl,
            {
                mouseleave: this.collapse
            },
            this
        );
    }
    private expand() {
        if (!this.enabled) {
            return;
        }
        this.update();

        L.DomUtil.addClass(this.controlEl, "expanded");
        this.section.style.height = null;
        var acceptableHeight =
            this.leafletInstance.getSize().y - (this.controlEl.offsetTop + 50);

        if (acceptableHeight < this.section.clientHeight) {
            L.DomUtil.addClass(
                this.section,
                "leaflet-control-layers-scrollbar"
            );
            this.section.style.height = acceptableHeight + "px";
        } else {
            L.DomUtil.removeClass(
                this.section,
                "leaflet-control-layers-scrollbar"
            );
        }

        return this;
    }

    private collapse() {
        L.DomUtil.removeClass(this.controlEl, "expanded");
        return this;
    }
    private update() {
        this.section.empty();

        const buttons = this.section.createDiv(
            "leaflet-control-filter-button-group"
        );
        buttons.createEl("button", { text: "All" }).onclick = () => {
            this.map.markerIcons.forEach(({ type }) => {
                if (!this.map.displaying.get(type))
                    this.map.group.markers[type].addTo(this.leafletInstance);
                this.map.displaying.set(type, true);
            });
            this.update();
        };
        buttons.createEl("button", { text: "None" }).onclick = () => {
            this.map.markerIcons.forEach(({ type }) => {
                if (this.map.displaying.get(type))
                    this.map.group.markers[type].remove();
                this.map.displaying.set(type, false);
            });
            this.update();
        };

        const ul = this.section.createEl("ul", "contains-task-list");

        for (let [type, markerIcon] of this.map.markerIcons.entries()) {
            if (
                this.map.group.markers[type] &&
                this.map.group.markers[type].getLayers().length
            ) {
                const li = ul.createEl("li", "task-list-item");

                const id = getId();
                const input = li.createEl("input", {
                    attr: {
                        id: "leaflet-control-filter-item-label-" + id,
                        ...(this.map.displaying.get(type) && {
                            checked: true
                        })
                    },
                    type: "checkbox",
                    cls: "task-list-item-checkbox"
                });

                const label = li.createEl("label", {
                    attr: { for: "leaflet-control-filter-item-label-" + id }
                });
                label.createDiv({
                    cls: "leaflet-control-filter-icon"
                }).innerHTML = markerIcon.html;

                label.createDiv({
                    text: type[0].toUpperCase() + type.slice(1).toLowerCase()
                });

                L.DomEvent.on(
                    input,
                    "click",
                    this._onInputClick.bind(this, type)
                );
            }
        }
    }
    private _onInputClick(
        type: string,
        { target }: { target: HTMLInputElement }
    ) {
        if (!target.checked) {
            log(this.map.verbose, this.map.id, `Filtering out ${type}.`);
            //remove
            this.map.displaying.set(type, false);
            this.map.group.markers[type].remove();
            this.map.overlays
                .filter((overlay) => overlay.marker && overlay.marker === type)
                .forEach((overlay) => {
                    overlay.leafletInstance.remove();
                });
        } else {
            log(this.map.verbose, this.map.id, `Filtering in ${type}.`);
            this.map.displaying.set(type, true);
            this.map.group.markers[type].addTo(this.map.group.group);
            this.map.overlays
                .filter((overlay) => overlay.marker && overlay.marker === type)
                .forEach((overlay) => {
                    overlay.leafletInstance.addTo(this.map.group.group);
                });
            this.map.sortOverlays();
        }

        this.update();
    }
}

export function filterMarkerControl(opts: L.ControlOptions, map: LeafletMap) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "filter",
        cls: "leaflet-control-filter",
        tooltip: "Filter Markers"
    };
    return new FilterMarkers(options, map);
}
