import { MarkdownPostProcessorContext, Platform, Plugin } from "obsidian";
import { IMapInterface, IMarker, IMarkerIcon, IObsidianAppData } from ".";
import { LeafletMap } from "./map";

declare class ObsidianLeaflet extends Plugin {
    AppData: IObsidianAppData;
    markerIcons: IMarkerIcon[];
    maps: IMapInterface[];
    mapFiles: { file: string; maps: string[] }[];
    modifierKey: "Meta" | "Control";
    Platform: typeof Platform;
    isDesktop: boolean;
    isMobile: boolean;
    isMacOS: boolean;
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
