import "../node_modules/leaflet/dist/leaflet.css";
import "./assets/main.css";

import {
    Notice,
    MarkdownView,
    MarkdownPostProcessorContext,
    setIcon,
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
    toDataURL,
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
    renderError
} from "./utils";
import {
    MapInterface,
    SavedMarkerProperties,
    MarkerIcon,
    ObsidianAppData,
    Icon,
    Marker,
    LeafletMap,
    SavedOverlayData,
    ObsidianLeaflet as ObsidianLeafletImplementation
} from "./@types";

import { LeafletRenderer } from "./leaflet";
import { markerDivIcon } from "./map";
import convert from "convert";

import { LeafletSymbol } from "./utils/leaflet-import";
import type * as Leaflet from "leaflet";
import { Length } from "convert/dist/types/units";
import Watcher from "./utils/watcher";

const L = window[LeafletSymbol];

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

export default class ObsidianLeaflet
    extends Plugin
    implements ObsidianLeafletImplementation
{
    data: ObsidianAppData;
    markerIcons: MarkerIcon[];
    maps: MapInterface[] = [];
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
            lat = `${this.data.lat}`,
            long = `${this.data.long}`,
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
            new Notice(
                "As of version 3.0.0, Obsidian Leaflet maps must have an ID."
            );
            new Notice(
                "All marker data associated with this map will sync to the new ID."
            );
            throw new Error("ID required");
        }
        log(verbose, id, "Beginning Markdown Postprocessor.");
        let view = this.app.workspace.getActiveViewOfType(MarkdownView);

        /** Get Markers from Parameters */

        /** Update Old Map Data Format */
        if (
            this.data.mapMarkers.find(
                ({ path, id: mapId }) =>
                    (path == `${ctx.sourcePath}/${image}` && !mapId) ||
                    path == `${ctx.sourcePath}/${id}`
            )
        ) {
            log(verbose, id, "Map data found in an old format. Converting.");
            let data = this.data.mapMarkers.find(
                ({ path }) =>
                    path == `${ctx.sourcePath}/${image}` ||
                    path == `${ctx.sourcePath}/${id}`
            );
            this.data.mapMarkers = this.data.mapMarkers.filter(
                (d) => d != data
            );
        }

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
            log(verbose, id, "Loading GeoJSON files.");
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

        const renderer = new LeafletRenderer(this, ctx, el, {
            height: getHeight(view, height) ?? "500px",
            type: image != "real" ? "image" : "real",
            minZoom: +minZoom,
            maxZoom: +maxZoom,
            defaultZoom: +defaultZoom,
            zoomDelta: +zoomDelta,
            unit: unit,
            scale: scale,
            distanceMultiplier: distanceMultiplier,
            id: id,
            darkMode: `${darkMode}` === "true",
            overlayColor: overlayColor,
            bounds: bounds,
            geojson: geojsonData,
            geojsonColor: geojsonColor,
            gpx: gpxData,
            gpxIcons: gpxIcons,
            zoomFeatures: zoomFeatures,
            verbose: verbose
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
        log(verbose, id, "Getting initiatial coordinates.");
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

        let mapData = this.data.mapMarkers.find(
            ({ id: mapId }) => mapId == id
        );
        map.addMarkers([
            ...markerArray,
            ...(mapData?.markers.map((m) => {
                const layer =
                    decodeURIComponent(m.layer) === m.layer
                        ? encodeURIComponent(m.layer)
                        : m.layer;
                return { ...m, mutable: true, layer };
            }) ?? [])
        ]);

        map.addOverlays(immutableOverlayArray, {
            mutable: false,
            sort: true
        });
        const mutableOverlays = new Set(mapData?.overlays ?? []);
        map.addOverlays([...mutableOverlays], {
            mutable: true,
            sort: true
        });

        let layerData: {
            data: string;
            id: string;
            alias: string;
        }[] = [];

        if (image != "real") {
            layerData = await Promise.all(
                layers.map(async (img) => {
                    return await toDataURL(encodeURIComponent(img), this.app);
                })
            );
            if (layerData.filter((d) => !d.data).length) {
                throw new Error(
                    "No valid layers were provided to the image map."
                );
            }
        }
        let imageOverlayData: {
            data: string;
            id: string;
            alias: string;
            bounds: [[number, number], [number, number]];
        }[] = [];

        if (imageOverlay.length) {
            imageOverlayData = await Promise.all(
                imageOverlay.map(async ([img, ...bounds]) => {
                    return {
                        ...(await toDataURL(encodeURIComponent(img), this.app)),
                        bounds
                    };
                })
            );
        }

        this.registerMapEvents(map);

        map.render({
            coords: coords,
            zoomDistance: distanceToZoom,
            layer: layerData[0],
            hasAdditional: layerData.length > 1,
            imageOverlays: imageOverlayData
        });

        ctx.addChild(renderer);

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

        map.on("rendered", async () => {
            if (layerData.length > 1)
                map.loadAdditionalMapLayers(layerData.slice(1));
            await this.saveSettings();
        });
        /* } catch (e) {
            console.error(e);
            new Notice("There was an error loading the map.");
            renderError(el, e.message);
        } */
    }
    private async _getCoordinates(
        lat: string,
        long: string,
        coordinates: [string, string] | string,
        zoomTag: string,
        map: LeafletMap
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

                log(map.verbose, map.id, "Coordinates file found.");
            }
        } else if (coordinates && coordinates.length == 2) {
            latitude = coordinates[0];
            longitude = coordinates[1];

            log(
                map.verbose,
                map.id,
                `Using supplied coordinates [${latitude}, ${longitude}]`
            );
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

        if (err || isNaN(coords[0]) || isNaN(coords[1])) {
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
        map: LeafletMap
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
                .to(map.type == "image" ? map.unit : "m");
            if (map.type == "image") {
                distanceToZoom = distanceToZoom / map.scale;
            }
        }
        return { latitude, longitude, distanceToZoom };
    }

    async loadSettings() {
        this.data = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
        this.data.previousVersion = this.manifest.version;
        if (typeof this.data.displayMarkerTooltips === "boolean") {
            this.data.displayMarkerTooltips = this.data
                .displayMarkerTooltips
                ? "hover"
                : "never";
        }
        if (
            !this.data.defaultMarker ||
            !this.data.defaultMarker.iconName
        ) {
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
                id: map.id,
                files: this.mapFiles
                    .filter(({ maps }) => maps.indexOf(map.id) > -1)
                    .map(({ file }) => file),
                lastAccessed: Date.now(),
                markers: map.map.markers
                    .filter(({ mutable }) => mutable)
                    .map((marker): SavedMarkerProperties => {
                        return {
                            type: marker.type,
                            id: marker.id,
                            loc: [marker.loc.lat, marker.loc.lng],
                            percent: marker.percent,
                            link: marker.link,
                            layer: marker.layer,
                            mutable: true,
                            command: marker.command || false,
                            description: marker.description ?? null,
                            minZoom: marker.minZoom ?? null,
                            maxZoom: marker.maxZoom ?? null,
                            tooltip: marker.tooltip ?? null
                        };
                    }),
                overlays: map.map.overlays
                    .filter(({ mutable }) => mutable)
                    .map((overlay) => {
                        if (overlay.leafletInstance instanceof L.Circle)
                            return overlay.toProperties();
                    })
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

    registerMapEvents(map: LeafletMap) {
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

            let marker = map.createMarker(
                map.defaultIcon,
                map.map.mouseEventToLatLng(evt),
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

                    existingMarker.leafletInstance.setLatLng(
                        marker.leafletInstance.getLatLng()
                    );
                    existingMarker.loc = marker.loc;
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

                    existingMarker.leafletInstance.setLatLng(
                        marker.leafletInstance.getLatLng()
                    );
                    existingMarker.loc = marker.loc;
                });
        });

        map.on("marker-deleted", (marker) => {
            const otherMaps = this.maps.filter(
                ({ id, map: m }) => id == map.id && m.contentEl != map.contentEl
            );
            for (let { map } of otherMaps) {
                let existing = map.markers.find((m) => m.id === marker.id);
                existing.hide();
                map.markers = map.markers.filter((m) => m != existing);
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
