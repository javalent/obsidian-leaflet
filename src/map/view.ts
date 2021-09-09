import { ItemView, MarkdownRenderChild, WorkspaceLeaf } from "obsidian";
import { BaseMapType, BlockParameters, ObsidianLeaflet } from "src/@types";
import t from "src/l10n/locale";
import { LeafletRenderer } from "src/renderer/renderer";
import { DEFAULT_BLOCK_PARAMETERS, VIEW_TYPE } from "src/utils";
import { HomebrewCreature } from "../../../obsidian-initiative-tracker/@types";

export class LeafletMapView extends ItemView {
    map: BaseMapType;
    mapEl: HTMLDivElement;
    innerContentEl: HTMLDivElement;
    context: MarkdownRenderChild;
    renderer: LeafletRenderer;
    get params() {
        return {
            ...DEFAULT_BLOCK_PARAMETERS,
            ...(this.plugin.data.mapViewParameters ?? {}),
            height: "100%",
            isMapView: true
        };
    }
    constructor(public leaf: WorkspaceLeaf, public plugin: ObsidianLeaflet) {
        super(leaf);
        this.innerContentEl = this.contentEl.createDiv({
            cls: "markdown-preview-view",
            attr: { style: "height: 100%;" }
        });
        this.mapEl = this.innerContentEl.createDiv("block-language-leaflet");

        this.context = new MarkdownRenderChild(this.mapEl);
        this.context.load();
    }
    async onOpen() {
        this.renderer = new LeafletRenderer(
            this.plugin,
            "",
            this.mapEl,
            this.params
        );

        this.context.addChild(this.renderer);
    }
    update() {
        this.renderer.unload();

        this.renderer = new LeafletRenderer(
            this.plugin,
            "",
            this.mapEl,
            this.params
        );
        this.context.addChild(this.renderer);
    }

    getDisplayText() {
        return t("Leaflet Map");
    }
    getViewType() {
        return VIEW_TYPE;
    }
    onResize() {
        if (!this.renderer) return;
        this.renderer.setHeight(
            `${
                this.contentEl.firstElementChild.getBoundingClientRect().height
            }px`
        );
    }
}

export class InitiativeMapView extends LeafletMapView {
    constructor(
        public leaf: WorkspaceLeaf,
        public plugin: ObsidianLeaflet,
        public players?: any,
        public creatures?: any
    ) {
        super(leaf, plugin);
    }
    getDisplayText() {
        return "Initiative Tracker Map";
    }
    getViewType() {
        return "INITIATIVE_TRACKER_MAP_VIEW";
    }
    addCreatures(...creatures: HomebrewCreature[]) {
        console.log(...creatures);
    }
}
