import { ILeafletMapOptions, IObsidianAppData } from "src/@types";

export const LAT_LONG_DECIMALS = 4;
export const DISTANCE_DECIMALS = 1;
export const DEFAULT_MAP_OPTIONS: ILeafletMapOptions = {
    minZoom: 1,
    maxZoom: 10,
    defaultZoom: 1,
    zoomDelta: 1,
    unit: "m",
    scale: 1,
    distanceMultiplier: 1,
    simple: false
};
export const DEFAULT_SETTINGS: IObsidianAppData = {
    mapMarkers: [],
    defaultMarker: {
        type: "default",
        iconName: "map-marker",
        color: "#dddddd",
        transform: { size: 6, x: 0, y: -2 }
    },
    markerIcons: [],
    color: "#dddddd",
    lat: 39.983334,
    long: -82.98333,
    notePreview: false,
    layerMarkers: true,
    previousVersion: null,
    warnedAboutMapMarker: false,
    copyOnClick: false
};
