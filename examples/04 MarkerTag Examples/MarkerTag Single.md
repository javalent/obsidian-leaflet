This example shows how to load markers by filtering notes with a specific tag. **Requires DataView plugin**.

## How it works

The `markerTag` parameter searches for notes with a specific tag:

```leaflet
id: markertag-single
markerTag: location
lat: 40
long: -80
defaultZoom: 4
height: 600px
```

This loads ALL notes tagged with `#location`.

## Frontmatter Setup

Each note that should appear needs:

```yaml
---
tags: location
location: [lat, long]
mapmarker: event
---
```

Or using tag syntax:

```yaml
---
tags:
  - location
  - city
location: [lat, long]
---
```

## What Gets Loaded

Plugin searches for notes with `#location` tag:
- [[City A]] - has `#location` tag ✅
- [[City B]] - has `#location` tag ✅
- [[Other Note]] - no `#location` tag ❌

## Requirements

- **DataView plugin** must be installed and enabled
- Notes must have both:
  - A tag matching `markerTag`
  - A `location: [lat, long]` field

## Tips

- Tags are case-sensitive: `#location` ≠ `#Location`
- In frontmatter, tags can be written as:
  - `tags: location` (single)
  - `tags: [location, city]` (list)
  - `tags:\\n  - location\\n  - city` (multi-line)
- Use `#tag-name` format when referencing in docs or notes
- Use `tag-name` format (no #) in frontmatter
