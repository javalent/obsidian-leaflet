import { TextComponent } from "obsidian";
import { BaseMapType } from "src/@types";

import FreeDraw from "leaflet-freedraw";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";
import t from "src/l10n/locale";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Layer } from "src/layer/layer";

const L = window[LeafletSymbol];

declare module "leaflet-freedraw" {
    interface FreeDrawOptions {
        pane: string;
    }
}

declare module "leaflet" {
    interface Rectangle {
        setText(str: string): void;
    }
}

class DrawControl extends FontAwesomeControl {
    map: BaseMapType;

    //draw tools
    section: HTMLElement;
    //context tools
    context: HTMLElement;

    //Controls
    polygon: PolygonControl;
    rectangle: RectangleControl;
    free: FreeControl;
    polyline: PolylineControl;
    text: TextControl;
    delete: DeleteControl;
    done: DoneControl;

    expanded: boolean;
    layers: L.Path[];

    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
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
        this.collapse();
    }
    private collapse() {
        L.DomUtil.removeClass(this.controlEl, "expanded");
        this.enabled = false;
        return this;
    }
    draw() {
        this.polygon = new PolygonControl(this);
        this.rectangle = new RectangleControl(this);
        this.polyline = new PolylineControl(this);

        this.text = new TextControl(this);

        this.section.appendChild(this.polygon.controlEl);
        this.section.appendChild(this.rectangle.controlEl);
        this.section.appendChild(this.polyline.controlEl);

        this.section.appendChild(this.text.controlEl);

        this.delete = new DeleteControl(this);
        this.section.appendChild(this.delete.controlEl);
        this.done = new DoneControl(this);
        this.section.appendChild(this.done.controlEl);
    }
    private expand() {
        this.enabled = true;
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
        this.layers = [];
    }
    stopDrawingContext() {
        this.map.leafletInstance.editTools.stopDrawing();
        this.text.disableTextContext();

        this.polygon.closeActions();
        this.rectangle.closeActions();
        this.polyline.closeActions();
    }
}

abstract class BaseDrawControl extends FontAwesomeControl {
    complete = new CompleteControl(this);
    undo = new UndoControl(this);
    cancel = new CancelControl(this);
    abstract controller: L.Path;
    get map() {
        return this.parent.map;
    }
    constructor(opts: FontAwesomeControlOptions, public parent: DrawControl) {
        super(opts, parent.map.leafletInstance);
        this.draw();
    }

    actionsEl = this.controlEl.createDiv("control-actions");

    cancelControl = new CancelControl(this);

    onClick() {}
    openActions() {
        this.actionsEl.addClass("expanded");
    }
    closeActions() {
        this.actionsEl.removeClass("expanded");
        this.map.leafletInstance.off("editable:vertex:new");
        this.map.leafletInstance.off("editable:vertex:deleted");
    }
    abstract draw(): void;
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
class CompleteControl extends FontAwesomeControl {
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "check",
                cls: "leaflet-control-complete",
                tooltip: "Finish"
            },
            drawControl.map.leafletInstance
        );
    }
    //Complete and save
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
    }
}
class UndoControl extends FontAwesomeControl {
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "undo-alt",
                cls: "leaflet-control-undo",
                tooltip: "Undo"
            },
            drawControl.map.leafletInstance
        );
    }
    //Undo Last Vertex
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
    }
}
class CancelControl extends FontAwesomeControl {
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "times-circle",
                cls: "leaflet-control-cancel",
                tooltip: "Cancel"
            },
            drawControl.map.leafletInstance
        );
    }
    //Stop and remove from map
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        this.drawControl.parent.stopDrawingContext();
    }
}

abstract class DrawingLayer extends Layer<L.Path> {
    get group() {
        return this.map.drawingLayer;
    }
}

class PolygonControl extends BaseDrawControl {
    controller: L.Polygon;
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "draw-polygon",
                cls: "leaflet-control-has-actions leaflet-control-draw-polygon",
                tooltip: t("Polygon")
            },
            parent
        );
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
        this.actionsEl.appendChild(this.undo.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);

        this.controller = this.map.leafletInstance.editTools.startPolygon(
            null,
            {
                pane: "drawing"
            }
        );
    }
}

class RectangleControl extends BaseDrawControl {
    undo: UndoControl;
    cancel: CancelControl;
    controller: L.Rectangle;

    constructor(public parent: DrawControl) {
        super(
            {
                icon: "vector-square",
                cls: "leaflet-control-draw-rectangle leaflet-control-has-actions",
                tooltip: t("Rectangle")
            },
            parent
        );
    }
    onClick() {
        super.onClick();

        this.controller = this.map.leafletInstance.editTools.startRectangle(
            null,
            {
                pane: "drawing"
            }
        );
    }
    draw() {
        this.actionsEl.appendChild(this.undo.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);
    }
}
class PolylineControl extends BaseDrawControl {
    complete: CompleteControl;
    undo: UndoControl;
    cancel: CancelControl;
    controller: L.Polyline;
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "project-diagram",
                cls: "leaflet-control-draw-polyline leaflet-control-has-actions",
                tooltip: t("Polyline")
            },
            parent
        );
    }
    onClick() {
        super.onClick();

        this.controller = this.map.leafletInstance.editTools.startPolyline(
            null,
            {
                pane: "drawing"
            }
        );
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
        this.actionsEl.appendChild(this.undo.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);
    }
}
class FreeControl extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    freeDraw: FreeDraw;
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "pencil-alt",
                cls: "leaflet-control-draw-free leaflet-control-has-actions",
                tooltip: t("Free Draw")
            },
            parent.map.leafletInstance
        );

        this.freeDraw = new FreeDraw({ pane: "drawing" });
    }
    onClick() {
        
    }
}
class TextControl extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    contextEnabled: any;
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "font",
                cls: "leaflet-control-draw-text leaflet-control-has-actions",
                tooltip: t("Text")
            },
            parent.map.leafletInstance
        );
    }
    onClick() {
        this.parent.stopDrawingContext();
        if (!this.contextEnabled) {
            this.enableTextContext();
        } else {
            this.disableTextContext();
        }
    }
    disableTextContext() {
        this.contextEnabled = false;
        this.map.leafletInstance.off("click", this.createTextComponent, this);
        this.map.contentEl.removeClass("adding-text");
    }
    enableTextContext() {
        this.contextEnabled = true;
        this.map.contentEl.addClass("adding-text");
        this.map.leafletInstance.on("click", this.createTextComponent, this);
    }
    createTextComponent(e: L.LeafletMouseEvent) {
        const editable = new TextMarker(e.latlng).addTo(this.map.drawingLayer);

        this.disableTextContext();
    }
}

class TextMarker extends L.Marker {
    containerEl: HTMLDivElement;

    input: TextComponent;
    icon: L.DivIcon;
    text: string;

    constructor(latlng: L.LatLng) {
        super(latlng);
        this.containerEl = createDiv("leaflet-text-entry");
        this.input = new TextComponent(this.containerEl).setPlaceholder("Text");
        this.icon = new L.DivIcon({ html: this.containerEl });
        this.setIcon(this.icon);

        this.input.onChange((v) => (this.text = v));

        /* this.input.inputEl.onblur = () => {
            this.input.inputEl.replaceWith(
                createSpan({
                    text: this.text
                })
            );
        }; */
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
