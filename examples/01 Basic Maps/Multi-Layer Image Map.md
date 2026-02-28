This example shows how to switch between multiple image layers and add togglable overlay images on top.

## How it works

- **Layers** (`image:`) can contain a list of image layers. The first layer is displayed by default. When selecting another layer, the current layer is hidden.
- **Overlay images** (`imageOverlay:`) sit on top and can be toggled on/off independently
- Use layer control (top-right) to switch between layers and toggle overlays
- Each layer maintains its own markers and drawing data

```leaflet
id: multi-layer-map
image:
  - [[map image.png|Base Map]]
  - [[map image political.png|Political Map]]
imageOverlay:
  - [[[overlay image.svg|Red Waists]], [1050, 1800], [850, 2000]]
bounds:
  - [0, 0]
  - [1536, 2816]
lat: 768
long: 1408
height: 400px
defaultZoom: -2
minZoom: -2
maxZoom: 3
```

## Layer Control

The layer control box appears in the top-right of the map:
- **Radio buttons** for layers—choose one at a time
- **Check boxes** for overlay images—toggle multiple on/off

## Layers

````
```leaflet
image:
  - [[map-base.png|Base Map]]
  - [[map-political.png|Political Map]]
  - [[map-historic.png|Historical Map]]
```
````

Only one layer displays at a time. Select from the radio buttons.

## Overlay Images

````
```leaflet
imageOverlay:
  - [[[overlay image.svg|Points of Interest]], [50, 50], [150, 150]]
  - [[[annotations.png|Markings]], [200, 100], [400, 300]]
```
````

Overlays sit on top and can be toggled independently. Each overlay needs bounds `top-left, bottom-right`.
