This map loads markers from notes using frontmatter fields. See the linked notes to understand how frontmatter-based markers work.

## How it works

The `markerFile` parameter loads one or more notes and scans their frontmatter for:
- `location: [lat, long]` - creates a marker at this location
- `mapmarker: type` - specifies the marker type
- `mapmarkers: [...]` - array of multiple markers
- `mapoverlay: [...]` - overlays for this location

## Map Code

```leaflet
id: frontmatter-markers-map
markerFile: 
 - [[Person Alice]]
 - [[Person Bob]]
 - [[Person Charlie]]
lat: 40
long: -80
defaultZoom: 4
maxZoom: 15
height: 600px
```

## Referenced Notes

Check out these notes to see different ways to use frontmatter:

1. **[Person Alice](Person%20Alice.md)** - Basic location with marker type name
2. **[Person Bob](Person%20Bob.md)** - Location with marker object (icon + color)
3. **[Person Charlie](Person%20Charlie.md)** - Multiple markers and overlays

## Frontmatter Syntax

String reference to marker type:
```yaml
---
location: [40.7128, -74.0060]
mapmarker: person
---
```

Object with icon and color:
```yaml
---
location: [40.7128, -74.0060]
mapmarker:
  icon: user
  color: ff0000
  layer: true
---
```

Multiple markers:
```yaml
---
mapmarkers:
  - [event, [41.0, -73.0], My Event]
  - [location, [42.0, -72.0], Another Location]
---
```
