import { MarkdownView } from "obsidian";
import LeafletMap, { DivIconMarker, MarkerDivIcon } from "src/leaflet";

export interface ObsidianAppData {
    mapMarkers: MapMarkerData[];
    markerIcons: Marker[];
    defaultMarker: Marker;
    color: string;
    lat: number;
    long: number;
    notePreview: boolean;
    layerMarkers: boolean;
    previousVersion: string;
    warnedAboutMapMarker: boolean;
}

export interface Marker {
    type: string;
    iconName: string;
    color?: string;
    layer?: boolean;
    transform?: { size: number; x: number; y: number };
}
export interface LeafletMarker {
    type: string;
    loc: L.LatLng;
    id: string;
    link?: string;
    leafletInstance: DivIconMarker;
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

export interface MapInterface {
    map: LeafletMap;
    path?: string;
    file?: string;
    view: MarkdownView;
    source: string;
    el: HTMLElement;
    id: string;
}
export interface MapMarkerData {
    path?: string;
    file?: string;
    files: string[];
    lastAccessed: number;
    id: string;
    markers: MarkerData[];
}
export interface MarkerIcon {
    readonly type: string;
    readonly html: string;
}

export interface LeafletMarkerIcon extends MarkerIcon {
    icon: MarkerDivIcon;
}

export interface LayerGroup {
    group: L.LayerGroup;
    layer: L.TileLayer | L.ImageOverlay;
    id: string;
}
