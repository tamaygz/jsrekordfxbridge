
# jsrekordbridge: Real-Time Lighting Control for DJs

## Overview

`jsrekordbridge` is a Node.js package that enables DJs to synchronize Philips Hue Entertainment lights and DMX fixtures with music from a Pioneer DDJ-400 controller and Rekordbox software. It provides beat-synced lighting effects, customizable FX patterns, and spatial mapping of lights for immersive performances.

## Features

- **Beat-Synced Lighting**: Synchronize lighting effects with the beat of the music.
- **Custom FX Effects**: Define lighting effects using YAML files.
- **Spatial Mapping**: Map musical frequencies (bass, mids, highs) to specific zones in the room.
- **DMX Output**: Control DMX fixtures for stage lighting.
- **Hue Entertainment Streaming**: Utilize Philips Hue's Entertainment API for low-latency lighting control.

## Installation

```bash
git clone https://github.com/yourusername/dj-hue-dmx.git
cd dj-hue-dmx
npm install
````

## Configuration

Configuration is managed via YAML and JSON files:

* `config/default-config.yaml`: Main package configuration (Hue bridge, username, DMX interface, MIDI input).
* `effects/`: Directory containing FX effect YAML files (e.g., `strobo.yaml`, `red_suspense.yaml`).
* `config/depth-map.json`: Maps musical frequencies to spatial zones in the room.

### Example `default-config.yaml`

```yaml
hue:
  bridge_id: "<bridge-id>"
  username: "<username>"
  entertainment_id: "<entertainment-id>"
dmx:
  device: "/dev/ttyUSB0"
midi:
  input_name: "DDJ-400"
beat_to_light:
  enabled: true
  source: "midi_clock"
  sensitivity: 0.8
  default_depth_map: "config/depth-map.json"
effects:
  directory: "effects"
```

### Example `effects/strobo.yaml`

```yaml
name: "strobo"
pattern:
  - action: "pulse"
    target: "all"
    params:
      intensity: 254
      duration: 50
  - action: "hold"
    params:
      ms: 30
```

## Usage

### Example script: `examples/simple-start.js`

```javascript
const HueEntertainment = require('../src/hue');
const FxEngine = require('../src/fx-engine');
const fs = require('fs');
const yaml = require('yaml');

async function main() {
  const hue = new HueEntertainment({
    bridge_id: '<bridge-id>',
    username: '<username>',
    entertainment_id: '<entertainment-id>',
  });
  await hue.connect();
  await hue.startStream();

  const fx = new FxEngine({
    hueClient: hue,
    depthMap: require('../config/depth-map.json'),
  });

  const effectFile = fs.readFileSync('./effects/strobo.yaml', 'utf8');
  const effectDef = yaml.parse(effectFile);
  fx.triggerEffect(effectDef);

  setInterval(() => fx.onBeat(), 500);
}

main();
```

## File Structure

```
jsrekordbridge/
├── src/
│   ├── hue.js
│   ├── fx-engine.js
│   ├── midi.js
│   ├── rekordbox.js
│   ├── dmx.js
│   ├── beat-detector.js
│   └── beat-to-light.js
├── config/
│   ├── default-config.yaml
│   ├── depth-map.json
├── effects/
│   ├── strobo.yaml
│   ├── red_suspense.yaml
│   ├── sweep.yaml
│   └── blackout.yaml
├── examples/
│   └── simple-start.js
├── package.json
├── README.md
└── open-todos.md
```

## Future Extensions

* Implement audio analysis-driven beat detection.
* Support for multiple DJ controllers.
* Networked DMX support for large stage setups.
* Advanced FX pattern definitions with easing, loops, and combined effects.
* Real-time mapping configuration for depth/room zones.
* Unit tests for all modules.
* CLI or GUI for configuring and triggering effects without editing YAML directly.
* Documentation examples for different DJ controllers beyond DDJ-400.
