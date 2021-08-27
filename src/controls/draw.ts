import { BaseMapType } from "src/@types";
import t from "src/l10n/locale";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";
import type edit from "leaflet-editable";
import FreeDraw from "leaflet-freedraw";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Platform, TextComponent } from "obsidian";

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
    section: HTMLElement;
    polygon: Polygon;
    expanded: boolean;
    rectangle: Rectangle;
    free: Free;
    polyline: Polyline;
    text: Text;
    context: HTMLElement;
    delete: Delete;
    done: Done;

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
    draw() {
        this.polygon = new Polygon(this);
        this.rectangle = new Rectangle(this);
        this.polyline = new Polyline(this);

        this.text = new Text(this);

        this.section.appendChild(this.polygon.controlEl);
        this.section.appendChild(this.rectangle.controlEl);
        this.section.appendChild(this.polyline.controlEl);

        this.section.appendChild(this.text.controlEl);

        this.delete = new Delete(this);
        this.section.appendChild(this.delete.controlEl);
        this.done = new Done(this);
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
    complete() {
        this.map.leafletInstance.editTools.stopDrawing();
        this.text.disableTextContext();
        this.collapse();
    }
    private collapse() {
        L.DomUtil.removeClass(this.controlEl, "expanded");
        this.enabled = false;
        return this;
    }
}

class Delete extends FontAwesomeControl {
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
        this.parent.text.disableTextContext();
    }
}
class Done extends FontAwesomeControl {
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

class Polygon extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "draw-polygon",
                cls: "leaflet-control-draw-polygon",
                tooltip: t("Polygon")
            },
            parent.map.leafletInstance
        );
    }
    onClick() {
        this.parent.text.disableTextContext();
        this.map.leafletInstance.editTools.startPolygon(null, {
            pane: "drawing"
        });
    }
}
class Rectangle extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "vector-square",
                cls: "leaflet-control-draw-rectangle",
                tooltip: t("Rectangle")
            },
            parent.map.leafletInstance
        );
    }
    onClick() {
        this.parent.text.disableTextContext();
        this.map.leafletInstance.editTools.startRectangle(null, {
            pane: "drawing"
        });
    }
}
class Polyline extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "project-diagram",
                cls: "leaflet-control-draw-free",
                tooltip: t("Polyline")
            },
            parent.map.leafletInstance
        );
    }
    onClick() {
        this.parent.text.disableTextContext();

        this.map.leafletInstance.editTools.startPolyline(null, {
            pane: "drawing"
        });
    }
}
class Free extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    freeDraw: FreeDraw;
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "pencil-alt",
                cls: "leaflet-control-draw-free",
                tooltip: t("Free Draw")
            },
            parent.map.leafletInstance
        );

        this.freeDraw = new FreeDraw({ pane: "drawing" });
    }
    onClick() {
        this.map.drawingGroup.addLayer(this.freeDraw);
    }
}
class Text extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    contextEnabled: any;
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "font",
                cls: "leaflet-control-draw-free",
                tooltip: t("Text")
            },
            parent.map.leafletInstance
        );
    }
    onClick() {
        if (!this.contextEnabled) {
            this.enableTextContext();
        } else {
            this.disableTextContext();
        }
    }
    disableTextContext() {
        this.contextEnabled = false;
        this.map.leafletInstance.off("click", this.createTextComponent, this);
    }
    enableTextContext() {
        this.contextEnabled = true;

        this.map.leafletInstance.on("click", this.createTextComponent, this);
    }
    createTextComponent(e: L.LeafletMouseEvent) {
        const editable = new TextMarker(e.latlng).addTo(this.map.drawingGroup);

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
