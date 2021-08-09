import { Popup } from "leaflet";
import { App, Notice, setIcon } from "obsidian";
import {
    LeafletMap,
    MarkerIcon,
    Marker as MarkerDefinition,
    DivIconMarker,
    MarkerDivIcon,
    TooltipDisplay,
    MarkerProperties,
    SavedMarkerProperties,
    LayerGroup
} from "src/@types";
import { MarkerContextModal } from "src/modals";
import { divIconMarker } from ".";
import { LeafletSymbol } from "../utils/leaflet-import";

let L = window[LeafletSymbol];

abstract class MarkerTarget {
    abstract text: string;
    abstract display: HTMLElement;
}

class Link extends MarkerTarget {
    display: HTMLElement;
    constructor(private _text: string) {
        super();
    }
    get text() {
        return this._text;
    }
    set text(text: string) {
        this._text = text;
        this.display = this._getDisplay();
    }
    private _getDisplay() {
        return createSpan({
            text: this.text
                .replace(/(\^)/, " > ^")
                .replace(/#/, " > ")
                .split("|")
                .pop()
        });
    }
}
class Command extends MarkerTarget {
    display: HTMLElement;
    constructor(private _text: string, private app: App) {
        super();
    }
    get text() {
        return this._text;
    }
    set text(text: string) {
        this._text = text;
        this.display = this._getDisplay();
    }
    private _getDisplay() {
        const commands = this.app.commands.listCommands();
        const div = createDiv({
            attr: {
                style: "display: flex; align-items: center;"
            }
        });
        if (
            commands.find(
                ({ id }) => id.toLowerCase() === this.text.toLowerCase().trim()
            )
        ) {
            const command = commands.find(
                ({ id }) => id.toLowerCase() === this.text.toLowerCase().trim()
            );

            setIcon(
                div.createSpan({
                    attr: {
                        style: "margin-right: 0.5em; display: flex; align-items: center;"
                    }
                }),
                "run-command"
            );
            div.createSpan({ text: command.name });
        } else {
            setIcon(
                div.createSpan({
                    attr: {
                        style: "margin-right: 0.5em; display: flex; align-items: center;"
                    }
                }),
                "cross"
            );
            div.createSpan({ text: "No command found!" });
        }
        return div;
    }
}

export class NewMarker {
    private target: MarkerTarget;
    public leafletInstance: DivIconMarker;
    public icon: MarkerDivIcon;
    loc: L.LatLng;
    constructor(private map: LeafletMap) {
        this.map.on("ready-for-features", (layer: LayerGroup) => {
            if (layer.id === this.layer) {
                this.leafletInstance.addTo(layer.markers[this.type]);
            }
        });

        if (this.map.rendered) {
            let layer =
                this.map.mapLayers.find(({ id }) => id === this.layer) ??
                this.map.group;

            this.leafletInstance.addTo(layer.markers[this.type]);
        }
    }
}

export class Marker implements MarkerDefinition {
    private _target: MarkerTarget = new Link("");
    private _mutable: boolean;
    private _type: string;
    private _command: boolean;
    leafletInstance: DivIconMarker;
    loc: L.LatLng;
    percent: [number, number];
    id: string;
    layer: string;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    description: string;
    divIcon: MarkerDivIcon;
    displayed: boolean;
    group: L.LayerGroup;
    tooltip?: TooltipDisplay;
    popup?: L.Popup;
    private _icon: MarkerIcon;
    isBeingHovered: boolean = false;
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
        }: MarkerProperties
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

        this.map.on("ready-for-features", (layer: LayerGroup) => {
            if (layer.id === this.layer) {
                this.leafletInstance.addTo(layer.markers[this.type]);
            }
        });

        if (this.map.rendered) {
            let layer =
                this.map.mapLayers.find(({ id }) => id === this.layer) ??
                this.map.group;

            this.leafletInstance.addTo(layer.markers[this.type]);
        }

