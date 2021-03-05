## Obsidian Leaflet 
Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

Proof of concept currently. May not work as expected. Currently only tested on Windows.

## Working with the plugin & example

A map can be created with a ```leaflet``` code block. For example:

````markdown
```leaflet
image: https://i.imgur.com/jH8j3mJ.jpg
height: 500px
```
````

### Markers
New markers can be added to the map by right clicking.

If any additional marker types have been created in the settings, a list will appear to choose from.

Once a marker has been created, it can be dragged to a different location. A marker can also point to a note; right-click on it, and a popup will appear. Enter the note as:
```Path/To/Note.md```. Once linked, a click will open the note (ctrl-click to open in new window).

Additionally, markers can be created by dragging a note from the file tree and dropping it on the map.

### API

Currently only two parameters exist.

```
image: Direct URL to an image file to be used as the map layer. **Required** 
height: Height in pixels of the map element. Defaults to 500px.
```