This example shows how to use `linksTo` to create markers from incoming links (backlinks).

⚠️ **Requires DataView plugin** - Install from Settings > Community Plugins > Browse

## What is linksTo?

**`linksTo: [[Note]]`** creates markers for all notes that **link TO Note** (its backlinks/incoming links).

Think of it as: "Show me what points to **Note**"

## The Setup

We have notes in the `Linked Notes/` subfolder:

```
Links Example Note [Seattle]
  └─ Links TO: Main Reference Note

Main Reference Note [NYC]
  └─ Linked FROM: Links Example Note
```

All notes have `location:` frontmatter fields.

## Basic Example

```leaflet
id: links-to-map
linksTo: [[Main Reference Note]]
lat: 40
long: -100
defaultZoom: 3
height: 500px
```

**What it does:** Creates markers for notes that **link TO Main Reference Note** (its backlinks/incoming links).

**Result:** 1 marker appears:
- Links Example Note (Seattle)

**Important:** Main Reference Note itself does NOT appear unless you also add `markerFile: [[Main Reference Note]]`

## Include the Reference Note

```leaflet
id: with-reference
linksTo: [[Main Reference Note]]
markerFile: [[Main Reference Note]]
lat: 40
long: -100
defaultZoom: 3
height: 500px
```

**Result:** 2 markers:
- Main Reference Note (NYC) - from markerFile
- Links Example Note (Seattle) - from linksTo

## Combining with linksFrom

```leaflet
id: combined-links
linksTo: [[Main Reference Note]]
linksFrom: [[Main Reference Note]]
markerFile: [[Main Reference Note]]
lat: 40
long: -100
defaultZoom: 3
height: 500px
```

**Result:** 4 markers (all notes in the Linked Notes folder):
- Main Reference Note (NYC) - from markerFile
- Links Example Note (Seattle) - from linksTo (incoming link)
- Office Location (NYC) - from linksFrom (outgoing link)
- Additional Location (LA) - from linksFrom (outgoing link)

## Key Points

- **Only notes with `location:` frontmatter become markers**
- The reference note itself is NOT included automatically (use `markerFile` to add it)
- You can specify multiple notes: `linksTo: [[[Note A]], [[Note B]]]`
- Works with `markerFile`, `markerFolder`, `markerTag` in the same map

## DataView Requirement

This parameter uses DataView's link index to find connected notes.

**Install DataView:**
1. Settings > Community Plugins > Browse
2. Search for "DataView"
3. Install and enable

## Use Cases

**Travel Planning:**
````
```leaflet
linksTo: [[Trip to Europe]]
```
````
Shows all location notes that reference your trip planning page.

**Hub Pages:**
````
```leaflet
linksTo: [[Geography MOC]]
```
````
Shows all location notes that link to your Map of Content page.

**Event Tracking:**
````
```leaflet
linksTo: [[2024 Conference]]
```
````
Shows all venue/location notes that reference the conference.

## Related

See [[LinksFrom Example]] for the opposite direction (outgoing links).
