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
    BlockCache,
    HeadingCache
} from "obsidian";
import { LeafletMouseEvent, Point } from "leaflet";
import { getType as lookupMimeType } from "mime/lite";

//Local Imports
import "./main.css";

import { ObsidianLeafletSettingTab, DEFAULT_SETTINGS } from "./settings";
import { AbstractElement, icon, toHtml, getIcon } from "./utils/icons";

import LeafletMap from "./leaflet";
import {
    MapInterface,
    LeafletMarker,
    MarkerData,
    MarkerIcon,
    ObsidianAppData,
    Marker
} from "./@types";
import { SuggestionModal } from "./utils/modals";

export default class ObsidianLeaflet extends Plugin {
    AppData: ObsidianAppData;
    markerIcons: MarkerIcon[];
    maps: MapInterface[] = [];
    async onload(): Promise<void> {
        console.log("Loading Obsidian Leaflet");

        await this.loadSettings();

        if (!this.AppData.mapMarkers?.every((map) => map.file)) {
            this.AppData.mapMarkers = this.AppData.mapMarkers.map((map) => {
                if (!map.file)
                    map.file = map.path.slice(0, map.path.indexOf(".md") + 3);
                return map;
            });
        }
        this.markerIcons = this.generateMarkerMarkup(this.AppData.markerIcons);

        this.registerMarkdownCodeBlockProcessor(
            "leaflet",
            this.postprocessor.bind(this)
        );

        this.registerEvent(
            this.app.vault.on("delete", async (file) => {
                if (
                    this.AppData.mapMarkers.find((marker) =>
                        marker.path.includes(file.path)
                    )
                ) {
                    this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
                        (marker) =>
                            marker !=
                            this.AppData.mapMarkers.find((marker) =>
                                marker.path.includes(file.path)
                            )
                    );

                    await this.saveSettings();
                }
            })
        );

