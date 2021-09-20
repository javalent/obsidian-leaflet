import { Menu, Notice, WorkspaceLeaf } from "obsidian";
import {
    BaseMapType,
    ImageLayerData,
    MarkerDivIconOptions,
    ObsidianLeaflet
} from "src/@types";
import { FontAwesomeControl } from "src/controls/controls";
import t from "src/l10n/locale";
import { Marker } from "src/layer";
import { MarkerDivIcon } from "src/map";
import { LeafletRenderer } from "src/renderer/renderer";
import { DEFAULT_BLOCK_PARAMETERS, StatusMap } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Creature } from "../../../obsidian-initiative-tracker/src/utils/creature";
import { ImageMap } from "../map/map";
import { LeafletMapView } from "../map/view";

const L = window[LeafletSymbol];

import GridImage from "./1-Inch-Grid-Paper-Template.png";

export class InitiativeMapView extends LeafletMapView {
    constructor(
        public leaf: WorkspaceLeaf,
        public plugin: ObsidianLeaflet,
        public players: Creature[] = [],
        public creatures: Creature[] = []
    ) {
        super(leaf, plugin);
    }
    get params() {
        return {
            ...DEFAULT_BLOCK_PARAMETERS,
            id: "initiative-tracker-map",
            height: "100%",
            isMapView: false,
            isInitiativeView: true
        };
    }

    async onOpen() {
        this.renderer = new InitiativeRenderer(this);

        this.context.addChild(this.renderer);
    }
    update() {
        this.renderer.unload();

        this.renderer = new InitiativeRenderer(this);
        this.context.addChild(this.renderer);
    }
    getDisplayText() {
        return "Initiative Tracker Map";
    }
    getViewType() {
        return "INITIATIVE_TRACKER_MAP_VIEW";
    }
    setPlayers(...players: Creature[]) {
        this.players = players;
    }

    addPlayers(...players: Creature[]) {
        this.players.push(...players);
    }

    setCreatures(...creatures: Creature[]) {
        this.creatures = creatures;
    }
    addCreatures(...creatures: Creature[]) {
        this.creatures.push(...creatures);
    }
}
export class InitiativeRenderer extends LeafletRenderer {
    map: InitiativeMap;

    constructor(public view: InitiativeMapView) {
        super(view.plugin, "", view.mapEl, view.params);

        this.registerEvent(
            this.plugin.app.workspace.on(
                "initiative-tracker:new-encounter",
                () => {
                    this.map.removeCreature(
                        ...this.view.players,
                        ...this.view.creatures
                    );
                    this.loadSavedData();
                }
            )
        );
        /* this.registerEvent(
            this.plugin.app.workspace.on(
                'initiative-tracker:reset-encounter', () => {
                    this.view.players.forEach(p => {
                        this.map.
                    })
                }
            )
        ) */
    }

    async buildMap() {
        this.map = new InitiativeMap(this, this.options);
        const { h, w } = await this.loader.getImageDimensions(GridImage);
        this.map.gridLayer = {
            data: GridImage,
            h,
            w,
            id: "grid-layer",
            alias: null
        };
        this.map.registerLayerToBuild(this.map.gridLayer);

        this.map.on("removed", () => this.resize.disconnect());

        this.map.render({
            coords: [50, 50],
            zoomDistance: null,
            imageOverlayData: []
        });

        this.loadSavedData();
    }
    loadSavedData() {
        let center = this.map.leafletInstance.getCenter();
        let index = -1 * (this.view.players.length / 2) + 0.5;
        for (let player of this.view.players) {
            let latlng = L.latLng(center.lat - 1, center.lng + index);
            this.map.addCreature({ latlng, creature: player });
            index++;
        }
        index = -1 * (this.view.creatures.length / 2) + 0.5;
        for (let player of this.view.creatures) {
            let latlng = L.latLng(center.lat + 1, center.lng + index);
            this.map.addCreature({ latlng, creature: player });
            index++;
            index++;
        }
    }
}

