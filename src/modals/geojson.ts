import { App, Modal, Setting } from "obsidian";
import t from "src/l10n/locale";

export class GeoJSONModal extends Modal {
  result: string;

  onSubmit: (result: string) => void;

  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: t("Enter a file name.") });

    new Setting(contentEl)
      .setName(t("File name"))
      .addText((text) => {
        text.onChange(value => this.result = value);
      });

    new Setting(contentEl)
      .addButton(button => {
        button.setButtonText(t("Save"))
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.result);
          });
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}