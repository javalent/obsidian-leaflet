import { allUnits, UnitFamilies } from "convert";
import { DivIconMarker, MarkerDivIcon } from "./map";
import { LeafletMap } from "./map";

export { ObsidianLeaflet } from "./main";
export { LeafletMap, Marker } from "./map";

/** Recreate Length Alias Types from "convert" */
declare type UnitsCombined = typeof allUnits;
declare type UnitKeys = Exclude<keyof UnitsCombined, "__proto__">;
declare type AllValues = {
    [P in UnitKeys]: {
        key: P;
        value: UnitsCombined[P][0];
    };
}[UnitKeys];
declare type IdToFamily = {
    [P in AllValues["value"]]: Extract<
        AllValues,
        {
            value: P;
        }
    >["key"];
};
declare type GetAliases<X extends UnitFamilies> = IdToFamily[X];
export type Length = GetAliases<UnitFamilies.Length>;

/** Leaflet Interfaces */

export interface ILeafletMapOptions {
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
    tileServer?: string;
    overlayColor?: string;
    bounds?: [[number, number], [number, number]];
}

export interface IBlockParameters {
    id?: string;
    image?: string | string[];
    layers?: string[];
    marker?: string | string[];
    commandMarker?: string | string[];
    markerFolder?: string | string[];
    markerFile?: string | string[];
    markerTag?: string | string[][];
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
    coordinates?: [string, string] | [[string]];
    zoomTag?: string;
}
export interface ILeafletOverlay {
    leafletInstance: L.Circle;
    layer: string;
    data: IOverlayData;
    mutable: boolean;
    id: string;
}
export interface IOverlayData {
    radius: number;
    loc: [number, number];
    color: string;
    layer: string;
    unit: Length;
    desc: string;
    id?: string;
}

export interface MarkerDivIconOptions extends L.DivIconOptions {
    data?: { [key: string]: string };
}

export interface DivIconMarkerOptions extends L.MarkerOptions {
    icon: MarkerDivIcon;
}

export interface IMarker {
    type: string;
    iconName?: string;
    isImage?: boolean;
    imageUrl?: string;
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

export interface IMarkerData {
    type: string;
    loc: [number, number];
    id: string;
    link: string;
    layer: string;
    command: boolean;
    zoom?: number;
}

export interface IMapInterface {
    map: LeafletMap;
    source: string;
    el: HTMLElement;
    id: string;
}
export interface IMapMarkerData {
    path?: string;
    files: string[];
    lastAccessed: number;
    id: string;
    markers: IMarkerData[];
    overlays: IOverlayData[];
}
export interface IMarkerIcon {
    readonly type: string;
    readonly html: string;
    readonly icon: MarkerDivIcon;
}

export interface ILayerGroup {
    /** Layer group containing the marker layer groups */
    group: L.LayerGroup;

    /** Marker type layer groups (used to filter out marker types) */
    markers: { [type: string]: L.LayerGroup };

    /** Actual rendered map layer */
    layer: L.TileLayer | L.ImageOverlay;

    /** Reference ID */
    id: string;

    /** Only used for image maps -> actual image map data as base64 */
    data: string;
}

/** Settings Interfaces */
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
    copyOnClick: boolean;
}
