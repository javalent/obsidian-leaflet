import type { Length } from "convert/dist/types/units";

import type L from "leaflet";
import type { DivIcon } from "leaflet";
import type { Events } from "obsidian";
import type { MarkerIcon, SavedMarkerProperties, SavedOverlayData } from ".";
import type { ObsidianLeaflet } from "./main";
import type { Marker } from ".";
import type { ObsidianAppData, TooltipDisplay } from "./saved";
import type { Overlay } from "src/layer";

export interface LayerGroup {
    /** Layer group containing the marker layer groups */
    group: L.LayerGroup;

    /** Marker type layer groups (used to filter out marker types) */
    markers: { [type: string]: L.LayerGroup };
    /** Marker type layer groups (used to filter out marker types) */
    overlays: { [type: string]: L.LayerGroup };

    /** Actual rendered map layer */
    layer: L.TileLayer | L.ImageOverlay;

    /** Reference ID */
    id: string;

    /** Only used for image maps -> actual image map data as base64 */
    /* data: string ;*/

    /** Only used for image maps -> dimensions of image */
    dimensions?: [number, number];

    /** Alias */
    alias?: string;
}

export interface MarkerDivIconOptions extends L.DivIconOptions {
    data?: { [key: string]: string };
}

export interface DivIconMarkerOptions extends L.MarkerOptions {
    icon: MarkerDivIcon;
}
export interface LeafletMapOptions {
    context?: string;
    height?: string;
    type?: "image" | "real";
    id?: string;
    minZoom?: number;
    maxZoom?: number;
    defaultZoom?: number;
    zoomDelta?: number;
    unit?: string;
    scale?: number;
    distanceMultiplier?: number;
    darkMode?: boolean;
    overlayColor?: string;
    bounds?: [[number, number], [number, number]];
    geojson?: any[];
    geojsonColor?: string;
    zoomFeatures?: boolean;
    verbose?: boolean;
    gpx?: string[];
    gpxIcons?: {
        start: string;
        end: string;
        waypoint: string;
    };
}

declare class Popup {
    leafletInstance: L.Popup;
    target: Marker | L.Circle | L.LatLng;
    handlerTarget: any;
    constructor(map: LeafletMap, options: L.PopupOptions, source?: L.Layer);
    open(
        target: Marker | L.Circle | L.LatLng,
        content: ((source: L.Layer) => L.Content) | L.Content,
        handler?: L.Layer
    ): void;
    close(): void;
    isOpen(): boolean;
    setContent(content: ((source: L.Layer) => L.Content) | L.Content): void;
    setLatLng(latlng: L.LatLng): void;
}

declare class LeafletMap extends Events {
    isLayerRendered(layer: string): boolean;
    getZoom(): number;
    handleMapContext(evt: L.LeafletMouseEvent, overlay?: Overlay): void;
    beginOverlayDrawingContext(evt: L.LeafletMouseEvent, marker?: Marker): void;
    getOverlaysUnderClick(evt: L.LeafletMouseEvent): Overlay[];
    log(message: string): void;
    data: ObsidianAppData;
    id: string;
    /* containerEl: HTMLElement; */
    contentEl: HTMLElement;
    map: L.Map;
    markers: Marker[];
    zoom: { min: number; max: number; default: number; delta: number };
    popup: Popup;
    mapLayers: LayerGroup[];
    featureLayer: L.FeatureGroup;
    layer: L.ImageOverlay | L.TileLayer;
    type: "image" | "real";

    plugin: ObsidianLeaflet;
    options: LeafletMapOptions;
    initialCoords: [number, number];
    displaying: Map<string, boolean>;

    isDrawing: boolean;

    overlays: Overlay[];

    verbose: boolean;

    get markerIcons(): Map<string, MarkerIcon>;

    unit: Length;

    locale: string;

    distanceFormatter: Intl.NumberFormat;

    formatLatLng(latlng: L.LatLng): { lat: number; lng: number };

    constructor(
        plugin: ObsidianLeaflet,
        el: HTMLElement,
        options: LeafletMapOptions
    );

    get group(): LayerGroup;
    get bounds(): L.LatLngBounds;

    get rendered(): boolean;
    set rendered(v: boolean);

    get displayedMarkers(): Marker[];

    get scale(): number;

    get CRS(): L.CRS;
    get mutableMarkers(): Marker[];
    get isFullscreen(): boolean;

    get defaultIcon(): MarkerIcon;

    render(
        /* type: "real" | "image",
         */ options?: {
            coords?: [number, number];
            zoomDistance?: number;
            layers?: { data: string; id: string }[];
        }
    ): Promise<void>;
        
    updateMarkerIcons(): void;

    addOverlay(circle: SavedOverlayData, mutable: boolean): void;

    addOverlays(
        overlayArray: SavedOverlayData[],
        options: { mutable: boolean; sort: boolean }
    ): void;

    addMarker(markerToBeAdded: SavedMarkerProperties): void;

    addMarkers(markersToBeAdded: SavedMarkerProperties[]): void;

    createMarker(
        markerIcon: MarkerIcon,
        loc: L.LatLng,
        percent: [number, number],
        link?: string | undefined,
        id?: string,
        layer?: string | undefined,
        mutable?: boolean,
        command?: boolean,
        zoom?: number
    ): Marker;

    updateMarker(marker: Marker): void;

    removeMarker(marker: Marker): void;

    setInitialCoords(coords: [number, number]): void;
    setZoomByDistance(zoomDistance: number): void;

    resetZoom(): void;

    getMarkerById(id: string): Marker;

