import convert from "convert";
import type gpx from "leaflet-gpx";

import {
    Events,
    Notice,
    moment,
    Menu,
    Point,
    MarkdownRenderChild,
    TFile,
    Scope,
    setIcon,
    MarkdownPostProcessorContext
} from "obsidian";

import type { Length } from "convert/dist/types/units";

import type {
    LayerGroup,
    LeafletMapOptions,
    SavedMarkerProperties,
    MarkerIcon,
    ObsidianLeaflet,
    Marker as MarkerDefinition,
    SavedOverlayData,
    LeafletOverlay,
    TooltipDisplay
} from "./@types";
import {
    DISTANCE_DECIMALS,
    LAT_LONG_DECIMALS,
    DEFAULT_MAP_OPTIONS,
    MODIFIER_KEY
} from "./utils/constants";

import { icon, DESCRIPTION_ICON } from "./utils/icons";

import {
    getId,
    getImageDimensions,
    getHex,
    log,
    catchErrorAsync,
    catchError
} from "./utils/utils";

import {
    DistanceDisplay,
    distanceDisplay,
    editMarkers,
    filterMarkerControl,
    resetZoomControl,
    zoomControl
} from "./map";

import { OverlayContextModal } from "./modals/context";
import { LeafletSymbol } from "./utils/leaflet-import";
import { MarkerDivIcon, Popup } from "./@types/map";
import { popup } from "./map/popup";
import { Marker, GeoJSON, GPX, Overlay } from "./layer";
import Watcher from "./utils/watcher";

let L = window[LeafletSymbol];

declare module "leaflet" {
    interface Map {
        isFullscreen(): boolean;
    }
    interface MarkerOptions {
        startIcon?: MarkerDivIcon;
        endIcon?: MarkerDivIcon;
        wptIcons?: { [key: string]: MarkerDivIcon };
        startIconUrl?: null;
        endIconUrl?: null;
        shadowUrl?: null;
        wptIconUrls?: {
            "": null;
        };
    }
}

export class LeafletRenderer extends MarkdownRenderChild {
    watchers: Set<Watcher> = new Set();
    registerWatchers(watchers: Map<TFile, Map<string, string>>) {
        for (const [file, fileIds] of watchers) {
            const watcher = new Watcher(this.plugin, file, this.map, fileIds);
            this.watchers.add(watcher);
            watcher.on("remove", () => this.watchers.delete(watcher));
        }
    }
    map: LeafletMap;
    verbose: boolean;
    parentEl: HTMLElement;
    constructor(
        private plugin: ObsidianLeaflet,
        private ctx: MarkdownPostProcessorContext,
        container: HTMLElement,
        options: LeafletMapOptions = {}
    ) {
        super(container);
        this.map = new LeafletMap(plugin, {
            ...options,
            context: ctx.sourcePath
        });
        this.verbose = options.verbose;

        this.containerEl.style.height = options.height;
        this.containerEl.style.width = "100%";
        this.containerEl.style.backgroundColor = "var(--background-secondary)";

        this.parentEl = ctx.containerEl;
    }
    async onload() {
        log(
            this.verbose,
            this.map.id,
            "MarkdownRenderChild loaded. Appending map."
        );
        this.containerEl.appendChild(this.map.contentEl);

        if (!Array.from(this.parentEl.children).includes(this.containerEl)) {
            log(
                this.verbose,
                this.map.id,
                "Map element is off the page and not loaded into DOM. Will auto-detect and reset zoom."
            );
            const observer = new MutationObserver((mutationsList, observer) => {
                // Use traditional 'for loops' for IE 11
                for (const mutation of mutationsList) {
                    if (
                        mutation.type === "childList" &&
                        Array.from(this.parentEl.children).includes(
                            this.containerEl.parentElement
                        )
                    ) {
                        this.map.resetZoom();
                        observer.disconnect();
                    }
                }
            });
            observer.observe(this.parentEl, {
                attributes: false,
                childList: true,
                subtree: false
            });
        }
    }

    async onunload() {
        super.onunload();
        try {
            this.map.remove();
        } catch (e) {}

        let file = this.plugin.app.vault.getAbstractFileByPath(
            this.ctx.sourcePath
        );
        if (!file || !(file instanceof TFile)) {
            return;
        }
        let fileContent = await this.plugin.app.vault.read(file);

        let containsThisMap: boolean = false,
            r = new RegExp(
                `\`\`\`leaflet[\\s\\S]*?\\bid:(\\s?${this.map.id})\\b\\s*\\n[\\s\\S]*?\`\`\``,
                "g"
            );
        containsThisMap = fileContent.match(r)?.length > 0 || false;

        if (!containsThisMap) {
            //Block was deleted or id was changed

            let mapFile = this.plugin.mapFiles.find(
                ({ file: f }) => f === this.ctx.sourcePath
            );
            mapFile.maps = mapFile.maps.filter((mapId) => mapId != this.map.id);
        }

        await this.plugin.saveSettings();

        this.plugin.maps = this.plugin.maps.filter((m) => {
            return m.map != this.map;
        });
    }
}

