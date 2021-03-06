import {
	PluginSettingTab,
	Setting,
	App,
	Notice,
	ButtonComponent,
	Modal,
	TextComponent,
} from "obsidian";

import {
	findIconDefinition,
	IconLookup,
	icon,
	toHtml,
	AbstractElement,
} from "./icons";

export const DEFAULT_SETTINGS: ObsidianAppData = {
	maps: {},
	defaultMarker: {
		type: "default",
		icon: findIconDefinition({
			iconName: "map-marker",
		} as IconLookup),
		color: "#dddddd",
	},
	markers: [],
	color: "#dddddd",
};

import ObsidianLeaflet from "./main";

export class ObsidianLeafletSettingTab extends PluginSettingTab {
	plugin: ObsidianLeaflet;
	newMarker: Marker;
	constructor(app: App, plugin: ObsidianLeaflet) {
		super(app, plugin);
		this.plugin = plugin;
		this.newMarker = {
			type: "",
			icon: null,
			color: this.plugin.AppData.defaultMarker.icon
				? this.plugin.AppData.defaultMarker.color
				: this.plugin.AppData.color,
			layer: true,
		};
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
		let additionalMarkers = containerEl.createDiv();
		additionalMarkers.addClass("additional-markers-container");

		new Setting(additionalMarkers)
			.setHeading()
			.setName("Additional Map Markers")
			.setDesc(
				"These markers will be available in the right-click menu on the map."
			)
			.addButton(
				(button: ButtonComponent): ButtonComponent => {
					let b = button
						.setTooltip("Add Additional")
						.onClick(async () => {
							let newMarkerModal = new MarkerModal(
								this.app,
								this.plugin,
								this.newMarker
							);
							newMarkerModal.open();
							newMarkerModal.onClose = async () => {

								if (
									!this.newMarker.type ||
									!this.newMarker.icon
								) {
									return;
								}
								this.plugin.AppData.markers.push(
									this.newMarker
								);
								this.newMarker = {
									type: "",
									icon: null,
									color: this.plugin.AppData.defaultMarker
										.icon
										? this.plugin.AppData.defaultMarker
												.color
										: this.plugin.AppData.color,
									layer: true,
								};
								this.display();
								await this.plugin.saveSettings();
							};
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
		this.plugin.AppData.markers.forEach(marker => {
			let setting = new Setting(additionalMarkers)
				.setName(marker.type)
				.addExtraButton(b =>
					b.onClick(() => {
						let newMarkerModal = new MarkerModal(
							this.app,
							this.plugin,
							marker
						);
						newMarkerModal.open();
						newMarkerModal.onClose = async () => {
							this.display();
							await this.plugin.saveSettings();
							if (!this.newMarker.type || !this.newMarker.icon) {
								return;
							}
						};
					})
				)
				.addExtraButton(b =>
					b.setIcon("trash").onClick(() => {
						this.plugin.AppData.markers = this.plugin.AppData.markers.filter(
							m => m != marker
						);
						this.display();
					})
				);
			let iconNode: AbstractElement = icon(marker.icon, {
				transform: marker.layer ? { size: 6, x: 0, y: -2 } : null,
				mask: marker.layer
					? this.plugin.AppData.defaultMarker?.icon
					: null,
				classes: ["full-width"],
			}).abstract[0];

			iconNode.attributes = {
				...iconNode.attributes,
				style: `color: ${marker.color}`,
			};
			let markerIconDiv = createDiv();
			markerIconDiv.setAttribute("style", "width: 16px;");
			markerIconDiv.innerHTML = toHtml(iconNode);
			setting.controlEl.insertBefore(
				markerIconDiv,
				setting.controlEl.children[0]
			);
		});

		await this.plugin.saveSettings();
	}

	createColorPicker(
		setting: Setting,
		marker: Marker,
		insertAfter?: HTMLInputElement
	) {
		if (setting.controlEl.querySelector(".color-picker")) {
			setting.controlEl.removeChild(
				setting.controlEl.querySelector(".color-picker")
			);
		}

		let colorContainer = document.createElement("div");
		/* setting.controlEl.createDiv({
			cls: "marker-icon-display color-picker",
		}); */

		colorContainer.addClasses(["marker-icon-display", "color-picker"]);

		if (insertAfter) {
			setting.controlEl.insertBefore(
				colorContainer,
				insertAfter.nextSibling
			);
		} else {
			setting.controlEl.appendChild(colorContainer);
		}

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

class MarkerModal extends Modal {
	marker: Marker;
	tempMarker: Marker;
	plugin: ObsidianLeaflet;
	constructor(app: App, plugin: ObsidianLeaflet, marker: Marker) {
		super(app);
		this.marker = marker;
		this.plugin = plugin;

		this.tempMarker = { ...this.marker };
	}
	onOpen() {
		let containerEl = this.contentEl;
		let createNewMarker = containerEl.createDiv();
		createNewMarker.addClass("additional-markers-container");
		new Setting(createNewMarker).setHeading().setName("Create New Marker");

		let typeTextInput: TextComponent;
		new Setting(createNewMarker).setName("Marker Name").addText(text => {
			typeTextInput = text
				.setPlaceholder("Marker Name")
				.setValue(this.tempMarker.type);
			typeTextInput.onChange(new_value => {
				if (
					this.plugin.AppData.markers.find(
						marker => marker.type == new_value
					) &&
					this.tempMarker.type != this.marker.type
				) {
					MarkerModal.setValidationError(
						typeTextInput,
						"Marker type already exists."
					);
					return;
				}

				if (new_value.length == 0) {
					MarkerModal.setValidationError(
						typeTextInput,
						"Marker name cannot be empty."
					);
					return;
				}

				MarkerModal.removeValidationError(typeTextInput);

				this.tempMarker.type = new_value;
			});
		});

		let iconTextInput: TextComponent;
		new Setting(createNewMarker)
			.setName("Marker Icon")
			.setDesc("Font Awesome icon name (e.g. map-marker).")
			.addText(text => {
				iconTextInput = text
					.setPlaceholder("Icon Name")
					.setValue(
						this.tempMarker.icon
							? this.tempMarker.icon.iconName
							: ""
					)
					.onChange(
						async (new_value): Promise<void> => {
							let icon = findIconDefinition({
								iconName: new_value,
							} as IconLookup);

							if (!icon) {
								MarkerModal.setValidationError(
									iconTextInput,
									"Invalid icon name."
								);
								return;
							}

							if (new_value.length == 0) {
								MarkerModal.setValidationError(
									iconTextInput,
									"Icon cannot be empty."
								);
								return;
							}

							MarkerModal.removeValidationError(iconTextInput);
							this.tempMarker.icon = icon;
						}
					);

				return iconTextInput;
			});
		new Setting(createNewMarker)
			.setName("Layer Icon")
			.setDesc("The icon will be layered on the base icon, if any.")
			.addToggle(toggle =>
				toggle.setValue(this.tempMarker.layer).onChange(v => {
					this.tempMarker.layer = v;
				})
			);
		let colorInput = new Setting(createNewMarker)
			.setName("Icon Color")
			.setDesc("Override default icon color.");
		let colorInputNode = document.createElement("input");
		colorInputNode.setAttribute("type", "color");
		colorInputNode.setAttribute("value", this.tempMarker.color);
		colorInputNode.oninput = evt => {
			this.tempMarker.color = (evt.target as HTMLInputElement).value;
		};
		colorInputNode.onchange = async evt => {
			this.tempMarker.color = (evt.target as HTMLInputElement).value;
		};
		colorInput.controlEl.appendChild(colorInputNode);

		let add = new Setting(createNewMarker);
		if (this.tempMarker.icon) {
			let iconNode: AbstractElement = icon(this.tempMarker.icon, {
				transform: this.tempMarker.layer
					? { size: 6, x: 0, y: -2 }
					: null,
				mask: this.tempMarker.layer
					? this.plugin.AppData.defaultMarker?.icon
					: null,
				classes: ["full-width"],
			}).abstract[0];

			iconNode.attributes = {
				...iconNode.attributes,
				style: `color: ${this.tempMarker.color}`,
			};
			let marker = add.infoEl.createDiv();
			marker.setAttribute("style", "height: 12px;");
			marker.innerHTML = toHtml(iconNode);
		}
		add.addButton(
			(button: ButtonComponent): ButtonComponent => {
				let b = button.setTooltip("Save").onClick(async () => {
					// Force refresh
					let error = false;
					if (
						this.plugin.AppData.markers.find(
							marker => marker.type == this.tempMarker.type
						) &&
						this.tempMarker.type != this.marker.type
					) {
						MarkerModal.setValidationError(
							typeTextInput,
							"Marker type already exists."
						);
						error = true;
					}

					if (this.tempMarker.type.length == 0) {
						MarkerModal.setValidationError(
							typeTextInput,
							"Marker name cannot be empty."
						);
						error = true;
					}
					if (
						!findIconDefinition({
							iconName: iconTextInput.inputEl.value,
						} as IconLookup)
					) {
						MarkerModal.setValidationError(
							iconTextInput,
							"Invalid icon name."
						);
						error = true;
					}

					if (!this.tempMarker.icon) {
						MarkerModal.setValidationError(
							iconTextInput,
							"Icon cannot be empty."
						);
						error = true;
					}

					if (error) {
						return;
					}

					this.marker.type = this.tempMarker.type;
					this.marker.icon = this.tempMarker.icon;
					this.marker.color = this.tempMarker.color;
					this.marker.layer = this.tempMarker.layer;

					this.close();
				});
				b.buttonEl.appendChild(
					icon(
						findIconDefinition({
							iconName: "save",
						} as IconLookup)
					).node[0]
				);
				return b;
			}
		);
		add.addExtraButton(b => {
			b.setIcon("cross")
				.setTooltip("Cancel")
				.onClick(() => {
					this.close();
				});
		});
	}

	static setValidationError(textInput: TextComponent, message?: string) {
		textInput.inputEl.addClass("is-invalid");
		if (message) {
			textInput.inputEl.parentElement.addClasses([
				"has-invalid-message",
				"unset-align-items",
			]);
			textInput.inputEl.parentElement.parentElement.addClass(
				".unset-align-items"
			);
			let mDiv = textInput.inputEl.parentElement.querySelector(
				".invalid-feedback"
			) as HTMLDivElement;

			if (!mDiv) {
				mDiv = createDiv({ cls: "invalid-feedback" });
			}
			mDiv.innerText = message;
			mDiv.insertAfter(textInput.inputEl);
		}
	}
	static removeValidationError(textInput: TextComponent) {
		textInput.inputEl.removeClass("is-invalid");
		textInput.inputEl.parentElement.removeClasses([
			"has-invalid-message",
			"unset-align-items",
		]);
		textInput.inputEl.parentElement.parentElement.removeClass(
			".unset-align-items"
		);

		if (textInput.inputEl.parentElement.children[1]) {
			textInput.inputEl.parentElement.removeChild(
				textInput.inputEl.parentElement.children[1]
			);
		}
	}
}
