
# Folder-parameters in leaflet

## `geojsonFolder`
The `geojsonFolder` Tag allows to specify one or more Folders to contain *.geojson or *.json Files to be rendered into the current map.

## `markerFolder` 
Similarly, the `markerFolder` Tag allows to specify one or more Folders to contain *.md Files with `location` and `mapmarker` Tags in their YAML FrontMatter to be displayed as Markers in the Map. 

Both Folder Paths can start with a 
- '/' (Slash) based on the Vault Directory or
- './' relative to the current *.md Document 

By default only Files directly in the Folder are added. 
This prevents loading too many files, which can bring the application to a halt. 

To include Files from Subfolders, append one '/' (Slash) for each Folder-Level. 

## Code Block Example
````yaml
```leaflet
zoomFeatures: true 
minZoom: 2 
maxZoom: 18
geojsonFolder: ./Germany~East/
markerFolder: ./Germany~East/City
```
````

This renders both...
- *.geojson Files from the Germany~East Folder and its direct Subfolders and
- Markers for the Cities.md Files in the Germany~East/City Folder 

The Result looks like this: 
![./images/Germany~East.png] 

(Find the full example [here](https://github.com/SpocWiki/_public/blob/main/geo/Continent/Europe/Germany/Germany~East.md))

