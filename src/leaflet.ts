import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import convert from "convert";
import "leaflet-fullscreen";
import {
    Events,
    Notice,
    moment,
    Menu,
    Point,
    MarkdownRenderChild,
    TFile,
    Scope
} from "obsidian";

import {
    ILayerGroup,
    ILeafletMapOptions,
    ILeafletMarker,
    IMarkerData,
    IMarkerIcon,
    Length,
    ObsidianLeaflet,
    Marker as MarkerDefinition,
    IOverlayData
} from "./@types";
import {
    getId,
    getImageDimensions,
    icon,
    DISTANCE_DECIMALS,
    LAT_LONG_DECIMALS,
    DEFAULT_MAP_OPTIONS,
    BASE_POPUP_OPTIONS
} from "./utils";

import {
    DistanceDisplay,
    distanceDisplay,
    editMarkers,
    filterMarkerControl,
    Marker,
    resetZoomControl,
    zoomControl
} from "./map";
import { ILeafletOverlay } from "./@types/";
import { OverlayContextModal } from "./modals/context";
declare module "leaflet" {
    interface Map {
        isFullscreen(): boolean;
    }
}

export class LeafletRenderer extends MarkdownRenderChild {
    map: LeafletMap;
    constructor(
        public plugin: ObsidianLeaflet,
        sourcePath: string,
        container: HTMLElement,
        options: ILeafletMapOptions = {}
    ) {
        super(container);
        this.map = new LeafletMap(plugin, options);

        this.containerEl.style.height = options.height;
        this.containerEl.style.width = "100%";
        this.containerEl.style.backgroundColor = "#ddd";

        this.register(async () => {
            try {
                this.map.remove();
            } catch (e) {}

            let file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
            if (!file || !(file instanceof TFile)) {
                return;
            }
            let fileContent = await this.plugin.app.vault.read(file);

            let containsThisMap: boolean = false,
                r = new RegExp(
                    `\`\`\`leaflet[\\s\\S]*?\\bid:(\\s?${this.map.id})\\b\\s*\\n[\\s\\S]*?\`\`\``,
                    "g"
                );
            containsThisMap = fileContent.match(r)?.length > 0 || false;

            if (!containsThisMap) {
                //Block was deleted or id was changed

                let mapFile = this.plugin.mapFiles.find(
                    ({ file: f }) => f === sourcePath
                );
                mapFile.maps = mapFile.maps.filter(
                    (mapId) => mapId != this.map.id
                );
            }

            await this.plugin.saveSettings();

            this.plugin.maps = this.plugin.maps.filter((m) => {
                return m.map != this.map;
            });
        });
    }
    async onload() {
        this.containerEl.appendChild(this.map.contentEl);
    }
}

/**
 * LeafletMap Class
 *
 * Used to construct a new leaflet map.
 *
 */
class LeafletMap extends Events {
    id: string;
    contentEl: HTMLElement;
    rendered: boolean;
    map: L.Map;
    markers: Marker[] = [];
    zoom: { min: number; max: number; default: number; delta: number };
    popup: L.Popup = L.popup({
        className: "leaflet-marker-link-popup",
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        autoPan: false
    });
    mapLayers: ILayerGroup[] = [];
    layer: L.ImageOverlay | L.TileLayer;
    type: "image" | "real";
    initialCoords: [number, number];
    tileServer: string;
    displaying: Map<string, boolean> = new Map();
    isDrawing: boolean = false;

    overlays: ILeafletOverlay[] = [];

    markerIcons: IMarkerIcon[];

    unit: Length = "m";

