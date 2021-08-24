import { BaseMapType } from "src/@types";
import { GPX } from "src/layer";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { ExtraButtonComponent, Platform } from "obsidian";
import { BULLSEYE } from "src/utils";
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

        this.controlEl.addClass("leaflet-control-gpx");
        this.section = this.controlEl.createEl("section", {
            cls: this.cls + "-list"
        });

        L.DomEvent.disableClickPropagation(this.controlEl);
        L.DomEvent.disableScrollPropagation(this.controlEl);

        this.link.dataset["draggable"] = "false";

        /*         this.map.on("click", () => this.collapse(), this); */

        /* L.DomEvent.on(this.controlEl, "mouseenter", () => this.expand()); */
        /*         L.DomEvent.on(this.controlEl, "mouseleave", () => this.collapse()); */

        /* if (Platform.isMobile) {
            L.DomEvent.on(this.controlEl, "click", this.expand, this);
        } else {
            L.DomEvent.on(this.controlEl, "focus", this.expand, this);
        } */
    }
    setTarget(gpx: GPX) {
        this.target = gpx;
        this.target.targeted = true;
        this.removeTooltip();
        this.expand();
    }
    removeTarget() {
        this.target.switch("default");
        this.target.targeted = false;
        this.target = null;
        this.collapse();
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
        L.DomUtil.removeClass(this.controlEl, "expanded");
        this.expanded = false;
        return this;
    }
    private draw() {
        this.section.empty();

        let data: HTMLElement;
        let ul: HTMLElement;

        let heatLines = false;

        if (!isNaN(this.target.speed.avg)) {
            if (!heatLines) {
                heatLines = true;
                data = this.section.createDiv("gpx-data");

                ul = this.section.createEl("div", "input-container");
                ul.createSpan({
                    text: "Heatlines"
                });
            }
            data.createDiv("data-item").createSpan({
                text: `Speed: ${this.target.speed.avg} m/s`
            });

            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-speed",
                    "data-which": "speed",
                    name: "leaflet-gpx-control-checkbox-group",
                    ...(this.target.displaying == "speed"
                        ? { checked: true }
                        : {})
                },
                type: "checkbox"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-speed" },
                text: "Speed"
            });

            input.onclick = (evt) => {
                this.trySwitch("speed");
            };
        }
        if (!isNaN(this.target.cad.avg)) {
            if (!heatLines) {
                heatLines = true;
                data = this.section.createDiv("gpx-data");

                ul = this.section.createEl("div", "input-container");
                ul.createSpan({
                    text: "Heatlines"
                });
            }
            data.createDiv("data-item").createSpan({
                text: `Cadence: ${this.target.cad.avg} steps/s`
            });
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-cad",
                    "data-which": "cad",
                    name: "leaflet-gpx-control-checkbox-group",
                    ...(this.target.displaying == "cad"
                        ? { checked: true }
                        : {})
                },
                type: "checkbox"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-cad" },
                text: "Cadence"
            });

            input.onclick = (evt) => {
                this.trySwitch("cad");
            };
        }
        if (!isNaN(this.target.elevation.avg)) {
            if (!heatLines) {
                heatLines = true;
                data = this.section.createDiv("gpx-data");

                ul = this.section.createEl("div", "input-container");
                ul.createSpan({
                    text: "Heatlines"
                });
            }
            data.createDiv("data-item").createSpan({
                text: `Elevation: ${this.target.elevation.avg} meters`
            });
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-ele",
                    "data-which": "ele",
                    name: "leaflet-gpx-control-checkbox-group",
                    ...(this.target.displaying == "ele"
                        ? { checked: true }
                        : {})
                },
                type: "checkbox"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-ele" },
                text: "Elevation"
            });

            input.onclick = (evt) => {
                this.trySwitch("ele");
            };
        }
        if (!isNaN(this.target.hr.avg)) {
            if (!heatLines) {
                heatLines = true;
                data = this.section.createDiv("gpx-data");

                ul = this.section.createEl("div", "input-container");
                ul.createSpan({
                    text: "Heatlines"
                });
            }
            data.createDiv("data-item").createSpan({
                text: `Heart Rate: ${this.target.hr.avg}`
            });
            const li = ul.createDiv("input-item");
            const input = li.createEl("input", {
                attr: {
                    id: "leaflet-gpx-control-hr",
                    "data-which": "hr",
                    name: "leaflet-gpx-control-checkbox-group",
                    ...(this.target.displaying == "hr" ? { checked: true } : {})
                },
                type: "checkbox"
            });
            li.createEl("label", {
                attr: { for: "leaflet-gpx-control-hr" },
                text: "Heart Rate"
            });

            input.onclick = (evt) => {
                this.trySwitch("hr");
            };
        }

        const buttons = this.section.createDiv("control-buttons");
        new ExtraButtonComponent(buttons)
            .setIcon(BULLSEYE)
            .setTooltip("Zoom to GPX")
            .onClick(() => {
                this.map.leafletInstance.fitBounds(
                    this.target.leafletInstance.getBounds()
                );
            });
        new ExtraButtonComponent(buttons)
            .setIcon("cross-in-box")
            .setTooltip("Deselect")
            .onClick(() => {
                this.removeTarget();
            });
    }
    trySwitch(str: "hr" | "cad" | "speed" | "ele") {
        if (this.target.displaying === str) {
            this.target.switch("default");
        } else {
            this.target.switch(str);
        }
        this.draw();
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
