import { Layer } from "src/layer/layer";
import { DrawingController } from "./controller";
import { Vertex, VertexProperties } from "./vertex";
import { Marker } from "src/layer";

import { LeafletSymbol } from "src/utils/leaflet-import";

const L = window[LeafletSymbol];
export interface ShapeProperties {
    type: string;
    color: string;
    vertices: VertexProperties[];
}

export abstract class Shape<T extends L.Path> extends Layer<T> {
    layer = "INTERNAL_SHAPE_LAYER";
    dragStart: L.LatLng;
    toProperties(): ShapeProperties {
        return {
            type: this.type,
            color: this.color,
            vertices: this.vertices.map((v) => v.toProperties())
        };
    }
    registerEvents() {
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {

            if (this.controller.isDeleting) {

                this.hideVertices();
                this.controller.removeShape(this);
            }
            if (this.controller.isColoring) {
                this.setColor(this.controller.color);
            }

        });
        this.leafletInstance.on("mousedown", (evt: L.LeafletMouseEvent) => {

            if (!this.controller.isDragging) return;
            this.map.leafletInstance.dragging.disable();
            this.dragStart = evt.latlng;
            this.controller.draggingShape = this;
        });
        this.leafletInstance.on("mouseup", (evt: L.LeafletMouseEvent) => {

            if (!this.controller.isDragging) return;
            this.map.leafletInstance.dragging.enable();
            this.controller.draggingShape = null;

            this.map.trigger("should-save");
        });
    }
    options: L.PathOptions = {
        pane: "drawing",
        color: this.color,
        fillColor: this.color
    };
    constructor(
        public controller: DrawingController,
        vertices: VertexProperties[] = [],
        public color: string = controller.color
    ) {
        super();
        this.map = this.controller.map;
        this.vertices = vertices.map((props) =>
            Vertex.fromProperties(props, this)
        );
        this.hideVertices();
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

    onDrag(evt: L.LeafletMouseEvent, propagate: boolean = true) {
        L.DomEvent.stop(evt);
        if (!this.dragStart) this.dragStart = evt.latlng;
        const latlng = this.getMousemoveDelta(
            evt.latlng,
            this.dragStart,
            evt.originalEvent.getModifierState("Shift")
        );
        const delta = L.latLng(
            latlng.lat - this.dragStart.lat,
            latlng.lng - this.dragStart.lng
        );
        this.vertices.forEach((v) => v.incrementLatLng(delta));
        this.redraw();
        
        if (propagate) {
            const otherShapes: Set<Shape<L.Path>> = new Set();
            this.vertices.forEach((v) =>
                v.vertices.forEach(
                    (vertex) => vertex && otherShapes.add(vertex.parent)
                )
            );

            otherShapes.forEach((shape) => {
                shape.dragStart = this.dragStart;
                shape.onDrag(evt, false);
            });
        }
        this.dragStart = evt.latlng;
    }

    checkAndAddToMap() {
        if (this.map.readyForDrawings) {
            this.show();
        } else {
            this.map.on("ready-for-drawings", () => this.show());
        }
    }

    abstract initialize(): void;

    show() {
        if (this.vertices.length) {
            this.initialize();
            this.registerEvents();
        }
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
        this.color = color;
        this.leafletInstance.setStyle({ fillColor: color, color: color });
        this.map.trigger('should-save');
    }

    remove() {
        this.leafletInstance.remove();
        this.hideVertices();
        this.vertices.forEach((v) => v.delete());
        this.vertices = [];
        this.map.trigger("should-save");
    }
}
