import L, { latLng } from "leaflet";
import { DivIcon } from "leaflet";
import { Events, Modal, Notice, Setting, TextComponent } from "obsidian";
import { getImageDimensions, PathSuggestionModal } from ".";
import {
    DivIconMarkerOptions,
    IMarkerIcon,
    MarkerDivIconOptions,
    LeafletMap,
    ObsidianLeaflet
} from "../@types";
import { LAT_LONG_DECIMALS } from "./constants";
import { icon } from "./icons";
import { getId } from "./utils";

export class MarkerDivIcon extends DivIcon {
    options: MarkerDivIconOptions;
    div: HTMLElement;
    constructor(options: MarkerDivIconOptions) {
        super(options);
    }
    createIcon(oldIcon: HTMLElement) {
        const div = super.createIcon(oldIcon);
        for (let item in this.options.data) {
            div.dataset[item] = this.options.data[item];
        }
        this.div = div;
        return div;
    }
    setData(data: { [key: string]: string }) {
        this.options.data = {
            ...this.options.data,
            ...data
        };
        if (this.div) {
            for (let item in data) {
                this.div.dataset[item] = this.options.data[item];
            }
        }
    }
}

export const markerDivIcon = function (options: MarkerDivIconOptions) {
    return new MarkerDivIcon(options);
};

export class DivIconMarker extends L.Marker {
    options: DivIconMarkerOptions;
    constructor(
        latlng: L.LatLng,
        options: L.MarkerOptions,
        data: { [key: string]: string }
    ) {
        super(latlng, options);
        this.options.icon.setData(data);
    }
}

export class Marker {
    private _link: string;
    private _mutable: boolean;
    private _type: string;
    private _loc: [number, number];
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    id: string;
    layer: string;
    command: boolean;
    zoom: number;
    maxZoom: number;
    divIcon: MarkerDivIcon;
    constructor({
        id,
        icon,
        type,
        loc,
        link,
        layer,
        mutable,
        command,
        zoom,
        maxZoom = zoom
    }: {
        id: string;
        icon: MarkerDivIcon;
        type: string;
        loc: L.LatLng;
        link: string;
        layer: string;
        mutable: boolean;
        command: boolean;
        zoom: number;
        maxZoom?: number;
    }) {
        this.leafletInstance = divIconMarker(
            loc,
            {
                icon: icon,
                keyboard: mutable,
                draggable: mutable,
                bubblingMouseEvents: true
            },
            {
                link: link,
                mutable: `${mutable}`,
                type: type
            }
        );

        this.id = id;
        this.type = type;
        this.loc = loc;
        this.link = link;
        this.layer = layer;
        this.mutable = mutable;
        this.command = command;
        this.divIcon = icon;

        this.zoom = zoom;
        this.maxZoom = maxZoom;
    }
    get link() {
        return this._link;
    }
    set link(x: string) {
        this._link = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                link: `${x}`
            });
        }
    }
    get mutable() {
        return this._mutable;
    }
    set mutable(x: boolean) {
        this._mutable = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                mutable: `${x}`
            });
        }
    }

    get type() {
        return this._type;
    }
    set type(x: string) {
        this._type = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                type: `${x}`
            });
        }
    }
    set icon(x: IMarkerIcon) {
        this.type = x.type;
        this.leafletInstance.setIcon(x.icon);
    }
    setLatLng(latlng: L.LatLng) {
        this.loc = latlng;
        this.leafletInstance.setLatLng(latlng);
    }
    remove() {
        this.leafletInstance.remove();
    }
    static from(marker: Marker): Marker {
        return new Marker({
            id: marker.id,
            icon: marker.divIcon,
            type: marker.type,
            loc: marker.loc,
            link: marker.link,
            layer: marker.layer,
            mutable: marker.mutable,
            zoom: marker.zoom,
            maxZoom: marker.maxZoom,
            command: marker.command
        });
    }
}

