This example shows how to load ALL markers from a folder and its subfolders at any depth.

## Syntax

```leaflet
id: markerfolder-all
markerFolder: ./People
lat: 40
long: -80
defaultZoom: 4
height: 600px
```

**No slashes** = search all subfolders recursively

> **Important**: The `./` prefix makes the path **relative to the current file**. Without it, the plugin looks for the folder at your vault root.

## What Gets Loaded

With `markerFolder: ./People`:

```
People/
  ├── Alice.md              ✅ Loaded
  ├── Bob.md                ✅ Loaded
  └── Team-Leaders/
      ├── Charlie.md        ✅ Loaded
      ├── Diana.md          ✅ Loaded
      └── Managers/
          └── Eve.md        ✅ Loaded (deep nesting!)
```

All 5 markers appear on the map, regardless of how deeply nested the notes are.

## Use Cases

- **Entire team** from all departments
- **All locations** in a hierarchy
- When you don't care about folder depth
- Search the whole folder structure inclusive of subdirs

## How It Works

1. Plugin starts at the `People` folder
2. Scans ALL files in that folder and all subfolders
3. For each note with `location:` frontmatter, creates a marker
4. Depth is unlimited - goes as deep as the folder structure

## What You Can Do

1. Click referenced person notes to see their location
2. Add new person notes in any subfolder
3. Edit coordinates and refresh to see markers update
4. See other examples to limit folder depth
