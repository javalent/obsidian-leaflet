import { MAP_OVERLAY_STROKE_OPACITY, MAP_OVERLAY_STROKE_WIDTH } from ".";
import { HotlinePlugin } from "./hotline";
import { FullscreenPlugin } from "./fullscreen/fullscreen";
import type * as Leaflet from "leaflet";

declare global {
    interface Window {
        [LeafletSymbol]: typeof Leaflet;
    }
}

export const LeafletSymbol = "OBSIDIAN_LEAFLET_PLUGIN";

const WindowL = window.L;
if (!window.L) {
    require("leaflet");
}

window[LeafletSymbol] = window.L;
window[LeafletSymbol].Circle.mergeOptions({
    weight: MAP_OVERLAY_STROKE_WIDTH,
    opacity: MAP_OVERLAY_STROKE_OPACITY
});
HotlinePlugin(window[LeafletSymbol]);
FullscreenPlugin(window[LeafletSymbol]);

window.L = WindowL;
