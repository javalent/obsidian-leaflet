This example shows a basic real-world map using OpenStreetMap tiles.

## How it works

- No `image` parameter = defaults to OpenStreetMap
- `lat` and `long` set the initial center point
- `defaultZoom` controls how zoomed in the map starts
- `minZoom` and `maxZoom` control zoom limits

```leaflet
id: real-world-example
lat: 40.7128
long: -74.0060
defaultZoom: 12
minZoom: 2
maxZoom: 18
height: 600px
```
