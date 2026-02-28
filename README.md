# Obsidian Leaflet

> **Development Status**: Maintenance Mode
> 
> Due to a glut of high priority Javalent plugin projects, this plugin is now entering maintenance mode for the time being. This is **not** a permanent status.
> - PR's will be reviewed.
> - *Yay* bugs will be reviewed and worked if able.
> - Feature Requests **will not** be worked.

> **⚠️ Stability Warning**: This plugin comes with no guarantee of stability and bugs may delete data. Please ensure you have automated backups.

---

Adds interactive mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/).

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/7d595a3db9bf0eff9f2a2150819d2bd6956ddcd8.gif">

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/275ff1f560bb6dec0d4fc02b267a7f63860f20c9_2_690x262.jpeg">

Read this in other languages: [简体中文](./README_zh_CN.md).

## Features at a Glance

- **Interactive Maps**: Display real-world maps (OpenStreetMap) or custom image maps in your notes
- **Flexible Markers**: Create markers from note frontmatter, folders, tags, or links using DataView
- **Drawing Tools**: Annotate maps with shapes, lines, and text
- **External Data**: Load GeoJSON and GPX files for geographic data visualization
- **Overlays**: Add circular zones and image overlays to highlight areas
- **Distance Measurement**: Calculate distances between points on your maps
- **Customizable**: Dark mode, custom tile servers, and extensive styling options

## Quick Start

### Installation

