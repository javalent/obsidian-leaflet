import { BaseMapType, LayerGroup, Popup } from "src/@types";

export abstract class Layer<T extends L.Layer> {
    map: BaseMapType;
    layer: string;

    abstract popup: Popup;

    get mapLayer() {
        if (!this.layer) {
            return this.map.mapLayers[0];
        }
        return (
            this.map.mapLayers?.find(({ id }) => id === this.layer) ??
            this.map.mapLayers[0]
        );
    }

    abstract leafletInstance: T;
    abstract get group(): L.LayerGroup;

    onShow() {}
    show() {
        if (this.group) {
            this.group.addLayer(this.leafletInstance);
        }
        this.onShow();
    }
    onHide() {}
    hide() {
        this.group && this.group.removeLayer(this.leafletInstance);
    }

    registerForShow(cb: (...args: any[]) => any) {
        if (this.map.isLayerRendered(this.layer)) {
            cb();
        } else if (this.layer) {
            this.map.on(
                `layer-ready-for-features`,
                (layer: LayerGroup<L.TileLayer | L.ImageOverlay>) => {
                    if (layer === this.mapLayer) {
                        cb();
                    }
                }
            );
        } else {
            this.map.on(
                "first-layer-ready",
                (layer: LayerGroup<L.TileLayer | L.ImageOverlay>) => {
                    this.layer = layer.id;
                    cb();
                }
            );
        }
    }

    checkAndAddToMap() {
        this.registerForShow(this.show.bind(this));
    }
    remove() {
        this.group && this.group.removeLayer(this.leafletInstance);
    }

    abstract toProperties(): any;
}
