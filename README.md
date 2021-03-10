## Obsidian Leaflet

Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

Proof of concept currently. May not work as expected. Currently only tested on Windows & Mac.

## Working with the plugin & example

A map can be created with a `leaflet` code block. For example:

````markdown
```leaflet
image: https://i.imgur.com/jH8j3mJ.jpg
height: 500px
```
````

### API

Currently only two parameters exist.

```
image: Direct URL to an image file to be used as the map layer. **Required**
height: Height in pixels of the map element. Defaults to 500px.
```

### Markers

New markers can be added to the map by right clicking.

If any additional marker types have been created in the settings, a list will appear to choose from.

Once a marker has been created, it can be dragged to a different location. A marker can also point to a note; right-click on it, and a popup will appear. Enter the note as:
`Path/To/Note.md`. Once linked, a click will open the note (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>-click to open in new window).

Additionally, markers can be created by dragging a note from the file tree and dropping it on the map.

## Installation

The plugin is not currently part of the community plugin list. To install, copy the files from the lastest release to your plugins folder.

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
