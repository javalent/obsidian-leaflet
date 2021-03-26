//module imports
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Events, Menu, Notice, Point } from "obsidian";
import { v4 as uuidv4 } from "uuid";

// @ts-expect-error
import layerIcon from "../node_modules/leaflet/dist/images/layers.png";

interface LayerGroup {
    group: L.LayerGroup;
    layer: L.TileLayer | L.ImageOverlay;
    id: string;
}

/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
export default class LeafletMap extends Events {
    parentEl: HTMLElement;
    id: string;
    contentEl: HTMLElement;
    map: L.Map;
    markers: Array<LeafletMarker> = [];
    file: string;
    path: string;
    markerIcons: MarkerIcon[] = [];
    rendered: boolean = false;
    zoom: { min: number; max: number; default: number; delta: number };
    tooltip: L.Tooltip = L.tooltip({
        className: "leaflet-marker-link-tooltip",
        direction: "top"
    });
    mapLayers: LayerGroup[];
    layer: L.ImageOverlay | L.TileLayer;
    resize: ResizeObserver;
    type: string;
    scale: number;
    unit: string;
    constructor(
        el: HTMLElement,
        id: string,
        file: string,
        path: string,
        markerIcons: MarkerIcon[],
        minZoom: number = 1,
        maxZoom: number = 10,
        defaultZoom: number = 1,
        zoomDelta: number = 1,
        unit: string,
        scale: number
    ) {
        super();
        this.id = id;
        this.parentEl = el;
        this.file = file;
        this.path = path;
        this.markerIcons = markerIcons;
        this.zoom = {
            min: minZoom,
            max: maxZoom,
            default: defaultZoom,
            delta: zoomDelta
        };
        this.unit = unit;
        this.scale = scale;
        this.contentEl = el.appendChild(
            document.createElement("div") as HTMLElement
        );
    }

    loadData(data: any): Promise<void> {
        return new Promise((resolve) => {
            data?.markers.forEach((marker: MarkerData) => {
                if (!marker.layer && this.group) {
                    marker.layer = this.group.id;
                }
                this.createMarker(
                    this.markerIcons.find((icon) => icon.type == marker.type),
                    L.latLng(marker.loc),
                    marker.link,
                    marker.id,
                    marker.layer
                );
            });
            resolve();
        });
    }

    async renderImage(
        layers: { data: string; id: string }[],
        coords?: [number, number]
    ) {
        this.type = "image";
        this.map = L.map(this.contentEl, {
            crs: L.CRS.Simple,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta
        });

        this.map.on("baselayerchange", ({ layer }) => {
            // need to do this to prevent panning animation for some reason
            this.map.setMaxBounds([undefined, undefined]);
            this.layer = layer.getLayers()[0];
            this.map.panTo(this.bounds.getCenter(), {
                animate: false
            });
            this.map.setMaxBounds(this.bounds);
        });

        this.mapLayers = await Promise.all(
            layers.map(async (layer) => {
                let { h, w } = await LeafletMap.getImageDimensions(layer.data);

                let southWest = this.map.unproject([0, h], this.zoom.max - 1);
                let northEast = this.map.unproject([w, 0], this.zoom.max - 1);

                let mapLayer = L.imageOverlay(
                    layer.data,
                    new L.LatLngBounds(southWest, northEast)
                );
                return {
                    group: L.layerGroup([mapLayer]),
                    layer: mapLayer,
                    id: layer.id
                };
            })
        );

        this.layer = this.mapLayers[0].layer as L.ImageOverlay;
        this.map.addLayer(this.mapLayers[0].group);
        this.map.fitBounds(this.bounds);
        this.map.panTo(this.bounds.getCenter(), {
            animate: false
        });
        this.map.setMaxBounds(this.bounds);
        this.map.setZoom(this.zoom.default, { animate: false });
        this.markers.forEach((marker) => {
            if (marker.layer) {
                this.mapLayers
                    .find(({ id }) => id == marker.layer)
                    ?.group.addLayer(marker.leafletInstance);
            } else {
                this.mapLayers[0].group.addLayer(marker.leafletInstance);
            }
        });

        if (coords) {
            this.map.panTo([
                (coords[0] * this.bounds.getSouthEast().lat) / 100,
                (coords[1] * this.bounds.getSouthEast().lng) / 100
            ]);
        }
        if (layers.length > 1) {
            const layerControls = Object.fromEntries(
                this.mapLayers.reverse().map((l, i) => [`Layer ${i}`, l.group])
            );
            let control = L.control.layers(layerControls).addTo(this.map);

            // hack to get icon from layers.png
            // @ts-expect-error
            control._container.children[0].appendChild(
                createEl("img", {
                    attr: {
                        src: layerIcon,
                        style: "width: 26px; height: 26px; margin: auto;"
                    }
                })
            );
        }

        this.map.on("contextmenu", this.contextMenu.bind(this));

        let click: L.LatLng | undefined = undefined;
        this.map.on("click", (evt: L.LeafletMouseEvent) => {
            if (!evt.originalEvent.ctrlKey) {
                click = undefined;
                return;
            }

            if (click != undefined) {
                this.trigger(
                    "display-distance",
                    `${(
                        this.map.distance(click, evt.latlng) * this.scale
                    ).toLocaleString(navigator.language, {
                        maximumFractionDigits: 1
                    })} ${this.unit}`
                );
                click = undefined;
            } else {
                click = evt.latlng;
            }
        });

        this.rendered = true;
        this.handleResize();
    }
    handleResize() {
        this.resize = new ResizeObserver(() => {
            this.map.invalidateSize();
        });
        this.resize.observe(this.contentEl);
    }
    get group() {
        return this.mapLayers?.find((group) => group.layer == this.layer);
    }
    get bounds() {
        if (this.layer instanceof L.ImageOverlay) {
            return this.layer.getBounds();
        }
        return;
    }
    async renderReal(coords: [number, number] = [0, 0]) {
        this.type = "real";

        this.map = L.map(this.contentEl, {
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            worldCopyJump: true,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta
        }).setView(coords, this.zoom.default);
        this.layer = L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
        );
        const group = L.layerGroup([this.layer]);
        this.mapLayers = [
            {
                group: group,
                layer: this.layer,
                id: "real"
            }
        ];
        this.mapLayers[0].group.addTo(this.map);

