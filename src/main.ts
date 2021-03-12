import {
	Plugin,
	MarkdownPostProcessorContext,
	addIcon,
	Notice,
	MarkdownView,
	Modal,
	Setting,
	Workspace,
	TFile,
	MarkdownRenderChild,
	HoverPopover,
} from "obsidian";
import { point } from "leaflet";

//Local Imports
import "./main.css";

import { ObsidianLeafletSettingTab, DEFAULT_SETTINGS } from "./settings";
import {
	IconDefinition,
	AbstractElement,
	icon,
	toHtml,
	getIcon,
} from "./icons";
import LeafletMap from "./leaflet";
declare global {
	interface Marker {
		type: string;
		iconName: string;
		color?: string;
		layer?: boolean;
		transform?: { size: number; x: number; y: number };
	}
	interface LeafletMarker {
		marker: MarkerIcon;
		loc: L.LatLng;
		id: string;
		link?: string;
		leafletInstance: L.Marker;
	}

	interface MarkerData {
		type: string;
		loc: [number, number];
		id: string;
		link: string;
	}
	interface MapMarkerData {
		path: string;
		file: string;
		markers: MarkerData[];
	}
	interface ObsidianAppData {
		mapMarkers: MapMarkerData[];
		markerIcons: Marker[];
		defaultMarker: Marker;
		color: string;
	}
	type MarkerIcon = {
		readonly type: string;
		readonly html: string;
	};
}
interface MarkdownPostProcessorContextActual
	extends MarkdownPostProcessorContext {
	sourcePath: string;
	containerEl: HTMLElement;
}
export default class ObsidianLeaflet extends Plugin {
	AppData: ObsidianAppData;
	markerIcons: MarkerIcon[];
	maps: LeafletMap[] = [];
	async onload(): Promise<void> {
		console.log("loading leaflet plugin");

		await this.loadSettings();
		if (!this.AppData.mapMarkers?.every(map => map.file)) {
			this.AppData.mapMarkers = this.AppData.mapMarkers.map(map => {
				if (!map.file) map.file = map.path.slice(0, map.path.indexOf('.md') + 3);
				return map;
			})
		}
		this.markerIcons = this.generateMarkerMarkup(this.AppData.markerIcons);

		this.registerMarkdownCodeBlockProcessor(
			"leaflet",
			this.postprocessor.bind(this)
		);

		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				if (
					this.AppData.mapMarkers.find((marker) =>
						marker.path.includes(file.path)
					)
				) {
					this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
						(marker) =>
							marker !=
							this.AppData.mapMarkers.find((marker) =>
								marker.path.includes(file.path)
							)
					);

					await this.saveSettings();
				}
			})
		);

		this.addSettingTab(new ObsidianLeafletSettingTab(this.app, this));
	}

	async onunload(): Promise<void> {
		console.log("unloading plugin");
		this.maps.forEach(map => map.map.remove())
		this.maps = [];
	}

	async postprocessor(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContextActual
	): Promise<void> {
		try {
			let { image = 'real', height = "500px", minZoom = 1, maxZoom = 10, defaultZoom = 5, zoomDelta = 1, lat, long } = Object.fromEntries(
				source.split("\n").map((l) => l.split(": "))
			);



			let path = `${ctx.sourcePath}/${image}`;
			let map = new LeafletMap(
				el,
				height,
				ctx.sourcePath,
				path,
				this.markerIcons,
				+minZoom,
				+maxZoom,
				+defaultZoom,
				+zoomDelta,
			);


			let markdownRenderChild = new MarkdownRenderChild();
			markdownRenderChild.register(async () => {

				let file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
				if (!file || !(file instanceof TFile)) {
					//file was deleted, remove maps associated
					this.maps = this.maps.filter(
						(map) => map.file != ctx.sourcePath
					);
					this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
						(map) => map.file != ctx.sourcePath
					);

					await this.saveSettings();
					return;
				}
				let fileContent = await this.app.vault.read(file);

				let containsThisMap: boolean = false;
				containsThisMap = fileContent.match(/```leaflet[\s\S]+?```/g)?.some(match => match.includes(image));

				if (!containsThisMap) {
					//Block was deleted or image path was changed
					this.maps = this.maps.filter(
						(map) => map.path != path
					);
					this.AppData.mapMarkers = this.AppData.mapMarkers.filter(
						(map) => map.path != path
					);

					await this.saveSettings();

				}

			});
			markdownRenderChild.containerEl = el;
			ctx.addChild(markdownRenderChild);

			await map.loadData(
				this.AppData.mapMarkers.find(
					(map) => map.path == path
				)
			)

			this.maps = this.maps.filter(
				(map) => map.path != path
			);

			let imageData: string;
			let coords: [number, number];

			lat = parseInt(lat?.match(/(\d+)%*/)[1]);
			long = +parseInt(long?.match(/(\d+)%*/)[1]);
			if (image != 'real') {


				if (!lat || isNaN(lat)) {
					lat = 50;
				}
				if (!long || isNaN(lat)) {
					long = 50;
				}
				coords = [+lat, +long];
				imageData = await this.toDataURL(encodeURIComponent(image));
				if (!imageData) {
					let newPre = createEl('pre');
					newPre.createEl('code', {}, (code) => {
						code.innerText = `\`\`\`leaflet\n${source}\`\`\``;
						el.parentElement.replaceChild(newPre, el);
					});
					return;

				};

				map.renderImage(imageData, coords);

			} else {

				if (!lat || isNaN(lat)) {
					lat = 0;
				}
				if (!long || isNaN(lat)) {
					long = 0;
				}
				coords = [+lat, +long];
				map.renderReal(coords);

			}

			this.registerMapEvents(map);

			this.maps.push(map);
			await this.saveSettings();
		} catch (e) {

			new Notice('There was an error loading the map.')

		}

	}

	async loadSettings() {
		this.AppData = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}
	async saveSettings() {

		this.maps.forEach(map => {

			this.AppData.mapMarkers = this.AppData.mapMarkers.filter(m => m.path != map.path);

			this.AppData.mapMarkers.push({
				path: map.path,
				file: map.file,
				markers: map.markers.map(
					(marker): MarkerData => {
						return {
							type: marker.marker.type,
							id: marker.id,
							loc: [marker.loc.lat, marker.loc.lng],
							link: marker.link,
						};
					}
				),
			});
		})

		await this.saveData(this.AppData);

		this.AppData.markerIcons.forEach((marker) => {
			addIcon(marker.type, icon(getIcon(marker.iconName)).html[0]);
		});

		this.markerIcons = this.generateMarkerMarkup(this.AppData.markerIcons);

		this.maps.forEach((map) => map.setMarkerIcons(this.markerIcons));
	}
	getEditor(): CodeMirror.Editor {
		let view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			return view.sourceMode.cmEditor;
		}
		return null;
	}

	generateMarkerMarkup(
		markers: Marker[] = this.AppData.markerIcons
	): MarkerIcon[] {
		let ret = markers.map((marker) => {
			if (!marker.transform) {
				marker.transform = this.AppData.defaultMarker.transform;
			}
			if (!marker.iconName) {
				marker.iconName = this.AppData.defaultMarker.iconName;
			}
			let html: string,
				iconNode: AbstractElement = icon(getIcon(marker.iconName), {
					transform: marker.transform,
					mask: getIcon(this.AppData.defaultMarker?.iconName),
					classes: ["full-width-height"],
				}).abstract[0];

			iconNode.attributes = {
				...iconNode.attributes,
				style: `color: ${marker.color
					? marker.color
					: this.AppData.defaultMarker?.color
					}`,
			};

			html = toHtml(iconNode);

			return { type: marker.type, html: html };
		});
		if (this.AppData.defaultMarker.iconName) {
			ret.unshift({
				type: "default",
				html: icon(getIcon(this.AppData.defaultMarker.iconName), {
					classes: ["full-width-height"],
					styles: {
						color: this.AppData.defaultMarker.color,
					},
				}).html[0],
			});
		}

		return ret;
	}

	async toDataURL(url: string): Promise<string> {
		//determine link type
		try {
			let response, blob: Blob;
			url = decodeURIComponent(url);
			if (/http[s]*:/.test(url)) {
				//url
				response = await fetch(url);
				blob = await response.blob();
			} else if (/obsidian:\/\/open/.test(url)) {
				//obsidian link
				let [, filePath] = url.match(
					/\?vault=[\s\S]+?&file=([\s\S]+)/
				);

				filePath = decodeURIComponent(filePath);
				let file = this.app.vault.getAbstractFileByPath(filePath);
				if (!file || !(file instanceof TFile)) throw new Error();

				let buffer = await this.app.vault.readBinary(file);
				blob = new Blob([new Uint8Array(buffer)]);

			} else {
				//file exists on disk
				let file = this.app.vault.getAbstractFileByPath(url);
				if (!file || !(file instanceof TFile)) throw new Error();

				let buffer = await this.app.vault.readBinary(file);
				blob = new Blob([new Uint8Array(buffer)]);
			}

			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => {
					resolve(reader.result as string);
				};
				reader.onerror = reject;
				reader.readAsDataURL(blob);
			});
		} catch (e) {
			new Notice(`There was an error reading the image file: ${url}`)
		}
	}

	registerMapEvents(map: LeafletMap) {
		this.registerDomEvent(map.contentEl, "dragover", (evt) => {
			evt.preventDefault();
		});
		this.registerDomEvent(map.contentEl, "drop", (evt) => {
			evt.stopPropagation();

			let file = decodeURIComponent(
				evt.dataTransfer.getData("text/plain")
			)
				.split("file=")
				.pop();

			map.createMarker(
				map.markerIcons[0],
				map.map.layerPointToLatLng(point(evt.offsetX, evt.offsetY)),
				file + ".md"
			);
		});

		this.registerEvent(
			map.on("marker-added", async (marker: LeafletMarker) => {

				await this.saveSettings();
			})
		);

		this.registerEvent(
			map.on("marker-click", (link: string, newWindow: boolean) => {
				this.app.workspace
					.openLinkText("", link, newWindow)
					.then(() => {
						var cmEditor = this.getEditor();
						cmEditor.focus();
					});
			})
		);

		this.registerEvent(
			map.on("marker-context", async (marker: LeafletMarker) => {
				let markerSettingsModal = new Modal(this.app);

				new Setting(markerSettingsModal.contentEl)
					.setName("Note to Open")
					.setDesc(
						"Path of note to open, e.g. Folder1/Folder2/Note.md"
					)
					.addText((text) => {
						text.setPlaceholder("Path")
							.setValue(marker.link)
							.onChange(async (value) => {
								marker.link = value;
								await this.saveSettings();
							});
					});

				new Setting(markerSettingsModal.contentEl)
					.setName("Marker Type")
					.addDropdown((drop) => {
						drop.addOption("default", "Base Marker");
						this.AppData.markerIcons.forEach((marker) => {
							drop.addOption(marker.type, marker.type);
						});
						drop.setValue(marker.marker.type).onChange(
							async (value) => {
								let newMarker =
									value == "default"
										? this.AppData.defaultMarker
										: this.AppData.markerIcons.find(
											(m) => m.type == value
										);
								let html: string,
									iconNode: AbstractElement = icon(
										getIcon(newMarker.iconName),
										{
											transform: { size: 6, x: 0, y: -2 },
											mask: getIcon(
												this.AppData.defaultMarker
													?.iconName
											),
											classes: ["full-width-height"],
										}
									).abstract[0];

								iconNode.attributes = {
									...iconNode.attributes,
									style: `color: ${newMarker.color
										? newMarker.color
										: this.AppData.defaultMarker?.color
										}`,
								};

								html = toHtml(iconNode);

								marker.marker = {
									type: newMarker.type,
									html: html,
								};

								await this.saveSettings();
							}
						);
					});

				new Setting(markerSettingsModal.contentEl).addButton((b) => {
					b.setIcon("trash")
						.setWarning()
						.setTooltip("Delete Marker")
						.onClick(async () => {
							marker.leafletInstance.remove();
							map.markers = map.markers.filter(
								(m) => m.id != marker.id
							);
							markerSettingsModal.close();
							await this.saveSettings();
						});
					return b;
				});

				markerSettingsModal.open();
			})
		);
	}
}
