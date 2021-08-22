import { BaseMapType } from "src/@types";
import { GPX } from "src/layer";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

class GPXControl extends FontAwesomeControl {
    target: GPX;
    constructor(opts: FontAwesomeControlOptions, private map: BaseMapType) {
        super(opts, map.leafletInstance);
    }
    onClick(evt: MouseEvent) {
        this.map.resetZoom();
    }
}

export function gpxControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "bullseye",
        cls: "leaflet-control-reset-zoom",
        tooltip: "Reset View"
    };
    return new GPXControl(options, map);
}
