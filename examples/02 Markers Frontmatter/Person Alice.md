---
location: [40.7128, -74.0060]
mapmarker: person
---

Alice is located in New York City. Her marker is referenced in [[Map Using Frontmatter]].

## Frontmatter Breakdown

```yaml
---
location: [40.7128, -74.0060]
mapmarker: person
---
```

- **location**: [latitude, longitude] - **REQUIRED** for marker creation
- **mapmarker**: person - The marker type to use (defined in plugin settings)

## How markers are created

When this note is referenced in a map via `markerFile: [[Person Alice]]`:
1. The plugin reads the `location` field
2. Creates a marker at those coordinates
3. Uses the `mapmarker` type if specified (otherwise uses default)
4. Auto-links the marker back to this note
5. Clicking the marker opens this note

## Marker Types

The `person` marker type is defined in the `markers.json` file in this directory. Marker types can be defined in:
- Plugin settings (globally available), OR
- A `markers.json` file in the same directory as the notes (directory-specific)

If the marker type doesn't exist in either location, it falls back to the default marker.

### markers.json Format

```json
[
  {
    "type": "person",
    "iconName": "user",
    "color": "#4A90E2",
    "alpha": 1,
    "layer": true,
    "transform": {
      "size": 6,
      "x": 0,
      "y": -2
    },
    "isImage": false,
    "tags": [],
    "minZoom": null,
    "maxZoom": null
  }
]
```

### Property Reference

- **type**: Name used in `mapmarker` field (required)
- **iconName**: Font Awesome icon name without "fa-" prefix (e.g., "user", "star")
- **isImage**: `true` to use custom image instead of icon, `false` for Font Awesome icon
- **imageUrl**: URL/path to custom image (only if `isImage: true`)
- **color**: Hex color code (e.g., "#4A90E2")
- **alpha**: Opacity from 0 (transparent) to 1 (opaque)
- **layer**: `true` = icon appears on default marker, `false` = replaces it entirely
- **transform**: Icon positioning and size
  - **size**: Icon size multiplier
  - **x**: Horizontal offset in pixels
  - **y**: Vertical offset in pixels (negative moves up)
- **tags**: Array of tags for filtering (e.g., `["important", "team"]`)
- **minZoom**: Don't show marker when zoomed out below this level
- **maxZoom**: Don't show marker when zoomed in above this level
