import { BaseMapType } from "src/@types";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

class LockControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
    }
    onClick(evt: MouseEvent) {
        this.map.options.lock = !this.map.options.lock;
        if (!this.map.options.lock) {
            this.setIcon("unlock");
            this.setTooltip("Lock Map");
        } else {
            this.setIcon("lock");
            this.setTooltip("Unlock Map");
        }
        this.map.trigger("lock");
    }
}

export function lockControl(opts: L.ControlOptions, map: BaseMapType) {
    const icon = map.options.lock ? "lock" : "unlock";
    const tooltip = map.options.lock ? "Unlock Map" : "Lock Map";
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon,
        cls: "leaflet-control-lock",
        tooltip
    };
    return new LockControl(options, map);
}
