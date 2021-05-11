import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import convert, { allUnits, UnitFamilies } from "convert";
import "leaflet-fullscreen";

/** Recreate Length Alias Types from "convert" */
declare type UnitsCombined = typeof allUnits;
declare type UnitKeys = Exclude<keyof UnitsCombined, "__proto__">;
declare type AllValues = {
    [P in UnitKeys]: {
        key: P;
        value: UnitsCombined[P][0];
    };
}[UnitKeys];
declare type IdToFamily = {
    [P in AllValues["value"]]: Extract<
        AllValues,
        {
            value: P;
        }
    >["key"];
};
declare type GetAliases<X extends UnitFamilies> = IdToFamily[X];
declare type Length = GetAliases<UnitFamilies.Length>;

import { Events, Notice, moment } from "obsidian";

import {
    ILayerGroup,
    ILeafletMapOptions,
    ILeafletMarker,
    IMarkerData,
    IMarkerIcon,
    IObsidianAppData
} from "./@types";
import { getId, getImageDimensions, icon } from "./utils";
import ObsidianLeaflet from "./main";

interface MarkerDivIconOptions extends L.DivIconOptions {
    data?: { [key: string]: string };
}

export class MarkerDivIcon extends L.DivIcon {
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

interface DivIconMarkerOptions extends L.MarkerOptions {
    icon: MarkerDivIcon;
}
export class DivIconMarker extends L.Marker {
    options: DivIconMarkerOptions;
    constructor(
        latlng: L.LatLng,
        options: L.MarkerOptions,
        data: { [key: string]: string }
    ) {
        super(latlng, options);
        this.options.icon.options.data = data;
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
}

const divIconMarker = function (
    latlng: L.LatLng,
    options: DivIconMarkerOptions,
    data: { [key: string]: string }
) {
    return new DivIconMarker(latlng, options, data);
};

const DEFAULT_MAP_OPTIONS: ILeafletMapOptions = {
    minZoom: 1,
    maxZoom: 10,
    defaultZoom: 1,
    zoomDelta: 1,
    unit: "m",
    scale: 1,
    distanceMultiplier: 1,
    simple: false
};

/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
export default class LeafletMap extends Events {
    parentEl: HTMLElement;
    id: string;
    contentEl: HTMLElement;
    map: L.Map;
    markers: Array<Marker> = [];
    zoom: { min: number; max: number; default: number; delta: number };
    popup: L.Popup = L.popup({
        className: "leaflet-marker-link-popup",
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        autoPan: false
    });
    mapLayers: ILayerGroup[];
    layer: L.ImageOverlay | L.TileLayer;
    resize: ResizeObserver;
    type: "image" | "real";
    unit: string = "m";
    distanceMultipler: number = 1;
    distanceEvent: L.LatLng | undefined = undefined;
    data: IObsidianAppData;
    plugin: ObsidianLeaflet;
    distanceLine: L.Polyline;
    options: ILeafletMapOptions;
    private _rendered: boolean;
    private _timeoutHandler: ReturnType<typeof setTimeout>;
    private _popupTarget: ILeafletMarker | L.LatLng;
    private _scale: number;
    private _hoveringOnMarker: boolean = false;
    constructor(
        plugin: ObsidianLeaflet,
        el: HTMLElement,
        options: ILeafletMapOptions = {}
    ) {
        super();

        this.plugin = plugin;
        this.data = plugin.AppData;

        this.parentEl = el;
        this.contentEl = this.parentEl.createDiv();

        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);

        this.id = this.options.id;

        this.zoom = {
            min: this.options.minZoom,
            max: this.options.maxZoom,
            default: this.options.defaultZoom,
            delta: this.options.zoomDelta
        };
        this.unit = this.options.unit;
        this._scale = this.options.scale;
        this.distanceMultipler = this.options.distanceMultiplier;
    }

    loadData(data: any): Promise<void> {
        return new Promise((resolve) => {
            data?.markers.forEach((marker: IMarkerData) => {
                if (!marker.layer && this.group) {
                    marker.layer = this.group.id;
                }
                this.createMarker(
                    this.markerIcons.find((icon) => icon.type == marker.type),
                    L.latLng(marker.loc),
                    marker.link,
                    marker.id,
                    marker.layer,
                    true,
                    marker.command,
                    marker.zoom ?? this.zoom.max
                );
            });
            resolve();
        });
    }

    get markerIcons() {
        return this.plugin.markerIcons;
    }

