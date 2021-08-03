import { TooltipDisplay } from "src/@types/map";
import { LeafletSymbol } from "src/utils/leaflet-import";
import {
    DivIconMarkerOptions,
    IMarkerIcon,
    MarkerDivIconOptions,
    Marker as MarkerDefinition,
    LeafletMap
} from "../@types";

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

export class Marker implements MarkerDefinition {
    private _link: string;
    private _mutable: boolean;
    private _type: string;
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    percent: [number, number];
    id: string;
    layer: string;
    command: boolean;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    description: string;
    divIcon: MarkerDivIcon;
    displayed: boolean;
    group: L.LayerGroup;
    tooltip?: TooltipDisplay;
    popup?: L.Popup;
    constructor(
        private map: LeafletMap,
        {
            id,
            icon,
            type,
            loc,
            link,
            layer,
            mutable,
            command,
            zoom,
            percent,
            description,
            minZoom,
            maxZoom,
            tooltip
        }: {
            id: string;
            icon: MarkerDivIcon;
            type: string;
            loc: L.LatLng;
            link: string;
            layer: string;
            mutable: boolean;
            command: boolean;
            zoom: number;
            percent: [number, number];
            description: string;
            minZoom?: number;
            maxZoom?: number;
            tooltip?: TooltipDisplay;
        }
    ) {
        this.leafletInstance = divIconMarker(
            loc,
            {
                icon: icon,
                keyboard: mutable,
                draggable: mutable,
                bubblingMouseEvents: true
            },
            {
                link: link,
                mutable: `${mutable}`,
                type: type
            }
        );

        this.id = id;
        this.type = type;
        this.loc = loc;
        this.link = link;
        this.layer = layer;
        this.mutable = mutable;
        this.command = command;
        this.divIcon = icon;
        this.percent = percent;
        this.description = description;
        this.tooltip = tooltip;

        this.zoom = zoom;
        this.minZoom = minZoom;
        this.maxZoom = maxZoom;
    }
    get link() {
        return this._link;
    }
    set link(x: string) {
        this._link = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                link: `${x}`
            });
        }
    }
    get mutable() {
        return this._mutable;
    }
    set mutable(x: boolean) {
        this._mutable = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                mutable: `${x}`
            });
        }
    }

    get type() {
        return this._type;
    }
    set type(x: string) {
        this._type = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                type: `${x}`
            });
        }
    }
    set icon(x: IMarkerIcon) {
        this.type = x.type;
        this.leafletInstance.setIcon(x.icon);
    }
    get latLng() {
        return this.loc;
    }

    get display() {
        const ret = [this.link];
        if (this.description) {
            ret.unshift(`${this.description} `, "(");
            ret.push(")");
        }
        return ret.join("");
    }

    setLatLng(latlng: L.LatLng) {
        this.loc = latlng;
        if (this.map.rendered && this.map.type === "image") {
            let { x, y } = this.map.map.project(
                this.loc,
                this.map.zoom.max - 1
            );
            this.percent = [
                x / this.map.group.dimensions[0],
                y / this.map.group.dimensions[1]
            ];
        }
        this.leafletInstance.setLatLng(latlng);
    }
    remove() {
        this.group && this.group.removeLayer(this.leafletInstance);
    }

    show() {
        if (this.group && !this.displayed) {
            this.group.addLayer(this.leafletInstance);
            this.displayed = true;
        }
    }

    hide() {
        if (this.group && this.displayed) {
            this.remove();
            this.displayed = false;
        }
    }
    shouldShow(zoom: number) {
        if (!this.displayed) {
            if (
                this.minZoom != null &&
                this.minZoom <= zoom &&
                this.maxZoom != null &&
                zoom <= this.maxZoom
            ) {
                return true;
            }
        }
    }
    shouldHide(zoom: number) {
        if (this.displayed) {
            if (
                (this.minZoom != null && this.minZoom > zoom) ||
                (this.maxZoom != null && zoom > this.maxZoom)
            ) {
                return true;
            }
        }
    }
}
