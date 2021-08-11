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
        if (this.external)
            return createEl("a", {
                text: this.text,
                href: this.text,
                cls: "external-link"
            });
        return createSpan({
            text: this.text
                .replace(/(\^)/, " > ^")
                .replace(/#/, " > ")
                .split("|")
                .pop()
        });
    }
    get external() {
        return (
            !this.isInternal &&
            /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*))/.test(
                this.text
            )
        );
    }
    async run(evt: L.LeafletMouseEvent) {
        /* if (!this.external) { */
        await this.app.workspace.openLinkText(
            this._text.replace("^", "#^").split(/\|/).shift(),
            this.app.workspace.getActiveFile()?.path,
            evt.originalEvent.getModifierState(MODIFIER_KEY)
        );
        /* } */
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
                if (evt.originalEvent.getModifierState("Shift")) {
                    this.map.beginOverlayDrawingContext(evt, this);
                    return;
                }
                if (!this.mutable) {
                    new Notice(
                        "This marker cannot be edited because it was defined in the code block."
                    );
                    return;
                }

                let markerSettingsModal = new MarkerContextModal(
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
                        this.tooltip = markerSettingsModal.tempMarker.tooltip;
                        this.minZoom = markerSettingsModal.tempMarker.minZoom;
                        this.maxZoom = markerSettingsModal.tempMarker.maxZoom;
                        this.command = markerSettingsModal.tempMarker.command;

                        if (this.shouldShow(this.map.map.getZoom())) {
                            this.show();
                        } else if (this.shouldHide(this.map.map.getZoom())) {
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
            })
            .on("click", async (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                if (this.map.isDrawing) {
                    this.map.onMarkerClick(this, evt);
                    return;
                }

                if (
                    evt.originalEvent.getModifierState("Alt") ||
                    evt.originalEvent.getModifierState("Shift")
                ) {
                    this.map.onMarkerClick(this, evt);
                    const latlng = this.map.formatLatLng(this.latLng);
                    this.popup.open(this, `[${latlng.lat}, ${latlng.lng}]`);

                    if (
                        this.map.data.copyOnClick &&
                        evt.originalEvent.getModifierState(MODIFIER_KEY)
                    ) {
                        await this.map.copyLatLngToClipboard(this.loc);
                    }

                    return;
                }
                if (this.target) {
                    this.target.run(evt);
                }
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
                this.isBeingHovered = true;
                if (this.map.data.notePreview && this.link) {
                    this.map.plugin.app.workspace.trigger(
                        "link-hover",
                        this, //hover popover
                        this.leafletInstance.getElement(), //targetEl
                        this.link.replace("^", "#^").split("|").shift(), //linkText
                        this.map.options.context //source
                    );
                    return;
                }

                if (this.target) {
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
        if (this.leafletInstance.options?.icon) {
            this.leafletInstance.options.icon.setData({
                link: `${x}`
            });
        }
        if (!x || !x.length) {
            this.target = null;
            return;
        }
        if (!this.target) {
            if (this.command) {
                this.target = new Command(x, this.map.plugin.app);
            } else {
                this.target = new Link(x, this.map.plugin.app);
            }
        }
        this.target.text = x;
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
