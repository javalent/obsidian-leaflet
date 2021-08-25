import {
    ButtonComponent,
    ExtraButtonComponent,
    Modal,
    Notice,
    TextAreaComponent
} from "obsidian";
import { ObsidianLeaflet } from "src/@types";

export class EditParametersModal extends Modal {
    constructor(private plugin: ObsidianLeaflet) {
        super(plugin.app);
    }

    onOpen() {
        this.containerEl.addClass("leaflet-edit-parameters");
        const t = new TextAreaComponent(this.contentEl);
        t.setValue(JSON.stringify(this.plugin.data.mapViewParameters, null, 4));
        t.inputEl.setAttr("style", "width: 100%; min-height: 500px;");

        const buttons = this.contentEl.createDiv("context-buttons");
        new ButtonComponent(buttons)
            .setIcon("checkmark")
            .setTooltip("Save")
            .onClick(async () => {
                try {
                    this.plugin.data.mapViewParameters = JSON.parse(
                        t.inputEl.value
                    );
                    await this.plugin.saveSettings();

                    if (this.plugin.view) {
                        this.plugin.view.update();
                    }
                    this.close();
                } catch (e) {
                    new Notice(
                        `There was an error parsing the JSON.\n\n${e.message}`
                    );
                }
            });
        new ExtraButtonComponent(buttons)
            .setIcon("cross")
            .setTooltip("Cancel")
            .onClick(() => this.close());
    }
    onClose() {}
}
