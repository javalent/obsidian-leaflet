This example shows how to use `linksFrom` to create markers from outgoing links.

⚠️ **Requires DataView plugin** - Install from Settings > Community Plugins > Browse

## What is linksFrom?

**`linksFrom: [[Note]]`** creates markers for all notes that **Note links to** (its outgoing links).

Think of it as: "Show me what **Note** points to"

## The Setup

We have notes in the `Linked Notes/` subfolder:

```
Main Reference Note [NYC]
  └─ Links TO: Office Location, Additional Location

Office Location [NYC]
  └─ Linked FROM: Main Reference Note

Additional Location [LA]
  └─ Linked FROM: Main Reference Note
```

All notes have `location:` frontmatter fields.

## Basic Example

```leaflet
id: links-from-map
linksFrom: [[Main Reference Note]]
lat: 40
long: -100
defaultZoom: 3
height: 500px
```

**What it does:** Creates markers for notes that **Main Reference Note links to** (its outgoing links).

**Result:** 2 markers appear:
- Office Location (NYC)
- Additional Location (LA)

**Important:** Main Reference Note itself does NOT appear unless you also add `markerFile: [[Main Reference Note]]`

## Include the Reference Note

```leaflet
id: with-reference
linksFrom: [[Main Reference Note]]
markerFile: [[Main Reference Note]]
lat: 40
long: -100
defaultZoom: 3
maxZoom: 15
height: 500px
```

**Result:** 3 markers:
- Main Reference Note (NYC) - from markerFile
- Office Location (NYC) - from linksFrom
- Additional Location (LA) - from linksFrom

## Key Points

- **Only notes with `location:` frontmatter become markers**
- The reference note itself is NOT included automatically (use `markerFile` to add it)
- You can specify multiple notes: `linksFrom: [[[Note A]], [[Note B]]]`
- Works with `markerFile`, `markerFolder`, `markerTag` in the same map

## DataView Requirement

This parameter uses DataView's link index to find connected notes.

**Install DataView:**
1. Settings > Community Plugins > Browse
2. Search for "DataView"
3. Install and enable

## Use Cases

**Project Management:**
````
```leaflet
linksFrom: [[Project Overview]]
```
````
Shows all location-tagged tasks/milestones linked from the project page.

**Character Locations:**
````
```leaflet
linksFrom: [[Character: Alice]]
```
````
Shows everywhere Alice has been (if her character page links to location notes).

**Trip Hub:**
````
```leaflet
linksFrom: [[Summer Road Trip]]
```
````
Shows all destinations linked from your trip planning note.

## Related

See [[LinksTo Example]] for the opposite direction (backlinks).
