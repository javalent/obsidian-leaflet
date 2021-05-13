# Version History

## 3.8.2

- Improved code structure
- removed requirement to shift-click to start distance drawing
- removed Notice of distance calculation
- added control box in bottom-left corner that displays previously measured distance
  - hovering the control box displays the previous distance line
  - clicking the control box pans the map to fit the line
- reduced number of decimals for distance display to 1
- moved distance line tooltip to mouse cursor position
- distance line tooltip is now always on top (no longer bounces around)
## 3.8.0
- Added fullscreen map button
- Distance line now correctly snaps to markers
- Fixed some issues related to escaping from the distance line

## 3.7.0
- Removed some unnecessary map events
- Removed requirement for `scale` parameter on real world maps. Supplying a unit will try to auto-convert.
- Added `distanceMultiplier` parameter that will display an additional, multiplied distance value when calculating distance
- Fixed issue where clicking on the map without a modifier key was displaying click coordinates
- added distance line display to map, from original click -> mouse cursor, with real-time distance tooltip
- distances are now displayed according to user's locale
- distance lines can be aborted by pressing <kbd>Escape</kbd>
## 3.6.0
- Marker tooltips are now fully interactable (copy/paste, click)
- Added ability to shift/alt click on map to display coordinates
- Added setting toggle to copy location to clipboard on shift/alt click

## 3.5.0
- Added ability to <kbd>Shift</kbd>-click to display marker coordinates along with existing <kbd>Alt</kbd>-click functionality
- Changed distance feature to use <kbd>Shift</kbd> or <kbd>Alt</kbd> instead of <kbd>Ctrl</kbd>
- Added ability to calculate distances using markers

## 3.4.0
- Added explicit `commandMarker` and Command Marker toggles
  - These are **required** if the marker is to execute a command
## 3.3.0
- Marker links may now be Obsidian commands
## 3.2.0
- Added <kbd>Alt<kbd>-click on marker to reveal coordinates
## 3.1.0
- Changed from `marker` to `mapmarker` for frontmatter tag
  - `marker` will continue to work for a few releases
  - Added change notice warning
- Added `markerTag` parameter
  - requires Dataview plugin
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