    get scale() {
        if (this.type !== "real") return this._scale;

        return convert(1)
            .from("m")
            .to(this.unit as Length);
    }

    private get _locale() {
        return moment.locale();
    }

    get coordMult() {
        let mult = [1, 1];
        if (this.type == "image") {
            mult = [
                this.bounds.getSouthEast().lat / 100,
                this.bounds.getSouthEast().lng / 100
            ];
        }
        return mult;
    }

    async render(
        type: "real" | "image",
        options?: {
            coords?: [number, number];
            layers?: { data: string; id: string }[];
        }
    ) {
        this.type = type;
        this.map = this.getMapForType(type);
        this.layer = await this.buildLayersForType(type, options.layers);

        switch (this.type) {
            case "real": {
                this.renderReal();
                break;
            }
            case "image": {
                this.renderImage();
                break;
            }
        }
        if (options.coords) {
            this.map.panTo([
                options.coords[0] * this.coordMult[0],
                options.coords[1] * this.coordMult[1]
            ]);
        }
        this.markers.forEach((marker) => {
            /* if (type === "image" && marker.zoom != this.map.getMaxZoom()) {
                marker.loc = this.map.unproject(
                    this.map.project(marker.loc, marker.zoom - 1),
                    this.map.getMaxZoom() - 1
                );
            } */

            if (marker.layer) {
                this.mapLayers
                    .find(({ id }) => id == marker.layer)
                    ?.group.addLayer(marker.leafletInstance);
            } else {
                this.mapLayers[0].group.addLayer(marker.leafletInstance);
            }
        });
        this.handleResize();

        //build control icons
        //set full screen icon
        const fsButton = this.contentEl.querySelector(
            ".leaflet-control-fullscreen-button"
        );
        if (fsButton) {
            const expand = icon({ iconName: "expand", prefix: "fas" }).node[0];
            const compress = icon({ iconName: "compress", prefix: "fas" })
                .node[0];
            fsButton.appendChild(expand);
            this.map.on("fullscreenchange", () => {
                //@ts-expect-error
                if (this.map.isFullscreen()) {
                    fsButton.replaceChild(compress, fsButton.children[0]);
                } else {
                    fsButton.replaceChild(expand, fsButton.children[0]);
                }
            });
        }

        this.map.on("contextmenu", (evt) =>
            this.trigger("map-contextmenu", evt)
        );
        this.map.on("click", (evt: L.LeafletMouseEvent) => {
            this.onHandleDistance(evt);

            if (
                evt.originalEvent.getModifierState("Shift") ||
                evt.originalEvent.getModifierState("Alt")
            ) {
                this.openPopup(
                    evt.latlng,
                    `[${evt.latlng.lat.toLocaleString("en-US", {
                        maximumFractionDigits: 4
                    })}, ${evt.latlng.lng.toLocaleString("en-US", {
                        maximumFractionDigits: 4
                    })}]`
                );
                if (this.data.copyOnClick) {
                    navigator.clipboard
                        .writeText(
                            `[${evt.latlng.lat.toLocaleString("en-US", {
                                maximumFractionDigits: 4
                            })}, ${evt.latlng.lng.toLocaleString("en-US", {
                                maximumFractionDigits: 4
                            })}]`
                        )
                        .then(() => {
                            new Notice("Map coordinates copied to clipboard.");
                        });
                }
            }
        });
    }

