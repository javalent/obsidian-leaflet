import { App, MetadataCache, Notice, setIcon } from "obsidian";
import {
    LeafletMap,
    MarkerIcon,
    Marker as MarkerDefinition,
    DivIconMarker,
    MarkerDivIcon,
    TooltipDisplay,
    MarkerProperties,
    SavedMarkerProperties,
    Popup
} from "src/@types";
import { MarkerContextModal } from "src/modals";
import { divIconMarker } from "src/map";
import { LeafletSymbol } from "../utils/leaflet-import";
import { Layer } from "../layer/layer";
import { popup } from "src/map/popup";
import { MODIFIER_KEY } from "src/utils";

let L = window[LeafletSymbol];

abstract class MarkerTarget {
    abstract text: string;
    abstract display: HTMLElement;
    abstract run(evt: L.LeafletMouseEvent): void;
}

class Link extends MarkerTarget {
    display: HTMLElement;
    get isInternal() {
        return (
            this.app.metadataCache.getFirstLinkpathDest(
                this.text.split(/(\^|\||#)/).shift(),
                ""
            ) != null
        );
    }
    constructor(private _text: string, private app: App) {
        super();
        this.display = this._getDisplay();
    }
    get text() {
        return this._text;
    }
    set text(text: string) {
        this._text = text;
        this.display = this._getDisplay();
    }
    private _getDisplay() {
        if (!this.text) return;
        return createSpan({
            text: this.text
                .replace(/(\^)/, " > ^")
                .replace(/#/, " > ")
                .split("|")
                .pop()
        });
    }
    async run(evt: L.LeafletMouseEvent) {
        if (this.isInternal) {
            await this.app.workspace.openLinkText(
                this._text.replace("^", "#^").split(/\|/).shift(),
                this.app.workspace.getActiveFile()?.path,
                evt.originalEvent.getModifierState(MODIFIER_KEY)
            );
        } else {
            let [, l] = this._text.match(
                /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*))/
            );

            const a = createEl("a", {
                href: l
            });

            a.click();
            a.detach();
        }
    }
}
class Command extends MarkerTarget {
    display: HTMLElement;
    constructor(private _text: string, private app: App) {
        super();
        this.display = this._getDisplay();
    }
    get text() {
        return this._text;
    }
    set text(text: string) {
        this._text = text;
        this.display = this._getDisplay();
    }
    get exists() {
        return this.app.commands.findCommand(this._text) != null;
    }
    get command() {
        return this.app.commands.findCommand(this._text);
    }
    private _getDisplay() {
        const div = createDiv({
            attr: {
                style: "display: flex; align-items: center;"
            }
        });
        if (this.exists) {
            setIcon(
                div.createSpan({
                    attr: {
                        style: "margin-right: 0.5em; display: flex; align-items: center;"
                    }
                }),
                "run-command"
            );
            div.createSpan({ text: this.command.name });
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
    run(evt: L.LeafletMouseEvent) {
        if (this.exists) this.app.commands.executeCommandById(this._text);
    }
}

export class Marker extends Layer<DivIconMarker> implements MarkerDefinition {
    private target: MarkerTarget;
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
    tooltip?: TooltipDisplay;
    popup: Popup;
    private _icon: MarkerIcon;
    isBeingHovered: boolean = false;
    constructor(
        public map: LeafletMap,
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
        super();
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
        if (link) {
            if (command) {
                this.target = new Command(link, this.map.plugin.app);
            } else {
                this.target = new Link(link, this.map.plugin.app);
            }
        }

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

        if (this.tooltip === "always") {
            this.popup = popup(this.map);
        } else {
            this.popup = this.map.popup;
        }

        this.zoom = zoom;
        this.minZoom = minZoom;
        this.maxZoom = maxZoom;

        this.checkAndAddToMap();

        this.bindEvents();
    }

    get group() {
        return this.mapLayer?.markers[this.type];
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
                                this.popup = popup(this.map);
                                this.popup.open(this, this.target.display);
                            } else if (this.tooltip !== "always") {
                                this.popup.close();
                                this.popup = this.map.popup;
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

                if (this.target) {
                    this.target.run(evt);
                }

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

                if (this.target) {
                    console.log(
                        "🚀 ~ file: marker.ts ~ line 319 ~ this.target.display",
                        this.target,
                        this.target.text,
                        this.popup
                    );
                    this.popup.open(this, this.target.display);
                }
            })
            .on("mouseout", (evt: L.LeafletMouseEvent) => {
                this.leafletInstance.closeTooltip();
                this.isBeingHovered = false;
            });
    }
    get link() {
        return this.target && this.target.text;
    }
    set link(x: string) {
        if (!this.target) {
            if (this.command) {
                this.target = new Command(x, this.map.plugin.app);
            } else {
                this.target = new Link(x, this.map.plugin.app);
            }
        }
        this.target.text = x;
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
        if (!this.link) return;
        if (b) {
            this.target = new Command(this.link, this.map.plugin.app);
        } else {
            this.target = new Link(this.link, this.map.plugin.app);
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
        if (
            this.shouldShow(this.map.getZoom()) &&
            this.group &&
            !this.displayed
        ) {
            this.group.addLayer(this.leafletInstance);
            this.displayed = true;
        }
    }
    shouldShow(zoom: number) {
        if (this.minZoom == this.maxZoom && this.minZoom == null) return true;
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
        return false;
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
