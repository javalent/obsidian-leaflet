---
location: [42.3601, -71.0589]
mapmarker:
  icon: user
  color: ff6b6b
  layer: true
---

Bob is located in Boston. His marker is defined using an object with custom icon and color.

## Frontmatter with Object Config

```yaml
---
location: [42.3601, -71.0589]
mapmarker:
  icon: user
  color: ff6b6b
  layer: true
---
```

### Marker Object Properties

- **icon**: Font Awesome icon name (e.g., `user`, `star`, `heart`)
  - See [Font Awesome Free icons](https://fontawesome.com/icons)
  
- **color**: Hex color for the icon (without #)
  - Format: `RRGGBB` (e.g., `ff6b6b` for red)
  - Can also use `000000` for black, `ffffff` for white
  
- **layer**: Whether to layer the icon on the default marker
  - `true` = icon appears on top of default marker shape
  - `false` = icon replaces the default marker entirely
