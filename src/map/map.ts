import convert from "convert";
import { Length } from "convert/dist/types/units";
import type geojson from "geojson";

import { Events, Menu, Notice, Platform, Scope } from "obsidian";
import {
    LayerGroup,
    LeafletMapOptions,
    MarkerIcon,
    Popup,
    SavedMarkerProperties,
    SavedOverlayData,
    TooltipDisplay,
    BaseMap as BaseMapDefinition,
    BaseMapType,
    ImageLayerData,
    SavedMapData,
    DistanceDisplay
} from "../../types";

import { GPX, Marker, GeoJSON, Overlay } from "src/layer";

import { OverlayContextModal } from "src/modals/context";

import {
    copyToClipboard,
    DEFAULT_ATTRIBUTION,
    DEFAULT_MAP_OPTIONS,
    DEFAULT_TILE_SUBDOMAINS,
    DISTANCE_DECIMALS,
    formatLatLng,
    formatNumber,
    getId,
    icon,
    log,
    MODIFIER_KEY,
    TILE_SUBDOMAINS_SPILT
} from "src/utils";

import { popup } from "./popup";

import {
    distanceDisplay,
    filterMarkerControl,
    resetZoomControl,
    zoomControl
} from "../controls";

import { LeafletSymbol } from "../utils/leaflet-import";
import { gpxControl } from "src/controls/gpx";
import { LeafletRenderer } from "src/renderer/renderer";
import { mapViewControl, saveMapParametersControl } from "src/controls/mapview";
import t from "src/l10n/locale";

import { drawControl } from "src/draw/controls";
import { DrawingController } from "src/draw/controller";
import { ShapeProperties } from "src/draw/shape";
import LayerControl from "src/controls/layers";
import type { FilterMarkers } from "src/controls/filter";
import { LockControl, lockControl } from "src/controls/lock";

let L = window[LeafletSymbol];
declare module "leaflet" {
    function hotline(data: L.LatLng[], options: HotlineOptions): L.Polyline;
    interface Hotline extends L.Canvas {}
    interface HotlineOptions extends L.PolylineOptions {
        weight?: number;
        outlineWidth?: number;
        outlineColor?: string;
        palette?: Record<number, string>;
        min?: number;
        max?: number;
    }
}
export abstract class BaseMap extends Events implements BaseMapDefinition {
    drawingGroup: L.FeatureGroup<any>;
    drawingLayer: any;
    readyForDrawings: boolean = false;
    filterControl: FilterMarkers;
    tileOverlayLayer: L.FeatureGroup<L.TileLayer>;
    lockControl: LockControl;
    abstract get bounds(): L.LatLngBounds;

    canvas: L.Canvas;

    controller: DrawingController = new DrawingController(this);

    CRS: L.CRS;
    distanceDisplay: DistanceDisplay;

    private escapeScope: Scope;

    geojsonData: {
        data: geojson.GeoJsonObject;
        alias?: string;
        note?: string;
    }[] = [];
    gpxControl: ReturnType<typeof gpxControl>;
    gpxData: { data: string; alias?: string }[] = [];
    gpxIcons: {
        start: string;
        end: string;
        waypoint: string;
    } = {
        start: null,
        end: null,
        waypoint: null
    };
    imageOverlayData: {
        id: string;
        data: string;
        alias: string;
        bounds: [[number, number], [number, number]];
    }[] = [];

    isDrawing: boolean = false;
    layerControl = new LayerControl();
    layerControlAdded = false;

    abstract render(options: {
        coords: [number, number];
        zoomDistance: number;
        imageOverlayData: {
            id: string;
            data: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[];
    }): Promise<void>;

    popup: Popup = popup(this, null);

    renderOptions: {
        coords: [number, number];
        zoomDistance: number;
    };

    abstract get scale(): number;
    start: number;

    type: string;

    get plugin() {
        return this.renderer.plugin;
    }

    constructor(
        public renderer: LeafletRenderer,
        public options: LeafletMapOptions
    ) {
        super();

        this.contentEl.style.height = options.height;
        this.contentEl.style.width = options.width ?? "100%";
        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);

        /** Stop Touchmove Propagation for Mobile */
        this.contentEl.addEventListener("touchmove", (evt) => {
            evt.stopPropagation();
        });
        this.escapeScope = new Scope(this.plugin.app.scope);
        this.escapeScope.register(undefined, "Escape", () =>
            this.escapeScopeCallback()
        );
    }

    private escapeScopeCallback() {
        if (!this.isFullscreen) {
            this.stopDrawingContext();
            if (this.controller.isDrawing) this.controller.newShape();
        }
    }