    onHandleDistance(evt: L.LeafletMouseEvent) {
        if (
            !evt.originalEvent.getModifierState("Shift") &&
            !evt.originalEvent.getModifierState("Alt")
        ) {
            this.removeDistanceLine();
            this.distanceEvent = undefined;
            return;
        }

        if (this.distanceEvent != undefined) {
            const dist = this.map.distance(this.distanceEvent, evt.latlng);
            this.distanceLine.unbindTooltip();

            let display = `${(dist * this.scale).toLocaleString(this._locale, {
                maximumFractionDigits: 3
            })}`;
            if (this.distanceMultipler !== 1) {
                display += ` (${(
                    dist *
                    this.scale *
                    this.distanceMultipler
                ).toLocaleString(this._locale, {
                    maximumFractionDigits: 3
                })})`;
            }
            new Notice(`${display} ${this.unit}`);
            this.removeDistanceLine();
            this.distanceEvent = undefined;
        } else {
            this.distanceEvent = evt.latlng;

            this.trigger("add-escape");

            const originalLatLng = evt.latlng;

            this.map.on("mousemove", (evt: L.LeafletMouseEvent) => {
                if (!this.distanceLine) {
                    this.distanceLine = L.polyline([evt.latlng, evt.latlng], {
                        color: "blue"
                    }).addTo(this.map);
                }
                if (!this._hoveringOnMarker) {
                    this.distanceLine.setLatLngs([originalLatLng, evt.latlng]);
                }
                const latlngs = this.distanceLine.getLatLngs() as L.LatLngExpression[];
                const dist = this.map.distance(latlngs[0], latlngs[1]);
                this.distanceLine.unbindTooltip();

                let display = `${(dist * this.scale).toLocaleString(
                    this._locale,
                    {
                        maximumFractionDigits: 3
                    }
                )}`;
                if (this.distanceMultipler !== 1) {
                    display += ` (${(
                        dist *
                        this.scale *
                        this.distanceMultipler
                    ).toLocaleString(this._locale, {
                        maximumFractionDigits: 3
                    })})`;
                }

                this.distanceLine
                    .bindTooltip(display + ` ${this.unit}`)
                    .openTooltip();
                this.distanceLine.redraw();
            });

            this.map.on("mouseout", () => {
                this.removeDistanceLine();
                this.distanceEvent = undefined;
            });
        }
    }
    removeDistanceLine() {
        if (this.distanceLine) {
            this.trigger("remove-escape");
            this.distanceLine.unbindTooltip();
            this.distanceLine.remove();
            this.distanceLine = undefined;
            this.map.off("mousemove");
            this.map.off("mouseout");
        }
    }
    getMapForType(type: string): L.Map {
        let map: L.Map;
        if (type === "image") {
            map = L.map(this.contentEl, {
                crs: L.CRS.Simple,
                maxZoom: this.zoom.max,
                minZoom: this.zoom.min,
                zoomDelta: this.zoom.delta,
                zoomSnap: this.zoom.delta,
                fullscreenControl: true
            });
        } else if (type === "real") {
            map = L.map(this.contentEl, {
                maxZoom: this.zoom.max,
                minZoom: this.zoom.min,
                worldCopyJump: true,
                zoomDelta: this.zoom.delta,
                zoomSnap: this.zoom.delta,

                fullscreenControl: true
            });
        }

        return map;
    }
    async buildLayersForType(
        type: string,
        layers?: { data: string; id: string }[]
    ): Promise<L.TileLayer | L.ImageOverlay> {
        if (type === "real") {
            this.layer = L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
            );
            const group = L.layerGroup([this.layer]);

            this.mapLayers = [
                {
                    group: group,
                    layer: this.layer,
                    id: "real"
                }
            ];
        } else if (type === "image") {
            this.map.on("baselayerchange", ({ layer }) => {
                // need to do this to prevent panning animation for some reason
                this.map.setMaxBounds([undefined, undefined]);
                this.layer = layer.getLayers()[0];
                this.map.panTo(this.bounds.getCenter(), {
                    animate: false
                });
                this.map.setMaxBounds(this.bounds);
            });

            this.mapLayers = await Promise.all(
                layers.map(async (layer) => {
                    let { h, w } = await getImageDimensions(layer.data);

                    let southWest = this.map.unproject(
                        [0, h],
                        this.zoom.max - 1
                    );
                    let northEast = this.map.unproject(
                        [w, 0],
                        this.zoom.max - 1
                    );

                    let mapLayer = L.imageOverlay(
                        layer.data,
                        new L.LatLngBounds(southWest, northEast)
                    );
                    return {
                        group: L.layerGroup([mapLayer]),
                        layer: mapLayer,
                        id: layer.id
                    };
                })
            );

            this.layer = this.mapLayers[0].layer;
        }

        this.layer.on("load", () => {
            this.rendered = true;
        });

