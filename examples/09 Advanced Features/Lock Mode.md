This example shows how to prevent accidental edits to your map with lock mode.

## How it works

```leaflet
id: locked-map
lock: true
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

## What Lock Mode Prevents

With `lock: true`:

✅ **Allowed:**
- Panning the map
- Zooming in/out
- Clicking markers to see details
- Using distance measurement (Shift+Click)
- Viewing overlays

❌ **Prevented:**
- Creating new markers (right-click disabled)
- Creating overlays (Shift+right-click disabled)
- Editing existing shapes
- Dragging markers
- Deleting shapes

## Use Cases

**Data Visualization:**
````
```leaflet
id: sales-map
lock: true
markerFile: [[Sales Regions]]
lat: 39
long: -98
defaultZoom: 4
```
````

**Historical Maps:**
````
```leaflet
id: historical-route
lock: true
gpx: [[historic-path.gpx]]
image: [[old-map.png]]
```
````

**Shared Maps:**
Lock the map if you share it with others to prevent accidental changes.

**Reference Maps:**
Lock maps that show important reference data you don't want modified.

## Lock with Different Features

```leaflet
id: reference-map
lock: true
draw: true      # Still allows drawing shapes
lat: 40
long: -80
defaultZoom: 5
```

Wait - this might conflict. See "Combinations" below.

## Disabling Lock

````
```leaflet
lock: false
```
````

Or leave it out - default is `false` (unlocked).

## Combinations

**Reference Data (locked) + New Drawing (enabled):**

This requires planning:
- Load reference data normally (locked by default)
- Create empty map with `draw: true` for new annotations
- Can't lock and allow drawing on same map

**Solution - Two Maps:**

Reference (Locked):
```leaflet
id: reference-data
lock: true
```

Drawing Canvas (Unlocked):
```leaflet
id: my-annotations
draw: true
lat: 40
long: -80
```

## Default Lock Setting

In Obsidian settings:
- **Settings > Obsidian Leaflet > Lock Mode by Default**
- Toggle to lock all maps globally
- Individual maps can override with `lock: false`

## Unlocking

To edit a locked map:
1. Edit the code block
2. Change `lock: true` to `lock: false`
3. Make your changes
4. Save the note
5. Change back to `lock: true` if desired
