import { MAP_OVERLAY_STROKE_OPACITY, MAP_OVERLAY_STROKE_WIDTH } from ".";
import type * as Leaflet from "leaflet";

declare global {
    interface Window {
        "obsidian-leaflet-plugin": typeof Leaflet;
    }
}

export const LeafletSymbol = "obsidian-leaflet-plugin";

const WindowL = window.L;

require("leaflet");
require("leaflet-fullscreen");

window.L.Circle.mergeOptions({
    weight: MAP_OVERLAY_STROKE_WIDTH,
    opacity: MAP_OVERLAY_STROKE_OPACITY
});
window[LeafletSymbol] = window.L;

window.L = WindowL;