        this.markers.forEach((marker) => {
            marker.leafletInstance.addTo(this.map);
        });
        this.map.setZoom(this.zoom.default, { animate: false });

        this.map.on("contextmenu", this.contextMenu.bind(this));
        let click: L.LatLng | undefined = undefined;
        this.map.on("click", (evt: L.LeafletMouseEvent) => {
            if (!evt.originalEvent.ctrlKey) {
                click = undefined;
                return;
            }

            if (click != undefined) {
                this.trigger(
                    "display-distance",
                    `${this.map
                        .distance(click, evt.latlng)
                        .toLocaleString(navigator.language, {
                            maximumFractionDigits: 1
                        })}${this.unit}`
                );
                click = undefined;
            } else {
                click = evt.latlng;
            }
        });
        this.rendered = true;
        this.handleResize();
    }

    contextMenu(evt: L.LeafletMouseEvent): void {
        if (this.markerIcons.length <= 1) {
            this.createMarker(this.markerIcons[0], evt.latlng);
            return;
        }

        let contextMenu = new Menu().setNoIcon();
        this.markerIcons.forEach((marker: MarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.setActive(true);
                item.onClick(() => this.createMarker(marker, evt.latlng));
            });
        });

        contextMenu.showAtPosition({
            x: evt.originalEvent.clientX,
            y: evt.originalEvent.clientY
        } as Point);
    }

    addMarker(markerToBeAdded: LeafletMarker) {
        const mapIcon = L.divIcon({
            html: markerToBeAdded.marker.html
        });

        const marker: LeafletMarker = {
            id: markerToBeAdded.id,
            marker: markerToBeAdded.marker,
            loc: markerToBeAdded.loc,
            link: markerToBeAdded.link,
            leafletInstance: L.marker(markerToBeAdded.loc, {
                icon: mapIcon,
                draggable: true,
                bubblingMouseEvents: true
            }),
            layer: markerToBeAdded.layer
                ? markerToBeAdded.layer
                : this.group?.id
        };
        this.bindMarkerEvents(marker);

        if (this.rendered) {
            this.group.group.addLayer(marker.leafletInstance);
            marker.leafletInstance.closeTooltip();
        }

        this.markers.push(marker);
    }
    createMarker(
        markerIcon: MarkerIcon,
        loc: L.LatLng,
        link: string | undefined = undefined,
        id: string = uuidv4(),
        layer: string | undefined = undefined
    ): LeafletMarker {
        const mapIcon = L.divIcon({
            html: markerIcon.html
        });

        const marker: LeafletMarker = {
            id: id,
            marker: markerIcon,
            loc: loc,
            link: link,
            leafletInstance: L.marker(loc, {
                icon: mapIcon,
                draggable: true,
                bubblingMouseEvents: true
            }),
            layer: layer ? layer : this.group?.id
        };

        this.bindMarkerEvents(marker);

        if (this.rendered) {
            //marker.leafletInstance.addTo(this.map);
            this.group.group.addLayer(marker.leafletInstance);
            marker.leafletInstance.closeTooltip();
        }

        this.markers.push(marker);

        this.trigger("marker-added", marker);

        return marker;
    }

    bindMarkerEvents(marker: LeafletMarker) {
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
            .on("dragstart", () => {
                marker.leafletInstance.closeTooltip();
            })
            .on("drag", () => {
                this.trigger("marker-dragging", marker);
            })
            .on("dragend", (evt: L.LeafletMouseEvent) => {
                marker.loc = marker.leafletInstance.getLatLng();
                this.trigger("marker-data-updated", marker);
                marker.leafletInstance.closeTooltip();
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                if (marker.link) {
                    this.trigger("marker-mouseover", evt, marker);
                }
            })
            .on("mouseout", (evt: L.LeafletMouseEvent) => {
                marker.leafletInstance.closeTooltip();
            });
    }

    setMarkerIcons(markerIcons: MarkerIcon[]) {
        this.markerIcons = markerIcons;
        this.markers.forEach((marker) => {
            marker.leafletInstance.setIcon(
                L.divIcon({
                    html: markerIcons.find(
                        (icon) => icon.type == marker.marker.type
                    ).html
                })
            );
        });
    }

    remove(): void {
        this.map?.remove();
        this.resize?.disconnect();
    }

    static async getImageDimensions(url: string): Promise<any> {
        return new Promise(function (resolved, reject) {
            var i = new Image();
            i.onload = function () {
                resolved({ w: i.width, h: i.height });
            };
            i.onerror = () => {
                new Notice("There was an issue getting the image dimensions.");
                reject();
            };

            i.src = url;
        });
    }
}
