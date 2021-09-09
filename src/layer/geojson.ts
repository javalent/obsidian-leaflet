import type { DivIconMarker, BaseMapType } from "src/@types";
import type geojson from "geojson";

import { Marker } from "./marker";

import {
    buildTooltip,
    getId,
    MAP_OVERLAY_STROKE_OPACITY,
    MAP_OVERLAY_STROKE_WIDTH,
    MODIFIER_KEY
} from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Layer } from "./layer";
import { formatLatLng } from "src/utils";
import { popup } from "src/map/popup";
let L = window[LeafletSymbol];

export class GeoJSON extends Layer<L.GeoJSON> {
    leafletInstance: L.GeoJSON;
    private _display: HTMLDivElement;
    popup = popup(this.map, this);
    markers: GeoJSONMarker[] = [];
    features: GeoJSONFeature[] = [];
    get group() {
        return this.map.featureLayer;
    }
    constructor(
        public map: BaseMapType,
        public parent: L.LayerGroup,
        public options: {
            color: string;
            pane?: string;
        },
        data: geojson.GeoJsonObject
    ) {
        super();
        this.leafletInstance = L.geoJSON(data, {
            pane: this.options.pane ?? "geojson",
            pointToLayer: (geojsonPoint, latlng) => {
                const marker = new GeoJSONMarker(this, geojsonPoint, latlng, {
                    /* icon: "default", */
                    pane: this.options.pane ?? "geojson"
                });
                this.markers.push(marker);
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
                if (feature.geometry?.type == "Point") {
                    return;
                }
                const geo = new GeoJSONFeature(this, feature, layer);
                this.features.push(geo);
            }
        });
    }
    get display() {
        if (!this._display) {
            this._display = createDiv();
        }
        return this._display;
    }
    addMarker(latlng: L.LatLng, icon?: string, pane?: string) {
        const marker = new GeoJSONMarker(this, null, latlng, {
            pane: pane ?? this.options.pane
        });
        this.markers.push(marker);
        return marker.leafletInstance;
    }
    toProperties() {}
}

class GeoJSONMarker {
    marker: Marker;
    leafletInstance: L.Marker;
    title: string;
    description: string;
    iconDisplay: HTMLDivElement;
    descriptionDisplay: HTMLDivElement;
    get map() {
        return this.parent.map;
    }
    constructor(
        private parent: GeoJSON,
        feature: geojson.Feature<geojson.Point, any>,
        latlng: L.LatLng,
        options: { pane: string }
    ) {
        const type = feature?.properties["marker-symbol"] ?? "default";
        const icon =
            this.map.markerIcons.get(type) ??
            this.map.markerIcons.get("default");
        this.title =
            feature?.properties.title ?? feature?.properties.name ?? null;
        this.description = feature?.properties.description ?? null;
        if (this.title) {
            this.iconDisplay = buildTooltip(this.title, {
                icon: this.description != null
            });
            this.descriptionDisplay = buildTooltip(this.title, {
                description: this.description
            });
        }

        this.leafletInstance = L.marker(latlng, {
            pane: options.pane,
            icon: icon.icon,
            draggable: false
        });

        //seems hacky but works :shrug:
        this.leafletInstance.setZIndexOffset(1000);

        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            if (
                (!evt.originalEvent.getModifierState("Shift") ||
                    !evt.originalEvent.getModifierState("Alt")) &&
                this.description
            ) {
                L.DomEvent.stop(evt);
                this.parent.popup
                    .setTarget(this.leafletInstance)
                    .open(this.descriptionDisplay);
                return;
            }
        });
        this.leafletInstance.on("mouseover", (evt: L.LeafletMouseEvent) => {
            if (this.map.isDrawing || !this.title) return;
            L.DomEvent.stop(evt);
            this.parent.popup
                .setTarget(this.leafletInstance)
                .open(this.iconDisplay);
        });
    }
}

class GeoJSONFeature {
    title: string;
    description: string;
    iconDisplay: HTMLDivElement;
    descriptionDisplay: HTMLDivElement;
    get map() {
        return this.parent.map;
    }
    getLatLngs() {
        if (this.leafletInstance instanceof L.Polyline)
            return this.leafletInstance.getLatLngs().flat(2);
    }
    constructor(
        private parent: GeoJSON,
        public feature: geojson.Feature<geojson.Geometry, any>,
        public leafletInstance: L.GeoJSON
    ) {
        this.title =
            feature.properties.title ?? feature.properties.name ?? null;
        this.description = feature.properties.description ?? null;
        if (this.title) {
            this.iconDisplay = buildTooltip(this.title, {
                icon: this.description != null
            });
            this.descriptionDisplay = buildTooltip(this.title, {
                description: this.description
            });
        }
        this.leafletInstance.on("mouseover", () => this.onLayerMouseover());
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) =>
            this.onLayerClick(evt)
        );
    }
    onLayerMouseover() {
        if (!this.title && !this.description) return;
        if (this.map.isDrawing) return;
        this.parent.popup
            .setTarget(this.leafletInstance.getBounds().getCenter())
            .open(this.iconDisplay, this.leafletInstance);
    }
    onLayerClick(evt: L.LeafletMouseEvent) {
        if (evt.originalEvent.getModifierState(MODIFIER_KEY)) {
            this._focus();
            return;
        }
        if (
            (!evt.originalEvent.getModifierState("Shift") ||
                !evt.originalEvent.getModifierState("Alt")) &&
            this.title
        ) {
            this.parent.popup
                .setTarget(evt.latlng)
                .open(this.descriptionDisplay, this.leafletInstance);
            L.DomEvent.stopPropagation(evt);
            return;
        }
        this.map.leafletInstance.fire("click", evt, true);
    }

    private _focus() {
        const { lat, lng } = formatLatLng(
            this.leafletInstance.getBounds().getCenter()
        );

        this.map.log(
            `Feature was Control clicked. Moving to bounds [${lat}, ${lng}]`
        );

        this.map.leafletInstance.fitBounds(this.leafletInstance.getBounds());
    }
}
