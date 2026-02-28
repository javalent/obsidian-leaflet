This example shows how to hide the map's user interface controls completely.

## How it works

```leaflet
id: minimal-map
noUI: true
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

## What Gets Hidden

With `noUI: true`:

✅ **Still visible:**
- Map tiles and data
- Markers and overlays
- Interaction (clicking) still works

❌ **Hidden:**
- Zoom +/- buttons
- Layer control (top-right)
- Attribution text
- Any UI overlays

## Use Cases

**Presentations:**
````
```leaflet
id: presentation-map
noUI: true
lock: true
markerFile: [[Key sLocations]]
lat: 39
long: -98
defaultZoom: 4
height: 600px
```
````

Clean view, no distracting controls.

**Minimalist Note:**
````
```leaflet
id: simple-location
noUI: true
lat: 40.7128
long: -74.0060
defaultZoom: 10
height: 400px
```
````

Just show the location, no controls.

**Embedded Maps:**
````
```leaflet
id: embedded-map
noUI: true
lock: true
image: [[map image.png]]
lat: 50
long: 50
height: 500px
```
````

For including maps in documentation.

## What Users Can Still Do

Even with `noUI: true`:

✅ Allowed:
- Scroll wheel to zoom (if noScrollZoom is false)
- Double-click to zoom in
- Drag to pan
- Click markers
- Right-click (if not locked) to add markers

## Combining Options

**Minimal + Locked:**
````
```leaflet
id: read-only-map
noUI: true
lock: true
markerFile: [[Important-Locations]]
```
````

Completely read-only, no controls or editing.

**Minimal + Scroll Disabled:**
````
```leaflet
id: static-map
noUI: true
noScrollZoom: true
defaultZoom: 8
```
````

Users must use double-click to zoom (if enabled).

## Keyboard Shortcuts Still Work

Even with `noUI: true`:
- Arrow keys: Pan the map
- Plus/Minus: Zoom in/out
- Shift+Click: Measure distance

## Re-enabling UI

````
```leaflet
noUI: false
```
````

Or just remove the `noUI:` line (default is false).

## Attributes Used With noUI

````
```leaflet
noUI: true
noScrollZoom: true      # Disable mouse wheel zoom
lock: true              # Prevent editing
defaultZoom: 8          # Set starting zoom
preserveAspect: true    # Maintain aspect ratio
height: 600px           # Set height
```
````

## What You Can Do

1. Hide controls for clean presentations
2. Control zoom with keyboard only
3. Prevent accidental map pan
4. Focus on the data, not the interface
5. Create embeddable maps

## Tips

- Combine with `lock: true` for a truly read-only view
- Users can still pan/zoom with gestures or keyboard
- Good for tutorial or example maps
- Use with presentations to reduce visual clutter