    createMap() {
        this.leafletInstance = L.map(this.contentEl, {
            crs: this.CRS,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            scrollWheelZoom: !this.options.noScrollZoom,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta,
            zoomControl: !this.options.noUI,
            wheelPxPerZoomLevel: 60 * (1 / this.zoom.delta),
            worldCopyJump: this.type === "real",
            ...(this.plugin.isDesktop && !this.options.noUI
                ? { fullscreenControl: true }
                : {})
        });
        this.leafletInstance.createPane("base-layer");
        this.leafletInstance.createPane("geojson");
        this.leafletInstance.createPane("gpx");
        this.leafletInstance.createPane("gpx-canvas");
        this.leafletInstance.createPane("drawing");
        this.leafletInstance.createPane("drawing-markers");

        this.drawingLayer = new L.LayerGroup([], { pane: "drawing" }).addTo(
            this.leafletInstance
        );
        this.readyForDrawings = true;
        this.trigger("ready-for-drawings");

        //@ts-expect-error
        this.canvas = L.Hotline.renderer({ pane: "gpx-canvas" }).addTo(
            this.leafletInstance
        );

        /** Bind Map Events */
        this.leafletInstance.on("blur", () => {
            this.unregisterScope();
        });
        this.leafletInstance.on("contextmenu", (evt: L.LeafletMouseEvent) =>
            this.handleMapContext(evt)
        );
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) =>
            this.handleMapClick(evt)
        );

        this.on("first-layer-ready", () => {
            this.addFeatures();
            /** Move to supplied coordinates */
            this.log(
                `Moving to supplied coordinates: ${this.renderOptions.coords}`
            );
            this.setInitialCoords(this.renderOptions.coords);
            this.leafletInstance.panTo(this.initialCoords);

            if (
                (this.geojsonData.length || this.gpxData.length) &&
                this.options.zoomFeatures
            ) {
                this.log(`Zooming to features.`);
                this.leafletInstance.fitBounds(this.featureLayer.getBounds());
                const { lat, lng } = this.featureLayer.getBounds().getCenter();

                this.log(`Features center: [${lat}, ${lng}]`);
                this.setInitialCoords([lat, lng]);
                this.zoom.default = this.leafletInstance.getBoundsZoom(
                    this.featureLayer.getBounds()
                );
            }

            if (this.renderOptions.zoomDistance) {
                this.zoomDistance = this.renderOptions.zoomDistance;
                this.setZoomByDistance(this.renderOptions.zoomDistance);
            }

            this.leafletInstance.setZoom(this.zoom.default, {
                animate: false
            });
            this.featureLayer.addTo(this.currentGroup.group);
            this.currentGroup.group.addTo(this.leafletInstance);
            this.tileOverlayLayer.addTo(this.leafletInstance);

            if (this.options.zoomMarkers) {
                this.log(`Zooming to markers.`);

                this.zoomAllMarkers();
            }
        });

        this.leafletInstance.on(
            "baselayerchange",
            ({ layer }: L.LayersControlEvent) => {
                // need to do this to prevent panning animation for some reason
                this.leafletInstance.setMaxBounds([undefined, undefined]);

                this.currentLayer = (layer as L.LayerGroup).getLayers()[0] as
                    | L.ImageOverlay
                    | L.TileLayer;

                this.resetZoom();
                if (this.options.recenter) {
                    this.leafletInstance.setMaxBounds(this.bounds);
                }
            }
        );

        this.buildControls();
    }

    contentEl: HTMLElement = createDiv();
    currentLayer: L.TileLayer | L.ImageOverlay;
    get currentGroup() {
        return this.mapLayers?.find(
            (group) => group.layer == this.currentLayer
        );
    }
    get data() {
        return this.plugin.data;
    }
    get defaultIcon(): MarkerIcon {
        return this.markerIcons.get("default");
    }
    displaying: Map<string, boolean> = new Map();

    get displayed() {
        return this.markers.filter(
            (marker) =>
                (marker.layer === this.currentGroup.id || !marker.layer) &&
                this.displaying.get(marker.type)
        );
    }

    private distanceLines: L.Polyline[] = [];
    private distanceTooltips: Popup[] = [];
    previousDistanceLines: L.Polyline[] = [];
    featureLayer: L.FeatureGroup;
    geojsonLayer: L.FeatureGroup;
    gpxLayer: L.FeatureGroup;

    get id() {
        return this.options.id;
    }

    initialCoords: [number, number];

    get isFullscreen(): boolean {
        return this.leafletInstance.isFullscreen();
    }
    leafletInstance: L.Map;
    mapLayers: LayerGroup<L.TileLayer | L.ImageOverlay>[] = [];
    get markerIcons(): Map<string, MarkerIcon> {
        return new Map(
            [...this.plugin.markerIcons, ...(this.options.localMarkerTypes ?? [])].map((markerIcon) => [
                markerIcon.type,
                markerIcon
            ])
        );
    }
    get markerTypes() {
        return Array.from(this.markerIcons.keys());
    }

    overlays: Overlay[] = [];

    markers: Marker[] = [];

    rendered: boolean;

    tempCircle: L.Circle;

    get verbose() {
        return this.options.verbose;
    }

    zoom = {
        min: this.options.minZoom,
        max: this.options.maxZoom,
        default: this.options.defaultZoom,
        delta: this.options.zoomDelta
    };
    zoomDistance: number;

    unit: Length = (this.options.unit as Length) ?? this.plugin.defaultUnit;

    /** Marker Methods */
    addMarker(...markers: SavedMarkerProperties[]) {
        let toReturn: Marker[] = [];
        for (const marker of markers) {
            let markerIcon: MarkerIcon;
            let type: string;
            if (typeof marker.type == "object") {
                type = `custom`;
                markerIcon = this.plugin.parseIcon({
                    type: `custom`,
                    iconName: marker.type.icon ?? "map-marker",
                    layer: marker.type.layer ?? true,
                    color: marker.type.color
                });
            } else {
                if (!this.markerTypes.includes(marker.type)) {
                    new Notice(
                        t(
                            `Marker type "%1" does not exist, using default.`,
                            marker.type
                        )
                    );
                    marker.type = "default";
                }
                markerIcon = this.markerIcons.get(marker.type);
                type = marker.type;
            }

            const mapIcon = markerIcon?.icon ?? this.defaultIcon.icon;

            if (!this.displaying.has(type)) {
                this.displaying.set(type, true);
            }
            const newMarker = new Marker(this, {
                id: marker.id,
                type: type,
                loc: L.latLng(marker.loc),
                link: marker.link,
                /* icon: mapIcon, */
                layer: marker.layer
                    ? marker.layer
                    : this.currentGroup?.id ?? null,
                mutable: marker.mutable ?? false,
                command: marker.command ?? false,
                zoom: this.leafletInstance.getMaxZoom(),
                percent: marker.percent,
                description: marker.description,
                tooltip:
                    marker.tooltip ?? this.plugin.data.displayMarkerTooltips,
                minZoom: marker.minZoom,
                maxZoom: marker.maxZoom
            });
            this.markers.push(newMarker);
            toReturn.push(newMarker);
        }
        return toReturn;
    }

    createMarker(
        type: string,
        loc: [number, number],
        percent: [number, number] = null,
        id: string = getId(),
        link: string = null,
        layer: string = null,
        mutable: boolean = true,
        command: boolean = false,
        description: string = null,
        minZoom: number = null,
        maxZoom: number = null,
        tooltip: TooltipDisplay = this.plugin.data.displayMarkerTooltips
    ): Marker {
        const markers = this.addMarker({
            id,
            type,
            loc,
            link,
            layer: layer ? layer : this.currentGroup?.id,
            mutable,
            command,
            percent,
            description,
            minZoom,
            maxZoom,
            tooltip
        });

        if (mutable) {
            this.trigger("marker-added", markers[0]);
        }
        return markers[0];
    }

    onMarkerClick(marker: Marker, evt: L.LeafletMouseEvent) {
        if (this.controller.isDrawing) {
            L.DomEvent.stopPropagation(evt);
            this.controller.shape.onClick(evt, { marker });
            return;
        }
        this.handleMapDistance(evt);
    }

    updateMarker(marker: Marker) {
        const existing = this.markers.find((m) => m.id == marker.id);

        this.displaying.delete(existing.type);
        this.displaying.set(marker.type, true);

        existing.link = marker.link;
        existing.description = marker.description;
        existing.icon = this.markerIcons.get(marker.type);
        existing.minZoom = marker.minZoom;
        existing.maxZoom = marker.maxZoom;
        existing.command = marker.command;

        if (existing.shouldShow(this.leafletInstance.getZoom())) {
            existing.show();
        } else if (existing.shouldHide(this.leafletInstance.getZoom())) {
            existing.hide();
        }
    }

    /** Overlay Methods */
    addOverlay(...overlays: SavedOverlayData[]) {
        for (let overlay of overlays) {
            this.overlays.push(new Overlay(this, overlay));
        }
        this.sortOverlays();
    }
    createOverlay(overlay: SavedOverlayData) {
        this.addOverlay(overlay);
        this.trigger("markers-updated");
    }
    startDrawingContext() {
        this.plugin.app.keymap.pushScope(this.escapeScope);
        this.isDrawing = true;
    }
    beginOverlayDrawingContext(original: L.LeafletMouseEvent, marker?: Marker) {
        this.startDrawingContext();

        this.tempCircle = L.circle(original.latlng, {
            radius: 1,
            color: this.options.overlayColor
        });
        this.leafletInstance.once("click", async () => {
            if (this.tempCircle) {
                this.log(`Overlay drawing complete.`);
                this.tempCircle.remove();

                this.createOverlay({
                    radius:
                        this.type === "image"
                            ? this.tempCircle.getRadius()
                            : convert(this.tempCircle.getRadius())
                                  .from("m")
                                  .to(this.unit),
                    color: this.tempCircle.options.color,
                    loc: [
                        this.tempCircle.getLatLng().lat,
                        this.tempCircle.getLatLng().lng
                    ],
                    layer: this.currentGroup.id,
                    unit: this.unit,
                    desc: "",
                    mutable: true,
                    marker: marker?.id ?? null
                });

                this.trigger("should-save");
                this.leafletInstance.off("mousemove");
            }
        });
        this.leafletInstance.on("mousemove", (evt: L.LeafletMouseEvent) => {
            this.tempCircle.setRadius(
                this.leafletInstance.distance(original.latlng, evt.latlng)
            );
        });

        this.tempCircle.addTo(this.currentGroup.group);
    }

    /** Other Methods */
    addLayerControl() {
        if (this.layerControlAdded) return;
        this.layerControlAdded = true;
        this.filterControl?.remove();
        this.layerControl.addTo(this.leafletInstance);
        this.filterControl?.addTo(this.leafletInstance);
    }
    onFirstLayerReady(callback: (...args: any[]) => any) {
        if (this.mapLayers.length) {
            callback();
        } else {
            this.on("first-layer-ready", () => {
                callback();
            });
        }
    }
    addFeatures() {
        /** Add GeoJSON to map */
        this.featureLayer = L.featureGroup();
        this.tileOverlayLayer = L.featureGroup();
        let added: number;
        if (this.geojsonData.length > 0) {
            this.addLayerControl();
            this.log(
                `Adding ${this.geojsonData.length} GeoJSON features to map.`
            );

            this.geojsonLayer = L.featureGroup().addTo(this.featureLayer);

            added = 0;

            this.geojsonData.forEach(({ data, alias, note }) => {
                try {
                    const geo = new GeoJSON(
                        this as BaseMapType,
                        this.featureLayer,
                        { color: this.options.geojsonColor },
                        data,
                        note
                    );

                    geo.leafletInstance.addTo(this.geojsonLayer);
                    this.layerControl.addOverlay(
                        geo.leafletInstance,
                        alias && alias.length ? alias : `GeoJSON ${added + 1}`
                    );

                    added++;
                } catch (e) {
                    console.error(e);
                    new Notice(
                        t("There was an error adding GeoJSON to map") +
                            ` ${this.id}.` +
                            `\n\n${alias}`
                    );
                    return;
                }
            });

            this.log(
                `${added} GeoJSON feature${added == 1 ? "" : "s"} added to map.`
            );
        }

        /** Add GPX to map */
        if (this.gpxData.length > 0) {
            added = 0;
            this.addLayerControl();
            this.log(`Adding ${this.gpxData.length} GPX features to map.`);
            this.gpxLayer = L.featureGroup().addTo(this.featureLayer);
            for (let { data, alias } of this.gpxData) {
                try {
                    const gpxInstance = new GPX(
                        this as BaseMapType,
                        data,
                        this.gpxIcons
                    );
                    gpxInstance.show();
                    gpxInstance.leafletInstance.addTo(this.gpxLayer);
                    this.layerControl.addOverlay(
                        gpxInstance.leafletInstance,
                        alias ?? `GPX ${added + 1}`
                    );
                    added++;
                } catch (e) {
                    console.error(e);
                    new Notice(
                        t("There was an error adding GPX to map") +
                            ` ${this.id}`
                    );
                    return;
                }
            }

            this.gpxControl = gpxControl(
                { position: "bottomleft" },
                this
            ).addTo(this.leafletInstance);
        }

        if (this.geojsonData.length || this.gpxData.length) {
            if (this.options.zoomFeatures) {
                this.log(`Zooming to features.`);
                this.leafletInstance.fitBounds(this.featureLayer.getBounds());
                const { lat, lng } = this.featureLayer.getBounds().getCenter();

                this.log(`Features center: [${lat}, ${lng}]`);
                this.setInitialCoords([lat, lng]);
                this.zoom.default = this.leafletInstance.getBoundsZoom(
                    this.featureLayer.getBounds()
                );
            }
        }

        /** Add Image Overlays to Map */
        if (this.imageOverlayData && this.imageOverlayData.length) {
            this.onFirstLayerReady(() => {
                this.addLayerControl();
                this.leafletInstance.createPane("image-overlay");
                for (let overlay of this.imageOverlayData) {
                    let bounds = overlay.bounds.length
                        ? overlay.bounds
                        : this.bounds;

                    const image = L.imageOverlay(overlay.data, bounds, {
                        pane: "image-overlay"
                    });

                    this.layerControl.addOverlay(image, overlay.alias);
                }
            });
        }
        if (this.options.tileOverlay && this.options.tileOverlay.length) {
            this.onFirstLayerReady(() => {
                this.addLayerControl();
                let index = 0;
                for (const overlay of this.options.tileOverlay) {
                    index++;
                    const [server, name = `Layer ${index}`, on] =
                        overlay.split("|");
                    const layer = L.tileLayer(server);
                    if (on && on == "on") {
                        layer.addTo(this.tileOverlayLayer);
                    }
                    this.layerControl.addOverlay(
                        layer,
                        name && name.length ? name : `Layer ${index}`
                    );
                }
            });
        }
    }

    addShapes(...shapes: ShapeProperties[]) {
        for (const shape of shapes) {
            this.controller.addShape(shape);
        }
    }
    buildControls() {
        if (this.options.noUI) return;
        if (this.options.hasAdditional) {
            this.addLayerControl();
        }
        //Full screen
        if (this.plugin.isDesktop) {
            const fsButton = this.contentEl.querySelector(
                ".leaflet-control-fullscreen-button"
            );
            if (fsButton) {
                fsButton.setAttr("aria-label", "Toggle Full Screen");
                const expand = icon({ iconName: "expand", prefix: "fas" })
                    .node[0];
                const compress = icon({ iconName: "compress", prefix: "fas" })
                    .node[0];
                fsButton.appendChild(expand);
                this.leafletInstance.on("fullscreenchange", () => {
                    if (this.isFullscreen) {
                        fsButton.replaceChild(compress, fsButton.children[0]);
                        //editMarkerControl.disable();
                    } else {
                        fsButton.replaceChild(expand, fsButton.children[0]);
                        //editMarkerControl.enable();
                    }
                });
            }
        }
        this.filterControl = filterMarkerControl(
            { position: "topright" },
            this
        ).addTo(this.leafletInstance);
        this.lockControl = lockControl({ position: "topright" }, this).addTo(
            this.leafletInstance
        );
        zoomControl({ position: "topleft" }, this).addTo(this.leafletInstance);
        resetZoomControl({ position: "topleft" }, this).addTo(
            this.leafletInstance
        );
        this.distanceDisplay = distanceDisplay(
            {
                position: "bottomleft"
            },
            this
        ).addTo(this.leafletInstance);

        if (this.options.isMapView) {
            mapViewControl(
                {
                    position: "bottomright"
                },
                this
            ).addTo(this.leafletInstance);
        } else if (!this.options.isInitiativeView) {
            saveMapParametersControl(
                {
                    position: "bottomright"
                },
                this
            ).addTo(this.leafletInstance);
        }

        if (this.options.draw) {
            drawControl({ position: "bottomright" }, this).addTo(
                this.leafletInstance
            );
        }
    }

    updateLockState(state: boolean): void {
        this.options.lock = state;

        this.lockControl.setState(this.options.lock);
        this.trigger("lock");
    }

    abstract buildLayer(layer?: {
        data: string;
        id: string;
        alias?: string;
    }): Promise<L.TileLayer | L.ImageOverlay>;

    closePopup(popup: L.Popup) {
        if (!popup) return;
        this.leafletInstance.closePopup(popup);
    }
    distanceAlongPolylines(polylines: L.Polyline[]): string {
        if (polylines.length == 1) {
            const latlngs = polylines[0].getLatLngs() as L.LatLng[];
            return this.distance(latlngs[0], latlngs[1]);
        }
        let total = 0;
        for (const line of polylines) {
            const latlngs = line.getLatLngs() as L.LatLng[];
            total += this.leafletInstance.distance(latlngs[0], latlngs[1]);
        }
        let display = `${formatNumber(total * this.scale, DISTANCE_DECIMALS)}`;
        if (this.options.distanceMultiplier !== 1) {
            display += ` (${formatNumber(
                total * this.scale * this.options.distanceMultiplier,
                DISTANCE_DECIMALS
            )})`;
        }
        return display + ` ${this.unit}`;
    }
    distance(latlng1: L.LatLng, latlng2: L.LatLng): string {
        const dist = this.leafletInstance.distance(latlng1, latlng2);
        let display = `${formatNumber(dist * this.scale, DISTANCE_DECIMALS)}`;
        if (this.options.distanceMultiplier !== 1) {
            display += ` (${formatNumber(
                dist * this.scale * this.options.distanceMultiplier,
                DISTANCE_DECIMALS
            )})`;
        }
        return display + ` ${this.unit}`;
    }
    getMarkersById(id: string): Marker[] {
        return this.markers.filter(({ id: marker }) => marker === id);
    }
    getOverlaysUnderClick(evt: L.LeafletMouseEvent) {
        const overlays = [...this.overlays].filter(
            (overlay) =>
                overlay.mutable &&
                overlay.isUnder(evt) &&
                overlay.layer === this.currentGroup.id
        );
        overlays.sort((a, b) => {
            return a.radiusInMeters - b.radiusInMeters;
        });

        return overlays;
    }
    getZoom() {
        if (!this.rendered) return this.zoom.default;
        return this.leafletInstance.getZoom();
    }
    async handleMapClick(evt: L.LeafletMouseEvent) {
        if (this.controller.isDrawing) return;
        this.handleMapDistance(evt);
        if (
            evt.originalEvent.getModifierState("Shift") ||
            evt.originalEvent.getModifierState("Alt")
        ) {
            await this.getMapCoordinates(evt);
        }
    }
    async getMapCoordinates(evt: L.LeafletMouseEvent) {
        this.log(`Map popup context detected. Opening popup.`);
        const latlng = formatLatLng(evt.latlng);
        this.popup.setTarget(evt.latlng).open(`[${latlng.lat}, ${latlng.lng}]`);
        if (
            this.data.copyOnClick &&
            (evt.originalEvent.getModifierState("Shift") || Platform.isMobile)
        ) {
            this.log(`Copying coordinates of click to clipboard.`);
            await copyToClipboard(evt.latlng);
        }
    }
    handleMapDistance(evt: L.LeafletMouseEvent, mobile?: boolean) {
        if (
            !mobile &&
            ((!evt.originalEvent.getModifierState("Shift") &&
                !evt.originalEvent.getModifierState("Alt")) ||
                evt.originalEvent.getModifierState("Control"))
        ) {
            if (!this.distanceLines.length) {
                return;
            }
            this.stopDrawingContext();
            return;
        }
        this.log(`Distance measurement context starting.`);
        const distanceEvent = evt.latlng;

        if (!this.isDrawing) this.startDrawingContext();

        this.distanceLines.push(L.polyline([distanceEvent, evt.latlng]));
        this.distanceLines.last().addTo(this.leafletInstance);

        this.distanceTooltips.push(
            popup(this, this.distanceLines.last(), {
                permanent: true
            })
        );
        const display = this.distanceAlongPolylines([
            this.distanceLines.last()
        ]);
        this.distanceTooltips.last().open(display);

        this.leafletInstance.on("mousemove", (mvEvt: L.LeafletMouseEvent) => {
            const latlng = mvEvt.latlng;
            const delta = [
                Math.abs(latlng.lat - distanceEvent.lat),
                Math.abs(latlng.lng - distanceEvent.lng)
            ];

            if (mvEvt.originalEvent.getModifierState("Shift")) {
                if (delta[0] > delta[1]) {
                    latlng.lng = distanceEvent.lng;
                } else {
                    latlng.lat = distanceEvent.lat;
                }
            }

            if (
                !this.markers.find((m) => m.isBeingHovered) ||
                mvEvt.originalEvent.getModifierState(MODIFIER_KEY)
            ) {
                this.distanceLines.last().setLatLngs([distanceEvent, latlng]);
            } else {
                this.distanceLines
                    .last()
                    .setLatLngs([
                        distanceEvent,
                        this.markers.find((m) => m.isBeingHovered).loc
                    ]);
            }

            /** Get New Distance */
            const display = this.distanceAlongPolylines(this.distanceLines);
            const segment = this.distanceAlongPolylines([
                this.distanceLines.last()
            ]);
            this.distanceTooltips.last().open(`${display} (${segment})`);

            this.distanceDisplay.setText(display);
            this.distanceLines.last().redraw();
        });

        this.leafletInstance.on("mouseout", () => {
            if (Platform.isMobile) return;
            this.stopDrawingContext();
        });
    }

    handleMapContext(evt: L.LeafletMouseEvent, overlay?: Overlay) {
        if (this.controller.isDrawing) {
            return;
        }
        if (Platform.isMobile) {
            return this.handleMapContextMobile(evt, overlay);
        }
        if (evt.originalEvent.getModifierState("Shift")) {
            this.log(`Beginning overlay drawing context.`);
            //begin drawing context

            this.beginOverlayDrawingContext(evt);

            return;
        }
        if (overlay) {
            const under = this.getOverlaysUnderClick(evt);
            if (!under.length) {
                if (!overlay.mutable) {
                    new Notice(
                        t(
                            "This overlay cannot be edited because it was defined in the code block."
                        )
                    );
                    return;
                }
                under.push(overlay);
            }

            const openOverlayContext = (overlay: Overlay) => {
                const menu = new Menu();

                menu.setNoIcon();
                menu.addItem((item) => {
                    item.setTitle(t("Edit Overlay")).onClick(() => {
                        const modal = new OverlayContextModal(overlay, this);
                        modal.onClose = async () => {
                            if (modal.deleted) {
                                this.log(
                                    "Overlay deleted in context menu. Removing."
                                );
                                overlay.remove();
                                this.overlays = this.overlays.filter(
                                    (o) => o != overlay
                                );
                                this.trigger("markers-updated");
                                this.trigger("should-save");

                                return;
                            }
                            try {
                                overlay.data.color = modal.tempOverlay.color;
                                overlay.data.radius = modal.tempOverlay.radius;
                                overlay.data.desc = modal.tempOverlay.desc;
                                overlay.data.tooltip =
                                    modal.tempOverlay.tooltip;
                                let newRadius = convert(
                                    Number(overlay.data.radius)
                                )
                                    .from((overlay.data.unit as Length) ?? "m")
                                    .to(this.type == "image" ? this.unit : "m");

                                if (this.type == "image") {
                                    newRadius = newRadius / this.scale;
                                }

                                overlay.leafletInstance.setRadius(newRadius);
                                overlay.leafletInstance.setStyle({
                                    color: overlay.data.color
                                });

                                this.trigger("should-save");
                            } catch (e) {
                                new Notice(
                                    t(
                                        "There was an error saving the overlay."
                                    ) + `\n\n${e.message}`
                                );
                            }
                        };
                        modal.open();
                    });
                });
                menu.addItem((item) => {
                    item.setTitle(t("Convert to Code Block")).onClick(
                        async () => {
                            overlay.mutable = false;

                            this.trigger("create-immutable-layer", overlay);

                            this.trigger("should-save");
                        }
                    );
                });
                menu.addItem((item) => {
                    item.setTitle(t("Delete Overlay")).onClick(() => {
                        this.log("Overlay deleted in context menu. Removing.");
                        overlay.remove();
                        this.overlays = this.overlays.filter(
                            (o) => o != overlay
                        );
                        this.trigger("markers-updated");
                        this.trigger("should-save");
                    });
                });
                menu.showAtMouseEvent(evt.originalEvent);
            };

            if (under.length == 1) {
                openOverlayContext(under[0]);
            } else {
                let contextMenu = new Menu();

                contextMenu.setNoIcon();
                contextMenu.addItem((item) => {
                    item.setTitle(t("Create Marker"));
                    item.onClick(() => {
                        contextMenu.hide();
                        this.handleMapContext(evt);
                    });
                });
                under.forEach((overlay, index) => {
                    contextMenu.addItem((item) => {
                        item.setTitle("Overlay " + `${index + 1}`);
                        item.onClick(() => {
                            openOverlayContext(overlay);
                        });
                        item.dom.onmouseenter = () => {
                            overlay.leafletInstance
                                .getElement()
                                .addClass("leaflet-layer-targeted");
                        };
                        item.dom.onmouseleave = () => {
                            overlay.leafletInstance
                                .getElement()
                                .removeClass("leaflet-layer-targeted");
                        };
                    });
                });
                contextMenu.onHide(() => {
                    under.forEach((overlay) => {
                        overlay.leafletInstance
                            .getElement()
                            .removeClass("leaflet-layer-targeted");
                    });
                });

                contextMenu.showAtMouseEvent(evt.originalEvent);
            }

            return;
        }
        if (this.markerIcons.size <= 1) {
            this.log(
                `No additional marker types defined. Adding default marker.`
            );
            this.createMarker(
                this.defaultIcon.type,
                [evt.latlng.lat, evt.latlng.lng],
                undefined
            );
            return;
        }

        let contextMenu = new Menu();

        contextMenu.setNoIcon();

        this.log(`Opening marker context menu.`);

        this.markerIcons.forEach((marker: MarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.onClick(async () => {
                    this.log(`${marker.type} selected. Creating marker.`);
                    this.createMarker(
                        marker.type,
                        [evt.latlng.lat, evt.latlng.lng],
                        undefined
                    );
                    this.trigger("should-save");
                });
            });
        });

        contextMenu.showAtMouseEvent(evt.originalEvent);
    }
    handleMapContextMobile(evt: L.LeafletMouseEvent, overlay?: Overlay) {
        let contextMenu = new Menu();

        contextMenu.setNoIcon();
        contextMenu.addItem((item) => {
            item.setTitle("Show coordinates").onClick(async () => {
                await this.getMapCoordinates(evt);
            });
        });
        contextMenu.addItem((item) =>
            item
                .setTitle(
                    !this.isDrawing ? "Measure distance" : "Finish measuring"
                )
                .onClick(() => {
                    this.handleMapDistance(evt, true);
                })
        );
        contextMenu.addSeparator();
        this.log(`Opening marker context menu.`);

        this.markerIcons.forEach((marker: MarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.onClick(async () => {
                    this.log(`${marker.type} selected. Creating marker.`);
                    this.createMarker(
                        marker.type,
                        [evt.latlng.lat, evt.latlng.lng],
                        undefined
                    );
                    this.trigger("should-save");
                });
            });
        });
        contextMenu.showAtMouseEvent(evt.originalEvent);
    }
    isLayerRendered(layer: string) {
        return this.mapLayers.find(({ id }) => id === layer) ? true : false;
    }
    loadFeatureData(data: {
        geojsonData: { data: geojson.GeoJsonObject; alias?: string }[];
        gpxData: { data: string; alias?: string }[];
        gpxIcons: {
            start: string;
            end: string;
            waypoint: string;
        };
    }) {
        this.geojsonData = [
            ...(this.geojsonData ?? []),
            ...(data.geojsonData ?? [])
        ];
        this.gpxData = [...(this.gpxData ?? []), ...(data.gpxData ?? [])];
        this.gpxIcons = {
            ...{
                start: null,
                end: null,
                waypoint: null
            },
            ...(this.gpxIcons ?? {}),
            ...data.gpxIcons
        };
        /* this.addFeatures(); */
    }
    log(text: string) {
        log(this.verbose, this.id, text);
    }
    remove() {
        this.stopDrawingContext();
        this.leafletInstance.remove();
        this.contentEl.detach();
        this.rendered = false;
        this.trigger("removed");
    }
    removeMarker(markerToRemove: Marker) {
        const marker = this.markers.find(({ id }) => id == markerToRemove.id);
        if (!marker) return;

        marker.remove();
        this.markers = this.markers.filter(({ id }) => id != marker.id);

        this.trigger("markers-updated");
        this.trigger("should-save");
    }
    registerScope() {
        this.plugin.app.keymap.pushScope(this.escapeScope);
    }
    resetZoom() {
        if (!this.rendered) return;
        this.leafletInstance.invalidateSize();
        this.log(`Element added to note, resetting zoom.`);
        if (this.zoomDistance) {
            this.log(`Zooming by distance.`);
            this.setZoomByDistance(this.zoomDistance);
        }
        if (this.options.zoomFeatures) {
            this.log(`Zooming to features.`);
            this.leafletInstance.fitBounds(this.featureLayer.getBounds());
            const { lat, lng } = this.featureLayer.getBounds().getCenter();

            this.log(`Features center: [${lat}, ${lng}]`);
            this.setInitialCoords([lat, lng]);
            this.zoom.default = this.leafletInstance.getBoundsZoom(
                this.featureLayer.getBounds()
            );
        }
        if (this.options.zoomMarkers) {
            this.log(`Zooming to markers.`);

            this.zoomAllMarkers();
            return;
        }
        this.log(
            `Resetting map view to [${this.initialCoords[0]}, ${this.initialCoords[1]}], zoom ${this.zoom.default}.`
        );
        this.leafletInstance.setView(this.initialCoords, this.zoom.default);
    }
    abstract setInitialCoords(coords: [number, number]): void;

    zoomAllMarkers() {
        const group = L.featureGroup(
            this.displayed.map(({ leafletInstance }) => leafletInstance)
        );
        if (!group || !group.getLayers().length) {
            this.leafletInstance.fitWorld();
            return;
        }
        this.log(`Moving to display ${group.getLayers().length} markers.`);
        this.leafletInstance.fitBounds(group.getBounds(), {
            maxZoom: this.leafletInstance.getBoundsZoom(group.getBounds())
        });
    }

    sortOverlays() {
        if (!this.overlays.length) return;
        this.log(`Sorting overlays.`);
        this.overlays.sort((a, b) => {
            return b.radiusInMeters - a.radiusInMeters;
        });

        for (let overlay of this.overlays) {
            overlay.leafletInstance.bringToFront();
        }

        this.log(`Overlays sorted.`);
    }
    setZoomByDistance(zoomDistance: number) {
        if (!zoomDistance) {
            this.zoom.default = this.options.defaultZoom;
        }
        const circle = L.circle(this.initialCoords, {
            radius: zoomDistance,
            fillOpacity: 0,
            opacity: 0
        });
        circle.addTo(this.leafletInstance);
        this.zoom.default = this.leafletInstance.getBoundsZoom(
            circle.getBounds()
        );
        circle.remove();
    }
    stopDrawingContext() {
        this.isDrawing = false;
        this.plugin.app.keymap.popScope(this.escapeScope);

        this.leafletInstance.off("mousemove");
        this.leafletInstance.off("mouseout");

        this.previousDistanceLines = [];
        if (this.distanceLines.length) {
            for (const line of this.distanceLines) {
                line.unbindTooltip();
                line.remove();
                this.previousDistanceLines.push(line);
            }
            this.distanceLines = [];
        }
        if (this.tempCircle) {
            this.tempCircle.remove();
            this.tempCircle = undefined;
        }
    }
    toProperties(): SavedMapData {
        return {
            id: this.id,
            locked: this.options.lock,
            lastAccessed: Date.now(),
            markers: this.markers
                .filter(({ mutable }) => mutable)
                .map((marker) => marker.toProperties()),
            overlays: this.overlays
                .filter(({ mutable }) => mutable)
                .map((overlay) => overlay.toProperties()),
            shapes: this.controller.toProperties()
        };
    }
    unregisterScope() {
        this.plugin.app.keymap.popScope(this.escapeScope);
    }

    updateMarkerIcons() {
        /** Add New Marker Types To Filter List */
        this.markerIcons.forEach(({ type }) => {
            if (!this.markerIcons.has(type)) {
                this.displaying.set(type, true);
                this.currentGroup.markers[type] = L.layerGroup();
            }
        });

        this.markers.forEach((marker) => {
            let icon = this.markerIcons.get(marker.type) ?? this.defaultIcon;
            marker.icon = icon;
        });
        /** Remove Old Marker Types From Filter List */
        [...this.displaying].forEach(([type]) => {
            if (this.markerTypes.includes(type) || type == "custom") return;

            this.displaying.delete(type);

            if (!this.currentGroup.markers.default) {
                this.currentGroup.markers.default = L.layerGroup();
                this.displaying.set("default", true);
                this.currentGroup.markers.default.addTo(
                    this.currentGroup.group
                );
            }
            this.currentGroup.markers[type]
                ?.getLayers()
                ?.forEach((layer) =>
                    this.currentGroup.markers.default.addLayer(layer)
                );

            delete this.currentGroup.markers[type];
        });
    }
}

