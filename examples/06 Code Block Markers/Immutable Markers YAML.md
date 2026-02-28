This example shows how to create immutable markers directly in the map code block. These markers cannot be edited on the map - only via code changes.

## YAML Syntax (Recommended)

```leaflet
id: code-block-markers
marker:
  - default, 40.7128, -74.0060, [[Person Alice]], Alice from NYC
  - event, 42.3601, -71.0589, , Boston Event
  - default, 41.8781, -87.6298
lat: 40
long: -80
defaultZoom: 4
height: 600px
```

## Comma-Separated Syntax (Legacy)

````
```leaflet
marker: default, 40.7128, -74.0060, [[Person Alice]], Alice from NYC
marker: event, 42.3601, -71.0589, , Boston Event
marker: default, 41.8781, -87.6298
```
````

## Syntax Breakdown

Each marker has up to 7 comma-separated components:

```
type, latitude, longitude, link, description, minZoom, maxZoom
```

1. **type** - Marker type name (must exist in settings)
2. **latitude** - Numeric latitude coordinate
3. **longitude** - Numeric longitude coordinate
4. **link** - Optional: Note link or URL
   - Use `[[Note Name]]` for Obsidian notes
   - Use `https://example.com` for URLs
   - **Use `, ,` (double comma) to skip this parameter**
5. **description** - Optional: Text that appears on hover
6. **minZoom** - Optional: Don't show when zoomed out below this level
7. **maxZoom** - Optional: Don't show when zoomed in above this level

**Important:** In YAML arrays, don't use brackets `[]` around the values - just use comma-separated values directly.

## Examples

**Full marker with everything:**
```
event, 40.7128, -74.0060, [[My Note]], Meeting in NYC, 3, 15
```

**Marker with description but no link (note the double comma):**
```
event, 42.3601, -71.0589, , Boston Event
```

**Minimal marker:**
```
default, 40.7128, -74.0060
```

**Zoom breakpoints:**
- minZoom 3: Don't show when zoomed smaller than level 3
- maxZoom 15: Don't show when zoomed larger than level 15

## vs. Frontmatter Markers

| Immutable Code Block | Frontmatter |
|---|---|
| Defined in map code | Defined in note frontmatter |
| Not editable on map | Editable on map |
| Great for static data | Great for dynamic data |
| Changes = edit code | Changes = edit note |
