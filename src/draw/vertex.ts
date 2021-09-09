import { LatLng } from "leaflet";
import { Events } from "obsidian";
import { Marker } from "src/layer";
import { MarkerDivIcon } from "src/map";
import { getId } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Shape } from "./shape";
const L = window[LeafletSymbol];

class VertexIcon extends MarkerDivIcon {
    constructor() {
        super({
            iconSize: new L.Point(8, 8),
            className: "leaflet-div-icon leaflet-vertex-icon"
        });
    }
}

declare module "leaflet" {
    interface Marker {
        _icon: HTMLElement;
    }
}

export class VertexProperties {
    lat: number;
    lng: number;
    id: string;
    targets: {
        vertexIds?: string[];
        markerId?: string;
    };
}

export class Vertex extends Events {
    incrementLatLng(delta: LatLng): void {
        const lat = this.latlng.lat + delta.lat;
        const lng = this.latlng.lng + delta.lng;

        this.leafletInstance.setLatLng(L.latLng(lat, lng));
    }
    leafletInstance: L.Marker;
    selected: boolean = false;
    isBeingHovered: boolean = false;
    marker: Marker;
    vertices: Set<Vertex> = new Set();
    modifierState: boolean = false;
    getLatLng() {
        return this.leafletInstance.getLatLng();
    }
    setLatLng(latlng: L.LatLng) {
        this.leafletInstance.setLatLng(latlng);
        this.parent.redraw();
        if (this.marker && this.marker.leafletInstance) {
            this.marker.leafletInstance.setLatLng(latlng);
        }
        this.vertices.forEach((v) => v.updateLatLng(latlng));
    }
    updateLatLng(latlng: LatLng): void {
        this.leafletInstance.setLatLng(latlng);

        this.trigger("drag");

        this.parent.redraw();
    }
    get latlng() {
        return this.getLatLng();
    }
    constructor(
        latlng: L.LatLng,
        public parent: Shape<L.Path>,
        public targets?: {
            marker?: Marker;
            vertices?: Vertex[];
            markerId?: string;
            vertexIds?: string[];
        },
        public id = getId()
    ) {
        super();

        this.addMarkerTarget(targets?.marker);
        this.addVertexTargets(...(targets?.vertices ?? []));

        this.addTargetsById();

        this.leafletInstance = new L.Marker(latlng, {
            icon: new VertexIcon(),
            draggable: true,
            pane: "drawing-markers"
        }).addTo(this.parent.map.leafletInstance);

        this.registerDragEvents();

        if (this.vertices.size) {
            this.vertices.forEach((v) => {
                v.addVertexTargets(this);
                v.marker = this.marker;
            });
        }
    }

    addTargetsById() {
        if (this.targets && this.targets.vertexIds) {
            let vertices = this.parent.controller.vertices;

            for (let id of this.targets.vertexIds) {
                let vertex = vertices.find((v) => v.id == id);
                if (!vertex) continue;
                this.addVertexTargets(vertex);
            }
        }
        if (this.targets && this.targets.markerId) {
            const marker = this.parent.map.markers.find(
                (m) => m.id == this.targets.markerId
            );
            if (!marker) return;
            this.addMarkerTarget(marker as Marker);
        }
    }

    addMarkerTarget(marker: Marker, propagate: boolean = true) {
        if (!marker) return;
        this.marker = marker;
        if (propagate)
            this.vertices.forEach((v) => v.addMarkerTarget(this.marker, false));
        this.registerMarkerEvents();
    }
    addVertexTargets(...vertices: Vertex[]) {
        for (let vertex of vertices) {
            if (vertex == this) continue;
            this.vertices.add(vertex);
            vertex.vertices.forEach(
                (v) => this.vertices.add(v) && v.vertices.add(this)
            );
            vertex.vertices.add(this);

            if (vertex.marker) {
                this.addMarkerTarget(vertex.marker);
            } else if (this.marker) {
                vertex.addMarkerTarget(this.marker);
                vertex.vertices.forEach((v) => v.addMarkerTarget(this.marker));
            }
            vertex.on("delete", () => {
                this.vertices.delete(vertex);
            });
        }
        this.vertices.delete(this);
    }

