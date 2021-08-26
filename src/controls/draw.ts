import { BaseMapType } from "src/@types";
import t from "src/l10n/locale";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

class DrawControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
    }
    onClick(evt: MouseEvent) {
        this.map.resetZoom();
    }
}

export function drawControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "draw-polygon",
        cls: "leaflet-control-draw-control",
        tooltip: t("Draw")
    };
    return new DrawControl(options, map);
}
