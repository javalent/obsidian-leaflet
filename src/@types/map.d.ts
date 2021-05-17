import L from "leaflet";
import { DivIcon } from "leaflet";
import {
    DivIconMarkerOptions,
    ILayerGroup,
    ILeafletMapOptions,
    ILeafletMarker,
    IMarkerIcon,
    MarkerDivIconOptions
} from ".";
import { ObsidianLeaflet } from "./main";

declare class LeafletMap {
    parentEl: HTMLElement;
    id: string;
    contentEl: HTMLElement;
    map: L.Map;
    markers: Marker[];
    zoom: { min: number; max: number; default: number; delta: number };
    popup: L.Popup;
    mapLayers: ILayerGroup[];
    layer: L.ImageOverlay | L.TileLayer;
    type: "image" | "real";
    /* distanceEvent: L.LatLng | undefined;
    distanceLine: L.Polyline; */
    plugin: ObsidianLeaflet;
    options: ILeafletMapOptions;
    initialCoords: [number, number];
    constructor(
        plugin: ObsidianLeaflet,
        el: HTMLElement,
        options: ILeafletMapOptions
    );

    get group(): ILayerGroup;
    get bounds(): L.LatLngBounds;

    get rendered(): boolean;
    set rendered(v: boolean);

    get markerIcons(): IMarkerIcon[];

    get scale(): number;

    get CRS(): L.CRS;

    get isFullscreen(): boolean;

    get isDrawingDistance(): boolean;

    render(
        type: "real" | "image",
        options?: {
            coords?: [number, number];
            layers?: { data: string; id: string }[];
        }
    ): void;

    updateMarkerIcons(): void;

    addMarker(markerToBeAdded: ILeafletMarker): void;

    createMarker(
        markerIcon: IMarkerIcon,
        loc: L.LatLng,
        link?: string | undefined,
        id?: string,
        layer?: string | undefined,
        mutable?: boolean,
        command?: boolean,
        zoom?: number
    ): ILeafletMarker;

    loadData(data: any): Promise<void>;

    distance(latlng1: L.LatLng, latlng2: L.LatLng): string;

    removeDistanceLine(): void;

    openPopup(
        target: ILeafletMarker | L.LatLng,
        content: ((source: L.Layer) => L.Content) | L.Content
    ): void;

    remove(): void;
}

declare class Marker {
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    id: string;
    layer: string;
    command: boolean;
    zoom: number;
    maxZoom: number;
    divIcon: MarkerDivIcon;
    constructor({
        id,
        icon,
        type,
        loc,
        link,
        layer,
        mutable,
        command,
        zoom,
        maxZoom
    }: {
        id: string;
        icon: MarkerDivIcon;
        type: string;
        loc: L.LatLng;
        link: string;
        layer: string;
        mutable: boolean;
        command: boolean;
        zoom: number;
        maxZoom?: number;
    });
    get link(): string;
    set link(x: string);
    get mutable(): boolean;
    set mutable(x: boolean);

    get type(): string;
    set type(x: string);
    set icon(x: IMarkerIcon);
    static from(marker: Marker): Marker;
}

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
