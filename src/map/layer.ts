import { LayerGroup, LeafletMap } from "src/@types";

export abstract class Layer<T extends L.Layer> {
    map: LeafletMap;
    layer: string;

    abstract leafletInstance: T;
    abstract get group(): L.LayerGroup;

    show() {
        if (this.group) {
            this.group.addLayer(this.leafletInstance);
        }
    }
    hide() {
        this.group && this.group.removeLayer(this.leafletInstance);
    }

    checkAndAddToMap() {
        if (this.map.isLayerRendered(this.layer)) {
            this.show();
        } else {
            this.map.on(`${this.layer}-ready`, (layer: LayerGroup) => {
                this.show();
            });
        }
    }
}
