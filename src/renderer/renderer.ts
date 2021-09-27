import {
    MarkdownRenderChild,
    TFile,
    Notice,
    CachedMetadata,
    TFolder,
    Vault,
    getAllTags,
    MarkdownView
} from "obsidian";

import { parse as parseCSV } from "papaparse";

import type {
    BlockParameters,
    LeafletMapOptions,
    ObsidianLeaflet,
    SavedMarkerProperties,
    SavedOverlayData
} from "../@types";
import type { BaseMapType, ImageLayerData } from "../@types/map";

import Watcher from "../utils/watcher";
import { RealMap, ImageMap } from "../map/map";
import Loader from "../worker/loader";

import { Length } from "convert/dist/types/units";
import {
    getId,
    OVERLAY_TAG_REGEX,
    DEFAULT_BLOCK_PARAMETERS,
    parseLink,
    getHeight,
    getHex,
    VIEW_TYPE
} from "../utils";
import convert from "convert";
import t from "../l10n/locale";
import { LeafletMapView } from "src/map/view";
import { Marker, Overlay } from "src/layer";

declare module "leaflet" {
    interface Map {
        isFullscreen(): boolean;
    }
}
type ImmutableMarker = [
    type: string,
    lat: number,
    long: number,
    link: string,
    layer: string,
    command: boolean,
    id: string,
    desc: string,
    minZoom: number,
    maxZoom: number,
    tag?: string
];
type ImmutableOverlay = [
    color: string,
    loc: [number, number],
    length: string,
    desc: string,
    id: string
];
export class LeafletRenderer extends MarkdownRenderChild {
    watchers: Set<Watcher> = new Set();
    loader: Loader = new Loader(this.plugin.app);
    resize: ResizeObserver;
    map: BaseMapType;
    verbose: boolean;
    parentEl: HTMLElement;
    options: LeafletMapOptions;
    file: TFile;
    view: MarkdownView | LeafletMapView;
    constructor(
        public plugin: ObsidianLeaflet,
        private sourcePath: string,
        containerEl: HTMLElement,
        public params: BlockParameters,
        public source: string
    ) {
        super(containerEl);

        this.view =
            this.app.workspace.getActiveViewOfType(MarkdownView) ??
            this.app.workspace.getActiveViewOfType(LeafletMapView);

        this.params = {
            ...DEFAULT_BLOCK_PARAMETERS,
            ...params
        };

        this.parentEl = containerEl;

        let hasAdditional = this.params.imageOverlay?.length > 0 ?? false;

        if (this.params.image != "real") {
            hasAdditional = hasAdditional || this.params.layers.length > 1;
        } else {
            hasAdditional =
                hasAdditional ||
                [
                    this.params.osmLayer,
                    ...[this.params.tileServer].flat()
                ].filter((v) => v).length > 1;
        }

        let file = this.app.vault.getAbstractFileByPath(this.sourcePath);
        if (file instanceof TFile) {
            this.file = file;
        }
        this.options = {
            bounds: this.params.bounds,
            context: this.sourcePath,
            darkMode: `${this.params.darkMode}` === "true",
            defaultZoom: +this.params.defaultZoom,
            distanceMultiplier: this.params.distanceMultiplier,
            draw: this.params.draw ?? this.plugin.data.enableDraw,
            drawColor: getHex(this.params.drawColor),
            geojsonColor: getHex(this.params.geojsonColor),
            gpxColor: getHex(this.params.gpxColor),
            hasAdditional,
            height: this.getHeight(this.params.height),
            id: this.params.id,
            imageOverlays: [],
            isInitiativeView: this.params.isInitiativeView,
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
            unit: this.params.unit ?? this.plugin.defaultUnit,
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
    modifiedSource = this.source;
    hasChangedSource: boolean = false;
    handled = false;
    async placeLayerInCodeBlock(layer: Marker | Overlay) {
        layer.mutable = false;
        const type =
            layer instanceof Marker
                ? layer.command
                    ? "commandMarker"
                    : "marker"
                : "overlay";

        this.modifiedSource = `${this.modifiedSource}${type}: ${layer
            .toCodeBlockProperties()
            .join(",")}\n`;
        if (!this.hasChangedSource) {
            const modeChange = async () => {
                if (!this.hasChangedSource) {
                    return;
                }
                const source = await this.app.vault.cachedRead(this.file);
                const modified = source.replace(
                    this.source,
                    this.modifiedSource
                );

                await this.app.vault.modify(this.file, modified);

                this.source = this.modifiedSource;
                this.hasChangedSource = false;
            };
            this.register(async () => await modeChange());
            const onLayoutChange = this.app.workspace.on(
                "layout-change",
                async () => {
                    const view =
                        this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view && view == this.view) {
                        await modeChange();
                        this.app.workspace.offref(onLayoutChange);
                    }
                }
            );
            this.registerEvent(onLayoutChange);
        }
        this.hasChangedSource = true;
    }

    setHeight(height: string) {
        this.containerEl.style.height = height;
        if (!this.map) return;
        this.map.contentEl.style.height = height;
        this.map.leafletInstance.invalidateSize();
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
        this.map.on(
            "should-save",
            async () => await this.plugin.saveSettings()
        );

        this.map.on(
            "create-immutable-layer",
            async (layer: Marker | Overlay) => {
                await this.placeLayerInCodeBlock(layer);
            }
        );

        this.loadSavedData();
        await this.loadImmutableData();
        await this.loadFeatureData();

        /** Get initial coordinates and zoom level */
        this.map.log("Getting initiatial coordinates.");
        const { coords, zoomDistance, file } = await this.getCoordinates(
            this.params.lat,
            this.params.long,
            this.params.coordinates,
            this.params.zoomTag,
            this.map
        );

        /** Register File Watcher to Update Markers/Overlays */
        this.registerWatcher(file, new Map([["coordinates", "coordinates"]]));
        let imageOverlayData;
        if (this.params.imageOverlay?.length) {
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

        this.loader?.unload();

        this.resize?.disconnect();

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
    getHeight(height: string): string {
        try {
            if (!/\d+(px|%)/.test(height))
                throw new Error(t("Unparseable height provided."));
            if (/\d+%/.test(height)) {
                const view =
                    this.app.workspace.getActiveViewOfType(MarkdownView) ??
                    this.app.workspace.getActiveViewOfType(LeafletMapView);

                const element = view.contentEl;

                let [, perc] = height.match(/(\d+)%/);

                let computedStyle = getComputedStyle(element);

                let clHeight = element.clientHeight; // height with padding

                clHeight -=
                    parseFloat(computedStyle.paddingTop) +
                    parseFloat(computedStyle.paddingBottom);

                height = `${(clHeight * Number(perc)) / 100}px`;
            }
        } catch (e) {
            new Notice(
                t("There was a problem with the provided height. Using 500px.")
            );
            height = "500px";
        } finally {
            return height;
        }
    }
    async loadFeatureData() {
        /** Get Markers from Parameters */
        let geojson = this.params.geojson,
            geojsonData: any[] = [];
        if (!(geojson instanceof Array)) {
            geojson = [geojson];
        }
        const geoSet = new Set(geojson?.flat(Infinity).filter((g) => g));

        if (this.params.geojsonFolder && this.params.geojsonFolder.length) {
            for (let path of this.params.geojsonFolder) {
                let abstractFile =
                    this.plugin.app.vault.getAbstractFileByPath(path);
                if (!abstractFile) continue;
                if (
                    abstractFile instanceof TFile &&
                    ["json", "geojson"].includes(abstractFile.extension)
                )
                    geoSet.add(path);
                if (abstractFile instanceof TFolder) {
                    Vault.recurseChildren(abstractFile, (file) => {
                        if (
                            file instanceof TFile &&
                            ["json", "geojson"].includes(file.extension)
                        )
                            geoSet.add(file.path);
                    });
                }
            }
        }

        if (geoSet.size) {
            this.map.log("Loading GeoJSON files.");
            for (let link of geoSet) {
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

        let gpxSet = new Set(gpx?.flat(Infinity).filter((g) => g));
        if (this.params.gpxFolder && this.params.gpxFolder.length) {
            for (let path of this.params.gpxFolder) {
                let abstractFile =
                    this.plugin.app.vault.getAbstractFileByPath(path);
                if (!abstractFile) continue;
                if (
                    abstractFile instanceof TFile &&
                    abstractFile.extension === "gpx"
                )
                    gpxSet.add(path);
                if (abstractFile instanceof TFolder) {
                    Vault.recurseChildren(abstractFile, (file) => {
                        if (file instanceof TFile && file.extension === "gpx")
                            gpxSet.add(file.path);
                    });
                }
            }
        }
        if (gpxSet.size) {
            this.map.log("Loading GPX files.");
            for (let link of gpxSet) {
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

    loadSavedData() {
        let mapData = this.plugin.data.mapMarkers.find(
            ({ id: mapId }) => mapId == this.params.id
        );

        if (!mapData) return;

        this.map.addMarker(
            ...(mapData.markers?.map((m) => {
                const layer =
                    decodeURIComponent(m.layer) === m.layer
                        ? encodeURIComponent(m.layer)
                        : m.layer;
                return { ...m, mutable: true, layer };
            }) ?? [])
        );

        this.map.addOverlay(...new Set(mapData?.overlays ?? []));

        this.map.addShapes(...mapData.shapes);
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

        let { markers: immutableMarkers, overlays: immutableOverlays } =
            await this.getImmutableItems();

        if (
            (immutableMarkers ?? []).length ||
            (immutableOverlays ?? []).length
        ) {
            this.map.log(
                `Found ${immutableMarkers.length} markers and ${immutableOverlays.length} overlays.`
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

        let immutableOverlayArray: SavedOverlayData[] = [...immutableOverlays]
            .filter((f) => f && f.length)
            .map(([color, loc, length, desc, id = getId()]) => {
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

        this.map.addMarker(...markerArray);

        this.map.addOverlay(...immutableOverlayArray);
    }
    get app() {
        return this.plugin.app;
    }
    getImmutableMarkers() {
        let markers: ImmutableMarker[] = [];
        for (let marker of this.params.marker ?? []) {
            /* type, lat, long, link, layer, */
            const { data } = parseCSV<string>(marker);
            if (!data.length) {
                new Notice("No data");
                continue;
            }

            let [type, lat, long, link, layer, minZoom, maxZoom] = data[0];

            if (!type || !type.length || type === "undefined") {
                type = "default";
            }
            if (!lat || !lat.length || isNaN(Number(lat))) {
                new Notice(t("Could not parse latitude"));
                continue;
            }
            if (!long || !long.length || isNaN(Number(long))) {
                new Notice(t("Could not parse longitude"));
                continue;
            }
            let min, max;
            if (isNaN(Number(minZoom))) {
                min = undefined;
            } else {
                min = Number(minZoom);
            }
            if (isNaN(Number(maxZoom))) {
                max = undefined;
            } else {
                max = Number(maxZoom);
            }

            if (!link || !link.length || link === "undefined") {
                link = undefined;
            } else if (/\[\[[\s\S]+\]\]/.test(link)) {
                //obsidian wiki-link
                link = parseLink(link);
            }

            if (!layer || !layer.length || layer === "undefined") {
                layer = undefined;
            }
            markers.push([
                type,
                Number(lat),
                Number(long),
                link,
                layer,
                false,
                null,
                null,
                min,
                max
            ]);
        }
        for (let marker of this.params.commandMarker ?? []) {
            /* type, lat, long, link, layer, */
            const { data } = parseCSV<string>(marker);
            if (!data.length) {
                new Notice(t("No data for marker %1.", marker));
                continue;
            }

            let [type, lat, long, link, layer, minZoom, maxZoom] = data[0];

            if (!type || !type.length || type === "undefined") {
                type = "default";
            }
            if (!lat || !lat.length || isNaN(Number(lat))) {
                new Notice("Could not parse latitude");
                continue;
            }
            if (!long || !long.length || isNaN(Number(long))) {
                new Notice("Could not parse longitude");
                continue;
            }
            let min, max;
            if (isNaN(Number(minZoom))) {
                min = undefined;
            } else {
                min = Number(minZoom);
            }
            if (isNaN(Number(maxZoom))) {
                max = undefined;
            } else {
                max = Number(maxZoom);
            }

            if (!link || !link.length || link === "undefined") {
                link = undefined;
            } else if (/\[\[[\s\S]+\]\]/.test(link)) {
                //obsidian wiki-link
                link = parseLink(link);
            }

            //find command id
            const commands = this.app.commands.listCommands();
            const { id } = commands.find(
                ({ name: n, id }) => n == link || id == link
            );

            if (!layer || !layer.length || layer === "undefined") {
                layer = undefined;
            }
            markers.push([
                type,
                Number(lat),
                Number(long),
                id,
                layer,
                true,
                null,
                null,
                min,
                max
            ]);
        }
        return markers;
    }
    async getImmutableItems(): Promise<{
        markers: ImmutableMarker[];
        overlays: ImmutableOverlay[];
    }> {
        return new Promise(async (resolve, reject) => {
            let markers: ImmutableMarker[] = this.getImmutableMarkers(),
                overlaysToReturn: ImmutableOverlay[] = [];

            const {
                markerTag = [],
                filterTag = [],
                markerFile = [],
                markerFolder = [],
                linksTo = [],
                linksFrom = [],
                overlayTag,
                overlayColor
            } = this.params;

            if (
                markerFile.length ||
                markerFolder.length ||
                markerTag.length ||
                filterTag.length ||
                linksTo.length ||
                linksFrom.length
            ) {
                let files = new Set(markerFile);

                for (let path of markerFolder) {
                    let abstractFile =
                        this.app.vault.getAbstractFileByPath(path);
                    if (!abstractFile) continue;
                    if (abstractFile instanceof TFile) files.add(path);
                    if (abstractFile instanceof TFolder) {
                        Vault.recurseChildren(abstractFile, (file) => {
                            if (file instanceof TFile) files.add(file.path);
                        });
                    }
                }
                //get cache
                //error is thrown here because plugins isn't exposed on Obsidian App
                //@ts-expect-error
                const dvCache = app.plugins.plugins.dataview?.index;
                if (dvCache) {
                    if (markerTag.length > 0) {
                        const tagSet: Set<string> = new Set();
                        for (let tags of markerTag) {
                            const filtered: Set<string>[] = tags
                                .filter((tag) => tag)
                                .map((tag) => {
                                    if (!tag.includes("#")) {
                                        tag = `#${tag}`;
                                    }
                                    return dvCache.tags.getInverse(tag.trim());
                                });

                            if (!filtered.length) continue;
                            filtered
                                .reduce(
                                    (a, b) =>
                                        new Set(
                                            [...b].filter(
                                                Set.prototype.has,
                                                new Set(a)
                                            )
                                        )
                                )
                                .forEach(tagSet.add, tagSet);
                        }

                        tagSet.forEach(files.add, files);
                    }

                    if (filterTag.length > 0 && files.size) {
                        const tagSet: Set<string> = new Set();
                        for (let tags of filterTag) {
                            const filtered: Set<string>[] = tags
                                .filter((tag) => tag)
                                .map((tag) => {
                                    if (!tag.includes("#")) {
                                        tag = `#${tag}`;
                                    }
                                    return dvCache.tags.getInverse(tag.trim());
                                });

                            if (!filtered.length) continue;
                            filtered
                                .reduce(
                                    (a, b) =>
                                        new Set(
                                            [...b].filter(
                                                Set.prototype.has,
                                                new Set(a)
                                            )
                                        )
                                )
                                .forEach(tagSet.add, tagSet);
                        }
                        files = new Set([...files].filter(tagSet.has, tagSet));
                    }
                    for (let link of linksTo) {
                        //invMap -> linksTo
                        const file =
                            this.app.metadataCache.getFirstLinkpathDest(
                                parseLink(link),
                                ""
                            );
                        if (!file) continue;

                        const links = dvCache.links.invMap.get(file.path);

                        if (!links) continue;

                        links.forEach(files.add, files);
                    }
                    for (let link of linksFrom) {
                        //map -> linksFrom
                        const file =
                            this.app.metadataCache.getFirstLinkpathDest(
                                parseLink(link),
                                ""
                            );
                        if (!file) continue;

                        const links = dvCache.links.map.get(file.path);

                        if (!links) continue;

                        links.forEach(files.add, files);
                    }
                } else {
                    const errors: string[] = [];
                    if (markerTag.length) {
                        errors.push("markerTags");
                    }
                    if (linksTo.length) {
                        errors.push("linksTo");
                    }
                    if (linksFrom.length) {
                        errors.push("linksFrom");
                    }
                    if (errors.length)
                        new Notice(
                            t(
                                "The `%1` field%2 can only be used with the Dataview plugin installed.",
                                errors.reduce((res, k, i) =>
                                    [res, k].join(
                                        i ===
                                            errors.reduce((res, k, i) =>
                                                [res, k].join(
                                                    i === errors.length - 1
                                                        ? " and "
                                                        : ", "
                                                )
                                            ).length -
                                                1
                                            ? " and "
                                            : ", "
                                    )
                                ),
                                errors.length > 2 ? "s" : ""
                            )
                        );
                }

                for (let path of files) {
                    const file = this.app.metadataCache.getFirstLinkpathDest(
                        parseLink(path),
                        this.sourcePath
                    );
                    const linkText = this.app.metadataCache.fileToLinktext(
                        file,
                        this.sourcePath,
                        true
                    );

                    const idMap = new Map<string, string>();
                    if (
                        !file ||
                        !(file instanceof TFile) ||
                        file.extension !== "md"
                    )
                        continue;
                    const cache =
                        this.app.metadataCache.getFileCache(file) ?? {};
                    const { frontmatter } = cache;

                    const tags: Set<string> =
                        dvCache?.tags?.get(path) ?? new Set();

                    if (
                        !frontmatter ||
                        (!frontmatter.location &&
                            !frontmatter.mapoverlay &&
                            !frontmatter.mapmarkers)
                    )
                        continue;

                    const id = getId();

                    if (frontmatter.location) {
                        let locations = frontmatter.location;
                        if (
                            locations.length &&
                            !(locations[0] instanceof Array)
                        ) {
                            locations = [locations];
                        }
                        for (const location of locations) {
                            let err = false,
                                [lat, long] = location;

                            try {
                                lat =
                                    typeof lat === "number"
                                        ? lat
                                        : Number(lat?.split("%").shift());
                                long =
                                    typeof long === "number"
                                        ? long
                                        : Number(long?.split("%").shift());
                            } catch (e) {
                                err = true;
                            }

                            if (err || isNaN(lat) || isNaN(long)) {
                                new Notice(
                                    t(
                                        "Could not parse location in %1",
                                        file.basename
                                    )
                                );
                                continue;
                            }

                            let min, max;
                            if (frontmatter.mapzoom) {
                                let [minZoom, maxZoom] = frontmatter.mapzoom;
                                if (isNaN(Number(minZoom))) {
                                    min = undefined;
                                } else {
                                    min = Number(minZoom);
                                }
                                if (isNaN(Number(maxZoom))) {
                                    max = undefined;
                                } else {
                                    max = Number(maxZoom);
                                }
                            }

                            markers.push([
                                frontmatter.mapmarker ||
                                    this.plugin.getIconForTag(tags) ||
                                    "default",
                                lat,
                                long,
                                linkText,
                                undefined,
                                false,
                                id,
                                null,
                                min,
                                max
                            ]);
                        }
                        /* watchers.set(file, watchers.get(file).add(id)); */
                        idMap.set("marker", id);
                    }

                    if (frontmatter.mapmarkers) {
                        const id = getId();
                        frontmatter.mapmarkers.forEach(
                            ([type, location, description, minZoom, maxZoom]: [
                                type: string,
                                location: number[],
                                description: string,
                                minZoom: number,
                                maxZoom: number
                            ]) => {
                                let min, max;
                                if (isNaN(Number(minZoom))) {
                                    min = undefined;
                                } else {
                                    min = Number(minZoom);
                                }
                                if (isNaN(Number(maxZoom))) {
                                    max = undefined;
                                } else {
                                    max = Number(maxZoom);
                                }
                                markers.push([
                                    type ||
                                        this.plugin.getIconForTag(tags) ||
                                        "default",
                                    location[0],
                                    location[1],
                                    linkText,
                                    undefined,
                                    false,
                                    id,
                                    description,
                                    min,
                                    max
                                ]);
                            }
                        );
                        idMap.set("mapmarkers", id);
                    }

                    if (frontmatter.mapoverlay) {
                        const arr =
                            frontmatter.mapoverlay[0] instanceof Array
                                ? frontmatter.mapoverlay
                                : [frontmatter.mapoverlay];
                        arr.forEach(
                            ([
                                color = overlayColor ?? "blue",
                                loc = [0, 0],
                                length = "1 m",
                                desc
                            ]: [
                                color: string,
                                loc: number[],
                                length: string,
                                desc: string
                            ]) => {
                                const match = length.match(OVERLAY_TAG_REGEX);
                                if (!match) {
                                    new Notice(
                                        t(
                                            `Could not parse map overlay length in %1. Please ensure it is in the format: <distance> <unit>`,
                                            file.name
                                        )
                                    );
                                    return;
                                }
                                overlaysToReturn.push([
                                    color,
                                    loc as [number, number],
                                    length,
                                    desc ?? t(`%1 overlay`, file.basename),
                                    id
                                ]);
                            }
                        );
                        idMap.set("overlay", id);
                    }

                    if (overlayTag in frontmatter) {
                        const match =
                            frontmatter[overlayTag].match(OVERLAY_TAG_REGEX);
                        if (!match) {
                            new Notice(
                                t(
                                    `Could not parse %1 in %2. Please ensure it is in the format: <distance> <unit>`,
                                    overlayTag,
                                    file.name
                                )
                            );
                            continue;
                        }

                        let location = frontmatter.location;
                        if (!location) continue;
                        if (
                            location instanceof Array &&
                            !(location[0] instanceof Array)
                        ) {
                            location = [location];
                        }
                        overlaysToReturn.push([
                            overlayColor,
                            location[0],
                            frontmatter[overlayTag],
                            `${file.basename}: ${overlayTag}`,
                            id
                        ]);

                        idMap.set("overlayTag", id);
                    }

                    /** Register File Watcher to Update Markers/Overlays */
                    this.registerWatcher(file, idMap);
                }
            }
            if (this.params.overlay.length) {
                const arr = Array.isArray(this.params.overlay[0])
                    ? this.params.overlay
                    : ([this.params.overlay] as any[]);
                for (const overlay of arr.filter((o) => o && o.length)) {
                    try {
                        let [color, latlng, length, desc, id = getId()] =
                            typeof overlay == "string"
                                ? overlay.split(/,(?![^\[]*\])/)
                                : (overlay as [
                                      string,
                                      [number, number],
                                      string,
                                      string,
                                      string
                                  ]);
                        latlng =
                            typeof latlng == "string"
                                ? (latlng
                                      .replace(/(\[|\])/g, "")
                                      .split(",") as unknown as [
                                      number,
                                      number
                                  ])
                                : latlng;
                        const match = length.match(OVERLAY_TAG_REGEX);
                        if (!match) {
                            continue;
                        }

                        const loc = [Number(latlng[0]), Number(latlng[1])];

                        overlaysToReturn.push([
                            color,
                            loc as [number, number],
                            length,
                            desc,
                            id
                        ]);
                    } catch (e) {}
                }
            }

            resolve({
                markers: markers,
                overlays: overlaysToReturn
            });
        });
    }

    registerWatcher(file: TFile, fileIds: Map<string, string>) {
        const watcher = new Watcher(this, file, fileIds);
        this.watchers.add(watcher);
        watcher.on("remove", () => this.watchers.delete(watcher));
    }

    //TODO: Move to renderer
    async getCoordinates(
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
