# JSRekordFXBridge v2.0 - TypeScript Edition

# jsrekordbridge: Real-Time Lighting Control for DJs

A modern, enterprise-grade DJ lighting control system built with TypeScript, Domain-Driven Design, and dependency injection.

## Overview

## 🏗️ Architecture

`jsrekordbridge` is a Node.js package that enables DJs to synchronize Philips Hue Entertainment lights and DMX fixtures with music from a Pioneer DDJ-400 controller and Rekordbox software. It provides beat-synced lighting effects, customizable FX patterns, and spatial mapping of lights for immersive performances.

This project follows Domain-Driven Design (DDD) principles with clean architecture:

## Features

```

src/- **Beat-Synced Lighting**: Synchronize lighting effects with the beat of the music.

├── domain/           # Core business logic & entities- **Custom FX Effects**: Define lighting effects using YAML files.

│   ├── types.ts      # Shared value objects & interfaces- **Spatial Mapping**: Map musical frequencies (bass, mids, highs) to specific zones in the room.

│   ├── lighting/     # Lighting domain models- **DMX Output**: Control DMX fixtures for stage lighting.

│   ├── dmx/          # DMX domain models  - **Hue Entertainment Streaming**: Utilize Philips Hue's Entertainment API for low-latency lighting control.

│   ├── midi/         # MIDI domain models

│   ├── effects/      # Effect domain models## Installation

│   ├── shows/        # Show domain models

│   └── configuration/ # Configuration domain models```bash

├── application/      # Use cases & application servicesgit clone https://github.com/yourusername/dj-hue-dmx.git

│   └── effects/      # Effect orchestration servicescd dj-hue-dmx

├── infrastructure/   # External dependencies & implementationsnpm install

│   ├── lighting/     # Hue, DMX controller implementations````

│   ├── dmx/          # DMX hardware implementations

│   ├── midi/         # MIDI controller implementations## Configuration

│   ├── persistence/  # File-based repositories

│   └── di/           # Dependency injection containerConfiguration is managed via YAML and JSON files:

└── interfaces/       # User interfaces (CLI, Web, API)

    └── cli/          # Command line interfaces* `config/default-config.yaml`: Main package configuration (Hue bridge, username, DMX interface, MIDI input).

```* `effects/`: Directory containing FX effect YAML files (e.g., `strobo.yaml`, `red_suspense.yaml`).

* `config/depth-map.json`: Maps musical frequencies to spatial zones in the room.

## 🚀 Getting Started

### Example `default-config.yaml`

### Prerequisites

- Node.js >= 18.0.0```yaml

- TypeScript 5.2+hue:

  bridge_id: "<bridge-id>"

### Installation  username: "<username>"

```bash  entertainment_id: "<entertainment-id>"

npm installdmx:

```  device: "/dev/ttyUSB0"

midi:

### Development  input_name: "DDJ-400"

```bashbeat_to_light:

# Run in demo mode (no hardware required)  enabled: true

npm run demo  source: "midi_clock"

  sensitivity: 0.8

# Interactive CLI demo  default_depth_map: "config/depth-map.json"

npm run demo-clieffects:

  directory: "effects"

# Development with hot reload```

npm run dev

### Example `effects/strobo.yaml`

# Type checking

npm run type-check```yaml

name: "strobo"

# Build for productionpattern:

npm run build  - action: "pulse"

npm start    target: "all"

```    params:

      intensity: 254

## 🎮 Usage      duration: 50

  - action: "hold"

### Demo Mode    params:

The system automatically detects when hardware isn't available and runs in demo mode:      ms: 30

```

```bash

npm run demo## Usage

```

### Example script: `examples/simple-start.js`

### Interactive CLI

```bash```javascript

npm run demo-cliconst HueEntertainment = require('../src/hue');

```const FxEngine = require('../src/fx-engine');

const fs = require('fs');

Available commands:const yaml = require('yaml');

- `strobo` - Trigger strobe effect

