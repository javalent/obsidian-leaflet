/// <reference path='./index.d.ts' />

import {
    MarkdownPostProcessorContext,
    MarkdownView,
    Plugin,
    Scope
} from "obsidian";
import { IMapInterface, IMarker, IMarkerIcon, IObsidianAppData } from ".";
import LeafletMap from "../leaflet";
import { Marker } from "../utils/leaflet";

export declare class ObsidianLeaflet extends Plugin {
    AppData: IObsidianAppData;
    markerIcons: IMarkerIcon[];
    maps: IMapInterface[];
    mapFiles: { file: string; maps: string[] }[];
    escapeScope: Scope;
    onload(): Promise<void>;
    onunload(): Promise<void>;
    postprocessor(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void>;

    getMarkersFromSource(
        source: string
    ): Promise<[string, number, number, string, string, boolean][]>;

    getHeight(height: string): string;

    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;

    generateMarkerMarkup(markers: IMarker[]): IMarkerIcon[];

    registerMapEvents(map: LeafletMap, view: MarkdownView): void;

    handleMarkerContext(
        map: LeafletMap,
        view: MarkdownView,
        marker: Marker
    ): void;
}
