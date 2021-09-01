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
        return this.vertexes.length == 4;
    }
    ghost: L.Rectangle;

    onClick(
        evt: L.LeafletMouseEvent,
        targets?: {
            marker?: Marker;
            vertexes?: Vertex[];
        }
    ) {
        let vertex = this.controller.getSelectedVertex();
        if (vertex) {
            vertex.selected = false;
            return;
        }

        if (this.vertexes.length == 0) {
            this.vertexes.push(new Vertex(evt.latlng, this, targets));
            this.bounds = L.latLngBounds(evt.latlng, evt.latlng);
            this.redraw();
        } else if (this.vertexes.length == 1) {
            this.bounds = L.latLngBounds(this.latlngs[0], evt.latlng);
            console.log(
                "🚀 ~ file: rectangle.ts ~ line 47 ~ this.bounds",
                this.bounds.toBBoxString()
            );

            this.vertexes.push(new Vertex(evt.latlng, this, targets));

            //get corners
            const northWest =
                this.vertexes.find((v) =>
                    v.latlng.equals(this.bounds.getNorthWest())
                ) ?? new Vertex(this.bounds.getNorthWest(), this);

            const northEast =
                this.vertexes.find((v) =>
                    v.latlng.equals(this.bounds.getNorthEast())
                ) ?? new Vertex(this.bounds.getNorthEast(), this);

            const southEast =
                this.vertexes.find((v) =>
                    v.latlng.equals(this.bounds.getSouthEast())
                ) ?? new Vertex(this.bounds.getSouthEast(), this);

            const southWest =
                this.vertexes.find((v) =>
                    v.latlng.equals(this.bounds.getSouthWest())
                ) ?? new Vertex(this.bounds.getSouthWest(), this);

            this.vertexes = [northWest, northEast, southEast, southWest];

            this.registerVertexDrags();

            this.redraw();
            this.ghost.remove();
            this.ghost = null;
            this.controller.newShape(this.newInstance());
            return;
        }
    }

    _onMousemove(latlng: L.LatLng, modifier: boolean) {
        if (this.vertexes.length) {
            this.showGhost(latlng);
        }
    }
    showGhost(latlng: LatLng) {
        if (this.vertexes.length == 2) return;
        if (!this.ghost) {
            this.ghost = L.rectangle(L.latLngBounds(this.latlngs[0], latlng), {
                dashArray: "5,10",
                weight: 1,
                interactive: false,
                fillOpacity: 0.5
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
        this.vertexes[0].onDrag = () => {
            this.vertexes[3].setLatLng(
                L.latLng([
                    this.vertexes[3].getLatLng().lat,
                    this.vertexes[0].getLatLng().lng
                ])
            );
            this.vertexes[1].setLatLng(
                L.latLng([
                    this.vertexes[0].getLatLng().lat,
                    this.vertexes[1].getLatLng().lng
                ])
            );
        };
        this.vertexes[1].onDrag = () => {
            this.vertexes[2].setLatLng(
                L.latLng([
                    this.vertexes[2].getLatLng().lat,
                    this.vertexes[1].getLatLng().lng
                ])
            );
            this.vertexes[0].setLatLng(
                L.latLng([
                    this.vertexes[1].getLatLng().lat,
                    this.vertexes[0].getLatLng().lng
                ])
            );
        };
        this.vertexes[2].onDrag = () => {
            this.vertexes[1].setLatLng(
                L.latLng([
                    this.vertexes[1].getLatLng().lat,
                    this.vertexes[2].getLatLng().lng
                ])
            );
            this.vertexes[3].setLatLng(
                L.latLng([
                    this.vertexes[2].getLatLng().lat,
                    this.vertexes[3].getLatLng().lng
                ])
            );
        };
        this.vertexes[3].onDrag = () => {
            this.vertexes[0].setLatLng(
                L.latLng([
                    this.vertexes[0].getLatLng().lat,
                    this.vertexes[3].getLatLng().lng
                ])
            );
            this.vertexes[2].setLatLng(
                L.latLng([
                    this.vertexes[3].getLatLng().lat,
                    this.vertexes[2].getLatLng().lng
                ])
            );
        };
    }
    updateBounds() {
        if (this.vertexes.length != 4) {
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
        if (this.vertexes.length === 1) {
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
