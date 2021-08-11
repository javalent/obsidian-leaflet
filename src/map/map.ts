import { Length } from "convert/dist/types/units";
import { locale } from "moment";
import { Events, Notice, Scope } from "obsidian";
import {
    LayerGroup,
    LeafletMapOptions,
    Marker,
    MarkerIcon,
    ObsidianLeaflet,
    Popup,
    SavedMarkerProperties,
    SavedOverlayData,
    TooltipDisplay
} from "src/@types";
import { Overlay } from "src/layer";
import {
    DEFAULT_MAP_OPTIONS,
    DISTANCE_DECIMALS,
    getId,
    LAT_LONG_DECIMALS,
    log
} from "src/utils";
import { LeafletSymbol } from "../utils/leaflet-import";
import { popup } from "./popup";
let L = window[LeafletSymbol];
export abstract class BaseMap<
    T extends L.ImageOverlay | L.TileLayer
> extends Events {
    isDrawing: boolean = false;
    private escapeScope: Scope;
    /** Abstract */
    abstract initialize(): void;
    abstract render(): Promise<void>;
    abstract type: "image" | "real";
    abstract get bounds(): L.Bounds;
    abstract get scale(): number;
    abstract get CRS(): L.CRS;

    constructor(
        public plugin: ObsidianLeaflet,
        public options: LeafletMapOptions
    ) {
        super();
        this.contentEl.style.height = options.height;
        this.contentEl.style.width = "100%";
        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);

        this.escapeScope = new Scope();
        this.escapeScope.register(undefined, "Escape", () => {
            if (!this.isFullscreen) {
                this.stopDrawingContext();

                this.plugin.app.keymap.popScope(this.escapeScope);
            }
        });
    }

    contentEl: HTMLElement = createDiv();
    currentLayer: T;
    get currentGroup() {
        return this.mapLayers?.find(
            (group) => group.layer == this.currentLayer
        );
    }
    get data() {
        return this.plugin.data;
    }
    get defaultIcon(): MarkerIcon {
        return this.markerIcons.get("default");
    }
    displaying: Map<string, boolean> = new Map();
    private distanceEvent: L.LatLng = undefined;
    private distanceLine: L.Polyline;
    private previousDistanceLine: L.Polyline;
    featureLayer: L.FeatureGroup;

    get id() {
        return this.options.id;
    }

    initialCoords: [number, number];

    get isFullscreen(): boolean {
        return this.leafletInstance.isFullscreen();
    }
    leafletInstance: L.Map;
    mapLayers: LayerGroup[] = [];
    get markerIcons(): Map<string, MarkerIcon> {
        return new Map(
            this.plugin.markerIcons.map((markerIcon) => [
                markerIcon.type,
                markerIcon
            ])
        );
    }
    get markerTypes() {
        return Array.from(this.markerIcons.keys());
    }

    overlays: Overlay[];
    popup: Popup /* = popup(this) */;

    markers: Marker[] = [];

    rendered: boolean;

    tempCircle: L.Circle;

    verbose: boolean;

    zoom: { min: number; max: number; default: number; delta: number };
    zoomDistance: number;

    unit: Length = "m";

    /** Marker Methods */
    addMarker(...markers: SavedMarkerProperties[]) {
        let toReturn: Marker[] = [];
        for (const marker of markers) {
            if (!this.markerTypes.includes(marker.type)) {
                new Notice(
                    `Marker type "${marker.type}" does not exist, using default.`
                );
                marker.type = "default";
            }
            const markerIcon = this.markerIcons.get(marker.type);

            const mapIcon = markerIcon?.icon ?? this.defaultIcon.icon;

            //@ts-expect-error
            const newMarker = new Marker(this, {
                id: marker.id,
                type: marker.type,
                loc: L.latLng(marker.loc),
                link: marker.link,
                icon: mapIcon,
                layer: marker.layer ? marker.layer : this.currentGroup.id,
                mutable: marker.mutable ?? false,
                command: marker.command ?? false,
                zoom: this.leafletInstance.getMaxZoom(),
                percent: marker.percent,
                description: marker.description,
                tooltip:
                    marker.tooltip ?? this.plugin.data.displayMarkerTooltips
            });
            this.markers.push(newMarker);
            toReturn.push(newMarker);
        }
        return toReturn;
    }

    createMarker(
        type: string,
        loc: [number, number],
        percent: [number, number] = null,
        id: string = getId(),
        link: string = null,
        layer: string = null,
        mutable: boolean = true,
        command: boolean = false,
        description: string = null,
        minZoom: number = null,
        maxZoom: number = null,
        tooltip: TooltipDisplay = this.plugin.data.displayMarkerTooltips
    ): Marker {
        const markers = this.addMarker({
            id,
            type,
            loc,
            link,
            layer: layer ? layer : this.currentGroup?.id,
            mutable,
            command,
            percent,
            description,
            minZoom,
            maxZoom,
            tooltip
        });

        if (mutable) {
            this.trigger("marker-added", markers[0]);
        }
        return markers[0];
    }

    updateMarker(marker: Marker) {
        const existing = this.markers.find((m) => m.id == marker.id);

        this.displaying.delete(existing.type);
        this.displaying.set(marker.type, true);

        existing.link = marker.link;
        existing.icon = this.markerIcons.get(marker.type);
        existing.minZoom = marker.minZoom;
        existing.maxZoom = marker.maxZoom;
        existing.command = marker.command;

        if (existing.shouldShow(this.leafletInstance.getZoom())) {
            existing.show();
        } else if (existing.shouldHide(this.leafletInstance.getZoom())) {
            existing.hide();
        }
    }

    /** Overlay Methods */
    addOverlays(...overlays: SavedOverlayData[]) {
        for (let overlay of overlays) {
            //@ts-expect-error
            this.overlays.push(new Overlay(this, overlay));
        }
        this.sortOverlays();
    }
    createOverlay(overlay: SavedOverlayData) {
        this.addOverlays(overlay);
        this.trigger("markers-updated");
    }
    beginOverlayDrawingContext(original: L.LeafletMouseEvent, marker?: Marker) {
        this.plugin.app.keymap.pushScope(this.escapeScope);

        this.isDrawing = true;

        this.tempCircle = L.circle(original.latlng, {
            radius: 1,
            color: this.options.overlayColor
        });
        this.leafletInstance.once("click", async () => {
            if (this.tempCircle) {
                this.log(`Overlay drawing complete.`);
                this.tempCircle.remove();

                this.createOverlay({
                    radius: this.tempCircle.getRadius(),
                    color: this.tempCircle.options.color,
                    loc: [
                        this.tempCircle.getLatLng().lat,
                        this.tempCircle.getLatLng().lng
                    ],
                    layer: this.currentGroup.id,
                    unit: "m",
                    desc: "",
                    mutable: true,
                    marker: marker.id
                });

                await this.plugin.saveSettings();
                this.leafletInstance.off("mousemove");
            }
        });
        this.leafletInstance.on("mousemove", (evt: L.LeafletMouseEvent) => {
            this.tempCircle.setRadius(
                this.leafletInstance.distance(original.latlng, evt.latlng)
            );
        });

        this.tempCircle.addTo(this.currentGroup.group);
    }

    /** Other Methods */
    closePopup(popup: L.Popup) {
        if (!popup) return;
        this.leafletInstance.closePopup(popup);
    }
    distance(latlng1: L.LatLng, latlng2: L.LatLng): string {
        const dist = this.leafletInstance.distance(latlng1, latlng2);
        let display = `${formatNumber(dist * this.scale, DISTANCE_DECIMALS)}`;
        if (this.options.distanceMultiplier !== 1) {
            display += ` (${formatNumber(
                dist * this.scale * this.options.distanceMultiplier,
                DISTANCE_DECIMALS
            )})`;
        }
        return display + ` ${this.unit}`;
    }
    getMarkerById(id: string): Marker {
        return this.markers.find(({ id: marker }) => marker === id);
    }
    getOverlaysUnderClick(evt: L.LeafletMouseEvent) {
        const overlays = [...this.overlays].filter(
            (overlay) =>
                overlay.isUnder(evt) && overlay.layer === this.currentGroup.id
        );
        overlays.sort((a, b) => {
            return a.radiusInMeters - b.radiusInMeters;
        });

        return overlays;
    }
    getZoom() {
        if (!this.rendered) return this.zoom.default;
        return this.leafletInstance.getZoom();
    }
    isLayerRendered(layer: string) {
        return this.mapLayers.find(({ id }) => id === layer) ? true : false;
    }
    log(text: string) {
        log(this.verbose, this.id, text);
    }
    removeMarker(marker: Marker) {
        if (!marker) return;

        marker.remove();
        this.markers = this.markers.filter(({ id }) => id != marker.id);

        this.trigger("markers-updated");
    }
    resetZoom() {
        this.leafletInstance.invalidateSize();
        this.log(`Element added to note, resetting zoom.`);
        if (this.zoomDistance) {
            this.log(`Zooming by distance.`);
            this.setZoomByDistance(this.zoomDistance);
        }
        if (this.options.zoomFeatures) {
            this.log(`Zooming to features.`);
            this.leafletInstance.fitBounds(this.featureLayer.getBounds());
            const { lat, lng } = this.featureLayer.getBounds().getCenter();

            this.log(`Features center: [${lat}, ${lng}]`);
            this.setInitialCoords([lat, lng]);
            this.zoom.default = this.leafletInstance.getBoundsZoom(
                this.featureLayer.getBounds()
            );
        }
        this.log(
            `Resetting map view to [${this.initialCoords[0]}, ${this.initialCoords[1]}], zoom ${this.zoom.default}.`
        );
        this.leafletInstance.setView(this.initialCoords, this.zoom.default);
    }
    setInitialCoords(arg0: any[]) {
        throw new Error("Method not implemented.");
    }
    sortOverlays() {
        log(this.verbose, this.id, `Sorting overlays.`);

        this.overlays.sort((a, b) => {
            return b.radiusInMeters - a.radiusInMeters;
        });

        for (let overlay of this.overlays) {
            overlay.leafletInstance.bringToFront();
        }

        log(this.verbose, this.id, `Overlays sorted.`);
    }
    setZoomByDistance(zoomDistance: number) {
        if (!zoomDistance) {
            this.zoom.default = this.options.defaultZoom;
        }
        const circle = L.circle(this.initialCoords, {
            radius: zoomDistance,
            fillOpacity: 0,
            opacity: 0
        });
        circle.addTo(this.leafletInstance);
        this.zoom.default = this.leafletInstance.getBoundsZoom(
            circle.getBounds()
        );
        circle.remove();
    }
    stopDrawingContext() {
        this.isDrawing = false;
        this.plugin.app.keymap.popScope(this.escapeScope);
        if (this.distanceEvent) {
            this.distanceEvent = undefined;

            this.distanceLine.unbindTooltip();
            this.distanceLine.remove();

            /** Get Last Distance */
            const latlngs =
                this.previousDistanceLine.getLatLngs() as L.LatLng[];
            const display = this.distance(latlngs[0], latlngs[1]);
            //this.distanceDisplay.setText(display);
        }
        if (this.tempCircle) {
            this.tempCircle.remove();
            this.tempCircle = undefined;
        }
        this.leafletInstance.off("mousemove");
        this.leafletInstance.off("mouseout");
    }
    toProperties(): SavedMapData {
        return {};
    }
    //TODO: REWRITE
    updateMarkerIcons() {
        /** Add New Marker Types To Filter List */
        this.markerIcons.forEach(({ type }) => {
            if (!this.markerIcons.has(type)) {
                this.displaying.set(type, true);
                this.currentGroup.markers[type] = L.layerGroup();
            }
        });

        this.markers.forEach((marker) => {
            let icon = this.markerIcons.get(marker.type) ?? this.defaultIcon;
            marker.icon = icon;
        });
        /** Remove Old Marker Types From Filter List */
        [...this.displaying].forEach(([type]) => {
            if (this.markerTypes.includes(type)) return;

            this.displaying.delete(type);

            if (!this.currentGroup.markers.default) {
                this.currentGroup.markers.default = L.layerGroup();
                this.displaying.set("default", true);
                this.currentGroup.markers.default.addTo(
                    this.currentGroup.group
                );
            }
            this.currentGroup.markers[type]
                .getLayers()
                .forEach((layer) =>
                    this.currentGroup.markers.default.addLayer(layer)
                );

            delete this.currentGroup.markers[type];
        });
    }
}

interface SavedMapData {}

export function formatNumber(number: number, digits: number) {
    return Number(
        new Intl.NumberFormat(locale(), {
            style: "decimal",
            maximumFractionDigits: digits
        }).format(number)
    );
}

export async function copyToClipboard(loc: L.LatLng): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        navigator.clipboard
            .writeText(
                `${formatNumber(loc.lat, LAT_LONG_DECIMALS)}, ${formatNumber(
                    loc.lng,
                    LAT_LONG_DECIMALS
                )}`
            )
            .then(() => {
                new Notice("Coordinates copied to clipboard.");
                resolve();
            })
            .catch(() => {
                new Notice(
                    "There was an error trying to copy coordinates to clipboard."
                );
                reject();
            });
    });
}