class ImageControl extends FontAwesomeControl {
    constructor(public map: InitiativeMap) {
        super(
            {
                tooltip: "Replace Image",
                cls: "leaflet-image-control",
                icon: "image"
            },
            map.leafletInstance
        );
    }
    input = this.controlEl.createEl("input", {
        attr: {
            type: "file",
            name: "image",
            accept: "image/*",
            style: "display: none;"
        }
    });
    onClick() {
        this.input.onchange = async () => {
            const { files } = this.input;

            if (!files.length) return;

            const image = files[0];
            const reader = new FileReader();
            reader.onloadend = (evt) => {
                var image = new Image();
                image.onload = () => {
                    const { width: w, height: h } = image;
                    this.map.replaceLayer(0, {
                        data: evt.target.result.toString(),
                        h,
                        w,
                        id: "grid-layer",
                        alias: null
                    });
                    this.map.removeCreature(
                        ...this.map.renderer.view.players,
                        ...this.map.renderer.view.creatures
                    );
                    this.map.renderer.loadSavedData();
                };
                image.src = evt.target.result.toString();
            };
            reader.readAsDataURL(image);

            this.input.value = null;
        };
        this.input.click();
    }
}

class InitiativeMap extends ImageMap {
    renderer: InitiativeRenderer;
    currentLayer: L.ImageOverlay;
    markerMap: Map<string, InitiativeMarker> = new Map();
    creatureMap: Map<string, Creature> = new Map();
    gridLayer: ImageLayerData;
    /** Register an event to the Renderer that will be removed when the renderer unloads. */
    addEvent(name: any, callback: (...args: any[]) => any) {
        this.renderer.registerEvent(
            this.plugin.app.workspace.on(name, callback)
        );
    }
    replaceLayer(index: number, layer: ImageLayerData) {
        this.mapLayers[index].group.remove();
        this.mapLayers = [];
        this.registerLayerToBuild(layer);
    }
    isLayerRendered() {
        return true;
    }
    createMap() {
        super.createMap();
        this.leafletInstance.off("contextmenu");

        this.leafletInstance.on("contextmenu", (evt: L.LeafletMouseEvent) => {
            const context = new Menu(this.plugin.app);
            context.setNoIcon();
            context.addItem((item) => {
                item.setTitle("Add Creature Here");
                item.onClick((evt) => {
                    this.plugin.app.workspace.trigger(
                        "initiative-tracker:add-creature-here",
                        this.leafletInstance.mouseEventToLatLng(evt)
                    );
                });
            });
            context.showAtMouseEvent(evt.originalEvent);
        });

        this.on("first-layer-ready", () => {
            this.leafletInstance.fitBounds(this.currentLayer.getBounds());
        });

        this.addEvent(
            "initiative-tracker:creature-added-at-location",
            (creature: Creature, latlng: L.LatLng) => {
                this.addCreature({ latlng, creature });
            }
        );
        this.addEvent(
            "initiative-tracker:creatures-added",
            (creatures: Creature[]) => {
                this.addCreature(
                    ...creatures.map((c: Creature) => {
                        return {
                            creature: c
                        };
                    })
                );
            }
        );
        this.addEvent(
            "initiative-tracker:creatures-removed",
            (creatures: Creature[]) => {
                this.removeCreature(...creatures);
            }
        );
        this.addEvent(
            "initiative-tracker:creature-updated",
            (creature: Creature) => {
                if (!this.markerMap.has(creature.id)) {
                    this.addCreature({ creature });
                }
                const marker = this.markerMap.get(creature.id);

                marker.updateCreature();
            }
        );
    }
    buildControls() {
        super.buildControls();

        this.leafletInstance.addControl(new ImageControl(this));
    }
    addCreature(...creatures: { latlng?: L.LatLng; creature: Creature }[]) {
        let toReturn: Marker[] = [];
        for (const { latlng, creature } of creatures) {
            let marker = new InitiativeMarker(
                this,
                latlng ?? this.leafletInstance.getCenter(),
                creature
            );
            toReturn.push(marker);

            this.markerMap.set(creature.id, marker);
        }
        return toReturn;
    }
    removeCreature(...creatures: Creature[]) {
        for (const creature of creatures) {
            if (this.markerMap.has(creature.id)) {
                const marker = this.markerMap.get(creature.id);
                marker.remove();
                this.markerMap.delete(creature.id);
            }
        }
    }
}

