This example shows how to create colored overlays directly in the map code block, instead of in frontmatter.

## Code Block Overlays

```leaflet
id: overlay-example
overlay: 
  - [blue, [40.7128, -74.0060], 20 mi, City overlay]
  - [red, [42.3601, -71.0589], 30 mi, Boston area]
  - [green, [41.8781, -87.6298], 40 mi, Chicago area]
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

## Overlay Syntax Breakdown

```
[color, [latitude, longitude], radius <unit?>, description]
```

1. **color** - CSS color name (blue, red, green, yellow, etc.) or hex code with transparency
2. **latitude** - Lat coordinate
3. **longitude** - Long coordinate  
4. **radius** - Size (uses units from the `unit:` parameter, default = km)
5. **unit** - Optional: Specific unit for this overlay (meters, miles, etc.)
6. **description** - Label that appears on click

## Real-World Example

```leaflet
id: delivery-zones
overlay:
  - [blue, [40.7128, -74.0060], 3 mi, Zone A - Downtown]
  - [green, [40.6501, -73.9496], 4 mi, Zone B - Central]
  - [red, [40.7589, -73.9851], 5 mi, Zone C - Upper]
lat: 40.7
long: -73.95
unit: miles
defaultZoom: 10
height: 600px
```
