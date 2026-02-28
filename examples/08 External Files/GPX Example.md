This example shows how to load GPS tracks and waypoints from GPX files.

## How it works

```leaflet
id: gpx-example
gpx: [[example track.gpx]]
lat: 40.7128
long: -74.0060
defaultZoom: 12
height: 600px
```

## GPX Features

The GPX file contains:
- **Track points** - The recorded route path
- **Waypoints** - Named points of interest along the route
- **Data** - Elevation, speed, cadence, heart rate, etc.

## What You'll See

### Track Visualization
- The GPS route appears as a colorful line on the map
- Color intensity can indicate elevation, speed, or heart rate

### Waypoints
- Points marked on the track (start, water station, turnaround, finish)
- Can appear as markers (see [GPX-With-Markers.md](GPX-With-Markers.md))

### Data Display
When you click on the track:
- Control box appears at bottom
- Select data type to visualize:
  - Elevation
  - Speed
  - Cadence
  - Heart Rate
  - Temperature

## GPX File Format

A minimal GPX file structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Your App">
  <trk>
    <name>My Track</name>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <ele>10</ele>
        <time>2024-01-15T10:30:00Z</time>
      </trkpt>
      <!-- More track points -->
    </trkseg>
  </trk>
</gpx>
```

## Waypoints in GPX

```xml
<wpt lat="40.7128" lon="-74.0060">
  <name>Start Point</name>
  <desc>Beginning of the route</desc>
</wpt>
```

Waypoints become markers on the map.

## Data Fields in GPX

The example file includes:
- **Elevation** (`<ele>`) - Height in meters
- **Time** (`<time>`) - ISO-8601 timestamp
- **Speed** - Calculated from points (optional)
- **Cadence** (`<cad>`) - Steps/min (optional)
- **Heart Rate** (`<hr>`) - BPM (optional)

## Useful GPX Sources

- **Apple Health** - Export workouts from iPhone fitness app
- **Strava** - Export activities and segments
- **Garmin** - Export from running/cycling watches
- **Google Maps** - Can be converted to GPX
- **Manual creation** - Use [geojson.io](https://geojson.io/) or GPX editors

## Tips

- Larger GPX files (10,000+ points) may slow rendering
- Data visualization only works if data exists in the file
- Use [gpx.io](https://gpx.io) to view/edit GPX files
- Combine multiple GPX files with multiple `gpx:` lines

