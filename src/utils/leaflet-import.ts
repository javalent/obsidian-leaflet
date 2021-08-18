import { MAP_OVERLAY_STROKE_OPACITY, MAP_OVERLAY_STROKE_WIDTH } from ".";
import L from "leaflet";
import "leaflet-fullscreen";
import "../leaflet-gpx/gpx";
import "leaflet-hotline"

declare global {
    interface Window {
        [LeafletSymbol]: typeof L;
    }
}

declare module "leaflet" {
    function noConflict(): typeof L;
}

export const LeafletSymbol = "obsidian-leaflet-plugin";

/* require("leaflet");
require("leaflet-fullscreen");
require("leaflet-gpx"); */

window.L.Circle.mergeOptions({
    weight: MAP_OVERLAY_STROKE_WIDTH,
    opacity: MAP_OVERLAY_STROKE_OPACITY
});

window[LeafletSymbol] = L.noConflict();
