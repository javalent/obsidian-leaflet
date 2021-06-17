import {
    Notice,
    MarkdownView,
    MarkdownPostProcessorContext,
    setIcon,
    Plugin,
    TFile,
    CachedMetadata
} from "obsidian";
import { latLng, Circle, LatLngTuple } from "leaflet";

//Local Imports
import "./main.css";

import { ObsidianLeafletSettingTab } from "./settings";

import {
    getIcon,
    DEFAULT_SETTINGS,
    toDataURL,
    getHeight,
    getParamsFromSource,
    getImmutableItems,
    getMarkerIcon,
    renderError,
    OVERLAY_TAG_REGEX,
    getId
} from "./utils";
import {
    IMapInterface,
    IMarkerData,
    IMarkerIcon,
    IObsidianAppData,
    IMarker,
    Marker,
    LeafletMap,
    Length,
    IOverlayData
} from "./@types";
import { MarkerContextModal } from "./modals";

import { LeafletRenderer } from "./leaflet";
import { markerDivIcon } from "./map";
import convert from "convert";

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
}

export default class ObsidianLeaflet extends Plugin {
    AppData: IObsidianAppData;
    markerIcons: IMarkerIcon[];
    maps: IMapInterface[] = [];
    mapFiles: { file: string; maps: string[] }[] = [];
    watchers: Set<TFile> = new Set();
    /* escapeScope: Scope; */
    async onload(): Promise<void> {
        console.log("Loading Obsidian Leaflet v" + this.manifest.version);

        await this.loadSettings();
        this.markerIcons = this.generateMarkerMarkup(this.AppData.markerIcons);

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
        try {
            /** Get Parameters from Source */
            let params = getParamsFromSource(source);
            let {
                height = "500px",
                minZoom = 1,
                maxZoom = 10,
                defaultZoom = 5,
                zoomDelta = 1,
                lat = `${this.AppData.lat}`,
                long = `${this.AppData.long}`,
                coordinates = undefined,
                id = undefined,
                scale = 1,
                unit = "m",
                distanceMultiplier = 1,
                darkMode = "false",
                image = "real",
                layers = [],
                overlay = [],
                overlayColor = "blue",
                bounds = undefined,
                linksFrom = [],
                linksTo = [],
                geojson = [],
                geojsonColor = "#3388ff",
                zoomFeatures = false
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
            let view = this.app.workspace.getActiveViewOfType(MarkdownView);

            /** Get Markers from Parameters */

            /** Update Old Map Data Format */
            if (
                this.AppData.mapMarkers.find(
                    ({ path, id: mapId }) =>
                        (path == `${ctx.sourcePath}/${image}` && !mapId) ||
                        path == `${ctx.sourcePath}/${id}`
                )
            ) {
                let data = this.AppData.mapMarkers.find(
                    ({ path }) =>
                        path == `${ctx.sourcePath}/${image}` ||
                        path == `${ctx.sourcePath}/${id}`
                );
                this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
                    (d) => d != data
                );

                data.id = id;
                this.AppData.mapMarkers.push({
                    id: data.id,
                    markers: data.markers,
                    files: [ctx.sourcePath],
                    lastAccessed: Date.now(),
                    overlays: data.overlays || []
                });
            }

            let geojsonData: any[] = [];
            if (geojson.length) {
                for (let link of geojson.flat(Infinity)) {
                    const file = this.app.metadataCache.getFirstLinkpathDest(
                        link,
                        ""
                    );
                    if (file && file instanceof TFile) {
                        let data = await this.app.vault.read(file);
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            new Notice("Could not parse GeoJSON file " + link);
                            continue;
                        }
                        geojsonData.push(data);
                    }
                }
            }

            const renderer = new LeafletRenderer(this, ctx.sourcePath, el, {
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
                zoomFeatures: zoomFeatures
            });
            const map = renderer.map;

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

            /** Build arrays of markers and overlays to pass to map */
            let markerArray: IMarkerData[] = immutableMarkers.map(
                ([type, lat, long, link, layer, command, id, desc]) => {
                    return {
                        type: type,
                        loc: [Number(lat), Number(long)],
                        percent: undefined,
                        link: link?.trim(),
                        id: id,
                        layer: layer,
                        mutable: false,
                        command: command,
                        description: desc
                    };
                }
            );

            let overlayArray: IOverlayData[] = [
                ...overlay,
                ...immutableOverlays
            ].map(([color, loc, length, desc, id = getId()]) => {
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
                    layer: layers[0],
                    desc: desc,
                    id: id
                };
            });

