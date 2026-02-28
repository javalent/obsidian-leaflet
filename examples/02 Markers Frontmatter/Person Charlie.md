---
location: [41.8781, -87.6298]
mapmarkers:
  - [event, [41.8781, -87.6298], Main Office]
  - [event, [41.8701, -87.6278], Branch Location]
mapoverlay:
  - [blue, [41.8781, -87.6298], 2 miles, Service Area]
---

Charlie is located in Chicago with multiple locations and a service area overlay.

## Multiple Markers with mapmarkers

```yaml
---
mapmarkers:
  - [event, [41.8781, -87.6298], Main Office]
  - [event, [41.8701, -87.6278], Branch Location]
---
```

This creates **multiple markers** for a single note:

### Syntax

```
mapmarkers:
  - [type, [latitude, longitude], description, minZoom, maxZoom]
```

- **type**: Marker type name (must exist in settings)
- **[latitude, longitude]**: Coordinates for the marker
- **description**: Optional text description
- **minZoom, maxZoom**: Optional zoom breakpoints

### In this example

- First marker: Type `event` at main location with description "Main Office"
- Second marker: Type `event` at branch location with description "Branch Location"

## Overlays with mapoverlay

```yaml
---
mapoverlay:
  - [blue, [41.8781, -87.6298], 2 miles, Service Area]
---
```

This creates a circle overlay:
- **Color**: `blue` (CSS color name)
- **Location**: centered on [41.8781, -87.6298]
- **Radius**: `2 miles` (includes unit)
- **Description**: "Service Area"

### Overlay Colors

Use CSS color names or hex values:
- `blue`, `red`, `green`, `yellow`, `purple`
- `#ff0000`, `#00ff00`, `#0000ff`

### Overlay Radius Units

- `miles`, `feet`, `meters`, `kilometers`
- `5 miles`, `500 meters`, `1 km`
