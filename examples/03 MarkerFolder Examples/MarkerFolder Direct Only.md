This example shows how to load markers ONLY from direct children of a folder.

## Syntax

```leaflet
id: markerfolder-direct
markerFolder: ./People/
lat: 40
long: -80
defaultZoom: 4
height: 600px
```

**One slash at end** = only direct children, no subfolders

## What Gets Loaded

With `markerFolder: ./People/`:

```
People/
  ├── Alice.md              ✅ Loaded (direct child)
  ├── Bob.md                ✅ Loaded (direct child)
  └── Team-Leaders/         ❌ NOT Loaded (subfolder)
      ├── Charlie.md        ❌ NOT Loaded (nested)
      ├── Diana.md          ❌ NOT Loaded (nested)
      └── Managers/
          └── Eve.md        ❌ NOT Loaded (deep nested)
```

Only Alice and Bob appear on the map. Nested folders are completely ignored.

## Tips

- **Direct children** = files in `People/` folder only
- **Not included** = anything in `People/Team Leaders/` or deeper
- Use subfolders to organize without them affecting the map query
