import type { BaseMapType, LeafletOverlay, TooltipDisplay } from "src/@types";
import { Marker, Overlay } from "src/layer";
import { Layer } from "src/layer/layer";
import { BASE_POPUP_OPTIONS } from "src/utils";
import { LeafletSymbol } from "../utils/leaflet-import";
let L = window[LeafletSymbol];

class Popup {
    leafletInstance: L.Popup;
    private _timeoutHandler: ReturnType<typeof setTimeout>;

    handlerTarget: any;
    options: Options;
    get displayMarkerTooltips() {
        return this.map.plugin.data.displayMarkerTooltips;
    }
    get displayOverlayTooltips() {
        return this.map.plugin.data.displayOverlayTooltips;
    }
    constructor(
        private map: BaseMapType,
        private target: Layer<any> | L.LatLng | L.Polyline,
        options?: Options
    ) {
        this.options = { ...BASE_POPUP_OPTIONS, ...options };
        this.map.on("should-close-popup", (source) => {
            if (this.options.permanent) return;
            if (source != this) this.close();
        });
    }
    private canShowTooltip(
        target: Marker | LeafletOverlay,
        tooltip?: TooltipDisplay
    ) {
        const global =
            target instanceof Marker
                ? this.displayMarkerTooltips
                : this.displayOverlayTooltips;
        if (tooltip === "always") return true;
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

        this.map.leafletInstance.off("zoom", this.onZoomAnim);
        if (this.options.permanent) return;
        this.close();
    }
    private onMouseOut() {
        clearTimeout(this._timeoutHandler);

        if (this.options.permanent) return;

        this._timeoutHandler = setTimeout(() => this.onTimeOut(), 500);
    }
    private onMouseOver() {
        clearTimeout(this._timeoutHandler);
    }

    setTarget(target: Layer<any> | L.Polyline | L.LatLng) {
        this.target = target;
        this.leafletInstance = this.getPopup();
        return this;
    }

    open(
        content: ((source: L.Layer) => L.Content) | L.Content,
        handler?: L.Layer
    ) {
        console.log("🚀 ~ file: popup.ts ~ line 107 ~ content", content);
        if ("tooltip" in this.target && !this.canShowTooltip(this.target))
            return;

        if (!this.leafletInstance) this.leafletInstance = this.getPopup();

        if (this._timeoutHandler) {
            clearTimeout(this._timeoutHandler);
        }

        if (this.leafletInstance.isOpen()) {
            this.leafletInstance.setContent(content);
            if (this.target instanceof L.Polyline) {
                this.leafletInstance.setLatLng(
                    this.target.getLatLngs()[1] as L.LatLng
                );
            }
            return;
        }

        this.map.trigger("should-close-popup", this);

        if (this.target instanceof L.Polyline) {
            this.target.on("remove", () => this.close());
        }

        this.handlerTarget = handler ?? this.target;

        if (this.leafletInstance && this.leafletInstance.isOpen()) {
            this.close();
            if (this.target instanceof L.Layer) this.target.closePopup();
        }

        this.leafletInstance.setContent(content);

        let popupElement: HTMLElement;
        this.map.leafletInstance.on("popupopen", () => {
            if (this.options.permanent) return;
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

        this.map.leafletInstance.addLayer(this.leafletInstance);

        if (this.handlerTarget instanceof Overlay) {
            this.map.leafletInstance.on("zoom", this.onZoomAnim.bind(this));
        }

        if (this.options.permanent) return;
        if (this.handlerTarget instanceof L.LatLng) {
            this._timeoutHandler = setTimeout(() => {
                popupElement.removeEventListener(
                    "mouseenter",
                    this.onMouseOver
                );
                popupElement.removeEventListener("mouseleave", this.onMouseOut);

                this.close();
            }, 1000);
        } else if (this.handlerTarget instanceof L.Layer) {
            this.handlerTarget
                .on("mouseout", this.onMouseOut.bind(this))
                .on("mouseenter", this.onMouseOver.bind(this));
        } else {
            this.handlerTarget.leafletInstance
                .on("mouseout", this.onMouseOut.bind(this))
                .on("mouseenter", this.onMouseOver.bind(this));
        }
    }

    close() {
        console.trace();
        if (!this.leafletInstance) return;
        if (this.target instanceof Marker && this.target.tooltip === "always")
            return;
        this.leafletInstance.removeFrom(this.map.leafletInstance);
    }

    private getPopup(): L.Popup {
        if (this.leafletInstance && this.leafletInstance.isOpen()) {
            this.close();
        }

        return this.buildPopup();
    }

    private buildPopup(): L.Popup {
        if (this.target instanceof L.LatLng) {
            return L.popup(this.options).setLatLng(this.target);
        } else if (this.target instanceof L.Polyline) {
            return L.popup(this.options).setLatLng(
                this.target.getLatLngs()[1] as L.LatLng
            );
        } else if (this.target instanceof Overlay) {
            return L.popup({
                ...this.options,
                offset: new L.Point(
                    0,
                    (-1 *
                        this.target.leafletInstance
                            .getElement()
                            .getBoundingClientRect().height) /
                        2 +
                        10 // not sure why circles have this extra padding..........
                )
            }).setLatLng(this.target.leafletInstance.getLatLng());
        } else {
            return L.popup({
                ...this.options,
                offset: new L.Point(
                    0,
                    (-1 *
                        this.target.leafletInstance
                            .getElement()
                            .getBoundingClientRect().height) /
                        2
                )
            }).setLatLng(this.target.leafletInstance.getLatLng());
        }
    }
    isOpen() {
        return this.leafletInstance.isOpen();
    }
    setContent(content: ((source: L.Layer) => L.Content) | L.Content) {
        if (!this.leafletInstance) this.leafletInstance = this.getPopup();
        this.leafletInstance.setContent(content);
    }
    setLatLng(latlng: L.LatLng) {
        if (!this.leafletInstance) this.leafletInstance = this.getPopup();
        this.leafletInstance.setLatLng(latlng);
    }
}
interface Options extends L.PopupOptions {
    permanent?: boolean;
}
export function popup(
    map: BaseMapType,
    target: Layer<any> | L.LatLng | L.Polyline,
    options?: Options
): Popup {
    return new Popup(map, target, options);
}
