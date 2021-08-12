import { BaseMapType, ObsidianLeaflet, SavedOverlayData } from "src/@types";
import {
    App,
    CachedMetadata,
    Events,
    FrontMatterCache,
    Notice,
    TAbstractFile,
    TFile
} from "obsidian";
import { LeafletSymbol } from "src/utils/leaflet-import";
import type * as Leaflet from "leaflet";
import { Length } from "convert/dist/types/units";
import { OVERLAY_TAG_REGEX } from ".";

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
        const marker = this.map.getMarkerById(this.fileIds.get("marker"));

        if (
            marker &&
            this.frontmatter.location &&
            this.frontmatter.location instanceof Array
        ) {
            try {
                const { location } = this.frontmatter;
                if (
                    location.length == 2 &&
                    location.every((v) => typeof v == "number")
                ) {
                    if (
                        !marker.loc.equals(
                            L.latLng(<Leaflet.LatLngTuple>location)
                        )
                    ) {
                        marker.setLatLng(
                            L.latLng(<Leaflet.LatLngTuple>location)
                        );
                    }
                }
            } catch (e) {
                new Notice(
                    `There was an error updating the marker for ${file.name}.`
                );
            }
        }

        if (marker && this.frontmatter.mapmarker) {
            try {
                const { mapmarker } = this.frontmatter;

                if (
                    this.plugin.markerIcons.find(
                        ({ type }) => type == mapmarker
                    )
                ) {
                    marker.icon = this.plugin.markerIcons.find(
                        ({ type }) => type == mapmarker
                    );
                }
            } catch (e) {
                new Notice(
                    `There was an error updating the marker type for ${file.name}.`
                );
            }
        }
        if (this.frontmatter.mapmarkers) {
            try {
                const marker = this.map.getMarkerById(
                    this.fileIds.get("mapmarkers")
                );
                const { mapmarkers } = this.frontmatter;

                this.map.removeMarker(marker);

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

        if (marker)
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
    private _onRename(file: TAbstractFile) {
        if (file !== this.file) return;
        const marker = this.map.getMarkerById(this.fileIds.get("marker"));

        marker.link = this.plugin.app.metadataCache.fileToLinktext(
            this.file,
            "",
            true
        );
    }
    private _onDelete(file: TAbstractFile) {
        if (file !== this.file) return;
        this.file = null;
        const marker = this.map.getMarkerById(this.fileIds.get("marker"));

        this.map.removeMarker(marker);

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
