import { Length } from "convert/dist/types/units";
import L from "leaflet";
import { DivIcon } from "leaflet";
import { Events } from "obsidian";
import {
    DivIconMarkerOptions,
    ILayerGroup,
    ILeafletMapOptions,
    IMarkerIcon,
    ILeafletOverlay,
    MarkerDivIconOptions,
    IMarkerData
} from ".";
import { ObsidianLeaflet } from "./main";

declare class LeafletMap extends Events {
    id: string;
    /* containerEl: HTMLElement; */
    contentEl: HTMLElement;
    map: L.Map;
    markers: Marker[];
    zoom: { min: number; max: number; default: number; delta: number };
    popup: L.Popup;
    mapLayers: ILayerGroup[];
    layer: L.ImageOverlay | L.TileLayer;
    type: "image" | "real";

    plugin: ObsidianLeaflet;
    options: ILeafletMapOptions;
    initialCoords: [number, number];
    displaying: Map<string, boolean>;

    isDrawing: boolean;

    overlays: ILeafletOverlay[];

    verbose: boolean;

    get markerIcons(): Map<string, IMarkerIcon>;

    unit: Length;

    locale: string;

    distanceFormatter: Intl.NumberFormat;
    latLngFormatter: Intl.NumberFormat;

    constructor(
        plugin: ObsidianLeaflet,
        el: HTMLElement,
        options: ILeafletMapOptions
    );

    get group(): ILayerGroup;
    get bounds(): L.LatLngBounds;

    get rendered(): boolean;
    set rendered(v: boolean);

    get displayedMarkers(): Marker[];

    get scale(): number;

    get CRS(): L.CRS;
    get mutableMarkers(): Marker[];
    get isFullscreen(): boolean;

    get defaultIcon(): IMarkerIcon;

    render(
        /* type: "real" | "image",
         */ options?: {
            coords?: [number, number];
            zoomDistance?: number;
            layers?: { data: string; id: string }[];
        }
    ): Promise<void>;

    updateMarkerIcons(): void;

    addMarker(markerToBeAdded: IMarkerData): void;

    addMarkers(markersToBeAdded: IMarkerData[]): void;

    createMarker(
        markerIcon: IMarkerIcon,
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

    getMarkerById(id: string): Marker[];

    distance(latlng1: L.LatLng, latlng2: L.LatLng): string;

    sortOverlays(): void;

    stopDrawing(): void;
    copyLatLngToClipboard(loc: L.LatLng): Promise<void>;

    openPopup(
        target: Marker | L.LatLng,
        content: ((source: L.Layer) => L.Content) | L.Content
    ): void;

    remove(): void;
}

declare class Marker {
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    percent: [number, number];
    id: string;
    layer: string;
    command: boolean;
    zoom: number;
    maxZoom: number;
    minZoom: number;
    divIcon: MarkerDivIcon;
    description: string;
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
            percent: [number, number];
            description: string;
            maxZoom?: number;
            minZoom?: number;
        }
    );
    get link(): string;
    set link(x: string);

    get display(): string;

    get mutable(): boolean;
    set mutable(x: boolean);

    get type(): string;
    set type(x: string);
    set icon(x: IMarkerIcon);
    /* get pixels(): [number, number]; */
    setLatLng(latlng: L.LatLng): void;
    remove(): void;
    show(): void;
    hide(): void;
    shouldShow(zoom: number): boolean;
    shouldHide(zoom: number): boolean;
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
