This example shows how to load GeoJSON files onto your map.

## How it works

```leaflet
id: geojson-example
geojson: [[example.geojson]]
lat: 39
long: -98
defaultZoom: 4
height: 600px
```

The `example.geojson` file contains:
- **Points** (cities/locations)
- **LineString** (routes/paths)
- **Polygons** (areas/regions)

## Supported GeoJSON Types

### Point Features

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-74.0060, 40.7128]
  },
  "properties": {
    "name": "New York City"
  }
}
```

Displays as markers on the map.

### LineString Features

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-74.0060, 40.7128],
      [-100.0, 39.0],
      [-122.4194, 37.7749]
    ]
  },
  "properties": {
    "name": "Route from NYC to SF"
  }
}
```

Displays as paths connecting coordinates.

### Polygon Features

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-88.2, 41.9],
      [-87.9, 41.9],
      [-87.9, 41.7],
      [-88.2, 41.7],
      [-88.2, 41.9]
    ]]
  },
  "properties": {
    "name": "Service Area"
  }
}
```

Displays as filled or outlined areas.

## Styling GeoJSON

Use MapBox SimpleStyle properties in the `properties` object:

```json
{
  "properties": {
    "name": "Feature Name",
    "marker-color": "#FF0000",
    "marker-size": "large",
    "stroke": "#00AA00",
    "stroke-width": 2,
    "fill": "#FFFF00",
    "fill-opacity": 0.5
  }
}
```

Or use the `geojsonColor` parameter in the map code block:

```leaflet
geojson: [[example.geojson]]
geojsonColor: #3388ff
```

## Tips

- Test GeoJSON files at [geojson.io](https://geojson.io)
- Coordinates are [longitude, latitude] in GeoJSON (note the order!)
- Use properties with `title`, `description`, or `name` for tooltips
- GeoJSON files can be large - especially with many features