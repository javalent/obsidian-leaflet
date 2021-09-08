import t from "src/l10n/locale";
import { Marker } from "src/layer";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
import { DrawControl } from "./controls";
import { Shape } from "./shape";
import { Vertex } from "./vertex";

const L = window[LeafletSymbol];

export class Polyline extends Shape<L.Polyline> {
    popup: null;

    extensions = {
        forward: {
            line: L.polyline([], {
                ...this.options,
                dashArray: "5,10",
                weight: 1,
                interactive: false
            }),
            added: false
        }
    };
    leafletInstance = L.polyline([], this.options).addTo(
        this.map.leafletInstance
    );
    mouseLoc: any;
    get canSave() {
        return this.vertices.length >= 1;
    }
    addLatLng(latlng: L.LatLng) {
        this.vertices.push(new Vertex(latlng, this));
    }

    hideExtensions() {
        this.extensions.forward.line.remove();
        this.extensions.forward.added = false;
    }

    _onClick(
        evt: L.LeafletMouseEvent,
        targets?: {
            marker?: Marker;
            vertices?: Vertex[];
        }
    ) {
        this.vertices.push(
            new Vertex(this.mouseLoc ?? evt.latlng, this, targets)
        );
        this.redraw();
    }

    _onMousemove(latlng: L.LatLng, modifier: boolean) {
        if (this.vertices.length) {
            this.mouseLoc = this.getMousemoveDelta(latlng, null, modifier);
            this.showExtensions(this.mouseLoc);
        }
    }

    redraw() {
        this.leafletInstance.setLatLngs(this.latlngs);
        this.leafletInstance.redraw();
        this.showExtensions(this.latlngs[this.vertices.length - 1]);
    }

    showExtensions(latlng: L.LatLng) {
        if (this.vertices.length >= 1) {
            this.extensions.forward.line.setLatLngs([
                this.latlngs[this.vertices.length - 1],
                latlng
            ]);
            if (this.extensions.forward.added) {
                this.extensions.forward.line.redraw();
            } else {
                this.extensions.forward.line.addTo(this.map.leafletInstance);
                this.extensions.forward.added = true;
            }
        }
    }

    stopDrawing() {
        this.extensions.forward.line.remove();
        if (this.vertices.length === 1) {
            this.remove();
        }
    }

    undo() {
        this.vertices.pop();

        this.hideExtensions();
        this.redraw();
    }

    initialize() {
        this.hideVertices();
        this.redraw();
    }

    newInstance() {
        this.stopDrawing();
        return new Polyline(this.controller);
    }
    type = "polyline";
}

export class PolylineControl extends BaseDrawControl {
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "project-diagram",
                cls: "leaflet-control-has-actions leaflet-control-draw-polyline",
                tooltip: t("Polyline")
            },
            parent
        );
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
        this.actionsEl.appendChild(this.undo.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();
        this.controller.newShape(new Polyline(this.controller));
    }
}
