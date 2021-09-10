import { Menu, Notice, WorkspaceLeaf } from "obsidian";
import { BaseMapType, ObsidianLeaflet } from "src/@types";
import t from "src/l10n/locale";
import { Marker } from "src/layer";
import { MarkerDivIcon } from "src/map";
import { LeafletRenderer } from "src/renderer/renderer";
import { DEFAULT_BLOCK_PARAMETERS } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import {
    EventsOnArgs,
    TrackerEvents,
    TrackerViewState
} from "../../../obsidian-initiative-tracker/@types";
import { Creature } from "../../../obsidian-initiative-tracker/src/utils/creature";
import { ImageMap } from "../map/map";
import { LeafletMapView } from "../map/view";

const L = window[LeafletSymbol];

import GridImage from "./1-Inch-Grid-Paper-Template.png";

declare module "obsidian" {
    interface Workspace {
        on(...args: EventsOnArgs): EventRef;
    }
}

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
    }

    async buildMap() {
        this.map = new InitiativeMap(this, this.options);
        const { h, w } = await this.loader.getImageDimensions(GridImage);
        this.map.registerLayerToBuild({
            data: GridImage,
            h,
            w,
            id: "grid-layer",
            alias: null
        });

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

class InitiativeMap extends ImageMap {
    currentLayer: L.ImageOverlay;
    creatureMap: Map<Creature, InitiativeMarker> = new Map();
    /** Register an event to the Renderer that will be removed when the renderer unloads. */
    addEvent(
        name: EventsOnArgs[0],
        callback: (...args: TrackerEvents[1]) => any
    ) {
        this.renderer.registerEvent(
            this.plugin.app.workspace.on(name, callback)
        );
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
            context.showAtPosition({
                x: evt.originalEvent.clientX,
                y: evt.originalEvent.clientY
            });
        });

        this.on("first-layer-ready", () =>
            this.leafletInstance.fitBounds(this.currentLayer.getBounds())
        );

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
                if (!this.creatureMap.has(creature)) {
                    this.addCreature({ creature });
                }
                const marker = this.creatureMap.get(creature);
                if (!creature.enabled) {
                    marker.setDisabled();
                } else {
                    marker.setEnabled();
                }
            }
        );
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

            this.creatureMap.set(creature, marker);
        }
        return toReturn;
    }
    removeCreature(...creatures: Creature[]) {
        for (const creature of creatures) {
            if (this.creatureMap.has(creature)) {
                const marker = this.creatureMap.get(creature);
                marker.remove();
                this.creatureMap.delete(creature);
            }
        }
    }
}

class InitiativeMarker extends Marker {
    creature: Creature;
    initIcon: InitiativeDivIcon;
    constructor(map: BaseMapType, latlng: L.LatLng, creature: Creature) {
        if (!map.markerTypes.includes(creature.marker)) {
            new Notice(
                t(
                    `Marker type "%1" does not exist, using default.`,
                    creature.marker
                )
            );
            creature.marker = "default";
        }
        const markerIcon = map.markerIcons.get(creature.marker);

        const mapIcon = markerIcon?.icon ?? map.defaultIcon.icon;

        const initIcon = new InitiativeDivIcon({
            html: (markerIcon ?? map.defaultIcon).html,
            className: "leaflet-div-icon"
        });

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

        this.initIcon = initIcon;

        if (this.creature.hp) {
            this.initIcon.addHPBar();
            this.initIcon.updateHP(this.creature.hp);
        }

        this.leafletInstance.off("contextmenu");
        this.leafletInstance.off("click");

        this.leafletInstance.on("click", async (evt: L.LeafletMouseEvent) => {
            if (this.map.isDrawing || this.map.controller.isDrawing) {
                this.map.onMarkerClick(this, evt);
                return;
            }
        });

        this.leafletInstance.on("contextmenu", () => {});
    }
    onShow() {
        if (this.tooltip === "always" && this.target) {
            console.log("add");
            this.popup.open(this.target.display);
        }
    }
    setDisabled() {
        this.leafletInstance
            ?.getElement()
            ?.addClass("initiative-marker-disabled");
    }
    setEnabled() {
        this.leafletInstance
            ?.getElement()
            ?.removeClass("initiative-marker-disabled");
    }
}

class InitiativeDivIcon extends MarkerDivIcon {
    progress: HTMLProgressElement;
    hp: HTMLDivElement;
    addHPBar() {
        this.progress = this.div.createEl("progress");
    }
    updateHP(hp: number) {
        this.progress.setAttr("value", hp);
    }
}
