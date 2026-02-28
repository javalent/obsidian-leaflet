This example shows how to limit folder scanning to two levels deep.

## Syntax

```leaflet
id: markerfolder-two-levels
markerFolder: ./People//
lat: 40
long: -80
defaultZoom: 4
height: 600px
```

**Two slashes at end** = direct children + one level of subfolders

## What Gets Loaded

With `markerFolder: ./People//`:

```
People/
  ├── Alice.md              ✅ Loaded (level 0)
  ├── Bob.md                ✅ Loaded (level 0)
  └── Team-Leaders/         (level 1)
      ├── Charlie.md        ✅ Loaded (level 1)
      ├── Diana.md          ✅ Loaded (level 1)
      └── Managers/         (level 2)
          └── Eve.md        ❌ NOT Loaded (too deep)
```

Alice, Bob, Charlie, and Diana appear - but not Eve (she's too deeply nested).

## The Slash Pattern

- `markerFolder: ./People` = unlimited depth (no slash)
- `markerFolder: ./People/` = only direct children (1 slash)
- `markerFolder: ./People//` = 2 levels deep (2 slashes)
- `markerFolder: ./People///` = 3 levels deep (3 slashes)

**Rule**: Add one slash for each level of nesting you want to include.
