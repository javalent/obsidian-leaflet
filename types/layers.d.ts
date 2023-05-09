import type L from "leaflet";
import type { BaseMapType, LayerGroup, Popup } from "./map";

export abstract class Layer<T extends L.Layer> {
    map: BaseMapType;
    layer: string;

    abstract popup: Popup;

    get mapLayer(): LayerGroup<L.TileLayer | L.ImageOverlay>;

    abstract leafletInstance: T;
    abstract get group(): L.LayerGroup;

    onShow(): void;
    show(): void;
    onHide(): void;
    hide(): void;

    checkAndAddToMap(): void;
    remove(): void;
}

export interface GPXPoint extends L.LatLng {
    meta: {
        atemp: number;
        cad: number;
        elevation: number;
        hr: number;
        speed: number;
        time: Date;
    };
}

export class GPX extends Layer<L.GeoJSON> {
    leafletInstance: L.GeoJSON;
    style: { opacity: string; color: string };
    hotline: L.Polyline;
    popup: Popup;
    gpx: GeoJSON.FeatureCollection;
    domObject: Record<any, any>;
    data: any;
    worker: Worker;

    parsed: boolean;
    displaying: string;

    get group(): L.FeatureGroup;
    get renderer(): L.Canvas;
    constructor(
        map: BaseMapType,
        gpx: string,
        /* options: GPXOptions, */
        icons: any
    );
    switch(which: "cad" | "ele" | "hr" | "speed" | "default"): void;
/*     bindHotlineEvents(): void; */
    findClosestPoint(latlng: L.LatLng): GPXPoint;
    get points(): GPXPoint[];
    get speed(): {
        points: L.LatLng[];
        min: number;
        max: number;
        avg: number;
    };
    get cad(): {
        points: L.LatLng[];
        min: number;
        max: number;
        avg: number;
    };
    get elevation(): {
        gain: number;
        loss: number;
        max: number;
        min: number;
        total: number;
        avg: number;
        points: L.LatLng[];
    };
    get hr(): {
        points: L.LatLng[];
        min: number;
        max: number;
        avg: number;
    };
    get atemp(): { points: L.LatLng[]; min: number; max: number; avg: number };

    featureGroup: L.FeatureGroup;
}
