import { BaseMapType } from "../types";
import t from "src/l10n/locale";
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
        tooltip: t("Edit view parameters")
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

        this.map.trigger('should-save');
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
        tooltip: t("Save parameters to view")
    };
    return new SaveMapParametersControl(options, map);
}