    private _resize: ResizeObserver;
    private _distanceMultipler: number = 1;
    private _distanceEvent: L.LatLng | undefined = undefined;
    private _distanceLine: L.Polyline = L.polyline(
        [
            [0, 0],
            [0, 0]
        ],
        {
            color: "blue"
        }
    );
    private _previousDistanceLine: L.Polyline = L.polyline(
        [
            [0, 0],
            [0, 0]
        ],
        {
            color: "blue"
        }
    );
    private _timeoutHandler: ReturnType<typeof setTimeout>;
    private _popupTarget: ILeafletMarker | ILeafletOverlay | L.LatLng;
    private _scale: number;
    private _hoveringOnMarker: boolean = false;
    private _distanceDisplay: DistanceDisplay;
    private _layerControl: L.Control.Layers = L.control.layers({}, {});
    private _escapeScope: Scope;
    private _tempCircle: L.Circle;
    constructor(
        public plugin: ObsidianLeaflet,
        public options: ILeafletMapOptions = {}
    ) {
        super();

        this.plugin = plugin;

        this.markerIcons = plugin.markerIcons;

        this.contentEl = createDiv();
        this.contentEl.style.height = options.height;
        this.contentEl.style.width = "100%";
        this.options = Object.assign({}, DEFAULT_MAP_OPTIONS, options);

        this.id = this.options.id;
        this.type = this.options.type;

        this.zoom = {
            min: this.options.minZoom,
            max: this.options.maxZoom,
            default: this.options.defaultZoom,
            delta: this.options.zoomDelta
        };
        this.unit = this.options.unit as Length;
        this._scale = this.options.scale;
        this._distanceMultipler = this.options.distanceMultiplier;

        this.tileServer = this.options.tileServer;
        this._escapeScope = new Scope();
        this._escapeScope.register(undefined, "Escape", () => {
            if (!this.isFullscreen) {
                this.stopDrawing();

                this.plugin.app.keymap.popScope(this._escapeScope);
            }
        });
    }

