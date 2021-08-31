import { LatLng } from "leaflet";
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
        return this.vertexes.length == 2;
    }
    ghost: L.Rectangle;

    vBounds: Record<string, Vertex> = {
        nw: null,
        ne: null,
        se: null,
        sw: null
    };

    onClick(evt: L.LeafletMouseEvent) {
        if (this.vertexes.length == 0) {
            this.vertexes.push(new Vertex(evt.latlng, this));
            this.bounds = L.latLngBounds(evt.latlng, evt.latlng);
            this.redraw();
        } else if (this.vertexes.length == 1) {
            this.bounds = L.latLngBounds(this.latlngs[0], evt.latlng);
            this.vertexes.push(
                new Vertex(this.bounds.getNorthEast(), this),
                new Vertex(this.bounds.getSouthEast(), this),
                new Vertex(this.bounds.getSouthWest(), this)
            );
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
    updateBounds() {
        if (this.vertexes.length != 4) {
            return;
        }

        const changed = this.latlngs.indexOf(
            this.latlngs.find(
                (ll) => !this.boundsArray.find((l) => l.equals(ll))
            )
        );
        const next = (((changed + 1) % 4) + 4) % 4;
        const previous = (((changed - 1) % 4) + 4) % 4;
        console.log(changed, next);

        

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
            this.leafletInstance.remove();
            this.hideVertexes();
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
