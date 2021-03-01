import {
	App,
	MarkdownPostProcessorContext,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';
import * as L from 'leaflet';
import { library, icon } from '@fortawesome/fontawesome-svg-core';

/* interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
} */

import icons from './icons';

console.log(icons, icon(icons[0]));
library.add(...icons);

export default class MyPlugin extends Plugin {
	/* settings: MyPluginSettings; */

	async onload() {
		console.log('loading leaflet plugin');
		/* await this.loadSettings(); */
/* 
		this.addSettingTab(new SampleSettingTab(this.app, this)); */

		this.registerMarkdownCodeBlockProcessor('leaflet', LeafletPostprocessor.postprocessor);

	}

	onunload() {
		console.log('unloading plugin');
	}

	/* async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	} */

	/* async saveSettings() {
		await this.saveData(this.settings);
	}*/
} 

class LeafletPostprocessor {
	static async postprocessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {

		let { image, height = '500px' } = Object.fromEntries(source.split('\n').map(l => l.split(': ')));

		const mapEl = el.appendChild(document.createElement('div') as HTMLElement);
		if (!image) { console.error('An image source url must be provided.'); mapEl.appendText('An image source url must be provided.'); mapEl.setAttribute('style', 'color: red;'); return; }


		mapEl.setAttribute('style', `height: ${height}; width: 100%;`)

		const uri = await LeafletPostprocessor.toDataURL(image);
		let { h, w } = await LeafletPostprocessor.getImageDimensions(uri);

		var map = L.map(mapEl, {
			minZoom: 1,
			maxZoom: 10,
			zoom: 1,
			crs: L.CRS.Simple
		});

		var southWest = map.unproject([0, h], map.getMaxZoom() - 1);
		var northEast = map.unproject([w, 0], map.getMaxZoom() - 1);
		var bounds = new L.LatLngBounds(southWest, northEast);


		// add the image overlay, 
		// so that it covers the entire map
		L.imageOverlay(uri, bounds).addTo(map);
		map.fitBounds(bounds);
		map.panTo(bounds.getCenter());
		// tell leaflet that the map is exactly as big as the image
		map.setMaxBounds(bounds);

		function onMapClick(e: L.LeafletMouseEvent) {
			const mapIcon = L.divIcon({ html: icon(icons[0], { classes: ['full-width-height']}).node[0] as HTMLElement });
			const marker = L.marker(e.latlng, { icon: mapIcon, draggable: true })
			marker.addTo(map);
		}

		map.on('contextmenu', onMapClick);

	}

	static async getImageDimensions(url: string): Promise<any> {
		return new Promise(function (resolved, rejected) {
			var i = new Image()
			i.onload = function () {
				resolved({ w: i.width, h: i.height })
			};
			i.src = url
		})
	}

	static async toDataURL(url: string): Promise<string> {
		const response = await fetch(url);

		const blob = await response.blob();
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				resolve(reader.result as string)
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	}
}

/* class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {
			containerEl
		} = this;

		containerEl.empty();

		containerEl.createEl('h2', {
			text: 'Settings for my awesome plugin.'
		});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue('')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
} */