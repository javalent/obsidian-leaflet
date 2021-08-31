import { Marker } from "src/layer";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Shape } from "./shape";
const L = window[LeafletSymbol];

class VertexIcon extends L.DivIcon {
    constructor() {
        super({
            iconSize: new L.Point(8, 8),
            className: "leaflet-div-icon leaflet-vertex-icon"
        });
    }
}

declare module "leaflet" {
    interface Marker {
        _icon: HTMLElement;
    }
}

export class Vertex {
    leafletInstance: L.Marker;
    getLatLng() {
        return this.leafletInstance.getLatLng();
    }
    setLatLng(latlng: L.LatLng) {
        this.leafletInstance.setLatLng(latlng);
    }
    constructor(
        public latlng: L.LatLng,
        public parent: Shape<L.Path>,
        public target?: Marker
    ) {
        this.leafletInstance = new L.Marker(latlng, {
            icon: new VertexIcon(),
            draggable: true,
            pane: "drawing-markers"
        }).addTo(this.parent.map.leafletInstance);

        this.registerDragEvents();
    }

    registerDragEvents() {
        this.leafletInstance.on("drag", (evt: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(evt);
            this.leafletInstance.setLatLng(evt.latlng);
            if (this.target) {
                this.target.setLatLng(evt.latlng);
            }
            this.parent.redraw();

            this.onDrag();
        });
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(evt);
        });
        if (this.target) {
            this.target.leafletInstance.on(
                "drag",
                (evt: L.LeafletMouseEvent) => {
                    this.leafletInstance.fire("drag", evt);
                }
            );
        }
    }
    onDrag() {}
    hide() {
        this.leafletInstance.remove();
    }
    show() {
        this.leafletInstance.addTo(this.parent.map.leafletInstance);
    }
}
class MidIcon extends L.DivIcon {
    constructor() {
        super({
            iconSize: new L.Point(6, 6),
            className: "leaflet-div-icon leaflet-mid-icon"
        });
    }
}

export class MiddleVertex {
    leafletInstance: L.Marker;
    getLatLng() {
        return this.leafletInstance.getLatLng();
    }
    constructor(public latlng: L.LatLng, public parent: Shape<L.Path>) {
        this.leafletInstance = new L.Marker(latlng, {
            icon: new MidIcon(),
            draggable: true,
            pane: "drawing-markers"
        }).addTo(this.parent.map.leafletInstance);
    }
}
