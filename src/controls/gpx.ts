import { BaseMapType } from "src/@types";
import { GPX } from "src/layer";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Platform } from "obsidian";
const L = window[LeafletSymbol];
class GPXControl extends FontAwesomeControl {
    target: GPX;
    expanded: boolean;
    section: HTMLElement;
    constructor(opts: FontAwesomeControlOptions, private map: BaseMapType) {
        super(opts, map.leafletInstance);
    }
    onClick(evt: MouseEvent) {
        if (!this.target)
            this.map.leafletInstance.fitBounds(this.map.gpxLayer.getBounds());
    }
    added() {
        //add hidden filter objects

        this.section = this.controlEl.createEl("section", {
            cls: this.cls + "-list"
        });

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.link.dataset["draggable"] = "false";

        this.map.on("click", () => this.collapse(), this);

        L.DomEvent.on(this.controlEl, "mouseenter", () => this.expand());
        L.DomEvent.on(this.controlEl, "mouseleave", () => this.collapse());

        if (Platform.isMobile) {
            L.DomEvent.on(this.controlEl, "click", this.expand, this);
        } else {
            L.DomEvent.on(this.controlEl, "focus", this.expand, this);
        }
    }
    setTarget(gpx: GPX) {
        this.target = gpx;
        this.map.leafletInstance.fitBounds(
            this.target.leafletInstance.getBounds()
        );
        this.removeTooltip();
    }
    removeTarget() {
        this.target = null;
        this.setTooltip(
            `Zoom to ${this.map.gpxData.length} GPX Track${
                this.map.gpxData.length == 1 ? "" : "s"
            }`
        );
    }
    expand() {
        if (!this.target) return;
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
        /* return; */
        L.DomUtil.removeClass(this.controlEl, "expanded");
        this.expanded = false;
        return this;
    }
    private draw() {
        this.section.empty();

        

        const ul = this.section.createEl("div", "input-container");

        if (this.target.flags.speed) {
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-speed",
                    name: "leaflet-gpx-control-radio-group",
                    ...(this.target.displaying == "speed"
                        ? { checked: true }
                        : {})
                },
                type: "radio"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-speed" },
                text: "Speed"
            });

            input.onclick = (evt) => {
                this.target.switch("speed");
            };
        }
        if (this.target.flags.cad) {
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-cad",
                    name: "leaflet-gpx-control-radio-group",
                    ...(this.target.displaying == "cad"
                        ? { checked: true }
                        : {})
                },
                type: "radio"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-cad" },
                text: "Cadence"
            });

            input.onclick = (evt) => {
                this.target.switch("cad");
            };
        }
        if (this.target.flags.ele) {
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-ele",
                    name: "leaflet-gpx-control-radio-group",
                    ...(this.target.displaying == "ele"
                        ? { checked: true }
                        : {})
                },
                type: "radio"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-ele" },
                text: "Elevation"
            });

            input.onclick = (evt) => {
                this.target.switch("ele");
            };
        }
        if (this.target.flags.hr) {
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-hr",
                    name: "leaflet-gpx-control-radio-group",
                    ...(this.target.displaying == "hr" ? { checked: true } : {})
                },
                type: "radio"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-hr" },
                text: "Heart Rate"
            });

            input.onclick = (evt) => {
                this.target.switch("hr");
            };
        }
    }
}

export function gpxControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "running",
        cls: "leaflet-control-expandable",
        tooltip: `Zoom to ${map.gpxData.length} GPX Track${
            map.gpxData.length === 1 ? "" : "s"
        }`
    };
    return new GPXControl(options, map);
}
