import type { LeafletMap } from "src/@types";
import type geojson from "geojson";

import { Marker } from "./marker";
import {
    buildTooltip,
    DESCRIPTION_ICON,
    getId,
    MAP_OVERLAY_STROKE_OPACITY,
    MAP_OVERLAY_STROKE_WIDTH
} from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { setIcon } from "obsidian";

let L = window[LeafletSymbol];

export class GeoJSON {
    leafletInstance: L.GeoJSON;
    private _display: HTMLDivElement;
    constructor(
        private map: LeafletMap,
        public parent: L.LayerGroup,
        public options: {
            color: string;
        },
        data: geojson.GeoJsonObject
    ) {
        this.leafletInstance = L.geoJSON(data, {
            pane: "geojson",
            pointToLayer: (geojsonPoint, latlng) => {
                const type =
                    geojsonPoint?.properties["marker-symbol"] ?? "default";
                const icon =
                    this.map.markerIcons.get(type) ??
                    this.map.markerIcons.get("default");
                const title =
                    geojsonPoint.properties.title ??
                    geojsonPoint.properties.name;
                const description = geojsonPoint.properties.description;
                let display;
                /* if (title) */
                /* display = this._buildDisplayForTooltip(title, {
                        icon: description
                    }); */

                const marker = new Marker(this.map, {
                    id: getId(),
                    type: type,
                    loc: latlng,
                    link: "display.outerHTML",
                    icon: icon.icon,
                    layer: this.map.group?.id,
                    mutable: false,
                    command: false,
                    zoom: this.map.zoom.max,
                    percent: undefined,
                    description: undefined
                });

                marker.leafletInstance.off("mouseover");
                marker.leafletInstance.off("click");
                marker.leafletInstance.on(
                    "click",
                    (evt: L.LeafletMouseEvent) => {
                        /* if (
                            (!evt.originalEvent.getModifierState("Shift") ||
                                !evt.originalEvent.getModifierState("Alt")) &&
                            title
                        ) {
                            let display = this._buildDisplayForTooltip(title, {
                                description
                            });

                            this.openPopup(marker, display);
                            return;
                        } */
                    }
                );
                marker.leafletInstance.on("mouseover", () => {
                    if (this.map.isDrawing) return;
                    /* let display = this._buildDisplayForTooltip(title, {
                        icon: description
                    }); */
                    this.map.openPopup(marker, "display");
                });

                return marker.leafletInstance;
            },
            style: (feature) => {
                if (!feature || !feature.properties) return {};

                const {
                    stroke: color = this.options.color,
                    "stroke-opacity": opacity = MAP_OVERLAY_STROKE_OPACITY,
                    "stroke-width": weight = MAP_OVERLAY_STROKE_WIDTH,
                    fill: fillColor = null,
                    "fill-opacity": fillOpacity = 0.2
                } = feature.properties;
                return {
                    color,
                    opacity,
                    weight,
                    fillColor,
                    fillOpacity
                };
            },
            onEachFeature: (feature, layer: L.GeoJSON) => {
                /** Propogate click */
                if (feature.geometry?.type == "Point") return;

                new GeoJSONFeature(feature, layer, this.map);
            }
        });
    }
    get display() {
        if (!this._display) {
            this._display = createDiv();
        }
        return this._display;
    }
}

class GeoJSONMarker extends Marker {}

class GeoJSONFeature {
    title: string;
    description: string;
    iconDisplay: HTMLDivElement;
    descriptionDisplay: HTMLDivElement;
    constructor(
        public feature: geojson.Feature<geojson.Geometry, any>,
        public layer: L.GeoJSON,
        public map: LeafletMap
    ) {
        this.title =
            feature.properties.title ?? feature.properties.name ?? null;
        this.description = feature.properties.description ?? null;

        this.iconDisplay = buildTooltip(this.title, {
            icon: this.description != null
        });
        this.descriptionDisplay = buildTooltip(this.title, {
            description: this.description
        });

        this.layer.on("mouseover", () => this.onLayerMouseover());
        this.layer.on("click", (evt: L.LeafletMouseEvent) =>
            this.onLayerClick(evt)
        );
    }
    onLayerMouseover() {
        if (!this.title && !this.description) return;
        if (this.map.isDrawing) return;
        this.map.openPopup(
            this.layer.getBounds().getCenter(),
            this.iconDisplay,
            this.layer
        );
    }
    onLayerClick(evt: L.LeafletMouseEvent) {
        if (evt.originalEvent.getModifierState(this.map.plugin.modifierKey)) {
            this._focus();
            return;
        }
        if (
            (!evt.originalEvent.getModifierState("Shift") ||
                !evt.originalEvent.getModifierState("Alt")) &&
            this.title
        ) {
            this.map.openPopup(evt.latlng, this.descriptionDisplay, this.layer);
            return;
        }
        this.map.map.fire("click", evt, true);
    }

    private _focus() {
        const { lat, lng } = this.map.formatLatLng(
            this.layer.getBounds().getCenter()
        );

        this.map.log(
            `Feature was Control clicked. Moving to bounds [${lat}, ${lng}]`
        );

        this.map.map.fitBounds(this.layer.getBounds());
    }
}
