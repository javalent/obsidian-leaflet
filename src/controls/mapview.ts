import { BaseMapType } from "src/@types";
import { EditParametersModal } from "src/modals/mapview";
import { FontAwesomeControl, FontAwesomeControlOptions } from "./controls";

class MapViewControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
    }
    onClick(evt: MouseEvent) {
        const modal = new EditParametersModal(this.map.plugin);
        modal.onClose = () => {};
        modal.open();
    }
}

export function mapViewControl(opts: L.ControlOptions, map: BaseMapType) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "edit",
        cls: "leaflet-control-edit-parameters",
        tooltip: "Edit View Parameters"
    };
    return new MapViewControl(options, map);
}
class SaveMapParametersControl extends FontAwesomeControl {
    map: BaseMapType;
    constructor(opts: FontAwesomeControlOptions, map: BaseMapType) {
        super(opts, map.leafletInstance);
        this.map = map;
    }
    async onClick(evt: MouseEvent) {
        this.map.plugin.data.mapViewParameters = this.map.renderer.params;

        await this.map.plugin.saveSettings();
    }
}

export function saveMapParametersControl(
    opts: L.ControlOptions,
    map: BaseMapType
) {
    const options: FontAwesomeControlOptions = {
        ...opts,
        icon: "save",
        cls: "leaflet-control-save-param",
        tooltip: "Save Parameters to View"
    };
    return new SaveMapParametersControl(options, map);
}
