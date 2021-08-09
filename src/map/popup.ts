import type { LeafletMap, LeafletOverlay, TooltipDisplay } from "src/@types";
import { Marker } from "src/layer";
import { BASE_POPUP_OPTIONS } from "src/utils";
import { LeafletSymbol } from "../utils/leaflet-import";
let L = window[LeafletSymbol];

class Popup {
    leafletInstance: L.Popup;
    private _timeoutHandler: ReturnType<typeof setTimeout>;
    target: Marker | L.Circle | L.LatLng;
    handlerTarget: any;
    get displayMarkerTooltips() {
        return this.map.plugin.AppData.displayMarkerTooltips;
    }
    get displayOverlayTooltips() {
        return this.map.plugin.AppData.displayOverlayTooltips;
    }
    constructor(private map: LeafletMap, private source?: L.Layer) {
        this.leafletInstance = L.popup({ ...BASE_POPUP_OPTIONS });
    }
    private canShowTooltip(
        target: Marker | LeafletOverlay,
        tooltip?: TooltipDisplay
    ) {
        const global =
            target instanceof Marker
                ? this.displayMarkerTooltips
                : this.displayOverlayTooltips;
        if (tooltip === "always") return false;
        if (tooltip === "hover" && global) return true;
        if (tooltip === "never") return false;
        return global;
    }
    private onZoomAnim() {
        if (this.target instanceof L.Circle) {
            this.leafletInstance.options.offset = new L.Point(
                0,
                (-1 * this.target.getElement().getBoundingClientRect().height) /
                    2 +
                    10 // not sure why circles have this extra padding..........
            );
            this.leafletInstance.update();
        }
    }

    private onTimeOut() {
        if (
            !(
                this.handlerTarget instanceof L.LatLng ||
                this.handlerTarget instanceof L.Layer
            )
        ) {
            this.handlerTarget.leafletInstance.off(
                "mouseenter",
                this.onMouseOver
            );
            this.handlerTarget.leafletInstance.off("mouseout", this.onMouseOut);
        }
        if (this.handlerTarget instanceof L.Layer) {
            this.handlerTarget
                .off("mouseout", this.onMouseOut)
                .off("mouseenter", this.onMouseOver);
        }

        this.leafletInstance
            .getElement()
            .removeEventListener("mouseenter", this.onMouseOver);
        this.leafletInstance
            .getElement()
            .removeEventListener("mouseleave", this.onMouseOut);

        this.map.off("zoomend", this.onZoomAnim);
        this.close();
    }
    private onMouseOut() {
        clearTimeout(this._timeoutHandler);
        this._timeoutHandler = setTimeout(() => this.onTimeOut(), 500);
    }
    private onMouseOver() {
        clearTimeout(this._timeoutHandler);
    }
    open(
        target: Marker | L.Circle | L.LatLng,
        content: ((source: L.Layer) => L.Content) | L.Content,
        handler?: L.Layer
    ) {
        if ("tooltip" in target && !this.canShowTooltip(target, target.tooltip))
            return;

        if (this._timeoutHandler) {
            clearTimeout(this._timeoutHandler);
        }
        if (this.leafletInstance.isOpen() && this.target == target) {
            this.leafletInstance.setContent(content);
            return;
        }

        this.target = target;

        this.handlerTarget = handler ?? target;

        if (this.leafletInstance && this.leafletInstance.isOpen()) {
            this.close();
            if (target instanceof L.Layer) target.closePopup();
        }

        this.leafletInstance = this._getPopup(target).setContent(content);
        let popupElement: HTMLElement;
        let _this = this;

        this.map.on("popupopen", () => {
            popupElement = this.leafletInstance.getElement();
            popupElement.addEventListener(
                "mouseenter",
                this.onMouseOver.bind(this)
            );
            popupElement.addEventListener(
                "mouseleave",
                this.onMouseOut.bind(this)
            );
        });
        this.map.map.openPopup(this.leafletInstance);

        if (this.handlerTarget instanceof L.LatLng) {
            this._timeoutHandler = setTimeout(function () {
                popupElement.removeEventListener(
                    "mouseenter",
                    this.onMouseOver
                );
                popupElement.removeEventListener("mouseleave", this.onMouseOut);

                _this.close();
            }, 1000);
        } else if (this.handlerTarget instanceof L.Layer) {
            this.handlerTarget
                .on("mouseout", this.onMouseOut.bind(this))
                .on("mouseenter", this.onMouseOver.bind(this));
        } else {
            this.handlerTarget.leafletInstance
                .on("mouseout", this.onMouseOut.bind(this))
                .on("mouseenter", this.onMouseOver.bind(this));
            this.map.on("zoomend", this.onZoomAnim.bind(this));
        }
    }

    close() {
        if (!this.leafletInstance) return;
        this.map.closePopup(this.leafletInstance);
    }

    private _getPopup(target: Marker | L.Circle | L.LatLng): L.Popup {
        if (this.leafletInstance.isOpen() && this.target == target) {
            return this.leafletInstance;
        }

        this.target = target;

        if (this.leafletInstance && this.leafletInstance.isOpen()) {
            this.close();
        }

        return this.buildPopup(target);
    }

    private buildPopup(target: Marker | L.Circle | L.LatLng): L.Popup {
        if (target instanceof L.LatLng) {
            return L.popup({
                ...BASE_POPUP_OPTIONS
            }).setLatLng(target);
        } else if (target instanceof L.Circle) {
            return L.popup({
                ...BASE_POPUP_OPTIONS,
                offset: new L.Point(
                    0,
                    (-1 * target.getElement().getBoundingClientRect().height) /
                        2 +
                        10 // not sure why circles have this extra padding..........
                )
            }).setLatLng(target.getLatLng());
        } else {
            return L.popup({
                ...BASE_POPUP_OPTIONS,
                offset: new L.Point(
                    0,
                    (-1 *
                        target.leafletInstance
                            .getElement()
                            .getBoundingClientRect().height) /
                        2
                )
            }).setLatLng(target.leafletInstance.getLatLng());
        }
    }
    isOpen() {
        return this.leafletInstance.isOpen();
    }
    setContent(content: ((source: L.Layer) => L.Content) | L.Content) {
        this.leafletInstance.setContent(content);
    }
    setLatLng(latlng: L.LatLng) {
        this.leafletInstance.setLatLng(latlng);
    }
}

export function popup(map: LeafletMap, source?: L.Layer): Popup {
    return new Popup(map, source);
}
