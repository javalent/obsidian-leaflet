import { BaseMapType } from "src/@types";
import {
    FontAwesomeControl,
    FontAwesomeControlOptions
} from "src/controls/controls";
import { CompleteControl, UndoControl, CancelControl } from "./actions";
import { DrawingController } from "./controller";
import { DrawControl } from "./controls";
import { Shape } from "./shape";

export abstract class BaseDrawControl extends FontAwesomeControl {
    complete = new CompleteControl(this);
    undo = new UndoControl(this);
    cancel = new CancelControl(this);
    get map() {
        return this.parent.map;
    }
    get controller() {
        return this.parent.controller;
    }
    constructor(opts: FontAwesomeControlOptions, public parent: DrawControl) {
        super(opts, parent.map.leafletInstance);
        this.draw();
    }

    actionsEl = this.controlEl.createDiv("control-actions");

    cancelControl = new CancelControl(this);

    onClick() {
        this.openActions();
    }
    openActions() {
        this.actionsEl.addClass("expanded");
    }
    closeActions() {
        this.actionsEl.removeClass("expanded");
        this.map.leafletInstance.off("editable:vertex:new");
        this.map.leafletInstance.off("editable:vertex:deleted");
    }
    abstract draw(): void;
}
