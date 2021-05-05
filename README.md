# Obsidian Leaflet

Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/7d595a3db9bf0eff9f2a2150819d2bd6956ddcd8.gif">

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/275ff1f560bb6dec0d4fc02b267a7f63860f20c9_2_690x262.jpeg">

Proof of concept currently. May not work as expected. Currently only tested on Windows & Mac.

## Working with the plugin & example

A map can be created with a `leaflet` code block. For example:

````markdown
```leaflet
image: https://i.imgur.com/jH8j3mJ.jpg
height: 500px
lat: 50
long: 50
height: 500px
minZoom: 1
maxZoom: 10
defaultZoom: 5
unit: meters
scale: 1
marker: <type>,<latitude>,<longitude>,<link>
```
````

## Options

| Option       | Description                                                                          | Default                                    |
| ------------ | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| id           | Unique identifier (can be anything). **Required.**                                   |                                            |
| image        | Direct URL/file path to an image file to be used as the map layer.                   | OpenStreetMap map                          |
| lat          | Default latitude to display when rendering.                                          | 50% (image) / 39.983334 (open street map)  |
| long         | Default longitude to display when rendering.                                         | 50% (image) / -82.983330 (open street map) |
| height       | Height of the map element. Can be provided in pixels or percentage of window height. | 500px                                      |
| minZoom      | Minimum allowable zoom level of the map.                                             | 1                                          |
| maxZoom      | Maximum allowable zoom level of the map.                                             | 10                                         |
| defaultZoom  | Map will load zoomed to this level.                                                  | 5                                          |
| zoomDelta    | Zoom level will change by this amount when zooming.                                  |
| 1            |
| unit         | Unit to display distances in                                                         | meters                                     |
| scale        | Scale factor for image map distance calculation.                                     | 1                                          |
| marker       | Create immutable markers on the map                                                  |                                            |
| markerFile   | Create immutable marker from a note's frontmatter                                    |                                            |
| markerFolder | Create immutable markers from _all_ of the notes in a given folder                   |                                            |

## Map IDs

As of **3.0.0**, map ids are required. If a note with a old map block is opened, the plugin will warn you that the map now requires an ID.

Once an old map is given an ID, the plugin will try to associate the marker data with the new map.

The first time you open the plugin after updating to 3.0.0, a backup of your marker data will be created in case you need to downgrade. If you run into issues, please create an issue on Github.

## Image Maps

### Image Map URL / file path

Image maps can be loaded one of three ways:

