import { BaseMapType } from "src/@types";
import {
    FontAwesomeControl,
    FontAwesomeControlOptions
} from "src/controls/controls";
import t from "src/l10n/locale";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
import { DrawingController } from "./controller";
import { PolygonControl } from "./polygon";
import { PolylineControl } from "./polyline";
import { RectangleControl } from "./rectangle";
const L = window[LeafletSymbol];

export class DrawControl extends FontAwesomeControl {
    //draw tools
    section: HTMLElement;
    //context tools
    context: HTMLElement;

    //Controls
    polygon: PolygonControl = new PolygonControl(this);
    rectangle = new RectangleControl(this);
    polyline: PolylineControl = new PolylineControl(this);
    color: ColorControl = new ColorControl(this);
    delete: DeleteControl;
    done: DoneControl;

    /* free: FreeControl; */
    /* text: TextControl; */

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

        this.link.dataset["draggable"] = "false";

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
        /* this.text = new TextControl(this); */

        this.section.appendChild(this.polygon.controlEl);
        this.section.appendChild(this.rectangle.controlEl);

        this.section.appendChild(this.polyline.controlEl);
        this.section.appendChild(this.color.controlEl);

        /* this.section.appendChild(this.text.controlEl); */

        this.delete = new DeleteControl(this);
        this.section.appendChild(this.delete.controlEl);
        this.done = new DoneControl(this);
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
    }
}

class ColorControl extends BaseDrawControl {
    onClick() {
        this.openActions();
    }
    draw() {}
    fill = new FillControl(this);
    constructor(parent: DrawControl) {
        super(
            {
                icon: "circle",
                cls: "leaflet-control-has-actions leaflet-control-draw-paint",
                tooltip: t("Color")
            },
            parent
        );
        this.actionsEl.appendChild(this.fill.controlEl);
    }
}

class FillControl extends FontAwesomeControl {
    onClick() {}
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "fill-drip",
                cls: "leaflet-control-complete",
                tooltip: t("Fill Color")
            },
            drawControl.map.leafletInstance
        );
    }
}

class DeleteControl extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "trash",
                cls: "leaflet-control-draw-trash",
                tooltip: t("Delete Shapes")
            },
            parent.map.leafletInstance
        );
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.parent.controller.isDeleting = true;
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
