import { BaseMapType } from "../types";
import {
    FontAwesomeControl,
    FontAwesomeControlOptions
} from "src/controls/controls";
import t from "src/l10n/locale";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
import { ColorControl } from "./color";
import { GeoJSONControl } from "./geojson";
import { PolygonControl } from "./polygon";
import { PolylineControl } from "./polyline";
import { RectangleControl } from "./rectangle";
import { TextControl } from "./text";

const L = window[LeafletSymbol];

export class DrawControl extends FontAwesomeControl {
    //draw tools
    section: HTMLElement;
    //context tools
    context: HTMLElement;

    //Controls
    polygon = new PolygonControl(this);
    rectangle = new RectangleControl(this);
    polyline = new PolylineControl(this);
    color = new ColorControl(this);
    drag = new DragControl(this);
    delete = new DeleteControl(this);
    geoJson = new GeoJSONControl(this);
    done = new DoneControl(this);

    /* free: FreeControl; */
    /* text: TextControl = new TextControl(this); */

    get controller() {
        return this.map.controller;
    }

    expanded: boolean;

    constructor(opts: FontAwesomeControlOptions, public map: BaseMapType) {
        super(opts, map.leafletInstance);
    }
    onClick(evt: MouseEvent) {}
    added() {
        //add hidden filter objects
        this.controlEl.addClass("leaflet-control-draw");

        this.section = this.controlEl.createEl("section", {
            cls: this.cls + "-list"
        });

        this.context = this.controlEl.createEl("section", {
            cls: this.cls + "-list"
        });

        this.draw();

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.iconEl.dataset["draggable"] = "false";

        this.map.on("click", this.collapse, this);

        L.DomEvent.on(this.controlEl, "click", () => this.expand());
    }
    complete() {
        this.stopDrawingContext();
        this.controller.hideVertices();
        this.collapse();
    }
    private collapse() {
        L.DomUtil.removeClass(this.controlEl, "expanded");
        this.enabled = false;
        return this;
    }
    draw() {
        this.section.appendChild(this.polygon.controlEl);
        this.section.appendChild(this.rectangle.controlEl);

        this.section.appendChild(this.polyline.controlEl);
        /* this.section.appendChild(this.text.controlEl); */

        this.section.appendChild(this.color.controlEl);
        this.section.appendChild(this.drag.controlEl);

        this.section.appendChild(this.delete.controlEl);
        this.section.appendChild(this.geoJson.controlEl);
        this.section.appendChild(this.done.controlEl);
    }
    private expand() {
        this.enabled = true;
        this.startDrawingContext();
        L.DomUtil.addClass(this.controlEl, "expanded");

        this.section.style.height = null;
        const acceptableHeight =
            this.leafletInstance.getSize().y - (this.controlEl.offsetTop + 50);

        if (acceptableHeight < this.section.clientHeight) {
            L.DomUtil.addClass(
                this.section,
                "leaflet-control-layers-scrollbar"
            );
            this.section.style.height = acceptableHeight + "px";
        } else {
            L.DomUtil.removeClass(
                this.section,
                "leaflet-control-layers-scrollbar"
            );
        }

        return this;
    }
    startDrawingContext() {
        this.controller.showVertices();
    }
    stopDrawingContext() {
        this.controller.saveShape();

        this.polygon.closeActions();
        this.rectangle.closeActions();
        this.polyline.closeActions();

        this.color.closeActions();
        this.controller.isColoring = false;

        this.drag.closeActions();
        this.controller.stopDragging();

        this.delete.closeActions();
        this.controller.isDeleting = false;
    }
}

class DragControl extends BaseDrawControl {
    get map() {
        return this.parent.map;
    }
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "arrows-alt",
                cls: "leaflet-control-has-actions leaflet-control-draw-drag",
                tooltip: t("Move Shapes")
            },
            parent
        );
        this.complete.onClick = (evt) => {
            evt.stopPropagation();
            this.parent.stopDrawingContext();
        };
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();
        this.parent.controller.startDragging();
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
    }
}
class DeleteControl extends BaseDrawControl {
    get map() {
        return this.parent.map;
    }
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "trash",
                cls: "leaflet-control-has-actions leaflet-control-draw-trash",
                tooltip: t("Delete Shapes")
            },
            parent
        );
        this.complete.onClick = (evt) => {
            evt.stopPropagation();
            this.parent.stopDrawingContext();
        };
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();
        this.parent.controller.isDeleting = true;
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
    }
}
class DoneControl extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "check",
                cls: "leaflet-control-draw-done",
                tooltip: t("Done")
            },
            parent.map.leafletInstance
        );
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        this.parent.complete();
        this.parent.map.trigger('should-save');
    }
}

export function drawControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "shapes",
        cls: "leaflet-control-expandable",
        tooltip: t("Draw")
    };
    return new DrawControl(options, map);
}
