/** Settings Interfaces */
import { ShapeProperties } from "src/draw/shape";
import { BlockParameters, SavedMarkerProperties, SavedOverlayData } from ".";

export type TooltipDisplay = "always" | "hover" | "never";

export interface Icon {
    type: string;
    iconName?: string;
    isImage?: boolean;
    imageUrl?: string;
    color?: string;
    alpha?: number;
    layer?: boolean;
    transform?: { size: number; x: number; y: number };
    tags?: string[];
    minZoom?: number;
    maxZoom?: number;
}

export interface MapMarkerData {
    path?: string;
    files: string[];
    lastAccessed: number;
    id: string;
    locked: boolean;
    markers: SavedMarkerProperties[];
    overlays: SavedOverlayData[];
    shapes: ShapeProperties[];
}

export interface ObsidianAppData {
    mapMarkers: MapMarkerData[];
    markerIcons: Icon[];
    defaultMarker: Icon;
    color: string;
    lat: number;
    long: number;
    notePreview: boolean;
    imageLayerDefaultOn: boolean;
    layerMarkers: boolean;
    previousVersion: string;
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    warnedAboutMapMarker: boolean;
    copyOnClick: boolean;
    displayOverlayTooltips: boolean;
    displayMarkerTooltips: TooltipDisplay;
    configDirectory: string;
    mapViewParameters: BlockParameters;
    mapViewEnabled: boolean;
    enableDraw: boolean;
    defaultUnitType: "metric" | "imperial";
    defaultTile: string;
    defaultTileSubdomains: string;
    defaultTileDark: string;
    defaultAttribution: string;
}
