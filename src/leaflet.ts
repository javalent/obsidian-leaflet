import convert from "convert";
import type gpx from "leaflet-gpx";

import {
    Events,
    Notice,
    moment,
    Menu,
    Point,
    MarkdownRenderChild,
    TFile,
    Scope,
    MarkdownPostProcessorContext
} from "obsidian";

import type { Length } from "convert/dist/types/units";

import type {
    LayerGroup,
    LeafletMapOptions,
    SavedMarkerProperties,
    MarkerIcon,
    ObsidianLeaflet,
    Marker as MarkerDefinition,
    SavedOverlayData
} from "./@types";
import {
    DISTANCE_DECIMALS,
    LAT_LONG_DECIMALS,
    DEFAULT_MAP_OPTIONS,
    MODIFIER_KEY
} from "./utils/constants";

import { icon } from "./utils/icons";

import {
    getId,
    getImageDimensions,
    getHex,
    log,
    catchErrorAsync,
    catchError
} from "./utils/utils";

import {
    DistanceDisplay,
    distanceDisplay,
    editMarkers,
    filterMarkerControl,
    resetZoomControl,
    zoomControl
} from "./controls/controls";

import { OverlayContextModal } from "./modals/context";
import { LeafletSymbol } from "./utils/leaflet-import";
import { BaseMapType, MarkerDivIcon, Popup } from "./@types/map";
import { popup } from "./map/popup";
import { Marker, GeoJSON, GPX, Overlay } from "./layer";
import Watcher from "./utils/watcher";
import { RealMap, ImageMap } from "./map/map";

let L = window[LeafletSymbol];

declare module "leaflet" {
    interface Map {
        isFullscreen(): boolean;
    }
    interface MarkerOptions {
        startIcon?: MarkerDivIcon;
        endIcon?: MarkerDivIcon;
        wptIcons?: { [key: string]: MarkerDivIcon };
        startIconUrl?: null;
        endIconUrl?: null;
        shadowUrl?: null;
        wptIconUrls?: {
            "": null;
        };
    }
}

export class LeafletRenderer extends MarkdownRenderChild {
    watchers: Set<Watcher> = new Set();
    resize: ResizeObserver;
    registerWatchers(watchers: Map<TFile, Map<string, string>>) {
        for (const [file, fileIds] of watchers) {
            const watcher = new Watcher(this.plugin, file, this.map, fileIds);
            this.watchers.add(watcher);
            watcher.on("remove", () => this.watchers.delete(watcher));
        }
    }
    map: BaseMapType;
    verbose: boolean;
    parentEl: HTMLElement;
    constructor(
        private plugin: ObsidianLeaflet,
        private ctx: MarkdownPostProcessorContext,
        container: HTMLElement,
        options: LeafletMapOptions = {}
    ) {
        super(container);
        /* this.map = new LeafletMap(plugin, {
            ...options,
            context: ctx.sourcePath
        }); */

        this.containerEl.style.height = options.height;
        this.containerEl.style.width = "100%";
        this.containerEl.style.backgroundColor = "var(--background-secondary)";

        if (options.type === "real") {
            this.map = new RealMap(this.plugin, {
                ...options,
                context: ctx.sourcePath
            });
        } else {
            this.map = new ImageMap(this.plugin, {
                ...options,
                context: ctx.sourcePath
            });
        }

        this.verbose = options.verbose;

        this.parentEl = ctx.containerEl;
        this.resize = new ResizeObserver(() => {
            if (this.map.rendered) {
                this.map.leafletInstance.invalidateSize();
            }
        });
        this.resize.observe(this.containerEl);
    }

    async onload() {
        log(
            this.verbose,
            this.map.id,
            "MarkdownRenderChild loaded. Appending map."
        );
        this.containerEl.appendChild(this.map.contentEl);

        if (!this.parentEl.contains(this.containerEl)) {
            log(
                this.verbose,
                this.map.id,
                "Map element is off the page and not loaded into DOM. Will auto-detect and reset zoom."
            );
            const observer = new MutationObserver((mutationsList, observer) => {
                // Use traditional 'for loops' for IE 11
                for (const mutation of mutationsList) {
                    if (
                        mutation.type === "childList" &&
                        Array.from(this.parentEl.children).includes(
                            this.containerEl.parentElement
                        )
                    ) {
                        this.map.resetZoom();
                        observer.disconnect();
                    }
                }
            });
            observer.observe(this.parentEl, {
                attributes: false,
                childList: true,
                subtree: false
            });
        }
    }

    async onunload() {
        super.onunload();
        this.resize.disconnect();
        try {
            this.map.remove();
        } catch (e) {}

        let file = this.plugin.app.vault.getAbstractFileByPath(
            this.ctx.sourcePath
        );
        if (!file || !(file instanceof TFile)) {
            return;
        }
        let fileContent = await this.plugin.app.vault.read(file);

        let containsThisMap: boolean = false,
            r = new RegExp(
                `\`\`\`leaflet[\\s\\S]*?\\bid:(\\s?${this.map.id})\\b\\s*\\n[\\s\\S]*?\`\`\``,
                "g"
            );
        containsThisMap = fileContent.match(r)?.length > 0 || false;

        if (!containsThisMap) {
            //Block was deleted or id was changed

            let mapFile = this.plugin.mapFiles.find(
                ({ file: f }) => f === this.ctx.sourcePath
            );
            mapFile.maps = mapFile.maps.filter((mapId) => mapId != this.map.id);
        }

        await this.plugin.saveSettings();

        this.plugin.maps = this.plugin.maps.filter((m) => {
            return m.map != this.map;
        });
    }
}
