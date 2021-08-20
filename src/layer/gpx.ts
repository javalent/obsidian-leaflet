import type { BaseMapType } from "src/@types";
import { Layer } from "../layer/layer";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { gpx as gpxtoGeoJSON } from "@tmcw/togeojson";

import gpxParser from "gpx-parser-builder";

let L = window[LeafletSymbol];

declare module "leaflet" {
    function hotline(data: L.LatLng[], options: HotlineOptions): L.Polyline;
    interface HotlineOptions {
        weight?: number;
        outlineWidth?: number;
        outlineColor?: string;
        palette?: Record<number, string>;
        min?: number;
        max?: number;
    }

    interface GPX {
        get_speed_data(): [number, number, string][];
        get_speed_min(): number;
        get_speed_max(): number;
    }
}

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

export class GPX extends Layer<L.GeoJSON> {
    leafletInstance: L.GeoJSON;
    style: { opacity: string; color: string };
    hotline: string;
    popup: null;
    gpx: GeoJSON.FeatureCollection;
    domObject: Record<any, any>;
    data: any;
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

        //@ts-expect-error
        window.GPX = this;
        this.data = gpxParser.parse(gpx);
        this.gpx = gpxtoGeoJSON(
            new DOMParser().parseFromString(gpx, "text/xml")
        );
        this.leafletInstance = L.geoJSON(this.gpx, {
            pane: "gpx",
            interactive: true
        });

        /*         this.leafletInstance.on("contextmenu", (evt: L.LeafletMouseEvent) => {
            console.log("🚀 ~ file: gpx.ts ~ line 89 ~ evt", evt);
            L.DomEvent.stopPropagation(evt);
            const menu = new Menu(this.map.plugin.app);
            menu.setNoIcon();

            menu.addItem((item) => {
                item.setTitle("Route");
                item.onClick(() => {
                    menu.hide();
                    this.show();
                    if (this.hotline) {
                        this.hotlines[this.hotline].setStyle({
                            color: "transparent"
                        });
                        this.hotline = null;
                    }
                });
            });
            Object.keys(this.hotlines).forEach((key) => {
                menu.addItem((item) => {
                    item.setTitle(
                        key[0].toLocaleUpperCase() +
                            key.slice(1).toLocaleLowerCase()
                    );
                    item.onClick(() => {
                        if (this.hotline) {
                            this.hotlines[this.hotline].setStyle({
                                color: "transparent"
                            });
                        }
                        this.hotline = key;
                        this.hide();
                        menu.hide();
                        this.hotlines[key].addTo(this.group);
                        this.hotlines[key].redraw();
                    });
                });
            });

            menu.showAtPosition({
                x: evt.originalEvent.clientX,
                y: evt.originalEvent.clientY
            });
        }); */
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
