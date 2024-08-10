export default {
    //main.ts
    "Loading Obsidian Leaflet v%1": "Loading Obsidian Leaflet v%1", //version number
    "Open Leaflet map": "Open Leaflet map",
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
    "There was an error with the provided latitude. Using default.":
        "There was an error with the provided latitude. Using default.",
    "There was an error with the provided longitude. Using default.":
        "There was an error with the provided longitude. Using default.",

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
    "Leaflet settings": "Leaflet settings",
    "Default map marker": "Default map marker",
    "This marker is always available.": "This marker is always available.",
    "Icon name": "Icon name",
    "A default marker must be defined.": "A default marker must be defined",
    "The selected icon does not exist in Font Awesome Free.":
        "The selected icon does not exist in Font Awesome Free.",
    "Upload image": "Upload image",
    "Marker color": "Marker color",
    "Layer base marker": "Layer base marker",
    "Use as base layer for additional markers by default.":
        "Use as base layer for additional markers by default.",
    "Additional map markers": "Additional map markers",
    "Add additional": "Add additional",
    "These markers will be available in the right-click menu on the map.":
        "These markers will be available in the right-click menu on the map.",
    "Default latitude": "Default latitude",
    "Real-world maps will open to this latitude if not specified.":
        "Real-world maps will open to this latitude if not specified.",
    "Latitude must be a number.": "Latitude must be a number.",
    "Default longitude": "Default longitude",
    "Real-world maps will open to this longitude if not specified.":
        "Real-world maps will open to this longitude if not specified.",
    "Longitude must be a number.": "Longitude must be a number.",
    "Reset to default": "Reset to default",
    "Please back up your data before changing this setting.":
        "Please back up your data before changing this setting.",
    "Current directory": "Current directory",
    "Default config directory": "Default config directory",
    "Default marker tooltip behavior": "Default marker tooltip behavior",
    "New markers will be created to this setting by default. Can be overridden per-marker.":
        "New markers will be created to this setting by default. Can be overridden per-marker.",
    Always: "Always",
    Hover: "Hover",
    Never: "Never",
    "Display note preview": "Display note preview",
    "Markers linked to notes will show a note preview when hovered.":
        "Markers linked to notes will show a note preview when hovered.",
    "Display overlay tooltips": "Display overlay tooltips",
    "Overlay tooltips will display when hovered.":
        "Overlay tooltips will display when hovered.",
    "Copy coordinates on shift-click": "Copy coordinates on shift-click",
    "Map coordinates will be copied to the clipboard when shift-clicking.":
        "Map coordinates will be copied to the clipboard when shift-clicking.",
    "This setting is experimental and could cause marker data issues. Use at your own risk.":
        "This setting is experimental and could cause marker data issues. Use at your own risk.",
    "Import marker CSV file": "Import marker CSV file",
    "Choose file": "Choose file",
    "Upload CSV File": "Upload CSV File",
    "Map not specified for line %1": "Map not specified for line %1", //line number in csv
    "Could not parse latitude for line %1":
        "Could not parse latitude for line %1", //line number in csv
    "Could not parse longitude for line %1":
        "Could not parse longitude for line %1", //line number in csv
    "Marker file successfully imported.": "Marker file successfully imported.",
    "There was an error while importing %1":
        "There was an error while importing %1", //csv file name
    "Export marker data": "Export marker data",
    "Export all marker data to a CSV file.":
        "Export all marker data to a CSV file.",
    Export: "Export",
    "Enable draw mode by default": "Enable draw mode by default",
    "The draw control will be added to maps by default. Can be overridden with the draw map block parameter.":
        "The draw control will be added to maps by default. Can be overridden with the draw map block parameter.",
    "Default units": "Default units",
    "Select the default system of units for the map.":
        "Select the default system of units for the map.",
    "Default tile server": "Default tile server",
    "It is up to you to ensure you have proper access to this tile server.":
        "It is up to you to ensure you have proper access to this tile server.",
    "Default tile server attribution": "Default tile server attribution",
    "Please ensure your attribution meets all requirements set by the tile server.":
        "Please ensure your attribution meets all requirements set by the tile server.",
    "Default tile server (dark mode)": "Default tile server (dark mode)",

    Imperial: "Imperial",
    Metric: "Metric",
    "Only display when zooming out above this zoom.":
        "Only display when zooming out above this zoom.",
    "Only display when zooming in below this zoom.":
        "Only display when zooming in below this zoom.",
    "Reset": "Reset",
    "Default tile server subdomains": "Default tile server subdomains",
    "Available subdomains for this tile server concurrent requests.":
        "Available subdomains for this tile server concurrent requests. Spilt by ',', etc. 'a,b,c'",

    //modals/settings.ts
    "Marker name": "Marker name",
    "Marker name already exists.": "Marker name already exists.",
    "Marker name cannot be empty.": "Marker name cannot be empty.",
    "Font Awesome icon name (e.g. map-marker).":
        "Font Awesome icon name (e.g. map-marker).",
    "Use image for icon": "Use image for icon",
    "Layer icon": "Layer icon",
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
    "Execute command": "Execute command",
    "The marker will execute an Obsidian command on click":
        "The marker will execute an Obsidian command on click",
    "Command to execute": "Command to execute",
    "Name of Obsidian command to execute":
        "Name of Obsidian command to execute",
    Command: "Command",
    "Note to open": "Note to open",
    "Path of note to open": "Path of note to open",
    Path: "Path",
    "Marker type": "Marker type",
    Default: "Default",
    "Display tooltip": "Display tooltip",
    "Min zoom": "Min zoom",
    "Only display when zooming in below this zoom. Current map minimum":
        "Only display when zooming in below this zoom. Current map minimum",
    "Minimum zoom must be a number.": "Minimum zoom must be a number.",
    "Max zoom": "Max zoom",
    "Only display when zooming out above this zoom. Current map maximum":
        "Only display when zooming out above this zoom. Current map maximum",
    "Maximum zoom must be a number.": "Maximum zoom must be a number.",
    "Associate tags": "Associate tags",
    "Markers created from this tag using ": "Markers created from this tag using ",
    " will use this marker icon by default.": " will use this marker icon by default.",
    "Delete marker": "Delete marker",
    "Overlay radius": "Overlay radius",
    "Circle radius in": "Circle radius in",
    "Radius must be greater than 0.": "Radius must be greater than 0.",
    "Overlay description": "Overlay description",
    "Overlay color": "Overlay color",
    "Delete overlay": "Delete overlay",

    //modals/geojson.ts
    "File name": "File name",
    "Enter a file name.": "Enter a file name.",

    //map/view.ts
    "Leaflet map": "Leaflet map",

    //map/map.ts
    'Marker type "%1" does not exist, using default.':
        'Marker type "%1" does not exist, using default.', //marker type
    "There was an error saving the overlay.":
        "There was an error saving the overlay.",
    "There was an error adding GeoJSON to map":
        "There was an error adding GeoJSON to map",
    "There was an error adding GPX to map":
        "There was an error adding GPX to map",
    "Edit overlay": "Edit overlay",
    "Create marker": "Create marker",
    "OpenStreetMap has restricted the use of its tile server in Obsidian. Your map may break at any time. Please switch to a different tile server.":
        "OpenStreetMap has restricted the use of its tile server in Obsidian. Your map may break at any time. Please switch to a different tile server.",
    "There was an issue parsing the tile layer: %1":
        "There was an issue parsing the tile layer: %1",
    "OpenStreetMap cannot be turned off without specifying additional tile servers.":
        "OpenStreetMap cannot be turned off without specifying additional tile servers.",
    //layer/marker.ts
    "No command found!": "No command found!",
    "This marker cannot be edited because it was defined in the code block.":
        "This marker cannot be edited because it was defined in the code block.",
    "This overlay cannot be edited because it was defined in the code block.":
        "This overlay cannot be edited because it was defined in the code block.",
    "Edit marker": "Edit marker",
    "Convert to code block": "Convert to code block",
    "Leaflet: Could not create icon for %1 - does this type exist in settings?":
        "Leaflet: Could not create icon for %1 - does this type exist in settings?",

    //layer/gpx.ts
    Lat: "Lat",
    Lng: "Lng",
    Time: "Time",
    Elevation: "Elevation",
    Speed: "Speed",
    Pace: "Pace",
    Temperature: "Temperature",
    "Heart rate": "Heart rate",
    Cadence: "Cadence",
    spm: "spm",

    //controls/zoom.ts
    "Show all markers": "Show all markers",

    //controls/reset.ts
    "Reset view": "Reset view",

    //controls/mapview.ts
    "Edit view parameters": "Edit view parameters",
    "Save parameters to view": "Save parameters to view",

    //controls/gpx.ts
    "Zoom to %1 GPX Track%2": "Zoom to %1 GPX Track%2", //number of tracks, plural
    Heatlines: "Heatlines",
    "Zoom to GPX": "Zoom to GPX",
    Deselect: "Deselect",

    //controls/filter.ts
    All: "All",
    None: "None",
    "Filter markers": "Filter markers",

    //control/edit.ts
    "Bulk edit markers": "Bulk edit markers",
    "Delete all": "Delete all",
    marker: "marker",
    markers: "markers",
    "Add new": "Add new",
    "There was an issue with the provided latitude.":
        "There was an issue with the provided latitude.",
    "There was an issue with the provided longitude.":
        "There was an issue with the provided longitude.",
    //draw
    Draw: "Draw",
    Polygon: "Polygon",
    Polyline: "Polyline",
    Rectangle: "Rectangle",
    "Free sraw": "Free draw",
    "Delete shapes": "Delete shapes",
    Done: "Done",
    Text: "Text",
    Color: "Color",
    "Fill color": "Fill color",
    "Move shapes": "Move shapes",
    "Export drawing to GeoJSON": "Export drawing to GeoJSON",
};