        this.addSettingTab(new ObsidianLeafletSettingTab(this.app, this));
    }

    async onunload(): Promise<void> {
        console.log("Unloading Obsidian Leaflet");
        this.maps.forEach((map) => {
            map?.map?.remove();
        });
        this.maps = [];
    }

    async postprocessor(
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        try {
            let layers = (
                source.match(/^\bimage\b:[\s\S]*?$/gm) || []
            ).map((p) => p.split(/(?:image):\s?/)[1]?.trim());

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
            if (layers.length > 1 && !id) {
                layers = [layers[0]];
                new Notice("A map with multiple layers must have an ID.");
            }
            if (layers.length) {
                image = layers[0];
            }

            let path = `${ctx.sourcePath}/${id ? id : image}`;
            let map = new LeafletMap(
                el,
                id,
                ctx.sourcePath,
                path,
                this.markerIcons,
                +minZoom,
                +maxZoom,
                +defaultZoom,
                +zoomDelta,
                unit,
                scale
            );

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
            this.maps = this.maps.filter((map) => map.view != view);

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
                (map) => map.path == path
            );

            await map.loadData(mapMarkers);

            if (image != "real") {
                if (!lat || isNaN(lat)) {
                    lat = 50;
                }
                if (!long || isNaN(lat)) {
                    long = 50;
                }
                coords = [+lat, +long];
                let layerData: {
                    data: string;
                    id: string;
                }[] = await Promise.all(
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
                map.renderImage(layerData, coords);
            } else {
                if (!lat || isNaN(lat)) {
                    lat = this.AppData.lat;
                }
                if (!long || isNaN(lat)) {
                    long = this.AppData.long;
                }
                coords = [lat, long];
                map.renderReal(coords);
            }

            this.registerMapEvents(map, view);
            this.maps.push({
                map: map,
                path: path,
                view: view,
                file: ctx.sourcePath
            });
            await this.saveSettings();

            /**
             * Markdown Block has been unloaded.
             *
             * First, remove the map element and its associated resize handler.
             *
             * Then, check to see if the file was deleted. If so, remove the map from AppData.
             *
             * Finally, check to see if the *markdown block* was deleted. If so, remove the map from AppData.
             */
            let markdownRenderChild = new MarkdownRenderChild(el);
            markdownRenderChild.containerEl = el;
            markdownRenderChild.register(async () => {
                try {
                    map.remove();
                } catch (e) {}

                let file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
                if (!file || !(file instanceof TFile)) {
                    //file was deleted, remove maps associated
                    this.maps = this.maps.filter(
                        (map) => map.file != ctx.sourcePath
                    );
                    this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
                        (map) => map.file != ctx.sourcePath
                    );

                    await this.saveSettings();
                    return;
                }
                let fileContent = await this.app.vault.read(file);

                let containsThisMap: boolean = false;
                containsThisMap = fileContent
                    .match(/```leaflet[\s\S]+?```/g)
                    ?.some((match) => {
                        return (
                            match.includes(image) ||
                            (!match.includes("image:") && image === "real") ||
                            match.includes(id)
                        );
                    });

                if (!containsThisMap) {
                    //Block was deleted or image path was changed
                    this.maps = this.maps.filter((map) => map.path != path);
                    this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
                        (map) => map.path != path
                    );

                    await this.saveSettings();
                }

                this.maps = this.maps.filter(
                    (map) => map.path != path && map.view !== view
                );
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
        if (!this.AppData.csvPath.length) {
            this.AppData.csvPath = this.manifest.dir;
        }
    }
    async saveSettings() {
        this.maps.forEach((map) => {
            this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
                (m) => m.path != map.path
            );

            this.AppData.mapMarkers.push({
                path: map.path,
                file: map.file,
                markers: map.map.markers.map(
                    (marker): MarkerData => {
                        return {
                            type: marker.marker.type,
                            id: marker.id,
                            loc: [marker.loc.lat, marker.loc.lng],
                            link: marker.link,
                            layer: marker.layer
                        };
                    }
                )
            });
        });

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
        let ret = markers.map((marker) => {
            if (!marker.transform) {
                marker.transform = this.AppData.defaultMarker.transform;
            }
            if (!marker.iconName) {
                marker.iconName = this.AppData.defaultMarker.iconName;
            }
            let html: string,
                iconNode: AbstractElement = icon(getIcon(marker.iconName), {
                    transform: marker.transform,
                    mask: getIcon(this.AppData.defaultMarker?.iconName),
                    classes: ["full-width-height"]
                }).abstract[0];

            iconNode.attributes = {
                ...iconNode.attributes,
                style: `color: ${
                    marker.color
                        ? marker.color
                        : this.AppData.defaultMarker?.color
                }`
            };

            html = toHtml(iconNode);

            return { type: marker.type, html: html };
        });
        if (this.AppData.defaultMarker.iconName) {
            ret.unshift({
                type: "default",
                html: icon(getIcon(this.AppData.defaultMarker.iconName), {
                    classes: ["full-width-height"],
                    styles: {
                        color: this.AppData.defaultMarker.color
                    }
                }).html[0]
            });
        }

        return ret;
    }

    async toDataURL(url: string): Promise<string> {
        //determine link type
        try {
            let response, blob: Blob, mimeType: string;
            url = decodeURIComponent(url);
            if (/http[s]*:/.test(url)) {
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
                let file = this.app.vault.getAbstractFileByPath(url);
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
            new Notice(`There was an error reading the image file: ${url}`);
        }
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
            map.on("marker-added", async (marker: LeafletMarker) => {
                marker.leafletInstance.closeTooltip();
                marker.leafletInstance.unbindTooltip();
                await this.saveSettings();

                this.maps
                    .filter((m) => m.path == map.path && m.view != view)
                    .forEach((map) => {
                        map.map.addMarker(marker);
                    });
            })
        );
        this.registerEvent(
            map.on("marker-dragging", (marker: LeafletMarker) => {
                this.maps
                    .filter((m) => m.path == map.path && m.view != view)
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
            map.on("marker-data-updated", async (marker: LeafletMarker) => {
                marker.leafletInstance.closeTooltip();
                marker.leafletInstance.unbindTooltip();
                await this.saveSettings();

                this.maps
                    .filter((m) => m.path == map.path && m.view != view)
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
            map.on("marker-click", (link: string, newWindow: boolean) => {
                /* if (!/^.*\.(md)$/.test(link)) link += ".md"; */

                let file = this.app.metadataCache.getFirstLinkpathDest(
                    link.split(/[\^#]/).shift(),
                    ""
                );

                let name = file?.basename || link.split(/(?=[\^#])/).shift();

                if (/(?=[\^#])/.test(link)) {
                    name += link.split(/(?=[\^#])/).pop();
                }
                this.app.workspace
                    .openLinkText(
                        name,
                        file?.path || link.split(/(?=[\^#])/).shift(),
                        newWindow
                    )
                    .then(() => {
                        var cmEditor = this.getEditor();
                        cmEditor.focus();
                    });
            })
        );

        this.registerEvent(
            map.on("marker-context", async (marker: LeafletMarker) => {
                let markerSettingsModal = new Modal(this.app);
                const otherMaps = this.maps.filter(
                    (m) => m.path == map.path && m.view != view
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
                        let file: TFile,
                            headings: HeadingCache[],
                            blocks: Record<string, BlockCache>;

                        let current: "files" | "headings" | "blocks" = "files";

                        const chooseSuggestions = (v: string) => {
                            if (/#/.test(v)) {
                                if (current === "headings") return;
                                current = "headings";
                                file = this.app.metadataCache.getFirstLinkpathDest(
                                    v.split("#").shift(),
                                    ""
                                );

                                ({
                                    headings
                                } = this.app.metadataCache.getFileCache(
                                    file
                                ) || { headings: [] });

                                if (!headings || !headings.length)
                                    headings = [];

                                modal.modifyInput = (input) =>
                                    input.split("#").pop();
                                modal.setSuggestions(headings);
                            } else if (/\^/.test(v)) {
                                if (current === "blocks") return;
                                current = "blocks";
                                file = this.app.metadataCache.getFirstLinkpathDest(
                                    v.split("^").shift(),
                                    ""
                                );
                                ({
                                    blocks
                                } = this.app.metadataCache.getFileCache(
                                    file
                                ) || { blocks: {} });
                                let blockValues = Object.values(blocks);
                                modal.modifyInput = (input) =>
                                    input.split("^").pop();
                                modal.setSuggestions(blockValues);
                            } else if (current != "files") {
                                current = "files";
                                modal.modifyInput = (i) => i;
                                modal.setSuggestions(files);
                            }
                        };

                        text.setPlaceholder("Path").setValue(marker.link);
                        let modal = new SuggestionModal<
                            TFile | BlockCache | HeadingCache
                        >(this.app, text.inputEl, [...files]);

                        text.inputEl.onblur = async () => {
                            markersToUpdate.forEach((marker) => {
                                marker.link = text.inputEl.value;
                            });
                            await this.saveSettings();
                        };

                        chooseSuggestions(text.inputEl.value);

                        modal.createPrompt([
                            createSpan({
                                cls: "prompt-instruction-command",
                                text: "Type #"
                            }),
                            createSpan({ text: "to link heading" })
                        ]);
                        modal.createPrompt([
                            createSpan({
                                cls: "prompt-instruction-command",
                                text: "Type ^"
                            }),
                            createSpan({ text: "to link blocks" })
                        ]);
                        modal.createPrompt([
                            createSpan({
                                cls: "prompt-instruction-command",
                                text: "Note: "
                            }),
                            createSpan({
                                text: "Blocks must have been created already"
                            })
                        ]);

                        text.onChange((v) => {
                            chooseSuggestions(v);
                        });

                        modal.getItemText = (item) => {
                            if (item instanceof TFile) return item.path;
                            if (
                                Object.prototype.hasOwnProperty.call(
                                    item,
                                    "heading"
                                )
                            ) {
                                return (<HeadingCache>item).heading;
                            }
                            if (
                                Object.prototype.hasOwnProperty.call(item, "id")
                            ) {
                                return (<BlockCache>item).id;
                            }
                        };

                        modal.onChooseItem = (item) => {
                            if (item instanceof TFile) {
                                text.setValue(item.basename);
                                file = item;
                                ({
                                    headings,
                                    blocks
                                } = this.app.metadataCache.getFileCache(file));
                            } else if (
                                Object.prototype.hasOwnProperty.call(
                                    item,
                                    "heading"
                                )
                            ) {
                                text.setValue(
                                    file.basename +
                                        "#" +
                                        (<HeadingCache>item).heading
                                );
                            } else if (
                                Object.prototype.hasOwnProperty.call(item, "id")
                            ) {
                                text.setValue(
                                    file.basename + "^" + (<BlockCache>item).id
                                );
                            }
                        };

                        modal.renderSuggestion = (result, el) => {
                            let { item, match: matches } = result || {};
                            let content = el.createDiv({
                                cls: "suggestion-content"
                            });
                            if (!item) {
                                content.setText(modal.emptyStateText);
                                content.parentElement.addClass("is-selected");
                                return;
                            }

                            if (item instanceof TFile) {
                                let pathLength =
                                    item.path.length - item.name.length;
                                const matchElements = matches.matches.map(
                                    (m) => {
                                        return createSpan(
                                            "suggestion-highlight"
                                        );
                                    }
                                );
                                for (
                                    let i = pathLength;
                                    i <
                                    item.path.length -
                                        item.extension.length -
                                        1;
                                    i++
                                ) {
                                    let match = matches.matches.find(
                                        (m) => m[0] === i
                                    );
                                    if (match) {
                                        let element =
                                            matchElements[
                                                matches.matches.indexOf(match)
                                            ];
                                        content.appendChild(element);
                                        element.appendText(
                                            item.path.substring(
                                                match[0],
                                                match[1]
                                            )
                                        );

                                        i += match[1] - match[0] - 1;
                                        continue;
                                    }

                                    content.appendText(item.path[i]);
                                }
                                el.createDiv({
                                    cls: "suggestion-note",
                                    text: item.path
                                });
                            } else if (
                                Object.prototype.hasOwnProperty.call(
                                    item,
                                    "heading"
                                )
                            ) {
                                content.setText((<HeadingCache>item).heading);
                                content.prepend(
                                    createSpan({
                                        cls: "suggestion-flair",
                                        text: `H${(<HeadingCache>item).level}`
                                    })
                                );
                            } else if (
                                Object.prototype.hasOwnProperty.call(item, "id")
                            ) {
                                content.setText((<BlockCache>item).id);
                            }
                        };

                        modal.selectSuggestion = async ({ item }) => {
                            let link: string;
                            if (item instanceof TFile) {
                                link = item.basename;
                            } else if (
                                Object.prototype.hasOwnProperty.call(
                                    item,
                                    "heading"
                                )
                            ) {
                                link =
                                    file.basename +
                                    "#" +
                                    (<HeadingCache>item).heading;
                            } else if (
                                Object.prototype.hasOwnProperty.call(item, "id")
                            ) {
                                link =
                                    file.basename + "^" + (<BlockCache>item).id;
                            }
                            markersToUpdate.forEach((marker) => {
                                marker.link = link;
                            });
                            text.setValue(link);
                            modal.close();
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
                        drop.setValue(marker.marker.type).onChange(
                            async (value) => {
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
                                                this.AppData.defaultMarker
                                                    ?.iconName
                                            ),
                                            classes: ["full-width-height"]
                                        }
                                    ).abstract[0];

                                iconNode.attributes = {
                                    ...iconNode.attributes,
                                    style: `color: ${
                                        newMarker.color
                                            ? newMarker.color
                                            : this.AppData.defaultMarker?.color
                                    }`
                                };

                                html = toHtml(iconNode);
                                markersToUpdate.forEach((marker) => {
                                    marker.marker = {
                                        type: newMarker.type,
                                        html: html
                                    };
                                });
                                await this.saveSettings();
                            }
                        );
                    });

                new Setting(markerSettingsModal.contentEl).addButton((b) => {
                    b.setIcon("trash")
                        .setWarning()
                        .setTooltip("Delete Marker")
                        .onClick(async () => {
                            map.group.group.removeLayer(marker.leafletInstance);
                            marker.leafletInstance.remove();
                            map.markers = map.markers.filter(
                                (m) => m.id != marker.id
                            );
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
            })
        );

        this.registerEvent(
            map.on(
                "marker-mouseover",
                async (evt: L.LeafletMouseEvent, marker: LeafletMarker) => {
                    if (this.AppData.notePreview) {
                        marker.leafletInstance.unbindTooltip();
                        let link = marker.link;

                        let file = this.app.metadataCache.getFirstLinkpathDest(
                            link.split(/[\^#]/).shift(),
                            ""
                        );

                        this.app.workspace.trigger(
                            "link-hover",
                            this,
                            marker.leafletInstance.getElement(),
                            link,
                            file?.path || link
                        );
                    } else {
                        let el = evt.originalEvent.target as SVGElement;
                        map.tooltip.setContent(marker.link.split("/").pop());
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
                        item.onClick(() =>
                            map.createMarker(marker, evt.latlng)
                        );
                    });
                });

                contextMenu.showAtPosition({
                    x: evt.originalEvent.clientX,
                    y: evt.originalEvent.clientY
                } as Point);
            })
        );
    }
}
