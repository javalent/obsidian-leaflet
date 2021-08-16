import convert from "convert";
import { Length } from "convert/dist/types/units";

import { Events, Menu, Notice, Point, Scope } from "obsidian";
import {
    LayerGroup,
    LeafletMapOptions,
    MarkerIcon,
    ObsidianLeaflet,
    Popup,
    SavedMarkerProperties,
    SavedOverlayData,
    TooltipDisplay,
    BaseMap as BaseMapDefinition,
    BaseMapType,
    ImageLayerData,
    SavedMapData
} from "src/@types";

import { GPX, Marker, GeoJSON, Overlay } from "src/layer";

import { OverlayContextModal } from "src/modals/context";

import {
    copyToClipboard,
    DEFAULT_MAP_OPTIONS,
    DISTANCE_DECIMALS,
    formatLatLng,
    formatNumber,
    getId,
    getImageDimensions,
    icon,
    log,
    MODIFIER_KEY
} from "src/utils";

import { popup } from "./popup";

import {
    distanceDisplay,
    filterMarkerControl,
    resetZoomControl,
    zoomControl
} from "../controls/controls";

import { LeafletSymbol } from "../utils/leaflet-import";
let L = window[LeafletSymbol];

export abstract class BaseMap /* <T extends L.ImageOverlay | L.TileLayer> */
    extends Events
    implements BaseMapDefinition
{
    /* <T> */
    isDrawing: boolean = false;
    private escapeScope: Scope;
    distanceDisplay: any;
    /** Abstract */
    /* abstract initialize(): void; */
    abstract render(options: {
        coords: [number, number];
        zoomDistance: number;
        layer: { data: string; id: string };
        hasAdditional?: boolean;
        imageOverlays?: {
            id: string;
            data: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[];
    }): Promise<void>;
    abstract popup: Popup;
    type: string;
    abstract get bounds(): L.LatLngBounds;

    abstract get scale(): number;
    CRS: L.CRS;

    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions
    ) {
        super();
        this.contentEl.style.height = options.height;
        this.contentEl.style.width = "100%";
        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);
        /** Stop Touchmove Propagation for Mobile */
        this.contentEl.addEventListener("touchmove", (evt) => {
            evt.stopPropagation();
        });

        this.escapeScope = new Scope();
        this.escapeScope.register(undefined, "Escape", () => {
            if (!this.isFullscreen) {
                this.stopDrawingContext();
                this.plugin.app.keymap.popScope(this.escapeScope);
            }
        });
    }

    createMap() {
        this.leafletInstance = L.map(this.contentEl, {
            crs: this.CRS,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta,
            wheelPxPerZoomLevel: 60 * (1 / this.zoom.delta),
            worldCopyJump: this.type === "real",
            ...(this.plugin.isDesktop ? { fullscreenControl: true } : {})
        });
        this.leafletInstance.createPane("base-layer");

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
                marker.layer === this.currentGroup.id &&
                this.displaying.get(marker.type)
        );
    }

    private distanceEvent: L.LatLng = undefined;
    private distanceLine: L.Polyline;
    private previousDistanceLine: L.Polyline;
    featureLayer: L.FeatureGroup;

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
            this.plugin.markerIcons.map((markerIcon) => [
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

    unit: Length = "m";

    /** Marker Methods */
    addMarker(...markers: SavedMarkerProperties[]) {
        console.log("🚀 ~ file: map.ts ~ line 189 ~ markers", markers);
        let toReturn: Marker[] = [];
        for (const marker of markers) {
            if (!this.markerTypes.includes(marker.type)) {
                new Notice(
                    `Marker type "${marker.type}" does not exist, using default.`
                );
                marker.type = "default";
            }
            const markerIcon = this.markerIcons.get(marker.type);

            const mapIcon = markerIcon?.icon ?? this.defaultIcon.icon;

            if (!this.displaying.has(marker.type)) {
                this.displaying.set(marker.type, true);
            }
            const newMarker = new Marker(this, {
                id: marker.id,
                type: marker.type,
                loc: L.latLng(marker.loc),
                link: marker.link,
                icon: mapIcon,
                layer: marker.layer
                    ? marker.layer
                    : this.currentGroup?.id ?? null,
                mutable: marker.mutable ?? false,
                command: marker.command ?? false,
                zoom: this.leafletInstance.getMaxZoom(),
                percent: marker.percent,
                description: marker.description,
                tooltip:
                    marker.tooltip ?? this.plugin.data.displayMarkerTooltips
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
        this.handleMapDistance(evt);
    }

    updateMarker(marker: Marker) {
        const existing = this.markers.find((m) => m.id == marker.id);

        this.displaying.delete(existing.type);
        this.displaying.set(marker.type, true);

        existing.link = marker.link;
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
    beginOverlayDrawingContext(original: L.LeafletMouseEvent, marker?: Marker) {
        this.plugin.app.keymap.pushScope(this.escapeScope);

        this.isDrawing = true;

        this.tempCircle = L.circle(original.latlng, {
            radius: 1,
            color: this.options.overlayColor
        });
        this.leafletInstance.once("click", async () => {
            if (this.tempCircle) {
                this.log(`Overlay drawing complete.`);
                this.tempCircle.remove();

                this.createOverlay({
                    radius: this.tempCircle.getRadius(),
                    color: this.tempCircle.options.color,
                    loc: [
                        this.tempCircle.getLatLng().lat,
                        this.tempCircle.getLatLng().lng
                    ],
                    layer: this.currentGroup.id,
                    unit: "m",
                    desc: "",
                    mutable: true,
                    marker: marker?.id ?? null
                });

                await this.plugin.saveSettings();
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

    addFeatures() {
        /** Add GeoJSON to map */
        this.featureLayer = L.featureGroup();
        let added: number;
        if (this.options.geojson.length > 0) {
            this.log(
                `Adding ${this.options.geojson.length} GeoJSON features to map.`
            );
            this.leafletInstance.createPane("geojson");

            added = 0;
            this.options.geojson.forEach((geoJSON) => {
                try {
                    const geo = new GeoJSON(
                        this as BaseMapType,
                        this.featureLayer,
                        { color: this.options.geojsonColor },
                        geoJSON
                    );

                    geo.leafletInstance.addTo(this.featureLayer);

                    added++;
                } catch (e) {
                    console.error(e);
                    new Notice(
                        "There was an error adding GeoJSON to map " + this.id
                    );
                    return;
                }
            });

            this.log(
                `${added} GeoJSON feature${added == 1 ? "" : "s"} added to map.`
            );
        }

        /** Add GPX to map */
        if (this.options.gpx.length > 0) {
            this.log(`Adding ${this.options.gpx.length} GPX features to map.`);

            for (let gpx of this.options.gpx) {
                const gpxInstance = new GPX(
                    this as BaseMapType,
                    gpx,
                    {},
                    this.options.gpxIcons
                );
                gpxInstance.leafletInstance.addTo(this.featureLayer);
            }
        }

        if (this.options.geojson.length || this.options.gpx.length) {
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
        /* if (options.imageOverlays.length) {
            this._addLayerControl();
            this.map.createPane("image-overlay");
            for (let overlay of options.imageOverlays) {
                let bounds = overlay.bounds.length
                    ? overlay.bounds
                    : this.bounds;

                const image = L.imageOverlay(overlay.data, bounds, {
                    pane: "image-overlay"
                });

                this._layerControl.addOverlay(image, overlay.alias);
            }
        } */
    }
    buildControls() {
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
        filterMarkerControl({ position: "topright" }, this).addTo(
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
            this.previousDistanceLine,
            this
        ).addTo(this.leafletInstance);
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
    getMarkerById(id: string): Marker {
        return this.markers.find(({ id: marker }) => marker === id);
    }
    getOverlaysUnderClick(evt: L.LeafletMouseEvent) {
        const overlays = [...this.overlays].filter(
            (overlay) =>
                overlay.isUnder(evt) && overlay.layer === this.currentGroup.id
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
        this.handleMapDistance(evt);
        if (
            evt.originalEvent.getModifierState("Shift") ||
            evt.originalEvent.getModifierState("Alt")
        ) {
            this.log(`Map popup context detected. Opening popup.`);
            const latlng = formatLatLng(evt.latlng);
            this.popup.open(evt.latlng, `[${latlng.lat}, ${latlng.lng}]`);
            if (
                this.data.copyOnClick &&
                evt.originalEvent.getModifierState(MODIFIER_KEY)
            ) {
                this.log(`Copying coordinates of click to clipboard.`);
                await copyToClipboard(evt.latlng);
            }
        }
    }
    handleMapDistance(evt: L.LeafletMouseEvent) {
        if (
            (!evt.originalEvent.getModifierState("Shift") &&
                !evt.originalEvent.getModifierState("Alt")) ||
            evt.originalEvent.getModifierState("Control")
        ) {
            if (this.distanceEvent != undefined) {
                this.stopDrawingContext();
            }
            return;
        }
        if (this.distanceEvent != undefined) {
            this.log(`Distance measurement context ending.`);
            this.previousDistanceLine = this.distanceLine;
            this.distanceLine = null;
            this.stopDrawingContext();
        } else {
            this.log(`Distance measurement context starting.`);
            this.distanceEvent = evt.latlng;

            this.isDrawing = true;
            this.plugin.app.keymap.pushScope(this.escapeScope);

            const distanceTooltip = L.tooltip({
                permanent: true,
                direction: "top",
                sticky: true
            });

            this.distanceLine = L.polyline([this.distanceEvent, evt.latlng]);

            this.distanceLine.addTo(this.leafletInstance);

            this.distanceLine.bindTooltip(distanceTooltip);

            this.leafletInstance.on(
                "mousemove",
                (mvEvt: L.LeafletMouseEvent) => {
                    const latlng = mvEvt.latlng;
                    const delta = [
                        latlng.lat - this.distanceEvent.lat,
                        latlng.lng - this.distanceEvent.lng
                    ];

                    if (mvEvt.originalEvent.getModifierState("Shift")) {
                        if (delta[0] > delta[1]) {
                            latlng.lng = this.distanceEvent.lng;
                        } else {
                            latlng.lat = this.distanceEvent.lat;
                        }
                    }

                    if (
                        !this.markers.find((m) => m.isBeingHovered) ||
                        mvEvt.originalEvent.getModifierState(MODIFIER_KEY)
                    ) {
                        this.distanceLine.setLatLngs([
                            this.distanceEvent,
                            latlng
                        ]);
                    } else {
                        this.distanceLine.setLatLngs([
                            this.distanceEvent,
                            this.markers.find((m) => m.isBeingHovered).loc
                        ]);
                    }

                    /** Get New Distance */
                    const latlngs =
                        this.distanceLine.getLatLngs() as L.LatLng[];
                    const display = this.distance(latlngs[0], latlngs[1]);

                    /** Update Distance Line Tooltip */
                    distanceTooltip.setContent(display);
                    distanceTooltip.setLatLng(latlng);

                    if (!this.distanceLine.isTooltipOpen()) {
                        distanceTooltip.openTooltip();
                    }

                    this.distanceDisplay.setText(display);
                    this.distanceLine.redraw();
                }
            );

            this.leafletInstance.on("mouseout", () => {
                this.stopDrawingContext();
                this.distanceEvent = undefined;
            });
        }
    }
    handleMapContext(evt: L.LeafletMouseEvent, overlay?: Overlay) {
        if (overlay) {
            const under = this.getOverlaysUnderClick(evt);
            if (!under.length) {
                under.push(overlay);
            }

            const openOverlayContext = (overlay: Overlay) => {
                const modal = new OverlayContextModal(overlay, this);
                modal.onClose = async () => {
                    if (modal.deleted) {
                        this.log("Overlay deleted in context menu. Removing.");
                        overlay.remove();
                        this.overlays = this.overlays.filter(
                            (o) => o != overlay
                        );
                        this.trigger("markers-updated");

                        return;
                    }
                    try {
                        overlay.data.color = modal.tempOverlay.color;
                        overlay.data.radius = modal.tempOverlay.radius;
                        overlay.data.desc = modal.tempOverlay.desc;
                        overlay.data.tooltip = modal.tempOverlay.tooltip;
                        let newRadius = convert(Number(overlay.data.radius))
                            .from(overlay.data.unit ?? "m")
                            .to(this.type == "image" ? this.unit : "m");

                        if (this.type == "image") {
                            newRadius = newRadius / this.scale;
                        }

                        overlay.leafletInstance.setRadius(newRadius);
                        overlay.leafletInstance.setStyle({
                            color: overlay.data.color
                        });

                        await this.plugin.saveSettings();
                    } catch (e) {
                        console.error(
                            "There was an error saving the overlay.\n\n" + e
                        );
                    }
                };
                modal.open();
            };

            let contextMenu = new Menu(this.plugin.app);

            contextMenu.setNoIcon();
            contextMenu.addItem((item) => {
                item.setTitle("Create Marker");
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
                        this.leafletInstance.fitBounds(
                            overlay.leafletInstance.getBounds()
                        );
                    };
                });
            });

            contextMenu.showAtPosition({
                x: evt.originalEvent.clientX,
                y: evt.originalEvent.clientY
            });
            return;
        }

        if (evt.originalEvent.getModifierState("Shift")) {
            this.log(`Beginning overlay drawing context.`);
            //begin drawing context

            this.beginOverlayDrawingContext(evt);

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

        let contextMenu = new Menu(this.plugin.app);

        contextMenu.setNoIcon();

        this.log(`Opening marker context menu.`);
        this.markerIcons.forEach((marker: MarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.setActive(true);
                item.onClick(async () => {
                    this.log(`${marker.type} selected. Creating marker.`);
                    this.createMarker(
                        marker.type,
                        [evt.latlng.lat, evt.latlng.lng],
                        undefined
                    );
                    await this.plugin.saveSettings();
                });
            });
        });

        contextMenu.showAtPosition({
            x: evt.originalEvent.clientX,
            y: evt.originalEvent.clientY
        } as Point);
    }
    isLayerRendered(layer: string) {
        return this.mapLayers.find(({ id }) => id === layer) ? true : false;
    }
    log(text: string) {
        log(this.verbose, this.id, text);
    }
    remove() {

        this.stopDrawingContext();
        this.leafletInstance.remove();

    }
    removeMarker(marker: Marker) {
        if (!marker) return;

        marker.remove();
        this.markers = this.markers.filter(({ id }) => id != marker.id);

        this.trigger("markers-updated");
    }

    resetZoom() {
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
        this.log(
            `Resetting map view to [${this.initialCoords[0]}, ${this.initialCoords[1]}], zoom ${this.zoom.default}.`
        );
        this.leafletInstance.setView(this.initialCoords, this.zoom.default);
    }
    abstract setInitialCoords(coords: [number, number]): void;

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
        if (this.distanceEvent) {
            this.distanceEvent = undefined;

            this.distanceLine.unbindTooltip();
            this.distanceLine.remove();

            /** Get Last Distance */
            if (this.previousDistanceLine) {
                const latlngs =
                    this.previousDistanceLine.getLatLngs() as L.LatLng[];
                const display = this.distance(latlngs[0], latlngs[1]);
                this.distanceDisplay.setText(display);
            }
        }
        if (this.tempCircle) {
            this.tempCircle.remove();
            this.tempCircle = undefined;
        }
    }
    toProperties(): SavedMapData {
        return {
            id: this.id,
            lastAccessed: Date.now(),
            markers: this.markers
                .filter(({ mutable }) => mutable)
                .map((marker) => marker.toProperties()),
            overlays: this.overlays
                .filter(({ mutable }) => mutable)
                .map((overlay) => overlay.toProperties())
        };
    }
    //TODO: REWRITE
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
            if (this.markerTypes.includes(type)) return;

            this.displaying.delete(type);

            if (!this.currentGroup.markers.default) {
                this.currentGroup.markers.default = L.layerGroup();
                this.displaying.set("default", true);
                this.currentGroup.markers.default.addTo(
                    this.currentGroup.group
                );
            }
            this.currentGroup.markers[type]
                .getLayers()
                .forEach((layer) =>
                    this.currentGroup.markers.default.addLayer(layer)
                );

            delete this.currentGroup.markers[type];
        });
    }
}

export class RealMap extends BaseMap {
    CRS = L.CRS.EPSG3857;
    mapLayers: LayerGroup<L.TileLayer>[] = [];
    popup: Popup = popup(this);
    type: "real" = "real";

    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions
    ) {
        super(plugin, options);
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

    async buildLayer() {
        const layer = L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                className: this.options.darkMode ? "dark-mode" : ""
            }
        );

        const markerGroups = Object.fromEntries(
            this.markerTypes.map((type) => [type, L.layerGroup()])
        );
        const overlayGroups = {
            none: L.layerGroup(),
            ...Object.fromEntries(
                this.markerTypes.map((type) => [type, L.layerGroup()])
            )
        };
        const group = L.layerGroup([
            layer,
            ...Object.values(markerGroups),
            ...Object.values(overlayGroups)
        ]);

        this.mapLayers = [
            {
                group: group,
                layer: layer,
                id: "real",
                markers: markerGroups,
                overlays: overlayGroups
            }
        ];
        this.trigger(`layer-ready-for-features`, this.mapLayers[0]);

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;

            this.log(
                `Initial map layer rendered in ${
                    /* (Date.now() - this._start) /  */ 1000
                } seconds.`
            );
            this.trigger("rendered");
        });
        return layer;
    }

    async render(options: {
        coords: [number, number];
        zoomDistance: number;
        hasAdditional?: boolean;
        imageOverlays?: {
            id: string;
            data: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[];
    }) {
        this.log("Building initial map layer.");

        this.currentLayer = await this.buildLayer();

        this.leafletInstance.setZoom(this.zoom.default, { animate: false });

        this.trigger("first-layer-ready", this.mapLayers[0]);

        /** Move to supplied coordinates */
        this.log(`Moving to supplied coordinates: ${options.coords}`);
        this.setInitialCoords(options.coords);
        this.leafletInstance.panTo(this.initialCoords);

        if (options.zoomDistance) {
            this.zoomDistance = options.zoomDistance;
            this.setZoomByDistance(options.zoomDistance);
        }
        this.leafletInstance.setZoom(this.zoom.default, {
            animate: false
        });

        /** Bind Internal Map Events */
        this.leafletInstance.on("contextmenu", (evt: L.LeafletMouseEvent) => {
            this.handleMapContext(evt);
        });
        this.leafletInstance.on("click", () => {});

        this.leafletInstance.on("zoomanim", (evt: L.ZoomAnimEvent) => {
            //check markers
            this.markers.forEach((marker) => {
                if (marker.shouldShow(evt.zoom)) {
                    this.leafletInstance.once("zoomend", () => marker.show());
                } else if (marker.shouldHide(evt.zoom)) {
                    marker.hide();
                }
            });
        });

        this.addFeatures();

        this.currentGroup.group.addTo(this.leafletInstance);
    }
}
export class ImageMap extends BaseMap {
    CRS = L.CRS.Simple;
    currentLayer: L.ImageOverlay;
    dimensions: { h: number; w: number };
    mapLayers: LayerGroup<L.ImageOverlay>[] = [];
    popup: Popup = popup(this);
    type: "image" = "image";
    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions
    ) {
        super(plugin, options);
        this.createMap();
    }

    get bounds() {
        return this.currentLayer.getBounds();
    }

    get scale() {
        return convert(1).from("m").to(this.unit);
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
        this.trigger(`layer-ready-for-features`, newLayer);
        if (this.mapLayers.length === 1) {
            this.currentLayer = this.mapLayers[0].layer;
            this.trigger("first-layer-ready", this.currentGroup);
        }

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;
            this.log(
                `Initial map layer rendered in ${
                    Date.now() /*  - this._start */ / 1000
                } seconds.`
            );
            this.trigger("rendered");
        });

        return newLayer.layer;
    }
    async render(options: { coords: [number, number]; zoomDistance: number }) {
        this.log("Beginning render process.");

        this.leafletInstance.on(
            "contextmenu",
            this.handleMapContext.bind(this)
        );
        this.leafletInstance.on("click", this.handleMapClick.bind(this));

        this.leafletInstance.on("zoomanim", (evt: L.ZoomAnimEvent) => {
            //check markers
            this.markers.forEach((marker) => {
                if (marker.shouldShow(evt.zoom)) {
                    this.leafletInstance.once("zoomend", () => marker.show());
                } else if (marker.shouldHide(evt.zoom)) {
                    marker.hide();
                }
            });
        });

        this.addFeatures();

        this.on("first-layer-ready", () => {
            /** Move to supplied coordinates */
            this.log(`Moving to supplied coordinates: ${options.coords}`);
            this.setInitialCoords(options.coords);
            this.leafletInstance.panTo(this.initialCoords);

            if (options.zoomDistance) {
                this.zoomDistance = options.zoomDistance;
                this.setZoomByDistance(options.zoomDistance);
            }
            this.leafletInstance.setZoom(this.zoom.default, {
                animate: false
            });
            this.featureLayer.addTo(this.currentGroup.group);
            this.currentGroup.group.addTo(this.leafletInstance);
        });
    }
}
