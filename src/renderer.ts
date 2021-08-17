import {
    MarkdownRenderChild,
    TFile,
    MarkdownPostProcessorContext
} from "obsidian";

import type { LeafletMapOptions, ObsidianLeaflet } from "./@types";
import type { BaseMapType, ImageLayerData, MarkerDivIcon } from "./@types/map";

import Watcher from "./utils/watcher";
import { RealMap, ImageMap } from "./map/map";
import Loader from "./worker/loader";

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
    loader: Loader = new Loader(this.plugin.app);
    resize: ResizeObserver;

    map: BaseMapType;
    verbose: boolean;
    parentEl: HTMLElement;
    constructor(
        public plugin: ObsidianLeaflet,
        private ctx: MarkdownPostProcessorContext,
        container: HTMLElement,
        private options: LeafletMapOptions = {}
    ) {
        super(container);

        this.containerEl.style.height = options.height;
        this.containerEl.style.width = "100%";
        this.containerEl.style.backgroundColor = "var(--background-secondary)";

        this.buildMap();

        this.parentEl = ctx.containerEl;
        this.resize = new ResizeObserver(() => {
            if (this.map && this.map.rendered) {
                this.map.leafletInstance.invalidateSize();
            }
        });

        this.resize.observe(this.containerEl);
        
        this.map.on("removed", () => this.resize.disconnect());
    }

    async buildMap() {
        if (this.options.type === "real") {
            this.map = new RealMap(this.plugin, this.options);
        } else {
            this.map = new ImageMap(this.plugin, this.options);

            let additionalLayers = this.options.layers.length > 1;
            this.loader.on(
                `${this.map.id}-layer-data-ready`,
                (layer: ImageLayerData) => {
                    this.map.log(
                        `Data ready for layer ${decodeURIComponent(layer.id)}.`
                    );
                    if (this.map instanceof ImageMap) {
                        this.map.buildLayer(layer);
                    }
                    if (additionalLayers) {
                        additionalLayers = false;
                        this.loader.loadImage(
                            this.map.id,
                            this.options.layers.slice(1)
                        );
                    }
                }
            );

            this.map.log(`Loading layer data for ${this.map.id}.`);
            this.loader.loadImage(this.map.id, [this.options.layers[0]]);
        }

        await this.loadImmutableData();
        await this.loadFeatureData();
    }

    async onload() {
        this.map.log("MarkdownRenderChild loaded. Appending map.");
        this.containerEl.appendChild(this.map.contentEl);

        if (!this.parentEl.contains(this.containerEl)) {
            this.map.log(
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
        this.map.log("Unloading map.");
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
            this.map.log("Map instance was removed from note.");
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

    async loadFeatureData() {}
    async loadImmutableData() {}

    registerWatchers(watchers: Map<TFile, Map<string, string>>) {
        for (const [file, fileIds] of watchers) {
            const watcher = new Watcher(this, file, fileIds);
            this.watchers.add(watcher);
            watcher.on("remove", () => this.watchers.delete(watcher));
        }
    }
}