export class RealMap extends BaseMap {
    CRS = L.CRS.EPSG3857;
    mapLayers: LayerGroup<L.TileLayer>[] = [];

    type: "real" = "real";

    get plugin() {
        return this.renderer.plugin;
    }

    constructor(
        public renderer: LeafletRenderer,
        public options: LeafletMapOptions
    ) {
        super(renderer, options);
        this.createMap();
    }

    get bounds() {
        return this.leafletInstance.getBounds();
    }

    get scale() {
        return convert(1).from("m").to(this.unit);
    }

    setInitialCoords(coords: [number, number]) {
        this.initialCoords = coords;
    }

    async buildLayer(layer: {
        data: string;
        id: string;
        alias?: string;
        subdomains?: string[];
    }) {
        if (layer.data.contains("openstreetmap")) {
            new Notice(
                t(
                    "OpenStreetMap has restricted the use of its tile server in Obsidian. Your map may break at any time. Please switch to a different tile server."
                )
            );
        }
        const subdomainsValue = layer.subdomains
            ? layer.subdomains
            : this.plugin.data.defaultTileSubdomains
            ? this.plugin.data.defaultTileSubdomains
                  .split(TILE_SUBDOMAINS_SPILT)
                  .filter((s) => s)
                  .map((s) => s.trim())
            : DEFAULT_TILE_SUBDOMAINS;
        const tileLayer = L.tileLayer(layer.data, {
            ...(layer.data.contains("stamen-tiles")
                ? {
                      attribution: DEFAULT_ATTRIBUTION
                  }
                : {
                      attribution: this.plugin.data.defaultAttribution,
                      subdomains: subdomainsValue
                  }),
            className: this.options.darkMode ? "dark-mode" : ""
        });

        const markerGroups = Object.fromEntries(
            this.markerTypes.map((type) => [type, L.layerGroup()])
        );
        markerGroups.custom = L.layerGroup();
        const overlayGroups = {
            none: L.layerGroup(),
            ...Object.fromEntries(
                this.markerTypes.map((type) => [type, L.layerGroup()])
            )
        };
        const group = L.layerGroup([
            tileLayer,
            ...Object.values(markerGroups),
            ...Object.values(overlayGroups)
        ]);

        this.mapLayers.push({
            group: group,
            layer: tileLayer,
            id: layer.id ?? "real",
            markers: markerGroups,
            overlays: overlayGroups
        });

        if (this.layerControlAdded) {
            this.layerControl.addBaseLayer(
                group,
                layer.alias ?? `Layer ${this.mapLayers.length}`
            );
        }

        this.trigger(
            `layer-ready-for-features`,
            this.mapLayers[this.mapLayers.length - 1].id
        );

        return tileLayer;
    }

