import "leaflet";
import "../node_modules/leaflet/dist/leaflet.css";
import "./assets/main.css";

import {
    Notice,
    MarkdownView,
    MarkdownPostProcessorContext,
    Plugin,
    TFile,
    CachedMetadata,
    addIcon,
    Platform
} from "obsidian";

//Local Imports

import { ObsidianLeafletSettingTab } from "./settings/settings";

import {
    getIcon,
    DEFAULT_SETTINGS,
    getHeight,
    getParamsFromSource,
    getImmutableItems,
    getMarkerIcon,
    OVERLAY_TAG_REGEX,
    getId,
    DESCRIPTION_ICON,
    DESCRIPTION_ICON_SVG,
    parseLink,
    log,
    getBlob
} from "./utils";
import {
    MapInterface,
    SavedMarkerProperties,
    MarkerIcon,
    ObsidianAppData,
    Icon,
    Marker,
    SavedOverlayData,
    ObsidianLeaflet as ObsidianLeafletImplementation,
    BaseMapType,
    ImageLayerData
} from "./@types";

import { LeafletRenderer } from "./renderer";
import { markerDivIcon } from "./map";
import { ImageMap } from "./map/map";
import convert from "convert";

import { Length } from "convert/dist/types/units";

//add commands to app interface
declare module "obsidian" {
    interface App {
        commands: {
            listCommands(): Command[];
            executeCommandById(id: string): void;
            findCommand(id: string): Command;
            commands: { [id: string]: Command };
        };
        keymap: {
            pushScope(scope: Scope): void;
            popScope(scope: Scope): void;
        };
    }
    interface MarkdownPostProcessorContext {
        containerEl: HTMLElement;
    }

    interface MenuItem {
        dom: HTMLDivElement;
    }
}

import Loader from "./worker/loader";

