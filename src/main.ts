import {
    Notice,
    MarkdownView,
    MarkdownPostProcessorContext,
    setIcon,
    Plugin
} from "obsidian";
import { latLng, Circle } from "leaflet";

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
    getMarkerIcon
} from "./utils";
import {
    IMapInterface,
    ILeafletMarker,
    IMarkerData,
    IMarkerIcon,
    IObsidianAppData,
    IMarker,
    Marker,
    LeafletMap,
    Length
} from "./@types";
import { MarkerContextModal } from "./modals";

import { LeafletRenderer } from "./leaflet";
import { markerDivIcon } from "./map";

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

        /* this.escapeScope = new Scope();
        this.escapeScope.register(undefined, "Escape", () => {
            const { map } = this.maps.find(({ map }) => map.isDrawing) ?? {};

            if (map && !map.isFullscreen) {
                map.stopDrawing();

                this.app.keymap.popScope(this.escapeScope);
            }
        }); */
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
                id = undefined,
                scale = 1,
                unit = "m",
                distanceMultiplier = 1,
                darkMode = "false",
                image = "real",
                layers = [],
                overlay = [],
                overlayColor = "blue"
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
                darkMode: darkMode === "true",
                overlayColor: overlayColor
            });
            const map = renderer.map;

            let { markers: immutableMarkers, overlays: immutableOverlays } =
                await getImmutableItems(
                    /* source */
                    this.app,
                    params.marker as string[],
                    params.commandMarker as string[],
                    params.markerTag as string[][],
                    params.markerFile as string[],
                    params.markerFolder as string[],
                    params.overlayTag,
                    params.overlayColor
                );
            for (let [
                type,
                lat,
                long,
                link,
                layer = layers[0],
                command = false
            ] of immutableMarkers) {
                map.createMarker(
                    this.markerIcons.find(({ type: t }) => t == type),
                    latLng([Number(lat), Number(long)]),
                    link?.trim(),
                    undefined,
                    layer,
                    false,
                    command
                );
            }
            for (let [color, loc, length, desc] of [
                ...overlay,
                ...immutableOverlays
            ]) {
                const match = length.match(/^(\d+)\s?(\w*)/);
                if (!match || isNaN(Number(match[1]))) {
                    throw new Error(
                        "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`."
                    );
                }
                const [, radius, unit = "m"] = match;
                map.addOverlay(
                    {
                        radius: Number(radius),
                        loc: loc,
                        color: color,
                        unit: unit as Length,
                        layer: layers[0],
                        desc: desc
                    },
                    false
                );
            }

            let coords: [number, number] = [undefined, undefined];
            let err: boolean = false;
            try {
                coords = [
                    Number(`${lat}`?.split("%").shift()),
                    Number(`${long}`?.split("%").shift())
                ];
            } catch (e) {
                err = true;
            }

            if (err || isNaN(coords[0]) || isNaN(coords[1])) {
                new Notice(
                    "There was an error with the provided latitude and longitude. Using defaults."
                );
            }

            let mapData = this.AppData.mapMarkers.find(
                ({ id: mapId }) => mapId == id
            );

            await map.loadData(mapData);

            let layerData: {
                data: string;
                id: string;
            }[] = [];

            if (image != "real") {
                if (!lat || isNaN(coords[0])) {
                    coords[0] = 50;
                }
                if (!long || isNaN(coords[1])) {
                    coords[1] = 50;
                }

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
                    throw new Error();
                }
            } else {
                if (!lat || isNaN(coords[0])) {
                    coords[0] = this.AppData.lat;
                }
                if (!long || isNaN(coords[1])) {
                    coords[1] = this.AppData.long;
                }
            }

            this.registerMapEvents(map);

            map.render({
                coords: coords,
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

            map.on("rendered", () => {
                if (layerData.length > 1)
                    map.loadAdditionalMapLayers(layerData.slice(1));
            });

            await this.saveSettings();
        } catch (e) {
            console.error(e);
            new Notice("There was an error loading the map.");
            let newPre = createEl("pre");
            newPre.createEl("code", {}, (code) => {
                code.innerText = `\`\`\`leaflet
There was an error rendering the map:

${e.message}
\`\`\``;
                el.parentElement.replaceChild(newPre, el);
            });
        }
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
                            link: marker.link,
                            layer: marker.layer,
                            command: marker.command || false,
                            zoom: marker.zoom ?? 0
                        };
                    }),
                overlays: map.map.overlays
                    .filter(({ mutable }) => mutable)
                    .map((overlay) => {
                        if (overlay.leafletInstance instanceof Circle) {
                            return {
                                radius: overlay.radius,
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
            map.map.updateMarkerIcons(this.markerIcons);
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
                map.markerIcons[0],
                map.map.mouseEventToLatLng(evt),
                file
            );
            marker.leafletInstance.closeTooltip();
        });

        this.registerEvent(
            map.on("marker-added", async (marker: ILeafletMarker) => {
                marker.leafletInstance.closeTooltip();
                marker.leafletInstance.unbindTooltip();
                this.maps
                    .filter(
                        ({ id, map: m }) =>
                            id == map.id && m.contentEl != map.contentEl
                    )
                    .forEach((map) => {
                        map.map.addMarker(marker);
                    });
                await this.saveSettings();
            })
        );

        this.registerEvent(
            map.on("marker-dragging", (marker: ILeafletMarker) => {
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
            map.on(
                "marker-data-updated",
                async (marker: ILeafletMarker, old: any) => {
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
                }
            )
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
                async (evt: L.LeafletMouseEvent, marker: ILeafletMarker) => {
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
                                marker.link
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
                    m.icon = map.markerIcons.find(
                        (i) => i.type === markerSettingsModal.tempMarker.type
                    );

                    m.command = markerSettingsModal.tempMarker.command;
                });
                await this.saveSettings();
            }
        };

        markerSettingsModal.open();
    }
}
