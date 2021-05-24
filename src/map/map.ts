import L from "leaflet";
import { DivIcon } from "leaflet";
import {
    DivIconMarkerOptions,
    IMarkerIcon,
    MarkerDivIconOptions,
    Marker as MarkerDefinition
} from "../@types";

class MarkerDivIcon extends DivIcon {
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
    private _loc: [number, number];
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    id: string;
    layer: string;
    command: boolean;
    zoom: number;
    maxZoom: number;
    divIcon: MarkerDivIcon;
    constructor({
        id,
        icon,
        type,
        loc,
        link,
        layer,
        mutable,
        command,
        zoom,
        maxZoom = zoom
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
        maxZoom?: number;
    }) {
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

        this.zoom = zoom;
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
    setLatLng(latlng: L.LatLng) {
        this.loc = latlng;
        this.leafletInstance.setLatLng(latlng);
    }
    remove() {
        this.leafletInstance.remove();
    }
    static from(marker: Marker): Marker {
        return new Marker({
            id: marker.id,
            icon: marker.divIcon,
            type: marker.type,
            loc: marker.loc,
            link: marker.link,
            layer: marker.layer,
            mutable: marker.mutable,
            zoom: marker.zoom,
            maxZoom: marker.maxZoom,
            command: marker.command
        });
    }
}
