//module imports
import * as L from "leaflet";
import 'leaflet/dist/leaflet.css';

import { Events, Menu, Point } from "obsidian";
import { v4 as uuidv4 } from "uuid";

/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
export default class LeafletMap extends Events {
	parentEl: HTMLElement;
	contentEl: HTMLElement;
	map: L.Map;
	bounds: L.LatLngBounds;
	markers: Array<LeafletMarker> = [];
	file: string;
	path: string;
	markerIcons: MarkerIcon[] = [];
	rendered: boolean = false;
	zoom: { min: number, max: number, default: number, delta: number };
	tooltip: L.Tooltip = L.tooltip({
		className: 'leaflet-marker-link-tooltip',
		direction: 'top',
	});
	constructor(
		el: HTMLElement,
		height: string = "500px",
		file: string,
		path: string,
		markerIcons: MarkerIcon[],
		minZoom: number = 1,
		maxZoom: number = 10,
		defaultZoom: number = 1,
		zoomDelta: number = 1
	) {
		super();

		this.parentEl = el;
		this.file = file;
		this.path = path;
		this.markerIcons = markerIcons;
		this.zoom = {
			min: minZoom,
			max: maxZoom,
			default: defaultZoom,
			delta: zoomDelta
		}
		this.contentEl = el.appendChild(
			document.createElement("div") as HTMLElement
		);
		this.contentEl.setAttribute("style", `height: ${height}; width: 100%;`);

	}


	loadData(data: any): Promise<void> {
		return new Promise(resolve => {
			data?.markers.forEach((marker: MarkerData) => {
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

	async renderImage(image: string, coords?: [number, number]) {
		this.map = L.map(this.contentEl, {
			crs: L.CRS.Simple,
			maxZoom: this.zoom.max,
			minZoom: this.zoom.min,
			zoomDelta: this.zoom.delta,
			zoomSnap: this.zoom.delta
		});
		this.markers.forEach(marker => {
			marker.leafletInstance.addTo(this.map);
		})

		//const uri = await Utils.toDataURL(image);
		let { h, w } = await LeafletMap.getImageDimensions(image);

		var southWest = this.map.unproject([0, h], this.map.getMaxZoom() - 1);
		var northEast = this.map.unproject([w, 0], this.map.getMaxZoom() - 1);
		this.bounds = new L.LatLngBounds(southWest, northEast);

		// add the image overlay,
		// so that it covers the entire map
		L.imageOverlay(image, this.bounds).addTo(this.map);
		this.map.fitBounds(this.bounds);
		this.map.panTo(this.bounds.getCenter());

		// tell leaflet that the map is exactly as big as the image
		this.map.setMaxBounds(this.bounds);
		this.map.setZoom(this.zoom.default, { animate: false });

		if (coords) {
			this.map.panTo([coords[0] * this.bounds.getSouthEast().lat / 100, coords[1] * this.bounds.getSouthEast().lng / 100]);
		}

		this.map.on("contextmenu", this.contextMenu.bind(this));

		this.rendered = true;

	}

	async renderReal(coords: [number, number] = [0, 0]) {

		this.map = L.map(this.contentEl, {
			maxZoom: this.zoom.max,
			minZoom: this.zoom.min,
			worldCopyJump: true,
			zoomDelta: this.zoom.delta,
			zoomSnap: this.zoom.delta
		}).setView(coords, this.zoom.default);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);

		this.markers.forEach(marker => {
			marker.leafletInstance.addTo(this.map);
		})
		this.map.setZoom(this.zoom.default, { animate: false });

		this.map.on("contextmenu", this.contextMenu.bind(this));

		this.rendered = true;

	}

	contextMenu(evt: L.LeafletMouseEvent): void {
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
	): LeafletMarker {
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
				L.DomEvent.stopPropagation(evt);
				marker.leafletInstance.closeTooltip();
				if (marker.link) {
					this.trigger(
						"marker-click",
						marker.link,
						evt.originalEvent.ctrlKey
					);
				}
			})
			.on('drag', () => {
				marker.leafletInstance.closeTooltip();
			})
			.on("dragend", (evt: L.LeafletMouseEvent) => {
				marker.loc = marker.leafletInstance.getLatLng();
				this.trigger("marker-added", marker);
				marker.leafletInstance.closeTooltip();
			})
			.on('mouseover', (evt: L.LeafletMouseEvent) => {

				if (marker.link) {
					let el = evt.originalEvent.target as SVGElement;
					this.tooltip.setContent(marker.link.split('/').pop());
					marker.leafletInstance.bindTooltip(
						this.tooltip,
						{
							offset: new L.Point(0, -1 * el.getBoundingClientRect().height)
						}
					).openTooltip();
				}

			})
			.on('mouseout', (evt: L.LeafletMouseEvent) => {


				marker.leafletInstance.closeTooltip();

			})

		if (this.rendered) {

			marker.leafletInstance.addTo(this.map);
			marker.leafletInstance.closeTooltip();

		}

		this.markers.push(marker);

		this.trigger("marker-added", marker);

		return marker;

	}
	setMarkerIcons(markerIcons: MarkerIcon[]) {

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

	static async getImageDimensions(url: string): Promise<any> {
		return new Promise(function (resolved, rejected) {
			var i = new Image();
			i.onload = function () {
				resolved({ w: i.width, h: i.height });
			};
			i.src = url;
		});
	}
}
