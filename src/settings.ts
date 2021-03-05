import {
	PluginSettingTab,
	Setting,
	App,
	Notice,
	ButtonComponent,
} from "obsidian";

import { findIconDefinition, IconLookup, icon, toHtml } from "./icons";

export const DEFAULT_SETTINGS: ObsidianAppData = {
	defaultMarker: {
		type: "default",
		icon: findIconDefinition({
			iconName: "map-marker",
		} as IconLookup),
		color: "rgb(221, 221, 221)",
	},
	markers: [],
};

import ObsidianLeaflet from "./main";

export class ObsidianLeafletSettingTab extends PluginSettingTab {
	plugin: ObsidianLeaflet;

	constructor(app: App, plugin: ObsidianLeaflet) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Obsidian Leaflet Settings" });

		let baseSetting = new Setting(containerEl)
			.setName("Base Map Marker")
			.setDesc("Leave blank to have full-sized marker symbols instead.")
			.addText(text => {
				text.setPlaceholder("Icon Name").setValue(
					this.plugin.AppData.defaultMarker.icon
						? findIconDefinition(
								this.plugin.AppData.defaultMarker.icon
						  ).iconName
						: ""
				);
				text.inputEl.addEventListener("blur", async evt => {
					let target = evt.target as HTMLInputElement;
					let new_value: string = target.value;

					if (!new_value.length) {
						if (this.plugin.AppData.markers.length == 0) {
							new Notice(
								"Add additional markers to remove the default."
							);
							target.value = findIconDefinition(
								this.plugin.AppData.defaultMarker.icon
							).iconName;
							return;
						}

						this.plugin.AppData.defaultMarker.icon = null;

						await this.plugin.saveSettings();

						this.display();
						return;
					}
					if (
						!findIconDefinition({
							iconName: new_value,
						} as IconLookup)
					) {
						new Notice(
							"The selected icon does not exist in Font Awesome Free."
						);
						return;
					}

					this.plugin.AppData.defaultMarker.icon = findIconDefinition(
						{
							iconName: new_value,
						} as IconLookup
					);

					await this.plugin.saveSettings();

					this.display();
				});
			});

		if (this.plugin.AppData.defaultMarker.icon) {
			this.createColorPicker(
				baseSetting,
				this.plugin.AppData.defaultMarker
			);
		}

		/** Build additional markers setting block */

		let additionalMarkers = containerEl.createDiv();
		additionalMarkers.addClass("additional-markers-container");

		new Setting(additionalMarkers)
			.setHeading()
			.setName("Additional Map Markers")
			.setDesc(
				"These markers will be available in the right-click menu on the map. If the base layer marker is set, they will be layered on top of it."
			);

		this.plugin.AppData.markers.forEach(marker => {
			let setting = new Setting(additionalMarkers);
			setting
				.addText(text => {
					let t = text
						.setPlaceholder("Marker Name")
						.setValue(marker.type)
						.onChange(
							async (new_value): Promise<void> => {
								if (
									this.plugin.AppData.markers.find(
										marker => marker.type == new_value
									)
								) {
									new Notice("This marker already exists.");
									return;
								}

								let index = this.plugin.AppData.markers.indexOf(
									marker
								);
								this.plugin.AppData.markers[
									index
								].type = new_value;

								await this.plugin.saveSettings();
							}
						);
					t.inputEl.setAttribute("style", "margin-right: auto;");
					return t;
				})
				.addText(text => {
					let t = text
						.setPlaceholder("Icon Name")
						.setValue(marker.icon ? marker.icon.iconName : "")
						.onChange(
							async (new_value): Promise<void> => {
								let index = this.plugin.AppData.markers.indexOf(
									marker
								);
								let icon = findIconDefinition({
									iconName: new_value,
								} as IconLookup);
								if (icon) {
									this.plugin.AppData.markers[
										index
									].icon = findIconDefinition({
										iconName: new_value,
									} as IconLookup);
									await this.plugin.saveSettings();

									this.createColorPicker(setting, marker);
								}
							}
						);
					t.inputEl.onblur = evt => {
						if (
							!findIconDefinition({
								iconName: (evt.target as HTMLInputElement)
									.value,
							} as IconLookup)
						) {
							new Notice(
								`No icon named ${
									(evt.target as HTMLInputElement).value
								} exists in Font Awesome Free.`
							);
							evt.target;
						}
						this.display();
					};
					return t;
				});
			setting.controlEl.addClass("additional-markers-control");
			setting.infoEl.detach();

			setting.controlEl.addClass("marker-icon-display");

			if (marker.icon) {
				this.createColorPicker(setting, marker);
			}
		});