export default class ObsidianLeaflet
    extends Plugin
    implements ObsidianLeafletImplementation
{
    data: ObsidianAppData;
    markerIcons: MarkerIcon[];
    maps: MapInterface[] = [];
    ImageLoader = new Loader(this.app);
    mapFiles: { file: string; maps: string[] }[] = [];
    watchers: Set<TFile> = new Set();
    Platform = Platform;
    isDesktop = Platform.isDesktopApp;
    isMobile = Platform.isMobileApp;
    isMacOS = Platform.isMacOS;
    get modifierKey() {
        return this.isMacOS ? "Meta" : "Control";
    }
    /* escapeScope: Scope; */

    async onload(): Promise<void> {
        console.log("Loading Obsidian Leaflet v" + this.manifest.version);

        await this.loadSettings();

        addIcon(DESCRIPTION_ICON, DESCRIPTION_ICON_SVG);

        this.markerIcons = this.generateMarkerMarkup(this.data.markerIcons);

        this.registerMarkdownCodeBlockProcessor(
            "leaflet",
            this.postprocessor.bind(this)
        );

        this.registerEvent(
            this.app.vault.on("rename", async (file, oldPath) => {
                if (!file) return;
                if (!this.mapFiles.find(({ file: f }) => f === oldPath)) return;

                this.mapFiles.find(({ file: f }) => f === oldPath).file =
                    file.path;

                await this.saveSettings();
            })
        );
        this.registerEvent(
            this.app.vault.on("delete", async (file) => {
                if (!file) return;
                if (!this.mapFiles.find(({ file: f }) => f === file.path))
                    return;

                this.mapFiles = this.mapFiles.filter(
                    ({ file: f }) => f != file.path
                );

                await this.saveSettings();
            })
        );

        this.addSettingTab(new ObsidianLeafletSettingTab(this.app, this));
    }

    async onunload(): Promise<void> {
        console.log("Unloading Obsidian Leaflet");

        this.maps.forEach((map) => {
            map?.map?.remove();
            let newPre = createEl("pre");
            newPre.createEl("code", {}, (code) => {
                code.innerText = `\`\`\`leaflet\n${map.source}\`\`\``;
                map.el.parentElement.replaceChild(newPre, map.el);
            });
        });
        this.maps = [];
    }

    async postprocessor(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        /* try { */
        /** Get Parameters from Source */
        let params = getParamsFromSource(source);
        let {
            height = "500px",
            minZoom = 1,
            maxZoom = 10,
            defaultZoom = 5,
            zoomDelta = 1,
            lat,
            long,
            coordinates = undefined,
            id = undefined,
            scale = 1,
            unit = "m",
            distanceMultiplier = 1,
            darkMode = "false",
            image = "real",
            layers = [],
            imageOverlay = [],
            overlay = [],
            overlayColor = "blue",
            bounds = undefined,
            linksFrom = [],
            linksTo = [],
            geojson = [],
            geojsonColor = "#3388ff",
            zoomFeatures = false,
            verbose = false,
            gpx = [],
            gpxMarkers
        } = params;
        if (!id) {
            new Notice("Obsidian Leaflet maps must have an ID.");
            throw new Error("ID required");
        }
        log(verbose, id, "Beginning Markdown Postprocessor.");
        let view = this.app.workspace.getActiveViewOfType(MarkdownView);

        /** Get Markers from Parameters */
        let geojsonData: any[] = [];
        if (!(geojson instanceof Array)) {
            geojson = [geojson];
        }
        if (geojson.length) {
            log(verbose, id, "Loading GeoJSON files.");
            for (let link of geojson.flat(Infinity)) {
                const file = this.app.metadataCache.getFirstLinkpathDest(
                    parseLink(link),
                    ""
                );
                if (file && file instanceof TFile) {
                    let data = await this.app.vault.read(file);
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        new Notice(
                            "Could not parse GeoJSON file " +
                                link +
                                "\n\n" +
                                e.message
                        );
                        continue;
                    }
                    geojsonData.push(data);
                }
            }
        }
        let gpxData: any[] = [];
        let gpxIcons: {
            start: string;
            end: string;
            waypoint: string;
        } = {
            ...{ start: null, end: null, waypoint: null },
            ...gpxMarkers
        };
        if (!(gpx instanceof Array)) {
            gpx = [gpx];
        }
        if (gpx.length) {
            log(verbose, id, "Loading GPX files.");
            for (let link of gpx.flat(Infinity)) {
                const file = this.app.metadataCache.getFirstLinkpathDest(
                    parseLink(link),
                    ""
                );
                if (file && file instanceof TFile) {
                    let data = await this.app.vault.read(file);
                    /* try {
                            data = JSON.parse(data);
                        } catch (e) {
                            new Notice("Could not parse GeoJSON file " + link);
                            continue;
                        } */
                    gpxData.push(data);
                }
            }
        }

        //TODO: Move image overlays to web worker
        //maybe? may need this immediately otherwise they could flicker on
        let imageOverlayData;
        if (imageOverlay.length) {
            imageOverlayData = await Promise.all(
                imageOverlay.map(async ([img, ...bounds]) => {
                    return {
                        ...(await this.ImageLoader.loadImageAsync(id, [img])),
                        bounds
                    };
                })
            );
        }

        const renderer = new LeafletRenderer(this, ctx, el, {
            bounds: bounds,
            context: ctx.sourcePath,
            darkMode: `${darkMode}` === "true",
            defaultZoom: +defaultZoom,
            distanceMultiplier: distanceMultiplier,
            geojson: geojsonData,
            geojsonColor: geojsonColor,
            gpx: gpxData,
            gpxIcons: gpxIcons,
            hasAdditional: layers.length > 1,
            height: getHeight(view, height) ?? "500px",
            id: id,
            imageOverlays: imageOverlayData ?? [],
            maxZoom: +maxZoom,
            minZoom: +minZoom,
            overlayColor: overlayColor,
            scale: scale,
            type: image != "real" ? "image" : "real",
            unit: unit,
            verbose: verbose,
            zoomDelta: +zoomDelta,
            zoomFeatures: zoomFeatures
        });
        const map = renderer.map;

        if (
            (params.marker ?? []).length ||
            (params.commandMarker ?? []).length ||
            (params.markerTag ?? []).length ||
            (params.markerFile ?? []).length ||
            (params.markerFolder ?? []).length ||
            (params.linksTo ?? []).length ||
            (params.linksFrom ?? []).length ||
            (params.overlayTag ?? []).length
        ) {
            log(verbose, id, "Loading immutable items.");
        }

        //TODO: LET RENDERER HANDLE THIS

        let {
            markers: immutableMarkers,
            overlays: immutableOverlays,
            files: watchers
        } = await getImmutableItems(
            /* source */
            this.app,
            params.marker as string[],
            params.commandMarker as string[],
            params.markerTag as string[][],
            params.markerFile as string[],
            params.markerFolder as string[],
            linksTo.flat(Infinity),
            linksFrom.flat(Infinity),
            params.overlayTag,
            overlayColor
        );

        if (
            (params.marker ?? []).length ||
            (params.commandMarker ?? []).length ||
            (params.markerTag ?? []).length ||
            (params.markerFile ?? []).length ||
            (params.markerFolder ?? []).length ||
            (params.linksTo ?? []).length ||
            (params.linksFrom ?? []).length ||
            (params.overlayTag ?? []).length
        ) {
            log(
                verbose,
                id,
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
            ...overlay
        ].map(([color, loc, length, desc, id = getId()]) => {
            const match = `${length}`.match(OVERLAY_TAG_REGEX) ?? [];

            if (!match || isNaN(Number(match[1]))) {
                throw new Error(
                    "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`."
                );
            }
            const [, radius, unit] = match ?? [];
            return {
                radius: Number(radius),
                loc: loc,
                color: color,
                unit: unit && unit.length ? (unit as Length) : undefined,
                layer: layers[0],
                desc: desc,
                id: id,
                mutable: false
            };
        });

        /** Get initial coordinates and zoom level */
        map.log("Getting initiatial coordinates.");
        const { coords, distanceToZoom, file } = await this._getCoordinates(
            lat,
            long,
            coordinates,
            params.zoomTag,
            map
        );

        if (file) {
            watchers.set(
                file,
                watchers.get(file)?.set("coordinates", "coordinates") ??
                    new Map([["coordinates", "coordinates"]])
            );
        }

        /** Register File Watcher to Update Markers/Overlays */
        renderer.registerWatchers(watchers);

        let mapData = this.data.mapMarkers.find(({ id: mapId }) => mapId == id);

        map.addMarker(
            ...markerArray,
            ...(mapData?.markers.map((m) => {
                const layer =
                    decodeURIComponent(m.layer) === m.layer
                        ? encodeURIComponent(m.layer)
                        : m.layer;
                return { ...m, mutable: true, layer };
            }) ?? [])
        );

        map.addOverlay(
            ...immutableOverlayArray,
            ...new Set(mapData?.overlays ?? [])
        );

        map.render({
            coords: coords,
            zoomDistance: distanceToZoom
        });

        if (map instanceof ImageMap) {
            this.ImageLoader.on(
                `${id}-layer-data-ready`,
                (layer: ImageLayerData) => {
                    map.log(
                        `Data ready for layer ${encodeURIComponent(layer.id)}.`
                    );
                    map.buildLayer(layer);
                }
            );

            map.log(`Loading layer data for ${id}.`);
            this.ImageLoader.loadImage(id, layers);
        }

        this.registerMapEvents(map);

        ctx.addChild(renderer);

        /** Add Map to Map Store
         * TODO: REFACTOR TO MAP<contentEl, { map, source, id }>
         */
        this.maps = this.maps.filter((m) => m.el != el);
        this.maps.push({
            map: map,
            source: source,
            el: el,
            id: id
        });

        if (this.mapFiles.find(({ file }) => file == ctx.sourcePath)) {
            this.mapFiles
                .find(({ file }) => file == ctx.sourcePath)
                .maps.push(id);
        } else {
            this.mapFiles.push({
                file: ctx.sourcePath,
                maps: [id]
            });
        }

        /* } catch (e) {
            console.error(e);
            new Notice("There was an error loading the map.");
            renderError(el, e.message);
        } */
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
        distanceToZoom: number;
        file: TFile;
    }> {
        let latitude = lat;
        let longitude = long;
        let coords: [number, number] = [undefined, undefined];
        let distanceToZoom, file;
        if (typeof coordinates == "string" && coordinates.length) {
            file = this.app.metadataCache.getFirstLinkpathDest(
                parseLink(coordinates),
                ""
            );
            if (file && file instanceof TFile) {
                //internal, try to read note yaml for coords
                ({ latitude, longitude, distanceToZoom } =
                    this._getCoordsFromCache(
                        this.app.metadataCache.getFileCache(file),
                        zoomTag,
                        map
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
                "There was an error with the provided latitude and longitude. Using defaults."
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
                coords[0] = this.data.lat;
            }
            if (!longitude || isNaN(coords[1])) {
                coords[1] = this.data.long;
            }
        }

        return { coords, distanceToZoom, file };
    }
    private _getCoordsFromCache(
        cache: CachedMetadata,
        zoomTag: string,
        map: BaseMapType
    ): {
        latitude: string;
        longitude: string;
        distanceToZoom: number;
    } {
        /* const cache = await this.app.metadataCache.getFileCache(file); */
        let latitude, longitude, distanceToZoom;
        if (
            cache &&
            cache.frontmatter &&
            cache.frontmatter.location &&
            cache.frontmatter.location instanceof Array
        ) {
            const location = cache.frontmatter.location;
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

            distanceToZoom = convert(distance)
                .from((unit as Length) ?? "m")
                .to(/* map.type == "image" ? map.unit : */ "m");
            /* if (map.type == "image") {
                distanceToZoom = distanceToZoom / map.scale;
            } */
        }
        return { latitude, longitude, distanceToZoom };
    }

    async loadSettings() {
        this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.data.previousVersion = this.manifest.version;
        if (typeof this.data.displayMarkerTooltips === "boolean") {
            this.data.displayMarkerTooltips = this.data.displayMarkerTooltips
                ? "hover"
                : "never";
        }
        if (!this.data.defaultMarker || !this.data.defaultMarker.iconName) {
            this.data.defaultMarker = DEFAULT_SETTINGS.defaultMarker;
            this.data.layerMarkers = false;
        }
        await this.saveSettings();
    }
    async saveSettings() {
        this.maps.forEach((map) => {
            this.data.mapMarkers = this.data.mapMarkers.filter(
                ({ id }) => id != map.id
            );

            this.data.mapMarkers.push({
                ...map.map.toProperties(),
                files: this.mapFiles
                    .filter(({ maps }) => maps.indexOf(map.id) > -1)
                    .map(({ file }) => file)
            });
        });

        /** Only need to save maps with defined marker data */
        this.data.mapMarkers = this.data.mapMarkers.filter(
            ({ markers, overlays }) => markers.length > 0 || overlays.length > 0
        );

        /** Remove maps that haven't been accessed in more than 1 week that are not associated with a file */
        this.data.mapMarkers = this.data.mapMarkers.filter(
            ({ id, files, lastAccessed = Date.now() }) =>
                !id || files.length || Date.now() - lastAccessed <= 6.048e8
        );

        await this.saveData(this.data);

        this.markerIcons = this.generateMarkerMarkup(this.data.markerIcons);

        this.maps.forEach((map) => {
            map.map.updateMarkerIcons();
        });
    }

    generateMarkerMarkup(
        markers: Icon[] = this.data.markerIcons
    ): MarkerIcon[] {
        let ret: MarkerIcon[] = markers.map((marker): MarkerIcon => {
            if (!marker.transform) {
                marker.transform = this.data.defaultMarker.transform;
            }
            if (!marker.iconName) {
                marker.iconName = this.data.defaultMarker.iconName;
            }
            const params =
                marker.layer && !this.data.defaultMarker.isImage
                    ? {
                          transform: marker.transform,
                          mask: getIcon(this.data.defaultMarker.iconName)
                      }
                    : {};
            let node = getMarkerIcon(marker, {
                ...params,
                classes: ["full-width-height"]
            }).node as HTMLElement;
            node.style.color = marker.color
                ? marker.color
                : this.data.defaultMarker.color;

            return {
                type: marker.type,
                html: node.outerHTML,
                icon: markerDivIcon({
                    html: node.outerHTML,
                    className: `leaflet-div-icon`
                })
            };
        });
        const defaultHtml = getMarkerIcon(this.data.defaultMarker, {
            classes: ["full-width-height"],
            styles: {
                color: this.data.defaultMarker.color
            }
        }).html;
        ret.unshift({
            type: "default",
            html: defaultHtml,
            icon: markerDivIcon({
                html: defaultHtml,
                className: `leaflet-div-icon`
            })
        });

        return ret;
    }

    registerMapEvents(map: BaseMapType) {
        this.registerDomEvent(map.contentEl, "dragover", (evt) => {
            evt.preventDefault();
        });
        this.registerDomEvent(map.contentEl, "drop", (evt) => {
            evt.stopPropagation();

            let file = decodeURIComponent(
                evt.dataTransfer.getData("text/plain")
            )
                .split("file=")
                .pop();
            const latlng = map.leafletInstance.mouseEventToLatLng(evt);
            const loc: [number, number] = [latlng.lat, latlng.lng];

            let marker = map.createMarker(
                map.defaultIcon.type,
                loc,
                undefined,
                file
            );
            marker.leafletInstance.closeTooltip();
        });

        map.on("marker-added", async (marker: Marker) => {
            marker.leafletInstance.closeTooltip();
            marker.leafletInstance.unbindTooltip();
            this.maps
                .filter(
                    ({ id, map: m }) =>
                        id == map.id && m.contentEl != map.contentEl
                )
                .forEach((map) => {
                    map.map.addMarker(marker.toProperties());
                });
            await this.saveSettings();
        });

        map.on("marker-dragging", (marker: Marker) => {
            this.maps
                .filter(
                    ({ id, map: m }) =>
                        id == map.id && m.contentEl != map.contentEl
                )
                .forEach((otherMap) => {
                    let existingMarker = otherMap.map.markers.find(
                        (m) => m.id == marker.id
                    );
                    if (!existingMarker) return;

                    existingMarker.setLatLng(
                        marker.leafletInstance.getLatLng()
                    );
                });
        });

        map.on("marker-data-updated", async (marker: Marker) => {
            await this.saveSettings();
            this.maps
                .filter(
                    ({ id, map: m }) =>
                        id == map.id && m.contentEl != map.contentEl
                )
                .forEach((map) => {
                    let existingMarker = map.map.markers.find(
                        (m) => m.id == marker.id
                    );
                    if (!existingMarker) return;

                    existingMarker.setLatLng(
                        marker.leafletInstance.getLatLng()
                    );
                });
        });

        map.on("marker-deleted", (marker) => {
            const otherMaps = this.maps.filter(
                ({ id, map: m }) => id == map.id && m.contentEl != map.contentEl
            );
            for (let { map } of otherMaps) {
                map.removeMarker(marker);
            }
        });

        map.on("marker-updated", (marker) => {
            const otherMaps = this.maps.filter(
                ({ id, map: m }) => id == map.id && m.contentEl != map.contentEl
            );
            for (let { map } of otherMaps) {
                map.updateMarker(marker);
            }
        });
    }
}