    distance(latlng1: L.LatLng, latlng2: L.LatLng): string;

    sortOverlays(): void;

    stopDrawing(): void;
    copyLatLngToClipboard(loc: L.LatLng): Promise<void>;

    onMarkerClick(marker: Marker, evt: L.LeafletMouseEvent): void;
    closePopup(popup: L.Popup): void;

    remove(): void;
}

declare abstract class BaseMap/* <
    T extends L.ImageOverlay | L.TileLayer
> */ extends Events {
    isDrawing: boolean;
    plugin: ObsidianLeaflet;
    options: LeafletMapOptions;
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
    abstract type: string;
    abstract get bounds(): L.LatLngBounds;
    abstract get scale(): number;
    abstract get CRS(): L.CRS;

    constructor(plugin: ObsidianLeaflet, options: LeafletMapOptions);

    contentEl: HTMLElement;
    currentLayer: L.ImageOverlay | L.TileLayer;
    get currentGroup(): LayerGroup;
    get data(): ObsidianAppData;
    get defaultIcon(): MarkerIcon;

    displaying: Map<string, boolean>;
    get displayed(): Marker[];

    featureLayer: L.FeatureGroup;

    get id(): string;

    initialCoords: [number, number];

    get isFullscreen(): boolean;
    leafletInstance: L.Map;
    mapLayers: LayerGroup[];
    get markerIcons(): Map<string, MarkerIcon>;
    get markerTypes(): string[];

    overlays: Overlay[];

    popup: Popup;

    markers: Marker[];

    rendered: boolean;

    tempCircle: L.Circle;

    verbose: boolean;

    zoom: {
        min: number;
        max: number;
        default: number;
        delta: number;
    };
    zoomDistance: number;

    unit: Length;

    /** Marker Methods */
    addMarker(...markers: SavedMarkerProperties[]): Marker[];

    createMarker(
        type: string,
        loc: [number, number],
        percent: [number, number],
        id: string,
        link?: string,
        layer?: string,
        mutable?: boolean,
        command?: boolean,
        description?: string,
        minZoom?: number,
        maxZoom?: number,
        tooltip?: TooltipDisplay
    ): Marker;

    onMarkerClick(marker: Marker, evt: L.LeafletMouseEvent): void;

    updateMarker(marker: Marker): void;

    /** Overlay Methods */
    addOverlay(...overlays: SavedOverlayData[]): void;
    createOverlay(overlay: SavedOverlayData): void;
    beginOverlayDrawingContext(
        original: L.LeafletMouseEvent,
        marker?: Marker
    ): void;

    /** Other Methods */
    closePopup(popup: L.Popup): void;
    distance(latlng1: L.LatLng, latlng2: L.LatLng): string;
    getMarkerById(id: string): Marker;
    getOverlaysUnderClick(evt: L.LeafletMouseEvent): Overlay[];
    getZoom(): number;
    handleMapContext(evt: L.LeafletMouseEvent, overlay?: Overlay): void;
    isLayerRendered(layer: string): boolean;
    log(text: string): void;
    removeMarker(marker: Marker): void;
    resetZoom(): void;
    abstract setInitialCoords(coords: [number, number]): void;

    sortOverlays(): void;
    setZoomByDistance(zoomDistance: number): void;
    stopDrawingContext(): void;
    toProperties(): SavedMapData;
    //TODO: REWRITE
    updateMarkerIcons(): void;
}

declare class RealMap extends BaseMap/* <L.TileLayer> */ {
    CRS: L.CRS;
    type: string;
    constructor(plugin: ObsidianLeaflet, options: LeafletMapOptions);

    get bounds(): L.LatLngBounds;

    get scale(): number;

    setInitialCoords(coords: [number, number]): void;

    render(options: {
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
}
declare class ImageMap extends BaseMap/* <L.ImageOverlay> */ {
    CRS: L.CRS;
    type: string;
    constructor(plugin: ObsidianLeaflet, options: LeafletMapOptions);

    get bounds(): L.LatLngBounds;

    get scale(): number;

    setInitialCoords(coords: [number, number]): void;

    render(options: {
        coords: [number, number];
        zoomDistance: number;
        layer: { data: string; id: string, alias?: string };
        hasAdditional?: boolean;
        imageOverlays?: {
            id: string;
            data: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[];
    }): Promise<void>;

    loadAdditionalLayers(layers: { data: string; id: string, alias?: string }[]): void;
}

export type BaseMapType = RealMap | ImageMap;

interface SavedMapData {}

declare class MarkerDivIcon extends DivIcon {
    options: MarkerDivIconOptions;
    div: HTMLElement;
    constructor(options: MarkerDivIconOptions);
    createIcon(oldIcon: HTMLElement): HTMLElement;
    setData(data: { [key: string]: string }): void;
}

declare class DivIconMarker extends L.Marker {
    options: DivIconMarkerOptions;
    constructor(
        latlng: L.LatLng,
        options: L.MarkerOptions,
        data: { [key: string]: string }
    );
}

declare class DistanceDisplay extends L.Control {
    controlEl: HTMLElement;
    textEl: HTMLSpanElement;
    line: L.Polyline;
    map: L.Map;
    popups: [L.Popup, L.Popup];
    constructor(opts: L.ControlOptions, line: L.Polyline);
    initEvents(): void;
    onMouseEnter(): void;
    onClick(evt: MouseEvent): void;
    onMouseLeave(): void;
    onAdd(map: L.Map): HTMLElement;
    setText(text: string): void;
    setLine(line: L.Polyline): void;
}
