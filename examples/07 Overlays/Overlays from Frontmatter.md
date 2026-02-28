This example shows how to create overlays from note frontmatter metadata.

## How it works

```leaflet
id: overlay-from-frontmatter
markerFile: [[Zone A], [Zone B], [Zone C]]
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

The notes themselves contain overlay definitions in their frontmatter.

## Note Frontmatter with Overlay

```yaml
---
mapoverlay:
  - [40.7128, -74.0060, 5, blue, Downtown Zone]
  - [40.7, -74.1, 3, orange, Parking Area]
---

# Zone A

This zone includes our main office.
```

## Multiple Overlays

A single note can define multiple overlays:

```yaml
---
location: [40.7128, -74.0060]
mapoverlay:
  - [40.7128, -74.0060, 5, blue]
  - [40.7, -74.1, 4, green]
  - [40.75, -74.05, 2, red]
---

# Zone Description
```

Each array item is a separate overlay.

## Combining Code Block + Frontmatter Overlays

```leaflet
id: combined-overlays
markerFile: [[Zone-A], [Zone-B]]
overlay:
  - [40.65, -74.2, 3, yellow, Static Area]
lat: 41
long: -73
defaultZoom: 6
height: 600px
```

This shows:
- Overlays from Zone-A and Zone-B (frontmatter)
- Additional static overlay (code block)
