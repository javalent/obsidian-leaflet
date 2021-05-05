import {
    Plugin,
    addIcon,
    Notice,
    MarkdownView,
    Modal,
    Setting,
    TFile,
    MarkdownRenderChild,
    Menu,
    MarkdownPostProcessorContext,
    Vault,
    TFolder
} from "obsidian";
import { latLng, LeafletMouseEvent, Point } from "leaflet";
import { parse as parseCSV } from "papaparse";
import { getType as lookupMimeType } from "mime/lite";

//Local Imports
import "./main.css";

import { ObsidianLeafletSettingTab, DEFAULT_SETTINGS } from "./settings";
import {
    AbstractElement,
    icon,
    toHtml,
    getIcon,
    PathSuggestionModal,
    compareVersions
} from "./utils";
import {
    MapInterface,
    LeafletMarker,
    MarkerData,
    MarkerIcon,
    ObsidianAppData,
    Marker
} from "./@types";
import LeafletMap from "./leaflet";

export default class ObsidianLeaflet extends Plugin {
    AppData: ObsidianAppData;
    markerIcons: MarkerIcon[];
    maps: MapInterface[] = [];
    mapFiles: { file: string; maps: string[] }[] = [];
    async onload(): Promise<void> {
        console.log("Loading Obsidian Leaflet v" + this.manifest.version);

        await this.loadSettings();

        if (
            !this.AppData.previousVersion ||
            !compareVersions(this.AppData.previousVersion, "3.0.0", ">=")
        ) {
            this.AppData.previousVersion = this.manifest.version;

            new Notice(
                "Obsidian Leaflet 3.0.0 is a large update. Please read the changelog in the plugin's ReadMe."
            );

            if (
                await this.app.vault.adapter.exists(
                    this.app.vault.configDir +
                        "/plugins/obsidian-leaflet-plugin/data.json"
                )
            ) {
                if (
                    !(await this.app.vault.adapter.exists(
                        this.app.vault.configDir +
                            "/plugins/obsidian-leaflet-plugin/data.backup.json"
                    ))
                ) {
                    await this.app.vault.adapter.copy(
                        this.app.vault.configDir +
                            "/plugins/obsidian-leaflet-plugin/data.json",
                        this.app.vault.configDir +
                            "/plugins/obsidian-leaflet-plugin/data.backup.json"
                    );

                    new Notice(
                        "A backup of your map marker data has been created, just in case."
                    );
                }
            }
            await this.saveSettings();
        }

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
            let {
                height = "500px",
                minZoom = 1,
                maxZoom = 10,
                defaultZoom = 5,
                zoomDelta = 1,
                lat = `${this.AppData.lat}`,
                long = `${this.AppData.long}`,
                id = undefined,
                scale = 1,
                unit = "m"
            } = Object.fromEntries(
                source.split("\n").map((l) => l.split(/:\s?/))
            );

            let image = "real";
            let layers = (
                source.match(/^\bimage\b:[\s\S]*?$/gm) || []
            ).map((p) => p.split(/(?:image):\s?/)[1]?.trim());

            if (!id) {
                new Notice(
                    "As of version 3.0.0, Obsidian Leaflet maps must have an ID."
                );
                new Notice(
                    "All marker data associated with this map will sync to the new ID."
                );
                throw new Error("ID required");
            }

            if (layers.length) {
                image = layers[0];
            }

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
                    lastAccessed: Date.now()
                });
            }
            let map = new LeafletMap(
                el,
                this.markerIcons,
                +minZoom,
                +maxZoom,
                +defaultZoom,
                +zoomDelta,
                unit,
                scale,
                id
            );

            let immutableMarkers = await this.getMarkersFromSource(source);
            for (let [
                type,
                lat,
                long,
                link,
                layer = layers[0]
            ] of immutableMarkers) {
                map.createMarker(
                    this.markerIcons.find(({ type: t }) => t == type),
                    latLng([Number(lat), Number(long)]),
                    link,
                    undefined,
                    layer,
                    false
                );
            }

            /**
             * Set height of map element in pixels.
             */
            map.contentEl.style.height = this.getHeight(height);
            map.contentEl.style.width = "100%";

            let view = this.app.workspace.getActiveViewOfType(MarkdownView);

            if (view && view instanceof MarkdownView) {
                view.onunload = () => {
                    this.maps = this.maps.filter((map) => map.view !== view);
                };
            } else {
                let newPre = createEl("pre");
                newPre.createEl("code", {}, (code) => {
                    code.innerText = `\`\`\`leaflet\n${source}\`\`\``;
                    el.parentElement.replaceChild(newPre, el);
                });
                return;
            }

            let coords: [number, number];
            let err: boolean = false;
            try {
                lat = Number(lat?.split("%").shift());
                long = Number(long?.split("%").shift());
            } catch (e) {
                err = true;
            }
            if (err || isNaN(lat) || isNaN(long)) {
                new Notice(
                    "There was an error with the provided latitude and longitude. Using defaults."
                );
            }

            let mapMarkers = this.AppData.mapMarkers.find(
                ({ id: mapId }) => mapId == id
            );

            await map.loadData(mapMarkers);
            let layerData: {
                data: string;
                id: string;
            }[];

            if (image != "real") {
                if (!lat || isNaN(lat)) {
                    lat = 50;
                }
                if (!long || isNaN(lat)) {
                    long = 50;
                }
                coords = [+lat, +long];
                layerData = await Promise.all(
                    layers.map(async (image) => {
                        return {
                            id: image,
                            data: await this.toDataURL(
                                encodeURIComponent(image)
                            )
                        };
                    })
                );
                if (layerData.filter((d) => !d.data).length) {
                    throw new Error();
                }
                /* map.renderImage(layerData, coords); */
            } else {
                if (!lat || isNaN(lat)) {
                    lat = this.AppData.lat;
                }
                if (!long || isNaN(lat)) {
                    long = this.AppData.long;
                }
                coords = [lat, long];
                /* map.renderReal(coords); */
            }

            this.registerMapEvents(map, view);

            map.render(image != "real" ? "image" : "real", {
                coords: coords,
                layers: layerData
            });

            this.maps = this.maps.filter((m) => m.el != el);
            this.maps.push({
                map: map,
                view: view,
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

            await this.saveSettings();

            /**
             * Markdown Block has been unloaded.
             *
             * First, remove the map element and its associated resize handler.
             *
             * Then check to see if the markdown block was deleted. If so, remove the map from the maps object.
             */
            let markdownRenderChild = new MarkdownRenderChild(el);
            //support for Obsidian < 0.12.0
            markdownRenderChild.containerEl = el;

            markdownRenderChild.register(async () => {
                try {
                    map.remove();
                } catch (e) {}

                let file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
                if (!file || !(file instanceof TFile)) {
                    return;
                }
                let fileContent = await this.app.vault.read(file);

                let containsThisMap: boolean = false,
                    r = new RegExp(
                        `\`\`\`leaflet[\\s\\S]*?\\bid:(\\s?${id})\\b\\s*\\n[\\s\\S]*?\`\`\``,
                        "g"
                    );
                containsThisMap = fileContent.match(r)?.length > 0 || false;

                if (!containsThisMap) {
                    //Block was deleted or id was changed

                    let mapFile = this.mapFiles.find(
                        ({ file: f }) => f === ctx.sourcePath
                    );
                    mapFile.maps = mapFile.maps.filter((mapId) => mapId != id);
                }

                await this.saveSettings();
                this.maps = this.maps.filter((m) => {
                    return m.el != el;
                });
            });
            ctx.addChild(markdownRenderChild);
        } catch (e) {
            console.error(e);
            new Notice("There was an error loading the map.");
            let newPre = createEl("pre");
            newPre.createEl("code", {}, (code) => {
                code.innerText = `\`\`\`leaflet\n${source}\`\`\``;
                el.parentElement.replaceChild(newPre, el);
            });
        }
    }
    async getMarkersFromSource(
        source: string
    ): Promise<[string, number, number, string, string][]> {
        return new Promise(async (resolve, reject) => {
            let markersInSourceBlock = (
                    source.match(/^\bmarker\b:[\s\S]*?$/gm) || []
                ).map((p) => p.split(/(?:marker):\s?/)[1]?.trim()),
                markersToReturn: [
                    string,
                    number,
                    number,
                    string,
                    string
                ][] = [];

            for (let marker of markersInSourceBlock) {
                /* type, lat, long, link, layer, */
                const { data } = parseCSV<string>(marker);
                if (!data.length) {
                    new Notice("No data");
                    continue;
                }

                let [type, lat, long, link, layer] = data[0];

                if (
                    !type ||
                    !type.length ||
                    type === "undefined" ||
                    (type != "default" &&
                        !this.markerIcons.find(({ type: t }) => t == type))
                ) {
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

                if (!link || !link.length || link === "undefined") {
                    link = undefined;
                } else if (/\[\[[\s\S]+\]\]/.test(link)) {
                    //obsidian wiki-link
                    [, link] = link.match(/\[\[([\s\S]+)\]\]/);
                }

                if (!layer || !layer.length || layer === "undefined") {
                    layer = undefined;
                }
                markersToReturn.push([
                    type,
                    Number(lat),
                    Number(long),
                    link,
                    layer
                ]);
            }

            if (/marker(File|Folder|Tag)/.test(source)) {
                let markerFiles = new Set(
                    (source.match(/^\bmarkerFile\b:[\s\S]*?$/gm) || []).map(
                        (file) =>
                            file
                                .split(/(?:markerFile):\s?/)[1]
                                ?.trim()
                                .replace(/(\[|\])/g, "")
                    )
                );
                let markerFolders = (
                    source.match(/^\bmarkerFolder\b:[\s\S]*?$/gm) || []
                ).map((folder) =>
                    folder
                        .split(/(?:markerFolder):\s?/)[1]
                        ?.trim()
                        .replace(/(\[|\])/g, "")
                );

                let markerTags = (
                    source.match(/\bmarkerTag\b:[\s\S]*?$/gm) || []
                ).map((tag) =>
                    tag
                        .split(/(?:markerTag):\s?/)[1]
                        ?.trim()
                        .replace(/(\[|\])/g, "")
                        .split(/,\s*/)
                );

                for (let path of markerFolders) {
                    let abstractFile = this.app.vault.getAbstractFileByPath(
                        path
                    );
                    if (!abstractFile) continue;
                    if (abstractFile instanceof TFile) markerFiles.add(path);
                    if (abstractFile instanceof TFolder) {
                        Vault.recurseChildren(abstractFile, (file) => {
                            if (file instanceof TFile)
                                markerFiles.add(file.path);
                        });
                    }
                }

                //get cache
                //error is thrown here because plugins isn't exposed on Obsidian App
                //@ts-expect-error
                const cache = this.app.plugins.plugins.dataview?.index;
                if (cache && markerTags.length > 0) {
                    const tagSet = new Set();
                    for (let tags of markerTags) {
                        tags.map((tag) => {
                            return cache.tags.getInverse(tag.trim());
                        })
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
                    if (markerFiles.size) {
                        markerFiles = new Set(
                            [...markerFiles].filter(tagSet.has, tagSet)
                        );
                    } else {
                        tagSet.forEach(markerFiles.add, markerFiles);
                    }
                } else {
                    if (markerTags.length) {
                        new Notice(
                            "The `markerTag` field can only be used with the Dataview plugin installed."
                        );
                    }
                }

                for (let path of markerFiles) {
                    const file = await this.app.metadataCache.getFirstLinkpathDest(
                        path,
                        ""
                    );
                    if (!file || !(file instanceof TFile)) continue;

                    let { frontmatter } = this.app.metadataCache.getFileCache(
                        file
                    );

                    if (
                        !frontmatter ||
                        !frontmatter.location ||
                        !frontmatter.location.length
                    )
                        continue;
                    let err = false,
                        [lat, long] = frontmatter.location;

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
                        continue;
                    }

                    if (
                        frontmatter.marker &&
                        !this.AppData.warnedAboutMapMarker
                    ) {
                        new Notice(
                            "The `marker` front matter tag will be changing to `mapmarker` in a future release. Please update your notes."
                        );
                        this.AppData.warnedAboutMapMarker = true;
                        await this.saveSettings();
                    }

                    markersToReturn.push([
                        frontmatter.mapmarker ||
                            frontmatter.marker ||
                            "default",
                        lat,
                        long,
                        this.app.metadataCache.fileToLinktext(file, "", true),
                        undefined
                    ]);
                }
            }

            resolve(markersToReturn);
        });
    }
    getHeight(height: string): string {
        try {
            if (!/\d+(px|%)/.test(height)) throw new Error();
            if (
                /\d+%/.test(height) &&
                this.app.workspace.getActiveViewOfType(MarkdownView)
            ) {
                let [, perc] = height.match(/(\d+)%/);
                let view = this.app.workspace.getActiveViewOfType(MarkdownView);

                let node = view.previewMode.containerEl.querySelector(
                    ".markdown-preview-view"
                );
                let computedStyle = getComputedStyle(node);
                let clHeight = node.clientHeight; // height with padding

                clHeight -=
                    parseFloat(computedStyle.paddingTop) +
                    parseFloat(computedStyle.paddingBottom);

                height = `${(clHeight * Number(perc)) / 100}px`;
            }
        } catch (e) {
            new Notice(
                "There was a problem with the provided height. Using 500px."
            );
            height = "500px";
        } finally {
            return height;
        }
    }
    async loadSettings() {
        this.AppData = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
        if (
            !this.AppData.defaultMarker ||
            !this.AppData.defaultMarker.iconName
        ) {
            this.AppData.defaultMarker = DEFAULT_SETTINGS.defaultMarker;
            this.AppData.layerMarkers = false;
            await this.saveSettings();
        }
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
                    .map(
                        (marker): MarkerData => {
                            return {
                                type: marker.type,
                                id: marker.id,
                                loc: [marker.loc.lat, marker.loc.lng],
                                link: marker.link,
                                layer: marker.layer
                            };
                        }
                    )
            });
        });

        /** Only need to save maps with defined marker data */
        this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
            ({ markers }) => markers.length > 0
        );

        /** Remove maps that haven't been accessed in more than 1 week that are not associated with a file */
        this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
            ({ id, files, lastAccessed = Date.now() }) =>
                !id || files.length || Date.now() - lastAccessed <= 6.048e8
        );

        await this.saveData(this.AppData);

        this.AppData.markerIcons.forEach((marker) => {
            addIcon(marker.type, icon(getIcon(marker.iconName)).html[0]);
        });

        this.markerIcons = this.generateMarkerMarkup(this.AppData.markerIcons);

        this.maps.forEach((map) => {
            map.map.setMarkerIcons(this.markerIcons);
        });
    }
    getEditor(): CodeMirror.Editor {
        let view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            return view.sourceMode.cmEditor;
        }
        return null;
    }

    generateMarkerMarkup(
        markers: Marker[] = this.AppData.markerIcons
    ): MarkerIcon[] {
        let ret: MarkerIcon[] = markers.map(
            (marker): MarkerIcon => {
                if (!marker.transform) {
                    marker.transform = this.AppData.defaultMarker.transform;
                }
                if (!marker.iconName) {
                    marker.iconName = this.AppData.defaultMarker.iconName;
                }
                let html: string, iconNode: AbstractElement;

                if (this.AppData.layerMarkers) {
                    iconNode = icon(getIcon(marker.iconName), {
                        transform: marker.transform,
                        mask: getIcon(this.AppData.defaultMarker.iconName),
                        classes: ["full-width-height"]
                    }).abstract[0];
                } else {
                    iconNode = icon(getIcon(marker.iconName), {
                        classes: ["full-width-height"]
                    }).abstract[0];
                }

                iconNode.attributes = {
                    ...iconNode.attributes,
                    style: `color: ${
                        marker.color
                            ? marker.color
                            : this.AppData.defaultMarker.color
                    }`
                };

                html = toHtml(iconNode);

                return {
                    type: marker.type,
                    html: html
                };
            }
        );
        ret.unshift({
            type: "default",
            html: icon(getIcon(this.AppData.defaultMarker.iconName), {
                classes: ["full-width-height"],
                styles: {
                    color: this.AppData.defaultMarker.color
                }
            }).html[0]
        });

        return ret;
    }

    registerMapEvents(map: LeafletMap, view: MarkdownView) {
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
                map.markerIcons[0],
                map.map.mouseEventToLatLng(evt),
                file
            );
            marker.leafletInstance.closeTooltip();
        });

        this.registerEvent(
            map.on("bulk-edit-markers", () => {
                let bulkModal = new Modal(this.app);

                bulkModal.titleEl.setText("Bulk Edit Markers");

                const markersEl = bulkModal.contentEl.createDiv(
                    "bulk-edit-markers"
                );

                for (let marker of map.markers) {
                    let markerSetting = new Setting(
                        markersEl.createDiv("bulk-edit-marker-instance")
                    );
                    markerSetting
                        .addDropdown((d) => {
                            d.setValue(marker.type);
                        })
                        .addText((t) => {
                            t.setValue(`${marker.loc.lat}`);
                        })
                        .addText((t) => {
                            t.setValue(`${marker.loc.lng}`);
                        })
                        .addText((t) => {
                            t.setValue(`${marker.link}`);
                        })
                        .addExtraButton((b) =>
                            b.setIcon("trash").onClick(() => {})
                        );
                    /* markerEl.createSpan({
                        text:
                            marker.type == "default"
                                ? "Default"
                                : marker.type
                    });
                    markerEl.createSpan({
                        text: `${marker.loc.lat}`
                    });
                    markerEl.createSpan({
                        text: `${marker.loc.lng}`
                    });
                    markerEl.createSpan({
                        text: `${marker.link}`
                    }); */
                }

                bulkModal.open();
            })
        );

        this.registerEvent(
            map.on("marker-added", async (marker: LeafletMarker) => {
                marker.leafletInstance.closeTooltip();
                marker.leafletInstance.unbindTooltip();
                this.maps
                    .filter(
                        ({ id, view: mapView }) =>
                            id == map.id && view != mapView
                    )
                    .forEach((map) => {
                        map.map.addMarker(marker);
                    });
                await this.saveSettings();
            })
        );

        this.registerEvent(
            map.on("marker-dragging", (marker: LeafletMarker) => {
                this.maps
                    .filter(
                        ({ id, view: mapView }) =>
                            id == map.id && view != mapView
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
            map.on(
                "marker-data-updated",
                async (marker: LeafletMarker, old: any) => {
                    marker.leafletInstance.closeTooltip();
                    marker.leafletInstance.unbindTooltip();

                    await this.saveSettings();
                    this.maps
                        .filter(
                            ({ id, view: mapView }) =>
                                id == map.id && view != mapView
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
                }
            )
        );

        this.registerEvent(
            map.on("marker-click", async (link: string, newWindow: boolean) => {
                let internal = await this.app.metadataCache.getFirstLinkpathDest(
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
            })
        );

        this.registerEvent(
            map.on("marker-context", (marker) =>
                this.handleMarkerContext(map, view, marker)
            )
        );

        this.registerEvent(
            map.on(
                "marker-mouseover",
                async (evt: L.LeafletMouseEvent, marker: LeafletMarker) => {
                    let internal = await this.app.metadataCache.getFirstLinkpathDest(
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

                        map.tooltip.setContent(a);
                        marker.leafletInstance
                            .bindTooltip(map.tooltip, {
                                offset: new Point(
                                    0,
                                    -1 * el.getBoundingClientRect().height
                                )
                            })
                            .openTooltip();
                    } else {
                        if (this.AppData.notePreview) {
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
                            let el = evt.originalEvent.target as SVGElement;

                            map.tooltip.setContent(
                                marker.link
                                    .replace(/(\^)/, " > ^")
                                    .replace(/#/, " > ")
                                    .split("|")
                                    .pop()
                            );

                            marker.leafletInstance
                                .bindTooltip(map.tooltip, {
                                    offset: new Point(
                                        0,
                                        -1 * el.getBoundingClientRect().height
                                    )
                                })
                                .openTooltip();
                        }
                    }
                }
            )
        );

        this.registerEvent(
            map.on("display-distance", async (distance: string) => {
                new Notice(distance);
            })
        );

        this.registerEvent(
            map.on("map-contextmenu", (evt: LeafletMouseEvent) => {
                if (map.markerIcons.length <= 1) {
                    map.createMarker(map.markerIcons[0], evt.latlng);
                    return;
                }

                let contextMenu = new Menu(this.app);

                contextMenu.setNoIcon();
                map.markerIcons.forEach((marker: MarkerIcon) => {
                    if (!marker.type || !marker.html) return;
                    contextMenu.addItem((item) => {
                        item.setTitle(
                            marker.type == "default" ? "Default" : marker.type
                        );
                        item.setActive(true);
                        item.onClick(async () => {
                            map.createMarker(marker, evt.latlng);
                            await this.saveSettings();
                        });
                    });
                });

                contextMenu.showAtPosition({
                    x: evt.originalEvent.clientX,
                    y: evt.originalEvent.clientY
                } as Point);
            })
        );
    }
    handleMarkerContext(
        map: LeafletMap,
        view: MarkdownView,
        marker: LeafletMarker
    ) {
        let markerSettingsModal = new Modal(this.app);
        const otherMaps = this.maps.filter(
            ({ id, view: mapView }) => id == map.id && view != mapView
        );
        const markersToUpdate = [
            marker,
            ...otherMaps.map((map) =>
                map.map.markers.find((m) => m.id == marker.id)
            )
        ];

        let path = new Setting(markerSettingsModal.contentEl)
            .setName("Note to Open")
            .setDesc("Path of note to open")
            .addText((text) => {
                let files = this.app.vault.getFiles();

                /* const chooseSuggestions = (v: string) => {
                        
                    }; */

                text.setPlaceholder("Path").setValue(marker.link);
                let modal = new PathSuggestionModal(this.app, text, [...files]);

                modal.onClose = async () => {
                    markersToUpdate.forEach((marker) => {
                        marker.link = text.inputEl.value;
                    });
                    await this.saveSettings();
                };

                text.inputEl.onblur = async () => {
                    markersToUpdate.forEach((marker) => {
                        marker.link = text.inputEl.value;
                    });
                    await this.saveSettings();
                };
            });

        new Setting(markerSettingsModal.contentEl)
            .setName("Marker Type")
            .addDropdown((drop) => {
                drop.addOption("default", "Base Marker");
                this.AppData.markerIcons.forEach((marker) => {
                    drop.addOption(marker.type, marker.type);
                });
                drop.setValue(marker.type).onChange(async (value) => {
                    let newMarker =
                        value == "default"
                            ? this.AppData.defaultMarker
                            : this.AppData.markerIcons.find(
                                  (m) => m.type == value
                              );
                    let html: string,
                        iconNode: AbstractElement = icon(
                            getIcon(newMarker.iconName),
                            {
                                transform: { size: 6, x: 0, y: -2 },
                                mask: getIcon(
                                    this.AppData.defaultMarker.iconName
                                ),
                                classes: ["full-width-height"]
                            }
                        ).abstract[0];

                    iconNode.attributes = {
                        ...iconNode.attributes,
                        style: `color: ${
                            newMarker.color
                                ? newMarker.color
                                : this.AppData.defaultMarker.color
                        }`
                    };

                    html = toHtml(iconNode);
                    markersToUpdate.forEach((marker) => {
                        marker.type = newMarker.type;
                    });
                    await this.saveSettings();
                });
            });

        new Setting(markerSettingsModal.contentEl).addButton((b) => {
            b.setIcon("trash")
                .setWarning()
                .setTooltip("Delete Marker")
                .onClick(async () => {
                    map.group.group.removeLayer(marker.leafletInstance);
                    marker.leafletInstance.remove();
                    map.markers = map.markers.filter((m) => m.id != marker.id);
                    otherMaps.forEach((oM) => {
                        let otherMarker = oM.map.markers.find(
                            (m) => m.id == marker.id
                        );
                        oM.map.group.group.removeLayer(
                            otherMarker.leafletInstance
                        );
                        otherMarker.leafletInstance.remove();
                        oM.map.markers = oM.map.markers.filter(
                            (m) => m.id != marker.id
                        );
                    });
                    markerSettingsModal.close();
                    await this.saveSettings();
                });
            return b;
        });

        markerSettingsModal.open();
    }

    async toDataURL(url: string): Promise<string> {
        //determine link type
        try {
            let response, blob: Blob, mimeType: string;
            url = decodeURIComponent(url);
            if (/https?:/.test(url)) {
                //url
                response = await fetch(url);
                blob = await response.blob();
            } else if (/obsidian:\/\/open/.test(url)) {
                //obsidian link
                let [, filePath] = url.match(/\?vault=[\s\S]+?&file=([\s\S]+)/);

                filePath = decodeURIComponent(filePath);
                let file = this.app.vault.getAbstractFileByPath(filePath);
                if (!file || !(file instanceof TFile)) throw new Error();

                let buffer = await this.app.vault.readBinary(file);
                blob = new Blob([new Uint8Array(buffer)]);
            } else {
                //file exists on disk
                let file = this.app.metadataCache.getFirstLinkpathDest(
                    url.replace(/(\[|\])/g, ""),
                    ""
                );
                if (!file || !(file instanceof TFile)) throw new Error();

                mimeType =
                    lookupMimeType(file.extension) ||
                    "application/octet-stream";
                let buffer = await this.app.vault.readBinary(file);
                blob = new Blob([new Uint8Array(buffer)]);
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === "string") {
                        let base64 =
                            "data:" +
                            mimeType +
                            reader.result.slice(
                                reader.result.indexOf(";base64,")
                            );
                        resolve(base64);
                    } else {
                        new Notice(
                            "There was an error reading the image file."
                        );
                        reject();
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error(e);
            new Notice(`There was an error reading the image file: ${url}`);
        }
    }
}
