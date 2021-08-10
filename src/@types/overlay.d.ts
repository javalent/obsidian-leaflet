import { Length } from "convert/dist/types/units";
import { TooltipDisplay } from ".";

export interface LeafletOverlay {
    leafletInstance: L.Circle;
    layer: string;
    data: SavedOverlayData;
    mutable: boolean;
    id: string;
    marker?: string;
    tooltip?: TooltipDisplay;
}
export interface SavedOverlayData {
    radius: number;
    loc: [number, number];
    color: string;
    layer: string;
    unit: Length;
    desc: string;
    id?: string;
    mutable: boolean;
    tooltip?: TooltipDisplay;
    marker?: string;
}
