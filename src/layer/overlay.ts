import convert from "convert";

import { BaseMapType, SavedOverlayData } from "src/@types";
import { formatLatLng, formatNumber } from "src/utils";
import { DISTANCE_DECIMALS, MODIFIER_KEY } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Layer } from "../layer/layer";

let L = window[LeafletSymbol];
export class Overlay extends Layer<L.Circle> {
    leafletInstance: L.Circle;

    get radius() {
        let radius = this.radiusInMeters;
        if (this.map.type == "image") {
            radius = convert(radius).from("m").to(this.map.unit);
            radius = radius / this.map.scale;
        }
        return radius;
    }
    setRadius(radius: number) {
        this.data.radius = radius;
        this.leafletInstance.setRadius(this.radius);
    }

    get radiusInMeters() {
        return convert(this.data.radius)
            .from(this.data.unit ?? "m")
            .to("m");
    }

    get mutable() {
        return this.data.mutable;
    }
    setMutable(mutable: boolean) {
        this.data.mutable = mutable;
    }
    get color() {
        return this.data.color;
    }
    setColor(color: string) {
        this.data.color = color;
    }

    get id() {
        return this.data.id;
    }

    get latlng() {
        return this.leafletInstance.getLatLng();
    }

    get loc(): [number, number] {
        return [this.latlng.lat, this.latlng.lng];
    }

    get type() {
        if (this.data.id) {
            const marker = this.map.markers.find(
                ({ id }) => id === this.data.id
            );
            if (marker) return marker.type;
        }
        return "none";
    }

    get description() {
        let radius = convert(this.data.radius)
            .from(this.data.unit)
            .to(this.map.unit);
        if (this.type == "image") {
            radius = radius * this.map.scale;
        }
        if (this.data.desc) {
            return (
                this.data.desc +
                ` (${formatNumber(radius, DISTANCE_DECIMALS)} ${this.map.unit})`
            );
        } else {
            return `${formatNumber(radius, DISTANCE_DECIMALS)} ${
                this.map.unit
            }`;
        }
    }

    get group() {
        return this.mapLayer?.overlays[this.type];
    }

    get marker() {
        return this.data.marker;
    }

    constructor(public map: BaseMapType, public data: SavedOverlayData) {
        super();
        this.leafletInstance = L.circle(L.latLng(this.data.loc), {
            radius: this.radius,
            color: this.color
        });

        this.layer = data.layer;

        this.checkAndAddToMap();

        this.bindEvents();
    }

    show() {
        if (this.group) {
            this.group.addLayer(this.leafletInstance);
        }
    }

    private bindEvents() {
        this.leafletInstance
            .on("contextmenu", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                this.map.handleMapContext(evt, this);
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                this.map.popup.open(this.leafletInstance, this.description);
            })
            .on("click", (evt: L.LeafletMouseEvent) => {
                if (evt.originalEvent.getModifierState(MODIFIER_KEY)) {
                    this.focus();
                    return;
                }
                this.map.popup.open(this.leafletInstance, this.description);
            });

        if (this.marker) {
            const markers = this.map.getMarkersById(this.marker);

            if (!markers || !markers.length) return;
            markers[0].leafletInstance.on(
                "drag",
                (evt: L.LeafletMouseEvent) => {
                    this.leafletInstance.setLatLng(
                        markers[0].leafletInstance.getLatLng()
                    );
                }
            );
        }
    }
    public isUnder(evt: L.LeafletMouseEvent) {
        const element = this.leafletInstance.getElement();
        if (!element) return false;
        const { clientX, clientY } = evt.originalEvent;
        const { x, y, width, height } = element.getBoundingClientRect();
        const radius = width / 2;
        const center = [x + width / 2, y + height / 2];

        return (
            this.mutable &&
            Math.pow(clientX - center[0], 2) +
                Math.pow(clientY - center[1], 2) <
                Math.pow(radius, 2)
        );
    }
    focus() {
        const { lat, lng } = formatLatLng(
            this.leafletInstance.getBounds().getCenter()
        );

        this.map.log(
            `Feature was Control clicked. Moving to bounds [${lat}, ${lng}]`
        );

        this.map.leafletInstance.fitBounds(this.leafletInstance.getBounds());
    }

    static from(map: BaseMapType, data: SavedOverlayData) {
        return new Overlay(map, data);
    }

    toProperties(): SavedOverlayData {
        return {
            radius: this.data.radius,
            loc: this.loc,
            color: this.color,
            layer: this.data.layer,
            id: this.data.id,
            unit: this.data.unit,
            desc: this.data.desc,
            mutable: this.mutable,
            tooltip: this.data.tooltip,
            marker: this.marker
        };
    }
}