/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
class LeafletMap extends Events {
    private _geojson: any[];
    private _geojsonColor: string;
    private _zoomFeatures: boolean;
    verbose: boolean;
    id: string;
    contentEl: HTMLElement;
    rendered: boolean;
    map: L.Map;
    markers: Marker[] = [];
    zoom: { min: number; max: number; default: number; delta: number };
    popup: Popup = popup(this);
    mapLayers: LayerGroup[] = [];
    layer: L.ImageOverlay | L.TileLayer;
    type: "image" | "real";
    initialCoords: [number, number];
    displaying: Map<string, boolean> = new Map();
    isDrawing: boolean = false;

    overlays: Overlay[] = [];

    unit: Length = "m";

    distanceFormatter = new Intl.NumberFormat(this.locale, {
        style: "decimal",
        maximumFractionDigits: DISTANCE_DECIMALS
    });
    latLngFormatter = new Intl.NumberFormat(this.locale, {
        style: "decimal",
        maximumFractionDigits: LAT_LONG_DECIMALS
    });

    private _resize: ResizeObserver;
    private _distanceMultipler: number = 1;
    private _distanceEvent: L.LatLng | undefined = undefined;
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

    private _scale: number;
    private _distanceDisplay: DistanceDisplay;
    private _layerControl: L.Control.Layers = L.control.layers({}, {});
    private _escapeScope: Scope;
    private _tempCircle: L.Circle;
    private _userBounds: [[number, number], [number, number]];
    private _layerControlAdded: boolean = false;
    private _start: number;
    featureLayer: L.FeatureGroup;
    private _zoomDistance: number;
    private _gpx: any[];
    private _gpxIcons: {
        waypoint: string;
        start: string;
        end: string;
    };
    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions = {}
    ) {
        super();

        this.verbose = this.options.verbose;

        this.contentEl = createDiv();
        this.contentEl.style.height = options.height;
        this.contentEl.style.width = "100%";
        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);

        this.id = this.options.id;
        this.type = this.options.type;

        this.zoom = {
            min: this.options.minZoom,
            max: this.options.maxZoom,
            default: this.options.defaultZoom,
            delta: this.options.zoomDelta
        };
        this._zoomFeatures = this.options.zoomFeatures;
        this.unit = this.options.unit as Length;
        this._scale = this.options.scale;
        this._distanceMultipler = this.options.distanceMultiplier;

        this._userBounds = this.options.bounds;

        this._escapeScope = new Scope();
        this._escapeScope.register(undefined, "Escape", () => {
            if (!this.isFullscreen) {
                this.stopDrawing();

                this.plugin.app.keymap.popScope(this._escapeScope);
            }
        });

        this._geojson = options.geojson;

        this._geojsonColor = getHex(options.geojsonColor);

        this._gpx = options.gpx;
        this._gpxIcons = options.gpxIcons;

        log(this.verbose, this.id, "Building map instance.");
        this._start = Date.now();
        this.map = L.map(this.contentEl, {
            crs: this.CRS,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta,
            wheelPxPerZoomLevel: 60 * (1 / this.zoom.delta),
            worldCopyJump: this.type === "real",
            ...(this.plugin.isDesktop ? { fullscreenControl: true } : {})
        });
    }

    get data() {
        return this.plugin.AppData;
    }

    get group() {
        return this.mapLayers?.find((group) => group.layer == this.layer);
    }
    get bounds() {
        if (this.layer instanceof L.ImageOverlay) {
            return this.layer.getBounds();
        }
        return this.map.getBounds();
    }

    /* get markerIcons() {
        return this.plugin.markerIcons;
    } */

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

    private get _markerTypesOnMap() {
        return new Set(this.markers.map(({ type }) => type));
    }

    get displayedMarkers() {
        return this.markers.filter(({ type }) => this.displaying.get(type));
    }

    get scale() {
        if (this.type !== "real") return this._scale;

        return convert(1).from("m").to(this.unit);
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
    get defaultIcon() {
        return this.markerIcons.get("default");
    }

    get isFullscreen(): boolean {
        return this.map.isFullscreen();
    }

    get locale() {
        return moment.locale();
    }
    private get _coordMult(): [number, number] {
        let mult: [number, number] = [1, 1];
        if (this.type == "image" && !this._userBounds) {
            mult = [
                this.bounds.getCenter().lat / 50,
                this.bounds.getCenter().lng / 50
            ];
        }
        return mult;
    }
    getMarkerById(id: string): Marker {
        return this.markers.find(({ id: marker }) => marker === id);
    }

    @catchErrorAsync
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
        /** Get layers
         *  Returns TileLayer (real) or ImageOverlay (image)
         */

        log(this.verbose, this.id, "Beginning render process.");

        this.map.createPane("base-layer");
        this.layer = await this._buildLayersForType(options.layer);

        /** Render map */
        switch (this.type) {
            case "real": {
                this._renderReal();
                break;
            }
            case "image": {
                this._renderImage({ hasAdditional: options.hasAdditional });
                break;
            }
        }

        this.trigger("first-layer-ready", this.group);

        /** Move to supplied coordinates */
        log(
            this.verbose,
            this.id,
            `Moving to supplied coordinates: ${options.coords}`
        );
        this.setInitialCoords(options.coords);
        this.map.panTo(this.initialCoords);

        if (options.zoomDistance) {
            this._zoomDistance = options.zoomDistance;
            this.setZoomByDistance(options.zoomDistance);
        }
        this.map.setZoom(this.zoom.default, {
            animate: false
        });

        if (
            this.type == "image" &&
            this.markers.filter((marker) => !marker.percent).length > 0
        ) {
            this.markers
                .filter((marker) => !marker.percent)
                .forEach((marker) => {
                    const { x, y } = this.map.project(
                        marker.loc,
                        this.zoom.max - 1
                    );
                    marker.percent = [
                        x / this.group.dimensions[0],
                        y / this.group.dimensions[1]
                    ];
                });
        }
        let added = 0;

        /** Add GeoJSON to map */
        this.featureLayer = L.featureGroup();
        if (this._geojson.length > 0) {
            log(
                this.verbose,
                this.id,
                `Adding ${this._geojson.length} GeoJSON features to map.`
            );
            this.map.createPane("geojson");

            added = 0;
            this._geojson.forEach((geoJSON) => {
                try {
                    const geo = new GeoJSON(
                        this,
                        this.featureLayer,
                        { color: this._geojsonColor },
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

            log(
                this.verbose,
                this.id,
                `${added} GeoJSON feature${added == 1 ? "" : "s"} added to map.`
            );
        }

        /** Add GPX to map */
        if (this._gpx.length > 0) {
            log(
                this.verbose,
                this.id,
                `Adding ${this._gpx.length} GPX features to map.`
            );

            for (let gpx of this._gpx) {
                const gpxInstance = new GPX(this, gpx, {}, this._gpxIcons);
                gpxInstance.leafletInstance.addTo(this.featureLayer);
            }
        }

        if (this._geojson.length || this._gpx.length) {
            this.featureLayer.addTo(this.group.group);
            if (this._zoomFeatures) {
                log(this.verbose, this.id, `Zooming to features.`);
                this.map.fitBounds(this.featureLayer.getBounds());
                const { lat, lng } = this.featureLayer.getBounds().getCenter();

                log(this.verbose, this.id, `Features center: [${lat}, ${lng}]`);
                this.setInitialCoords([lat, lng]);
                this.zoom.default = this.map.getBoundsZoom(
                    this.featureLayer.getBounds()
                );
            }
        }

        /** Add Image Overlays to Map */
        if (options.imageOverlays.length) {
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
        }

        /** Register Resize Handler */
        this._handleResize();

        /** Build control icons */
        this._buildControls();

        /** Bind Internal Map Events */
        this.map.on("contextmenu", this.handleMapContext.bind(this));
        this.map.on("click", this._handleMapClick.bind(this));

        this.map.on("zoomanim", (evt: L.ZoomAnimEvent) => {
            //check markers
            this.markers.forEach((marker) => {
                if (marker.shouldShow(evt.zoom)) {
                    this.map.once("zoomend", () => marker.show());
                } else if (marker.shouldHide(evt.zoom)) {
                    marker.hide();
                }
            });
        });

        /** Stop Touchmove Propagation for Mobile */
        this.contentEl.addEventListener("touchmove", (evt) => {
            evt.stopPropagation();
        });

        this.group.group.addTo(this.map);
    }
    private _buildDisplayForTooltip(
        title: string,
        { icon, description }: { icon?: boolean; description?: string }
    ): HTMLDivElement {
        let display: HTMLDivElement = createDiv({
            attr: { style: "text-align: left;" }
        });
        const titleEl = display.createDiv({
            attr: {
                style: "display: flex; justify-content: space-between;"
            }
        });
        const labelEl = titleEl.createEl("label", {
            text: title,
            attr: {
                style: "text-align: left;"
            }
        });
        if (icon) {
            setIcon(
                titleEl.createDiv({
                    attr: {
                        style: "margin-left: 0.5rem;"
                    }
                }),
                DESCRIPTION_ICON
            );
        }
        if (description) {
            labelEl.setAttr("style", "font-weight: bolder; text-align: left;");
            display.createEl("p", {
                attr: {
                    style: "margin: 0.25rem 0; text-align: left;"
                },
                text: description
            });
        }
        return display;
    }
    private _focusOnLayer(layer: L.GeoJSON<any> | L.Circle<any>) {
        const { lat, lng } = layer.getBounds().getCenter();
        log(
            this.verbose,
            this.id,
            `Feature was Control clicked. Moving to bounds [${lat}, ${lng}]`
        );
        this.map.fitBounds(layer.getBounds());
    }
    log(message: string) {
        log(this.verbose, this.id, message);
    }
    sortOverlays() {
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
        circle.addTo(this.map);
        this.zoom.default = this.map.getBoundsZoom(circle.getBounds());
        circle.remove();
    }
    setInitialCoords(coords: [number, number]) {
        this.initialCoords = [
            coords[0] * this._coordMult[0],
            coords[1] * this._coordMult[1]
        ];
    }

    resetZoom() {
        this.map.invalidateSize();
        log(this.verbose, this.id, `Element added to note, resetting zoom.`);
        if (this._zoomDistance) {
            log(this.verbose, this.id, `Zooming by distance.`);
            this.setZoomByDistance(this._zoomDistance);
        }
        if (this._zoomFeatures) {
            log(this.verbose, this.id, `Zooming to features.`);
            this.map.fitBounds(this.featureLayer.getBounds());
            const { lat, lng } = this.featureLayer.getBounds().getCenter();

            log(this.verbose, this.id, `Features center: [${lat}, ${lng}]`);
            this.setInitialCoords([lat, lng]);
            this.zoom.default = this.map.getBoundsZoom(
                this.featureLayer.getBounds()
            );
        }
        log(
            this.verbose,
            this.id,
            `Resetting map view to [${this.initialCoords[0]}, ${this.initialCoords[1]}], zoom ${this.zoom.default}.`
        );
        this.map.setView(this.initialCoords, this.zoom.default);
    }

    @catchError
    removeMarker(marker: MarkerDefinition) {
        if (!marker) return;

        marker.remove();
        this.markers = this.markers.filter(({ id }) => id != marker.id);

        this.trigger("markers-updated");
    }

    @catchError
    updateMarkerIcons() {
        /** Add New Marker Types To Filter List */
        this.markerIcons.forEach(({ type }) => {
            if (!this.markerIcons.has(type)) {
                this.displaying.set(type, true);
                this.group.markers[type] = L.layerGroup();
            }
        });

        this.markers.forEach((marker) => {
            let icon = this.markerIcons.get(marker.type) ?? this.defaultIcon;
            marker.icon = icon;
        });
        /** Remove Old Marker Types From Filter List */
        [...this.displaying].forEach(([type]) => {
            if (this._markerTypesOnMap.has(type)) return;
            if (this.markerTypes.includes(type)) return;

            this.displaying.delete(type);

            if (!this.group.markers.default) {
                this.group.markers.default = L.layerGroup();
                this.displaying.set("default", true);
                this.group.markers.default.addTo(this.group.group);
            }
            this.group.markers[type]
                .getLayers()
                .forEach((layer) => this.group.markers.default.addLayer(layer));

            delete this.group.markers[type];
        });
    }

    @catchError
    addMarker(markerToBeAdded: SavedMarkerProperties) {
        if (!this.markerTypes.includes(markerToBeAdded.type)) {
            new Notice(`Marker type "${markerToBeAdded.type}" does not exist.`);
            markerToBeAdded.type = "default";
        }
        const markerIcon = this.markerIcons.get(markerToBeAdded.type);

        const mapIcon = markerIcon?.icon ?? this.defaultIcon.icon;

        const marker = new Marker(this, {
            id: markerToBeAdded.id,
            type: markerToBeAdded.type,
            loc: L.latLng(markerToBeAdded.loc),
            link: markerToBeAdded.link,
            icon: mapIcon,
            layer: markerToBeAdded.layer
                ? markerToBeAdded.layer
                : this.group?.id,
            mutable: markerToBeAdded.mutable ?? false,
            command: markerToBeAdded.command ?? false,
            zoom: this.map.getMaxZoom(),
            percent: markerToBeAdded.percent,
            description: markerToBeAdded.description,
            tooltip:
                markerToBeAdded.tooltip ??
                this.plugin.AppData.displayMarkerTooltips
        });

        this._pushMarker(marker);
    }

    @catchError
    addMarkers(markersToBeAdded: SavedMarkerProperties[]) {
        for (let markerToBeAdded of markersToBeAdded) {
            if (!this.markerTypes.includes(markerToBeAdded.type)) {
                new Notice(
                    `Marker type "${markerToBeAdded.type}" does not exist.`
                );
                markerToBeAdded.type = "default";
            }
            const markerIcon = this.markerIcons.get(markerToBeAdded.type);

            const mapIcon = markerIcon?.icon ?? this.defaultIcon.icon;

            const marker = new Marker(this, {
                id: markerToBeAdded.id,
                type: markerToBeAdded.type,
                loc: L.latLng(markerToBeAdded.loc),
                link: markerToBeAdded.link,
                icon: mapIcon,
                layer: markerToBeAdded.layer
                    ? markerToBeAdded.layer
                    : this.group?.id,
                mutable: markerToBeAdded.mutable ?? false,
                command: markerToBeAdded.command ?? false,
                zoom: this.map.getMaxZoom(),
                percent: markerToBeAdded.percent,
                description: markerToBeAdded.description,
                minZoom: markerToBeAdded.minZoom,
                maxZoom: markerToBeAdded.maxZoom,
                tooltip:
                    markerToBeAdded.tooltip ??
                    this.plugin.AppData.displayMarkerTooltips
            });

            this._pushMarker(marker);
        }
    }

    @catchError
    createMarker(
        markerIcon: MarkerIcon,
        loc: L.LatLng,
        percent: [number, number],
        link: string = undefined,
        id: string = getId(),
        layer: string | undefined = undefined,
        mutable: boolean = true,
        command: boolean = false,
        zoom: number = this.zoom.max,
        description: string = null,
        minZoom: number = null,
        maxZoom: number = null
    ): MarkerDefinition {
        let mapIcon = this.defaultIcon.icon,
            type;

        if (markerIcon && markerIcon.type) {
            mapIcon = this.markerIcons.get(markerIcon.type ?? "default")?.icon;
            type = markerIcon.type;
        }
        if (!this.markerTypes.includes(type)) {
            new Notice(`Marker type "${type}" does not exist.`);
            type = "default";
        }

        const marker = new Marker(this, {
            id: id,
            type: type,
            loc: loc,
            link: link,
            icon: mapIcon,
            layer: layer ? layer : this.group?.id,
            mutable: mutable,
            command: command,
            zoom: zoom ?? this.zoom.max,
            percent: percent,
            description: description,
            minZoom,
            maxZoom,

            tooltip: this.plugin.AppData.displayMarkerTooltips
        });

        this._pushMarker(marker);
        if (mutable) {
            this.trigger("marker-added", marker);
        }
        return marker;
    }

    @catchError
    updateMarker(marker: Marker) {
        const existing = this.markers.find((m) => m.id == marker.id);

        this.displaying.delete(existing.type);
        this.displaying.set(marker.type, true);

        existing.link = marker.link;
        existing.icon = this.markerIcons.get(marker.type);
        existing.minZoom = marker.minZoom;
        existing.maxZoom = marker.maxZoom;
        existing.command = marker.command;

        if (existing.shouldShow(this.map.getZoom())) {
            existing.show();
        } else if (existing.shouldHide(this.map.getZoom())) {
            existing.hide();
        }
    }

    @catchError
    private _pushMarker(marker: Marker) {
        this.markers.push(marker);
        this.trigger("markers-updated");
    }

    getZoom() {
        if (!this.rendered) return this.zoom.default;
        return this.map.getZoom();
    }

    @catchError
    distance(latlng1: L.LatLng, latlng2: L.LatLng): string {
        const dist = this.map.distance(latlng1, latlng2);
        let display = this.distanceFormatter.format(dist * this.scale);
        if (this._distanceMultipler !== 1) {
            display += ` (${this.distanceFormatter.format(
                dist * this.scale * this._distanceMultipler
            )})`;
        }
        return display + ` ${this.unit}`;
    }

    @catchError
    stopDrawing() {
        this.isDrawing = false;
        this.plugin.app.keymap.popScope(this._escapeScope);
        if (this._distanceEvent) {
            this._distanceEvent = undefined;

            this._distanceLine.unbindTooltip();
            this._distanceLine.remove();

            /** Get Last Distance */
            const latlngs =
                this._previousDistanceLine.getLatLngs() as L.LatLng[];
            const display = this.distance(latlngs[0], latlngs[1]);
            this._distanceDisplay.setText(display);
        }
        if (this._tempCircle) {
            this._tempCircle.remove();
            this._tempCircle = undefined;
        }
        this.map.off("mousemove");
        this.map.off("mouseout");
    }

    @catchError
    private _buildControls() {
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
        }
        //Filter Markers
        filterMarkerControl({ position: "topright" }, this).addTo(this.map);

        //Edit markers
        const editMarkerControl = editMarkers(
            { position: "topright" },
            this,
            this.plugin
        ).addTo(this.map);

        editMarkerControl.onClose = async (markers: Marker[]) => {
            this.mutableMarkers.forEach((marker) => {
                this.removeMarker(marker);
            });

            markers.forEach((marker) => {
                this.createMarker(
                    this.markerIcons.get(marker.type),
                    marker.loc,
                    marker.percent,
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

        //Zoom to Markers
        zoomControl({ position: "topleft" }, this).addTo(this.map);
        //Zoom to initial
        resetZoomControl({ position: "topleft" }, this).addTo(this.map);

        this.trigger("markers-updated");

        //Distance Display
        this._distanceDisplay = distanceDisplay(
            {
                position: "bottomleft"
            },
            this._previousDistanceLine,
            this
        ).addTo(this.map);
    }

    formatLatLng(latlng: L.LatLng) {
        return {
            lat: Number(this.latLngFormatter.format(latlng.lat)),
            lng: Number(this.latLngFormatter.format(latlng.lng))
        };
    }

    @catchErrorAsync
    private async _handleMapClick(evt: L.LeafletMouseEvent) {
        this.onHandleDistance(evt);
        if (
            evt.originalEvent.getModifierState("Shift") ||
            evt.originalEvent.getModifierState("Alt")
        ) {
            log(
                this.verbose,
                this.id,
                `Map popup context detected. Opening popup.`
            );
            this.popup.open(
                evt.latlng,
                `[${this.latLngFormatter.format(
                    evt.latlng.lat
                )}, ${this.latLngFormatter.format(evt.latlng.lng)}]`
            );
            if (
                this.data.copyOnClick &&
                evt.originalEvent.getModifierState(MODIFIER_KEY)
            ) {
                log(
                    this.verbose,
                    this.id,
                    `Copying coordinates of click to clipboard.`
                );
                await this.copyLatLngToClipboard(evt.latlng);
            }
        }
    }

    @catchError
    drawCircle(
        circle: L.Circle,
        original: L.LeafletMouseEvent,
        evt: L.LeafletMouseEvent
    ) {
        let newRadius = this.map.distance(original.latlng, evt.latlng);
        circle.setRadius(newRadius);
    }

    @catchError
    private _pushOverlay(overlay: Overlay) {
        this.overlays.push(overlay);

        if (this.rendered) {
            this.sortOverlays();

            this.trigger("markers-updated");
        }
    }
    beginOverlayDrawingContext(evt: L.LeafletMouseEvent, marker?: Marker) {
        this.plugin.app.keymap.pushScope(this._escapeScope);

        this.isDrawing = true;

        this._tempCircle = L.circle(evt.latlng, {
            radius: 1,
            color: this.options.overlayColor
        });
        this.map.once("click", async () => {
            if (this._tempCircle) {
                log(this.verbose, this.id, `Overlay drawing complete.`);
                this._tempCircle.remove();
                /* this.type === "image"
                            ? circle.getRadius()
                            : convert(circle.getRadius())
                                  .from("m")
                                  .to(this.unit); */

                this._pushOverlay(
                    new Overlay(this, {
                        radius: this._tempCircle.getRadius(),
                        color: this._tempCircle.options.color,
                        loc: [
                            this._tempCircle.getLatLng().lat,
                            this._tempCircle.getLatLng().lng
                        ],
                        layer: this.group.id,
                        unit: this.unit,
                        desc: "",
                        mutable: true,
                        marker: marker.id
                    })
                );
                await this.plugin.saveSettings();
            }

            this.stopDrawing();
        });
        this.map.on(
            "mousemove",
            this.drawCircle.bind(this, this._tempCircle, evt)
        );

        this._tempCircle.addTo(this.group.group);
    }

    @catchError
    addOverlay(circle: SavedOverlayData) {
        this._pushOverlay(new Overlay(this, circle));
    }

    @catchError
    addOverlays(
        overlayArray: SavedOverlayData[],
        options: { mutable: boolean; sort: boolean }
    ) {
        for (let overlay of overlayArray) {
            this.addOverlay(overlay);
        }
        if (options.sort) {
            this.sortOverlays();
        }
    }

    @catchError
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
                        this.map.fitBounds(overlay.leafletInstance.getBounds());
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
            this.createMarker(this.defaultIcon, evt.latlng, undefined);
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
                    this.createMarker(marker, evt.latlng, undefined);
                    await this.plugin.saveSettings();
                });
            });
        });

        contextMenu.showAtPosition({
            x: evt.originalEvent.clientX,
            y: evt.originalEvent.clientY
        } as Point);
    }

    @catchError
    onHandleDistance(evt: L.LeafletMouseEvent) {
        if (
            (!evt.originalEvent.getModifierState("Shift") &&
                !evt.originalEvent.getModifierState("Alt")) ||
            evt.originalEvent.getModifierState("Control")
        ) {
            if (this._distanceEvent != undefined) {
                this.stopDrawing();
            }
            return;
        }
        if (this._distanceEvent != undefined) {
            log(this.verbose, this.id, `Distance measurement context ending.`);
            this._previousDistanceLine.setLatLngs(
                this._distanceLine.getLatLngs()
            );
            this.stopDrawing();
        } else {
            log(
                this.verbose,
                this.id,
                `Distance measurement context starting.`
            );
            this._distanceEvent = evt.latlng;

            this.isDrawing = true;
            this.plugin.app.keymap.pushScope(this._escapeScope);

            const distanceTooltip = L.tooltip({
                permanent: true,
                direction: "top",
                sticky: true
            });
            this._distanceLine.setLatLngs([this._distanceEvent, evt.latlng]);
            this._distanceLine.bindTooltip(distanceTooltip);
            this.map.on("mousemove", (mvEvt: L.LeafletMouseEvent) => {
                if (!this.markers.find((m) => m.isBeingHovered)) {
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
                this.stopDrawing();
                this._distanceEvent = undefined;
            });
        }
    }

    @catchErrorAsync
    private async _buildLayersForType(
        /* type: string, */
        layer?: { data: string; id: string; alias?: string }
    ): Promise<L.TileLayer | L.ImageOverlay> {
        log(this.verbose, this.id, "Building initial map layer.");
        if (this.type === "real") {
            this.layer = L.tileLayer(
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
                this.layer,
                ...Object.values(markerGroups),
                ...Object.values(overlayGroups)
            ]);

            this.mapLayers = [
                {
                    group: group,
                    layer: this.layer,
                    id: "real",
                    /* data: "real", */
                    markers: markerGroups,
                    overlays: overlayGroups
                }
            ];
            this.trigger(`layer-ready-for-features`, this.mapLayers[0]);
        } else if (this.type === "image") {
            this.map.on(
                "baselayerchange",
                ({ layer }: L.LayersControlEvent) => {
                    // need to do this to prevent panning animation for some reason
                    this.map.setMaxBounds([undefined, undefined]);
                    this.layer = (
                        layer as L.LayerGroup
                    ).getLayers()[0] as L.ImageOverlay;
                    this.map.panTo(this.bounds.getCenter(), {
                        animate: false
                    });
                    this.map.setMaxBounds(this.bounds);
                }
            );

            const newLayer = await this._buildMapLayer(layer);

            this.mapLayers.push(newLayer);
            this.trigger(`layer-ready-for-features`, newLayer);
        }

        this.mapLayers[0].layer.once("load", () => {
            this.rendered = true;

            log(
                this.verbose,
                this.id,
                `Initial map layer rendered in ${
                    (Date.now() - this._start) / 1000
                } seconds.`
            );
            this.trigger("rendered");

            this.displayedMarkers.forEach(async (marker) => {
                if (marker.tooltip === "always") {
                    /* marker.popup = this.buildPopup(marker);
                    const content = await this._buildMarkerPopupDisplay(marker);
                    marker.popup.setContent(content);
                    this.map.openPopup(marker.popup); */
                }
            });
        });
        return this.mapLayers[0].layer;
    }

    isLayerRendered(layer: string) {
        return this.mapLayers.find(({ id }) => id === layer) ? true : false;
    }

    @catchErrorAsync
    async loadAdditionalMapLayers(
        layers: { data: string; id: string; alias: string }[]
    ) {
        log(
            this.verbose,
            this.id,
            "Building additional map layers in background."
        );
        const start = Date.now();
        for (let layer of layers) {
            const newLayer = await this._buildMapLayer(layer);

            this.mapLayers.push(newLayer);

            this.trigger(`layer-ready-for-features`, newLayer);

            this._layerControl.addBaseLayer(
                newLayer.group,
                layer.alias ?? `Layer ${this.mapLayers.length}`
            );
        }

        log(
            this.verbose,
            this.id,
            `Additional map layers built in ${
                (Date.now() - start) / 1000
            } seconds.`
        );
    }
    @catchErrorAsync
    async loadImageOverlays(
        layers: { data: string; id: string; alias: string }[]
    ) {
        log(
            this.verbose,
            this.id,
            "Building additional map layers in background."
        );
        for (let layer of layers) {
            const newLayer = await this._buildMapLayer(layer);

            this.mapLayers.push(newLayer);

            this._layerControl.addBaseLayer(
                newLayer.group,
                layer.alias ?? `Layer ${this.mapLayers.length}`
            );
        }
    }

    @catchErrorAsync
    private async _buildMapLayer(layer: {
        data: string;
        id: string;
        alias?: string;
    }): Promise<LayerGroup> {
        const { h, w } = await getImageDimensions(layer.data);

        let bounds: L.LatLngBounds;
        if (this._userBounds?.length) {
            bounds = new L.LatLngBounds(...this._userBounds);
        } else {
            const southWest = this.map.unproject([0, h], this.zoom.max - 1);
            const northEast = this.map.unproject([w, 0], this.zoom.max - 1);
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

    @catchErrorAsync
    private async _renderImage({ hasAdditional }: { hasAdditional: boolean }) {
        this.map.fitBounds(this.bounds);
        this.map.panTo(this.bounds.getCenter(), {
            animate: false
        });
        this.map.setMaxBounds(this.bounds);
        this.map.setZoom(this.zoom.default, { animate: false });

        if (this.mapLayers.length > 1 || hasAdditional) {
            this._layerControl.addBaseLayer(
                this.mapLayers[0].group,
                this.mapLayers[0].alias ?? `Layer 1`
            );

            this._addLayerControl();
        }
    }
    private _addLayerControl() {
        if (this._layerControlAdded) return;
        this._layerControlAdded = true;
        const layerIcon = icon({ iconName: "layer-group", prefix: "fas" })
            .node[0];
        layerIcon.setAttr(`style`, "color: var(--text-normal);margin: auto;");
        this._layerControl.addTo(this.map);
        this._layerControl.getContainer().children[0].appendChild(layerIcon);
    }

    @catchErrorAsync
    private async _renderReal() {
        this.map.setZoom(this.zoom.default, { animate: false });

        this._handleResize();
    }

    @catchError
    private _handleResize() {
        this._resize = new ResizeObserver(() => {
            if (this.rendered) {
                this.map.invalidateSize();
            }
        });
        this._resize.observe(this.contentEl);
    }

    @catchErrorAsync
    async copyLatLngToClipboard(loc: L.LatLng): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            navigator.clipboard
                .writeText(
                    `${this.latLngFormatter.format(
                        loc.lat
                    )}, ${this.latLngFormatter.format(loc.lng)}`
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

    private canShowTooltip(
        target: MarkerDefinition | LeafletOverlay,
        tooltip?: TooltipDisplay
    ) {
        const global =
            target instanceof Marker
                ? this.plugin.AppData.displayMarkerTooltips
                : this.plugin.AppData.displayOverlayTooltips;
        if (tooltip === "always") return false;
        if (tooltip === "hover" && global) return true;
        if (tooltip === "never") return false;
        return global;
    }

    @catchError
    closePopup(popup: L.Popup) {
        if (!popup) return;
        this.map.closePopup(popup);
    }

    getOverlaysUnderClick(evt: L.LeafletMouseEvent) {
        const overlays = [...this.overlays].filter(
            (overlay) => overlay.isUnder(evt) && overlay.layer === this.group.id
        );
        overlays.sort((a, b) => {
            return a.radiusInMeters - b.radiusInMeters;
        });

        return overlays;
    }

    remove() {
        try {
            this.map?.remove();
        } catch (e) {}
        this._resize?.disconnect();
        this.rendered = false;

        this.plugin.app.keymap.popScope(this._escapeScope);
    }

    private async _buildMarkerPopupDisplay(marker: MarkerDefinition) {
        let display: HTMLElement;
        if (marker.command) {
            const commands = this.plugin.app.commands.listCommands();

            if (
                commands.find(
                    ({ id }) =>
                        id.toLowerCase() === marker.link.toLowerCase().trim()
                )
            ) {
                const command = commands.find(
                    ({ id }) =>
                        id.toLowerCase() === marker.link.toLowerCase().trim()
                );
                const div = createDiv({
                    attr: {
                        style: "display: flex; align-items: center;"
                    }
                });
                setIcon(
                    div.createSpan({
                        attr: {
                            style: "margin-right: 0.5em; display: flex; align-items: center;"
                        }
                    }),
                    "run-command"
                );
                display = div.createSpan({ text: command.name });
            } else {
                const div = createDiv({
                    attr: {
                        style: "display: flex; align-items: center;"
                    }
                });
                setIcon(
                    div.createSpan({
                        attr: {
                            style: "margin-right: 0.5em; display: flex; align-items: center;"
                        }
                    }),
                    "cross"
                );
                display = div.createSpan({ text: "No command found!" });
            }
            return;
        }

        let internal = this.plugin.app.metadataCache.getFirstLinkpathDest(
            marker.link.split(/(\^|\||#)/).shift(),
            ""
        );

        if (
            /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
                marker.link
            ) &&
            !internal
        ) {
            //external url
            let [, link] = marker.link.match(
                /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*))/
            );

            let [, text] = marker.link.match(/\[([\s\S]+)\]/) || [, link];

            let el = marker.leafletInstance.getElement();
            display = createEl("a", {
                text: text,
                href: link,
                cls: "external-link"
            });
        } else {
            display = createSpan({
                text: marker.display
                    .replace(/(\^)/, " > ^")
                    .replace(/#/, " > ")
                    .split("|")
                    .pop()
            });
        }
        return display;
    }

    async onMarkerClick(marker: Marker, evt: L.LeafletMouseEvent) {
        this.onHandleDistance(evt);
    }
}
