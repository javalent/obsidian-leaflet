import { ItemView, MarkdownRenderChild, WorkspaceLeaf } from "obsidian";
import { BaseMapType, BlockParameters, ObsidianLeaflet } from "src/@types";
import { LeafletRenderer } from "src/renderer";
import { DEFAULT_BLOCK_PARAMETERS, VIEW_TYPE } from "src/utils";

export class LeafletMapView extends ItemView {
    map: BaseMapType;
    mapEl: HTMLDivElement;
    innerContentEl: HTMLDivElement;
    constructor(public leaf: WorkspaceLeaf, private plugin: ObsidianLeaflet) {
        super(leaf);
    }

    async onOpen() {
        const params: BlockParameters = {
            ...DEFAULT_BLOCK_PARAMETERS,
            ...(this.plugin.data.mapViewParameters ?? {}),
            height: "100%",
            isMapView: true
        };
        this.innerContentEl = this.contentEl.createDiv({
            cls: "markdown-preview-view",
            attr: { style: "height: 100%;" }
        });
        this.mapEl = this.innerContentEl.createDiv("block-language-leaflet");
        const renderer = new LeafletRenderer(
            this.plugin,
            "",
            this.mapEl,
            params
        );

        const context = new MarkdownRenderChild(this.mapEl);
        context.load();

        context.addChild(renderer);
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