export const divIconMarker = function (
    latlng: L.LatLng,
    options: DivIconMarkerOptions,
    data: { [key: string]: string }
) {
    return new DivIconMarker(latlng, options, data);
};
export class DistanceDisplay extends L.Control {
    controlEl: HTMLElement;
    textEl: HTMLSpanElement;
    line: L.Polyline;
    map: L.Map;
    popups: [L.Popup, L.Popup];
    constructor(opts: L.ControlOptions, line: L.Polyline) {
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
            this.map.openPopup(this.popups[0]);

            this.popups[1].setLatLng(latlngs[1]);
            this.popups[1].setContent(
                `[${latlngs[1].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[1].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.openPopup(this.popups[1]);

            this.line.setStyle({ color: "blue", dashArray: "4 1" });
            this.line.addTo(this.map);
        }
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        if (this.line) {
            this.map.fitBounds(
                L.latLngBounds(
                    this.line.getLatLngs()[0] as L.LatLng,
                    this.line.getLatLngs()[1] as L.LatLng
                ),
                { duration: 0.5, easeLinearity: 0.1, animate: true }
            );
        }
    }
    onMouseLeave() {
        this.line.remove();
        this.map.closePopup(this.popups[0]);
        this.map.closePopup(this.popups[1]);
    }
    onAdd(map: L.Map) {
        this.map = map;
        this.controlEl = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-distance-control hidden"
        );
        this.textEl = this.controlEl.createSpan();
        this.textEl.setText("0 km");

        this.initEvents();

        return this.controlEl;
    }
    setText(text: string) {
        this.textEl.setText(text);
    }
    setLine(line: L.Polyline) {
        this.line = line;
    }
}

export const distanceDisplay = function (
    opts: L.ControlOptions,
    line: L.Polyline
) {
    return new DistanceDisplay(opts, line);
};

class EditMarkerControl extends L.Control {
    map: LeafletMap;
    controlEl: HTMLElement;
    plugin: ObsidianLeaflet;
    simple: SimpleLeafletMap;
    constructor(
        opts: L.ControlOptions,
        map: LeafletMap,
        plugin: ObsidianLeaflet
    ) {
        super(opts);
        this.map = map;
        this.plugin = plugin;
    }
    onAdd(leafletMap: L.Map) {
        this.controlEl = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        this.controlEl
            .createEl("a", {
                cls: "leaflet-control-edit-markers",
                href: "#"
            })
            .appendChild(
                icon({ prefix: "fas", iconName: "map-marker" }).node[0]
            );

        L.DomEvent.on(this.controlEl, "click", this.onClick.bind(this));

        return this.controlEl;
    }
    async onClick(evt: MouseEvent) {
        let bulkModal = new Modal(this.plugin.app);

        bulkModal.titleEl.setText("Bulk Edit Markers");

        const mapEl = bulkModal.contentEl.createDiv({
            cls: "bulk-edit-map",
            attr: {
                style: "height: 250px;width: auto;margin: auto;margin-bottom: 1rem; "
            }
        });

        this.simple = new SimpleLeafletMap(this.map, mapEl);

        await this.simple.render();

        const markersEl = bulkModal.contentEl.createDiv("bulk-edit-markers");

        const add = new Setting(markersEl)
            .addButton((b) => {
                b.setIcon("plus-with-circle")
                    .setTooltip("Add New")
                    .onClick(() => {
                        this.simple.createMarker(
                            "default",
                            latLng(
                                this.map.initialCoords[0],
                                this.map.initialCoords[1]
                            ),
                            "",
                            getId(),
                            this.map.mapLayers[0].id,
                            true
                        );
                        this.display(markersHolder);
                    });
            })
            .infoEl.detach();

        const markersHolder = markersEl.createDiv("bulk-edit-markers-holder");
        this.display(markersHolder);

        const save = new Setting(createDiv())
            .addButton((button) => {
                let b = button.setTooltip("Save").setIcon("checkmark");
                b.onClick(() => {
                    bulkModal.close();
                    this.onClose(this.simple.markers);
                });
            })
            .addExtraButton((b) => {
                b.setIcon("cross")
                    .setTooltip("Cancel")
                    .onClick(() => {
                        bulkModal.close();
                    });
            });

        markersEl.appendChild(save.controlEl);

        bulkModal.open();

        bulkModal.onClose = () => {
            this.simple.remove();
        };

        this.simple.map.invalidateSize();

        this.simple.fit(...this.simple.markers);
    }
    onClose(markers: Marker[]) {
        return;
    }
    display(markersEl: HTMLElement) {
        markersEl.empty();
        for (let marker of this.simple.markers) {
            let markerSetting = new Setting(
                markersEl.createDiv("bulk-edit-marker-instance")
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
                        marker.icon = this.map.markerIcons.find(
                            ({ type }) => type === value
                        );
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
                    let files = this.plugin.app.vault.getFiles();

                    t.setPlaceholder("Path").setValue(marker.link);
                    const modal = new PathSuggestionModal(this.plugin.app, t, [
                        ...files
                    ]);
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
    return new EditMarkerControl(opts, map, plugin);
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
            const layerData = this.original.mapLayers.map(({ data, id }) => {
                return { data, id };
            });
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
                oldMarker.mutable
            );
        }
    }
    createMarker(
        type: string,
        loc: L.LatLng,
        link: string | undefined = undefined,
        id: string,
        layer: string | undefined = undefined,
        mutable: boolean
    ) {
        const mapIcon = this.original.markerIcons.find(
            ({ type: t }) => t == type
        ).icon;

        const marker = new Marker({
            id: id,
            type: type || "default",
            loc: loc,
            link: link,
            icon: mapIcon,
            layer: layer,
            mutable: mutable,
            command: false,
            zoom: this.original.zoom.max
        });

        //marker.leafletInstance.addTo(this.map);
        this.map.addLayer(marker.leafletInstance);

        marker.leafletInstance.closeTooltip();

        this.markers.push(marker);
    }
    async getLayerData(layerData: { data: string; id: string }[]) {
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
                    let { h, w } = await getImageDimensions(layer.data);

                    let southWest = this.original.map.unproject(
                        [0, h],
                        this.original.zoom.max - 1
                    );
                    let northEast = this.original.map.unproject(
                        [w, 0],
                        this.original.zoom.max - 1
                    );

                    let mapLayer = L.imageOverlay(
                        layer.data,
                        new L.LatLngBounds(southWest, northEast)
                    );
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
