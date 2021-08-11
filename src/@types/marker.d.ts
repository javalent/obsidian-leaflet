import { LeafletMap, TooltipDisplay } from ".";
import { MarkerDivIcon, DivIconMarker } from "./map";

export interface MarkerIcon {
    readonly type: string;
    readonly html: string;
    readonly icon: MarkerDivIcon;
}

export interface MarkerProperties {
    id: string;
    icon: MarkerDivIcon;
    type: string;
    loc: L.LatLng;
    link: string;
    layer: string;
    mutable: boolean;
    command: boolean;
    zoom: number;
    percent: [number, number];
    description: string;
    minZoom?: number;
    maxZoom?: number;
    tooltip?: TooltipDisplay;
}

export interface SavedMarkerProperties {
    type: string;
    loc: [number, number];
    percent: [number, number];
    id: string;
    link: string;
    layer: string;
    command: boolean;
    mutable: boolean;
    description: string;
    minZoom: number;
    maxZoom: number;
    tooltip: TooltipDisplay;
}

declare class Marker {
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    percent: [number, number];
    id: string;
    layer: string;
    command: boolean;
    maxZoom: number;
    minZoom: number;
    divIcon: MarkerDivIcon;
    description: string;
    tooltip?: TooltipDisplay;
    constructor(
        map: L.Map,
        {
            id,
            icon,
            type,
            loc,
            link,
            layer,
            mutable,
            command,
            zoom,
            percent,
            description,
            maxZoom
        }: MarkerProperties
    );
    get link(): string;
    set link(x: string);

    get display(): string;

    get mutable(): boolean;
    set mutable(x: boolean);

    get type(): string;
    set type(x: string);

    set icon(icon: MarkerIcon);

    setLatLng(latlng: L.LatLng): void;
    remove(): void;
    show(): void;
    hide(): void;
    shouldShow(zoom: number): boolean;
    shouldHide(zoom: number): boolean;

    toProperties(): SavedMarkerProperties;

    static from(map: LeafletMap, properties: MarkerProperties): Marker;
}