    registerDragEvents() {
        this.leafletInstance.on(
            "drag",
            (evt: L.LeafletMouseEvent, data?: any) => {
                L.DomEvent.stopPropagation(evt);

                this.modifierState =
                    evt.originalEvent?.getModifierState("Shift") ?? false;
                let latlng = this.parent.getMousemoveDelta(
                    evt.latlng,
                    this.latlng,
                    this.modifierState
                );

                if (!this.modifierState) {
                    if (this.parent.controller.getVertexTargets(this)) {
                        const vertex =
                            this.parent.controller.getVertexTargets(this);
                        latlng = vertex.getLatLng();
                    }
                    if (this.parent.map.markers.find((m) => m.isBeingHovered)) {
                        const marker = this.parent.map.markers.find(
                            (m) => m.isBeingHovered
                        ).leafletInstance;
                        latlng = marker.getLatLng();
                    }
                }

                this.setLatLng(latlng);

                this.trigger("drag");
            }
        );
        this.leafletInstance.on("mouseover", () => {
            this.isBeingHovered = true;
        });
        this.leafletInstance.on("mouseout", () => {
            this.isBeingHovered = false;
        });
        this.leafletInstance.on("mousedown", (evt: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(evt);
            this.selected = true;
        });
        this.leafletInstance.on("mouseup", (evt) => {
            L.DomEvent.stopPropagation(evt);
            this.selected = false;
        });
        this.leafletInstance.on("dragstart", () => {
            this.selected = true;
            this.leafletInstance.setZIndexOffset(-1);
        });
        this.leafletInstance.on("dragend", (evt) => {
            L.DomEvent.stopPropagation(evt);
            this.leafletInstance.setZIndexOffset(0);
            if (!this.modifierState) {
                if (this.parent.controller.getVertexTargets(this)) {
                    const vertex =
                        this.parent.controller.getVertexTargets(this);
                    this.addVertexTargets(vertex);
                }
                if (
                    this.parent.map.markers.find(
                        (marker) => marker.isBeingHovered
                    )
                ) {
                    this.marker = this.parent.map.markers.find(
                        (marker) => marker.isBeingHovered
                    ) as Marker;
                    this.registerMarkerEvents();
                }
            }
            this.modifierState = false;
            this.parent.redraw();
            this.parent.map.plugin.saveSettings();
        });
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(evt);
            if (this.parent.controller.isDrawing) {
                this.selected = false;
                this.parent.controller.shape.onClick(evt, { vertices: [this] });
            }
        });
        this.registerMarkerEvents();
    }
    unregisterMarkerEvents() {
        if (this.marker) {
            this.marker.leafletInstance.off("drag", this.onTargetDrag, this);
        }
    }
    onTargetDrag(evt: L.LeafletMouseEvent) {
        this.leafletInstance.fire("drag", evt);
    }
    registerMarkerEvents() {
        if (this.marker) {
            this.marker.leafletInstance.on("drag", this.onTargetDrag, this);
            this.marker.leafletInstance.on("remove", () => {
                this.unregisterMarkerEvents();
                this.marker = null;
            });
        }
    }
    delete() {
        this.trigger("delete");
        this.unregisterMarkerEvents();
        this.hide();
    }
    hide() {
        this.leafletInstance.remove();
    }
    show() {
        this.leafletInstance.addTo(this.parent.map.leafletInstance);
    }
    toProperties(): VertexProperties {
        return {
            lat: this.latlng.lat,
            lng: this.latlng.lng,
            id: this.id,
            targets: {
                vertexIds: Array.from(this.vertices).map((v) => v.id),
                markerId: this.marker?.id
            }
        };
    }
    static fromProperties(properties: VertexProperties, shape: Shape<L.Path>) {
        const vertex = new Vertex(
            L.latLng(properties.lat, properties.lng),
            shape,
            properties.targets,
            properties.id
        );
        return vertex;
    }
}
class MidIcon extends L.DivIcon {
    constructor() {
        super({
            iconSize: new L.Point(6, 6),
            className: "leaflet-div-icon leaflet-mid-icon"
        });
    }
}

export class MiddleVertex {
    leafletInstance: L.Marker;
    getLatLng() {
        return this.leafletInstance.getLatLng();
    }
    constructor(public latlng: L.LatLng, public parent: Shape<L.Path>) {
        this.leafletInstance = new L.Marker(latlng, {
            icon: new MidIcon(),
            draggable: true,
            pane: "drawing-markers"
        }).addTo(this.parent.map.leafletInstance);
    }
}
