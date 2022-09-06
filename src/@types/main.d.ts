import { Length } from "convert/dist/types/units";
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
    inkarnate_id?: string;
    layers?: string[];
    tileServer?: string | string[];
    tileOverlay?: string | string[];
    osmLayer?: boolean;
    marker?: string[];
    commandMarker?: string[];
    markerFolder?: string[];
    markerFile?: string[];
    markerTag?: string[][];
    filterTag?: string[][];
    imageOverlay?: Array<[string, [number, number], [number, number]]>;
    overlay?: string[];
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
    showAllMarkers?: boolean;
    verbose?: boolean;
    isMapView?: boolean;
    isInitiativeView?: boolean;
    draw?: boolean;
    preserveAspect?: boolean;
    noUI?: boolean;
    width?: string;
    recenter?: boolean;
    noScrollZoom?: boolean;
    lock?: boolean;
}

