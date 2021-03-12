## Obsidian Leaflet

Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

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
```
````

### Options

| Option      | Description                                                       | Default                           |
| ----------- | ----------------------------------------------------------------- | --------------------------------- |
| image*      | Direct URL/file path to an image file to be used as the map layer | OpenStreetMap map                 |
| lat*        | Default latitude to display when rendering                        | 50% (image) / 0 (open street map) |
| long*       | Default longitude to display when rendering                       | 50% (image) / 0 (open street map) |
| height      | Height in pixels of the map element                               | 500px                             |
| minZoom     | Minimum allowable zoom level of the map                           | 1                                 |
| maxZoom     | Maximum allowable zoom level of the map                           | 10                                |
| defaultZoom | Map will load zoomed to this level                                | 5                                 |
| zoomDelta   | Zoom level will change by this amount when zooming                | 1                                 |

#### Image Map URL / file path

Image maps can be loaded one of three ways:

1. Direct URL (e.g., https://i.imgur.com/jH8j3mJ.jpg)
2. Obsidian URL (e.g., obsidian://open?vault=VaultName&file=Path/To/Image.jpg)
3. Direct path to image (e.g., Path/To/Image.jpg)

#### Latitude and Longtitude of Image Maps

Because an image map does not have a true coordinate system, the latitude and longitude provided must be given as a percentage from the **top left corner of the image**.


### Markers

New markers can be added to the map by right clicking.

If any additional marker types have been created in the settings, a list will appear to choose from.

Once a marker has been created, it can be dragged to a different location. A marker can also point to a note; right-click on it, and a popup will appear. Enter the note as:
`Path/To/Note.md` (case-sensitive). Once linked, a click will open the note (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-click to open in new window).

Additionally, markers can be created by dragging a note from the file tree and dropping it on the map.

## Installation

### From within Obsidian
From Obsidian v0.9.8, you can activate this plugin within Obsidian by doing the following:
- Open Settings > Third-party plugin
- Make sure Safe mode is **off**
- Click Browse community plugins
- Search for this plugin
- Click Install
- Once installed, close the community plugins window and activate the newly installed plugin
#### Updates
You can follow the same procedure to update the plugin

### From GitHub
- Download the Latest Release from the Releases section of the GitHub Repository
- Extract the plugin folder from the zip to your vault's plugins folder: `<vault>/.obsidian/plugins/`  
Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
- Reload Obsidian
- If prompted about Safe Mode, you can disable safe mode and enable the plugin.
Otherwise head to Settings, third-party plugins, make sure safe mode is off and
enable the plugin from there.

## Configuration

### Base Marker

The base marker setting allows you to define a marker that other markers can be layered on top of. If no additional markers have been added, right clicking on the map will place this marker.

### Additional Markers

Additional marker types can be added, selectable from a context menu on the map.

#### Creating an additional marker

Adding a new marker displays a new window, where the new marker parameters can be added.

| Paramter    | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| Marker Name | Displayed in the context menu when adding a marker (e.g., Location, Event, Person) |
| Marker Icon | Name of the Font Awesome icon to use                                               |
| Layer Icon  | Layer this icon on top of the base marker. If off, the icon itself will be used.   |
| Icon Color  | Override the default icon color                                                    |

If layer icon is on, the icon be moved around the base icon by clicking and dragging, to customize where the icon is layered. If the <kbd>Shift</kbd> is held while moving the icon, it will snap to the midlines.

## Warning

This plugin comes with no guarantee of stability and bugs may delete data.
Please ensure you have automated backups.