        return this.layer;
    }
    renderImage() {
        this.map.addLayer(this.mapLayers[0].group);
        this.map.fitBounds(this.bounds);
        this.map.panTo(this.bounds.getCenter(), {
            animate: false
        });
        this.map.setMaxBounds(this.bounds);
        this.map.setZoom(this.zoom.default, { animate: false });

        if (this.mapLayers.length > 1) {
            const layerControls = Object.fromEntries(
                this.mapLayers.reverse().map((l, i) => [`Layer ${i}`, l.group])
            );
            let control = L.control.layers(layerControls, {}).addTo(this.map);
            const layerIcon = icon({ iconName: "layer-group", prefix: "fas" })
                .node[0];
            layerIcon.setAttr(
                `style`,
                "color: var(--text-normal);width: 26px;height: 26px;margin: auto;"
            );
            control.getContainer().children[0].appendChild(layerIcon);
        }
    }
    async renderReal() {
        this.mapLayers[0].group.addTo(this.map);

        this.map.setZoom(this.zoom.default, { animate: false });

        const editMarkers = L.Control.extend({
            onAdd: (map: L.Map) => {
                const controlEl = L.DomUtil.create(
                    "div",
                    "leaflet-bar leaflet-control"
                );
                const innerControlEl = controlEl.createEl("a", {
                    cls: "leaflet-control-edit-markers"
                });
                innerControlEl.appendChild(
                    icon({ prefix: "fas", iconName: "map-marker" }).node[0]
                );

                L.DomEvent.on(controlEl, "click", () => {
                    this.trigger("bulk-edit-markers");
                });

                return controlEl;
            }
        });

        new editMarkers({ position: "topleft" }).addTo(this.map);

        this.handleResize();
    }
    handleResize() {
        this.resize = new ResizeObserver(() => {
            if (this.rendered) {
                this.map.invalidateSize();
            }
        });
        this.resize.observe(this.contentEl);
    }
    get group() {
        return this.mapLayers?.find((group) => group.layer == this.layer);
    }
    get bounds() {
        if (this.layer instanceof L.ImageOverlay) {
            return this.layer.getBounds();
        }
        return;
    }
    get rendered() {
        return this._rendered;
    }
    set rendered(v: boolean) {
        this._rendered = v;
        if (v) this.trigger("map-rendered", v);
    }

    addMarker(markerToBeAdded: ILeafletMarker) {
        const mapIcon = this.markerIcons.find(
            ({ type }) => type == markerToBeAdded.type
        ).icon;

        const marker = new Marker({
            id: markerToBeAdded.id,
            type: markerToBeAdded.type,
            loc: markerToBeAdded.loc,
            link: markerToBeAdded.link,
            icon: mapIcon,
            layer: markerToBeAdded.layer
                ? markerToBeAdded.layer
                : this.group?.id,
            mutable: markerToBeAdded.mutable,
            command: markerToBeAdded.command || false,
            zoom: this.map.getMaxZoom()
        });

        this.bindMarkerEvents(marker);

        if (this.rendered) {
            this.group.group.addLayer(marker.leafletInstance);
            marker.leafletInstance.closeTooltip();
        }

        this.markers.push(marker);
    }
    createMarker(
        markerIcon: IMarkerIcon,
        loc: L.LatLng,
        link: string | undefined = undefined,
        id: string = getId(),
        layer: string | undefined = undefined,
        mutable: boolean = true,
        command: boolean = false,
        zoom: number = this.zoom.max
    ): ILeafletMarker {
        const mapIcon = this.markerIcons.find(
            ({ type }) => type == markerIcon?.type || "default"
        ).icon;

        const marker = new Marker({
            id: id,
            type: markerIcon?.type || "default",
            loc: loc,
            link: link,
            icon: mapIcon,
            layer: layer ? layer : this.group?.id,
            mutable: mutable,
            command: command,
            zoom: zoom ?? this.zoom.max
        });

        this.bindMarkerEvents(marker, mutable);

        if (this.rendered) {
            //marker.leafletInstance.addTo(this.map);
            this.group.group.addLayer(marker.leafletInstance);

            marker.leafletInstance.closeTooltip();
        }

        this.markers.push(marker);
        if (mutable) {
            this.trigger("marker-added", marker);
        }
        return marker;
    }