    async render(options: {
        coords: [number, number];
        zoomDistance: number;
        imageOverlayData: {
            id: string;
            data: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[];
    }) {
        this.renderOptions = {
            coords: options.coords,
            zoomDistance: options.zoomDistance
        };
        this.imageOverlayData = options.imageOverlayData;
        this.log("Beginning render process.");
        this.start = Date.now();

        this.log("Building initial map layer.");

        const tileServer =
            this.plugin.app.vault.config.theme == "moonstone"
                ? this.plugin.data.defaultTile
                : this.plugin.data.defaultTileDark;

        let osmLayer = {
            id: "real",
            data: tileServer,
            alias:
                tileServer ==
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    ? "OpenStreetMap"
                    : "Tile Server"
        };

        const layers: {
            id: string;
            data: string;
            alias?: string;
            subdomains?: string[];
        }[] = [];
        for (let tileLayer of this.options.tileLayer) {
            const [id, alias] = tileLayer.split("|");
            if (!id) {
                new Notice(
                    t(
                        "There was an issue parsing the tile layer: %1",
                        tileLayer
                    )
                );
                continue;
            }

            layers.push({
                id,
                data: id,
                alias,
                subdomains: this.options.tileSubdomains
            });
        }

        if (this.options.osmLayer || !layers.length) {
            if (!this.options.osmLayer) {
                new Notice(
                    t(
                        "OpenStreetMap cannot be turned off without specifying additional tile servers."
                    )
                );
            }
            layers.unshift(osmLayer);
        }

        this.currentLayer = await this.buildLayer(layers[0]);

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;

            this.log(
                `Initial map layer rendered in ${
                    (Date.now() - this.start) / 1000
                } seconds.`
            );
            this.trigger("rendered");
        });
        this.trigger("first-layer-ready", this.mapLayers[0].id);

