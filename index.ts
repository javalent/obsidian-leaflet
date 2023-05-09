import { ObsidianAppData } from "types";

export interface LeafletAPI {
    openInitiativeView(
        pcs: import("../src/utils/creature").Creature[],
        npcs: import("../src/utils/creature").Creature[]
    ): unknown;
    markerIcons: MarkerIcon[];
    data: ObsidianAppData;
}

interface MarkerIcon {
    html: string;
    type: string;
}
