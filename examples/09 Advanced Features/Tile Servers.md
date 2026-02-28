This example shows how to add custom map tile layers and overlays.

## Multiple Tile Servers

````
```leaflet
id: tile-servers
osmLayer: false
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark Mode
tileServer: https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hillshading
lat: 40
long: -80
defaultZoom: 5
height: 600px
```
````

## How Tile Servers Work

- **`tileServer`** = can switch between these as base layers
- **`tileOverlay`** = appear on top of the base map
- **`osmLayer: false`** = removes default OpenStreetMap
- Layers appear in the layer control (top-right)

## Tile Server URL Format

```
https://{s}.example.com/{z}/{x}/{y}.png
```

Where:
- **`{s}`** = subdomain (a, b, c, etc.) for load balancing
- **`{z}`** = zoom level
- **`{x}`** = tile column
- **`{y}`** = tile row
- **`{r}`** = high-DPI flag (optional)

## Tile Server Examples

**Dark Mode (Carto):**
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark
```

**Satellite (USGS):**
```
https://basemap.nationalmap.gov/arcgis/rest/services/USGSImagery/MapServer/tile/{z}/{y}/{x}|Satellite
```

**Hillshading (Overlay):**
```
https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hills
```

## Tile Overlays

Overlays appear on top of the base map:

````
```leaflet
osmLayer: true
tileOverlay: https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hillshading
tileOverlay: https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png|Black & White
```
````

To default an overlay ON:
```
tileOverlay: url|Alias|on
```

## Tile Subdomains

For servers using subdomains:

````
```leaflet
tileServer: https://webrd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}
tileSubdomains: 1,2,3
```
````

This creates: webrd01, webrd02, webrd03

## Important Notes

✅ **Make sure tile servers allow public use**
- Check the server's licensing
- Some may require attribution in the code

❌ **Tile servers requiring API keys don't work yet**
- Can't use Mapbox, Google Maps with API keys
- Use open/free tile servers instead

## Popular Free Tile Servers

- **OpenStreetMap** (default) - Standard map
- **Carto** - Dark/Light mode options
- **USGS** - Satellite and topographic
- **Esri** - Various map styles
- **GEBCO** - Ocean bathymetry

## Attribution

Always include proper attribution for tile servers. The plugin usually handles this automatically, but check the tile server's terms.
