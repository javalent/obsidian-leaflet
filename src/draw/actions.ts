import { FontAwesomeControl } from "src/controls/controls";
import { BaseDrawControl } from "./base";

export class CompleteControl extends FontAwesomeControl {
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "check",
                cls: "leaflet-control-complete",
                tooltip: "Finish"
            },
            drawControl.map.leafletInstance
        );
    }
    //Complete and save
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        this.drawControl.controller.newShape(
            this.drawControl.controller.shape.newInstance()
        );
    }
}
export class UndoControl extends FontAwesomeControl {
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "undo-alt",
                cls: "leaflet-control-undo",
                tooltip: "Undo"
            },
            drawControl.map.leafletInstance
        );
    }
    //Undo Last Vertex
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        this.drawControl.controller.shape.undo();
    }
}
export class CancelControl extends FontAwesomeControl {
    constructor(public drawControl: BaseDrawControl) {
        super(
            {
                icon: "times-circle",
                cls: "leaflet-control-cancel",
                tooltip: "Cancel"
            },
            drawControl.map.leafletInstance
        );
    }
    //Stop and remove from map
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        this.drawControl.parent.stopDrawingContext();
    }
}
