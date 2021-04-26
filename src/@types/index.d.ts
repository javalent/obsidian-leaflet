import { MarkdownPostProcessorContext, MarkdownView } from "obsidian";
import LeafletMap from "src/leaflet";

export interface ObsidianAppData {
    mapMarkers: MapMarkerData[];
    markerIcons: Marker[];
    defaultMarker: Marker;
    color: string;
    lat: number;
    long: number;
    notePreview: boolean;
    layerMarkers: boolean;
}

export interface Marker {
    type: string;
    iconName: string;
    color?: string;
    layer?: boolean;
    transform?: { size: number; x: number; y: number };
}
export interface LeafletMarker {
    marker: MarkerIcon;
    loc: L.LatLng;
    id: string;
    link?: string;
    leafletInstance: L.Marker;
    layer: string;
    mutable: boolean;
}

export interface MarkerData {
    type: string;
    loc: [number, number];
    id: string;
    link: string;
    layer: string;
}

export interface MapMarkerData {
    path: string;
    file: string;
    markers: MarkerData[];
}
export type MarkerIcon = {
    readonly type: string;
    readonly html: string;
};

export interface MapInterface {
    map: LeafletMap;
    path: string;
    file: string;
    view: MarkdownView;
}

export interface LayerGroup {
    group: L.LayerGroup;
    layer: L.TileLayer | L.ImageOverlay;
    id: string;
}
