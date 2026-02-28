This example shows an image map with precise coordinate bounds.

## How it works

- `bounds` sets exact coordinates for top-left and bottom-right corners
- Image will always stay within these bounds, no matter the zoom level
- Coordinates are REAL coordinates (not percentages like simple image maps)
- This ensures consistent positioning

```leaflet
id: image-map-with-bounds
image: [[map image.png]]
bounds:
  - [0, 0]
  - [1536, 2816]
marker:
  - default, 768, 1408, , Center
lat: 768
long: 1408
height: 400px
defaultZoom: -2
minZoom: -2
maxZoom: 3
```

## Understanding Bounds

- First entry `[0, -0]` = **top-left corner** (latitude, longitude)
- Second entry `[1536, -2816]` = **bottom-right corner** (latitude, longitude)
- Latitude increases going North, decreases going South
- Longitude increases going East, decreases going West

## Why Use Bounds?

1. **Consistent Positioning** - Image stays in the same place when zooming
2. **Accurate Markers** - Markers placed on the image will be at the correct coordinates
3. **Predictable** - No surprises with image placement at different zoom levels


## Pro Tips

- Match your bounds to the aspect ratio of your image for best results (otherwise the image may skew)
- If you're not sure what bounds to use, start with simple percentages and adjust
- You can get coordinates by Shift+Click on the map to see lat/long values
