import { TextComponent } from "obsidian";
import t from "src/l10n/locale";
import { DrawControl } from "./controls";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { BaseDrawControl } from "./base";
const L = window[LeafletSymbol];

// Not currently in use.
export class TextControl extends BaseDrawControl {
    get map() {
        return this.parent.map;
    }
    contextEnabled: any;
    constructor(public parent: DrawControl) {
        super(
            {
                icon: "font",
                cls: "leaflet-control-draw-text leaflet-control-has-actions",
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
        this.openActions();
        this.parent.stopDrawingContext();
        if (!this.contextEnabled) {
            this.enableTextContext();
        } else {
            this.disableTextContext();
        }
    }
    disableTextContext() {
        this.closeActions();
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
    text: SVGTextElement;
    svg: SVGElement;

    /* box: L.Rectangle = L.rectangle([], {
        pane: "drawing",
        fillColor: "transparent",
        dashArray: "5,10",
        weight: 1
    }); */

    constructor(latlng: L.LatLng) {
        super(latlng);
        this.containerEl = createDiv("leaflet-text-entry");

        this.svg = this.createEl("svg");
        this.text = this.createEl("text", this.svg);

        this.input = new TextComponent(this.containerEl).setPlaceholder("Text");
        this.icon = new L.DivIcon({ html: this.svg.outerHTML });
        this.setIcon(this.icon);

        /* this.input.inputEl.onblur = () => {
            this.input.inputEl.replaceWith(
                createSpan({
                    text: this.text
                })
            );
        }; */
    }

    createEl<K extends keyof SVGElementTagNameMap>(
        name: K,
        parent?: SVGElement
    ): SVGElementTagNameMap[K] {
        const el = document.createElementNS("http://www.w3.org/2000/svg", name);
        if (parent) {
            parent.appendChild(el);
        }
        return el;
    }
}
