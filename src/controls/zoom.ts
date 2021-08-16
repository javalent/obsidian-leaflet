import { BaseMapType } from "src/@types";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

import { LeafletSymbol } from "src/utils/leaflet-import";
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
        const group = L.featureGroup(
            this.map.displayed.map(({ leafletInstance }) => leafletInstance)
        );
        if (!group || !group.getLayers().length) {
            this.leafletInstance.fitWorld();
            return;
        }
        this.map.log(`Moving to display ${group.getLayers().length} markers.`);
        this.leafletInstance.fitBounds(
            group.getBounds(),
            {
                maxZoom: this.leafletInstance.getBoundsZoom(group.getBounds())
            } /* {
            duration: 0.5,
            easeLinearity: 0.1,
            animate: true,
            padding: [50, 50]
        } */
        );
    }
}

export function zoomControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "map-marked-alt",
        cls: "leaflet-control-zoom-markers",
        tooltip: "Show All Markers"
    };
    return new ZoomControl(options, map);
}
