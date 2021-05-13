import L, { LatLng } from "leaflet";
import { DivIcon } from "leaflet";
import {
    DivIconMarkerOptions,
    IMarkerIcon,
    MarkerDivIconOptions
} from "src/@types";
import { LAT_LONG_DECIMALS } from "./constants";

export class MarkerDivIcon extends DivIcon {
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

export class DivIconMarker extends L.Marker {
    options: DivIconMarkerOptions;
    constructor(
        latlng: L.LatLng,
        options: L.MarkerOptions,
        data: { [key: string]: string }
    ) {
        super(latlng, options);
        this.options.icon.options.data = data;
    }
}

export class Marker {
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
}

export const divIconMarker = function (
    latlng: L.LatLng,
    options: DivIconMarkerOptions,
    data: { [key: string]: string }
) {
    return new DivIconMarker(latlng, options, data);
};
export class DistanceDisplay extends L.Control {
    controlEl: HTMLElement;
    textEl: HTMLSpanElement;
    line: L.Polyline;
    map: L.Map;
    popups: [L.Popup, L.Popup];
    constructor(opts: L.ControlOptions, line: L.Polyline) {
        super(opts);
        this.line = line;
        this.popups = [
            L.popup({
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            }),
            L.popup({
                className: "leaflet-marker-link-popup",
                autoClose: false,
                closeButton: false,
                closeOnClick: false,
                autoPan: false
            })
        ];
    }
    initEvents() {
        this.controlEl.onmouseenter = this.onMouseEnter.bind(this);
        this.controlEl.onclick = this.onClick.bind(this);
        this.controlEl.onmouseleave = this.onMouseLeave.bind(this);
    }
    onMouseEnter() {
        if (this.line) {
            const latlngs = this.line.getLatLngs() as L.LatLng[];

            this.popups[0].setLatLng(latlngs[0]);
            this.popups[0].setContent(
                `[${latlngs[0].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[0].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.openPopup(this.popups[0]);

            this.popups[1].setLatLng(latlngs[1]);
            this.popups[1].setContent(
                `[${latlngs[1].lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${latlngs[1].lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            this.map.openPopup(this.popups[1]);

            this.line.setStyle({ color: "blue", dashArray: "4 1" });
            this.line.addTo(this.map);
        }
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        if (this.line) {
            this.map.fitBounds(
                L.latLngBounds(
                    this.line.getLatLngs()[0] as L.LatLng,
                    this.line.getLatLngs()[1] as L.LatLng
                ),
                { duration: 0.5, easeLinearity: 0.1, animate: true }
            );
        }
    }
    onMouseLeave() {
        this.line.remove();
        this.map.closePopup(this.popups[0]);
        this.map.closePopup(this.popups[1]);
    }
    onAdd(map: L.Map) {
        this.map = map;
        this.controlEl = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-distance-control hidden"
        );
        this.textEl = this.controlEl.createSpan();
        this.textEl.setText("0 km");

        this.initEvents();

        return this.controlEl;
    }
    setText(text: string) {
        this.textEl.setText(text);
    }
    setLine(line: L.Polyline) {
        this.line = line;
    }
}

export const distanceDisplay = function (
    opts: L.ControlOptions,
    line: L.Polyline
) {
    return new DistanceDisplay(opts, line);
};
