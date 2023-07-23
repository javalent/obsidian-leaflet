# Obsidian Leaflet
> **Development Status**: Maintenance Mode
> 
> Due to a glut of high priority Javalent plugin projects, this plugin is now entering maintenance mode for the time being. This is **not** a permanent status.
> - PR's will be reviewed.
> - *Yay* bugs will be reviewed and worked if able.
> - Feature Requests **will not** be worked.

---

Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/7d595a3db9bf0eff9f2a2150819d2bd6956ddcd8.gif">

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/275ff1f560bb6dec0d4fc02b267a7f63860f20c9_2_690x262.jpeg">

Proof of concept currently. May not work as expected. Currently only tested on Windows & Mac.


Read this in other languages: [简体中文](./README_zh_CN.md).

## Working with the plugin & example

A map can be created with a `leaflet` code block. For example:

````markdown
```leaflet
id: leaflet-map
image: [[Image.jpg]]
height: 500px
lat: 50
long: 50
minZoom: 1
maxZoom: 10
defaultZoom: 5
unit: meters
scale: 1
marker: default, 39.983334, -82.983330, [[Note]]
darkMode: true
```
````

## Options

> :pencil: Using Links
>
> Several parameters below are for providing links to the map, whether that be for images, marker files, etc.
>
> In all cases, either Obsidian's Wikilinks (`[[Link]]`) _or_ standard markdown links (`[Link](./path/to/file)`) may be provided.

