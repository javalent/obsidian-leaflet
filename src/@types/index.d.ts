import { MarkdownView } from "obsidian";
import LeafletMap, { DivIconMarker, MarkerDivIcon } from "src/leaflet";

export interface IObsidianAppData {
    mapMarkers: IMapMarkerData[];
    markerIcons: IMarker[];
    defaultMarker: IMarker;
    color: string;
    lat: number;
    long: number;
    notePreview: boolean;
    layerMarkers: boolean;
    previousVersion: string;
    warnedAboutMapMarker: boolean;
}

export interface IMarker {
    type: string;
    iconName: string;
    color?: string;
    layer?: boolean;
    transform?: { size: number; x: number; y: number };
}
export interface ILeafletMarker {
    type: string;
    loc: L.LatLng;
    id: string;
    link?: string;
    leafletInstance: DivIconMarker;
    layer: string;
    mutable: boolean;
    command: boolean;
}

/* export declare class DivMarker implements ILeafletMarker {
    private _link: string;
    private _mutable: boolean;
    private _type: string;
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    id: string;
    layer: string;
    command: boolean;
    get link(): string;
    set link(link: string);
    get type(): string;
    set type(type: string);
    get mutable(): boolean;
    set mutable(mutable: boolean);
    get icon(): ILeafletMarkerIcon;
    set icon(icon: ILeafletMarkerIcon);
} */

export interface IMarkerData {
    type: string;
    loc: [number, number];
    id: string;
    link: string;
    layer: string;
    command: boolean;
}

export interface IMapInterface {
    map: LeafletMap;
    path?: string;
    file?: string;
    view: MarkdownView;
    source: string;
    el: HTMLElement;
    id: string;
}
export interface IMapMarkerData {
    path?: string;
    file?: string;
    files: string[];
    lastAccessed: number;
    id: string;
    markers: IMarkerData[];
}
export interface IMarkerIcon {
    readonly type: string;
    readonly html: string;
}

export interface ILeafletMarkerIcon extends IMarkerIcon {
    icon: MarkerDivIcon;
}

export interface ILayerGroup {
    group: L.LayerGroup;
    layer: L.TileLayer | L.ImageOverlay;
    id: string;
}
