import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import convert from "convert";
import "leaflet-fullscreen";
import { Events, Notice, moment, Menu, Point } from "obsidian";

import {
    ILayerGroup,
    ILeafletMapOptions,
    ILeafletMarker,
    IMarkerData,
    IMarkerIcon,
    IObsidianAppData,
    Length,
    ObsidianLeaflet
} from "./@types";
import {
    getId,
    getImageDimensions,
    icon,
    DISTANCE_DECIMALS,
    LAT_LONG_DECIMALS,
    DEFAULT_MAP_OPTIONS
} from "./utils";

import {
    DistanceDisplay,
    distanceDisplay,
    editMarkers,
    Marker
} from "./utils/map";
declare module "leaflet" {
    interface Map {
        isFullscreen(): boolean;
    }
}
/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
export default class LeafletMap extends Events {
    plugin: ObsidianLeaflet;
    options: ILeafletMapOptions;

    parentEl: HTMLElement;
    contentEl: HTMLElement;

    id: string;

    map: L.Map;
    markers: Marker[] = [];

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
    type: "image" | "real";
    initialCoords: [number, number];
    tileServer: string;

    private _resize: ResizeObserver;
    private _unit: string = "m";
    private _distanceMultipler: number = 1;
    private _distanceEvent: L.LatLng | undefined = undefined;
    private _data: IObsidianAppData;
    private _distanceLine: L.Polyline = L.polyline(
        [
            [0, 0],
            [0, 0]
        ],
        {
            color: "blue"
        }
    );
    private _previousDistanceLine: L.Polyline = L.polyline(
        [
            [0, 0],
            [0, 0]
        ],
        {
            color: "blue"
        }
    );
    private _rendered: boolean;
    private _timeoutHandler: ReturnType<typeof setTimeout>;
    private _popupTarget: ILeafletMarker | L.LatLng;
    private _scale: number;
    private _hoveringOnMarker: boolean = false;
    private _distanceDisplay: DistanceDisplay;
    constructor(
        plugin: ObsidianLeaflet,
        el: HTMLElement,
        options: ILeafletMapOptions = {}
    ) {
        super();

        this.plugin = plugin;
        this._data = plugin.AppData;

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
        this._unit = this.options.unit;
        this._scale = this.options.scale;
        this._distanceMultipler = this.options.distanceMultiplier;

        this.tileServer = this.options.tileServer;
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

    get markerIcons() {
        return this.plugin.markerIcons;
    }

    get scale() {
        if (this.type !== "real") return this._scale;

        return convert(1)
            .from("m")
            .to(this._unit as Length);
    }

    get isDrawingDistance() {
        return this._distanceEvent != undefined;
    }

    private get _locale() {
        return moment.locale();
    }

    private get _coordMult(): [number, number] {
        let mult: [number, number] = [1, 1];
        if (this.type == "image") {
            mult = [
                this.bounds.getSouthEast().lat / 100,
                this.bounds.getSouthEast().lng / 100
            ];
        }
        return mult;
    }

    get CRS() {
        if (this.type === "image") {
            return L.CRS.Simple;
        }
        return L.CRS.EPSG3857;
    }
    get mutableMarkers() {
        return this.markers.filter(({ mutable }) => mutable);
    }

    async render(
        type: "real" | "image",
        options: {
            coords: [number, number];
            layers: { data: string; id: string }[];
        }
    ) {
        this.type = type;

        this.map = L.map(this.contentEl, {
            crs: this.CRS,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta,
            worldCopyJump: this.type === "real",
            fullscreenControl: true
        });

        /** Get layers
         *  Returns TileLayer (real) or ImageOverlay (image)
         */
        this.layer = await this._buildLayersForType(type, options.layers);

        /** Render map */
        switch (this.type) {
            case "real": {
                this._renderReal();
                break;
            }
            case "image": {
                this._renderImage();
                break;
            }
        }
        /** Move to supplied coordinates */
        this.initialCoords = [
            options.coords[0] * this._coordMult[0],
            options.coords[1] * this._coordMult[1]
        ];
        this.map.panTo(this.initialCoords);

        /** Add markers to map */
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

        /** Register Resize Handler */
        this._handleResize();

        /** Build control icons */
        //Full screen
        const fsButton = this.contentEl.querySelector(
            ".leaflet-control-fullscreen-button"
        );
        if (fsButton) {
            fsButton.setAttr("aria-label", "Toggle Full Screen");
            const expand = icon({ iconName: "expand", prefix: "fas" }).node[0];
            const compress = icon({ iconName: "compress", prefix: "fas" })
                .node[0];
            fsButton.appendChild(expand);
            this.map.on("fullscreenchange", () => {
                if (this.isFullscreen) {
                    fsButton.replaceChild(compress, fsButton.children[0]);
                    editMarkerControl.disable();
                } else {
                    fsButton.replaceChild(expand, fsButton.children[0]);
                    editMarkerControl.enable();
                }
            });
        }

        //Edit markers
        const editMarkerControl = editMarkers(
            { position: "topleft" },
            this,
            this.plugin
        ).addTo(this.map);

        editMarkerControl.onClose = async (markers) => {
            this.mutableMarkers.forEach((marker) => {
                this.removeMarker(marker);
            });

            markers.forEach((marker) => {
                this.createMarker(
                    this.markerIcons.find(({ type }) => type == marker.type),
                    marker.loc,
                    marker.link,
                    marker.id,
                    marker.layer,
                    marker.mutable,
                    marker.command,
                    marker.zoom
                );
            });
            await this.plugin.saveSettings();
        };

        //Distance Display
        this._distanceDisplay = distanceDisplay(
            {
                position: "bottomleft"
            },
            this._previousDistanceLine
        ).addTo(this.map);

        /** Bind Internal Map Events */
        this.map.on("contextmenu", this._handleMapContext.bind(this));
        this.map.on("click", this._handleMapClick.bind(this));
    }
    removeMarker(marker: Marker) {
        if (!marker) return;
        marker.remove();
        this.markers = this.markers.filter(({ id }) => id != marker.id);
    }

    updateMarkerIcons() {
        this.markers.forEach((marker) => {
            marker.leafletInstance.setIcon(
                this.markerIcons.find((icon) => icon.type == marker.type).icon
            );
        });
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

        this._bindMarkerEvents(marker);

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

        this._bindMarkerEvents(marker, mutable);

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

    distance(latlng1: L.LatLng, latlng2: L.LatLng): string {
        const dist = this.map.distance(latlng1, latlng2);
        let display = `${(dist * this.scale).toLocaleString(this._locale, {
            maximumFractionDigits: DISTANCE_DECIMALS
        })}`;
        if (this._distanceMultipler !== 1) {
            display += ` (${(
                dist *
                this.scale *
                this._distanceMultipler
            ).toLocaleString(this._locale, {
                maximumFractionDigits: DISTANCE_DECIMALS
            })})`;
        }
        return display + ` ${this._unit}`;
    }

    removeDistanceLine() {
        if (this._distanceLine) {
            this.plugin.app.keymap.popScope(this.plugin.escapeScope);

            this._distanceEvent = undefined;

            this._distanceLine.unbindTooltip();
            this._distanceLine.remove();

            /** Get Last Distance */
            const latlngs =
                this._previousDistanceLine.getLatLngs() as L.LatLng[];
            const display = this.distance(latlngs[0], latlngs[1]);
            this._distanceDisplay.setText(display);

            this.map.off("mousemove");
            this.map.off("mouseout");
        }
    }

    get isFullscreen(): boolean {
        return this.map.isFullscreen();
    }

    private _handleMapClick(evt: L.LeafletMouseEvent) {
        this._onHandleDistance(evt);
        if (
            evt.originalEvent.getModifierState("Shift") ||
            evt.originalEvent.getModifierState("Alt")
        ) {
            this.openPopup(
                evt.latlng,
                `[${evt.latlng.lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${evt.latlng.lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            if (
                this._data.copyOnClick &&
                evt.originalEvent.getModifierState("Control")
            ) {
                navigator.clipboard
                    .writeText(
                        `[${evt.latlng.lat.toLocaleString("en-US", {
                            maximumFractionDigits: LAT_LONG_DECIMALS
                        })}, ${evt.latlng.lng.toLocaleString("en-US", {
                            maximumFractionDigits: LAT_LONG_DECIMALS
                        })}]`
                    )
                    .then(() => {
                        new Notice("Map coordinates copied to clipboard.");
                    });
            }
        }
    }

    private _handleMapContext(evt: L.LeafletMouseEvent) {
        if (this.markerIcons.length <= 1) {
            this.createMarker(this.markerIcons[0], evt.latlng);
            return;
        }

        let contextMenu = new Menu(this.plugin.app);

        contextMenu.setNoIcon();
        this.markerIcons.forEach((marker: IMarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.setActive(true);
                item.onClick(async () => {
                    this.createMarker(marker, evt.latlng);
                    await this.plugin.saveSettings();
                });
            });
        });

        contextMenu.showAtPosition({
            x: evt.originalEvent.clientX,
            y: evt.originalEvent.clientY
        } as Point);
    }

    private _onHandleDistance(evt: L.LeafletMouseEvent) {
        if (
            !evt.originalEvent.getModifierState("Shift") &&
            !evt.originalEvent.getModifierState("Alt")
        ) {
            if (this._distanceEvent != undefined) {
                this.removeDistanceLine();
            }
            return;
        }
        if (this._distanceEvent != undefined) {
            this._previousDistanceLine.setLatLngs(
                this._distanceLine.getLatLngs()
            );
            this.removeDistanceLine();
        } else {
            this._distanceEvent = evt.latlng;

            this.plugin.app.keymap.pushScope(this.plugin.escapeScope);

            const distanceTooltip = L.tooltip({
                permanent: true,
                direction: "top",
                sticky: true
            });
            this._distanceLine.setLatLngs([this._distanceEvent, evt.latlng]);
            this._distanceLine.bindTooltip(distanceTooltip);
            this.map.on("mousemove", (mvEvt: L.LeafletMouseEvent) => {
                if (!this._hoveringOnMarker) {
                    this._distanceLine.setLatLngs([
                        this._distanceEvent,
                        mvEvt.latlng
                    ]);
                }
                this._distanceLine.addTo(this.map);

                /** Get New Distance */
                const latlngs = this._distanceLine.getLatLngs() as L.LatLng[];
                const display = this.distance(latlngs[0], latlngs[1]);

                /** Update Distance Line Tooltip */
                distanceTooltip.setContent(display);
                distanceTooltip.setLatLng(mvEvt.latlng);

                if (!this._distanceLine.isTooltipOpen()) {
                    distanceTooltip.openTooltip();
                }

                this._distanceDisplay.setText(display);
                this._distanceLine.redraw();
            });

            this.map.on("mouseout", () => {
                this.removeDistanceLine();
                this._distanceEvent = undefined;
            });
        }
    }

    private async _buildLayersForType(
        type: string,
        layers?: { data: string; id: string }[]
    ): Promise<L.TileLayer | L.ImageOverlay> {
        if (type === "real") {
            this.layer = L.tileLayer(this.tileServer, {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                className: this.options.darkMode ? "dark-mode" : ""
            });
            const group = L.layerGroup([this.layer]);

            this.mapLayers = [
                {
                    group: group,
                    layer: this.layer,
                    id: "real",
                    data: "real"
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
                        new L.LatLngBounds(southWest, northEast),
                        {
                            className: this.options.darkMode ? "dark-mode" : ""
                        }
                    );
                    return {
                        group: L.layerGroup([mapLayer]),
                        layer: mapLayer,
                        id: layer.id,
                        data: layer.data
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
    private async _renderImage() {
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
    private async _renderReal() {
        this.mapLayers[0].group.addTo(this.map);

        this.map.setZoom(this.zoom.default, { animate: false });

        this._handleResize();
    }
    private _handleResize() {
        this._resize = new ResizeObserver(() => {
            if (this.rendered) {
                this.map.invalidateSize();
            }
        });
        this._resize.observe(this.contentEl);
    }

    private _bindMarkerEvents(marker: ILeafletMarker, mutable: boolean = true) {
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

                this._onHandleDistance(evt);
                if (
                    evt.originalEvent.getModifierState("Alt") ||
                    evt.originalEvent.getModifierState("Shift")
                ) {
                    this.openPopup(
                        marker,
                        `[${marker.loc.lat.toLocaleString("en-US", {
                            maximumFractionDigits: LAT_LONG_DECIMALS
                        })}, ${marker.loc.lng.toLocaleString("en-US", {
                            maximumFractionDigits: LAT_LONG_DECIMALS
                        })}]`
                    );

                    if (
                        this._data.copyOnClick &&
                        evt.originalEvent.getModifierState("Control")
                    ) {
                        navigator.clipboard
                            .writeText(
                                `[${marker.loc.lat.toLocaleString("en-US", {
                                    maximumFractionDigits: LAT_LONG_DECIMALS
                                })}, ${marker.loc.lng.toLocaleString("en-US", {
                                    maximumFractionDigits: LAT_LONG_DECIMALS
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
            })
            .on("drag", (evt: L.LeafletMouseEvent) => {
                this.trigger("marker-dragging", marker);
                if (this.popup.isOpen()) {
                    this.popup.setLatLng(evt.latlng);
                }
            })
            .on("dragend", (evt: L.LeafletMouseEvent) => {
                const old = marker.loc;
                marker.loc = marker.leafletInstance.getLatLng();
                this.trigger("marker-data-updated", marker, old);
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                if (marker.link) {
                    this.trigger("marker-mouseover", evt, marker);
                }
                this._hoveringOnMarker = true;
                if (this._distanceLine) {
                    this._distanceLine.setLatLngs([
                        this._distanceLine.getLatLngs()[0] as L.LatLngExpression,
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

        this.popup = this._getPopup(target).setContent(content);
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
    private _getPopup(target: ILeafletMarker | L.LatLng): L.Popup {
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
    /* private _movePopup(target: ILeafletMarker) {
        let popup = this._getPopup(target);
        popup.setLatLng(target.loc);
    } */

    remove() {
        this.map?.remove();

        this._resize?.disconnect();

        this.rendered = false;
    }
}