| Option                                  | Description                                                                                                 | Default                                    |
|-----------------------------------------|-------------------------------------------------------------------------------------------------------------------------|--------------------------------------------|
| [id](#map-ids)                          | Unique identifier (can be anything). **Required.**                                                          |                                            |
| [image](#image-maps)                    | Direct URL/file path to an image file to be used as the map layer.                                          | OpenStreetMap map                          |
| [tileServer](#real-world-maps)          | Add additional tile servers as different layers                                                             |                                            |
| [tileSubdomains](#tile-subdomains)      | Add Available subdomains for additional tile servers  concurrent requests. Spilt by ',', etc. 'a,b,c' | a,b,c                                      |
| [tileOverlay](#real-world-maps)         | Add additional tile servers an overlay over the base map.                                                   |                                            |
| [osmLayer](#real-world-maps)            | Turn off the OpenStreetMap layer (only usable if additional Tile Servers have been provided)                |                                            |
| [lat](#initial-coordinates)             | Default latitude to display when rendering.                                                                 | 50% (image) / 39.983334 (open street map)  |
| [long](#initial-coordinates)            | Default longitude to display when rendering.                                                                | 50% (image) / -82.983330 (open street map) |
| height                                  | Height of the map element. Can be provided in pixels or percentage of note height.                          | 500px                                      |
| width                                   | Width of the map element. Can be provided in pixels or percentage of note width.                            | 100%                                       |
| [minZoom](#initial-zoom-level)          | Minimum allowable zoom level of the map.                                                                    | 1                                          |
| [maxZoom](#initial-zoom-level)          | Maximum allowable zoom level of the map.                                                                    | 10                                         |
| [defaultZoom](#initial-zoom-level)      | Map will load zoomed to this level.                                                                         | 5                                          |
| [zoomDelta](#initial-zoom-level)        | Zoom level will change by this amount when zooming.                                                         | 1                                          |
| zoomFeatures                            | The map will automatically fit all [GeoJSON](#geojson) and [GPX](#gpx) features                             |                                            |
| [unit](#unit-and-scale)                 | Unit to display distances in                                                                                | meters                                     |
| [scale](#unit-and-scale)                | Scale factor for image map distance calculation.                                                            | 1                                          |
| [marker](#markers)                      | Create immutable markers on the map                                                                         |                                            |
| [commandMarker](#defined-in-code-block) | Create immutable markers that execute commands                                                              |                                            |
| [markerFile](#marker-file)              | Create immutable marker from a note's frontmatter                                                           |                                            |
| [markerFolder](#marker-folders)         | Create immutable markers from _all_ of the notes in the given Paths (relative or absolute to the Vault-Root). Limit Depth by appending one '/' per Folder-Level  |                                            |
| [markerTag\*](#marker-tags)             | Create immutable markers from _all_ of the notes with the given tags.                                       |                                            |
| [filterTag\*](#filter-tag)              | Filter what files are used to create markers. Only markers that match the tags will be used.                |                                            |
| [linksTo\*](#links)                     | Create immutable markers from _all_ of the notes linking **TO** a note                                      |                                            |
| [linksFrom\*](#links)                   | Create immutable markers from _all_ of the notes linking **FROM** a note                                    |                                            |
| [darkMode](#dark-mode)                  | Invert map colors                                                                                           | false                                      |
| [overlay](#overlays)                    | Add a circle overlay to the map                                                                             |                                            |
| [overlayTag](#overlay-tag)              | Define a YAML tag to search for in specified marker notes                                                   |                                            |
| [overlayColor](#overlay-color)          | Change default overlay color                                                                                | blue                                       |
| [bounds](#bounds)                       | Set image map bounds to specified coordinates instead of default                                            |                                            |
| [coordinates](#initial-coordinates)     | Read location data from a note and use it as initial coordinates                                            |                                            |
| [zoomTag](#initial-zoom-level)          | Read distance-to-zoom data from a note and use it as default initial zoom                                   |                                            |
| [geojson](#geojson)                     | Load multiple *.GeoJSON file-Paths in Json or YAML Syntax into this map. Relative Paths to the current doc start with `.` (dot). |                                            |
| [geojsonColor](#styles-and-color)       | Change the default color of the GeoJSON features.                                                           | #3388ff                                    |
| geojsonFolder                           | Search in multiple folders (Json or YAML Syntax) for `*.geojson` or `*.json` files to load into this map. Relative Paths start with `.` (Dot). Limit Subfolder Depth by appending one Slash per Folder-Level |      |
| [gpx](#gpx)                             | Load GPX files onto maps.                                                                                   |                                            |
| [gpxMarkers](#gpx-markers)              | Set default start, stop and waypoint markers                                                                |                                            |
| gpxColor                                | Control default GPX color                                                                                   | #3388ff                                    |
| gpxFolder                               | Parse a folder for `.gpx` files to load to the map.                                                         |                                            |
| [imageOverlay](#image-overlays)         | Add an image overlay to the map.                                                                            |                                            |
| [draw](#enable-draw-mode-by-default)    | Enable the draw controller on the map.                                                                      | true                                       |
| drawColor                               | Default color that new shapes will be drawn with                                                            | #3388ff                                    |
| showAllMarkers                          | Map will open showing all markers.                                                                          | false                                      |
| preserveAspect                          | If the note pane the map is in is resized, the map will resize itself to maintain its initial aspect ratio. | false                                      |
| noUI                                    | No controls will be added to the map.                                                                       | false                                      |
| lock                                    | Control whether the map will start locked or unlocked                                                       | false                                      |
| recenter                                | Forces map to stay re-center itself after panning.                                                          | false                                      |
| noScrollZoom                            | Turns off scrollwheel zooming.                                                                              | false                                      |

> \*: Requires the [DataView plugin](https://github.com/blacksmithgu/obsidian-dataview).

### YAML syntax

As of version **3.11.0**, all parameters may be defined using YAML syntax instead of using multiple of the same tag. The original syntax will still work, but the two cannot be combined.

For example:

````
```leaflet
image:
    - [[Image 1]]
    - [[Image 2]]
    - [[Image 3]]
marker:
    - [<type>, <lat>, <long>, <link>]
    - [<type>, <lat>, <long>, <link>]
```
````

#### Marker Tags in YAML

YAML considers the `#` symbol to be a comment, so the `markerTag` or `filterTag` parameters must either be wrapped in quotes (`"#tag"`) or defined without the `#` symbol.

#### Links

I

## Map IDs

As of **3.0.0**, map ids are required. If a note with a old map block is opened, the plugin will warn you that the map now requires an ID.

Once an old map is given an ID, the plugin will try to associate the marker data with the new map.

The first time you open the plugin after updating to 3.0.0, a backup of your marker data will be created in case you need to downgrade. If you run into issues, please create an issue on Github.

## Initial Map View

### Initial Coordinates

The map will open to the latitude and longitude defined using `lat` and `long`. If not provided, it will default to the latitude and longitude defined in settings.

Alternatively, the latitude and longitude may be defined using the `coordinates` parameter. Coordinates may be defined as an array of numbers, or as a wikilink to a note that has a `location` frontmatter tag:

```
coordinates: [36, -89]
coordinates: [[Note with Location Frontmatter]]
```

### Initial Zoom Level

> :warning: Using an Image Map?
>
> Zoom levels and image maps may be a little unintuitive.
>
> Check out [Zooming with Image Maps](#zooming-with-image-maps) below.

The initial zoom level of the map may be set using the `defaultZoom` parameter. This must be a number between the `minZoom` and `maxZoom` parameters - if outside of them, it will be set to the nearest parameter.

Alternatively, if a `coordinates` note has been defined, the initial zoom level may be read from that note's frontmatter as `<distance> <unit>`.

For example, if a note has the following frontmatter:

```
### Note With Frontmatter.md
---
location: [-36, 89]
nearby: 100 mi
---
```

and the map was defined like this:

```leaflet
coordinates: [[Note With Frontmatter]]
zoomTag: nearby
```

Then the map will read the `nearby` tag, recognize it is `100 miles`, and set the map's initial zoom to the closest level that will display 100 miles (this depends on `minZoom`, `maxZoom`, and `zoomDelta`).

## Real World Maps

Real world maps are created if the `image` parameter is not provided. These maps by default will load the `OpenStreetMap` map, but additional tile servers can be provided using the `tileServer` parameter.

**It is up to you to ensure that the tile servers you use are publically usable.**

At this time, tile servers requiring API access are not usable.

If additional tile servers are provided, the `OpenStreetMap` layer can be turned off using the `osmLayer: false` parameter.

### Tile Servers

As mentioned above, additional tile servers can be added using the `tileServer` and `tileOverlay` parameter. Both have the same syntax:

`tileServer: <domain>|<alias (optional)>`

For example:

```md
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark

---

tileServer:

-   https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark
-   https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png|Hills
```

Tile servers specified in `tileServer` will be added as additional **layers** that can be fully switched to.

### Tile Overlays

Tile servers specified as `tileOverlay` instead as `tileServer` will be added as overlays that will load on top of the base map.

Tile overlays can be set to default on by appending `|on` to the end:

```md
tileServer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png|Dark|on
```

### Tile Subdomains

Add Available subdomains for additional tile servers  concurrent requests. Spilt by ',', etc. 'a,b,c'.

`tileSubdomains: <domain1>,<domain2>,<domain3>`

For example:
----
```leaflet
osmLayer: false
tileServer: https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}
tileSubdomains: 1,2,3
```
---

So that map will load map data from below urls:
https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}
https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}
https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}


## Image Maps

> **:warning: Making an Image Map?**
>
> For images maps, it is **highly** recommended that you set your [bounds](#bounds) first.
>
> This will make working with your images much easier!
>
> Read the [discussion](https://github.com/valentine195/obsidian-leaflet-plugin/discussions/130) about the process. Josh Plunkett has also made a great video breaking down the process [here](https://www.youtube.com/watch?v=54EyMzJP5DU).

### Image Map URL / file path

Image maps can be loaded one of three ways:

1. Direct URL (e.g., https://i.imgur.com/jH8j3mJ.jpg)
2. Obsidian URL (e.g., obsidian://open?vault=VaultName&file=Path/To/Image.jpg)
3. Obsidian wikilink of image (e.g., [[Image.jpg]])

### Zooming with Image Maps

You may notice that basic image maps and zooming do not necessarily behave the way you think they would. For instance, you may find that setting a higher max zoom value just makes the map _start farther away_, instead of actually allowing you to zoom in more.

This is because of the way image maps are essentially a hack on top of the LeafletJS module. There is still an underlying map that still has its latitude and longitude, it just can't be seen. The image is then drawn on top of that map (centered at [0, 0]) and then stretched to fit. If you change parameters (such as the zoom levels), the underlying map is changed... but the image is **still placed at [0, 0] and stretched to fit!**

Instead, the [image bounds](#bounds) need to be set for your map. This tells Leaflet _exactly_ what coordinates your image should be placed at on the underlaying map layer. No matter how the map instance changes, the image will be in the same spot and the same size, **every time!**

### Multi-Image Maps

Images can be layered on top of each other by providing multiple images to the plugin:

````markdown
```leaflet
id: Map With Layered Images
image:
    - [[Image1.jpg|Optional Alias]]
    - [[Image2.jpg]]
    - [[Image3.jpg]]
```
````

This will generate a map with 3 layers. Image 1 will be on top, Image 2 in the middle, and Image 3 on bottom. The images will be aligned around their center points.

The control box in the top right of the map will allow you to change layers.

Markers can be created and saved on each layer separately from one another.

If given an alias, the layer control box will display the given name instead of the file name.

### Bounds

Custom bounds may be given to an image map using the `bounds` parameter:

````
```leaflet
image: [[Image.jpg]]
bounds:
    - [<top-left-latitude>, <top-left-longitude>]
    - [<bottom-right-latitude>, <bottom-right-longitude>]
```
````

This will cause the latitude and longitude of the image map to be updated to fit within the bounds. _This will skew the image if the provided bounds do not match the aspect ratio of the image._

Any markers or overlays defined on the map will not be updated.

### Latitude and Longtitude of Image Maps

Because an image map does not have a true coordinate system, the latitude and longitude provided must be given as a percentage from the **top left corner of the image**.

This setting may seem to not do anything without changing the default zoom level of the map.

### Unit and Scale

If provided, the plugin will scale the calculated distance between two points by `scale` and display the result as `xxx unit`.

On real-world maps, only `unit: ` is required. It will attempt to scale the measurement from `meters` to `unit`.

## Markers

New markers can be added to the map by right clicking.

If any additional marker types have been created in plugin settings or a `markers.json` file in the same directory, a list will appear to choose from.

Once a marker has been created, it can be dragged to a different location.

Markers created on the map will be saved to the map instance. Marker data saved this way will persist as long as the map is associated with a note - if the map blocks are removed from notes, or if all of the notes containing map blocks are removed, **the data associated with it will be deleted after 7 days.**

### Marker Zoom Level Breakpoints

Markers given zoom level breakpoints will be removed from the map when the map is zoomed above or below the breakpoints.

These breakpoints can be set in right-click menu of markers created on the map as well as using parameters for markers created in the source block (see [Objects Defined in the Code Block](#objects-defined-in-the-code-block) for more information).

Be careful! Make sure the breakpoints are within the map's zoom boundaries, otherwise the marker might never be displayed!

### Marker Coordinates

<kbd>Alt</kbd> or <kbd>Shift</kbd>-clicking on a marker will reveal its coordinates.

### Marker Links

A marker can also point to a note; right-click on it, and a popup will appear. The target can be entered as the name of the note. Additionally, headers or blocks within a note can be the target of a marker:

`Note`

`Note#Header1`

If you have multiple notes with the same name, you should specify the direct path to the note. Otherwise, the map may not open the one you expect.

Once linked, a click will open the note (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-click to open in new window).

Additionally, markers can be created by dragging a note from the file tree and dropping it on the map.

Marker links can also be set to external websites. Clicking the marker will open the website.

#### Obsidian Commands as Links

Markers links can also be set to a defined Obsidian command from the command palette one of two ways.

The command must be the full name of the command as it appears in the palette.

**Setting a marker link to a command will execute the command when the marker is clicked.**

> ##### **Warning**
>
> Using a command as a marker target could have unintended consequences.
>
> Please see [this issue](https://github.com/valentine195/obsidian-leaflet-plugin/issues/38) for reference.

##### Defined in Code Block

Use `commandMarker:` instead of `marker:`

##### Created on Map

Turning on the `Command Marker` toggle.

### Bulk Editing

As of version 3.9.0, a bulk-edit button has been added to the map. Clicking this button will open a modal allowing for easy editing of all the mutable markers defined on the map.

## Overlays

Overlays may be added to the map by <kbd>Shift</kbd>-right clicking, dragging the mouse to set the radius, and clicking again. Hitting <kbd>Escape</kbd> will cancel the drawing and remove the overlay. Overlays added to the map in this manner are saved to the map instance just like the markers, and will be recreated when the map is re-opened.

Additionally, overlays may be specified in the source block using the `overlay` parameter, as so:

`overlay: [<color>, [<lat>, <long>], <radius> <unit?>, <desc>]`

OR

```
overlay:
    - [<color>, [<lat>, <long>], <radius> <unit?>, <desc>]
    - [<color>, [<lat>, <long>], <radius> <unit?>, <desc>]
    ...
```

This will create a `<color>`-overlay circle centered at `<lat>, <long>`, with a radius `<radius>` in `<unit>`.

> **Please Note**
>
> Overlays are drawn _in the order they are specified_. If a smaller overlay is obscured by a larger one, the smaller one will not be interactable.

The `<color>` may be _any_ valid CSS color, including hexadecimals, `rgb()` and `hsl()`.

Please note that due to the YAML syntax, strings starting with `#` and entries with commas must be enclosed in quotes.

Examples:

````
```leaflet
overlay: [blue, [32, -89], 25 mi, 'This is my overlay!']
```
````

````
```leaflet
overlay:
  - ['rgb(255, 255, 0)', [32, -89], 25 km, 'This is also my overlay!']
  - ['#00FF00', [32, -89], 500 ft, 'This is a third overlay!']
```
````

### Editing the Overlay

Overlays drawn directly on the map may be edited. The radius and color may be changed, or the overlay removed, by right-clicking on the overlay.

### Overlays using Note frontmatter

Similarly to markers, overlays may be created from notes found using the `markerFile`, `markerFolder`, and `markerTag` parameters. The `filterTag` parameter may be used to filter what files are used based on their tags.

The plugin will scan the frontmatter of the notes and generate an overlay from a frontmatter `mapoverlay` parameter, defined using the same syntax as above.

### Overlay Tag

The overlay tag parameter can be used to auto-generate an overlay from a tag in a note's frontmatter.

Example:

````
```leaflet
overlayTag: nearby
```
````

Note frontmatter:

```
nearby: 50 km
```

### Overlay Color

The overlay color tag may be used to specify the default overlay color when drawing on the map or when using the overlay tag parameter.

## Image Overlays

Image overlays can be added to the map using the `imageOverlay` parameter in the code block.

This parameter uses the following syntax:

````
```leaflet
imageOverlay:
 - [ [[ImageFile|Optional Alias]], [Top Left Coordinates], [Bottom Right Coordinates] ]
 - [ [[ImageFile2|Optional Alias]], [Top Left Coordinates], [Bottom Right Coordinates] ]
 - ...
```
````

This will add an image overlay positioned between the two coordinate bounds. If the coordinate bounds are not provided, the overlay will:

1. On Image maps, overlay the entire image.
2. On Real maps, overlay the initial map view.

Image overlays can be toggled on or off using the layer control box in the top-right. Similarly to maps with multiple layers, if the optional alias is provided, the layer box will display the alias instead of the file name.

## GeoJSON

GeoJSON is a format used to describe geographic data structures, such as points, lines, and shapes. Please see [this](https://datatracker.ietf.org/doc/html/rfc7946) for a full reference of the GeoJSON format.

GeoJSON can be loaded into the map using the following syntax:

````
```leaflet
geojson: [[GeoJSON_File.json]]|optional-alias
```
````

or

````
```leaflet
geojson:
  - [[GeoJSON_File.json]]
  - [[GeoJSON_File_2.json]]|optional-alias|[[optional-note-wikilink]]
```
````

_Please note that GeoJSON is drawn in the order it is provided. If a smaller file overlaps a larger file, you may not be able to interact with it._

Especially large or a large number of GeoJSON files could slow down initial rendering.

### Linking to Notes

A GeoJSON file can link to a note by appending `|[[]]` to the end.

**Please note that the alias is required when linking to a note.**

### Styles and Color

The default color for GeoJSON features can be defined in the map's code block using the `geojsonColor` parameter. This color must be a valid CSS color.

Additionally, the map will attempt to read the style properties defined for the GeoJSON features to apply styles. Styles should be defined using the [MapBox SimpleStyle specification](https://github.com/mapbox/simplestyle-spec/tree/master/1.1.0).

### Tooltip

The map will attempt to read the title of the GeoJSON feature to display the tooltip when hovered. This title should be defined in the `title`, `description` or `name` field of the GeoJSON feature properties.

## GPX

GPX, or GPS eXchange, files can be added to the map using the `gpx` parameter similarly to how GeoJSON files are added to maps.

> Want to show your Apple Health workouts in Obsidian? Follow [these](https://support.apple.com/guide/iphone/share-health-and-fitness-data-iph27f6325b2/ios) steps, then add the exported GPX files to your vault and use them in a map!

````
```leaflet
gpx: [[GPX_File.gpx]]
```
````

or

````
```leaflet
gpx:
  - [[GPX_File.gpx]]
  - [[GPX_File 2.gpx]]
```
````

Especially large or a large number of GPX files could slow down rendering.

### GPX Markers

By default, the map will not show markers on the starting point, ending point or the defined waypoints. The map can be told to use marker types you have defined in settings using the `gpxMarkers` parameter:

````
```leaflet
gpx: [[GPX_File.gpx]]
gpxMarkers:
  start: start_marker_type
  waypoint: waypoint_marker_type
```
````

### GPX Data

GPX files are parsed for datapoints which can be displayed on the map as heatlines. Clicking on a GPX route will open a control box where these datapoints can be selected. Hovering over a point on the track will display information for that specific point.

Currently, the data parsed out of a GPX file is:

1. Cadence
2. Elevation
3. Heartrate
4. Speed

If any of these are missing from the file, it will not be an option.

## Objects Defined in the Code Block

Markers and overlays may be defined directly in the code block using the following syntax:

| Type    | Syntax                                                                                |
| ------- | ------------------------------------------------------------------------------------- |
| Marker  | `marker: <type*>,<latitude>,<longitude>,<link*>,<description*>,<minZoom*>,<maxZoom*>` |
| Overlay | `overlay: [<color*>, [<latitude, longitude>], <radius*>, <description*>]`             |

An arbitrary number of objects can be defined, but _none of these objects will be editable._ If a change needs to be made to these objects, the code block must be edited.

The marker link may be defined as an Obsidian wikilink.

> \*: These parameters are optional and can be left blank in the definition.
> For example, `marker: ,25,25,,,3` will use the default marker type, latitude and longitude 25, no link, no description, minZoom 3, no maxZoom.

**These will not be included in exported data.**

### Marker Files, Marker Folders, Marker Tags, and Markers from Links

These parameters allow you to create markers directly from the specified note files.

There is no limit to how many of these parameters you can have defined in the code block; all of the files found will be parsed for defined markers.

_Please note that until I implement some form of caching, having a large amount of marker files defined could impact performance._

#### Note Frontmatter

The `markerFile`, `markerFolder`, `markerTag`, `filterTag`, `linksTo`, and `linksFrom` parameters tell the plugin _where to look for notes_. The notes themselves determine how the markers are created, using note frontmatter tags.

All markers created from the note will automatically have their link set to the note.

| Frontmatter Tag | Use                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------- |
| location        | Create a marker at this location. Also used if the `coordinates` parameter points to this note. |
| mapmarker       | Use this marker type for the marker created using `location`. Optional.                         |
| mapzoom         | Marker created from this note will have its zoom breakpoint set to `[min, max]`. Optional.      |
| mapmarkers      | Array of markers to create. See below for syntax.                                               |
| mapoverlay      | Array of overlays to create. See below for syntax.                                              |

##### mapmarker

The `mapmarker` parameter can be used to define the _type_ of marker created. This can be one of two things:

1. The name given to the marker type in settings.
2. A definition defining the icon name, color, and whether or not to layer the icon on the default marker type.

Examples:

```
mapmarker: event    # A marker type named event has been created in settings.

# OR

mapmarker:
  icon: user        # Font Awesome icon name.
  color: 00ff00     # Hex color string. Optional.
  layer: false      # Whether or not to layer. Optional.
```

##### mapmarkers

The `mapmarkers` parameter can be used to define an arbitrary number of markers to display on the map. This does not require the `location` tag to be set.

A marker defined using `mapmarkers` should have the following syntax:

```
---
mapmarkers:
  - [<type>, [<latitude>, <longitude>], <optional description>, <optional minZoom>, <optional maxZoom>]
  - [<type>, [<latitude>, <longitude>], <optional description>, <optional minZoom>, <optional maxZoom>]
  - ...
---
```

##### mapoverlays

The `mapoverlay` parameter can be used to define an arbitrary number of overlays to display on the map. This does not require the `location` tag to be set.

A marker defined using `mapoverlay` should have the following syntax:

```
---
mapoverlay:
  - [<color>, [<latitude>, <longitude>], <radius> <unit?>, <optional description>]
  - [<color>, [<latitude>, <longitude>], <radius> <unit?>, <optional description>]
  - ...
---
```

As shown above, the radius of the overlay should be specified using `<radius> <unit>` (such as `100 miles`). If the `<unit>` is not provided, it will default to `meters`. Please see [this](src/utils/units.ts) for a list of supported units.

#### Marker File

Marker files may be defined in the code block using the following syntax:

`markerFile: [[WikiLinkToFile]]` **OR**
`markerFile: Direct/Path/To/Note`

#### Marker Folders

Marker folders may be defined in the code block using the following syntax:

`markerFolder: Direct/Path/To/Folder`

This will by default include notes from all subfolders. 

To limit the number of subfolders, append one '/' (Slash) to the path for each sub-folder-level to include.

#### Marker Tags

If you have the [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) installed, markers may also be created from tags using the following syntax:

`markerTag: <tag>, <tag>, ...`

**Please note: The plugin uses YAML to parse the code block, so tags defined with `#` \*will not work\* unless wrapped in quotes (`"#tag"`).**

Each `markerTag` parameter will return notes that have _all_ of the tags defined in that paramter. If you are looking for files containing _any_ tag listed, use separate `markerTag` parameters.

Example:

```
markerTag:
  - tag1
  - [tag2, tag3]
  - tag4
```

The above will parse:

1. Any note containing `tag1`.
2. Any notes containing _both_ `tag2` **and** `tag3`.
3. Any note containing `tag4`.

> Note: notes are only parsed once, even if a note matches multiple criteria.

#### Filter Tag

Returned files can be filtered using the `filterTag` parameter. This parameter uses the same syntax as `markerTag`, but instead of _adding_ files, it will require that each file found using `markerFile`, `markerFolder` or `markerTag` match a set of tags.

#### Links

The `linksTo` and `linksFrom` parameters uses DataView's link index to find notes linked to or from the notes specified in the parameter to build immutable markers, using the same syntax as above.

> Please note: Both `links` parameters require the [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) to be installed.

Multiple files can be specified using YAML array syntax:

```
linksTo: [[File]]
linksFrom:
    - [[File 1]]
    - [[File 2]]
```

#### Examples

```
markerFile: [[MarkerFile]]
```

would

1. Load the MarkerFile.md note file and, if it has the correct frontmatter fields, create a marker for it.

```
markerFile: [[MarkerFile]]
markerFolder: People and Locations
```

would

1. Load the MarkerFile.md note
2. Look through the People and Locations folder for additional notes

```
markerTag: #location, #friends
```

would

1. Find _all_ notes tagged with both `#location` **and** `#friends` and create markers using their frontmatter

```
markerFolder: People and Locations
markerFolder: Interests/Maps of the World
markerTag: #people, #friends
markerTag: #Paris
```

would search for notes that

1. Are in the folders People and Locations OR Interests/Maps of the World, AND
2. Contain both tags #people AND #friends OR the tag #Paris

## Distances

<kbd>Shift</kbd> or <kbd>Alt</kbd>-clicking the map or a marker, then <kbd>Shift</kbd> or <kbd>Alt</kbd>-clicking again, will display the distance between the two points.

Distances are displayed in meters, unless a scale factor and/or unit is specified in the map block.

A control box in the bottom-left corner of the map displays the last-calculated distance. Hovering on this will display the distance line on the map, and clicking on it will zoom the map to those coordinates.

## Dark Mode

The `darkMode` parameter will invert the colors of the map using CSS. This is done by applying a `.dark-mode` CSS class to the map tile layer, and the following CSS:

```css
.leaflet-container .dark-mode {
    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(
            0.3
        ) brightness(0.7);
}
```

Overriding this CSS in a custom snippet will allow for customization of the dark mode appearance. For a reference to the CSS `filter` property, please see [this article](https://developer.mozilla.org/en-US/docs/Web/CSS/filter).

## Settings

### Marker CSV Files

Marker data may be exportable to a CSV file. This data takes the following format:

| Column 1 | Column 2    | Column 3 | Column 4  | Column 5    | Column 6     | Column 7  |
| -------- | ----------- | -------- | --------- | ----------- | ------------ | --------- |
| Map ID   | Marker Type | Latitude | Longitude | Marker Link | Marker Layer | Marker ID |

If left blank, Marker Type will default to "default".

Marker layer may be kept blank if a map only has 1 layer.

For new markers, Marker ID may be kept blank.

Marker data in this format can then be re-imported. This feature is still under development and may not work as expected.

### Default Marker Tooltip Behavior

Setting this will cause marker tooltips to default to this behavior.

You can override this behavior in the right-click context menu of a marker.

### Enable Draw Mode by Default

If disabled, the draw controller will not be added to the map unless the `draw` parameter is set to true in the map block.

### Display Note Preview

Use Obsidian's note preview when hovering a linked marker.

**Please note, the Obsidian Page preview core plugin must be enabled to use this feature.**

### Display Overlay Tooltip

If disabled, overlay tooltips will not be displayed by default. This can be changed on a per-overlay basis inside the overlay context menu.

It is not currently possible to change this setting on immutable overlay.

### Copy Coordinates on Shift-Click

Turning this setting on will copy the latitude and longitude coordinates to the clipboard when <kbd>Ctrl</kbd> + <kbd>Shift</kbd>-clicking anywhere on the map.

### Latitude and Longitude

A real-world map will open to this default latitude and longitude if not provided.

### Default Map Marker

The default marker setting allows you to define a marker that other markers can be layered on top of. If no additional markers have been added, right clicking on the map will place this marker.

#### Marker Icon

The [Font Awesome Free](https://fontawesome.com/icons?d=gallery&p=2&s=solid&m=free) icon name to use.

#### Marker Color

Color selector for the marker color.

#### Layer Base Marker

Additional markers will be layered on top of this marker by default. This setting can be overridden on specific additional markers.

### Additional Markers

Additional marker types can be added, selectable from a context menu on the map.

#### Creating an additional marker

Adding a new marker displays a new window, where the new marker parameters can be added.

| Parameter       | Description                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Marker Name     | Displayed in the context menu when adding a marker (e.g., Location, Event, Person)                   |
| Marker Icon     | The [Font Awesome Free](https://fontawesome.com/icons?d=gallery&p=2&s=solid&m=free) icon name to use |
| Upload Image    | Upload a custom image to use for the marker icon instead of using a Font Awesome icon                |
| Layer Icon      | Layer this icon on top of the base marker. If off, the icon itself will be used.                     |
| Icon Color      | Override the default icon color                                                                      |
| Associated Tags | Immutable markers will use this marker type if the file has this tag _and `mapmarker` is not set_.   |

If layer icon is on, the icon be moved around the base icon by clicking and dragging, to customize where the icon is layered. If <kbd>Shift</kbd> is held while moving the icon, it will snap to the midlines.

#### Creating local marker types

New markers can also be defined in a `markers.json` file. These marker types will be available to any notes in the same directory as the json file. The json file should contain an array of Icon objects, See the [Icon interface](https://github.com/javalent/obsidian-leaflet/blob/1fa4c237deceff1def883872fdad3822f9bff560/types/saved.d.ts#L7) for details.

#### Using an Image as a Marker Icon

When creating an additional marker, an image may be uploaded to use as the marker icon instead of selecting a Font Awesome icon.

Click the "Upload Image" button and select the image to use. The plugin will load the image and scale it to `24px x 24px`. The image used for the marker cannot be edited once it has been uploaded.

If an image has been uploaded, selecting a Font Awesome icon will remove the image.

#### Associated Tags

Associate a tag with a marker type.

If a note is found using `markerFile`, `markerFolder`, or `markerTag`, the plugin will first use the frontmatter `mapmarker` parameter to determine marker type. If that is not set, it will then use the note's tags to find a marker type associated with one of the tags.

The tags are searched in order of definition on the marker type.

# Initiative Tracker Plugin Integration

If the [Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) plugin is installed, a battlemap can be opened from the Initiative Tracker view.

This battlemap will pre-load any active creatures in the loaded combat as markers. Default marker types can be set for both PCs and NPCs, and you can further set which marker type each individual creature will use.

The battlemap will sync its state to the Initiative Tracker combat - as creatures are added, removed, etc, their state will update on the map.

# Version History

See [the changelog](https://github.com/valentine195/obsidian-leaflet-plugin/blob/master/CHANGELOG.md).

# Installation

## From within Obsidian

From Obsidian v0.9.8, you can activate this plugin within Obsidian by doing the following:

-   Open Settings > Third-party plugin
-   Make sure Safe mode is **off**
-   Click Browse community plugins
-   Search for this plugin
-   Click Install
-   Once installed, close the community plugins window and activate the newly installed plugin

## From GitHub

-   Download the Latest Release from the Releases section of the GitHub Repository
-   Extract the plugin folder from the zip to your vault's plugins folder: `<vault>/.obsidian/plugins/`
    Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
-   Reload Obsidian
-   If prompted about Safe Mode, you can disable safe mode and enable the plugin.
    Otherwise head to Settings, third-party plugins, make sure safe mode is off and
    enable the plugin from there.

### Updates

You can follow the same procedure to update the plugin

# Warning

This plugin comes with no guarantee of stability and bugs may delete data.
Please ensure you have automated backups.

# TTRPG plugins

If you're using Obsidian to run/plan a TTRPG, you may find my other plugin useful:

-   [5e Statblocks](https://github.com/valentine195/obsidian-5e-statblocks/) - Create 5e-styled statblocks inside notes
-   [Dice Roller](https://github.com/valentine195/obsidian-dice-roller) - Roll & re-roll dice in notes
-   [Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) - Initiative Tracker view in Obsidian

<a href="https://www.buymeacoffee.com/valentine195"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"></a>
