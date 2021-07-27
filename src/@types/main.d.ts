import { MarkdownPostProcessorContext, Plugin } from "obsidian";
import { IMapInterface, IMarker, IMarkerIcon, IObsidianAppData } from ".";
import { LeafletMap, Marker } from "./map";

declare class ObsidianLeaflet extends Plugin {
    AppData: IObsidianAppData;
    markerIcons: IMarkerIcon[];
    maps: IMapInterface[];
    mapFiles: { file: string; maps: string[] }[];
    modifierKey: "Meta" | "Control";
    /* escapeScope: Scope; */
    onload(): Promise<void>;
    onunload(): Promise<void>;
    postprocessor(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void>;

    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;

    generateMarkerMarkup(markers: IMarker[]): IMarkerIcon[];

    registerMapEvents(map: LeafletMap): void;
}
