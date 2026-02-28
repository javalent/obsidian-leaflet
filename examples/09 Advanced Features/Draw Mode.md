## How it works

```leaflet
id: draw-mode-map
draw: true
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

## Drawing Tools

When draw mode is enabled, your map includes:
- **Polyline** - Draw lines/paths
- **Rectangle** - Draw rectangular areas
- **Polygon** - Draw custom shapes
- **Marker** - Place points
- **Circle** - Draw circles with specific radius
- **Text** - Add text labels

## How to Draw

1. **Click drawing tool** in the top-left
2. **Click on the map** to place points
3. **Right-click** to finish the shape
4. **Edit shapes** by clicking them
5. Shape data is **saved automatically**

### Drawing Controls

- **Save** - Finishes the current shape
- **Cancel** - Discards the current shape
- **Edit** - Modify existing shapes
- **Delete** - Remove a shape
- **Color** - Change the drawing color before creating

## Default Draw Color

````
```leaflet
draw: true
drawColor: #ff0000
```
````

This sets the default color for new shapes:
- Use hex colors (`#ff0000` for red)
- CSS color names (`blue`, `green`)
- RGB format (`rgb(255, 0, 0)`)

## Enable/Disable Draw Mode

````
```leaflet
draw: false
```
````

This disables drawing (default is enabled).

Or in settings:
- **Settings > Obsidian Leaflet > Enable Draw Mode by Default**
- Toggle this in individual maps with `draw:` parameter

## Saving Drawings

Drawings are saved automatically to the map's data store:
- Persist when you close and reopen Obsidian
- Separate per map (each `id:` has its own drawings)
- Can be exported/imported (experimental)
