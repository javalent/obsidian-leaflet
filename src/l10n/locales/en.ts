export default {
    //main.ts
    "Loading Obsidian Leaflet v%1": "Loading Obsidian Leaflet v%1", //version number
    "Open Leaflet Map": "Open Leaflet Map",
    "Unloading Obsidian Leaflet": "Unloading Obsidian Leaflet",
    "Obsidian Leaflet maps must have an ID.":
        "Obsidian Leaflet maps must have an ID.",
    "ID required": "ID required",
    "There was an error saving into the configured directory.":
        "There was an error saving into the configured directory.",

    //renderer.ts
    "Could not parse GeoJSON file": "Could not parse GeoJSON file",
    "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`.":
        "Could not parse overlay radius. Please make sure it is in the format `<length> <unit>`.",
    "There was an error with the provided latitude and longitude. Using defaults.":
        "There was an error with the provided latitude and longitude. Using defaults.",

    //loader.ts
    "There was an issue getting the image dimensions.":
        "There was an issue getting the image dimensions.",

    //watcher.ts
    "There was an error updating the marker for %1.":
        "There was an error updating the marker for %1.", //file name
    "There was an error updating the marker type for %1.":
        "There was an error updating the marker type for %1.", //file name
    "There was an error updating the markers for %1.":
        "There was an error updating the markers for %1.", //file name

    //utils.ts
    "Coordinates copied to clipboard.": "Coordinates copied to clipboard.",
    "There was an error trying to copy coordinates to clipboard.":
        "There was an error trying to copy coordinates to clipboard.",
    "There was an error rendering the map":
        "There was an error rendering the map",
    "Unparseable height provided.": "Unparseable height provided.",
    "There was a problem with the provided height. Using 500px.":
        "There was a problem with the provided height. Using 500px.",
    "Could not parse latitude": "Could not parse latitude",
    "Could not parse longitude": "Could not parse longitude",
    "No data for marker %1.": "No data for marker %1.", //marker code block definition
    "The `%1` field%2 can only be used with the Dataview plugin installed.":
        "The `%1` field%2 can only be used with the Dataview plugin installed.", //parameter name, plural
    "Could not parse location in %1": "Could not parse location in %1", //file name
    "Could not parse map overlay length in %1. Please ensure it is in the format: <distance> <unit>":
        "Could not parse map overlay length in %1. Please ensure it is in the format: <distance> <unit>", //file name
    "%1 overlay": "%1 overlay", //file name
    "Could not parse %1 in %2. Please ensure it is in the format: <distance> <unit>":
        "Could not parse %1 in %2. Please ensure it is in the format: <distance> <unit>", //overlayTag, file name

    //units.ts
    meters: "meters",
    petameters: "petameters",
    terameters: "terameters",
    gigameters: "gigameters",
    megameters: "megameters",
    kilometers: "kilometers",
    hectometers: "hectometers",
    decameters: "decameters",
    decimeters: "decimeters",
    centimeters: "centimeters",
    millimeters: "millimeters",
    micrometers: "micrometers",
    nanometers: "nanometers",
    picometers: "picometers",
    femtometers: "femtometers",
    feet: "feet",
    inches: "inches",
    yards: "yards",
    miles: "miles",
    "nautical miles": "nautical miles",

    //settings.ts
    "Obsidian Leaflet Settings": "Obsidian Leaflet Settings",
    "Default Map Marker": "Default Map Marker",
    "This marker is always available.": "This marker is always available.",
    "Icon Name": "Icon Name",
    "A default marker must be defined.": "A default marker must be defined",
    "The selected icon does not exist in Font Awesome Free.":
        "The selected icon does not exist in Font Awesome Free.",
    "Upload Image": "Upload Image",
    "Marker Color": "Marker Color",
    "Layer Base Marker": "Layer Base Marker",
    "Use as base layer for additional markers by default.":
        "Use as base layer for additional markers by default.",
    "Additional Map Markers": "Additional Map Markers",
    "Add Additional": "Add Additional",
    "These markers will be available in the right-click menu on the map.":
        "These markers will be available in the right-click menu on the map.",
    "Default Latitude": "Default Latitude",
    "Real-world maps will open to this latitude if not specified.":
        "Real-world maps will open to this latitude if not specified.",
    "Latitude must be a number.": "Latitude must be a number.",
    "Default Longitude": "Default Longitude",
    "Real-world maps will open to this longitude if not specified.":
        "Real-world maps will open to this longitude if not specified.",
    "Longitude must be a number.": "Longitude must be a number.",
    "Reset to Default": "Reset to Default",
    "Please back up your data before changing this setting.":
        "Please back up your data before changing this setting.",
    "Current directory": "Current directory",
    "Default Config Directory": "Default Config Directory",
    "Default Marker Tooltip Behavior": "Default Marker Tooltip Behavior",
    "New markers will be created to this setting by default. Can be overridden per-marker.":
        "New markers will be created to this setting by default. Can be overridden per-marker.",
    Always: "Always",
    Hover: "Hover",
    Never: "Never",
    "Display Note Preview": "Display Note Preview",
    "Markers linked to notes will show a note preview when hovered.":
        "Markers linked to notes will show a note preview when hovered.",
    "Display Overlay Tooltips": "Display Overlay Tooltips",
    "Overlay tooltips will display when hovered.":
        "Overlay tooltips will display when hovered.",
    "Copy Coordinates on Shift-Click": "Copy Coordinates on Shift-Click",
    "Map coordinates will be copied to the clipboard when shift-clicking.":
        "Map coordinates will be copied to the clipboard when shift-clicking.",
    "This setting is experimental and could cause marker data issues. Use at your own risk.":
        "This setting is experimental and could cause marker data issues. Use at your own risk.",
    "Import Marker CSV File": "Import Marker CSV File",
    "Choose File": "Choose File",
    "Upload CSV File": "Upload CSV File",
    "Map not specified for line %1": "Map not specified for line %1", //line number in csv
    "Could not parse latitude for line %1":
        "Could not parse latitude for line %1", //line number in csv
    "Could not parse longitude for line %1":
        "Could not parse longitude for line %1", //line number in csv
    "Marker file successfully imported.": "Marker file successfully imported.",
    "There was an error while importing %1":
        "There was an error while importing %1", //csv file name
    "Export Marker Data": "Export Marker Data",
    "Export all marker data to a CSV file.":
        "Export all marker data to a CSV file.",
    Export: "Export",
    "Enable Draw Mode by Default": "Enable Draw Mode by Default",
    "The draw control will be added to maps by default. Can be overridden with the draw map block parameter.":
        "The draw control will be added to maps by default. Can be overridden with the draw map block parameter.",
    "Default Units": "Default Units",
    "Select the default system of units for the map.":
        "Select the default system of units for the map.",
    "Default Tile Server": "Default Tile Server",
    "It is up to you to ensure you have proper access to this tile server.":
        "It is up to you to ensure you have proper access to this tile server.",
    "Default Tile Server Attribution": "Default Tile Server Attribution",
    "Please ensure your attribution meets all requirements set by the tile server.":
        "Please ensure your attribution meets all requirements set by the tile server.",
    "Default Tile Server (Dark Mode)": "Default Tile Server (Dark Mode)",

    Imperial: "Imperial",
    Metric: "Metric",
    "Only display when zooming out above this zoom.":
        "Only display when zooming out above this zoom.",
    "Only display when zooming in below this zoom.":
        "Only display when zooming in below this zoom.",

    //modals/settings.ts
    "Marker Name": "Marker Name",
    "Marker name already exists.": "Marker name already exists.",
    "Marker name cannot be empty.": "Marker name cannot be empty.",
    "Font Awesome icon name (e.g. map-marker).":
        "Font Awesome icon name (e.g. map-marker).",
    "Use Image for Icon": "Use Image for Icon",
    "Layer Icon": "Layer Icon",
    "The icon will be layered on the base icon.":
        "The icon will be layered on the base icon.",
    "Override default icon color.": "Override default icon color.",
    Save: "Save",
    "Marker type already exists.": "Marker type already exists.",
    "Invalid icon name.": "Invalid icon name.",
    "Icon cannot be empty.": "Icon cannot be empty.",
    Cancel: "Cancel",

    //modals/path.ts
    Type: "Type",
    "to link heading": "to link heading",
    "to link blocks": "to link blocks",
    Note: "Note",
    "Blocks must have been created already":
        "Blocks must have been created already",

    //modals/mapview.ts
    "There was an error parsing the JSON.":
        "There was an error parsing the JSON.",

    //modals/context.ts
    "Execute Command": "Execute Command",
    "The marker will execute an Obsidian command on click":
        "The marker will execute an Obsidian command on click",
    "Command to Execute": "Command to Execute",
    "Name of Obsidian Command to execute":
        "Name of Obsidian Command to execute",
    Command: "Command",
    "Note to Open": "Note to Open",
    "Path of note to open": "Path of note to open",
    Path: "Path",
    "Marker Type": "Marker Type",
    Default: "Default",
    "Display Tooltip": "Display Tooltip",
    "Min Zoom": "Min Zoom",
    "Only display when zooming in below this zoom. Current map minimum":
        "Only display when zooming in below this zoom. Current map minimum",
    "Minimum zoom must be a number.": "Minimum zoom must be a number.",
    "Max Zoom": "Max Zoom",
    "Only display when zooming out above this zoom. Current map maximum":
        "Only display when zooming out above this zoom. Current map maximum",
    "Maximum zoom must be a number.": "Maximum zoom must be a number.",
    "Associate Tags": "Associate Tags",
    "Markers created from this tag using ": "Markers created from this tag using ",
    " will use this marker icon by default.": " will use this marker icon by default.",
    "Delete Marker": "Delete Marker",
    "Overlay Radius": "Overlay Radius",
    "Circle radius in": "Circle radius in",
    "Radius must be greater than 0.": "Radius must be greater than 0.",
    "Overlay Description": "Overlay Description",
    "Overlay Color": "Overlay Color",
    "Delete Overlay": "Delete Overlay",

    //map/view.ts
    "Leaflet Map": "Leaflet Map",

    //map/map.ts
    'Marker type "%1" does not exist, using default.':
        'Marker type "%1" does not exist, using default.', //marker type
    "There was an error saving the overlay.":
        "There was an error saving the overlay.",
    "There was an error adding GeoJSON to map":
        "There was an error adding GeoJSON to map",
    "There was an error adding GPX to map":
        "There was an error adding GPX to map",

    //layer/marker.ts
    "No command found!": "No command found!",
    "This marker cannot be edited because it was defined in the code block.":
        "This marker cannot be edited because it was defined in the code block.",
    "This overlay cannot be edited because it was defined in the code block.":
        "This overlay cannot be edited because it was defined in the code block.",

    //layer/gpx.ts
    Lat: "Lat",
    Lng: "Lng",
    Time: "Time",
    Elevation: "Elevation",
    Speed: "Speed",
    Pace: "Pace",
    Temperature: "Temperature",
    "Heart Rate": "Heart Rate",
    Cadence: "Cadence",
    spm: "spm",

    //controls/zoom.ts
    "Show All Markers": "Show All Markers",

    //controls/reset.ts
    "Reset View": "Reset View",

    //controls/mapview.ts
    "Edit View Parameters": "Edit View Parameters",
    "Save Parameters to View": "Save Parameters to View",

    //controls/gpx.ts
    "Zoom to %1 GPX Track%2": "Zoom to %1 GPX Track%2", //number of tracks, plural
    Heatlines: "Heatlines",
    "Zoom to GPX": "Zoom to GPX",
    Deselect: "Deselect",

    //controls/filter.ts
    All: "All",
    None: "None",
    "Filter Markers": "Filter Markers",

    //control/edit.ts
    "Bulk Edit Markers": "Bulk Edit Markers",
    "Delete All": "Delete All",
    marker: "marker",
    markers: "markers",
    "Add New": "Add New",
    "There was an issue with the provided latitude.":
        "There was an issue with the provided latitude.",
    "There was an issue with the provided longitude.":
        "There was an issue with the provided longitude.",

    //draw
    Draw: "Draw",
    Polygon: "Polygon",
    Polyline: "Polyline",
    Rectangle: "Rectangle",
    "Free Draw": "Free Draw",
    "Delete Shapes": "Delete Shapes",
    Done: "Done",
    Text: "Text",
    Color: "Color",
    "Fill Color": "Fill Color",
    "Move Shapes": "Move Shapes"
};
