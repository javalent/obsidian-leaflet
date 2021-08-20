import type { BaseMapType } from "src/@types";
import { GPX as LeafletGPX, GPXOptions } from "leaflet";
import { Layer } from "../layer/layer";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { Menu } from "obsidian";
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

export class GPX extends Layer<LeafletGPX> {
    leafletInstance: LeafletGPX;
    style: { opacity: string; color: string };
    hotline: string;
    popup: null;
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

        this.leafletInstance.on("contextmenu", (evt: L.LeafletMouseEvent) => {
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
                        this.hotlines[this.hotline].remove();
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
                            this.hotlines[this.hotline].remove();
                        }
                        this.hotline = key;
                        this.hide();
                        menu.hide();
                        this.hotlines[key].addTo(this.group);
                        this.hotlines[key].redraw();

                        console.log(
                            "🚀 ~ file: gpx.ts ~ line 113 ~ this.hotlines[this.hotline]",
                            this.hotline,
                            this.hotlines[this.hotline]
                        );
                    });
                });
            });

            menu.showAtPosition({
                x: evt.originalEvent.clientX,
                y: evt.originalEvent.clientY
            });
        });

        this.leafletInstance.reload();
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
    initialize() {
        if (this.polyline) {
            this.buildHotlines();
        }
    }

    hotlines: Record<string, L.Polyline> = {};

    buildHotlines() {
        let data = [];
        const elevations = this.leafletInstance.get_elevation_data();

        for (const index in this.latlngs) {
            const latlng = this.latlngs[index];
            data.push(
                new L.LatLng(latlng.lat, latlng.lng, elevations[index][1])
            );
        }

        this.hotlines.elevation = L.hotline(data, {
            min: this.leafletInstance.get_elevation_min(),
            max: this.leafletInstance.get_elevation_max(),
            weight: 3
        });
        data = [];
        const speed = this.leafletInstance.get_speed_data();

        for (const index in this.latlngs) {
            const latlng = this.latlngs[index];
            data.push(new L.LatLng(latlng.lat, latlng.lng, speed[index][1]));
        }

        const min_speed = Math.min(...speed.map((v) => v[0]));

        this.hotlines.speed = L.hotline(data, {
            min: min_speed,
            max: this.leafletInstance.get_speed_max(),
            weight: 3
        });
    }

    get elevation() {
        return {
            data: this.leafletInstance.get_elevation_data(),
            min: this.leafletInstance.get_elevation_min(),
            max: this.leafletInstance.get_elevation_max()
        };
    }
    get speed() {
        return {
            data: this.leafletInstance.get_speed_data(),
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
