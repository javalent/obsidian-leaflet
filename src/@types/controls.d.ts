import type { IconName } from "@fortawesome/free-solid-svg-icons";
import type L from "leaflet";
import type { GPX } from "./layers";

import { BaseMapType } from "./map";

export class GPXControl extends FontAwesomeControl {
    target: GPX;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType);
    onClick(evt: MouseEvent): void;
    setTarget(gpx: GPX): void;
}

export interface FontAwesomeControlOptions extends L.ControlOptions {
    icon: IconName;
    cls: string;
    tooltip: string;
}
export abstract class FontAwesomeControl extends L.Control {
    icon: IconName;
    controlEl: HTMLElement;
    cls: string;
    tooltip: string;
    leafletInstance: L.Map;
    link: HTMLElement;
    enabled: boolean;
    constructor(opts: FontAwesomeControlOptions, leafletMap: L.Map);
    onAdd(leafletMap: L.Map): HTMLElement;
    abstract onClick(evt: MouseEvent): void;
    added(): void;
    disable(): void;
    enable(): void;
    setTooltip(tooltip: string): void;
    removeTooltip(): void;
}
