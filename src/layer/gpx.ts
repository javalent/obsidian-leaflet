import type { BaseMapType } from "src/@types";
import { Layer } from "../layer/layer";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { gpx as gpxtoGeoJSON } from "@tmcw/togeojson";

import gpxWorker from "../worker/gpx.worker";
import type { HotlineOptions } from "leaflet";
import { popup } from "src/map/popup";
import { GPXPoint } from "src/@types/layers";

import { GeoJSON } from "./geojson";
import { formatLatLng } from "src/utils";

let L = window[LeafletSymbol];

const MarkerOptions: L.MarkerOptions = {
    startIconUrl: null,
    endIconUrl: null,
    shadowUrl: null,
    wptIconUrls: {
        "": null
    },
    startIcon: null,
    endIcon: null,
    wptIcons: {
        "": null
    }
};

const HOTLINE_OPTIONS: HotlineOptions = {
    weight: 3,
    outlineWidth: 1
};

export class GPX extends Layer<L.GeoJSON> {
    geojson: GeoJSON;
    get leafletInstance() {
        return this.geojson.leafletInstance;
    }
    style: { opacity: string; color: string };
    hotline: L.Polyline;
    popup = popup(this.map, this, { permanent: true });
    gpx: GeoJSON.FeatureCollection;
    domObject: Record<any, any>;
    data: any;
    worker: Worker;

    parsed: boolean;
    displaying: string;

    targeted: boolean = false;

