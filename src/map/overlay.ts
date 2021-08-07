import convert from "convert";

import { LeafletMap, SavedOverlayData, LayerGroup } from "src/@types";
import { MODIFIER_KEY } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";

let L = window[LeafletSymbol];
export class Overlay {
    leafletInstance: L.Circle;

    get radius() {
        let radius = this.radiusInMeters;
        if (this.map.type == "image") {
            radius = convert(radius).from("m").to(this.map.unit);
            radius = radius / this.map.scale;
        }
        console.log("🚀 ~ file: overlay.ts ~ line 16 ~ radius", radius);
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

    get layer() {
        return this.data.layer;
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
                ` (${this.map.distanceFormatter.format(radius)} ${
                    this.map.unit
                })`
            );
        } else {
            return `${this.map.distanceFormatter.format(radius)} ${
                this.map.unit
            }`;
        }
    }

    constructor(private map: LeafletMap, public data: SavedOverlayData) {
        this.leafletInstance = L.circle(L.latLng(this.data.loc), {
            radius: this.radius,
            color: this.color
        });

        this.map.on("ready-for-features", (layer: LayerGroup) => {
            if (layer.id === this.layer) {
                layer.overlays[this.type].addLayer(this.leafletInstance);
            }
        });

        if (this.map.rendered) {
            let layer =
                this.map.mapLayers.find(({ id }) => id === this.layer) ??
                this.map.group;

            this.leafletInstance.addTo(layer.overlays[this.type]);
        }

        this.bindEvents();
    }
    private bindEvents() {
        this.leafletInstance
            .on("contextmenu", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                this.map.handleMapContext(evt, this);
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                this.map.openPopup(this.leafletInstance, this.description);
            })
            .on("click", (evt: L.LeafletMouseEvent) => {
                if (evt.originalEvent.getModifierState(MODIFIER_KEY)) {
                    this.focus();
                    return;
                }
                this.map.openPopup(this.leafletInstance, this.description);
            });
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
        const { lat, lng } = this.map.formatLatLng(
            this.leafletInstance.getBounds().getCenter()
        );

        this.map.log(
            `Feature was Control clicked. Moving to bounds [${lat}, ${lng}]`
        );

        this.map.map.fitBounds(this.leafletInstance.getBounds());
    }

    static from(map: LeafletMap, data: SavedOverlayData) {
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
            tooltip: this.data.tooltip
        };
    }
}
