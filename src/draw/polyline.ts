import { FontAwesomeControl } from "src/controls/controls";
import t from "src/l10n/locale";
import { Marker } from "src/layer";
import { getId } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
import { DrawingController } from "./controller";
import { DrawControl } from "./controls";
import { Shape, ShapeProperties } from "./shape";
import { Vertex, VertexProperties } from "./vertex";

const L = window[LeafletSymbol];

export interface PolylineProperties extends ShapeProperties {
    arrows: boolean;
    reversed: boolean;
}
export class Polyline extends Shape<L.Polyline> {
    triangleID = getId();
    constructor(
        controller: DrawingController,
        vertices: VertexProperties[] = [],
        color: string = controller.color,
        public arrows = controller.isAddingArrows,
        public reversed = false
    ) {
        super(controller, vertices, color);
        this.triangleEl.setAttrs({
            id: `${this.triangleID}`,
            viewBox: "0 0 10 10",
            refX: "5",
            refY: "5",
            markerUnits: "strokeWidth",
            markerWidth: "5",
            markerHeight: "5",
            orient: "auto",
            fill: color
        });
        this.pathEl.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
        this.triangleEl.appendChild(this.pathEl);
        this.checkAndAddDef();
        if (this.arrows) {
            this.addArrows();
            if (this.reversed) this.reverseArrows();
            this.redraw();
        }
    }
    triangleEl = L.SVG.create("marker");
    pathEl = L.SVG.create("path");
    popup: null;
    setColor(color: string) {
        super.setColor(color);
        this.triangleEl.setAttribute("fill", color);
    }
    toggleArrows() {
        this.redraw();
        if (!this.arrows) {
            this.addArrows();
        } else if (!this.reversed) {
            this.reverseArrows();
        } else {
            this.removeArrows();
        }
        this.redraw();
        this.map.trigger("should-save");
    }
    reverseArrows() {
        this.reversed = true;
        this.pathEl.setAttribute("transform", "rotate(180 5 5)");
    }
    addArrows() {
        this.arrows = true;
        if (this.element) {
            this.element.setAttribute("marker-mid", `url(#${this.triangleID})`);
        } else {
            this.leafletInstance.on("add", () => {
                this.element.setAttribute(
                    "marker-mid",
                    `url(#${this.triangleID})`
                );
            });
        }
        this.leafletInstance.options.smoothFactor = 0;
    }
    get element() {
        return this.leafletInstance.getElement();
    }
    removeArrows() {
        this.arrows = false;
        this.reversed = false;
        this.element.removeAttribute("marker-mid");
        this.pathEl.removeAttribute("transform");
        this.leafletInstance.options.smoothFactor = 1;
    }
    toProperties(): PolylineProperties {
        return {
            type: this.type,
            color: this.color,
            vertices: this.vertices.map((v) => v.toProperties()),
            arrows: this.arrows,
            reversed: this.reversed
        };
    }
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
        if (this.vertices.length == 0) {
            this.checkAndAddDef();
        }
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

    get coordinates() {
        if (!this.arrows) return this.latlngs;
        //return 1 extra coordinate per latlng
        if (!this.latlngs.length) return [];
        return [
            this.latlngs[0],
            ...this.latlngs
                .slice(1)
                .map((latlng, index) => [
                    L.latLngBounds(this.latlngs[index], latlng).getCenter(),
                    latlng
                ])
                .flat()
        ];
    }

    redraw() {
        this.leafletInstance.setLatLngs(this.coordinates);
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
    get pane() {
        return this.map.leafletInstance.getPane("drawing");
    }
    checkAndAddDef() {
        if (!this.pane) return;
        const svg = this.pane.firstElementChild;
        if (!svg) {
            this.registerAddDef();
        } else {
            this.addDef();
        }
    }
    registerAddDef() {
        const observer = new MutationObserver((list) => {
            for (const mutation of list) {
                if (mutation.type === "childList") {
                    this.addDef();
                    observer.disconnect();
                    return;
                }
            }
        });
        observer.observe(this.pane, {
            childList: true,
            attributes: false,
            subtree: false
        });
    }

    addDef() {
        let def = this.pane.firstElementChild.querySelector("defs");
        if (!def) {
            def = L.SVG.create("defs") as SVGDefsElement;
            this.pane.firstElementChild.prepend(def);
        }
        def.appendChild(this.triangleEl);
    }
    onShow() {
        this.checkAndAddDef();
        if (this.arrows) {
            this.addArrows();
            if (this.reversed) this.reverseArrows();
            this.redraw();
        }
    }
    remove() {
        this.hideExtensions();
        this.removeArrows();
        super.remove();
    }
}

export class PolylineControl extends BaseDrawControl {
    arrow = new ArrowControl(this);

    constructor(public parent: DrawControl) {
        super(
            {
                icon: "project-diagram",
                cls: "leaflet-control-has-actions leaflet-control-draw-polyline",
                tooltip: t("Polyline")
            },
            parent
        );

        this.actionsEl.appendChild(this.arrow.controlEl);
        this.actionsEl.appendChild(this.undo.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();
        this.controller.newShape(new Polyline(this.controller));
    }
}

export class ArrowControl extends FontAwesomeControl {
    get active() {
        return this.drawControl.controller.isAddingArrows;
    }
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "arrow-up",
                cls: "leaflet-control-arrow",
                tooltip: "Add Arrows to Line"
            },
            drawControl.map.leafletInstance
        );
    }
    //Complete and save
    onClick(evt: MouseEvent) {
        evt.stopPropagation();

        if (this.active) {
            this.controlEl.removeClass("active");
            this.drawControl.controller.setArrowContext(false);
        } else {
            this.controlEl.addClass("active");
            this.drawControl.controller.setArrowContext(true);
        }

        /* this.drawControl.controller.newShape(
            this.drawControl.controller.shape.newInstance()
        ); */
    }
}