    get group() {
        return this.map.featureLayer;
    }
    get renderer() {
        return this.map.canvas;
    }
    constructor(
        public map: BaseMapType,
        gpx: string,
        /* options: GPXOptions, */
        private icons: any
    ) {
        super();
        if (this.icons.start && this.map.markerIcons.has(this.icons.start)) {
            MarkerOptions.startIcon = this.map.markerIcons.get(
                this.icons.start
            ).icon;
        }
        if (this.icons.end && this.map.markerIcons.has(this.icons.end)) {
            MarkerOptions.endIcon = this.map.markerIcons.get(
                this.icons.end
            ).icon;
        }
        if (
            this.icons.waypoint &&
            this.map.markerIcons.has(this.icons.waypoint)
        ) {
            MarkerOptions.wptIcons = {
                "": this.map.markerIcons.get(this.icons.waypoint).icon
            };
        }

        this.map.log("Parsing GPX Data.");
        this.worker = new gpxWorker();

        this.worker.postMessage({ string: gpx });

        this.worker.onmessage = (event) => {
            this.map.log("GPX Data parsed.");
            this.data = event.data.data;
            this.parsed = true;
            this.worker.terminate();
        };

        //@ts-expect-error
        window.GPX = this;
        this.gpx = gpxtoGeoJSON(
            new DOMParser().parseFromString(gpx, "text/xml")
        );
        this.geojson = new GeoJSON(
            this.map,
            this.group,
            { color: this.map.options.gpxColor, pane: "gpx" },
            this.gpx
        );

        this.leafletInstance.on("mouseover", (evt: L.LeafletMouseEvent) => {
            if (
                !this.map.leafletInstance.hasLayer(this.hotline) &&
                !this.targeted
            ) {
                (evt.originalEvent.target as SVGPathElement).addClass(
                    "leaflet-gpx-targeted"
                );
            }
        });
        this.leafletInstance.on("mouseout", (evt: L.LeafletMouseEvent) => {
            if (
                this.map.leafletInstance.hasLayer(this.hotline) ||
                this.targeted
            ) {
                this.popup.close();
            } else {
                (evt.originalEvent.target as SVGPathElement).removeClass(
                    "leaflet-gpx-targeted"
                );
            }
        });
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            this.map.gpxControl.setTarget(this);
        });
        this.leafletInstance.on("mousemove", (evt: L.LeafletMouseEvent) => {
            if (
                this.map.leafletInstance.hasLayer(this.hotline) ||
                this.targeted
            ) {
                const closest = this.findClosestPoint(evt.latlng);
                const content = this.popupContent(closest);
                this.popup.setTarget(evt.latlng).open(content);
            }
        });
    }
    switch(which: "cad" | "ele" | "hr" | "speed" | "default") {
        if (this.map.leafletInstance.hasLayer(this.hotline))
            this.hotline.remove();
        this.displaying = which;
        this.hide();
        switch (which) {
            case "cad": {
                this.hotline = L.hotline(this.cad.points, {
                    min: this.cad.min,
                    max: this.cad.max,
                    ...HOTLINE_OPTIONS,
                    renderer: this.renderer
                }).addTo(this.map.leafletInstance);
                break;
            }
            case "ele": {
                this.hotline = L.hotline(this.elevation.points, {
                    min: this.elevation.min,
                    max: this.elevation.max,
                    ...HOTLINE_OPTIONS,
                    renderer: this.renderer
                }).addTo(this.map.leafletInstance);
                break;
            }
            case "hr": {
                this.hotline = L.hotline(this.hr.points, {
                    min: this.hr.min,
                    max: this.hr.max,
                    ...HOTLINE_OPTIONS,
                    renderer: this.renderer
                }).addTo(this.map.leafletInstance);
                break;
            }
            case "speed": {
                this.hotline = L.hotline(this.speed.points, {
                    min: this.speed.min,
                    max: this.speed.max,
                    ...HOTLINE_OPTIONS,
                    renderer: this.renderer
                }).addTo(this.map.leafletInstance);
                break;
            }
            default: {
                this.show();
            }
        }
    }
    findClosestPoint(latlng: L.LatLng): GPXPoint {
        const sort = [...this.points];
        sort.sort(
            (a, b) =>
                this.map.leafletInstance.distance(a, latlng) -
                this.map.leafletInstance.distance(b, latlng)
        );
        return sort[0];
    }
    get flags(): Record<string, boolean> {
        return this.data.tracks[0].flags;
    }
    get points(): GPXPoint[] {
        return this.data.coords.flat();
    }
    get speed(): {
        points: L.LatLng[];
        min: number;
        max: number;
        avg: number;
    } {
        return this.data.speed;
    }
    get cad(): {
        points: L.LatLng[];
        min: number;
        max: number;
        avg: number;
    } {
        return this.data.cad;
    }
    get elevation(): {
        gain: number;
        loss: number;
        max: number;
        min: number;
        total: number;
        avg: number;
        points: L.LatLng[];
    } {
        return this.data.elevation;
    }
    get hr(): {
        points: L.LatLng[];
        min: number;
        max: number;
        avg: number;
    } {
        return this.data.hr;
    }
    get atemp(): { points: L.LatLng[]; min: number; max: number; avg: number } {
        return this.data.atemp;
    }
    hide() {
        if (this.leafletInstance) {
            this.leafletInstance.setStyle({
                color: "transparent",
                weight: 10
            });
        }
    }
    show() {
        if (this.leafletInstance) {
            console.log("show");
            this.leafletInstance.setStyle({
                color: this.map.options.gpxColor,
                weight: 2
            });
        }
    }

    hotlines: Record<string, L.Polyline> = {};

    featureGroup: L.FeatureGroup;
    get polyline() {
        return this.featureGroup
            ?.getLayers()
            ?.filter((l) => l instanceof L.Polyline)
            ?.shift() as L.Polyline;
    }
    popupContent(point: GPXPoint): HTMLElement {
        const { lat, lng } = formatLatLng(point);

        const el = createDiv("gpx-popup");
        el.createSpan({ text: `Lat: ${lat}, Lng: ${lng}` });
        el.createSpan({ text: `Time: ${point.meta.time.toLocaleString()}` });

        console.log("🚀 ~ file: gpx.ts ~ line 289 ~ point.meta", point.meta);
        if (point.meta.elevation && !isNaN(point.meta.elevation))
            el.createSpan({
                text: `Elevation: ${point.meta.elevation.toFixed(2)} m`
            });
        if (point.meta.speed && !isNaN(point.meta.speed))
            el.createSpan({
                text: `Speed: ${point.meta.speed.toFixed(2)} m/s`
            });
        if (point.meta.atemp && !isNaN(point.meta.atemp))
            el.createSpan({
                text: `Temperature: ${point.meta.atemp.toFixed(2)} °C`
            });
        if (point.meta.hr && !isNaN(point.meta.hr))
            el.createSpan({
                text: `Heart Rate: ${point.meta.hr.toFixed(2)}`
            });
        if (point.meta.cad && !isNaN(point.meta.cad))
            el.createSpan({
                text: `Cadence: ${point.meta.cad.toFixed(2)} step/s`
            });
        return el;
    }
}