		new Setting(additionalMarkers).addButton(
			(button: ButtonComponent): ButtonComponent => {
				let b = button.setTooltip("Add Additional").onClick(() => {
					this.plugin.AppData.markers.push({
						type: "",
						icon: null,
						/* color: this.plugin.AppData.color, */
					});
					// Force refresh
					this.display();
				});
				b.buttonEl.appendChild(
					icon(
						findIconDefinition({
							iconName: "plus",
						} as IconLookup)
					).node[0]
				);

				return b;
			}
		);
	}
	createColorPicker(setting: Setting, marker: Marker) {
		if (setting.controlEl.querySelector(".color-picker")) {
			setting.controlEl.removeChild(
				setting.controlEl.querySelector(".color-picker")
			);
		}

		let colorContainer = setting.controlEl.createDiv({
			cls: "marker-icon-display color-picker",
		});

		let buttonEl: HTMLButtonElement;
		colorContainer.appendChild(
			colorContainer.createEl(
				"button",
				{
					cls: "button",
				},
				el => {
					buttonEl = el;
					if (
						marker.type == "default" ||
						!this.plugin.AppData.defaultMarker.icon
					) {
						el.appendChild(
							icon(marker.icon, {
								styles: {
									color: marker.color
										? marker.color
										: this.plugin.AppData.defaultMarker
												.color,
								},
							}).node[0]
						);
					} else {
						let i = icon(marker.icon, {
							transform: { size: 6, x: 0, y: -2 },
							mask: this.plugin.AppData.defaultMarker.icon,
							styles: {
								color: marker.color
									? marker.color
									: this.plugin.AppData.defaultMarker.color,
							},
						}).abstract[0];
						i.attributes = {
							...i.attributes,
							style: `color: ${
								marker.color
									? marker.color
									: this.plugin.AppData.defaultMarker.color
							}`,
						};

						let html = toHtml(i);
						let temp = document.createElement("div");
						temp.innerHTML = html;
						el.appendChild(temp.children[0]);
					}
					el.addClass(`${marker.type}-map-marker`);
					if (this.plugin.AppData.defaultMarker.icon && !marker.color)
						el.addClass("default-map-marker");
				}
			)
		);

		colorContainer.appendChild(
			colorContainer.createEl(
				"input",
				{
					attr: { type: "color" },
				},
				el => {
					el.oninput = evt => {
						let iconNodes = this.containerEl.querySelectorAll(
							`.${marker.type}-map-marker > svg`
						);

						if (marker.type !== "default")
							buttonEl.removeClass("default-map-marker");

						iconNodes.forEach(node =>
							node.setAttribute(
								"style",
								`color: ${
									(evt.target as HTMLInputElement).value
								}`
							)
						);
					};

					el.onchange = async evt => {
						marker.color = (evt.target as HTMLInputElement).value;

						await this.plugin.saveSettings();
						this.display();
					};
				}
			)
		);
	}
}

/* .onChange(async new_value => {
					let fuzzy = fuzzySearch(prepareQuery(new_value), iconNames);
					console.log(
						fuzzy.matches,
						fuzzy.matches.map(match => {
							let prev = iconNames
								.slice(0, match[0])
								.split("|")
								.pop();
							let next = iconNames
								.slice(match[0])
								.split("|")
								.shift();
							return prev + next;
						})
					);
				}); */
