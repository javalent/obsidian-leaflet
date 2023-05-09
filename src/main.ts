/* import "leaflet"; */
import "../node_modules/leaflet/dist/leaflet.css";
import "./assets/main.css";
import { Creature } from "../../obsidian-initiative-tracker/src/utils/creature";

import {
    Notice,
    MarkdownPostProcessorContext,
    Plugin,
    TFile,
    addIcon,
    Platform,
    WorkspaceLeaf,
    debounce,
    HoverParent,
    EphemeralState,
    HoverPopover
} from "obsidian";
import { around } from "monkey-around";

//Local Imports

import { ObsidianLeafletSettingTab } from "./settings/settings";

import {
    getIcon,
    DEFAULT_SETTINGS,
    getParamsFromSource,
    getMarkerIcon,
    DESCRIPTION_ICON,
    DESCRIPTION_ICON_SVG,
    log,
    BULLSEYE,
    BULLSEYE_ICON_SVG,
    VIEW_ICON_SVG,
    VIEW_ICON,
    VIEW_TYPE,
    MODIFIER_KEY,
    UNIT_SYSTEM,
    DEFAULT_TILE_SERVER,
    getId,
    OBSIDIAN_LEAFLET_POPOVER_SOURCE
} from "./utils";
import {
    MapInterface,
    MarkerIcon,
    ObsidianAppData,
    Icon,
    Marker,
    BaseMapType
} from "../types";

import { LeafletRenderer } from "./renderer/renderer";
import { markerDivIcon } from "./map/divicon";
import { InitiativeMapView } from "./initiative/initiative";
import t from "./l10n/locale";
import { CreateMarkerModal } from "./modals";
import { LeafletMapView } from "./map/view";
import { Length } from "convert/dist/types/units";

//add commands to app interface

import type { Plugins } from "../../obsidian-overload/index";

declare module "obsidian" {
    interface HoverPopover {
        targetEl: HTMLElement;
        onShow(): void;
    }
    interface EphemeralState {
        focus?: boolean;
        subpath?: string;
        line?: number;
        startLoc?: Loc;
        endLoc?: Loc;
        scroll?: number;
        source?: string;
    }
    interface InternalPlugin {
        disable(): void;
        enable(): void;
        enabled: boolean;
        _loaded: boolean;
        instance: { name: string; id: string };
    }
    interface InternalPlugins {
        "page-preview": InternalPlugin;
    }
    interface App {
        //@ts-ignore
        plugins: {
            getPlugin<T extends keyof Plugins>(plugin: T): Plugins[T];
        };
        internalPlugins: {
            plugins: InternalPlugins;
            getPluginById<T extends keyof InternalPlugins>(
                id: T
            ): InternalPlugins[T];
        };

        commands: {
            commands: { [id: string]: Command };
            editorCommands: { [id: string]: Command };
            findCommand(id: string): Command;
            executeCommandById(id: string): void;
            listCommands(): Command[];
            executeCommandById(id: string): void;
            findCommand(id: string): Command;
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
    interface Vault {
        //@ts-ignore
        config: {
            theme: "moonstone" | "obsidian";
        };
    }
    interface Workspace {
        on(
            name: "initiative-tracker:unload",
            callback: (...args: any) => any
        ): EventRef;
    }
}

export default class ObsidianLeaflet extends Plugin {
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
    get view() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof LeafletMapView)
            return leaf.view;
    }

