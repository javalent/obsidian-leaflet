This example shows a basic image map without coordinate bounds.

## How it works

- `image: [[map image.png]]` loads the image from attachments
- Image coordinates default to percentages (0-100) from top-left
- `lat: 50` and `long: 50` = center of the image (50%, 50%)
- No bounds = image stretches to fit the zoom level

⚠️ **NOTE**: Adding `bounds:` gives the image a fixed coordinate system, which keeps marker placement more precise. See [[Image Map with Bounds]] for an example.

```leaflet
id: simple-image-map
image: [[map image.png]]
lat: 50
long: 50
defaultZoom: 7
minZoom: 1
maxZoom: 10
height: 400px
marker: 
 - default,-2,2,,,,

```

## Understanding Image Coordinates

For image maps, coordinates are relative to the image:
- `lat: 0, long: 0` = top-left corner
- `lat: 50, long: 50` = center of image
- `lat: 100, long: 100` = bottom-right corner

## What you can do

1. **Click and drag** to pan around the map
2. **Scroll** to zoom in/out (or use the zoom buttons)
3. **Right-click** to add a marker (markers are saved)
4. **Shift+Right-click** and drag to create an overlay circle