        this.bindEvents();
    }
    private bindEvents() {
        this.leafletInstance
            .on("contextmenu", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                if (this.mutable) {
                    let markerSettingsModal = new MarkerContextModal(
                        this.map.plugin,
                        this,
                        this.map
                    );

                    markerSettingsModal.onClose = async () => {
                        if (markerSettingsModal.deleted) {
                            this.map.removeMarker(this);
                            this.map.trigger("marker-deleted", this);
                        } else {
                            this.map.displaying.delete(this.type);
                            this.map.displaying.set(
                                markerSettingsModal.tempMarker.type,
                                true
                            );
                            this.link = markerSettingsModal.tempMarker.link;
                            this.icon = this.map.markerIcons.get(
                                markerSettingsModal.tempMarker.type
                            );
                            this.tooltip =
                                markerSettingsModal.tempMarker.tooltip;
                            this.minZoom =
                                markerSettingsModal.tempMarker.minZoom;
                            this.maxZoom =
                                markerSettingsModal.tempMarker.maxZoom;
                            this.command =
                                markerSettingsModal.tempMarker.command;

                            if (this.shouldShow(this.map.map.getZoom())) {
                                this.show();
                            } else if (
                                this.shouldHide(this.map.map.getZoom())
                            ) {
                                this.hide();
                            }

                            if (this.tooltip === "always" && !this.popup) {
                                this.popup = new Popup();
                                const content = this._target.display;
                                this.popup.setContent(content);
                                this.map.map.openPopup(this.popup);
                            } else if (
                                this.tooltip !== "always" &&
                                this.popup
                            ) {
                                this.map.map.closePopup(this.popup);
                                delete this.popup;
                            }

                            this.map.trigger("marker-updated", this);
                            await this.map.plugin.saveSettings();
                        }
                    };
                    markerSettingsModal.open();
                } else {
                    new Notice(
                        "This marker cannot be edited because it was defined in the code block."
                    );
                }
            })
            .on("click", async (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                this.map.onMarkerClick(this, evt);
            })
            .on("dragstart", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
            })
            .on("drag", (evt: L.LeafletMouseEvent) => {
                this.map.trigger("marker-dragging", this);

                if (this.tooltip === "always" && this.popup) {
                    this.popup.setLatLng(evt.latlng);
                } else if (this.popup.isOpen()) {
                    this.popup.setLatLng(evt.latlng);
                }
            })
            .on("dragend", (evt: L.LeafletMouseEvent) => {
                const old = this.loc;
                /* this.loc = this.leafletInstance.getLatLng(); */
                this.setLatLng(this.leafletInstance.getLatLng());
                this.map.trigger("marker-data-updated", this, old);
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                /*                 if (this.link) { */
                /* this.trigger("marker-mouseover", evt, marker); */
                this.map.onMarkerMouseover(this);
                /*                 } */
                /*                 this.isBeingHovered = true;
                if (this.map._distanceLine) {
                    this.map._distanceLine.setLatLngs([
                        this.map._distanceLine.getLatLngs()[0] as L.LatLngExpression,
                        this.loc
                    ]);
                } */
            })
            .on("mouseout", (evt: L.LeafletMouseEvent) => {
                this.leafletInstance.closeTooltip();
                this.isBeingHovered = false;
            });
    }
    get link() {
        return this._target.text;
    }
    set link(x: string) {
        this._target.text = x;
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                link: `${x}`
            });
        }
    }
    get command() {
        return this._command;
    }
    set command(b: boolean) {
        this._command = b;
        if (b) {
            this._target = new Command(this.link, this.map.plugin.app);
        } else {
            this._target = new Link(this.link);
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
    set icon(x: MarkerIcon) {
        this.type = x.type;
        this._icon = x;
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

    show() {
        if (this.group && !this.displayed) {
            this.group.addLayer(this.leafletInstance);
            this.displayed = true;
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

    hide() {
        if (this.group && this.displayed) {
            this.remove();
            this.displayed = false;
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

    static from(map: LeafletMap, properties: MarkerProperties) {
        return new Marker(map, properties);
    }

    toProperties(): SavedMarkerProperties {
        return {
            id: this.id,
            type: this.type,
            loc: [this.loc.lat, this.loc.lng],
            link: this.link,
            layer: this.layer,
            mutable: this.mutable,
            command: this.command,
            zoom: this.zoom,
            percent: this.percent,
            description: this.description,
            minZoom: this.minZoom,
            maxZoom: this.maxZoom,
            tooltip: this.tooltip
        };
    }

    remove() {
        this.group && this.group.removeLayer(this.leafletInstance);
    }
}
