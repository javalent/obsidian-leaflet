# Obsidian Leaflet

Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

<img src="https://raw.githubusercontent.com/valentine195/obsidian-leaflet-plugin/master/images/7d595a3db9bf0eff9f2a2150819d2bd6956ddcd8.gif">

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
```
````

## Options

| Option      | Description                                                                                                                         | Default                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| id          | Unique identifier (can be anything). Required on multi-image maps or if the same image is used in a different map in the same file. |                                            |
| image       | Direct URL/file path to an image file to be used as the map layer.                                                                  | OpenStreetMap map                          |
| lat         | Default latitude to display when rendering.                                                                                         | 50% (image) / 39.983334 (open street map)  |
| long        | Default longitude to display when rendering.                                                                                        | 50% (image) / -82.983330 (open street map) |
| height      | Height of the map element. Can be provided in pixels or percentage of window height.                                                | 500px                                      |
| minZoom     | Minimum allowable zoom level of the map.                                                                                            | 1                                          |
| maxZoom     | Maximum allowable zoom level of the map.                                                                                            | 10                                         |
| defaultZoom | Map will load zoomed to this level.                                                                                                 | 5                                          |
| zoomDelta   | Zoom level will change by this amount when zooming.                                                                                 |
| 1           |
| unit        | Unit to display distances in                                                                                                        | meters                                     |
| scale       | Scale factor for image map distance calculation.                                                                                    | 1                                          |

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

Once a marker has been created, it can be dragged to a different location. A marker can also point to a note; right-click on it, and a popup will appear. The target can be entered as the name of the note. Additionally, headers or blocks within a note can be the target of a marker:

`Note`

`Note#Header1`

If you have multiple notes with the same name, you should specify the direct path to the note. Otherwise, the map may not open the one you expect.

Once linked, a click will open the note (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-click to open in new window).

Additionally, markers can be created by dragging a note from the file tree and dropping it on the map.

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

- [Dice Roller](https://github.com/valentine195/obsidian-dice-roller) - Roll & re-roll dice in notes
