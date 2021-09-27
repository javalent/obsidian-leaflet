import { FontAwesomeControl } from "src/controls/controls";
import t from "src/l10n/locale";
import { BaseDrawControl } from "./base";
import { DrawControl } from "./controls";

export class ColorControl extends BaseDrawControl {
    onClick() {
        this.parent.stopDrawingContext();
        this.openActions();
    }
    draw() {}
    fill = new ColorFillControl(this);
    pick = new ColorPickControl(this);
    constructor(parent: DrawControl) {
        super(
            {
                icon: "circle",
                cls: "leaflet-control-has-actions leaflet-control-draw-paint",
                tooltip: t("Color")
            },
            parent
        );
        this.iconEl.setAttr("style", `color: ${this.parent.controller.color}`);
        this.actionsEl.appendChild(this.fill.controlEl);
        this.actionsEl.appendChild(this.pick.controlEl);
    }
    updateColor(color: string) {
        this.parent.controller.color = color;
        this.iconEl.setAttr("style", `color: ${this.parent.controller.color}`);
    }
    closeActions() {
        super.closeActions();
        this.fill.setActive(false);
    }
}

class ColorPickControl extends FontAwesomeControl {
    input: HTMLInputElement;
    onClick() {
        this.drawControl.fill.setActive(false);

        this.input.click();
    }
    constructor(public drawControl: ColorControl) {
        super(
            {
                icon: "palette",
                cls: "leaflet-control-has-actions leaflet-control-draw-palette",
                tooltip: t("Color")
            },
            drawControl.map.leafletInstance
        );
        this.input = this.controlEl.createEl("input", {
            type: "color"
        });
        this.input.oninput = (evt) => {
            this.drawControl.updateColor(
                (evt.target as HTMLInputElement).value
            );
        };
        this.input.onchange = () => {
            this.drawControl.fill.setActive(true);
        };
    }
}

class ColorFillControl extends FontAwesomeControl {
    active: boolean = false;
    setActive(b: boolean) {
        this.active = b;
        this.drawControl.controller.isColoring = b;
        if (b) {
            this.controlEl.addClass("active");
        } else {
            this.controlEl.removeClass("active");
        }
    }
    onClick(evt: MouseEvent) {
        evt.stopPropagation();
        this.setActive(!this.active);
    }
    constructor(public drawControl: ColorControl) {
        super(
            {
                icon: "fill-drip",
                cls: "leaflet-control-fill-color",
                tooltip: t("Fill Color")
            },
            drawControl.map.leafletInstance
        );
    }
}
