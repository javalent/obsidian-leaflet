import {
    Debouncer,
    MarkdownPostProcessorContext,
    Platform,
    Plugin
} from "obsidian";
import {
    BaseMapType,
    Icon,
    LeafletMapView,
    MarkerIcon,
    ObsidianAppData
} from ".";

export interface MapInterface {
    map: BaseMapType;
    source: string;
    el: HTMLElement;
    id: string;
}

export interface BlockParameters {
    id?: string;
    image?: string | string[];
    layers?: string[];
    tileServer?: string | string[];
    osmLayer?: boolean;
    marker?: string | string[];
    commandMarker?: string | string[];
    markerFolder?: string | string[];
    markerFile?: string | string[];
    markerTag?: string | string[][];
    imageOverlay?: Array<[string, [number, number], [number, number]]>;
    overlay?: Array<[string, [number, number], string, string]>;
    overlayTag?: string;
    overlayColor?: string;
    height?: string;
    minZoom?: number;
    maxZoom?: number;
    defaultZoom?: number;
    zoomDelta?: number;
    lat?: string;
    long?: string;
    scale?: number;
    unit?: string;
    distanceMultiplier?: number;
    darkMode?: string;
    bounds?: [[number, number], [number, number]];
    coordinates?: [string, string] | string;
    zoomTag?: string;
    linksTo?: string[];
    linksFrom?: string[];
    geojsonFolder?: string[];
    geojson?: string[];
    gpxFolder?: string[];
    gpx?: string[];
    gpxMarkers?: {
        start?: string;
        end?: string;
        waypoint?: string;
    };
    geojsonColor?: string;
    gpxColor?: string;
    drawColor?: string;
    zoomFeatures?: boolean;
    verbose?: boolean;
    isMapView?: boolean;
    isInitiativeView?: boolean;
    draw?: boolean;
}

declare class ObsidianLeaflet extends Plugin {
    data: ObsidianAppData;
    markerIcons: MarkerIcon[];
    maps: MapInterface[];
    mapFiles: { file: string; maps: string[] }[];
    modifierKey: "Meta" | "Control";
    Platform: typeof Platform;
    isDesktop: boolean;
    isMobile: boolean;
    isMacOS: boolean;
    view: LeafletMapView | null;
    /* escapeScope: Scope; */
    onload(): Promise<void>;
    onunload(): Promise<void>;
    postprocessor(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void>;

    loadSettings(): Promise<void>;
    saveSettings: Debouncer<Promise<void>[]>;

    generateMarkerMarkup(markers: Icon[]): MarkerIcon[];

    registerMapEvents(map: BaseMapType): void;
    createNewMarkerType(options?: {
        original?: Icon;
        layer?: boolean;
        name?: string;
    }): Promise<Icon | void>;
    openInitiativeView(): void;
}
