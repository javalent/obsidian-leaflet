import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Events, Notice } from "obsidian";

// @ts-expect-error
import layerIcon from "../node_modules/leaflet/dist/images/layers.png";
import {
    ILayerGroup,
    ILeafletMarker,
    ILeafletMarkerIcon,
    IMarkerData,
    IMarkerIcon
} from "./@types";
import { getId, getImageDimensions } from "./utils";

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

const markerDivIcon = function (options: MarkerDivIconOptions) {
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

export class Marker /*  implements DivMarker */ {
    private _link: string;
    private _mutable: boolean;
    private _type: string;
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    id: string;
    layer: string;
    command: boolean;
    constructor({
        id,
        icon,
        type,
        loc,
        link,
        layer,
        mutable,
        command
    }: {
        id: string;
        icon: MarkerDivIcon;
        type: string;
        loc: L.LatLng;
        link: string;
        layer: string;
        mutable: boolean;
        command: boolean;
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
    set icon(x: ILeafletMarkerIcon) {
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
    markerIcons: ILeafletMarkerIcon[] = [];
    /* rendered: boolean = false; */
    zoom: { min: number; max: number; default: number; delta: number };
    tooltip: L.Tooltip = L.tooltip({
        className: "leaflet-marker-link-tooltip",
        direction: "top"
    });
    mapLayers: ILayerGroup[];
    layer: L.ImageOverlay | L.TileLayer;
    resize: ResizeObserver;
    type: string;
    scale: number;
    unit: string;
    private _rendered: boolean;
    constructor(
        el: HTMLElement,
        markerIcons: IMarkerIcon[],
        minZoom: number = 1,
        maxZoom: number = 10,
        defaultZoom: number = 1,
        zoomDelta: number = 1,
        unit: string,
        scale: number,
        id: string
    ) {
        super();

        this.id = id;

        this.parentEl = el;
        this.contentEl = this.parentEl.createDiv();

        this.zoom = {
            min: minZoom,
            max: maxZoom,
            default: defaultZoom,
            delta: zoomDelta
        };
        this.unit = unit;
        this.scale = scale;

        this.setMarkerIcons(markerIcons);
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
                    marker.command
                );
            });
            resolve();
        });
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
        options: {
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
            if (marker.layer) {
                this.mapLayers
                    .find(({ id }) => id == marker.layer)
                    ?.group.addLayer(marker.leafletInstance);
            } else {
                this.mapLayers[0].group.addLayer(marker.leafletInstance);
            }
        });

        this.map.on("contextmenu", (evt) =>
            this.trigger("map-contextmenu", evt)
        );

        let click: L.LatLng | undefined = undefined;
        this.map.on("click", (evt: L.LeafletMouseEvent) => {
            if (!evt.originalEvent.ctrlKey) {
                click = undefined;
                return;
            }

            if (click != undefined) {
                this.trigger(
                    "display-distance",
                    `${(
                        this.map.distance(click, evt.latlng) * this.scale
                    ).toLocaleString(navigator.language, {
                        maximumFractionDigits: 1
                    })} ${this.unit}`
                );
                click = undefined;
            } else {
                click = evt.latlng;
            }
        });

        this.handleResize();
    }

    getMapForType(type: string): L.Map {
        if (type === "image") {
            return L.map(this.contentEl, {
                crs: L.CRS.Simple,
                maxZoom: this.zoom.max,
                minZoom: this.zoom.min,
                zoomDelta: this.zoom.delta,
                zoomSnap: this.zoom.delta
            });
        } else if (type === "real") {
            return L.map(this.contentEl, {
                maxZoom: this.zoom.max,
                minZoom: this.zoom.min,
                worldCopyJump: true,
                zoomDelta: this.zoom.delta,
                zoomSnap: this.zoom.delta
            });
        }
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
            let control = L.control.layers(layerControls).addTo(this.map);

            // hack to get icon from layers.png
            // @ts-expect-error
            control._container.children[0].appendChild(
                createEl("img", {
                    attr: {
                        src: layerIcon,
                        style: "width: 26px; height: 26px; margin: auto;"
                    }
                })
            );
        }
    }
    async renderReal() {
        this.mapLayers[0].group.addTo(this.map);

        this.map.setZoom(this.zoom.default, { animate: false });

        const _this = this;
        const editMarkers = L.Control.extend({
            onAdd: function (map: L.Map) {
                const button = L.DomUtil.create(
                    "button",
                    "leaflet-bar leaflet-control leaflet-control-load"
                );
                button.innerText = "Edit";
                button.id = "button";

                L.DomEvent.on(button, "click", () => {
                    _this.trigger("bulk-edit-markers");
                });

                return button;
            }
        });

        /* new editMarkers({ position: "topleft" }).addTo(this.map); */

        //this.rendered = true;
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
            command: markerToBeAdded.command || false
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
        command: boolean = false
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
            command: command
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

                if (evt.originalEvent.altKey) {
                    this.tooltip.setContent(
                        `[${marker.loc.lat}, ${marker.loc.lng}]`
                    );
                    marker.leafletInstance
                        .bindTooltip(this.tooltip, {
                            offset: new L.Point(
                                0,
                                -1 *
                                    (<SVGElement>(
                                        evt.originalEvent.target
                                    )).getBoundingClientRect().height
                            )
                        })
                        .openTooltip();

                    marker.leafletInstance.once("mouseout", () =>
                        marker.leafletInstance.unbindTooltip().closeTooltip()
                    );

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
                if (marker.link) {
                    this.trigger("marker-mouseover", evt, marker);
                }
            })
            .on("mouseout", (evt: L.LeafletMouseEvent) => {
                marker.leafletInstance.closeTooltip();
            });
    }

    setMarkerIcons(markerIcons: IMarkerIcon[]) {
        this.markerIcons = markerIcons.map(({ html, type }) => {
            return {
                html: html,
                type: type,
                icon: markerDivIcon({
                    html: html,
                    className: `leaflet-div-icon`
                })
            };
        });

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
