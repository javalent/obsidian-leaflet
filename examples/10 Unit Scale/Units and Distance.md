## Distance Measurement

```leaflet
id: distance-map
unit: miles
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

## How to Measure

1. **Shift+Click** on the map at your starting point
2. **Shift+Click** again at your ending point
3. **Distance appears** at the bottom-left
4. The distance **line is highlighted** on hover
5. **Click the distance** box to zoom to that line

## Unit Types

Most common units:

````
```leaflet
unit: miles          # US miles
unit: kilometers     # km
unit: meters         # Meters
unit: feet           # US feet
unit: yards          # Yards
unit: nautical-miles # Nautical miles
```
````

## Scale Factor for Image Maps

For image maps, distances are calculated based on pixel size. Use `scale` to convert:

````
```leaflet
image: [[map image.png]]
unit: feet
scale: 100
```
````

This means: 1 pixel = 100 feet

on real-world maps, `scale` is usually not needed (already in meters).

## Distance Multiplier

For more precise control:

````
```leaflet
unit: miles
distanceMultiplier: 0.75
```
````

The plugin:
1. Measures distance in meters
2. Converts to the unit you specified
3. Multiplies by distanceMultiplier
4. Displays the result

## Complete Example

````
```leaflet
id: measurement-map
unit: miles
distanceMultiplier: 1
lat: 40
long: -80
defaultZoom: 5
height: 600px
```
````

## What You Can Do

1. Measure straight-line distances between points
2. Change units by editing the map code block
3. Use on real-world and image maps
4. Hover the distance box to highlight the line
5. Click to zoom to that measurement

## Distance Calculation Formula

The plugin calculates distance using the **Haversine formula**:
- Works for real map coordinates (lat/long)
- Direct pixel-based calculation for image maps
- Accounts for Earth's curvature on real maps

## Tips

- **Shift+Click** works on markers too (starting or ending point can be a marker)
- **Alt+Click** also works if Shift doesn't
- Change units without remeasuring - just update the parameter
- For image maps, set scale based on how many pixels = 1 unit

## Common Scales for Image Maps

````
```leaflet
scale: 50        # 1 pixel = 50 units
scale: 100       # 1 pixel = 100 units  
scale: 1         # 1 pixel = 1 unit (for detailed technical drawings)
```
````

## Supported Units

The plugin supports all units from the `convert` library:
- **Distance**: mm, cm, m, km, in, ft, yd, mi, nmi
- See [units.ts](../../src/utils/units.ts) for complete list
