import { BaseMapType } from "../types";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

import { LeafletSymbol } from "src/utils/leaflet-import";
import t from "src/l10n/locale";
const L = window[LeafletSymbol];

class ZoomControl extends FontAwesomeControl {
    controlEl: any;
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;

        this.map.on("markers-updated", () => {
            if (this.map.markers.length) {
                this.enable();
            } else {
                this.disable();
            }
        });
    }
    onClick(evt: MouseEvent) {
        if (!this.enabled) {
            return;
        }

        this.map.zoomAllMarkers();
    }
}

export function zoomControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "map-marked-alt",
        cls: "leaflet-control-zoom-markers",
        tooltip: t("Show all markers")
    };
    return new ZoomControl(options, map);
}
