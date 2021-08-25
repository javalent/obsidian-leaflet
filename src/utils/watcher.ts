import type {
    BaseMapType,
    ObsidianLeaflet,
    SavedOverlayData
} from "src/@types";
import {
    Events,
    FrontMatterCache,
    Notice,
    TAbstractFile,
    TFile
} from "obsidian";

import { Length } from "convert/dist/types/units";
import { OVERLAY_TAG_REGEX } from ".";

import { LeafletSymbol } from "src/utils/leaflet-import";
import { marker } from "leaflet";
import { LeafletRenderer } from "src/renderer";
import t from "src/l10n/locale";
const L = window[LeafletSymbol];
export default class Watcher extends Events {
    frontmatter: FrontMatterCache;
    get plugin() {
        return this.renderer.plugin;
    }
    get map() {
        return this.renderer.map;
    }
    constructor(
        private renderer: LeafletRenderer,
        public file: TFile,
        private fileIds: Map<string, string>
    ) {
        super();

        this.renderer.registerEvent(
            this.plugin.app.metadataCache.on("changed", (file) =>
                this._onChange(file)
            )
        );
        this.renderer.registerEvent(
            this.plugin.app.vault.on("rename", (file) => this._onRename(file))
        );
        this.renderer.registerEvent(
            this.plugin.app.vault.on("delete", (file) => this._onDelete(file))
        );
    }

    //TODO REFACTOR AND IMPROVE LOGIC
    //VERY MESSY
    private _onChange(file: TFile) {
        if (file !== this.file) return;

        const cache = this.plugin.app.metadataCache.getFileCache(file);
        if (!("frontmatter" in cache)) return;
        this.frontmatter = cache.frontmatter;
        let overlays = [];
        const markers = this.map.getMarkersById(this.fileIds.get("marker"));

        if (
            markers &&
            this.frontmatter.location &&
            this.frontmatter.location instanceof Array
        ) {
            try {
                let locations = this.frontmatter.location;
                if (
                    locations &&
                    locations instanceof Array &&
                    !(locations[0] instanceof Array)
                ) {
                    locations = [locations];
                }

                for (let index in locations) {
                    const location = locations[index];
                    const marker = markers[index];

                    if (
                        location.length == 2 &&
                        location.every((v: any) => typeof v == "number")
                    ) {
                        if (
                            !marker.loc.equals(
                                L.latLng(<L.LatLngTuple>location)
                            )
                        ) {
                            marker.setLatLng(L.latLng(<L.LatLngTuple>location));
                        }
                    }
                }
            } catch (e) {
                new Notice(
                    t(
                        `There was an error updating the marker for %1.`,
                        file.name
                    )
                );
            }
        }

        if (markers && this.frontmatter.mapmarker) {
            try {
                const { mapmarker } = this.frontmatter;

                if (
                    this.plugin.markerIcons.find(
                        ({ type }) => type == mapmarker
                    )
                ) {
                    for (const marker of markers) {
                        marker.icon = this.plugin.markerIcons.find(
                            ({ type }) => type == mapmarker
                        );
                    }
                }
            } catch (e) {
                new Notice(
                    t(
                        `There was an error updating the marker type for %1.`,
                        file.name
                    )
                );
            }
        }
        if (this.frontmatter.mapmarkers) {
            try {
                const markers = this.map.getMarkersById(
                    this.fileIds.get("mapmarkers")
                );
                const { mapmarkers } = this.frontmatter;
                for (const marker of markers) {
                    this.map.removeMarker(marker);
                }
                mapmarkers.forEach(
                    ([type, location, description]: [
                        type: string,
                        location: [number, number],
                        description: string
                    ]) => {
                        this.map.addMarker({
                            type: type,
                            loc: location,
                            percent: null,
                            id: this.fileIds.get("mapmarkers"),
                            link: this.plugin.app.metadataCache.fileToLinktext(
                                file,
                                "",
                                true
                            ),
                            layer: this.map.currentGroup.id,
                            command: false,
                            mutable: false,
                            description: description,
                            minZoom: null,
                            maxZoom: null,
                            tooltip: "hover"
                        });
                    }
                );
            } catch (e) {
                new Notice(
                    t(
                        `There was an error updating the markers for %1.`,
                        
                    )
                );
            }
        }

        if (this.fileIds.has("overlay")) {
            this.map.overlays
                .filter(({ data }) => data.id === this.fileIds.get("overlay"))
                ?.forEach((overlay) => {
                    overlay.leafletInstance.remove();
                });
            this.map.overlays = this.map.overlays.filter(
                ({ data }) => data.id != this.fileIds.get("overlay")
            );

            if (
                this.frontmatter.mapoverlay &&
                this.frontmatter.mapoverlay instanceof Array
            ) {
                overlays.push(...this.frontmatter.mapoverlay);
            }
        }
        if (this.fileIds.has("overlayTag")) {
            if (this.map.options.overlayTag in this.frontmatter) {
                this.map.overlays = this.map.overlays.filter(
                    ({ id, leafletInstance }) => {
                        if (id === this.fileIds.get("overlayTag")) {
                            leafletInstance.remove();
                        }
                        return id != this.fileIds.get("overlayTag");
                    }
                );
                let locations = this.frontmatter.location ?? [0, 0];
                if (
                    locations &&
                    locations instanceof Array &&
                    !(locations[0] instanceof Array)
                ) {
                    locations = [locations];
                }
                overlays.push([
                    this.map.options.overlayColor ?? "blue",
                    locations[0],
                    this.frontmatter[this.map.options.overlayTag],
                    `${file.basename}: ${this.map.options.overlayTag}`,
                    this.fileIds.get("overlayTag")
                ]);
            }
        }
        if (overlays.length) {
            const overlayArray: SavedOverlayData[] = [...overlays].map(
                ([
                    color,
                    loc,
                    length,
                    desc,
                    id = this.fileIds.get("overlay")
                ]) => {
                    const match = length.match(OVERLAY_TAG_REGEX);
                    if (!match || isNaN(Number(match[1]))) {
                        throw new Error(
                            "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`."
                        );
                    }
                    const [, radius, unit = "m"] = match;

                    return {
                        radius: Number(radius),
                        loc: loc,
                        color: color,
                        unit: unit as Length,
                        layer: this.map.currentGroup.id,
                        desc: desc,
                        id: id,
                        mutable: false
                    };
                }
            );
            this.map.addOverlay(...overlayArray);
        }
    }
    private _onRename(file: TAbstractFile) {
        if (file !== this.file) return;
        const markers = this.map.getMarkersById(this.fileIds.get("marker"));

        for (const marker of markers) {
            marker.link = this.plugin.app.metadataCache.fileToLinktext(
                this.file,
                "",
                true
            );
        }
    }
    private _onDelete(file: TAbstractFile) {
        if (file !== this.file) return;
        this.file = null;
        const markers = this.map.getMarkersById(this.fileIds.get("marker"));

        for (const marker of markers) {
            this.map.removeMarker(marker);
        }

        this.map.overlays
            .filter(({ data }) => data.id === this.fileIds.get("overlay"))
            ?.forEach((overlay) => {
                overlay.leafletInstance.remove();
            });
        this.map.overlays = this.map.overlays.filter(
            ({ data }) => data.id != this.fileIds.get("overlay")
        );
        this.trigger("remove");
    }
}