class InitiativeMarker extends Marker {
    creature: Creature;
    initIcon: InitiativeDivIcon;
    enabled: boolean;
    hp: number;
    status: Set<any>;
    constructor(map: BaseMapType, latlng: L.LatLng, creature: Creature) {
        if (!map.markerTypes.includes(creature.marker)) {
            creature.marker = "default";
        }
        const markerIcon = map.markerIcons.get(creature.marker);

        const initIcon = new InitiativeDivIcon(
            {
                html: (markerIcon ?? map.defaultIcon).html,
                className: "leaflet-div-icon"
            },
            creature
        );

        super(map, {
            id: creature.name,
            type: creature.marker,
            icon: initIcon,
            layer: null,
            mutable: true,
            command: false,
            zoom: null,
            percent: null,
            description: null,
            tooltip: "always",
            link: creature.name,
            loc: latlng
        });
        this.creature = creature;
        if (this.creature.enabled) {
            this.setEnabled();
        } else {
            this.setDisabled();
        }

        this.map.renderer.registerEvent(
            this.map.plugin.app.workspace.on("initiative-tracker:active-change", (creature: Creature) => {
                if (creature === this.creature) {
                    this.setActive();
                } else {
                    this.setInactive();
                }
            })
        )

        this.status = this.creature.status;

        this.initIcon = initIcon;

        this.leafletInstance.off("contextmenu");
        this.leafletInstance.off("click");

        this.leafletInstance.on("click", async (evt: L.LeafletMouseEvent) => {
            if (this.map.isDrawing || this.map.controller.isDrawing) {
                this.map.onMarkerClick(this, evt);
                return;
            }
        });

        this.leafletInstance.on("contextmenu", () => {});
        this.leafletInstance.on('mouseover', () => {
            this.popup.leafletInstance.bringToFront();
        })
    }
    onShow() {
        if (this.tooltip === "always" && this.target) {
            this.popup.open(this.target.display);
        }
    }

    updateCreature() {
        if (this.enabled != this.creature.enabled) {
            if (!this.creature.enabled) {
                this.setDisabled();
            } else {
                this.setEnabled();
            }
        }
        if (!isNaN(Number(this.creature.hp)) && this.creature.hp != this.hp) {
            this.updateHP(this.creature.hp);
        }
        if (this.link != this.creature.name) {
            this.link = this.creature.name;
        }

        if (this.creature.marker != this.type) {
            if (!this.map.markerTypes.includes(this.creature.marker)) {
                new Notice(
                    t(
                        `Marker type "%1" does not exist, using default.`,
                        this.creature.marker
                    )
                );
                this.creature.marker = "default";
            }
            const markerIcon = this.map.markerIcons.get(this.creature.marker);

            const initIcon = new InitiativeDivIcon(
                {
                    html: (markerIcon ?? this.map.defaultIcon).html,
                    className: "leaflet-div-icon"
                },
                this.creature
            );

            this.icon = markerIcon;
            this.divIcon = initIcon;
        }

        this.initIcon.syncStatuses();

        this.creature = this.creature;
    }

    setDisabled() {
        this.enabled = false;
        this.leafletInstance
            ?.getElement()
            ?.addClass("initiative-marker-disabled");
    }
    setEnabled() {
        this.enabled = true;
        this.leafletInstance
            ?.getElement()
            ?.removeClass("initiative-marker-disabled");
    }
    updateHP(hp: number) {
        this.hp = hp;
        this.initIcon.updateHP(hp);
    }
    setActive() {
        this.leafletInstance
            ?.getElement()
            ?.addClass("initiative-marker-active");
    }
    setInactive() {
        this.leafletInstance
            ?.getElement()
            ?.removeClass("initiative-marker-active");
    }
}

class InitiativeDivIcon extends MarkerDivIcon {
    progress: HTMLProgressElement;
    status: HTMLDivElement;
    constructor(options: MarkerDivIconOptions, public creature: Creature) {
        super(options);
    }
    createIcon(oldIcon: HTMLElement) {
        const div = super.createIcon(oldIcon);
        if (this.creature.hp) {
            this.addHPBar();
            this.updateHP(this.creature.hp);

            this.status = this.div.createDiv(
                "initiative-marker-status-container"
            );
            this.syncStatuses();
        }
        return div;
    }
    addHPBar() {
        this.progress = this.div.createEl("progress", {
            attr: {
                min: 0,
                max: this.creature.max
            }
        });
    }
    updateHP(hp: number) {
        this.progress.setAttr("value", hp);
    }
    syncStatuses() {
        this.status.empty();
        for (let status of this.creature.status) {
            if (StatusMap.has(status.name)) {
                const node = StatusMap.get(status.name);
                node.setAttr("aria-label", status.name);
                node.setAttr("aria-label-position", "top");
                this.status.appendChild(node);
            }
        }
    }
}