    get initiativeView() {
        const leaves = this.app.workspace.getLeavesOfType(
            "INITIATIVE_TRACKER_MAP_VIEW"
        );
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof InitiativeMapView)
            return leaf.view;
    }

    get defaultUnit() {
        if (this.data.defaultUnitType === "imperial") return "mi";
        return "km";
    }

    unitSystemForUnit(unit: Length) {
        if (!unit) return this.data.defaultUnitType;
        return (
            (UNIT_SYSTEM[unit] as "metric" | "imperial") ??
            this.data.defaultUnitType
        );
    }

    async onload(): Promise<void> {
        console.log(t("Loading Obsidian Leaflet v%1", this.manifest.version));
        await this.loadSettings();

        addIcon(DESCRIPTION_ICON, DESCRIPTION_ICON_SVG);
        addIcon(BULLSEYE, BULLSEYE_ICON_SVG);
        addIcon(VIEW_ICON, VIEW_ICON_SVG);

        if (this.data.mapViewEnabled) {
            this.addRibbonIcon(VIEW_ICON, t("Open Leaflet Map"), (evt) => {
                this.app.workspace
                    .getLeaf(evt.getModifierState(MODIFIER_KEY))
                    .setViewState({ type: VIEW_TYPE });
            });

            this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => {
                return new LeafletMapView(leaf, this);
            });
        }

        this.app.workspace.onLayoutReady(() => {
            this.patchLinkHover();

            this.registerEvent(
                this.app.vault.on("rename", async (file, oldPath) => {
                    if (!file) return;
                    if (!this.mapFiles.find(({ file: f }) => f === oldPath))
                        return;

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

            this.registerHoverLinkSource(this.manifest.id, {
                display: this.manifest.name,
                defaultMod: false
            });
            //@ts-ignore
            if (this.app.plugins.getPlugin("initiative-tracker")) {
                this.registerView(
                    "INITIATIVE_TRACKER_MAP_VIEW",
                    (leaf: WorkspaceLeaf) => {
                        return new InitiativeMapView(leaf, this);
                    }
                );
            }

            this.registerEvent(
                this.app.workspace.on("initiative-tracker:unload", () => {
                    if (this.initiativeView) {
                        this.initiativeView.leaf.detach();
                    }
                })
            );
        });

        this.markerIcons = this.generateMarkerMarkup(this.data.markerIcons);
        this.registerMarkdownCodeBlockProcessor(
            "leaflet",
            this.postprocessor.bind(this)
        );

        this.addSettingTab(new ObsidianLeafletSettingTab(this.app, this));
    }
    patchLinkHover() {
        const plugin = this;
        const pagePreviewPlugin =
            this.app.internalPlugins.plugins["page-preview"];
        if (!pagePreviewPlugin.enabled) return;
        const uninstaller = around(HoverPopover.prototype, {
            onShow(old: Function) {
                return function () {
                    if (
                        this.parent?.state?.source ==
                        OBSIDIAN_LEAFLET_POPOVER_SOURCE
                    ) {
                        this.hoverEl.addClass("obsidian-leaflet-popover");
                    }
                    return old.call(this);
                };
            }
        });
        this.register(uninstaller);

        // This will recycle the event handlers so that they pick up the patched onLinkHover method
        pagePreviewPlugin.disable();
        pagePreviewPlugin.enable();

        plugin.register(function () {
            if (!pagePreviewPlugin.enabled) return;
            pagePreviewPlugin.disable();
            pagePreviewPlugin.enable();
        });
    }

    async onunload(): Promise<void> {
        console.log(t("Unloading Obsidian Leaflet"));

        this.maps.forEach((map) => {
            map?.map?.remove();
            let newPre = createEl("pre");
            newPre.createEl("code", {}, (code) => {
                code.innerText = `\`\`\`leaflet\n${map.source}\`\`\``;
                map.el.parentElement.replaceChild(newPre, map.el);
            });
        });

        if (this.view) {
            this.view.leaf.detach();
        }

        if (this.initiativeView) {
            this.initiativeView.leaf.detach();
        }

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

        if (!params.id) {
            new Notice(t("Obsidian Leaflet maps must have an ID."));
            throw new Error(t("ID required"));
        }
        log(params.verbose, params.id, "Beginning Markdown Postprocessor.");

        const renderer = new LeafletRenderer(
            this,
            ctx.sourcePath,
            el,
            params,
            source
        );
        const map = renderer.map;

        this.registerMapEvents(map);

        ctx.addChild(renderer);

        /** Add Map to Map Store
         */
        this.maps = this.maps.filter((m) => m.el != el);
        this.maps.push({
            map,
            source,
            el,
            id: params.id
        });

        if (this.mapFiles.find(({ file }) => file == ctx.sourcePath)) {
            this.mapFiles
                .find(({ file }) => file == ctx.sourcePath)
                .maps.push(params.id);
        } else {
            this.mapFiles.push({
                file: ctx.sourcePath,
                maps: [params.id]
            });
        }

        /* } catch (e) {
            console.error(e);
            new Notice("There was an error loading the map.");
            renderError(el, e.message);
        } */
    }
    get configDirectory() {
        if (!this.data.configDirectory) return;
        return `${this.data.configDirectory}/plugins/obsidian-leaflet-plugin`;
    }
    get configFilePath() {
        if (!this.data.configDirectory) return;
        return `${this.configDirectory}/data.json`;
    }
    async loadSettings() {
        this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        if (
            this.configDirectory &&
            (await this.app.vault.adapter.exists(this.configFilePath))
        ) {
            this.data = Object.assign(
                {},
                this.data,
                JSON.parse(
                    await this.app.vault.adapter.read(this.configFilePath)
                )
            );
        }

        if (
            this.data.version?.major != null &&
            this.data.version?.major < 5 &&
            (this.data.defaultTile.contains("openstreetmap") ||
                this.data.defaultTileDark.contains("openstreetmap"))
        ) {
            new Notice(
                createFragment((e) => {
                    e.createSpan({
                        text: "Obsidian Leaflet: OpenStreetMap has restricted the use of its tile server in Obsidian."
                    });
                    e.createEl("br");
                    e.createEl("br");
                    e.createSpan({
                        text: "Going forward, the default tile server will be "
                    });
                    e.createEl("a", {
                        href: "http://maps.stamen.com/#terrain/12/37.7706/-122.3782",
                        text: "Stamen Terrain"
                    });
                    e.createSpan({ text: "." });
                }),
                0
            );
            if (this.data.defaultTile.contains("openstreetmap")) {
                this.data.defaultTile = DEFAULT_TILE_SERVER;
            }
            if (this.data.defaultTileDark.contains("openstreetmap")) {
                this.data.defaultTileDark = DEFAULT_TILE_SERVER;
            }
        }
        this.data.previousVersion = this.manifest.version;
        const splitVersion = this.data.previousVersion.split(".");
        this.data.version = {
            major: Number(splitVersion[0]),
            minor: Number(splitVersion[1]),
            patch: Number(splitVersion[2])
        };
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
    saveSettings = debounce(
        async () => {
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
                ({ markers, overlays, shapes }) =>
                    markers.length > 0 ||
                    overlays.length > 0 ||
                    shapes.length > 0
            );

            await this.saveData(this.data);
        },
        100,
        false
    );

    async saveMarkerTypes() {
        await this.saveSettings();
        this.markerIcons = this.generateMarkerMarkup(this.data.markerIcons);

        this.maps.forEach((map) => {
            map.map.updateMarkerIcons();
        });
    }

    async saveData(data: Record<any, any>) {
        if (this.configDirectory) {
            try {
                if (
                    !(await this.app.vault.adapter.exists(this.configDirectory))
                ) {
                    await this.app.vault.adapter.mkdir(this.configDirectory);
                }
                await this.app.vault.adapter.write(
                    this.configFilePath,
                    JSON.stringify(data)
                );
            } catch (e) {
                console.error(e);
                new Notice(
                    t(
                        "There was an error saving into the configured directory."
                    )
                );
            }
        }
        await super.saveData(data);
    }

    registerMapEvents(map: BaseMapType) {
        this.registerDomEvent(map.contentEl, "dragover", (evt) => {
            evt.preventDefault();
        });
        this.registerDomEvent(map.contentEl, "drop", (evt) => {
            evt.stopPropagation();
            let link = decodeURIComponent(
                evt.dataTransfer.getData("text/plain")
            )
                .split("file=")
                .pop();

            const extension = /\.\w+$/.test(link) ? "" : ".md";

            const file = this.app.vault.getAbstractFileByPath(
                `${link}${extension}`
            );

            if (!(file instanceof TFile)) return;

            const latlng = map.leafletInstance.mouseEventToLatLng(evt);
            const loc: [number, number] = [latlng.lat, latlng.lng];

            let marker = map.createMarker(
                map.defaultIcon.type,
                loc,
                undefined,
                undefined,
                file.basename
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

    public parseIcon(icon: Icon): MarkerIcon {
        if (!icon.transform) {
            icon.transform = this.data.defaultMarker.transform;
        }
        if (!icon.iconName) {
            icon.iconName = this.data.defaultMarker.iconName;
        }
        const params =
            icon.layer && !this.data.defaultMarker.isImage
                ? {
                      transform: icon.transform,
                      mask: getIcon(this.data.defaultMarker.iconName)
                  }
                : {};
        let node = getMarkerIcon(icon, {
            ...params,
            classes: ["full-width-height"]
        }).node as HTMLElement;
        node.style.color = icon.color
            ? icon.color
            : this.data.defaultMarker.color;
        node.style.opacity = `${
            icon.alpha ?? this.data.defaultMarker.alpha ?? 1
        }`;
        return {
            type: icon.type,
            html: node.outerHTML,
            icon: markerDivIcon({
                html: node.outerHTML,
                className: `leaflet-div-icon`
            }),
            markerIcon: icon
        };
    }
    public generateMarkerMarkup(
        markers: Icon[] = this.data.markerIcons
    ): MarkerIcon[] {
        let ret: MarkerIcon[] = markers.map(
            (marker): MarkerIcon => this.parseIcon(marker)
        );
        const defaultHtml = getMarkerIcon(this.data.defaultMarker, {
            classes: ["full-width-height"],
            styles: {
                color: this.data.defaultMarker.color,
                opacity: `${this.data.defaultMarker.alpha ?? 1}`
            },
            maskId: `leaflet-mask-${getId()}`
        }).html;
        ret.unshift({
            type: "default",
            html: defaultHtml,
            icon: markerDivIcon({
                html: defaultHtml,
                className: `leaflet-div-icon`
            }),
            markerIcon: this.data.defaultMarker
        });

        return ret;
    }

    public getIconForTag(tags: Set<string>) {
        return this.data.markerIcons.find((icon) =>
            (
                (icon.tags ?? []).filter((t) =>
                    tags.has(`${t[0] == "#" ? "" : "#"}${t}`)
                ) ?? []
            ).shift()
        )?.type;
    }
    public getIconForType(type: string) {
        return (
            this.data.markerIcons.find((i) => i.type == type) ??
            this.data.defaultMarker
        );
    }
    public createNewMarkerType(options?: {
        original?: Icon;
        layer?: boolean;
        name?: string;
    }): Promise<Icon | void> {
        return new Promise((resolve) => {
            let newMarker: Icon = options?.original ?? {
                type: options?.name ?? "",
                iconName: null,
                color:
                    options?.layer ?? this.data.layerMarkers
                        ? this.data.defaultMarker.color
                        : this.data.color,
                alpha: 1,
                layer: options?.layer ?? this.data.layerMarkers,
                transform: this.data.defaultMarker.transform,
                isImage: false,
                imageUrl: "",
                tags: [],
                minZoom: null,
                maxZoom: null
            };
            let newMarkerModal = new CreateMarkerModal(
                this.app,
                this,
                newMarker
            );
            newMarkerModal.open();
            newMarkerModal.onClose = async () => {
                if (newMarkerModal.saved) resolve(newMarker);
                resolve();
            };
        });
    }

    public async openInitiativeView(
        players?: Creature[],
        creatures?: Creature[]
    ) {
        if (!this.initiativeView) {
            const bool = this.app.workspace
                .getLayout()
                .main.children.filter((c: any) => c?.state?.type != "empty");

            const leaf = this.app.workspace.getLeaf(bool.length > 0);

            await leaf.open(
                new InitiativeMapView(leaf, this, players, creatures)
            );
        } else {
            this.initiativeView.addPlayers(...players);
            this.initiativeView.addCreatures(...creatures);
        }

        if (!this.initiativeView) {
            new Notice("There was an error opening the initiative map view.");
            return;
        }
    }
}
