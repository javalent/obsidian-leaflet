import {
	Plugin,
	MarkdownPostProcessorContext,
	addIcon,
	Notice,
	MarkdownView,
	FileSystemAdapter,
	Modal,
	Setting,
	TFile,
} from "obsidian";
import { point, latLng } from "leaflet";

//Local Imports
import { ObsidianLeafletSettingTab, DEFAULT_SETTINGS } from "./settings";
import { IconDefinition, AbstractElement, icon, toHtml } from "./icons";
import LeafletMap from "./leaflet";
declare global {
	interface MapsInterface {
		[key: string]: MapInterface;
	}
	interface MapInterface {
		[key: string]: LeafletMap;
	}
	interface Marker {
		type: string;
		icon: IconDefinition;
		color?: string;
		layer?: boolean;
	}
	interface LeafletMarker {
		marker: MarkerIcon;
		loc: L.LatLng;
		id: string;
		link?: string;
		leafletInstance: L.Marker;
	}
	interface ObsidianAppData {
		maps: MapsInterface;
		markers: Marker[];
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
	async onload(): Promise<void> {
		console.log("loading leaflet plugin");

		await this.loadSettings();

		this.markerIcons = this.generateMarkerMarkup(this.AppData.markers);

		this.registerMarkdownCodeBlockProcessor(
			"leaflet",
			this.postprocessor.bind(this)
		);

		this.addSettingTab(new ObsidianLeafletSettingTab(this.app, this));
	}

	async onunload(): Promise<void> {
		console.log("unloading plugin");
	}

	async postprocessor(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContextActual
	): Promise<void> {
		let { image, height = "500px" } = Object.fromEntries(
			source.split("\n").map(l => l.split(": "))
		);

		if (!image) {
			console.error("An image source url must be provided.");
			el.appendText("An image source url must be provided.");
			el.setAttribute("style", "color: red;");
			return;
		}

		let map = new LeafletMap(
			el,
			image,
			height,
			ctx.sourcePath,
			this.markerIcons
		);

		const file = this.app.vault.getAbstractFileByPath(
			ctx.sourcePath
		) as TFile;
		const content = await this.app.vault.read(file);
		const sourceLocationInFile = [
			content.indexOf(source),
			content.indexOf(source) +
				`${content}`.slice(content.indexOf(source)).indexOf("```") +
				3,
		];

		let markers = source
			.split("\n")
			.map(l => l.split(": "))
			.filter(([type]) => type == "marker");

		//await this.app.vault.modify(file, content + `\nTest`)

		if (markers.length) {
			markers.forEach(marker => {
				let [latlng, type, link, id] = marker[1].split("|");
				console.log(
					"🚀 ~ file: main.ts ~ line 113 ~ ObsidianLeaflet ~ id, latlng, link, type",
					id,
					latLng(JSON.parse(latlng)),
					link,
					type
				);
				let loc = latLng(JSON.parse(latlng));

				map.createMarker(
					this.markerIcons.find(m => m.type == type),
					loc,
					link,
					id
				);
			});
		}

		el.addEventListener("dragover", evt => {
			evt.preventDefault();
		});
		el.addEventListener("drop", evt => {
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

		map.on("marker-added", async (marker: LeafletMarker) => {
			await this.saveSettings();
		});

		map.on("marker-click", (link: string, newWindow: boolean) => {
			this.app.workspace.openLinkText("", link, newWindow).then(() => {
				var cmEditor = this.getEditor();
				cmEditor.focus();
			});
		});

		map.on("marker-context", async (marker: LeafletMarker) => {
			let markerSettingsModal = new Modal(this.app);

			new Setting(markerSettingsModal.contentEl)
				.setName("Note to Open")
				.setDesc("Path of note to open, e.g. Folder1/Folder2/Note.md")
				.addText(text => {
					text.setPlaceholder("Path")
						.setValue(marker.link)
						.onChange(async value => {
							marker.link = value;
							await this.saveSettings();
						});
				});

			new Setting(markerSettingsModal.contentEl).addButton(b => {
				b.setIcon("trash")
					.setWarning()
					.setTooltip("Delete Marker")
					.onClick(async () => {
						marker.leafletInstance.remove();
						map.markers = map.markers.filter(
							m => m.id != marker.id
						);
						markerSettingsModal.close();
						await this.saveSettings();
					});
				return b;
			});

			markerSettingsModal.open();
		});

		if (!this.maps[ctx.sourcePath]) {
			this.maps[ctx.sourcePath] = {};
		}

		if (this.maps[ctx.sourcePath][image]) {
			map.loadData(this.maps[ctx.sourcePath][image]);
		}

		this.maps[ctx.sourcePath][image] = map;

		await this.saveSettings();

		await this.saveSettings();
	}
	get maps() {
		return this.AppData.maps;
	}
	async loadSettings() {
		this.AppData = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}
	async saveSettings() {
		await this.saveData(this.AppData);

		try {
			this.AppData.markers.forEach(marker => {
				addIcon(marker.type, icon(marker.icon).html[0]);
			});

			this.markerIcons = this.generateMarkerMarkup(this.AppData.markers);

			Object.values(this.maps).forEach(maps =>
				Object.values(maps).forEach(map =>
					map.setMarkerIcons(this.markerIcons)
				)
			);
		} catch (e) {}
	}
	getEditor() {
		var view = this.app.workspace.activeLeaf.view;
		if (view.getViewType() == "markdown") {
			var markdownView = view as MarkdownView;
			var cmEditor = markdownView.sourceMode.cmEditor;
			return cmEditor;
		}
		return null;
	}

	generateMarkerMarkup(
		markers: Marker[] = this.AppData.markers
	): MarkerIcon[] {
		let ret = markers.map(marker => {
			try {
				let html: string,
					iconNode: AbstractElement = icon(marker.icon, {
						transform: { size: 6, x: 0, y: -2 },
						mask: this.AppData.defaultMarker?.icon,
						classes: ["full-width-height"],
					}).abstract[0];

				iconNode.attributes = {
					...iconNode.attributes,
					style: `color: ${
						marker.color
							? marker.color
							: this.AppData.defaultMarker?.color
					}`,
				};

				html = toHtml(iconNode);

				return { type: marker.type, html: html };
			} catch (e) {}
		});
		ret.unshift({
			type: "Default",
			html: icon(this.AppData.defaultMarker.icon, {
				classes: ["full-width-height"],
				styles: {
					color: this.AppData.defaultMarker.color,
				},
			}).html[0],
		});

		return ret;
	}
}
