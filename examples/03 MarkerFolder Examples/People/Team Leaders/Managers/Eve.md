---
location: [47.6062, -122.3321]
mapmarker: person
---

Eve works in Seattle. She's nested two levels deep in Team-Leaders/Managers.

Used in examples:
- markerFolder: ./People (all subfolders) ✅
- markerFolder: ./People/ (direct only) ❌
- markerFolder: ./People// (2 levels) ❌
- markerFolder: ./People/// (3 levels) ✅

She only appears when you include 3 levels of nesting!
