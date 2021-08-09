import { Events } from "obsidian";
import {
    LayerGroup,
    LeafletMapOptions,
    ObsidianLeaflet,
    Popup
} from "src/@types";
import { DEFAULT_MAP_OPTIONS, log } from "src/utils";
import { LeafletSymbol } from "../utils/leaflet-import";
let L = window[LeafletSymbol];
export abstract class Map<T> extends Events {
    /** Abstract */
    abstract render(): Promise<void>;
    abstract type: "image" | "real";

    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions = {}
    ) {
        super();
        this.contentEl.style.height = options.height;
        this.contentEl.style.width = "100%";
        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);
    }

    contentEl: HTMLElement = createDiv();
    get id() {
        return this.options.id;
    }
    leafletInstance: L.Map;
    layer: T;
    mapLayers: LayerGroup[] = [];
    popup: Popup;
    verbose: boolean;

    log(text: string) {
        log(this.verbose, this.id, text);
    }

    toProperties(): SavedMapData {
        return {};
    }
}

interface SavedMapData {}
