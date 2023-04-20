import { BaseMapType, Popup } from "../types";
import { popup } from "src/map/popup";
import { LAT_LONG_DECIMALS } from "src/utils";

import { LeafletSymbol } from "src/utils/leaflet-import";

const L = window[LeafletSymbol];

class DistanceDisplay extends L.Control {
    controlEl: HTMLElement;
    get lines() {
        return this.map.previousDistanceLines;
    }
    popups: Popup[] = [];
    textEl: HTMLSpanElement;
    getPopup() {
        return popup(this.map, null, {
            permanent: true,
            className: "leaflet-marker-link-popup",
            autoClose: false,
            closeButton: false,
            closeOnClick: false,
            autoPan: false
        });
    }
    constructor(opts: L.ControlOptions, public map: BaseMapType) {
        super(opts);
    }
    initEvents() {
        this.controlEl.onmouseenter = this.onMouseEnter.bind(this);
        this.controlEl.onclick = this.onClick.bind(this);
        this.controlEl.onmouseleave = this.onMouseLeave.bind(this);
    }
    onMouseEnter() {
        if (this.lines.length) {
            const latlng = this.lines[0].getLatLngs()[0] as L.LatLng;
            const start = this.getPopup().setTarget(
                this.lines[0].getLatLngs()[0] as L.LatLng
            );
            start.open(
                `[${latlng.lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlng.lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.popups.push(start);
            this.map.leafletInstance.openPopup(start.leafletInstance);

            for (let i = 0; i < this.lines.length; i++) {
                const line = this.lines[i];
                const latlngs = line.getLatLngs() as L.LatLng[];

                const display = this.map.distanceAlongPolylines(
                    this.lines.slice(0, i + 1)
                );
                const segment = this.map.distanceAlongPolylines([line]);

                const popup = this.getPopup().setTarget(latlngs[1]);
                const element = createDiv();
                element.createSpan({ text: `${display} (${segment})` });
                element.createEl("br");
                element.createSpan({
                    text: ` [${latlngs[1].lat.toLocaleString("en-US", {
                        maximumFractionDigits: LAT_LONG_DECIMALS
                    })}, ${latlngs[1].lng.toLocaleString("en-US", {
                        maximumFractionDigits: LAT_LONG_DECIMALS
                    })}]`
                });
                popup.open(element);
                this.map.leafletInstance.openPopup(popup.leafletInstance);
                this.popups.push(popup);

                line.setStyle({ color: "blue", dashArray: "4 1" });
                line.addTo(this.map.leafletInstance);
            }
        }
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        if (this.lines.length) {
            const group = new L.FeatureGroup();
            for (const line of this.lines) {
                new L.Polyline([
                    line.getLatLngs()[0] as L.LatLng,
                    line.getLatLngs()[1] as L.LatLng
                ]).addTo(group);
            }
            this.map.leafletInstance.fitBounds(group.getBounds(), {
                duration: 0.5,
                easeLinearity: 0.1,
                animate: true,
                padding: [5, 5]
            });
        }
    }
    onMouseLeave() {
        if (this.lines) {
            for (const line of this.lines) {
                line.remove();
            }
        }
        for (const popup of this.popups) {
            this.map.leafletInstance.closePopup(popup.leafletInstance);
        }
        this.popups = [];
    }
    onAdd() {
        /* this.map = map; */
        this.controlEl = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-distance-control"
        );
        this.textEl = this.controlEl.createSpan();
        this.textEl.setText(`0 ${this.map.unit}`);

        this.initEvents();

        return this.controlEl;
    }
    setText(text: string) {
        this.textEl.setText(text);
        return this;
    }
}
export const distanceDisplay = function (
    opts: L.ControlOptions,
    map: BaseMapType
) {
    return new DistanceDisplay(opts, map);
};