    get data() {
        return this.plugin.AppData;
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

    /* get markerIcons() {
        return this.plugin.markerIcons;
    } */
    get markerTypes() {
        return this.markerIcons.map(({ type }) => type);
    }
    get displayedMarkers() {
        return this.markers.filter(({ type }) => this.displaying.has(type));
    }

    get scale() {
        if (this.type !== "real") return this._scale;

        return convert(1).from("m").to(this.unit);
    }

    get CRS() {
        if (this.type === "image") {
            return L.CRS.Simple;
        }
        return L.CRS.EPSG3857;
    }
    get mutableMarkers() {
        return this.markers.filter(({ mutable }) => mutable);
    }
    get defaultIcon() {
        return this.markerIcons.find(({ type }) => type === "default");
    }

    get isFullscreen(): boolean {
        return this.map.isFullscreen();
    }

    get locale() {
        return moment.locale();
    }

    private get _coordMult(): [number, number] {
        let mult: [number, number] = [1, 1];
        if (this.type == "image") {
            mult = [
                this.bounds.getSouthEast().lat / 100,
                this.bounds.getSouthEast().lng / 100
            ];
        }
        return mult;
    }

    async render(options: {
        coords: [number, number];
        layer: { data: string; id: string };
        hasAdditional?: boolean;
    }) {
        this.map = L.map(this.contentEl, {
            crs: this.CRS,
            maxZoom: this.zoom.max,
            minZoom: this.zoom.min,
            zoomDelta: this.zoom.delta,
            zoomSnap: this.zoom.delta,
            worldCopyJump: this.type === "real",
            fullscreenControl: true
        });

        /** Get layers
         *  Returns TileLayer (real) or ImageOverlay (image)
         */
        this.layer = await this._buildLayersForType(
            /* this.type,  */ options.layer
        );

        /** Render map */
        switch (this.type) {
            case "real": {
                this._renderReal();
                break;
            }
            case "image": {
                this._renderImage({ hasAdditional: options.hasAdditional });
                break;
            }
        }
        /** Move to supplied coordinates */
        this.initialCoords = [
            options.coords[0] * this._coordMult[0],
            options.coords[1] * this._coordMult[1]
        ];
        this.map.panTo(this.initialCoords);

        /** Build Marker Layer Groups */

        /** Add markers to map */
        this.markers
            .filter(
                (marker) =>
                    !marker.layer || marker.layer === this.mapLayers[0].id
            )
            .forEach((marker) => {
                const layer = this.mapLayers[0];
                const markerGroup =
                    layer.markers[marker.type] || layer.markers["default"];
                markerGroup.addLayer(marker.leafletInstance);

                this.displaying.set(marker.type, true);
            });

        /** Add Overlays to map */
        this.overlays
            .filter(
                (overlay) =>
                    !overlay.layer || overlay.layer === this.mapLayers[0].id
            )
            .forEach((overlay) => {
                overlay.leafletInstance.addTo(this.mapLayers[0].group);
            });
        /** Register Resize Handler */
        this._handleResize();

        /** Build control icons */
        this._buildControls();

        /** Bind Internal Map Events */
        this.map.on("contextmenu", this._handleMapContext.bind(this));
        this.map.on("click", this._handleMapClick.bind(this));

        this.group.group.addTo(this.map);
    }
    removeMarker(marker: MarkerDefinition) {
        if (!marker) return;

        this.group.markers[marker.type].removeLayer(marker.leafletInstance);

        this.markers = this.markers.filter(({ id }) => id != marker.id);
    }

    updateMarkerIcons(newIcons: IMarkerIcon[]) {
        /** Add New Marker Types To Filter List */
        newIcons.forEach(({ type }) => {
            if (!this.markerIcons.find((icon) => icon.type == type)) {
                this.displaying.set(type, true);
                this.group.markers[type] = L.layerGroup();
            }
        });
        this.markerIcons = newIcons;

        this.markers.forEach((marker) => {
            let icon =
                this.markerIcons.find((icon) => icon.type == marker.type) ??
                this.defaultIcon;
            marker.icon = icon;
        });
        /** Remove Old Marker Types From Filter List */
        [...this.displaying].forEach(([type]) => {
            if (this.markerTypes.includes(type)) return;
            this.displaying.delete(type);

            if (!this.group.markers.default) {
                this.group.markers.default = L.layerGroup();
                this.displaying.set("default", true);
                this.group.markers.default.addTo(this.group.group);
            }
            this.group.markers[type]
                .getLayers()
                .forEach((layer) => this.group.markers.default.addLayer(layer));

            delete this.group.markers[type];
        });
    }
    addMarker(markerToBeAdded: ILeafletMarker) {
        const mapIcon = this.markerIcons.find(
            ({ type }) => type == markerToBeAdded.type
        ).icon;

        const marker = new Marker({
            id: markerToBeAdded.id,
            type: markerToBeAdded.type,
            loc: markerToBeAdded.loc,
            link: markerToBeAdded.link,
            icon: mapIcon,
            layer: markerToBeAdded.layer
                ? markerToBeAdded.layer
                : this.group?.id,
            mutable: markerToBeAdded.mutable,
            command: markerToBeAdded.command || false,
            zoom: this.map.getMaxZoom()
        });

        this._pushMarker(marker);
    }
    createMarker(
        markerIcon: IMarkerIcon,
        loc: L.LatLng,
        link: string | undefined = undefined,
        id: string = getId(),
        layer: string | undefined = undefined,
        mutable: boolean = true,
        command: boolean = false,
        zoom: number = this.zoom.max
    ): ILeafletMarker {
        let mapIcon = this.markerIcons.find(
                ({ type }) => type === "default"
            ).icon,
            type = "default";

        if (markerIcon && markerIcon.type) {
            mapIcon = this.markerIcons.find(
                ({ type }) => type == markerIcon.type ?? "default"
            )?.icon;
            type = markerIcon.type;
        }

        const marker = new Marker({
            id: id,
            type: type,
            loc: loc,
            link: link,
            icon: mapIcon,
            layer: layer ? layer : this.group?.id,
            mutable: mutable,
            command: command,
            zoom: zoom ?? this.zoom.max
        });

        this._pushMarker(marker);
        if (mutable) {
            this.trigger("marker-added", marker);
        }
        return marker;
    }
    private _pushMarker(marker: Marker) {
        this._bindMarkerEvents(marker);
        if (this.rendered) {
            this.displaying.set(marker.type, true);
            this.group.markers[marker.type].addLayer(marker.leafletInstance);
            marker.leafletInstance.closeTooltip();
        }
        this.markers.push(marker);
    }

    loadData(data: any): Promise<void> {
        return new Promise((resolve) => {
            data?.markers?.forEach((marker: IMarkerData) => {
                if (!marker.layer && this.group) {
                    marker.layer = this.group.id;
                }
                this.createMarker(
                    this.markerIcons.find((icon) => icon.type == marker.type),
                    L.latLng(marker.loc),
                    marker.link,
                    marker.id,
                    marker.layer,
                    true,
                    marker.command,
                    marker.zoom ?? this.zoom.max
                );
            });
            data?.overlays?.forEach((circle: IOverlayData) => {
                this.addOverlay(circle);
            });
            resolve();
        });
    }

    distance(latlng1: L.LatLng, latlng2: L.LatLng): string {
        const dist = this.map.distance(latlng1, latlng2);
        let display = `${(dist * this.scale).toLocaleString(this.locale, {
            maximumFractionDigits: DISTANCE_DECIMALS
        })}`;
        if (this._distanceMultipler !== 1) {
            display += ` (${(
                dist *
                this.scale *
                this._distanceMultipler
            ).toLocaleString(this.locale, {
                maximumFractionDigits: DISTANCE_DECIMALS
            })})`;
        }
        return display + ` ${this.unit}`;
    }

    stopDrawing() {
        this.isDrawing = false;
        this.plugin.app.keymap.popScope(this._escapeScope);
        if (this._distanceEvent) {
            this._distanceEvent = undefined;

            this._distanceLine.unbindTooltip();
            this._distanceLine.remove();

            /** Get Last Distance */
            const latlngs =
                this._previousDistanceLine.getLatLngs() as L.LatLng[];
            const display = this.distance(latlngs[0], latlngs[1]);
            this._distanceDisplay.setText(display);
        }
        if (this._tempCircle) {
            this._tempCircle.remove();
            this._tempCircle = undefined;
        }
        this.map.off("mousemove");
        this.map.off("mouseout");
    }

    private _buildControls() {
        //Full screen
        const fsButton = this.contentEl.querySelector(
            ".leaflet-control-fullscreen-button"
        );
        if (fsButton) {
            fsButton.setAttr("aria-label", "Toggle Full Screen");
            const expand = icon({ iconName: "expand", prefix: "fas" }).node[0];
            const compress = icon({ iconName: "compress", prefix: "fas" })
                .node[0];
            fsButton.appendChild(expand);
            this.map.on("fullscreenchange", () => {
                if (this.isFullscreen) {
                    fsButton.replaceChild(compress, fsButton.children[0]);
                    editMarkerControl.disable();
                } else {
                    fsButton.replaceChild(expand, fsButton.children[0]);
                    editMarkerControl.enable();
                }
            });
        }

        //Filter Markers
        filterMarkerControl({ position: "topright" }, this).addTo(this.map);

        //Edit markers
        const editMarkerControl = editMarkers(
            { position: "topright" },
            this,
            this.plugin
        ).addTo(this.map);

        editMarkerControl.onClose = async (markers: Marker[]) => {
            this.mutableMarkers.forEach((marker) => {
                this.removeMarker(marker);
            });

            markers.forEach((marker) => {
                this.createMarker(
                    this.markerIcons.find(({ type }) => type == marker.type),
                    marker.loc,
                    marker.link,
                    marker.id,
                    marker.layer,
                    marker.mutable,
                    marker.command,
                    marker.zoom
                );
            });
            await this.plugin.saveSettings();
        };

        //Zoom to Markers
        zoomControl({ position: "topleft" }, this).addTo(this.map);
        //Zoom to initial
        resetZoomControl({ position: "topleft" }, this).addTo(this.map);

        //Distance Display
        this._distanceDisplay = distanceDisplay(
            {
                position: "bottomleft"
            },
            this._previousDistanceLine
        ).addTo(this.map);
    }

    private async _handleMapClick(evt: L.LeafletMouseEvent) {
        this._onHandleDistance(evt);
        if (
            evt.originalEvent.getModifierState("Shift") ||
            evt.originalEvent.getModifierState("Alt")
        ) {
            this.openPopup(
                evt.latlng,
                `[${evt.latlng.lat.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}, ${evt.latlng.lng.toLocaleString("en-US", {
                    maximumFractionDigits: LAT_LONG_DECIMALS
                })}]`
            );
            if (
                this.data.copyOnClick &&
                evt.originalEvent.getModifierState("Control")
            ) {
                await this.copyLatLngToClipboard(evt.latlng);
            }
        }
    }

    drawCircle(
        circle: L.Circle,
        original: L.LeafletMouseEvent,
        evt: L.LeafletMouseEvent
    ) {
        let newRadius = this.map.distance(original.latlng, evt.latlng);
        circle.setRadius(newRadius);
    }

    private _pushOverlay(overlay: ILeafletOverlay) {
        this._bindOverlayEvents(overlay);
        this.overlays.push(overlay);
    }

    addOverlay(circle: IOverlayData, mutable = true) {
        let radius = convert(circle.radius)
            .from((circle.unit as Length) ?? "m")
            .to(this.type == "image" ? this.unit : "m");
        if (this.type == "image" && !mutable) {
            radius = radius / this.scale;
        }
        const leafletInstance = L.circle(L.latLng(circle.loc), {
            radius: radius,
            color: circle.color
        });
        this._pushOverlay({
            leafletInstance: leafletInstance,
            layer: circle.layer,
            data: circle,
            mutable: mutable,
            radius: radius
        });

        if (this.rendered) {
            let group =
                this.mapLayers.find(({ id }) => id === circle.layer)?.group ??
                this.mapLayers[0].group;

            leafletInstance.addTo(group);
        }
    }

    private _handleMapContext(evt: L.LeafletMouseEvent) {
        if (evt.originalEvent.getModifierState("Shift")) {
            //begin drawing context
            this.plugin.app.keymap.pushScope(this._escapeScope);

            this.isDrawing = true;

            this._tempCircle = L.circle(evt.latlng, {
                radius: 1,
                color: this.options.overlayColor
            });
            this.map.once("click", async () => {
                this._tempCircle.remove();

                const circle = L.circle(this._tempCircle.getLatLng(), {
                    radius: this._tempCircle.getRadius(),
                    color: this._tempCircle.options.color
                });
                circle.addTo(this.group.group);

                this._pushOverlay({
                    leafletInstance: circle,
                    radius: circle.getRadius(),
                    layer: this.group.id,
                    data: {
                        radius: circle.getRadius(),
                        color: circle.options.color,
                        loc: [circle.getLatLng().lat, circle.getLatLng().lng],
                        layer: this.group.id,
                        unit: this.unit,
                        desc: ""
                    },
                    mutable: true
                });
                this.stopDrawing();
                await this.plugin.saveSettings();
            });
            this.map.on(
                "mousemove",
                this.drawCircle.bind(this, this._tempCircle, evt)
            );

            this._tempCircle.addTo(this.group.group);

            return;
        }

        if (this.markerIcons.length <= 1) {
            this.createMarker(this.markerIcons[0], evt.latlng);
            return;
        }

        let contextMenu = new Menu(this.plugin.app);

        contextMenu.setNoIcon();
        this.markerIcons.forEach((marker: IMarkerIcon) => {
            if (!marker.type || !marker.html) return;
            contextMenu.addItem((item) => {
                item.setTitle(
                    marker.type == "default" ? "Default" : marker.type
                );
                item.setActive(true);
                item.onClick(async () => {
                    this.createMarker(marker, evt.latlng);
                    await this.plugin.saveSettings();
                });
            });
        });

        contextMenu.showAtPosition({
            x: evt.originalEvent.clientX,
            y: evt.originalEvent.clientY
        } as Point);
    }

    private _onHandleDistance(evt: L.LeafletMouseEvent) {
        if (
            (!evt.originalEvent.getModifierState("Shift") &&
                !evt.originalEvent.getModifierState("Alt")) ||
            evt.originalEvent.getModifierState("Control")
        ) {
            if (this._distanceEvent != undefined) {
                this.stopDrawing();
            }
            return;
        }
        if (this._distanceEvent != undefined) {
            this._previousDistanceLine.setLatLngs(
                this._distanceLine.getLatLngs()
            );
            this.stopDrawing();
        } else {
            this._distanceEvent = evt.latlng;

            this.isDrawing = true;
            this.plugin.app.keymap.pushScope(this._escapeScope);

            const distanceTooltip = L.tooltip({
                permanent: true,
                direction: "top",
                sticky: true
            });
            this._distanceLine.setLatLngs([this._distanceEvent, evt.latlng]);
            this._distanceLine.bindTooltip(distanceTooltip);
            this.map.on("mousemove", (mvEvt: L.LeafletMouseEvent) => {
                if (!this._hoveringOnMarker) {
                    this._distanceLine.setLatLngs([
                        this._distanceEvent,
                        mvEvt.latlng
                    ]);
                }
                this._distanceLine.addTo(this.map);

                /** Get New Distance */
                const latlngs = this._distanceLine.getLatLngs() as L.LatLng[];
                const display = this.distance(latlngs[0], latlngs[1]);

                /** Update Distance Line Tooltip */
                distanceTooltip.setContent(display);
                distanceTooltip.setLatLng(mvEvt.latlng);

                if (!this._distanceLine.isTooltipOpen()) {
                    distanceTooltip.openTooltip();
                }

                this._distanceDisplay.setText(display);
                this._distanceLine.redraw();
            });

            this.map.on("mouseout", () => {
                this.stopDrawing();
                this._distanceEvent = undefined;
            });
        }
    }

    private async _buildLayersForType(
        /* type: string, */
        layer?: { data: string; id: string }
    ): Promise<L.TileLayer | L.ImageOverlay> {
        if (this.type === "real") {
            this.layer = L.tileLayer(this.tileServer, {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                className: this.options.darkMode ? "dark-mode" : ""
            });

            const markerGroups = Object.fromEntries(
                this.markerIcons.map(({ type }) => [type, L.layerGroup()])
            );
            const group = L.layerGroup([
                this.layer,
                ...Object.values(markerGroups)
            ]);

            this.mapLayers = [
                {
                    group: group,
                    layer: this.layer,
                    id: "real",
                    data: "real",
                    markers: markerGroups
                }
            ];
        } else if (this.type === "image") {
            this.map.on("baselayerchange", ({ layer }) => {
                // need to do this to prevent panning animation for some reason
                this.map.setMaxBounds([undefined, undefined]);
                this.layer = layer.getLayers()[0];
                this.map.panTo(this.bounds.getCenter(), {
                    animate: false
                });
                this.map.setMaxBounds(this.bounds);
            });

            const newLayer = await this._buildMapLayer(layer);

            this.mapLayers.push(newLayer);
        }

        this.mapLayers[0].layer.on("load", () => {
            this.rendered = true;

            this.trigger("rendered");
        });
        return this.mapLayers[0].layer;
    }
    async loadAdditionalMapLayers(layers: { data: string; id: string }[]) {
        for (let layer of layers) {
            const newLayer = await this._buildMapLayer(layer);

            this.mapLayers.push(newLayer);

            this._layerControl.addBaseLayer(
                newLayer.group,
                `Layer ${this.mapLayers.length}`
            );
        }
    }
    private async _buildMapLayer(layer: {
        data: string;
        id: string;
    }): Promise<ILayerGroup> {
        const { h, w } = await getImageDimensions(layer.data);

        const southWest = this.map.unproject([0, h], this.zoom.max - 1);
        const northEast = this.map.unproject([w, 0], this.zoom.max - 1);

        const mapLayer = L.imageOverlay(
            layer.data,
            new L.LatLngBounds(southWest, northEast),
            {
                className: this.options.darkMode ? "dark-mode" : ""
            }
        );
        const markerGroups = Object.fromEntries(
            this.markerIcons.map(({ type }) => [type, L.layerGroup()])
        );
        const group = L.layerGroup([mapLayer, ...Object.values(markerGroups)]);

        //add any markers to new layer
        this.markers
            .filter((marker) => marker.layer && marker.layer == layer.id)
            .forEach((marker) => {
                const markerGroup =
                    markerGroups[marker.type] || markerGroups["default"];

                markerGroup.addLayer(marker.leafletInstance);
            });
        //add any overlays to new layer
        this.overlays
            .filter((overlay) => overlay.layer && overlay.layer == layer.id)
            .forEach((overlay) => {
                overlay.leafletInstance.addTo(group);
            });
        return {
            group: group,
            layer: mapLayer,
            id: layer.id,
            data: layer.data,
            markers: markerGroups
        };
    }
    private async _renderImage({ hasAdditional }: { hasAdditional: boolean }) {
        this.map.fitBounds(this.bounds);
        this.map.panTo(this.bounds.getCenter(), {
            animate: false
        });
        this.map.setMaxBounds(this.bounds);
        this.map.setZoom(this.zoom.default, { animate: false });

        if (this.mapLayers.length > 1 || hasAdditional) {
            this._layerControl.addBaseLayer(this.mapLayers[0].group, `Layer 1`);
            const layerIcon = icon({ iconName: "layer-group", prefix: "fas" })
                .node[0];
            layerIcon.setAttr(
                `style`,
                "color: var(--text-normal);margin: auto;"
            );
            this._layerControl.addTo(this.map);
            this._layerControl
                .getContainer()
                .children[0].appendChild(layerIcon);
        }
    }
    private async _renderReal() {
        this.map.setZoom(this.zoom.default, { animate: false });

        this._handleResize();
    }
    private _handleResize() {
        this._resize = new ResizeObserver(() => {
            if (this.rendered) {
                this.map.invalidateSize();
            }
        });
        this._resize.observe(this.contentEl);
    }

    private _bindOverlayEvents(overlay: ILeafletOverlay) {
        overlay.leafletInstance
            .on("contextmenu", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                if (!overlay.mutable) {
                    new Notice(
                        "This overlay cannot be edited because it was defined in the code block."
                    );
                    return;
                }

                const modal = new OverlayContextModal(
                    this.plugin,
                    overlay.data,
                    this
                );
                modal.onClose = () => {
                    if (modal.deleted) {
                        overlay.leafletInstance.remove();
                        this.overlays = this.overlays.filter((o) => {
                            o != overlay;
                        });
                        return;
                    }

                    overlay.data.color = modal.tempOverlay.color;
                    overlay.data.radius = modal.tempOverlay.radius;
                    overlay.data.desc = modal.tempOverlay.desc;

                    overlay.leafletInstance.setRadius(overlay.data.radius);
                    overlay.leafletInstance.setStyle({
                        color: overlay.data.color
                    });
                };
                modal.open();
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                if (overlay.data.desc) {
                    this.openPopup(overlay, overlay.data.desc);
                }
            });
    }

