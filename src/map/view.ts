import { ItemView, MarkdownRenderChild, WorkspaceLeaf } from "obsidian";
import { BaseMapType, BlockParameters, ObsidianLeaflet } from "src/@types";
import { LeafletRenderer } from "src/renderer";
import { DEFAULT_BLOCK_PARAMETERS, VIEW_TYPE } from "src/utils";

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
    constructor(public leaf: WorkspaceLeaf, private plugin: ObsidianLeaflet) {
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
        return "Leaflet Map";
    }
    getViewType() {
        return VIEW_TYPE;
    }
    onResize() {
        if (this.map) this.map.leafletInstance.invalidateSize();
    }
}
