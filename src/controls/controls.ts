import { icon } from "../utils/icons";
import { IconName } from "@fortawesome/free-solid-svg-icons";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Events } from "obsidian";

const L = window[LeafletSymbol];

export interface FontAwesomeControlOptions extends L.ControlOptions {
    icon: IconName;
    cls: string;
    tooltip: string;
}
export abstract class FontAwesomeControl extends L.Control {
    icon: IconName;
    controlEl: HTMLElement;
    cls: string;
    tooltip: string;
    leafletInstance: L.Map;
    link: HTMLElement;
    enabled: boolean = true;
    constructor(opts: FontAwesomeControlOptions, leafletMap: L.Map) {
        super(opts);
        this.leafletInstance = leafletMap;
        this.icon = opts.icon;
        this.cls = opts.cls;
        this.tooltip = opts.tooltip;
        this.controlEl = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-control " + this.cls
        );
        this.controlEl.removeAttribute("title");
        this.link = this.controlEl.createEl("a", {
            cls: this.cls + "-icon",
            href: "#"
        });
        this.link.appendChild(
            icon({ prefix: "fas", iconName: this.icon }).node[0]
        );
        this.controlEl.children[0].setAttrs({
            "aria-label": this.tooltip
        });
        L.DomEvent.on(this.controlEl, "click", this.onClick.bind(this));
    }
    onAdd(leafletMap: L.Map) {
        this.leafletInstance = leafletMap;

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.added();

        return this.controlEl;
    }
    abstract onClick(evt: MouseEvent): void;
    added() {}
    disable() {
        if (!this.enabled) return;
        this.controlEl.addClass("disabled");
        this.enabled = false;
    }
    enable() {
        if (this.enabled) return;
        this.controlEl.removeClass("disabled");
        this.enabled = true;
    }
    setTooltip(tooltip: string) {
        this.tooltip = tooltip;
        this.controlEl.children[0].setAttrs({
            "aria-label": this.tooltip
        });
    }
    removeTooltip() {
        this.tooltip = null;
        this.controlEl.children[0].removeAttribute("aria-label");
    }
}
