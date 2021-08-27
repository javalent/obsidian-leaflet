import { MAP_OVERLAY_STROKE_OPACITY, MAP_OVERLAY_STROKE_WIDTH } from ".";
import type * as Leaflet from "leaflet";

declare global {
    interface Window {
        [LeafletSymbol]: typeof Leaflet;
    }
}

export const LeafletSymbol = "OBSIDIAN_LEAFLET_PLUGIN";

const WindowL = window.L;

require("leaflet");
window.L.Circle.mergeOptions({
    weight: MAP_OVERLAY_STROKE_WIDTH,
    opacity: MAP_OVERLAY_STROKE_OPACITY
});

window[LeafletSymbol] = window.L;

window.L = WindowL;

require("leaflet-fullscreen");
require("leaflet-hotline");
require("leaflet-editable");
require("leaflet-freedraw");