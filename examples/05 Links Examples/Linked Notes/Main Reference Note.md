---
location: [40.7128, -74.0060]
mapmarker: default
---

# Main Reference Note

This note has a location and links to other notes.

## Outgoing Links

This note links to:
- [[Office Location]] - An office in NYC
- [[Additional Location]] - A location in LA

## How to Use

**Use with `linksFrom`:**
````
```leaflet
linksFrom: [[Main Reference Note]]
```
````
This shows markers for Office Location and Additional Location (the notes THIS note links to).

**Use with `linksTo`:**
````
```leaflet
linksTo: [[Main Reference Note]]
```
````
This shows markers for Links Example Note (which links TO this note).
