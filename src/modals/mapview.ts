import {
    ButtonComponent,
    ExtraButtonComponent,
    Modal,
    Notice,
    TextAreaComponent
} from "obsidian";
import { ObsidianLeaflet } from "src/@types";

import t from "src/l10n/locale";

export class EditParametersModal extends Modal {
    constructor(private plugin: ObsidianLeaflet) {
        super(plugin.app);
    }

    onOpen() {
        console.log("Open");
        this.containerEl.addClass("leaflet-edit-parameters");
        const text = new TextAreaComponent(this.contentEl);
        text.setValue(
            JSON.stringify(this.plugin.data.mapViewParameters, null, 4)
        );
        text.inputEl.setAttr("style", "width: 100%; min-height: 500px;");

        const buttons = this.contentEl.createDiv("context-buttons");
        new ButtonComponent(buttons)
            .setIcon("checkmark")
            .setTooltip(t("Save"))
            .onClick(async () => {
                try {
                    this.plugin.data.mapViewParameters = JSON.parse(
                        text.inputEl.value
                    );
                    await this.plugin.saveSettings();

                    if (this.plugin.view) {
                        this.plugin.view.update();
                    }
                    this.close();
                } catch (e) {
                    new Notice(
                        t(`There was an error parsing the JSON.`) +
                            `\n\n${e.message}`
                    );
                }
            });
        new ExtraButtonComponent(buttons)
            .setIcon("cross")
            .setTooltip(t("Cancel"))
            .onClick(() => this.close());
    }
    onClose() {}
}
