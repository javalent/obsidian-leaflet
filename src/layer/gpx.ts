import type { BaseMapType } from "src/@types";
import { Layer } from "../layer/layer";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { gpx as gpxtoGeoJSON } from "@tmcw/togeojson";

import { gpxControl } from "src/controls/gpx";

import gpxWorker from "../worker/gpx.worker";
import type { HotlineOptions } from "leaflet";
import { popup } from "src/map/popup";
import { GPXPoint } from "src/@types/layers";

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
    leafletInstance: L.GeoJSON;
    style: { opacity: string; color: string };
    hotline: L.Polyline;
    popup = popup(this.map, this, { permanent: true });
    gpx: GeoJSON.FeatureCollection;
    domObject: Record<any, any>;
    data: any;
    worker: Worker;

    parsed: boolean;
    displaying: string;

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

        this.worker = new gpxWorker();

        this.worker.postMessage({ string: gpx });

        this.worker.onmessage = (event) => {
            this.data = event.data.data;
            this.parsed = true;
            this.worker.terminate();
        };

        //@ts-expect-error
        window.GPX = this;
        this.gpx = gpxtoGeoJSON(
            new DOMParser().parseFromString(gpx, "text/xml")
        );
        this.leafletInstance = L.geoJSON(this.gpx, {
            pane: "gpx",
            interactive: true
        });

        this.leafletInstance.on("mouseover", (evt: L.LeafletMouseEvent) => {
            (evt.originalEvent.target as SVGPathElement).addClass(
                "leaflet-gpx-targeted"
            );
        });
        this.leafletInstance.on("mouseout", (evt: L.LeafletMouseEvent) => {
            (evt.originalEvent.target as SVGPathElement).removeClass(
                "leaflet-gpx-targeted"
            );
        });
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            this.map.gpxControl.setTarget(this);
        });
    }
    switch(which: "cad" | "ele" | "hr" | "speed" | "default") {
        if (this.map.leafletInstance.hasLayer(this.hotline))
            this.hotline.remove();
        this.displaying = which;
        switch (which) {
            case "cad": {
                this.hotline = L.hotline(this.cad.data, {
                    min: this.cad.min,
                    max: this.cad.max,
                    ...HOTLINE_OPTIONS
                }).addTo(this.map.leafletInstance);
                break;
            }
            case "ele": {
                this.hotline = L.hotline(this.ele.data, {
                    min: this.ele.min,
                    max: this.ele.max,
                    ...HOTLINE_OPTIONS
                }).addTo(this.map.leafletInstance);
                break;
            }
            case "hr": {
                this.hotline = L.hotline(this.hr.data, {
                    min: this.hr.min,
                    max: this.hr.max,
                    ...HOTLINE_OPTIONS
                }).addTo(this.map.leafletInstance);
                break;
            }
            case "speed": {
                this.hotline = L.hotline(this.speed.data, {
                    min: this.speed.min,
                    max: this.speed.max,
                    ...HOTLINE_OPTIONS
                }).addTo(this.map.leafletInstance);
                break;
            }
        }
        this.bindHotlineEvents();
    }
    bindHotlineEvents() {
        if (this.map.leafletInstance.hasLayer(this.hotline)) {
            this.hotline.on("mousemove", (evt: L.LeafletMouseEvent) => {
                const closest = this.findClosestPoint(evt.latlng);
                const content = `Lat: ${closest.lat}, Lng: ${closest.lng}
Elevation: ${closest.ele} m,
Speed: ${closest.extensions.speed} m/s
`;
                this.popup.setTarget(evt.latlng).open(content);
            });
            this.hotline.on("mouseout", (evt) => {
                this.popup.close();
            });
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
        return this.data.tracks[0].points;
    }
    get speed(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
        average: number;
    } {
        return this.data.tracks[0].maps.speed;
    }
    get cad(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
    } {
        return this.data.tracks[0].maps.cad;
    }
    get ele(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
    } {
        return this.data.tracks[0].maps.ele;
    }
    get hr(): {
        raw: number[];
        data: L.LatLng[];
        min: number;
        max: number;
    } {
        return this.data.tracks[0].maps.hr;
    }
    hide() {
        if (this.polyline) {
            this.polyline.setStyle({
                color: "transparent"
            });
        }
    }
    show() {
        if (this.polyline) {
            this.polyline.setStyle({
                color: /* this.map.gpxColor ?? */ "blue"
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
}