1. Open Obsidian Settings > Third-party plugins
2. Ensure Safe mode is **off**
3. Click **Browse community plugins**
4. Search for **"Leaflet"**
5. Click **Install**, then **Enable**
6. *Optional*: Install the [DataView plugin](https://github.com/blacksmithgu/obsidian-dataview) for advanced features (`markerTag`, `linksTo`, `linksFrom`, `filterTag`)

### Your First Map

Create a map by adding a `leaflet` code block to any note:

````markdown
```leaflet
id: my-first-map
lat: 39.9833
long: -82.9833
defaultZoom: 13
height: 500px
```
````

The `id` parameter is **required** and must be unique. This creates a real-world map centered on the specified coordinates. See the [examples folder](examples/) for 39+ working examples organized into 10 categories.

## Core Concepts

### Map Types

Obsidian Leaflet supports three types of maps:

1. **Real-world maps**: Uses OpenStreetMap by default, with support for custom tile servers
2. **Image maps**: Display uploaded images (floor plans, world maps, game maps) with custom coordinates

### How Markers Work

Markers can be added to maps in two ways:

**1. From Note Frontmatter** 

Add `location` or `mapmarkers` properties to any note's frontmatter:

```yaml
# Some Note.md
---
location: [39.9833, -82.9833]
mapmarker: event
---
```

Then reference the note in your map:

````markdown
```leaflet
id: my-map
markerFile: [Some Note]
```
````

**2. In Code Block Parameters of your map**

Define markers directly in the map's code block or reference notes by file, folder, tag, or link:

````markdown
```leaflet
id: my-map
marker: 
  - default, 39.9833, -82.9833, [[My Note]],
  - default, 29.9833, -92.9833, , My Description
markerFolder: ./People/
markerTag: #location
```
````

### Immutable vs Mutable Markers

- **Mutable markers**: Created by right-clicking on the map. These can be dragged, edited, and deleted through the UI. They are saved in the plugins `data.json` file.
- **Immutable markers**: Defined in code blocks or note frontmatter. These cannot be edited through the UI—require editing the source code or frontmatter. 

Both types support links to notes, zoom breakpoints (in frontmatter markers only), and custom marker types.

## User Guide: Interacting with Maps

### Basic Navigation

- **Zoom**: Use scroll wheel or +/- buttons in the top-left corner
- **Pan**: Click and drag the map
- **Disable scroll zoom**: Add `noScrollZoom: true` to your map code block

### Working with Markers

**Add markers**:
- Right-click anywhere on the map
- Select a marker type from the context menu (if multiple types are configured)
- The marker is created at that location

**Edit markers**:
- Right-click an existing marker
- Choose from options: add/edit link, change type, set zoom breakpoints, delete

**Add links to markers**:
- Right-click marker → **Link**
- Enter a note name: `My Note`
- Link to headers: `My Note#Section Name`
- Link to blocks: `My Note#^block-id`
- External URLs also supported: `https://example.com`

**Other marker interactions**:
- **Drag to move**: Click and drag any mutable marker
- **View coordinates**: Alt or Shift-click a marker to display its lat/long
- **Drop from file tree**: Drag a note from the sidebar onto the map to create a marker

### Working with Overlays

**Draw overlays**:
1. Hold Shift and right-click on the map
2. Drag to set the radius
3. Click again to confirm (or press Escape to cancel)

**Edit overlays**:
- Right-click an existing overlay
- Change radius, color, or description
- Delete the overlay

**Note**: Overlays are drawn in the order specified. Smaller overlays may be obscured by larger ones.

### Measuring Distances

1. Shift or Alt-click on a location
2. Shift or Alt-click on a second location
3. Shift or Alt-click iadditional location to connect multiple measurements
4. The distance is displayed in a control box (bottom-left corner)

Distances are shown in meters by default. Use the `unit` and `scale` parameters to customize.

### Command Markers

Markers can execute Obsidian commands instead of opening notes:

````markdown
```leaflet
id: command-map
commandMarker: command-name, 40, -80
```
````

Or set the link to a command name through the marker's right-click menu.

⚠️ **Warning**: Commands execute immediately when the marker is clicked. This could have unintended consequences. See [this issue](https://github.com/valentine195/obsidian-leaflet-plugin/issues/38) for details.

### Copy Coordinates to Clipboard

Enable "Copy Coordinates on Shift-Click" in plugin settings, then use Ctrl/Cmd + Shift-click anywhere on the map to copy coordinates to your clipboard.

## Feature Categories & Configuration

### Real-World Maps

Real-world maps use OpenStreetMap by default.

**Add custom tile servers** (alternative base layers):

````markdown
```leaflet
id: custom-tiles
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark Theme
```
````

**Add tile overlays** (layers on top of base map):

````markdown
```leaflet
id: overlay-tiles
tileOverlay: https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hills|on
```
````

Append `|on` to make an overlay default to on.

**Turn off OpenStreetMap**:
```yaml
osmLayer: false
```

Only usable when other tile servers are defined.

**Tile subdomains** (for concurrent requests):
```yaml
tileSubdomains: a,b,c
```

See the [Tile Servers example](examples/09%20Advanced%20Features/Tile%20Servers.md) for more details.

### Image Maps

Load an image as the base map layer:

````markdown
```leaflet
id: fantasy-map
image: [[My Map.png]]
bounds: [[0, 0], [100, 100]]
height: 600px
```
````

**Image sources**:
- Wikilinks: `[[Image.jpg]]`
- Direct URLs: `https://i.imgur.com/example.jpg`
- Obsidian URLs: `obsidian://open?vault=VaultName&file=Path/To/Image.jpg`

**⚠️ Strongly Recommended**: Set `bounds` to establish a fixed coordinate system:

````markdown
```leaflet
image: [[Map.png]]
bounds:
    - [<top-left-latitude>, <top-left-longitude>]
    - [<bottom-right-latitude>, <bottom-right-longitude>]
```
````

Without bounds, latitude and longitude are percentages from the top-left corner, and marker placement is imposible in codeblocks. With bounds, coordinates are true values and the image position is locked.

**Zoom behavior**: Image maps can be unintuitive. The image stays centered and stretched to fit; zoom levels control how much of the underlying coordinate space you see. For best results, always use bounds. See [this discussion](https://github.com/valentine195/obsidian-leaflet-plugin/discussions/130) or [this video tutorial](https://www.youtube.com/watch?v=54EyMzJP5DU) for details.

**Multiple image layers**:

````markdown
```leaflet
id: layered-map
image:
    - [[Political Map.png|Political]]
    - [[Terrain Map.png|Terrain]]
```
````

The layer control box (top-right) lets you switch between images. Markers can be saved separately for each layer.

See the [Image Map examples](examples/01%20Basic%20Maps/) for working implementations.

### Image Overlays

Add independent image overlays on top of any map:

````markdown
```leaflet
id: overlay-example
imageOverlay:
 - [[[Overlay.png|Region Overlay]], [10, 10], [20, 20]]
```
````

Syntax: `[[ImageFile|Optional Alias]], [TopLeft Coords], [BottomRight Coords]`

If coordinates are omitted:
- On image maps: overlay fills the entire image
- On real-world maps: overlay fills the initial map view

Toggle overlays on/off using the layer control box (top-right).

See the [Advanced Features examples](examples/09%20Advanced%20Features/) for more.

### Markers from Frontmatter

Any note with location data in its frontmatter can be displayed as a marker:

```yaml
---
location: [39.9833, -82.9833]
mapmarker: person
mapzoom: [3, 7]
---
```

**Frontmatter properties**:

| Property | Description |
|----------|-------------|
| `location` | `[lat, long]` - Creates a single marker at this location |
| `mapmarker` | `type-name` - Sets the marker type (string reference to type in settings) |
| `mapzoom` | `[min, max]` - Sets zoom level breakpoints for visibility |
| `mapmarkers` | Array of multiple markers: `[[type, [lat, long], desc, minZoom, maxZoom], ...]` |
| `mapoverlay` | Array of overlays: `[[color, [lat, long], radius unit, desc], ...]` |

Reference these notes using `markerFile`, `markerFolder`, `markerTag`, `linksTo`, or `linksFrom` parameters in your map code block.

See the [Markers from Frontmatter examples](examples/02%20Markers%20Frontmatter/) for working implementations.

### Markers from Folders

Load all notes in a folder (and subfolders) as markers:

````markdown
```leaflet
id: folder-markers
markerFolder: ./People/
```
````

**Depth limiting**:
- `markerFolder: ./People/` - Direct children + 1 subfolder level (⚠️ note: depth calculation has an off-by-one bug)
- `markerFolder: ./People//` - Direct children + 2 subfolder levels
- `markerFolder: ./People` - All subfolders (unlimited depth)

**Important**: Use relative path syntax with `./` prefix. Paths are relative to the vault root.

See the [MarkerFolder examples](examples/03%20MarkerFolder%20Examples/) for working implementations.

### Markers from Tags (Requires DataView)

Find notes by tags and create markers from their `location` frontmatter:

````markdown
```leaflet
id: tag-markers
markerTag: #location
```
````

**Tag syntax**:
- With quotes: `"#location"` (YAML treats `#` as comment, so quotes are required)
- Without hash: `location` (also works)

**Multiple tags (AND logic)**:
```yaml
markerTag: #location, #important
```
Finds notes that have **both** tags.

**Multiple criteria (OR logic)**:
```yaml
markerTag:
  - location
  - [city, favorite]
  - event
```

This finds:
1. Any note with `#location`
2. Any note with **both** `#city` **and** `#favorite`
3. Any note with `#event`

Notes are only parsed once even if they match multiple criteria.

See the [MarkerTag examples](examples/04%20MarkerTag%20Examples/) for working implementations.

### Markers from Links (Requires DataView)

Create markers from notes that link **to** or **from** a specific note:

````markdown
```leaflet
id: link-markers
linksTo: [[Main Location]]
linksFrom: [[Index Note]]
```
````

**linksTo vs. linksFrom**:
- `linksTo: [[Note]]` - Creates markers from notes that link **TO** that note (backlinks/incoming links)
- `linksFrom: [[Note]]` - Creates markers from notes that the specified note links **FROM** (outgoing links)

**Multiple files**:
```yaml
linksTo:
    - [[Note 1]]
    - [[Note 2]]
```

See the [Links examples](examples/05%20Links%20Examples/) for clear demonstrations.

### Filter Tags

Further restrict markers from `markerFile`, `markerFolder`, or `markerTag`:

````markdown
```leaflet
id: filtered-markers
markerFolder: ./Locations/
filterTag: #favorite
```
````

This finds notes in the `Locations` folder that **also** have the `#favorite` tag. Same syntax as `markerTag`, but filters results instead of adding them.

### Code Block Markers

Define immutable markers directly in the code block:

````markdown
```leaflet
id: code-markers
marker
  - default, 39.9833, -82.9833, [[My Note]], This is a marker
  - event, 40.0, -83.0, , Another marker, 3, 7
```
````

**Syntax**: `marker: type, lat, long, link, description, minZoom, maxZoom`

**Skip parameters**: Use double comma `, ,` to skip optional parameters:
```yaml
marker:
  - , 39.9833, -82.9833, , , 3
```
This uses the default marker type, no link, no description, and minZoom of 3.

**Multiple markers**: Use multiple `marker:` lines or YAML array syntax.

**Links**: Can be wikilinks `[[Note]]`, wikilinks with headers `[[Note#Section]]`, or external URLs.

These markers are **immutable**—they cannot be edited through the UI.

See the [Code Block Markers example](examples/06%20Code%20Block%20Markers/) for implementation.

### Overlays

Circular overlays can highlight areas on your map.

**Create on map**: Shift-right-click, drag to set radius, click again to confirm (Escape to cancel).

**Define in code block**:

````markdown
```leaflet
id: overlay-map
overlay: 
  - [blue, [39.9833, -82.9833], 5 km, Downtown Area]
  - ['rgb(255, 0, 0)', [40.0, -83.0], 10 mi, Radius Zone]
  - ['#00FF00', [39.5, -82.5], 500 ft, Small Area]
```
````

**Syntax**: `[color, [lat, long], radius unit, description]`

**Colors**: Any valid CSS color—hex (`#FF0000`), rgb (`rgb(255, 0, 0)`), or named colors (`blue`).

**From note frontmatter**: Add `mapoverlay` property to notes loaded via `markerFolder`, `markerFile`, or `markerTag`.

**Auto-generate from note data**:
````markdown
```leaflet
overlayTag: radius
```
````

This reads a `radius: 5 km` frontmatter property from linked notes and creates overlays.

**Default color**: Set with `overlayColor: blue`.

See the [Overlays examples](examples/07%20Overlays/) for implementations.

### GeoJSON

Load GeoJSON files for geographic data visualization:

````markdown
```leaflet
id: geojson-map
geojson: [[Data.json]]
geojsonColor: #FF5733
```
````

**Multiple files**:
```yaml
geojson:
  - [[File1.json]]
  - [[File2.json]]|Custom Name
  - [[File3.json]]|Regions|[[Related Note]]
```

**Optional alias**: Append `|Alias` to customize the layer name.

**Link to note**: Append `|[[Note]]` (alias required when linking) to make the entire GeoJSON clickable.

**Styling**: 
- Default color: Set with `geojsonColor: #3388ff`
- Custom styles: GeoJSON properties can use [MapBox SimpleStyle spec](https://github.com/mapbox/simplestyle-spec/tree/master/1.1.0)

**Tooltips**: The map auto-reads `title`, `description`, or `name` from GeoJSON feature properties.

**Drawing order**: Features are drawn in the order specified. Larger features may obscure smaller ones.

**Performance note**: Large or numerous GeoJSON files may slow initial rendering.

See [RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) for the full GeoJSON specification. See the [GeoJSON example](examples/08%20External%20Files/GeoJSON%20Example.md) for implementation.

### GPX Files

Load GPX (GPS eXchange) files to display routes and tracks:

````markdown
```leaflet
id: gpx-map
gpx: [[Track.gpx]]
gpxColor: #00AA00
gpxMarkers:
  start: start_marker
  waypoint: waypoint_marker
```
````

**Multiple files**:
```yaml
gpx:
  - [[Track1.gpx]]
  - [[Track2.gpx]]
```

**Markers**: By default, no markers are shown for start/end/waypoints. Use `gpxMarkers` to enable them with your custom marker types.

**Data visualization**: GPX files are parsed for datapoints (elevation, heart rate, cadence, speed). Click on the route to open a control box where you can select which data to display as a heatline. Hover over the track to see point-specific information.

**Drawing order**: Routes are drawn in the order specified.

**Performance note**: Large or numerous GPX files may slow rendering.

**Apple Health integration**: Export workouts from Apple Health as GPX files and visualize them in Obsidian. See [Apple's guide](https://support.apple.com/guide/iphone/share-health-and-fitness-data-iph27f6325b2/ios).

See the [GPX example](examples/08%20External%20Files/GPX%20Example.md) for implementation.

## Complete Parameter Reference

### Map Setup

| Parameter | Description | Default |
|-----------|-------------|---------|
| `id` | **Required**. Unique identifier for this map | *(none)* |
| `height` | Map height (pixels or percentage of note height) | `500px` |
| `width` | Map width (pixels or percentage of note width) | `100%` |
| `lat` | Default latitude for map center | `39.983334` (OpenStreetMap) / `50%` (image) |
| `long` | Default longitude for map center | `-82.983330` (OpenStreetMap) / `50%` (image) |
| `coordinates` | Read lat/long from a note's `location` frontmatter: `[[Note]]` or `[lat, long]` | *(none)* |
| `defaultZoom` | Initial zoom level | `5` |
| `minZoom` | Minimum allowable zoom level | `1` |
| `maxZoom` | Maximum allowable zoom level | `10` |
| `zoomDelta` | Zoom increment amount | `1` |
| `zoomTag` | Read zoom level from note frontmatter (e.g., `nearby: 100 mi`) | *(none)* |
| `zoomFeatures` | Auto-fit map to show all GeoJSON/GPX features | `false` |

### Layers

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image` | Image file(s) for image map: `[[Image.jpg]]` or array | *(OpenStreetMap)* |
| `bounds` | Fix image coordinates: `[[top-left-lat, top-left-long], [bottom-right-lat, bottom-right-long]]` | *(calculated)* |
| `tileServer` | Custom tile server(s): `URL\|Alias` | *(none)* |
| `tileOverlay` | Tile overlay(s): `URL\|Alias\|on` | *(none)* |
| `tileSubdomains` | Subdomains for tile servers: `a,b,c` | `a,b,c` |
| `osmLayer` | Show OpenStreetMap base layer | `true` |
| `imageOverlay` | Image overlay(s): `[[Image\|Alias]], [top-left], [bottom-right]` | *(none)* |

### Markers

| Parameter | Description | Default |
|-----------|-------------|---------|
| `marker` | Immutable marker: `type, lat, long, link, desc, minZoom, maxZoom` | *(none)* |
| `commandMarker` | Immutable command marker (same syntax as `marker`) | *(none)* |
| `markerFile` | Create markers from a note's frontmatter: `[[Note]]` or `Path/To/Note` | *(none)* |
| `markerFolder` | Create markers from folder: `./Path/To/Folder/` (append `/` to limit depth) | *(none)* |
| `markerTag`\* | Create markers from tagged notes: `#tag` or `tag` | *(none)* |
| `linksTo`\* | Create markers from notes linking **TO** specified note(s) | *(none)* |
| `linksFrom`\* | Create markers from notes linking **FROM** specified note(s) | *(none)* |
| `filterTag`\* | Filter marker results by tag (same syntax as `markerTag`) | *(none)* |
| `showAllMarkers` | Open map showing all markers | `false` |

\*Requires [DataView plugin](https://github.com/blacksmithgu/obsidian-dataview)

### Overlays

| Parameter | Description | Default |
|-----------|-------------|---------|
| `overlay` | Circular overlay: `[color, [lat, long], radius unit, desc]` | *(none)* |
| `overlayTag` | Auto-generate overlays from note frontmatter field | *(none)* |
| `overlayColor` | Default overlay color | `blue` |

### External Data

| Parameter | Description | Default |
|-----------|-------------|---------|
| `geojson` | Load GeoJSON file(s): `[[File.json]]\|alias\|[[note]]` | *(none)* |
| `geojsonColor` | Default color for GeoJSON features | `#3388ff` |
| `geojsonFolder` | Load all GeoJSON files from folder(s) | *(none)* |
| `gpx` | Load GPX file(s): `[[File.gpx]]` | *(none)* |
| `gpxColor` | Default color for GPX tracks | `#3388ff` |
| `gpxFolder` | Load all GPX files from folder | *(none)* |
| `gpxMarkers` | Define marker types for GPX start/end/waypoints | *(none)* |

### Display & Behavior

| Parameter | Description | Default |
|-----------|-------------|---------|
| `darkMode` | Invert map colors using CSS filter | `false` |
| `draw` | Enable drawing tools | `true` |
| `drawColor` | Default color for drawn shapes | `#3388ff` |
| `noUI` | Hide all controls | `false` |
| `lock` | Start with map locked (⚠️ incomplete implementation) | `false` |
| `recenter` | Force map to re-center after panning | `false` |
| `noScrollZoom` | Disable scroll wheel zooming | `false` |
| `preserveAspect` | Maintain container aspect ratio on resize | `false` |
| `unit` | Distance display unit (meters, miles, km, etc.) | `meters` |
| `scale` | Scale factor for image map distances | `1` |

## Plugin Settings

### Marker Settings

Configure default and custom marker types in Settings > Leaflet > Markers.

**Default Marker Type**:
- **Marker Icon**: [Font Awesome Free](https://fontawesome.com/icons?d=gallery&p=2&s=solid&m=free) icon name (e.g., `map-pin`)
- **Marker Color**: Color picker for the marker color
- **Layer Base Marker**: Whether to layer icons on top of the base marker

**Additional Marker Types**:
Create custom marker types that appear in the right-click context menu.

| Setting | Description |
|---------|-------------|
| Marker Name | Display name in context menu (e.g., "Location", "Event", "Person") |
| Marker Icon | Font Awesome icon name or uploaded image |
| Upload Image | Use a custom 24×24px image instead of Font Awesome icon |
| Layer Icon | Layer this icon on top of the base marker (if off, icon used directly) |
| Icon Color | Override default icon color |
| Associated Tags | Auto-select this marker type for notes with specified tags |

**Icon positioning**: When "Layer Icon" is on, drag the icon to position it. Hold Shift while dragging to snap to midlines.

### Display & UI Settings

| Setting | Description |
|---------|-------------|
| Default Latitude/Longitude | Default center for real-world maps if not specified |
| Default Zoom Level Delta | Amount to zoom in/out with each zoom action |
| Marker Tooltip Behavior | Default behavior for marker tooltips (hover or click) |
| Display Note Preview | Show Obsidian note preview when hovering linked markers |
| Display Overlay Tooltip | Show tooltips for overlays by default |
| Enable Draw Mode by Default | Add drawing tools to all maps unless `draw: false` |
| Copy Coordinates on Shift-Click | Ctrl/Cmd + Shift-click copies coordinates to clipboard |

### Local Marker Types

Create directory-specific marker types by adding a `markers.json` file:

```json
[
  {
    "type": "person",
    "iconName": "user",
    "color": "#FF5733",
    "layer": true
  },
  {
    "type": "event",
    "iconName": "calendar",
    "color": "#33FF57"
  }
]
```

**Icon interface properties**:
- `type`: Marker type name (string)
- `iconName`: Font Awesome icon name (string)
- `isImage`: Whether using custom image (boolean)
- `imageUrl`: Custom image URL (string)
- `color`: Hex color string (string)
- `alpha`: Opacity 0-1 (number)
- `layer`: Layer on base marker (boolean)
- `transform`: CSS transform string (string)
- `tags`: Associated tags array (string[])
- `minZoom`: Minimum zoom visibility (number)
- `maxZoom`: Maximum zoom visibility (number)

See the [Icon interface definition](https://github.com/javalent/obsidian-leaflet/blob/main/types/saved.d.ts) for full details.

## Data Management

### CSV Export/Import

Export and import marker data in CSV format from Settings > Leaflet > Data.

**CSV format**:
```
Map ID, Marker Type, Latitude, Longitude, Marker Link, Marker Layer, Marker ID
my-map, default, 39.9833, -82.9833, [[Note]], , 
my-map, person, 40.0, -83.0, [[Person A]], layer1, abc123
```

- **Marker Type**: Defaults to "default" if blank
- **Marker Layer**: Leave blank for single-layer maps
- **Marker ID**: Leave blank for new markers; plugin will generate

**Status**: This feature is still under development and may not work as expected.

### Marker Data Persistence

**Mutable markers** (created on map):
- Saved to the map instance
- Persist as long as the map code block exists in **any** note in your vault
- If all map blocks are removed, data is kept for 7 days before deletion

**Immutable markers** (code block/frontmatter):
- Stored in the source code or note frontmatter
- Persist permanently unless manually deleted

## Plugin Integrations

### DataView Plugin (Optional)

The [DataView plugin](https://github.com/blacksmithgu/obsidian-dataview) is required for:
- `markerTag` - Finding notes by tags
- `linksTo` - Finding notes that link **to** a note (backlinks)
- `linksFrom` - Finding notes a note links **from** (outgoing links)
- `filterTag` - Filtering marker results by tags

DataView's link index enables these features by maintaining a search index of all note relationships in your vault.

**Installation**: Settings > Community Plugins > Browse > Search "Dataview" > Install > Enable

### Initiative Tracker Integration

If the [Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) plugin is installed, combats can be opened as battlemaps:

- Active creatures in combat appear as markers on the map
- Configure default marker types for PCs and NPCs
- Set marker type for individual creatures
- Map state syncs with Initiative Tracker—creatures automatically update as they're added/removed

Perfect for running tabletop RPG sessions in Obsidian!

## Example Vault

A comprehensive example vault with 39+ working examples is included in the [examples folder](examples/):

**Getting started**: Open [Welcome.md](examples/Welcome.md) in the examples folder for a guided tour.

## Advanced Customization

### Custom Tile Servers

Add public tile servers for different map styles:

````markdown
```leaflet
id: custom-map
osmLayer: false
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark
tileServer: https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hillshading
```
````

**URL parameters**:
- `{s}` - Subdomain (a, b, c)
- `{z}` - Zoom level
- `{x}`, `{y}` - Tile coordinates
- `{r}` - Pixel ratio

**Note**: Tile servers requiring API authentication are not supported.

See the [Tile Servers example](examples/09%20Advanced%20Features/Tile%20Servers.md).

### Dark Mode Styling

Enable dark mode with `darkMode: true`. This applies a CSS filter to the map:

```css
.leaflet-container .dark-mode {
    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) 
            saturate(0.3) brightness(0.7);
}
```

**Customize**: Override this CSS in a custom snippet to adjust the appearance. See [MDN's CSS filter documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) for filter options.

See the [Dark Mode example](examples/09%20Advanced%20Features/Dark%20Mode.md).

### Drawing & Annotations

Drawing mode adds tools for annotating maps.

**Enable**: `draw: true` (enabled by default) or disable globally in settings.

**Disable**: `draw: false`

**Tools available**:
- Freehand drawing
- Rectangle
- Circle
- Text annotations
- Edit existing shapes
- Delete shapes

**Default color**: Set with `drawColor: #3388ff` (any CSS color)

See the [Draw Mode example](examples/09%20Advanced%20Features/Draw%20Mode.md).

### Marker Zoom Breakpoints

Show markers only within specific zoom ranges:

**In frontmatter**:
```yaml
mapzoom: [3, 7]
```

**In code block**:
```yaml
marker: type, lat, long, link, desc, 3, 7
```

Markers with breakpoints disappear when zooming outside the specified range.

⚠️ **Caution**: Ensure breakpoints are within the map's `minZoom` and `maxZoom`, or markers may never appear.

### Responsive Maps

Lock the container's aspect ratio when the pane resizes:

```yaml
preserveAspect: true
```

**How it works**: When enabled, the map maintains its initial aspect ratio. If your map is initially 600×400 (1.5:1 ratio), it will maintain that ratio when the note pane is resized—becoming 800×533, 1000×667, etc.

**Purpose**: Maintains visual proportions in responsive layouts.

See the [Aspect Ratio example](examples/09%20Advanced%20Features/Aspect%20Ratio.md).

## Known Issues

The plugin is in maintenance mode and has a few known bugs/incomplete features:

**markerFolder Depth Bug:**
- The depth parameter is off by one
- `./Folder/` (1 slash) loads direct children + 1 subfolder level (not just direct children)
- `./Folder//` (2 slashes) loads direct children + 2 subfolder levels
- See [[MarkerFolder Direct Only]] for details

**mapmarker Object Syntax:**
- The object syntax for `mapmarker` frontmatter is documented but unimplemented
- Example: `mapmarker: {icon: user, color: ff6b6b}` does not work
- Workaround: Define marker types in markers.json or plugin settings, then reference by name: `mapmarker: person`
- See [[Person Bob]] for details

**Lock Mode Incomplete:**
- The lock parameter (`lock: true`) exists but only prevents marker dragging
- Right-click context menus still allow creating markers and overlays
- Draw mode still functions even when locked
- See [[Lock Mode]] for current behavior

**Overlay Creation:**
 - Overlay creation using Shift + Right-Click is inconsistent and error prone

## Installation & Updates

### From Obsidian Community Plugins

1. Open Obsidian **Settings**
2. Navigate to **Third-party plugins**
3. Ensure **Safe mode** is **off**
4. Click **Browse community plugins**
5. Search for **"Leaflet"**
6. Click **Install**
7. Close the community plugins window
8. Enable the plugin in the plugin list

### From GitHub

1. Go to the [GitHub Releases](https://github.com/javalent/obsidian-leaflet/releases) page
2. Download the latest release ZIP file
3. Extract the plugin folder to: `<vault>/.obsidian/plugins/`
   - On some systems, the `.obsidian` folder is hidden
   - On macOS: Press `Cmd+Shift+.` in Finder to show hidden files
4. Reload Obsidian
5. If prompted about Safe Mode, disable it and enable the plugin
   - Or go to Settings > Third-party plugins and enable it there

### Updating

Follow the same procedure as installation. The new version will overwrite the old one.

## Contributing & Support

**Status**: This plugin is in **Maintenance Mode**.

- ✅ **Pull requests** will be reviewed
- ✅ **Bug reports** will be reviewed and fixed when possible
- ❌ **Feature requests** will not be prioritized (plugin is feature-complete)

**Report bugs**: [GitHub Issues](https://github.com/javalent/obsidian-leaflet/issues)

**Request features**: [GitHub Discussions](https://github.com/javalent/obsidian-leaflet/discussions) (lower priority)

**Stability reminder**: This plugin comes with no guarantee of stability. Please ensure you have automated backups of your vault.

## Related Plugins

Other useful Obsidian plugins for mapping and tabletop gaming:

- **[5e Statblocks](https://github.com/valentine195/obsidian-5e-statblocks/)** - Create D&D 5e-styled statblocks inside notes
- **[Dice Roller](https://github.com/valentine195/obsidian-dice-roller)** - Roll and re-roll dice in notes
- **[Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker)** - Initiative tracker view with battlemap integration

## Attribution

Built with [Leaflet.js](https://leafletjs.com/) - an open-source JavaScript library for interactive maps.

Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

Icons from [Font Awesome Free](https://fontawesome.com/).

## Version History

See [CHANGELOG.md](CHANGELOG.md) for full version history and release notes.

## Support the Developer

<a href="https://www.buymeacoffee.com/valentine195"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"></a>