- `sweep` - Trigger sweep effect  async function main() {

- `suspense` - Trigger red suspense effect  const hue = new HueEntertainment({

- `blackout` - Turn off all lights    bridge_id: '<bridge-id>',

- `bpm 140` - Set beat speed    username: '<username>',

- `toggle` - Start/stop auto beat    entertainment_id: '<entertainment-id>',

- `beat` - Manual beat trigger  });

- `list` - Show all loaded effects  await hue.connect();

  await hue.startStream();

### Programmatic API

```typescript  const fx = new FxEngine({

import { bridge } from './src/index.js';    hueClient: hue,

    depthMap: require('../config/depth-map.json'),

await bridge.initialize();  });

await bridge.start();

  const effectFile = fs.readFileSync('./effects/strobo.yaml', 'utf8');

// Trigger effects  const effectDef = yaml.parse(effectFile);

await bridge.triggerEffect('strobo');  fx.triggerEffect(effectDef);

await bridge.triggerEffect('sweep', { speed: 'fast' });

  setInterval(() => fx.onBeat(), 500);

// Control beats}

bridge.setBPM(140);

bridge.beat(); // Manual beatmain();

bridge.toggleBeat(); // Start/stop auto beat```



await bridge.stop();## File Structure

```

```

## 🏛️ Domain Modelsjsrekordbridge/

├── src/

### Core Entities│   ├── hue.js

- **Effect**: Lighting sequences with steps, parameters, and metadata│   ├── fx-engine.js

- **Show**: Collections of effects with cues and triggers│   ├── midi.js

- **LightDevice**: Individual controllable lights with capabilities│   ├── rekordbox.js

- **DMXDevice**: DMX fixtures with channel mappings│   ├── dmx.js

- **MIDIDevice**: MIDI controllers and interfaces│   ├── beat-detector.js

│   └── beat-to-light.js

### Value Objects├── config/

- **Color**: RGB color values│   ├── default-config.yaml

- **Position**: 3D spatial coordinates│   ├── depth-map.json

- **Intensity**: Light brightness (0-1)├── effects/

- **BeatPosition**: Musical timing information│   ├── strobo.yaml

- **TimeRange**: Duration specifications│   ├── red_suspense.yaml

│   ├── sweep.yaml

## 🔌 Hardware Integration│   └── blackout.yaml

├── examples/

### Supported Devices│   └── simple-start.js

- **Lighting**: Philips Hue Entertainment, DMX fixtures├── package.json

- **MIDI**: Any MIDI controller, DDJ-400 optimized├── README.md

- **Beat Detection**: MIDI clock, internal generator└── open-todos.md

```

### Mock Implementations

All hardware has mock implementations for development:## Future Extensions

- `MockLightController` - Simulates Hue lights

- `MockDMXController` - Simulates DMX universe* Implement audio analysis-driven beat detection.

- `MockMIDIController` - Simulates MIDI devices* Support for multiple DJ controllers.

- `MockBeatDetector` - Generates beats at configurable BPM* Networked DMX support for large stage setups.

* Advanced FX pattern definitions with easing, loops, and combined effects.

## 🎨 Effects System* Real-time mapping configuration for depth/room zones.

* Unit tests for all modules.

Effects are defined in YAML files in the `effects/` directory:* CLI or GUI for configuring and triggering effects without editing YAML directly.

* Documentation examples for different DJ controllers beyond DDJ-400.

```yaml
name: "my_effect"
description: "Custom lighting effect"
tags: ["strobe", "party"]
params:
  color: [255, 0, 0]
  frequency_hz: 10
pattern:
  - action: pulse
    target: all
    params:
      intensity: 254
      duration: 100
  - action: hold
    params:
      ms: 200
```

## 🛠️ Configuration

Configuration uses YAML files with environment variable substitution:

```yaml
# config/default-config.yaml
lighting:
  enabled: true
  provider: hue
  hue:
    bridge_id: "${HUE_BRIDGE_ID}"
    username: "${HUE_USERNAME}"
    entertainment_group_id: "${HUE_ENTERTAINMENT_ID}"

dmx:
  enabled: true
  provider: enttec
  device: "${DMX_DEVICE}"
  universe: 1

midi:
  enabled: true
  input_device: "${MIDI_DEVICE_NAME}"
  clock_source: midi
```

Environment variables:
```bash
# .env
HUE_BRIDGE_ID=your_bridge_id
HUE_USERNAME=your_username  
HUE_ENTERTAINMENT_ID=your_group_id
DMX_DEVICE=/dev/ttyUSB0
MIDI_DEVICE_NAME=DDJ-400
DEMO_MODE=true
```

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Demo mode testing
npm run demo
npm run demo-cli
```

## 🏗️ Extending the System

### Adding New Hardware
1. Create domain interface in `src/domain/`
2. Implement in `src/infrastructure/`
3. Register in DI container
4. Add mock implementation for testing

### Adding New Effects
1. Create YAML definition in `effects/`
2. System automatically loads on startup
3. Use via `bridge.triggerEffect('effect_name')`

### Adding New Interfaces
1. Create in `src/interfaces/`
2. Use dependency injection to access services
3. Follow separation of concerns

## 🔧 Technology Stack

- **TypeScript 5.2** - Type safety and modern JavaScript features
- **InversifyJS** - Dependency injection container
- **ES Modules** - Modern module system
- **YAML** - Configuration and effect definitions
- **Node.js 18+** - Runtime environment

## 📦 Dependencies

### Core
- `inversify` - Dependency injection
- `reflect-metadata` - Decorator metadata
- `yaml` - YAML parsing
- `dotenv` - Environment variables

### Hardware
- `jzz` - MIDI controller interface
- `dmx` - DMX lighting control
- `node-hue-api` - Philips Hue integration

### Development
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution
- `eslint` - Code linting
- `@types/node` - Node.js type definitions

## 🎯 Future Roadmap

- [ ] Real Hue Entertainment integration
- [ ] ArtNet/sACN DMX support  
- [ ] Web-based control interface
- [ ] Show sequencing system
- [ ] Audio-reactive effects
- [ ] Plugin architecture
- [ ] Cloud sync capabilities
- [ ] Advanced MIDI mapping
- [ ] Performance monitoring
- [ ] Multi-universe DMX support

## 📄 License

MIT License - See LICENSE file for details.