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
const L = window[LeafletSymbol];
export default class Watcher extends Events {
    frontmatter: FrontMatterCache;
    constructor(
        private plugin: ObsidianLeaflet,
        public file: TFile,
        public map: BaseMapType,
        private fileIds: Map<string, string>
    ) {
        super();

        console.log(fileIds)

        this.plugin.app.metadataCache.on("changed", (file) =>
            this._onChange(file)
        );
        this.plugin.app.vault.on("rename", (file) => this._onRename(file));
        this.plugin.app.vault.on("delete", (file) => this._onDelete(file));
    }

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
                    `There was an error updating the marker for ${file.name}.`
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
                    `There was an error updating the marker type for ${file.name}.`
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
                    `There was an error updating the markers for ${file.name}.`
                );
            }
        }

        if (markers) {
            try {
                this.map.overlays
                    .filter(
                        ({ data }) => data.id === this.fileIds.get("overlay")
                    )
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
                            layer: null /* layers[0] */,
                            desc: desc,
                            id: id,
                            mutable: false
                        };
                    }
                );
                this.map.addOverlay(...overlayArray);
            } catch (e) {
                new Notice(
                    `There was an error updating the overlays for ${file.name}.`
                );
            }
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
