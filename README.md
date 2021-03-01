## Obsidian Leaflet 
Adds interactable mapping functionality to Obsidian.md, using [Leaflet.js](https://leafletjs.com/)

Proof of concept currently. May not work as expected.

## Working with the plugin & example

A map can be created with a ```leaflet``` code block. For example:

````markdown
```leaflet
image: https://i.imgur.com/jH8j3mJ.jpg
height: 500px
```
````

Markers can be added to the map by right clicking. Currently they are not interactable beyond dragging.

### API

Currently only two parameters exist.

```
image: Direct URL to an image file to be used as the map layer. **Required** 
height: Height in pixels of the map element. Defaults to 500px.
```