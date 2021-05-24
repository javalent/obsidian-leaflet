import {
    MarkdownPostProcessorContext,
    MarkdownView,
    Plugin,
    Scope
} from "obsidian";
import { IMapInterface, IMarker, IMarkerIcon, IObsidianAppData } from ".";
import { LeafletMap, Marker } from "./map";

declare class ObsidianLeaflet extends Plugin {
    AppData: IObsidianAppData;
    markerIcons: IMarkerIcon[];
    maps: IMapInterface[];
    mapFiles: { file: string; maps: string[] }[];
    /* escapeScope: Scope; */
    onload(): Promise<void>;
    onunload(): Promise<void>;
    postprocessor(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void>;

    /* getImmutableMarkers(
        markers: string[],
        commandMarkers: string[],
        markerTags: string[][],
        markerFiles: string[],
        markerFolders: string[]
    ): Promise<[string, number, number, string, string, boolean][]>; */

    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;

    generateMarkerMarkup(markers: IMarker[]): IMarkerIcon[];

    registerMapEvents(map: LeafletMap): void;

    handleMarkerContext(map: LeafletMap, marker: Marker): void;
}
