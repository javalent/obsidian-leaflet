---
version: 6.0.5
---
Welcome to the Obsidian Leaflet Plugin examples vault! This vault demonstrates **all the major features** of the plugin with working examples you can use as templates.

## Complete Examples by Category

### 01 - Basic Maps 
Maps with real-world coordinates and images.
- [[Real World Map]] - OpenStreetMap with pan/zoom
- [[Simple Image Map]] - Display image with markers
- [[Image Map with Bounds]] - Image map with coordinate system
- [[Multi-Layer Image Map]] - Multiple layered images

### 02 - Markers from Frontmatter
Create markers using YAML in note frontmatter.
- [[Map Using Frontmatter]] - Load markers from notes
- [[Person Alice]] - String marker type (type name reference)
- [[Person Bob]] - Object marker with icon, color, layer
- [[Person Charlie]] - Multiple markers and overlays per note

### 03 - MarkerFolder Examples
Load markers from folder hierarchies (with depth limiting).
- [[MarkerFolder All Subfolders]] - Load all nested folders
- [[MarkerFolder Direct Only]] - Load only top-level items
- [[MarkerFolder Two Levels]] - Load 2 levels deep (pattern explained)
- **People folder structure** - Alice, Bob (direct), Charlie, Diana (1 level), Eve (2 levels)

### 04 - MarkerTag Examples
Load markers using tags (requires DataView plugin).
- [[MarkerTag Single]] - Map loading by single tag
- **Tagged notes** - City-A, City-B, Other-Note (demonstration of tag filtering)

### 05 - Links Examples
Load markers using note links (requires DataView plugin).
- [[LinksFrom Example]] - Load markers from notes that link from a specific article
- [[LinksTo Example]] - Load markers from notes that link to a specific article

### 06 - Code Block Markers
Immutable markers defined directly in map code (not editable via map UI).
- [[Immutable Markers YAML]] - YAML and comma-separated syntax

### 07 - Overlays
Circle overlays for showing areas/zones.
- [[Code Block Overlays]] - Overlays defined in map code block
- [[Overlays from Frontmatter]] - Overlays from note frontmatter

### 08 - External Files
Load GeoJSON and GPX data.
- [[GeoJSON Example]] - Load and style GeoJSON features
- [[GPX Example]] - GPS tracks with elevation, speed data
- **Attachment files** - example.geojson, example-track.gpx (provided in attachments/)

### 09 - Advanced Features
Control map behavior, appearance, and user interactions.
- [[Aspect Ratio]] - Preserve image aspect when resizing
- [[Dark Mode]] - CSS-based dark mode filtering
- [[Draw Mode]] - Enable drawing tools
- [[Lock Mode]] - Prevent accidental edits
- [[No UI Mode]] - Hide UI controls
- [[Tile Servers]] - Custom map tiles and overlays
- [[Zoom Controls]] - Control zoom levels and bounds

### 10 - Unit and Scale
Distance calculations and coordinate systems.
- [[Units and Distance]] - Measure with different units (miles, km, etc.)

## Frontmatter Quick Reference

```yaml
---
location: [40.7128, -74.0060]           # Required for marker creation
mapmarker: location                      # Optional: marker type name
mapmarkers:                              # Optional: array of multiple markers
  - [event, [41.0, -73.0], My Event]
mapoverlay:                              # Optional: overlays for this location
  - [red, [40.7128, -74.0060], 5 miles]
mapzoom: [40, 50]                       # Optional: zoom level breakpoints
---
```

## Map Code Block Quick Reference

````
```leaflet
id: unique-map-id                   # Required
markerFile: [[Note Name]]           # Load from single note
markerFolder: ./Path/To/Folder      # Load from folder hierarchy (relative path)
markerTag: location                 # Load by tag (requires DataView)
```
````

## Requirements

Some features require plugins:
- **markerTag, filterTag, linksTo, linksFrom** - Requires [DataView plugin](https://github.com/blacksmithgu/obsidian-dataview)

## Start Here

1. **[[Real World Map]]** - Simple working map
2. **[[Map Using Frontmatter]]** - How markers work
3. Explore other examples based on features you're interested in