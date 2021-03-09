//module imports
import * as L from "leaflet";
import 'leaflet/dist/leaflet.css';

import { Events, Menu, Point } from "obsidian";
/* import { EventEmitter } from "events"; */
import { v4 as uuidv4 } from "uuid";

//local imports
import Utils from "./utils";

/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
export default class LeafletMap extends Events {
	parent: HTMLElement;
	element: HTMLElement;
	map: L.Map;
	bounds: L.LatLngBounds;
	markers: Array<LeafletMarker> = [];
	path: string;
	source: string;
	markerIcons: MarkerIcon[] = [];
	constructor(
		el: HTMLElement,
		image: string,
		height: string = "500px",
		sourcePath: string,
		markerIcons: MarkerIcon[]
	) {
		super();

		this.parent = el;
		this.path = `${sourcePath}/${image}`;
		this.source = image;
		this.markerIcons = markerIcons;

		this.init(image, height);
	}

	async init(image: string, height: string): Promise<void> {
		this.element = this.parent.appendChild(
			document.createElement("div") as HTMLElement
		);
		this.element.setAttribute("style", `height: ${height}; width: 100%;`);

		this.map = L.map(this.element, {
			minZoom: 1,
			maxZoom: 10,
			zoom: 1,
			crs: L.CRS.Simple,
		});

		const uri = await Utils.toDataURL(image);
		let { h, w } = await Utils.getImageDimensions(uri);

		var southWest = this.map.unproject([0, h], this.map.getMaxZoom() - 1);
		var northEast = this.map.unproject([w, 0], this.map.getMaxZoom() - 1);
		this.bounds = new L.LatLngBounds(southWest, northEast);

		// add the image overlay,
		// so that it covers the entire map
		L.imageOverlay(uri, this.bounds).addTo(this.map);
		this.map.fitBounds(this.bounds);
		this.map.panTo(this.bounds.getCenter());
		// tell leaflet that the map is exactly as big as the image
		this.map.setMaxBounds(this.bounds);

		this.map.on("contextmenu", this.contextMenu.bind(this));
	}

	loadData(data: MarkerData[]): Promise<void> {
		return new Promise(resolve => {
			data.forEach((marker: MarkerData) => {
				this.createMarker(
					this.markerIcons.find(icon => icon.type == marker.type),
					L.latLng(marker.loc),
					marker.link,
					marker.id
				);
			});
			resolve();
		});
	}

	contextMenu(evt: L.LeafletMouseEvent): void {
		/** Create Context Menu */

		if (this.markerIcons.length <= 1) {
			this.createMarker(this.markerIcons[0], evt.latlng);
			return;
		}

		let contextMenu = new Menu().setNoIcon();
		this.markerIcons.forEach((marker: MarkerIcon) => {
			if (!marker.type || !marker.html) return;
			contextMenu.addItem(item => {
				item.setTitle(
					marker.type == "default" ? "Default" : marker.type
				);
				item.setActive(true);
				item.onClick(() => this.createMarker(marker, evt.latlng));
			});
		});

		contextMenu.showAtPosition({
			x: evt.originalEvent.clientX,
			y: evt.originalEvent.clientY,
		} as Point);
	}

	createMarker(
		markerIcon: MarkerIcon,
		loc: L.LatLng,
		link: string | undefined = undefined,
		id: string = uuidv4()
	): void {
		const mapIcon = L.divIcon({
			html: markerIcon.html,
		});
		const marker: LeafletMarker = {
			id: id,
			marker: markerIcon,
			loc: loc,
			link: link,
			leafletInstance: L.marker(loc, {
				icon: mapIcon,
				draggable: true,
				bubblingMouseEvents: true,
			}),
		};
		marker.leafletInstance
			.on("contextmenu", (evt: L.LeafletMouseEvent) => {
				L.DomEvent.stopPropagation(evt);

				this.trigger("marker-context", marker);
			})
			.on("click", async (evt: L.LeafletMouseEvent) => {
				//L.DomEvent.stopPropagation(evt);
				if (marker.link) {
					this.trigger(
						"marker-click",
						marker.link,
						evt.originalEvent.ctrlKey
					);
				}
			})
			.on("dragend", evt => {
				marker.loc = marker.leafletInstance.getLatLng();
				this.trigger("marker-added", marker);
			});

		marker.leafletInstance.addTo(this.map);

		this.markers.push(marker);

		this.trigger("marker-added", marker);
	}
	setMarkerIcons(markerIcons: MarkerIcon[]) {
		/* this.map.eachLayer(layer => {
			if (layer instanceof L.Marker) {
				const oldIcon = this.markerIcons.find(
					marker =>
						marker.html ==
						(layer.getIcon() as L.DivIcon).options.html
				).type;

				layer.setIcon(
					L.divIcon({
						html: markerIcons.find(marker => marker.type == oldIcon)
							.html,
					})
				);
			}
		}); */

		this.markerIcons = markerIcons;
		this.markers.forEach(marker => {
			marker.leafletInstance.setIcon(
				L.divIcon({
					html: markerIcons.find(
						icon => icon.type == marker.marker.type
					).html,
				})
			);
		});
	}
}
