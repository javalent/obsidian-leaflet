import { Layer } from "src/layer/layer";
import { BaseMapType } from "src/@types/map";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { DrawingController } from "./controller";
import { Vertex } from "./vertex";
import { Marker } from "src/layer";

const L = window[LeafletSymbol];

export abstract class Shape<T extends L.Path> extends Layer<T> {
    registerDeleteEvent() {
        this.leafletInstance.on("click", () => {
            if (this.controller.isDeleting) {
                console.log("delete");
                this.hideVertices();
                this.controller.removeShape(this);
            }
        });
    }
    options: L.PathOptions = {
        pane: "drawing",
        color: this.controller.color,
        fillColor: this.controller.color
    };
    constructor(
        public controller: DrawingController,
        latlngs: L.LatLng[] = []
    ) {
        super();
        this.map = this.controller.map;
        this.vertices = latlngs.map((ll) => new Vertex(ll, this));
    }

    get group() {
        return this.map.drawingLayer;
    }

    vertices: Vertex[] = [];

    get latlngs() {
        return this.vertices.map((v) => v.getLatLng());
    }
    mouseLoc: L.LatLng;

    abstract get canSave(): boolean;
    abstract newInstance(): Shape<T>;
    abstract _onMousemove(latlng: L.LatLng, modifier: boolean): void;
    onClick(
        evt: L.LeafletMouseEvent,
        targets?: {
            marker?: Marker;
            vertices?: Vertex[];
        }
    ) {
        let vertex = this.controller.getSelectedVertex();
        if (vertex) {
            vertex.selected = false;
            return;
        }
        this._onClick(evt, targets);
    }
    abstract _onClick(
        evt: L.LeafletMouseEvent,
        targets?: {
            marker?: Marker;
            vertices?: Vertex[];
        }
    ): void;
    abstract redraw(): void;
    abstract stopDrawing(): void;
    abstract undo(): void;

    abstract type: string;

    onMousemove(evt: L.LeafletMouseEvent) {
        let latlng = evt.latlng;
        if (!evt.originalEvent.getModifierState("Shift")) {
            if (this.controller.vertices.find((v) => v.isBeingHovered)) {
                const vertex = this.controller.vertices.find(
                    (v) => v.isBeingHovered
                );
                latlng = vertex.getLatLng();
            } else if (this.map.markers.find((m) => m.isBeingHovered)) {
                const marker = this.map.markers.find(
                    (m) => m.isBeingHovered
                ).leafletInstance;
                latlng = marker.getLatLng();
            }
        }
        this._onMousemove(latlng, evt.originalEvent.getModifierState("Shift"));
    }

    showVertices() {
        this.vertices.forEach((vertex) => {
            vertex.show();
        });
    }
    hideVertices() {
        this.vertices.forEach((vertex) => {
            vertex.hide();
        });
    }

    getMousemoveDelta(
        latlng: L.LatLng,
        previous?: L.LatLng,
        modifier?: boolean
    ) {
        if (modifier) {
            const delta = [
                Math.abs(
                    latlng.lat -
                        (previous ?? this.latlngs[this.vertices.length - 1]).lat
                ),
                Math.abs(
                    latlng.lng -
                        (previous ?? this.latlngs[this.vertices.length - 1]).lng
                )
            ];
            if (delta[0] > delta[1]) {
                latlng.lng = (
                    previous ?? this.latlngs[this.vertices.length - 1]
                ).lng;
            } else {
                latlng.lat = (
                    previous ?? this.latlngs[this.vertices.length - 1]
                ).lat;
            }
        }
        return latlng;
    }

    setColor(color: string) {
        this.leafletInstance.setStyle({ fillColor: color, color: color });
    }

    remove() {
        this.leafletInstance.remove();
        this.hideVertices();
        this.vertices.forEach((v) => v.delete());
        this.vertices = [];
    }
}