    bindMarkerEvents(marker: ILeafletMarker, mutable: boolean = true) {
        marker.leafletInstance
            .on("contextmenu", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                if (mutable) this.trigger("marker-context", marker);
                else {
                    new Notice(
                        "This marker cannot be edited because it was defined in the code block."
                    );
                }
            })
            .on("click", async (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                if (
                    evt.originalEvent.getModifierState("Alt") ||
                    evt.originalEvent.getModifierState("Shift")
                ) {
                    this.onHandleDistance(evt);
                    this.openPopup(
                        marker,
                        `[${marker.loc.lat.toLocaleString("en-US", {
                            maximumFractionDigits: 4
                        })}, ${marker.loc.lng.toLocaleString("en-US", {
                            maximumFractionDigits: 4
                        })}]`
                    );

                    if (this.data.copyOnClick) {
                        navigator.clipboard
                            .writeText(
                                `[${marker.loc.lat.toLocaleString("en-US", {
                                    maximumFractionDigits: 4
                                })}, ${marker.loc.lng.toLocaleString("en-US", {
                                    maximumFractionDigits: 4
                                })}]`
                            )
                            .then(() => {
                                new Notice(
                                    "Marker coordinates copied to clipboard."
                                );
                            });
                    }

                    return;
                }

                marker.leafletInstance.closeTooltip();

                if (marker.link) {
                    this.trigger(
                        "marker-click",
                        marker.link,
                        evt.originalEvent.ctrlKey,
                        marker.command
                    );
                } else {
                    if (!mutable) {
                        new Notice(
                            "This marker cannot be edited because it was defined in the code block."
                        );
                    }
                }
            })
            .on("dragstart", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                if (mutable) marker.leafletInstance.closeTooltip();
            })
            .on("drag", () => {
                this.trigger("marker-dragging", marker);
            })
            .on("dragend", (evt: L.LeafletMouseEvent) => {
                const old = marker.loc;
                marker.loc = marker.leafletInstance.getLatLng();
                this.trigger("marker-data-updated", marker, old);
                marker.leafletInstance.closeTooltip();
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                if (marker.link) {
                    this.trigger("marker-mouseover", evt, marker);
                }
                this._hoveringOnMarker = true;
                if (this.distanceLine) {
                    this.distanceLine.setLatLngs([
                        this.distanceLine.getLatLngs()[0] as L.LatLngExpression,
                        marker.loc
                    ]);
                }
            })
            .on("mouseout", (evt: L.LeafletMouseEvent) => {
                marker.leafletInstance.closeTooltip();
                this._hoveringOnMarker = false;
            });
    }
    openPopup(
        target: ILeafletMarker | L.LatLng,
        content: ((source: L.Layer) => L.Content) | L.Content
    ) {
        if (this._timeoutHandler) {
            clearTimeout(this._timeoutHandler);
        }
        if (this.popup.isOpen() && this._popupTarget == target) {
            this.popup.setContent(content);
            return;
        }

        this._popupTarget = target;

        if (this.popup && this.popup.isOpen()) {
            this.map.closePopup(this.popup);
        }

        this.popup = this.getPopup(target).setContent(content);
        this.map.openPopup(this.popup);

        const popupElement = this.popup.getElement();

        let _this = this;
        const mouseOutHandler = function () {
            _this._timeoutHandler = setTimeout(function () {
                if (!(target instanceof L.LatLng)) {
                    target.leafletInstance.off("mouseenter", mouseOverHandler);
                    target.leafletInstance.off("mouseout", mouseOutHandler);
                }
                popupElement.removeEventListener(
                    "mouseenter",
                    mouseOverHandler
                );
                popupElement.removeEventListener("mouseleave", mouseOutHandler);

                _this.map.closePopup(_this.popup);
            }, 500);
        };
        const mouseOverHandler = function () {
            clearTimeout(_this._timeoutHandler);
        };
        if (target instanceof L.LatLng) {
            this._timeoutHandler = setTimeout(function () {
                popupElement.removeEventListener(
                    "mouseenter",
                    mouseOverHandler
                );
                popupElement.removeEventListener("mouseleave", mouseOutHandler);

                _this.map.closePopup(_this.popup);
            }, 1000);
        } else {
            target.leafletInstance
                .on("mouseout", mouseOutHandler)
                .on("mouseenter", mouseOverHandler);
        }
        popupElement.addEventListener("mouseenter", mouseOverHandler);
        popupElement.addEventListener("mouseleave", mouseOutHandler);
    }
    getPopup(target: ILeafletMarker | L.LatLng): L.Popup {
        if (this.popup.isOpen() && this._popupTarget == target) {
            return this.popup;
        }

        this._popupTarget = target;

        if (this.popup && this.popup.isOpen()) {
            this.map.closePopup(this.popup);
        }
        if (target instanceof L.LatLng) {
            return L.popup({
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            }).setLatLng(target);
        } else {
            return L.popup({
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false,
                offset: new L.Point(
                    0,
                    (-1 *
                        target.leafletInstance
                            .getElement()
                            .getBoundingClientRect().height) /
                        2
                )
            }).setLatLng(target.loc);
        }
    }

    updateMarkerIcons() {
        this.markers.forEach((marker) => {
            marker.leafletInstance.setIcon(
                this.markerIcons.find((icon) => icon.type == marker.type).icon
            );
        });
    }

    remove(): void {
        this.map?.remove();

        this.resize?.disconnect();

        this.rendered = false;
    }
}
