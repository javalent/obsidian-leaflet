import { LatLng } from "leaflet";
import { Marker } from "src/layer/marker";
import t from "src/l10n/locale";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
import { DrawControl } from "./controls";
import { Shape } from "./shape";
import { Vertex } from "./vertex";

const L = window[LeafletSymbol];

export class Rectangle extends Shape<L.Rectangle> {
    popup: null;

    leafletInstance = L.rectangle(
        [
            [0, 0],
            [0, 0]
        ],
        this.options
    ).addTo(this.map.leafletInstance);
    bounds: L.LatLngBounds;
    get canSave() {
        return this.vertices.length == 4;
    }
    ghost: L.Rectangle;

    _onClick(
        evt: L.LeafletMouseEvent,
        targets?: {
            marker?: Marker;
            vertices?: Vertex[];
        }
    ) {
        if (this.vertices.length == 0) {
            this.vertices.push(new Vertex(evt.latlng, this, targets));
            this.bounds = L.latLngBounds(evt.latlng, evt.latlng);
            this.redraw();
        } else if (this.vertices.length == 1) {
            this.bounds = L.latLngBounds(this.latlngs[0], evt.latlng);

            this.vertices.push(new Vertex(evt.latlng, this, targets));

            //get corners
            this.syncVerticesToCorners();

            this.registerVertexDrags();

            this.redraw();
            this.ghost.remove();
            this.ghost = null;
            this.controller.newShape(this.newInstance());
            return;
        }
    }
    syncVerticesToCorners() {
        const northWest =
            this.vertices.find((v) =>
                v.latlng.equals(this.bounds.getNorthWest())
            ) ?? new Vertex(this.bounds.getNorthWest(), this);

        const northEast =
            this.vertices.find((v) =>
                v.latlng.equals(this.bounds.getNorthEast())
            ) ?? new Vertex(this.bounds.getNorthEast(), this);

        const southEast =
            this.vertices.find((v) =>
                v.latlng.equals(this.bounds.getSouthEast())
            ) ?? new Vertex(this.bounds.getSouthEast(), this);

        const southWest =
            this.vertices.find((v) =>
                v.latlng.equals(this.bounds.getSouthWest())
            ) ?? new Vertex(this.bounds.getSouthWest(), this);

        this.vertices = [northWest, northEast, southEast, southWest];
    }

    _onMousemove(latlng: L.LatLng, modifier: boolean) {
        if (this.vertices.length) {
            this.showGhost(latlng);
        }
    }
    showGhost(latlng: LatLng) {
        if (this.vertices.length == 2) return;
        if (!this.ghost) {
            this.ghost = L.rectangle(L.latLngBounds(this.latlngs[0], latlng), {
                dashArray: "5,10",
                weight: 1,
                interactive: false,
                fillOpacity: 0.5,
                color: this.controller.color,
                fillColor: this.controller.color
            }).addTo(this.map.leafletInstance);
        }
        this.ghost.setBounds(L.latLngBounds(this.latlngs[0], latlng));
    }
    get boundsArray() {
        return [
            this.bounds.getNorthWest(),
            this.bounds.getNorthEast(),
            this.bounds.getSouthEast(),
            this.bounds.getSouthWest()
        ];
    }
    registerVertexDrags() {
        this.vertices[0].on("drag", () => {
            this.vertices[3].setLatLng(
                L.latLng([
                    this.vertices[3].getLatLng().lat,
                    this.vertices[0].getLatLng().lng
                ])
            );
            this.vertices[1].setLatLng(
                L.latLng([
                    this.vertices[0].getLatLng().lat,
                    this.vertices[1].getLatLng().lng
                ])
            );
        });
        this.vertices[1].on("drag", () => {
            this.vertices[2].setLatLng(
                L.latLng([
                    this.vertices[2].getLatLng().lat,
                    this.vertices[1].getLatLng().lng
                ])
            );
            this.vertices[0].setLatLng(
                L.latLng([
                    this.vertices[1].getLatLng().lat,
                    this.vertices[0].getLatLng().lng
                ])
            );
        });
        this.vertices[2].on("drag", () => {
            this.vertices[1].setLatLng(
                L.latLng([
                    this.vertices[1].getLatLng().lat,
                    this.vertices[2].getLatLng().lng
                ])
            );
            this.vertices[3].setLatLng(
                L.latLng([
                    this.vertices[2].getLatLng().lat,
                    this.vertices[3].getLatLng().lng
                ])
            );
        });
        this.vertices[3].on("drag", () => {
            this.vertices[0].setLatLng(
                L.latLng([
                    this.vertices[0].getLatLng().lat,
                    this.vertices[3].getLatLng().lng
                ])
            );
            this.vertices[2].setLatLng(
                L.latLng([
                    this.vertices[3].getLatLng().lat,
                    this.vertices[2].getLatLng().lng
                ])
            );
        });
    }
    updateBounds() {
        if (this.vertices.length != 4) {
            return;
        }
        this.bounds = L.latLngBounds(this.latlngs);
    }

    redraw() {
        this.updateBounds();
        this.leafletInstance.setBounds(this.bounds);
        this.leafletInstance.redraw();
    }

    showExtensions(latlng: L.LatLng) {}

    stopDrawing() {
        if (this.vertices.length === 1) {
            this.remove();
        }
        if (this.ghost) {
            this.ghost.remove();
            this.ghost = null;
        }
    }

    undo() {
        if (this.controller.shapes.length)
            this.controller.shapes.rectangle.pop().remove();
    }

    newInstance() {
        this.stopDrawing();
        return new Rectangle(this.controller);
    }

    initialize() {
        this.redraw();
        this.hideVertices();
        this.syncVerticesToCorners();
        this.registerVertexDrags();
    }

    type = "rectangle";
}

export class RectangleControl extends BaseDrawControl {
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "vector-square",
                cls: "leaflet-control-has-actions leaflet-control-draw-rectangle",
                tooltip: t("Rectangle")
            },
            parent
        );
    }
    draw() {
        this.actionsEl.appendChild(this.undo.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();
        this.controller.newShape(new Rectangle(this.controller));
    }
}
