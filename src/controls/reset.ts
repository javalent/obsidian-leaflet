import { BaseMapType } from "src/@types";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

class ResetZoomControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
    }
    onClick(evt: MouseEvent) {
        this.map.resetZoom();
    }
}

export function resetZoomControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "bullseye",
        cls: "leaflet-control-reset-zoom",
        tooltip: "Reset View"
    };
    return new ResetZoomControl(options, map);
}
