import { TextComponent } from "obsidian";
import { FontAwesomeControl } from "src/controls/controls";
import t from "src/l10n/locale";
import { DrawControl } from "./controls";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
const L = window[LeafletSymbol];

export class TextControl extends FontAwesomeControl {
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


export class PolygonControl extends BaseDrawControl {
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "font",
                cls: "leaflet-control-has-actions leaflet-control-text",
                tooltip: t("Text")
            },
            parent
        );
    }
    draw() {
        this.actionsEl.appendChild(this.complete.controlEl);
        this.actionsEl.appendChild(this.cancel.controlEl);
    }
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();/* 
        this.controller.newShape(new Polygon(this.controller)); */
    }
}