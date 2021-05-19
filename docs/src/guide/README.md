# Introduction

Obsidian Leaflet adds the ability to create interactive maps (both real and using custom images) inside Obsidian.md markdown notes. These notes are feature rich and allow zooming, panning, and creating markers that can link to notes, link to external websites, or even run Obsidian commands.

## How It Works

Once installed, Obsidian Leaflet is available as a code block post-processor inside markdown notes. It builds a map using [LeafletJS](https://leafletjs.com/), a light-weight, open-source JavaScript library for interactive maps.

## Features

- Create a real-world map using OpenStreetMap or create a custom image map using an image in your vault
- Multi-layer image maps, for locations that have multiple floors
- Unlimited marker types with customizable icons and colors
- Parsing of note frontmatter to auto-generate markers
- Create markers directly on the map, and the plugin will save the markers and re-load them next time the note is opened
- Re-use the same map in multiple notes by referencing the same map ID
- Measure distances on the map in real-time