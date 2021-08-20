/* import type {
    Feature,
    FeatureCollection,
    GeoJsonObject,
    GeoJsonProperties,
    GeoJsonTypes,
    Geometry
} from "geojson"; */

declare module "@tmcw/togeojson" {
    export function kml(doc: Document): GeoJSON.FeatureCollection;

    export function kml<TProperties extends GeoJSON.GeoJsonProperties>(
        doc: Document
    ): GeoJSON.FeatureCollection<GeoJSON.Geometry, TProperties>;

    export function kmlGen(doc: Document): Generator<GeoJSON.Feature, void, boolean>;
    export function kmlGen<TProperties extends GeoJSON.GeoJsonProperties>(
        doc: Document
    ): Generator<GeoJSON.Feature<GeoJSON.Geometry, TProperties>, void, boolean>;

    export function gpx(doc: Document): GeoJSON.FeatureCollection;
    export function gpx<TProperties extends GeoJSON.GeoJsonProperties>(
        doc: Document
    ): GeoJSON.FeatureCollection<GeoJSON.Geometry>;

    export function gpxGen(doc: Document): Generator<GeoJSON.Feature, void, boolean>;
    export function gpxGen<TProperties extends GeoJSON.GeoJsonProperties>(
        doc: Document
    ): Generator<GeoJSON.Feature<GeoJSON.Geometry, TProperties>, void, boolean>;

    export function tcx(doc: Document): GeoJSON.FeatureCollection;
    export function tcx<TProperties extends GeoJSON.GeoJsonProperties>(
        doc: Document
    ): GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;
}
