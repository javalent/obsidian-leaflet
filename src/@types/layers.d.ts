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
    ele: number;
    speed: number;
    extensions: {
        speed: number;
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
    bindHotlineEvents(): void;
    findClosestPoint(latlng: L.LatLng): GPXPoint;
    get points(): GPXPoint[];
    get speed(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
        average: number;
    };
    get cad(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
    };
    get ele(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
    };
    get hr(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
    };

    featureGroup: L.FeatureGroup;
}
