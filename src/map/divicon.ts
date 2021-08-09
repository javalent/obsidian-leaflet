import { LeafletSymbol } from "src/utils/leaflet-import";
import { DivIconMarkerOptions, MarkerDivIconOptions } from "../@types";

const L = window[LeafletSymbol];
class MarkerDivIcon extends L.DivIcon {
    options: MarkerDivIconOptions;
    div: HTMLElement;
    constructor(options: MarkerDivIconOptions) {
        super(options);
    }
    createIcon(oldIcon: HTMLElement) {
        const div = super.createIcon(oldIcon);
        for (let item in this.options.data) {
            div.dataset[item] = this.options.data[item];
        }
        this.div = div;
        return div;
    }
    setData(data: { [key: string]: string }) {
        this.options.data = {
            ...this.options.data,
            ...data
        };
        if (this.div) {
            for (let item in data) {
                this.div.dataset[item] = this.options.data[item];
            }
        }
    }
}

export const markerDivIcon = function (options: MarkerDivIconOptions) {
    return new MarkerDivIcon(options);
};

class DivIconMarker extends L.Marker {
    options: DivIconMarkerOptions;
    constructor(
        latlng: L.LatLng,
        options: L.MarkerOptions,
        data: { [key: string]: string }
    ) {
        super(latlng, options);
        this.options.icon.setData(data);
    }
}

export const divIconMarker = function (
    latlng: L.LatLng,
    options: DivIconMarkerOptions,
    data: { [key: string]: string }
) {
    return new DivIconMarker(latlng, options, data);
};
