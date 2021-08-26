import { BaseMapType, Popup } from "src/@types";
import { popup } from "src/map/popup";
import { LAT_LONG_DECIMALS } from "src/utils";

import { LeafletSymbol } from "src/utils/leaflet-import";

const L = window[LeafletSymbol];

class DistanceDisplay extends L.Control {
    controlEl: HTMLElement;
    get line() {
        return this.map.previousDistanceLine;
    }
    popups: [Popup, Popup];
    textEl: HTMLSpanElement;
    constructor(opts: L.ControlOptions, public map: BaseMapType) {
        super(opts);
        this.popups = [
            popup(this.map, null, {
                permanent: true,
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            }),
            popup(this.map, null, {
                permanent: true,
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            })
        ];
    }
    initEvents() {
        this.controlEl.onmouseenter = this.onMouseEnter.bind(this);
        this.controlEl.onclick = this.onClick.bind(this);
        this.controlEl.onmouseleave = this.onMouseLeave.bind(this);
    }
    onMouseEnter() {
        if (this.line) {
            const latlngs = this.line.getLatLngs() as L.LatLng[];

            this.popups[0].setTarget(latlngs[0]).open(
                `[${latlngs[0].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[0].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.leafletInstance.openPopup(this.popups[0].leafletInstance);

            this.popups[1].setTarget(latlngs[1]).open(
                `[${latlngs[1].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[1].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.leafletInstance.openPopup(this.popups[1].leafletInstance);

            this.line.setStyle({ color: "blue", dashArray: "4 1" });
            this.line.addTo(this.map.leafletInstance);
        }
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        if (this.line) {
            this.map.leafletInstance.fitBounds(
                L.latLngBounds(
                    this.line.getLatLngs()[0] as L.LatLng,
                    this.line.getLatLngs()[1] as L.LatLng
                ),
                {
                    duration: 0.5,
                    easeLinearity: 0.1,
                    animate: true,
                    padding: [5, 5]
                }
            );
        }
    }
    onMouseLeave() {
        if (this.line) {
            this.line.remove();
        }
        this.map.leafletInstance.closePopup(this.popups[0].leafletInstance);
        this.map.leafletInstance.closePopup(this.popups[1].leafletInstance);
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
