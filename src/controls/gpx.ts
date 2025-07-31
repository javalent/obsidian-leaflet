import { BaseMapType } from "../types";
import { GPX } from "src/layer";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { ExtraButtonComponent } from "obsidian";
import { BULLSEYE, formatNumber, getIcon, icon } from "src/utils";
import t from "src/l10n/locale";
import convert from "convert";
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

        this.iconEl.dataset["draggable"] = "false";
    }
    setTarget(gpx: GPX) {
        if (this.target) this.removeTarget();
        this.target = gpx;
        this.target.targeted = true;
        this.removeTooltip();
        this.expand();
    }
    removeTarget() {
        this.target.deselect();
        this.target = null;
        this.collapse();
        this.setTooltip(
            t(
                `Zoom to %1 GPX Track%2`,
                `${this.map.gpxData.length}`,
                this.map.gpxData.length == 1 ? "" : "s"
            )
        );
    }
    expand() {
        if (!this.target) return;
        if (!this.target.parsed) return;
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

        const addHeatlineDiv = () => {
            if (heatLines) return;
            heatLines = true;
            data = this.section.createDiv("gpx-data");

            ul = this.section.createEl("div", "input-container");
            ul.createSpan({
                text: t("Heatlines")
            });
        };

        const unit =
            this.map.plugin.unitSystemForUnit(this.map.unit) === "imperial"
                ? "mi"
                : "km";

        if (this.target.data.length) {
            addHeatlineDiv();
            data.createDiv("data-item").createSpan({
                text: `Distance: ${formatNumber(
                    convert(this.target.data.length).from("m").to(unit),
                    2
                )}${unit}`
            });
        }

        if (this.target.flags.elevation) {
            addHeatlineDiv();

            const elevationEl = data.createDiv("data-item");

            const unit =
                this.map.plugin.unitSystemForUnit(this.map.unit) === "imperial"
                    ? "ft"
                    : "m";

            elevationEl.createSpan({ text: `${t("Elevation")}:` });
            const gainLoss = elevationEl.createDiv("gpx-elevation");

            const gain = convert(this.target.elevation.max).from("m").to(unit);
            const gainEl = gainLoss.createDiv("elevation-gain");
            gainEl.appendChild(icon(getIcon("angle-up")).node[0]);
            gainEl.createSpan({
                text: `${formatNumber(gain, 0)}${unit}`
            });
            const loss = convert(this.target.elevation.min).from("m").to(unit);
            const lossEl = gainLoss.createDiv("elevation-loss");
            lossEl.appendChild(icon(getIcon("angle-down")).node[0]);
            lossEl.createSpan({
                text: `${formatNumber(loss, 0)}${unit}`
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
                text: t("Elevation")
            });

            input.onclick = (evt) => {
                this.trySwitch("ele");
            };
        }
        if (this.target.data.flags.speed) {
            addHeatlineDiv();

            let speed = this.target.speed.avg,
                unit: string,
                pace: string;
            switch (this.map.plugin.unitSystemForUnit(this.map.unit)) {
                case "metric": {
                    //kmh
                    speed = convert(speed).from("m").to("km") * 60 * 60;
                    unit = "km/h";
                    pace = "km";
                    break;
                }
                case "imperial": {
                    //mph
                    speed = convert(speed).from("m").to("mi") * 60 * 60;
                    unit = "mph";
                    pace = "mi";
                    break;
                }
            }

            data.createDiv("data-item").createSpan({
                text: `${t("Speed")}: ${formatNumber(speed, 0)} ${unit}`
            });
            data.createDiv("data-item").createSpan({
                text: `${t("Pace")}: ${formatNumber(60 / speed, 0)}"/${pace}`
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
                text: t("Speed")
            });

            input.onclick = (evt) => {
                this.trySwitch("speed");
            };
        }
        if (this.target.flags.cad) {
            addHeatlineDiv();

            data.createDiv("data-item").createSpan({
                text: `${t("Cadence")}: ${this.target.cad.avg} ${t("spm")}`
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
                text: t("Cadence")
            });

            input.onclick = (evt) => {
                this.trySwitch("cad");
            };
        }

        if (this.target.flags.hr) {
            if (!heatLines) {
            }
            data.createDiv("data-item").createSpan({
                text: `${t("Heart rate")}: ${this.target.hr.avg}`
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
                text: t("Heart rate")
            });

            input.onclick = (evt) => {
                this.trySwitch("hr");
            };
        }

        const buttons = this.section.createDiv("control-buttons");
        new ExtraButtonComponent(buttons)
            .setIcon(BULLSEYE)
            .setTooltip(t("Zoom to GPX"))
            .onClick(() => {
                this.map.leafletInstance.fitBounds(
                    this.target.leafletInstance.getBounds()
                );
            });
        new ExtraButtonComponent(buttons)
            .setIcon("cross-in-box")
            .setTooltip(t("Deselect"))
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
        tooltip: t(
            `Zoom to %1 GPX Track%2`,
            `${map.gpxData.length}`,
            map.gpxData.length == 1 ? "" : "s"
        )
    };
    return new GPXControl(options, map);
}
