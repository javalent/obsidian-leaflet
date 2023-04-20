import { BaseMapType } from "../types";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

export class LockControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
    }
    onClick(evt: MouseEvent) {
        this.map.options.lock = !this.map.options.lock;
        this.setState(this.map.options.lock);
        this.map.trigger("lock");
        this.map.trigger("should-save");
    }
    setState(state: boolean) {
        if (!state) {
            this.setIcon("unlock");
            this.setTooltip("Lock Map");
        } else {
            this.setIcon("lock");
            this.setTooltip("Unlock Map");
        }
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
