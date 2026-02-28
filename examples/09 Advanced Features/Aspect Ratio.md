## How it works

```leaflet
id: aspect-map
image: [[map image.png]]
preserveAspect: true
lat: 50
long: 50
defaultZoom: 7
height: 400px
width: 600px
```

## What preserveAspect Does

When you resize the note pane, `preserveAspect` locks the map to maintain its **initial container aspect ratio**.

**Without preserveAspect:**
```
Initial: 600px wide × 400px tall (ratio 1.5:1)

User resizes pane to 800px wide
↓
Map stretches to 800px × 400px (ratio 2:1)
↓ Distorted!
```

**With preserveAspect:**
```
Initial: 600px wide × 400px tall (ratio 1.5:1)

User resizes pane to 800px wide
↓
Map becomes 800px × 533px (maintains 1.5:1 ratio)
↓
Aspect preserved!
```

## Important Notes

- `preserveAspect` only locks the **container** ratio, not the image
- The initial `width` and `height` values set the aspect ratio to preserve
- If you don't set `width`, it defaults to `100%` (full pane width)
- Height is then locked proportionally as the pane resizes
