## Zoom Parameters

```leaflet
id: zoom-control-map
defaultZoom: 6
minZoom: 3
maxZoom: 18
zoomDelta: 2
lat: 40
long: -80
height: 600px
```

## Parameter Explanations

**defaultZoom:**
- Starting zoom level when map loads
- Range: 0-20 (where 0 = world view, 20 = max detail)
- 0 = entire world
- 5 = continent
- 10 = city
- 15 = neighborhood
- 20 = individual buildings

**minZoom:**
- In minimum zoom level
- User can't zoom out past this
- Lower = wider view allowed
- Example: 2 = can't zoom out to world

**maxZoom:**
- Maximum zoom level (zoom in limit)
- User can't zoom past this
- Example: 15 = prevents zooming to building level

**zoomDelta:**
- How much zoom changes per click/scroll
- Default: 1
- zoomDelta: 2 = jump 2 levels per click
- Useful for forcing round zoom levels

## Example: US Map

````
```leaflet
id: us-map
defaultZoom: 4
minZoom: 2
maxZoom: 12
lat: 39
long: -98
height: 600px
```
````

- Starts zoomed to US level
- Can't zoom out past continent view
- Can't zoom in past street level

## Example: City Map

````
```leaflet
id: city-map
defaultZoom: 12
minZoom: 10
maxZoom: 17
lat: 40.7128
long: -74.0060
height: 600px
```
````

- Starts at city neighborhood level
- Can zoom out to see surrounding area
- Can zoom in to streets

## Zoom Features

````
```leaflet
zoomFeatures: true
```
````

Automatically zoom to show all markers/features:
- Ignores defaultZoom/minZoom/maxZoom
- Fits the map view to contain all data
- Useful for maps with data scattered at various locations

## Show All Markers

````
```leaflet
showAllMarkers: true
```
````

Same as zoomFeatures but specifically for markers. When both are enabled, the map zooms to contain everything.

## Fit Bounds Example

````
```leaflet
id: regional-map
defaultZoom: 8
minZoom: 4
maxZoom: 14
lat: 40
long: -80
bounds: [[42.5, -71], [39.5, -84]]
height: 600px
```
````

Optionally restrict the region users can pan to.

## User Interactions

Users can zoom by:
- **Mouse wheel** - Scroll to zoom in/out
- **+/- Buttons** - Left corner controls
- **Double-click** - Zoom in
- **Pinch** - Mobile (spread fingers to zoom)

## Tips

- defaultZoom should be a nice "overview" of your data
- minZoom prevents users from getting lost in world view
- maxZoom prevents slow performance on very detailed tiles
- zoomDelta: 1 is smooth, zoomDelta: 2 is snappy

## Image Maps

Zoom controls work differently on image maps:
````
```leaflet
image: [[map-image.png]]
defaultZoom: 1
minZoom: 0.5
maxZoom: 3
```
````

Zoom is relative to image size, not geographic levels.

## What You Can Do

1. Adjust defaultZoom to change starting view
2. Set minZoom to prevent users from zooming too far out
3. Set maxZoom to keep performance good
4. Use zoomfeatures to auto-fit your data
5. Use showAllMarkers to ensure all markers visible

## Performance Notes

- Higher maxZoom can slow down loading
- Limit maxZoom to 17-18 for best performance
- More detailed tiles = more load at high zoom