        if (layers.length > 1) {
            this.log("Building additional layers in the background.");
            for (let layer of layers.slice(1)) {
                await this.buildLayer(layer);
            }
        }
    }
}
export class ImageMap extends BaseMap {
    CRS = L.CRS.Simple;
    currentLayer: L.ImageOverlay;
    dimensions: { h: number; w: number };
    mapLayers: LayerGroup<L.ImageOverlay>[] = [];
    type: "image" = "image";
    readyToRender: boolean;
    get plugin() {
        return this.renderer.plugin;
    }

    constructor(
        public renderer: LeafletRenderer,
        public options: LeafletMapOptions
    ) {
        super(renderer, options);
        this.createMap();
    }

    get bounds() {
        return this.currentLayer.getBounds();
    }

    get scale() {
        return this.options.scale ?? 1;
    }

    setInitialCoords(coords: [number, number]) {
        let mult: [number, number] = [1, 1];
        if (!this.options.bounds) {
            mult = [
                this.bounds.getCenter().lat / 50,
                this.bounds.getCenter().lng / 50
            ];
        }
        this.initialCoords = [coords[0] * mult[0], coords[1] * mult[1]];
    }
    private _buildMapLayer(layer: {
        data: string;
        id: string;
        alias?: string;
        h: number;
        w: number;
    }): LayerGroup<L.ImageOverlay> {
        if (!this.mapLayers.length) {
            this.log("map.ts: 1494: Building initial map layer. ");
        }
        const { h, w } = layer;

        this.dimensions = { h, w };

        let bounds: L.LatLngBounds;
        if (this.options.bounds?.length) {
            bounds = new L.LatLngBounds(...this.options.bounds);
        } else {
            const southWest = this.leafletInstance.unproject(
                [0, h],
                this.zoom.max - 1
            );
            const northEast = this.leafletInstance.unproject(
                [w, 0],
                this.zoom.max - 1
            );
            bounds = new L.LatLngBounds(southWest, northEast);
        }

        const mapLayer = L.imageOverlay(layer.data, bounds, {
            className: this.options.darkMode ? "dark-mode" : "",
            pane: "base-layer"
        });

        const markerGroups = Object.fromEntries(
            this.markerTypes.map((type) => [type, L.layerGroup()])
        );
        markerGroups.custom = L.layerGroup();

        const overlayGroups = {
            none: L.layerGroup(),
            ...Object.fromEntries(
                this.markerTypes.map((type) => [type, L.layerGroup()])
            )
        };
        const group = L.layerGroup([
            mapLayer,
            ...Object.values(markerGroups),
            ...Object.values(overlayGroups)
        ]);

        const layerGroup: LayerGroup<L.ImageOverlay> = {
            group: group,
            layer: mapLayer,
            id: layer.id,
            markers: markerGroups,
            overlays: overlayGroups,
            dimensions: [w, h],
            alias: layer.alias
        };

        return layerGroup;
    }
    async buildLayer(layer: ImageLayerData) {
        const newLayer = this._buildMapLayer(layer);

        this.mapLayers.push(newLayer);
        this.trigger(`layer-ready-for-features`, newLayer.id);
        if (this.mapLayers.length === 1) {
            this.currentLayer = this.mapLayers[0].layer;
            this.trigger("first-layer-ready", this.currentGroup.id);
            if (this.options.recenter) {
                this.leafletInstance.setMaxBounds(this.bounds);
            }
        }

        this.layerControl.addBaseLayer(
            newLayer.group,
            layer.alias ?? `Layer ${this.mapLayers.length}`
        );

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;
            this.log(
                `Initial map layer rendered in ${
                    (Date.now() - this.start) / 1000
                } seconds.`
            );
            this.trigger("rendered");
        });

        return newLayer.layer;
    }
    async render(options: {
        coords: [number, number];
        zoomDistance: number;
        imageOverlayData: {
            id: string;
            data: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[];
    }) {
        this.renderOptions = {
            coords: options.coords,
            zoomDistance: options.zoomDistance
        };
        this.imageOverlayData = options.imageOverlayData;

        this.log("Beginning render process.");
        this.start = Date.now();

        this.trigger("ready-to-render");
        this.readyToRender = true;
    }
    registerLayerToBuild(layer: ImageLayerData) {
        if (this.readyToRender) {
            this.buildLayer(layer);
        } else {
            this.on("ready-to-render", () => {
                this.buildLayer(layer);
            });
        }
    }
}
