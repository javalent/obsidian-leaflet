import type { BaseMapType } from "src/@types";
import { getId } from "src/utils";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Platform } from "obsidian";
import t from "src/l10n/locale";

const L = window[LeafletSymbol];
export class FilterMarkers extends FontAwesomeControl {
    map: BaseMapType;
    section: HTMLElement;
    inputs: Map<string, HTMLInputElement>;
    expanded: boolean;
    drawn: boolean;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
        this.map.on("markers-updated", () => {
            if (this.map.markers.length || this.map.overlays.length) {
                this.enable();
            } else {
                this.disable();
            }
        });
    }
    onClick(evt: MouseEvent) {
        this.expand();
    }
    added() {
        //add hidden filter objects

        this.section = this.controlEl.createEl("section", {
            cls: this.cls + "-list"
        });

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.iconEl.dataset["draggable"] = "false";

        this.map.leafletInstance.on("click", this.collapse, this);

        L.DomEvent.on(this.controlEl, "mouseenter", () => this.expand());
        L.DomEvent.on(this.controlEl, "mouseleave", () => this.collapse());

        if (Platform.isMobile) {
            L.DomEvent.on(this.controlEl, "click", this.expand, this);
        } else {
            L.DomEvent.on(this.controlEl, "focus", this.expand, this);
        }
    }
    private expand() {
        if (!this.enabled) {
            return;
        }
        if (this.expanded) {
            return;
        }
        this.expanded = true;
        L.DomUtil.addClass(this.controlEl, "expanded");
        this.draw();

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

    private collapse() {
        L.DomUtil.removeClass(this.controlEl, "expanded");
        this.expanded = false;
        return this;
    }
    private draw() {
        this.section.empty();
        this.inputs = new Map();
        const buttons = this.section.createDiv(
            "leaflet-control-expandable-button-group"
        );
        buttons.createEl("button", { text: t("All") }).onclick = (evt) => {
            evt.stopPropagation();
            this.map.markerIcons.forEach(({ type }) => {
                this.show(type);
            });
            this.update();
        };
        buttons.createEl("button", { text: t("None") }).onclick = (evt) => {
            evt.stopPropagation();
            this.map.markerIcons.forEach(({ type }) => {
                this.hide(type);
            });
            this.update();
        };

        const ul = this.section.createEl("div", "input-container");

        for (let [type, markerIcon] of this.map.markerIcons.entries()) {
            if (
                this.map.currentGroup.markers[type] &&
                this.map.currentGroup.markers[type].getLayers().length
            ) {
                const li = ul.createEl("div", "input-item");

                const id = getId();
                const input = li.createEl("input", {
                    attr: {
                        id: "leaflet-control-expandable-item-label-" + id,
                        ...(this.map.displaying.get(type)
                            ? { checked: true }
                            : {})
                    },
                    type: "checkbox"
                });

                const label = li.createEl("label", {
                    attr: { for: "leaflet-control-expandable-item-label-" + id }
                });
                label.createDiv({
                    cls: "leaflet-control-expandable-icon"
                }).innerHTML = markerIcon.html;

                label.createDiv({
                    text: type[0].toUpperCase() + type.slice(1).toLowerCase()
                });

                input.addEventListener("click", (evt) => {
                    if (input.checked) {
                        this.show(type);
                    } else if (this.map.displaying.get(type)) {
                        this.hide(type);
                    }

                    this.map.displaying.set(type, input.checked);
                });

                this.inputs.set(type, input);
            }
        }
    }
    private update() {
        for (let [type, input] of this.inputs) {
            input.checked = this.map.displaying.get(type);
        }
    }

    private show(type: string) {
        this.map.currentGroup.markers[type].addTo(this.leafletInstance);
        this.map.overlays
            .filter((o) => o.type === type)
            .forEach((o) =>
                o.leafletInstance.addTo(this.map.currentGroup.group)
            );

        this.map.sortOverlays();
        this.map.displaying.set(type, true);
    }
    private hide(type: string) {
        this.map.currentGroup.markers[type].remove();
        this.map.overlays
            .filter((o) => o.type === type)
            .forEach((o) => o.leafletInstance.remove());
        this.map.displaying.set(type, false);
    }
}

export function filterMarkerControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "filter",
        cls: "leaflet-control-expandable",
        tooltip: t("Filter Markers")
    };
    return new FilterMarkers(options, map);
}
