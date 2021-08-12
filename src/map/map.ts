import convert from "convert";
import { Length } from "convert/dist/types/units";
import { locale } from "moment";
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
    BaseMap as BaseMapDefinition
} from "src/@types";

import { Marker } from "src/layer";
import { Overlay } from "src/layer";

import { OverlayContextModal } from "src/modals/context";

import {
    DEFAULT_MAP_OPTIONS,
    DISTANCE_DECIMALS,
    getId,
    getImageDimensions,
    LAT_LONG_DECIMALS,
    log
} from "src/utils";

import { popup } from "./popup";

import { LeafletSymbol } from "../utils/leaflet-import";
import { TileLayer } from "leaflet";
let L = window[LeafletSymbol];
export abstract class BaseMap<T extends L.ImageOverlay | L.TileLayer>
    extends Events
    implements BaseMapDefinition<T>
{
    isDrawing: boolean = false;
    private escapeScope: Scope;
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

        this.leafletInstance = L.map(this.contentEl, {
            crs: this.CRS,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta,
            wheelPxPerZoomLevel: 60 * (1 / this.zoom.delta),
            worldCopyJump: true,
            ...(this.plugin.isDesktop ? { fullscreenControl: true } : {})
        });
        this.leafletInstance.createPane("base-layer");

        this.escapeScope = new Scope();
        this.escapeScope.register(undefined, "Escape", () => {
            if (!this.isFullscreen) {
                this.stopDrawingContext();
                this.plugin.app.keymap.popScope(this.escapeScope);
            }
        });
    }

    contentEl: HTMLElement = createDiv();
    currentLayer: T;
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
    mapLayers: LayerGroup[] = [];
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

    verbose: boolean;

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
        console.log("🚀 ~ file: map.ts ~ line 123 ~ markers", markers);
        let toReturn: Marker[] = [];
        for (const marker of markers) {
            console.log("🚀 ~ file: map.ts ~ line 137 ~ marker", marker);
            if (!this.markerTypes.includes(marker.type)) {
                new Notice(
                    `Marker type "${marker.type}" does not exist, using default.`
                );
                marker.type = "default";
            }
            const markerIcon = this.markerIcons.get(marker.type);

            const mapIcon = markerIcon?.icon ?? this.defaultIcon.icon;

            //@ts-expect-error
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

    onMarkerClick(marker: Marker, evt: L.LeafletMouseEvent) {}

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
            //@ts-expect-error
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
                    marker: marker.id
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
    abstract buildLayer(layer?: {
        data: string;
        id: string;
        alias?: string;
    }): Promise<T>;
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
    handleMapContext(evt: L.LeafletMouseEvent, overlay?: Overlay) {
        if (overlay) {
            const under = this.getOverlaysUnderClick(evt);
            if (!under.length) {
                under.push(overlay);
            }

            const openOverlayContext = (overlay: Overlay) => {
                //@ts-expect-error
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
            log(this.verbose, this.id, `Beginning overlay drawing context.`);
            //begin drawing context

            this.beginOverlayDrawingContext(evt);

            return;
        }

        if (this.markerIcons.size <= 1) {
            log(
                this.verbose,
                this.id,
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

        log(this.verbose, this.id, `Opening marker context menu.`);
        this.markerIcons.forEach((marker: MarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.setActive(true);
                item.onClick(async () => {
                    log(
                        this.verbose,
                        this.id,
                        `${marker.type} selected. Creating marker.`
                    );
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
        log(this.verbose, this.id, `Sorting overlays.`);
        this.overlays.sort((a, b) => {
            return b.radiusInMeters - a.radiusInMeters;
        });

        for (let overlay of this.overlays) {
            overlay.leafletInstance.bringToFront();
        }

        log(this.verbose, this.id, `Overlays sorted.`);
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
        if (this.distanceEvent) {
            this.distanceEvent = undefined;

            this.distanceLine.unbindTooltip();
            this.distanceLine.remove();

            /** Get Last Distance */
            const latlngs =
                this.previousDistanceLine.getLatLngs() as L.LatLng[];
            const display = this.distance(latlngs[0], latlngs[1]);
            //this.distanceDisplay.setText(display);
        }
        if (this.tempCircle) {
            this.tempCircle.remove();
            this.tempCircle = undefined;
        }
        this.leafletInstance.off("mousemove");
        this.leafletInstance.off("mouseout");
    }
    toProperties(): SavedMapData {
        return {};
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

export class RealMap extends BaseMap<L.TileLayer> {
    CRS = L.CRS.EPSG3857;
    popup: Popup = popup(this);
    type: "real" = "real";

    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions
    ) {
        super(plugin, options);
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
                /* data: "real", */
                markers: markerGroups,
                overlays: overlayGroups
            }
        ];
        this.trigger(`layer-ready-for-features`, this.mapLayers[0]);

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;

            log(
                this.verbose,
                this.id,
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
        layer: { data: string; id: string };
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

        this.currentGroup.group.addTo(this.leafletInstance);
    }
}
export class ImageMap extends BaseMap<L.ImageOverlay> {
    CRS = L.CRS.Simple;
    popup: Popup = popup(this);
    type: "image" = "image";
    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions
    ) {
        super(plugin, options);
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
    private async _buildMapLayer(layer: {
        data: string;
        id: string;
        alias?: string;
    }): Promise<LayerGroup> {
        const { h, w } = await getImageDimensions(layer.data);

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

        const layerGroup: LayerGroup = {
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
    async buildLayer(layer: { data: string; id: string; alias?: string }) {
        this.leafletInstance.on(
            "baselayerchange",
            ({ layer }: L.LayersControlEvent) => {
                // need to do this to prevent panning animation for some reason
                this.leafletInstance.setMaxBounds([undefined, undefined]);
                this.currentLayer = (
                    layer as L.LayerGroup
                ).getLayers()[0] as L.ImageOverlay;
                this.leafletInstance.panTo(this.bounds.getCenter(), {
                    animate: false
                });
                this.leafletInstance.setMaxBounds(this.bounds);
            }
        );

        const newLayer = await this._buildMapLayer(layer);

        this.mapLayers.push(newLayer);
        this.trigger(`layer-ready-for-features`, newLayer);

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;

            log(
                this.verbose,
                this.id,
                `Initial map layer rendered in ${
                    Date.now() /*  - this._start */ / 1000
                } seconds.`
            );
            this.trigger("rendered");
        });
        return newLayer.layer as L.ImageOverlay;
    }
    async render(options: {
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
    }) {
        log(this.verbose, this.id, "Beginning render process.");
        this.currentLayer = await this.buildLayer(options.layer);

        this.trigger("first-layer-ready", this.currentGroup);

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

        this.leafletInstance.on(
            "contextmenu",
            this.handleMapContext.bind(this)
        );
        //this.leafletInstance.on("click", this._handleMapClick.bind(this));

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

        this.currentGroup.group.addTo(this.leafletInstance);
    }
}

interface SavedMapData {}

export function formatNumber(number: number, digits: number) {
    return Number(
        new Intl.NumberFormat(locale(), {
            style: "decimal",
            maximumFractionDigits: digits
        }).format(number)
    );
}

export function formatLatLng(latlng: L.LatLng) {
    return {
        lat: formatNumber(latlng.lat, LAT_LONG_DECIMALS),
        lng: formatNumber(latlng.lng, LAT_LONG_DECIMALS)
    };
}

export async function copyToClipboard(loc: L.LatLng): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        navigator.clipboard
            .writeText(
                `${formatNumber(loc.lat, LAT_LONG_DECIMALS)}, ${formatNumber(
                    loc.lng,
                    LAT_LONG_DECIMALS
                )}`
            )
            .then(() => {
                new Notice("Coordinates copied to clipboard.");
                resolve();
            })
            .catch(() => {
                new Notice(
                    "There was an error trying to copy coordinates to clipboard."
                );
                reject();
            });
    });
}
