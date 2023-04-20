import t from "src/l10n/locale";
import { BaseMapType } from "../types";
import { DrawControl } from "./controls";
import { FontAwesomeControl, FontAwesomeControlOptions } from "src/controls/controls";
import { LayerGroup, Polyline } from "leaflet";
import { GeoJSONModal } from "src/modals/geojson";

export class GeoJSONControl extends FontAwesomeControl {
    get map() {
        return this.parent.map;
    }
    constructor(private parent: DrawControl) {
        super(
            {
                icon: "save",
                cls: "leaflet-control-has-actions leaflet-control-save",
                tooltip: t("Export Drawing to GeoJSON")
            },
            parent.map.leafletInstance
        );
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();

        const { plugin } = this.map;
        
        const features: Array<Polyline> = [];
        
        this.map.controller.flatShapes.forEach(shape => {
            if (shape.leafletInstance instanceof Polyline) {
                features.push(shape.leafletInstance);
            }
        });

        const result = JSON.stringify(features.map(feature => feature.toGeoJSON()));
        const newFilePath = plugin.app.fileManager.getNewFileParent(plugin.app.workspace.getActiveFile().path);

        new GeoJSONModal(plugin.app, (fileName) => {
            plugin.app.vault.adapter.write(`${newFilePath.path}/${fileName}.json`, result);
        }).open();
    }
}