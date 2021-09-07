import {
    MarkdownRenderChild,
    TFile,
    MarkdownPostProcessorContext,
    Notice,
    CachedMetadata
} from "obsidian";

import type {
    BlockParameters,
    LeafletMapOptions,
    ObsidianLeaflet,
    SavedMarkerProperties,
    SavedOverlayData
} from "./@types";
import type { BaseMapType, ImageLayerData, MarkerDivIcon } from "./@types/map";

import Watcher from "./utils/watcher";
import { RealMap, ImageMap } from "./map/map";
import Loader from "./worker/loader";

import { Length } from "convert/dist/types/units";
import {
    getImmutableItems,
    getId,
    OVERLAY_TAG_REGEX,
    DEFAULT_BLOCK_PARAMETERS,
    parseLink,
    getHeight,
    getHex
} from "./utils";
import convert from "convert";
import t from "./l10n/locale";

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
    options: LeafletMapOptions;
    constructor(
        public plugin: ObsidianLeaflet,
        private sourcePath: string,
        containerEl: HTMLElement,
        public params: BlockParameters
    ) {
        super(containerEl);

        this.params = {
            ...DEFAULT_BLOCK_PARAMETERS,
            ...params
        };

        this.parentEl = containerEl;

        let hasAdditional = false;
        if (this.params.image != "real") {
            hasAdditional = this.params.layers.length > 1;
        } else {
            hasAdditional =
                [
                    this.params.osmLayer,
                    ...[this.params.tileServer].flat()
                ].filter((v) => v).length > 1;
        }

        this.options = {
            bounds: this.params.bounds,
            context: this.sourcePath,
            darkMode: `${this.params.darkMode}` === "true",
            defaultZoom: +this.params.defaultZoom,
            distanceMultiplier: this.params.distanceMultiplier,
            drawColor: getHex(this.params.drawColor),
            geojsonColor: getHex(this.params.geojsonColor),
            gpxColor: getHex(this.params.gpxColor),
            hasAdditional,
            height: getHeight(this.containerEl, this.params.height),
            id: this.params.id,
            imageOverlays: [],
            isMapView: this.params.isMapView,
            layers: this.params.layers,
            maxZoom: +this.params.maxZoom,
            minZoom: +this.params.minZoom,
            osmLayer: this.params.osmLayer,
            overlayTag: this.params.overlayTag,
            overlayColor: this.params.overlayColor,
            scale: this.params.scale,
            tileLayer:
                this.params.tileServer instanceof Array
                    ? this.params.tileServer
                    : [this.params.tileServer],
            type: this.params.image != "real" ? "image" : "real",
            unit: this.params.unit,
            verbose: this.params.verbose,
            zoomDelta: +this.params.zoomDelta,
            zoomFeatures: this.params.zoomFeatures
        };

        this.containerEl.style.height = this.options.height;
        this.containerEl.style.width = "100%";
        this.containerEl.style.backgroundColor = "var(--background-secondary)";

        this.resize = new ResizeObserver(() => {
            if (this.map && this.map.rendered) {
                this.map.leafletInstance.invalidateSize();
            }
        });
        
        this.buildMap();

        this.resize.observe(this.containerEl);
    }

    async buildMap() {
        if (this.options.type === "real") {
            this.map = new RealMap(this, this.options);
        } else {
            this.map = new ImageMap(this, this.options);

            let additionalLayers = this.options.layers.length > 1;
            this.loader.on(
                `${this.map.id}-layer-data-ready`,
                (layer: ImageLayerData) => {
                    this.map.log(
                        `Data ready for layer ${decodeURIComponent(layer.id)}.`
                    );
                    if (this.map instanceof ImageMap) {
                        this.map.registerLayerToBuild(layer);
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

        this.map.on("removed", () => this.resize.disconnect());

        await this.loadImmutableData();
        await this.loadFeatureData();

        /** Get initial coordinates and zoom level */
        this.map.log("Getting initiatial coordinates.");
        const { coords, zoomDistance, file } = await this._getCoordinates(
            this.params.lat,
            this.params.long,
            this.params.coordinates,
            this.params.zoomTag,
            this.map
        );

        /** Register File Watcher to Update Markers/Overlays */
        this.registerWatchers(
            new Map([[file, new Map([["coordinates", "coordinates"]])]])
        );

        //TODO: Move image overlays to web worker
        //maybe? may need this immediately otherwise they could flicker on
        let imageOverlayData;
        if (this.params.imageOverlay.length) {
            imageOverlayData = await Promise.all(
                this.params.imageOverlay.map(async ([img, ...bounds]) => {
                    return {
                        ...(await this.loader.loadImageAsync(this.map.id, [
                            img
                        ])),
                        bounds
                    };
                })
            );
        }

        this.map.render({
            coords,
            zoomDistance,
            imageOverlayData
        });
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

        this.loader.unload();

        this.resize.disconnect();

        try {
            this.map.remove();
        } catch (e) {}

        let file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
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
                ({ file: f }) => f === this.sourcePath
            );
            mapFile.maps = mapFile.maps.filter((mapId) => mapId != this.map.id);
        }

        await this.plugin.saveSettings();

        this.plugin.maps = this.plugin.maps.filter((m) => {
            return m.map != this.map;
        });
    }

    async loadFeatureData() {
        /** Get Markers from Parameters */
        let geojson = this.params.geojson,
            geojsonData: any[] = [];
        if (!(geojson instanceof Array)) {
            geojson = [geojson];
        }
        if (geojson.length) {
            this.map.log("Loading GeoJSON files.");
            for (let link of geojson.flat(Infinity)) {
                const file = this.plugin.app.metadataCache.getFirstLinkpathDest(
                    parseLink(link),
                    this.sourcePath
                );
                if (file && file instanceof TFile) {
                    let data = await this.plugin.app.vault.read(file);
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        new Notice(
                            t("Could not parse GeoJSON file") +
                                ` ${link}` +
                                "\n\n" +
                                e.message
                        );
                        continue;
                    }
                    geojsonData.push(data);
                }
            }
        }
        let gpx = this.params.gpx,
            gpxData: string[] = [];
        let gpxIcons: {
            start: string;
            end: string;
            waypoint: string;
        } = {
            ...{ start: null, end: null, waypoint: null },
            ...this.params.gpxMarkers
        };
        if (!(gpx instanceof Array)) {
            gpx = [gpx];
        }
        if (gpx.length) {
            this.map.log("Loading GPX files.");
            for (let link of gpx.flat(Infinity)) {
                const file = this.plugin.app.metadataCache.getFirstLinkpathDest(
                    parseLink(link),
                    this.sourcePath
                );
                if (file && file instanceof TFile) {
                    let data = await this.plugin.app.vault.read(file);
                    gpxData.push(data);
                }
            }
        }

        this.map.loadFeatureData({ geojsonData, gpxData, gpxIcons });
    }
    async loadImmutableData() {
        if (
            (this.params.marker ?? []).length ||
            (this.params.commandMarker ?? []).length ||
            (this.params.markerTag ?? []).length ||
            (this.params.markerFile ?? []).length ||
            (this.params.markerFolder ?? []).length ||
            (this.params.linksTo ?? []).length ||
            (this.params.linksFrom ?? []).length ||
            (this.params.overlayTag ?? []).length
        ) {
            this.map.log("Loading immutable items.");
        }

        //TODO: LET RENDERER HANDLE THIS

        let {
            markers: immutableMarkers,
            overlays: immutableOverlays,
            files: watchers
        } = await getImmutableItems(
            /* source */
            this.plugin.app,
            this.params.marker as string[],
            this.params.commandMarker as string[],
            this.params.markerTag as string[][],
            this.params.markerFile as string[],
            this.params.markerFolder as string[],
            this.params.linksTo.flat(Infinity),
            this.params.linksFrom.flat(Infinity),
            this.params.overlayTag,
            this.params.overlayColor
        );

        if (
            (immutableMarkers ?? []).length ||
            (immutableOverlays ?? []).length
        ) {
            this.map.log(
                `Found ${immutableMarkers.length} markers and ${immutableOverlays.length} overlays from ${watchers.size} files.`
            );
        }
        /** Build arrays of markers and overlays to pass to map */
        let markerArray: SavedMarkerProperties[] = immutableMarkers.map(
            ([
                type,
                lat,
                long,
                link,
                layer,
                command,
                id,
                desc,
                minZoom,
                maxZoom
            ]) => {
                return {
                    type: type,
                    loc: [Number(lat), Number(long)],
                    percent: undefined,
                    link: link?.trim(),
                    id: id,
                    layer: layer,
                    mutable: false,
                    command: command,
                    description: desc,
                    minZoom,
                    maxZoom,
                    tooltip: "hover",
                    zoom: undefined
                };
            }
        );

        let immutableOverlayArray: SavedOverlayData[] = [
            ...immutableOverlays,
            ...(this.params.overlay ?? [])
        ].map(([color, loc, length, desc, id = getId()]) => {
            const match = `${length}`.match(OVERLAY_TAG_REGEX) ?? [];

            if (!match || isNaN(Number(match[1]))) {
                throw new Error(
                    t(
                        "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`."
                    )
                );
            }
            const [, radius, unit] = match ?? [];
            return {
                radius: Number(radius),
                loc: loc,
                color: color,
                unit: unit && unit.length ? (unit as Length) : undefined,
                layer: this.params.layers[0],
                desc: desc,
                id: id,
                mutable: false
            };
        });

        /** Register File Watcher to Update Markers/Overlays */
        this.registerWatchers(watchers);

        let mapData = this.plugin.data.mapMarkers.find(
            ({ id: mapId }) => mapId == this.params.id
        );

        this.map.addMarker(
            ...markerArray,
            ...(mapData?.markers.map((m) => {
                const layer =
                    decodeURIComponent(m.layer) === m.layer
                        ? encodeURIComponent(m.layer)
                        : m.layer;
                return { ...m, mutable: true, layer };
            }) ?? [])
        );

        this.map.addOverlay(
            ...immutableOverlayArray,
            ...new Set(mapData?.overlays ?? [])
        );
    }

    registerWatchers(watchers: Map<TFile, Map<string, string>>) {
        for (const [file, fileIds] of watchers) {
            const watcher = new Watcher(this, file, fileIds);
            this.watchers.add(watcher);
            watcher.on("remove", () => this.watchers.delete(watcher));
        }
    }
    //TODO: Move to renderer
    private async _getCoordinates(
        lat: string,
        long: string,
        coordinates: [string, string] | string,
        zoomTag: string,
        map: BaseMapType
    ): Promise<{
        coords: [number, number];
        zoomDistance: number;
        file: TFile;
    }> {
        let latitude = lat;
        let longitude = long;
        let coords: [number, number] = [undefined, undefined];
        let zoomDistance, file;
        if (typeof coordinates == "string" && coordinates.length) {
            file = this.plugin.app.metadataCache.getFirstLinkpathDest(
                parseLink(coordinates),
                this.sourcePath
            );
            if (file && file instanceof TFile) {
                //internal, try to read note yaml for coords
                ({ latitude, longitude, zoomDistance } =
                    this._getCoordsFromCache(
                        this.plugin.app.metadataCache.getFileCache(file),
                        zoomTag
                    ));

                map.log("Coordinates file found.");
            }
        } else if (coordinates && coordinates.length == 2) {
            latitude = coordinates[0];
            longitude = coordinates[1];

            map.log(`Using supplied coordinates [${latitude}, ${longitude}]`);
        }

        let err: boolean = false;
        try {
            coords = [
                Number(`${latitude}`?.split("%").shift()),
                Number(`${longitude}`?.split("%").shift())
            ];
        } catch (e) {
            err = true;
        }

        if (
            (latitude || longitude) &&
            (err || isNaN(coords[0]) || isNaN(coords[1]))
        ) {
            new Notice(
                t(
                    "There was an error with the provided latitude and longitude. Using defaults."
                )
            );
        }
        if (map.type != "real") {
            if (!latitude || isNaN(coords[0])) {
                coords[0] = 50;
            }
            if (!longitude || isNaN(coords[1])) {
                coords[1] = 50;
            }
        } else {
            if (!latitude || isNaN(coords[0])) {
                coords[0] = this.plugin.data.lat;
            }
            if (!longitude || isNaN(coords[1])) {
                coords[1] = this.plugin.data.long;
            }
        }

        return { coords, zoomDistance, file };
    }
    private _getCoordsFromCache(
        cache: CachedMetadata,
        zoomTag: string
    ): {
        latitude: string;
        longitude: string;
        zoomDistance: number;
    } {
        /* const cache = await this.app.metadataCache.getFileCache(file); */
        let latitude, longitude, zoomDistance;
        if (
            cache &&
            cache.frontmatter &&
            cache.frontmatter.location &&
            cache.frontmatter.location instanceof Array
        ) {
            let locations = cache.frontmatter.location;
            if (
                !(locations instanceof Array && locations[0] instanceof Array)
            ) {
                locations = [locations];
            }
            const location = locations[0];
            latitude = location[0];
            longitude = location[1];
        }

        if (
            zoomTag &&
            Object.prototype.hasOwnProperty.call(cache.frontmatter, zoomTag)
        ) {
            const overlay = cache.frontmatter[zoomTag];
            const [, distance, unit] = overlay?.match(OVERLAY_TAG_REGEX) ?? [];
            if (!distance) return;
            //try to scale default zoom

            zoomDistance = convert(distance)
                .from((unit as Length) ?? "m")
                .to(this.map.type == "image" ? this.map.unit : "m");
            if (this.map.type == "image") {
                zoomDistance = zoomDistance / this.map.scale;
            }
        }
        return { latitude, longitude, zoomDistance };
    }
}
