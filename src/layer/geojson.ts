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
                return new GeoJSONMarker(this, geojsonPoint, latlng)
                    .leafletInstance;
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

                new GeoJSONFeature(this, feature, layer);
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

class GeoJSONMarker {
    marker: Marker;
    leafletInstance: DivIconMarker;
    title: string;
    description: string;
    iconDisplay: HTMLDivElement;
    descriptionDisplay: HTMLDivElement;
    get map() {
        return this.parent.map;
    }
    constructor(
        private parent: GeoJSON,
        private feature: geojson.Feature<geojson.Point, any>,
        latlng: L.LatLng
    ) {
        const type = feature?.properties["marker-symbol"] ?? "default";
        const icon =
            this.map.markerIcons.get(type) ??
            this.map.markerIcons.get("default");
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
        this.marker = new Marker(this.map, {
            id: getId(),
            type: type,
            loc: latlng,
            //TODO: What is this?
            link: "display.outerHTML",
            icon: icon.icon,
            layer: this.map.currentGroup?.id,
            mutable: false,
            command: false,
            zoom: this.map.zoom.max,
            percent: undefined,
            description: undefined
        });

        this.leafletInstance = this.marker.leafletInstance;

        this.leafletInstance.off("mouseover");
        this.leafletInstance.off("click");
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            if (
                (!evt.originalEvent.getModifierState("Shift") ||
                    !evt.originalEvent.getModifierState("Alt")) &&
                this.title
            ) {
                this.parent.popup
                    .setTarget(this.marker)
                    .open(this.descriptionDisplay);
                return;
            }
        });
        this.leafletInstance.on("mouseover", () => {
            if (this.map.isDrawing || !this.description) return;

            this.parent.popup.setTarget(this.marker).open(this.iconDisplay);
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
