import { Map } from "leaflet";
import { BaseMapType } from "src/@types";
import t from "src/l10n/locale";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

class ResetZoomControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
        this.map.leafletInstance.on("zoomend zoom zoomstart", () => {
            this.controlEl.setAttr(
                "aria-label",
                `Reset Zoom\nCurrent: ${this.map.leafletInstance.getZoom()}`
            );
        });
    }
    onAdd(leafletMap: Map): HTMLElement {
        this.controlEl.setAttr(
            "aria-label",
            `Reset Zoom\nCurrent: ${this.map.leafletInstance.getZoom()}`
        );
        return this.controlEl;
    }
    onClick(evt: MouseEvent) {
        this.map.resetZoom();
    }
}

export function resetZoomControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "bullseye",
        cls: "leaflet-control-reset-zoom"
        /* tooltip: t("Reset View") */
    };
    return new ResetZoomControl(options, map);
}
