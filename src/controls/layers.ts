import { icon } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import type { GPX } from "src/layer";
import type { GeoJSON } from "../layer/geojson";

const L = window[LeafletSymbol];

declare module "leaflet" {
    interface Control {
        _separator: HTMLElement;
    }
}

export default class LayerControl extends L.Control.Layers {
    geojsonAdded: boolean = false;
    gpxAdded: boolean = false;
    container: HTMLElement;
    constructor() {
        super({}, {});
    }
    onAdd(map: L.Map) {
        const container = super.onAdd(map);
        /* this.container = container; */
        const layerIcon = icon({ iconName: "layer-group", prefix: "fas" })
            .node[0];
        layerIcon.setAttr(`style`, "color: var(--text-normal);margin: auto;");
        container.children[0].appendChild(layerIcon);

        return container;
    }
    addGeoJSON(layer: GeoJSON) {
        if (!this.geojsonAdded) {
            this.container.appendChild(this._separator.cloneNode(true));
        }
    }
    addGPX(layer: GPX) {}
}