    private _bindMarkerEvents(marker: ILeafletMarker) {
        marker.leafletInstance
            .on("contextmenu", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                if (marker.mutable) this.trigger("marker-context", marker);
                else {
                    new Notice(
                        "This marker cannot be edited because it was defined in the code block."
                    );
                }
            })
            .on("click", async (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);

                this._onHandleDistance(evt);
                if (
                    evt.originalEvent.getModifierState("Alt") ||
                    evt.originalEvent.getModifierState("Shift")
                ) {
                    this.openPopup(
                        marker,
                        `[${marker.loc.lat.toLocaleString("en-US", {
                            maximumFractionDigits: LAT_LONG_DECIMALS
                        })}, ${marker.loc.lng.toLocaleString("en-US", {
                            maximumFractionDigits: LAT_LONG_DECIMALS
                        })}]`
                    );

                    if (
                        this.data.copyOnClick &&
                        evt.originalEvent.getModifierState("Control")
                    ) {
                        await this.copyLatLngToClipboard(marker.loc);
                    }

                    return;
                }
                if (marker.link) {
                    this.trigger(
                        "marker-click",
                        marker.link,
                        evt.originalEvent.ctrlKey,
                        marker.command
                    );
                } else {
                    if (!marker.mutable) {
                        new Notice(
                            "This marker cannot be edited because it was defined in the code block."
                        );
                    }
                }
            })
            .on("dragstart", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
            })
            .on("drag", (evt: L.LeafletMouseEvent) => {
                this.trigger("marker-dragging", marker);
                if (this.popup.isOpen()) {
                    this.popup.setLatLng(evt.latlng);
                }
            })
            .on("dragend", (evt: L.LeafletMouseEvent) => {
                const old = marker.loc;
                marker.loc = marker.leafletInstance.getLatLng();
                this.trigger("marker-data-updated", marker, old);
            })
            .on("mouseover", (evt: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(evt);
                if (marker.link) {
                    this.trigger("marker-mouseover", evt, marker);
                }
                this._hoveringOnMarker = true;
                if (this._distanceLine) {
                    this._distanceLine.setLatLngs([
                        this._distanceLine.getLatLngs()[0] as L.LatLngExpression,
                        marker.loc
                    ]);
                }
            })
            .on("mouseout", (evt: L.LeafletMouseEvent) => {
                marker.leafletInstance.closeTooltip();
                this._hoveringOnMarker = false;
            });
    }
    async copyLatLngToClipboard(loc: L.LatLng): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            navigator.clipboard
                .writeText(
                    `${loc.lat.toLocaleString("en-US", {
                        maximumFractionDigits: LAT_LONG_DECIMALS
                    })}, ${loc.lng.toLocaleString("en-US", {
                        maximumFractionDigits: LAT_LONG_DECIMALS
                    })}`
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

    openPopup(
        target: ILeafletMarker | ILeafletOverlay | L.LatLng,
        content: ((source: L.Layer) => L.Content) | L.Content
    ) {
        if (this._timeoutHandler) {
            clearTimeout(this._timeoutHandler);
        }
        if (this.popup.isOpen() && this._popupTarget == target) {
            this.popup.setContent(content);
            return;
        }

        this._popupTarget = target;

        if (this.popup && this.popup.isOpen()) {
            this.map.closePopup(this.popup);
        }

        this.popup = this._getPopup(target).setContent(content);
        this.map.openPopup(this.popup);

        const popupElement = this.popup.getElement();

        let _this = this;
        const mouseOutHandler = function () {
            _this._timeoutHandler = setTimeout(function () {
                if (!(target instanceof L.LatLng)) {
                    target.leafletInstance.off("mouseenter", mouseOverHandler);
                    target.leafletInstance.off("mouseout", mouseOutHandler);
                }
                popupElement.removeEventListener(
                    "mouseenter",
                    mouseOverHandler
                );
                popupElement.removeEventListener("mouseleave", mouseOutHandler);

                _this.map.closePopup(_this.popup);
            }, 500);
        };
        const mouseOverHandler = function () {
            clearTimeout(_this._timeoutHandler);
        };
        if (target instanceof L.LatLng) {
            this._timeoutHandler = setTimeout(function () {
                popupElement.removeEventListener(
                    "mouseenter",
                    mouseOverHandler
                );
                popupElement.removeEventListener("mouseleave", mouseOutHandler);

                _this.map.closePopup(_this.popup);
            }, 1000);
        } else {
            target.leafletInstance
                .on("mouseout", mouseOutHandler)
                .on("mouseenter", mouseOverHandler);
        }
        popupElement.addEventListener("mouseenter", mouseOverHandler);
        popupElement.addEventListener("mouseleave", mouseOutHandler);
    }
    private _getPopup(
        target: ILeafletMarker | ILeafletOverlay | L.LatLng
    ): L.Popup {
        if (this.popup.isOpen() && this._popupTarget == target) {
            return this.popup;
        }

        this._popupTarget = target;

        if (this.popup && this.popup.isOpen()) {
            this.map.closePopup(this.popup);
        }
        if (target instanceof L.LatLng) {
            return L.popup({
                ...BASE_POPUP_OPTIONS
            }).setLatLng(target);
        } else if (target.leafletInstance instanceof L.Circle) {
            return L.popup({
                ...BASE_POPUP_OPTIONS,
                offset: new L.Point(
                    0,
                    (-1 *
                        target.leafletInstance
                            .getElement()
                            .getBoundingClientRect().height) /
                        2 +
                        10 // not sure why circles have this extra padding..........
                )
            }).setLatLng(target.leafletInstance.getLatLng());
        } else {
            return L.popup({
                ...BASE_POPUP_OPTIONS,
                offset: new L.Point(
                    0,
                    (-1 *
                        target.leafletInstance
                            .getElement()
                            .getBoundingClientRect().height) /
                        2
                )
            }).setLatLng(target.leafletInstance.getLatLng());
        }
    }

    remove() {
        this.map?.remove();
        this._resize?.disconnect();
        this.rendered = false;

        this.plugin.app.keymap.popScope(this._escapeScope);
    }
}
