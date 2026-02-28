This example shows how to enable dark mode on the map.

## How it works

```leaflet
id: dark-mode-map
darkMode: true
lat: 40
long: -80
defaultZoom: 5
height: 600px
```

## What Dark Mode Does

- Inverts map colors using CSS filters
- Reduces brightness for easier viewing at night
- Can be customized with CSS snippets

## Dark Mode CSS

The plugin applies this CSS:

```css
.leaflet-container .dark-mode {
    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
}
```

This:
- Reduces brightness initially
- Inverts all colors
- Increases contrast for readability
- Shifts hues to look more natural
- Reduces saturation for less eye strain
- Adjusts brightness again for balance

## Customizing Dark Mode

Create a CSS snippet to override the default filter:

```css
.leaflet-container .dark-mode {
    filter: invert(1) brightness(0.8) hue-rotate(180deg);
}
```

Try different filter values:

**More aggressive:**
```css
filter: brightness(0.4) invert(1) contrast(1.5);
```

**Lighter:**
```css
filter: brightness(0.8) invert(1) contrast(2) saturate(0.5);
```

**Blue shift:**
```css
filter: invert(1) hue-rotate(180deg) brightness(0.7);
```

