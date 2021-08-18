import type { BaseMapType } from "src/@types";
import { GPX as LeafletGPX, GPXOptions, latLng } from "leaflet";
import { Layer } from "../layer/layer";

import { LeafletSymbol } from "src/utils/leaflet-import";
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

export class GPX extends Layer<LeafletGPX> {
    leafletInstance: LeafletGPX;
    style: { opacity: string; color: string };
    get group() {
        return this.map.featureLayer;
    }
    constructor(
        public map: BaseMapType,
        gpx: string,
        options: GPXOptions,
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

        this.leafletInstance = new L.GPX(gpx, {
            marker_options: MarkerOptions
        });

        //@ts-expect-error
        window.INSTANCE = this;

        //@ts-expect-error
        this.leafletInstance.on("loaded", ({ layers }) => {
            this.featureGroup = layers;

            this.initialize();
        });

        this.leafletInstance.reload();
    }
    hide() {
        if (this.polyline) {
            this.polyline.setStyle({
                opacity: 0,
                fillOpacity: 0,
                stroke: false,
                color: "transparent"
            });
        }
    }
    show() {
        if (this.polyline) {
            this.polyline.setStyle({
                opacity: 1,
                fillOpacity: 1,
                stroke: true,
                color: /* this.map.gpxColor ?? */ "blue"
            });
        }
    }
    initialize() {
        if (this.polyline) {
            this.hide();
            const data = [];
            const elevations = this.leafletInstance.get_elevation_data();

            for (const index in this.latlngs) {
                const latlng = this.latlngs[index];
                data.push(
                    new L.LatLng(latlng.lat, latlng.lng, elevations[index][1])
                );
            }

            const hotline = L.hotline(data, {
                min: this.leafletInstance.get_elevation_min(),
                max: this.leafletInstance.get_elevation_max(),
                weight: 3
            }).addTo(this.group);
            hotline.bringToFront();
        }
    }
    get elevation() {
        return {
            data: this.leafletInstance.get_elevation_data(),
            min: this.leafletInstance.get_elevation_min(),
            max: this.leafletInstance.get_elevation_max()
        };
    }
    featureGroup: L.FeatureGroup;
    get latlngs() {
        return this.polyline?.getLatLngs() as L.LatLng[];
    }
    get polyline() {
        return this.featureGroup
            .getLayers()
            ?.filter((l) => l instanceof L.Polyline)
            ?.shift() as L.Polyline;
    }
}