            /** Get initial coordinates and zoom level */
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
            if (watchers.size) {
                this.registerEvent(
                    this.app.metadataCache.on("changed", (file) => {
                        if (!(file instanceof TFile)) return;
                        if (!watchers.has(file)) return;
                        const cache = this.app.metadataCache.getFileCache(file);
                        if (!cache || !cache.frontmatter) return;
                        const frontmatter = cache.frontmatter;

                        let fileIds = watchers.get(file);
                        if (fileIds.has("coordinates")) {
                            const { latitude, longitude, distanceToZoom } =
                                this._getCoordsFromCache(
                                    cache,
                                    params.zoomTag,
                                    map
                                );
                            if (
                                !isNaN(Number(latitude)) &&
                                !isNaN(Number(longitude))
                            ) {
                                map.setInitialCoords([
                                    Number(latitude),
                                    Number(longitude)
                                ]);
                            }
                            if (distanceToZoom) {
                                map.setZoomByDistance(distanceToZoom);
                            }
                        }
                        let overlays = [];
                        if (fileIds.has("overlayTag")) {
                            if (
                                Object.prototype.hasOwnProperty.call(
                                    frontmatter,
                                    params.overlayTag
                                )
                            ) {
                                map.overlays
                                    .filter(
                                        ({ id }) =>
                                            id === fileIds.get("overlayTag")
                                    )
                                    ?.forEach((overlay) => {
                                        overlay.leafletInstance.remove();
                                    });
                                map.overlays = map.overlays.filter(
                                    ({ id }) => id != fileIds.get("overlayTag")
                                );
                                overlays.push([
                                    overlayColor ?? "blue",
                                    frontmatter.location ?? [0, 0],
                                    frontmatter[params.overlayTag],
                                    `${file.basename}: ${params.overlayTag}`,
                                    fileIds.get("overlayTag")
                                ]);
                            }
                        }
                        const marker = map.getMarkerById(fileIds.get("marker"));

                        if (
                            marker &&
                            marker.length &&
                            frontmatter.location &&
                            frontmatter.location instanceof Array
                        ) {
                            try {
                                const { location } = frontmatter;
                                if (
                                    location.length == 2 &&
                                    location.every((v) => typeof v == "number")
                                ) {
                                    if (
                                        !marker[0].loc.equals(
                                            latLng(<LatLngTuple>location)
                                        )
                                    ) {
                                        marker[0].setLatLng(
                                            latLng(<LatLngTuple>location)
                                        );
                                    }
                                }
                            } catch (e) {
                                new Notice(
                                    `There was an error updating the marker for ${file.name}.`
                                );
                            }
                        }

                        if (marker && marker.length && frontmatter.mapmarker) {
                            try {
                                const { mapmarker } = frontmatter;

                                if (
                                    this.markerIcons.find(
                                        ({ type }) => type == mapmarker
                                    )
                                ) {
                                    marker[0].icon = this.markerIcons.find(
                                        ({ type }) => type == mapmarker
                                    );
                                }
                            } catch (e) {
                                new Notice(
                                    `There was an error updating the marker type for ${file.name}.`
                                );
                            }
                        }
                        if (frontmatter.mapmarkers) {
                            try {
                                const markers = map.getMarkerById(
                                    fileIds.get("mapmarkers")
                                );
                                const { mapmarkers } = frontmatter;

                                markers.forEach((marker) =>
                                    map.removeMarker(marker)
                                );

                                mapmarkers.forEach(
                                    ([type, location, description]: [
                                        type: string,
                                        location: [number, number],
                                        description: string
                                    ]) => {
                                        map.addMarker({
                                            type: type,
                                            loc: location,
                                            percent: null,
                                            id: fileIds.get("mapmarkers"),
                                            link: this.app.metadataCache.fileToLinktext(
                                                file,
                                                "",
                                                true
                                            ),
                                            layer: map.group.id,
                                            command: false,
                                            mutable: false,
                                            description: description
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
                                map.overlays
                                    .filter(
                                        ({ id }) =>
                                            id === fileIds.get("overlay")
                                    )
                                    ?.forEach((overlay) => {
                                        overlay.leafletInstance.remove();
                                    });
                                map.overlays = map.overlays.filter(
                                    ({ id }) => id != fileIds.get("overlay")
                                );

                                if (
                                    frontmatter.mapoverlay &&
                                    frontmatter.mapoverlay instanceof Array
                                ) {
                                    overlays.push(...frontmatter.mapoverlay);
                                }

                                const overlayArray: IOverlayData[] = [
                                    ...overlays
                                ].map(
                                    ([
                                        color,
                                        loc,
                                        length,
                                        desc,
                                        id = fileIds.get("overlay")
                                    ]) => {
                                        const match =
                                            length.match(OVERLAY_TAG_REGEX);
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
                                            layer: layers[0],
                                            desc: desc,
                                            id: id
                                        };
                                    }
                                );
                                map.addOverlays(overlayArray, {
                                    mutable: false,
                                    sort: true
                                });
                            } catch (e) {
                                new Notice(
                                    `There was an error updating the overlays for ${file.name}.`
                                );
                            }
                    })
                );

                this.registerEvent(
                    this.app.vault.on("delete", (file) => {
                        if (!(file instanceof TFile)) return;
                        if (!watchers.has(file)) return;
                        const fileId = watchers.get(file);
                        const markers = map.getMarkerById(fileId.get("marker"));

                        markers.forEach((marker) => map.removeMarker(marker));

                        map.overlays
                            .filter(({ id }) => id === fileId.get("overlay"))
                            ?.forEach((overlay) => {
                                overlay.leafletInstance.remove();
                            });
                        map.overlays = map.overlays.filter(
                            ({ id }) => id != fileId.get("overlay")
                        );

                        watchers.delete(file);
                    })
                );

                this.registerEvent(
                    this.app.vault.on("rename", (file) => {
                        if (!(file instanceof TFile)) return;
                        if (!watchers.has(file)) return;
                        const cache = this.app.metadataCache.getFileCache(file);
                        if (!cache || !cache.frontmatter) return;

                        const fileId = watchers.get(file);
                        const markers = map.getMarkerById(fileId.get("marker"));

                        markers.forEach((marker) => {
                            marker.link = this.app.metadataCache.fileToLinktext(
                                file,
                                "",
                                true
                            );
                        });
                    })
                );
            }

            let mapData = this.AppData.mapMarkers.find(
                ({ id: mapId }) => mapId == id
            );

            map.addOverlays([...overlayArray, ...(mapData?.overlays ?? [])], {
                mutable: false,
                sort: true
            });
            map.addMarkers([...markerArray, ...(mapData?.markers ?? [])]);

            /* await map.loadData(mapData); */

            let layerData: {
                data: string;
                id: string;
            }[] = [];

            if (image != "real") {
                layerData = await Promise.all(
                    layers.map(async (image) => {
                        return {
                            id: image,
                            data: await toDataURL(
                                encodeURIComponent(image),
                                this.app
                            )
                        };
                    })
                );
                if (layerData.filter((d) => !d.data).length) {
                    throw new Error(
                        "No valid layers were provided to the image map."
                    );
                }
            }

            this.registerMapEvents(map);

            map.render({
                coords: coords,
                zoomDistance: distanceToZoom,
                layer: layerData[0],
                hasAdditional: layerData.length > 1
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
        } catch (e) {
            console.error(e);
            new Notice("There was an error loading the map.");
            renderError(el, e.message);
        }
    }
    private async _getCoordinates(
        lat: string,
        long: string,
        coordinates: [string, string] | [[string]],
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
        if (coordinates instanceof Array && coordinates.length) {
            file = await this.app.metadataCache.getFirstLinkpathDest(
                coordinates.flat()[0].replace(/(\[|\])/, ""),
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
            } else if (coordinates.length == 2) {
                latitude = coordinates[0];
                longitude = coordinates[1];
            }
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
                coords[0] = this.AppData.lat;
            }
            if (!longitude || isNaN(coords[1])) {
                coords[1] = this.AppData.long;
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
        this.AppData = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
        this.AppData.previousVersion = this.manifest.version;
        if (
            !this.AppData.defaultMarker ||
            !this.AppData.defaultMarker.iconName
        ) {
            this.AppData.defaultMarker = DEFAULT_SETTINGS.defaultMarker;
            this.AppData.layerMarkers = false;
        }
        await this.saveSettings();
    }
    async saveSettings() {
        this.maps.forEach((map) => {
            this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
                ({ id }) => id != map.id
            );

            this.AppData.mapMarkers.push({
                id: map.id,
                files: this.mapFiles
                    .filter(({ maps }) => maps.indexOf(map.id) > -1)
                    .map(({ file }) => file),
                lastAccessed: Date.now(),
                markers: map.map.markers
                    .filter(({ mutable }) => mutable)
                    .map((marker): IMarkerData => {
                        return {
                            type: marker.type,
                            id: marker.id,
                            loc: [marker.loc.lat, marker.loc.lng],
                            percent: marker.percent,
                            link: marker.link,
                            layer: marker.layer,
                            command: marker.command || false,
                            zoom: marker.zoom ?? 0,
                            description: marker.description ?? null
                        };
                    }),
                overlays: map.map.overlays
                    .filter(({ mutable }) => mutable)
                    .map((overlay) => {
                        if (overlay.leafletInstance instanceof Circle) {
                            return {
                                radius: overlay.data.radius,
                                loc: [
                                    overlay.leafletInstance.getLatLng().lat,
                                    overlay.leafletInstance.getLatLng().lng
                                ],
                                color: overlay.leafletInstance.options.color,
                                layer: overlay.layer,
                                unit: overlay.data.unit,
                                desc: overlay.data.desc
                            };
                        }
                    })
            });
        });

        /** Only need to save maps with defined marker data */
        this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
            ({ markers, overlays }) => markers.length > 0 || overlays.length > 0
        );

        /** Remove maps that haven't been accessed in more than 1 week that are not associated with a file */
        this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
            ({ id, files, lastAccessed = Date.now() }) =>
                !id || files.length || Date.now() - lastAccessed <= 6.048e8
        );

        await this.saveData(this.AppData);

        this.markerIcons = this.generateMarkerMarkup(this.AppData.markerIcons);

        this.maps.forEach((map) => {
            map.map.updateMarkerIcons();
        });
    }

    generateMarkerMarkup(
        markers: IMarker[] = this.AppData.markerIcons
    ): IMarkerIcon[] {
        let ret: IMarkerIcon[] = markers.map((marker): IMarkerIcon => {
            if (!marker.transform) {
                marker.transform = this.AppData.defaultMarker.transform;
            }
            if (!marker.iconName) {
                marker.iconName = this.AppData.defaultMarker.iconName;
            }
            const params =
                marker.layer && !this.AppData.defaultMarker.isImage
                    ? {
                          transform: marker.transform,
                          mask: getIcon(this.AppData.defaultMarker.iconName),
                          classes: ["full-width-height"]
                      }
                    : {};
            let node = getMarkerIcon(marker, params).node as HTMLElement;
            node.style.color = marker.color
                ? marker.color
                : this.AppData.defaultMarker.color;

            return {
                type: marker.type,
                html: node.outerHTML,
                icon: markerDivIcon({
                    html: node.outerHTML,
                    className: `leaflet-div-icon`
                })
            };
        });
        const defaultHtml = getMarkerIcon(this.AppData.defaultMarker, {
            classes: ["full-width-height"],
            styles: {
                color: this.AppData.defaultMarker.color
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

        this.registerEvent(
            map.on("marker-added", async (marker: Marker) => {
                marker.leafletInstance.closeTooltip();
                marker.leafletInstance.unbindTooltip();
                this.maps
                    .filter(
                        ({ id, map: m }) =>
                            id == map.id && m.contentEl != map.contentEl
                    )
                    .forEach((map) => {
                        map.map.addMarker({
                            type: marker.type,
                            loc: [marker.loc.lat, marker.loc.lng],
                            percent: marker.percent,
                            id: marker.id,
                            link: marker.link,
                            layer: marker.layer,
                            command: marker.command,
                            mutable: marker.mutable,
                            zoom: marker.zoom,
                            description: marker.description
                        });
                    });
                await this.saveSettings();
            })
        );

        this.registerEvent(
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
            })
        );

        this.registerEvent(
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
            })
        );

        this.registerEvent(
            map.on(
                "marker-click",
                async (link: string, newWindow: boolean, command: boolean) => {
                    if (command) {
                        const commands = this.app.commands.listCommands();

                        if (
                            commands.find(
                                ({ id }) =>
                                    id.toLowerCase() ===
                                    link.toLowerCase().trim()
                            )
                        ) {
                            this.app.commands.executeCommandById(link);
                        } else {
                            new Notice(`Command ${link} could not be found.`);
                        }
                        return;
                    }
                    let internal =
                        await this.app.metadataCache.getFirstLinkpathDest(
                            link.split(/(\^|\||#)/).shift(),
                            ""
                        );

                    if (
                        /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
                            link
                        ) &&
                        !internal
                    ) {
                        //external url
                        let [, l] = link.match(
                            /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*))/
                        );

                        let [, text = l] = link.match(/\[([\s\S]+)\]/) || l;

                        const a = createEl("a", { href: l, text: text });

                        a.click();
                        a.detach();
                    } else {
                        await this.app.workspace.openLinkText(
                            link.replace("^", "#^").split(/\|/).shift(),
                            this.app.workspace.getActiveFile()?.path,
                            newWindow
                        );
                    }
                }
            )
        );

        this.registerEvent(
            map.on("marker-context", (marker) =>
                this.handleMarkerContext(map, marker)
            )
        );

        this.registerEvent(
            map.on(
                "marker-mouseover",
                async (evt: L.LeafletMouseEvent, marker: Marker) => {
                    if (marker.command) {
                        const commands = this.app.commands.listCommands();

                        if (
                            commands.find(
                                ({ id }) =>
                                    id.toLowerCase() ===
                                    marker.link.toLowerCase().trim()
                            )
                        ) {
                            const command = commands.find(
                                ({ id }) =>
                                    id.toLowerCase() ===
                                    marker.link.toLowerCase().trim()
                            );
                            const div = createDiv({
                                attr: {
                                    style: "display: flex; align-items: center;"
                                }
                            });
                            setIcon(
                                div.createSpan({
                                    attr: {
                                        style: "margin-right: 0.5em; display: flex; align-items: center;"
                                    }
                                }),
                                "run-command"
                            );
                            div.createSpan({ text: command.name });

                            map.openPopup(marker, div);
                        } else {
                            const div = createDiv({
                                attr: {
                                    style: "display: flex; align-items: center;"
                                }
                            });
                            setIcon(
                                div.createSpan({
                                    attr: {
                                        style: "margin-right: 0.5em; display: flex; align-items: center;"
                                    }
                                }),
                                "cross"
                            );
                            div.createSpan({ text: "No command found!" });

                            map.openPopup(marker, div);
                        }
                        return;
                    }

                    let internal =
                        await this.app.metadataCache.getFirstLinkpathDest(
                            marker.link.split(/(\^|\||#)/).shift(),
                            ""
                        );

                    if (
                        /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
                            marker.link
                        ) &&
                        !internal
                    ) {
                        //external url
                        let [, link] = marker.link.match(
                            /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*))/
                        );

                        let [, text] = marker.link.match(/\[([\s\S]+)\]/) || [
                            ,
                            link
                        ];

                        let el = evt.originalEvent.target as SVGElement;
                        const a = createEl("a", {
                            text: text,
                            href: link,
                            cls: "external-link"
                        });

                        map.openPopup(marker, a);
                    } else {
                        if (this.AppData.notePreview && !map.isFullscreen) {
                            marker.leafletInstance.unbindTooltip();

                            this.app.workspace.trigger(
                                "link-hover",
                                this, //not sure
                                marker.leafletInstance.getElement(), //targetEl
                                marker.link
                                    .replace("^", "#^")
                                    .split("|")
                                    .shift(), //linkText
                                this.app.workspace.getActiveFile()?.path //source
                            );
                        } else {
                            map.openPopup(
                                marker,
                                marker.display
                                    .replace(/(\^)/, " > ^")
                                    .replace(/#/, " > ")
                                    .split("|")
                                    .pop()
                            );
                        }
                    }
                }
            )
        );
    }
    handleMarkerContext(map: LeafletMap, marker: Marker) {
        let markerSettingsModal = new MarkerContextModal(this, marker, map);
        const otherMaps = this.maps.filter(
            ({ id, map: m }) => id == map.id && m.contentEl != map.contentEl
        );
        const markersToUpdate = [
            marker,
            ...otherMaps.map((map) =>
                map.map.markers.find((m) => m.id == marker.id)
            )
        ];

        markerSettingsModal.onClose = async () => {
            if (markerSettingsModal.deleted) {
                map.removeMarker(marker);
                otherMaps.forEach((oM) => {
                    let otherMarker = oM.map.markers.find(
                        (m) => m.id == marker.id
                    );
                    oM.map.removeMarker(otherMarker);
                });
            } else {
                [map, ...otherMaps.map((m) => m.map)].forEach((map) => {
                    map.displaying.delete(marker.type);
                    map.displaying.set(
                        markerSettingsModal.tempMarker.type,
                        true
                    );
                });
                markersToUpdate.forEach((m) => {
                    m.link = markerSettingsModal.tempMarker.link;
                    m.icon = map.markerIcons.get(
                        markerSettingsModal.tempMarker.type
                    );

                    m.command = markerSettingsModal.tempMarker.command;
                });
                await this.saveSettings();
            }
        };

        markerSettingsModal.open();
    }
}