1. Direct URL (e.g., https://i.imgur.com/jH8j3mJ.jpg)
2. Obsidian URL (e.g., obsidian://open?vault=VaultName&file=Path/To/Image.jpg)
3. Direct path to image (e.g., Path/To/Image.jpg)

### Multi-Image Maps

Images can be layered on top of each other by providing multiple images to the plugin:

````markdown
```leaflet
id: Map With Layered Images
image: Image1.jpg
image: Image2.jpg
image: Image3.jpg
```
````

This will generate a map with 3 layers. Image 1 will be on top, Image 2 in the middle, and Image 3 on bottom. The images will be aligned around their center points.

The control box in the top right of the map will allow you to change layers.

Markers can be created and saved on each layer separately from one another.

**If multiple images are provided, an ID _must_ be given to the map, or the map will only display the first provided image.**

### Latitude and Longtitude of Image Maps

Because an image map does not have a true coordinate system, the latitude and longitude provided must be given as a percentage from the **top left corner of the image**.

This setting may seem to not do anything without changing the default zoom level of the map.

### Unit and Scale

If provided, the plugin will scale the calculated distance between two points by `scale` and display the result as `xxx unit`.

## Markers

New markers can be added to the map by right clicking.

If any additional marker types have been created in the settings, a list will appear to choose from.

Once a marker has been created, it can be dragged to a different location.

Markers created on the map will be saved to the map instance. Marker data saved this way will persist as long as the map is associated with a note - if the map blocks are removed from notes, or if all of the notes containing map blocks are removed, **the data associated with it will be deleted after 7 days.**

### Marker Coordinates

<kbd>Alt</kbd>-clicking on a marker will reveal its coordinates.

### Marker Links

A marker can also point to a note; right-click on it, and a popup will appear. The target can be entered as the name of the note. Additionally, headers or blocks within a note can be the target of a marker:

`Note`

`Note#Header1`

If you have multiple notes with the same name, you should specify the direct path to the note. Otherwise, the map may not open the one you expect.

Once linked, a click will open the note (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-click to open in new window).

Additionally, markers can be created by dragging a note from the file tree and dropping it on the map.

Marker links can also be set to external websites. Clicking the marker will open the website.

#### Obsidian Commands as Links

Markers links can also be set to a defined Obsidian command from the command palette. This must be the full name of the command as it appears in the palette.

Setting a marker link to a command will execute the command when the marker is clicked.

### Markers Defined in the Code Block

Markers may be defined directly in the code block using the following syntax:

`marker: <type>,<latitude>,<longitude>,<link>`

An arbitrary number of markers can be defined, but _none of these markers will be editable._ If a change needs to be made to these markers, the code block must be edited.

The marker link may be defined as an Obsidian wikilink.

These markers **will not be included in exported marker data.**

### Marker Files, Marker Folders and Marker Tags

These parameters allow you to create markers directly from a list of markdown note files.

A note specified in this manner should have the following frontmatter tags:
`location: [lat, long]` **REQUIRED**
`mapmarker: <marker-type>` **OPTIONAL**

There is no limit to how many of these parameters you can have defined in the code block; all of the files found will be parsed for defined markers.

_Please note that until I can utilize some form of caching, having a large amount of marker files defined could impact performance._

#### Marker File

Marker files may be defined in the code block using the following syntax:

`markerFile: [[WikiLinkToFile]]` **OR**
`markerFile: Direct/Path/To/Note`

#### Marker Folders

Marker folders may be defined in the code block using the following syntax:

`markerFolder: Direct/Path/To/Folder`

This will search through _all_ of the notes in the specified folder, even in sub folders.

#### Marker Tags

If you have the [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) installed, markers may also be created from tags using the following syntax:

`markerTag: #<tag>, #<tag>, ...`

Each `markerTag` parameter will return notes that have _all_ of the tags defined in that paramter. If you are looking for files containing _any_ tag listed, use separate `markerTag` parameters.

If one or more `markerFolder` parameters are specified, the `markerTag` parameter will only look for notes _in the folders that contain the tags_.

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
markerTags: #people, #friends
markerTags: #Paris
```

would search for notes that

1. Are in the folders People and Locations OR Interests/Maps of the World, AND
2. Contain both tags #people AND #friends OR the tag #Paris

### Marker CSV File

Marker data may be exportable to a CSV file. This data takes the following format:

| Column 1 | Column 2    | Column 3 | Column 4  | Column 5    | Column 6     | Column 7  |
| -------- | ----------- | -------- | --------- | ----------- | ------------ | --------- |
| Map ID   | Marker Type | Latitude | Longitude | Marker Link | Marker Layer | Marker ID |

Map ID is the _path to the note_ **plus** _"real" for real maps_ **OR** _the path to the image_ **OR** _the map id defined in the code block_. Example:

`Path/To/Note.md/Path/To/File.jpg` OR
`Path/To/Note.md/real` OR
`Path/To/Note.md/map-id-defined-in-code-block`

If left blank, Marker Type will default to "default".

Marker layer may be kept blank if a map only has 1 layer.

For new markers, Marker ID may be kept blank.

Marker data in this format can then be re-imported. This feature is still under development and may not work as expected.

## Distances

<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-clicking the map, then <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-clicking again, will display the distance between the two points.

Real-world map distances are displayed in meters.

Image maps can have an optional unit and scaling factor provided to display.

## Configuration

### Note Preview

Use Obsidian's note preview when hovering a linked marker.

**Please note, the Obsidian Page preview core plugin must be enabled to use this feature.**

### Latitude and Longitude

A real-world map will open to this default latitude and longitude if not provided.

### Base Marker

The base marker setting allows you to define a marker that other markers can be layered on top of. If no additional markers have been added, right clicking on the map will place this marker.

### Additional Markers

Additional marker types can be added, selectable from a context menu on the map.

#### Creating an additional marker

Adding a new marker displays a new window, where the new marker parameters can be added.

| Parameter   | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| Marker Name | Displayed in the context menu when adding a marker (e.g., Location, Event, Person) |
| Marker Icon | Name of the Font Awesome icon to use                                               |
| Layer Icon  | Layer this icon on top of the base marker. If off, the icon itself will be used.   |
| Icon Color  | Override the default icon color                                                    |

If layer icon is on, the icon be moved around the base icon by clicking and dragging, to customize where the icon is layered. If <kbd>Shift</kbd> is held while moving the icon, it will snap to the midlines.

# Version History

## 3.0.0

### New Features

-   Map IDs are now required.
    -   A map that does not have an id will **not render**
    -   The plugin will try to load previously defined marker data once an id has been given to the map.
    -   This means marker definitions are no longer tied to maps - giving a map on a different note the same ID will load the same marker data
-   Marker data that is not associated with a file will now be deleted after 7 days to prevent data accumulation
-   Map data is now only saved if the map has defined markers
-   Image files can now be linked using an Obsidian wikilink (e.g., [[Image Name.jpg]])
-   New `markerFile` and `markerFolder` parameters in maps
    -   `markerFile` will read a note file's frontmatter and create a marker based on the `marker` and `location` tags
        -   `marker` should be a defined marker type (will default to `default` if not provided)
        -   `location` should be a array of [latitude, longitude]. **If not provided, the marker will not be created**
        -   The marker link target will be set to the file
    -   `markerFolder` will read _all_ of the files in the folder, and try to parse the frontmatter as above.
-   Made display of marker link in tooltip consistent with Obsidian's display style
-   Added data attributes to marker HTML element
    -   data-type: marker type
    -   data-link: marker link target, if any
    -   data-mutable: whether marker data can be edited
    -   data-type: marker type name (such as default)
-   Switched from uuid to 6 digit nanoid
-   Rendering improvements

### Bug Fixes

-   Fixed issue where a new marker type's Layer Icon setting was not respecting the default layer marker setting
-   Fixed issue where clicking a marker could open the context menu
-   Fixed issue where clicking a marker without a link could cause an error
-   Fixed issue with opening a marker link defined with alt-text
-   Fixed issue where resizing the leaf containing a map caused it to calculate marker positions incorrectly
-   Fixed issue where having the same map open in multiple windows was not adding markers correctly
-   Fixed issue where dragging a marker created on a map open in multiple views would not drag correctly on other maps
-   Fixed issue where turning the plugin off would leave map tiles in random locations on open notes
-   Fixed issue where showing the note preview of a note with a map that is already open in the workspace would cause the map to be disassociated

## 2.1.0

-   Added marker parameter in code block
-   Fixed issue where importing a CSV file that changed a marker on an open map failed to update the marker information

## 2.0.0

-   Added ability to export marker data to a CSV file
-   Added ability to import marker data from a CSV file
-   Added Obsidian-like file chooser to marker link path

## 1.3.0

-   Removed requirement for file path in marker target
-   Added ability to target blocks in marker target

## 1.2.0

-   Add rudimentary distance calculation between two points on the map
-   Fixed issue where opening the same map in multiple leaves could cause one map to de-render

## 1.1.0

-   Maps now recalculate their sizing when the window is resized

## 1.0.0

-   Switch to proper semantic versioning
-   Added Note Preview setting
    -   This setting displays the Obsidian page preview when you hover over a linked marker
-   Map height can now be in provided as a percentage

## 0.3.1

-   Added image map layers
    -   It is now possible to have an arbitrary number of image maps layered on top of each other by supplying multiple images to the code block
    -   Markers created on a specific layer are only displayed when that layer is active
    -   Navigation between layers is done using the layer control box in the top right

## 0.2.2

-   Added real-world maps
-   Added latitude and longitude options
-   Added zoom delta option
-   Added tooltip display on markers that link to notes
-   Bug fixes

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

-   [Dice Roller](https://github.com/valentine195/obsidian-dice-roller) - Roll & re-roll dice in notes
