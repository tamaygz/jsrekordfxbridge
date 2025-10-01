# JSRekordFXBridge v3.0 - TypeScript Edition

> A modern, enterprise-grade DJ lighting control system built with TypeScript, Domain-Driven Design, and dependency injection.

## 🚀 Overview

JSRekordFXBridge is a professional DJ lighting control system that synchronizes Philips Hue Entertainment lights and DMX fixtures with music. Built from the ground up in TypeScript with clean architecture principles, it provides beat-synced lighting effects, customizable FX patterns, and comprehensive hardware integration.

### Key Features

- **🎵 Beat-Synced Lighting** - Real-time synchronization with MIDI clock or audio analysis
- **🎨 YAML Effect Definitions** - Easy-to-create lighting effects using human-readable YAML
- **🎛️ Multi-Hardware Support** - Philips Hue, DMX fixtures, and MIDI controllers
- **🏗️ Enterprise Architecture** - Domain-Driven Design with dependency injection
- **🎭 Demo Mode** - Full mock implementation for development without hardware
- **⚡ Real-time Performance** - Low-latency lighting control for live performances
- **🔧 Hot Reload** - Effects reload automatically when files change

## 🏛️ Architecture

The system follows Domain-Driven Design (DDD) with clean architecture:

```
src/
├── types/               # Organized type definitions
│   ├── domain/         # Domain types (lighting, beats, effects, devices, events)
│   ├── infrastructure/ # DI container types
│   └── external/       # External library declarations
├── domain/             # Core business logic & entities
│   ├── lighting/       # Light controller interfaces & models
│   ├── dmx/           # DMX controller interfaces & models
│   ├── midi/          # MIDI controller interfaces & models
│   ├── effects/       # Effect domain models & repositories
│   ├── shows/         # Show orchestration & cue management
│   ├── beat/          # Beat detection & timing services
│   └── configuration/ # System configuration models
├── application/        # Use cases & application services
│   ├── orchestration-service.ts # Main system orchestrator
│   └── effects/       # Effect engine implementation
├── infrastructure/     # External dependencies & implementations
│   ├── lighting/      # Hue & mock light controllers
│   ├── dmx/          # Real & mock DMX implementations
│   ├── midi/         # JZZ & mock MIDI implementations
│   ├── effects/      # File-based effect repository
│   ├── configuration/ # YAML configuration service
│   ├── shows/        # YAML show service
│   ├── beat/         # MIDI clock beat detection
│   └── di/           # InversifyJS container configuration
└── interfaces/         # User interfaces
    └── cli/           # Command line interfaces
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **TypeScript** 5.2+
- **npm** or **yarn**

### Installation

```bash
git clone https://github.com/tamaygz/jsrekordfxbridge.git
cd jsrekordfxbridge
npm install
```

### Development

```bash
# Run in demo mode (no hardware required)
npm run demo

# Interactive CLI demo
npm run demo-cli

# Development with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
npm start
```

## 🎮 Usage

### Demo Mode

The system automatically detects when hardware isn't available and runs in demo mode:

```bash
npm run demo
```

Demo mode provides:
- **Mock Controllers** - Simulated Hue, DMX, and MIDI devices
- **Full Functionality** - All features work without hardware
- **Interactive Console** - Global `bridge` variable for live interaction

### Interactive API

When running, the system provides a global `bridge` object:

```javascript
// Trigger effects
await bridge.triggerEffect('strobo')
await bridge.triggerEffect('sweep', 0.8)

// Control system
bridge.setBPM(140)
await bridge.setMasterBrightness(0.5)
await bridge.blackout()

// Show management
await bridge.loadShow('myshow')
await bridge.startShow()

// System status
await bridge.showStatus()
await bridge.listEffects()
```

### Programmatic API

```typescript
import { JSRekordFXBridge } from './src/index.js'

const bridge = new JSRekordFXBridge()

async function main() {
  await bridge.initialize()
  await bridge.start()
  
  // Trigger effects
  await bridge.triggerEffect('strobo')
  
  // Set BPM
  bridge.setBPM(140)
  
  await bridge.stop()
}

main()
```

## 🛠️ Configuration

Configuration is managed via YAML files with environment variable substitution:

### `config/default-config.yaml`

```yaml
midi:
  device_name: "DDJ-400"
  map:
    mode_toggle: "button_1"
    strobe: "pad_1"
    suspense: "pad_2"
    sweep: "pad_3"
    blackout: "pad_4"
rekordbox:
  use_midi_clock: true
  virtual_port: "rekordbox-out"
beat_to_light:
  source: "midi_clock" # options: midi_clock | audio_aubio
  sensitivity: 0.8
  default_depth_map: "config/depth-map.yaml"
hue:
  enabled: true
  bridge_id: "${HUE_BRIDGE_ID}"
  username: "${HUE_USERNAME}"
  entertainment_id: "${HUE_ENTERTAINMENT_ID}"
dmx:
  enabled: true
  device: "${DMX_DEVICE}"
effects:
  directory: "effects"
```

### Environment Variables

```bash
# .env
HUE_BRIDGE_ID=your_bridge_id
HUE_USERNAME=your_username  
HUE_ENTERTAINMENT_ID=your_group_id
DMX_DEVICE=/dev/ttyUSB0
MIDI_DEVICE_NAME=DDJ-400
DEMO_MODE=true
```

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

## � Effects System

Effects are defined in YAML files in the `effects/` directory. The system includes several built-in effects:

### Available Effects

- **`strobo.yaml`** - High-intensity strobe effect
- **`sweep.yaml`** - Color sweep across lights
- **`red_suspense.yaml`** - Red suspense lighting
- **`blackout.yaml`** - Turn off all lights

### Example Effect: `effects/strobo.yaml`

```yaml
# Example strobo effect YAML
name: strobo
type: generic
params:
  color: [255,255,255]
  frequency_hz: 10
  duration_ms: 2000
pattern:
  - action: pulse
    target: all
    params:
      intensity: 254
      duration: 10
    repeat: true
```

### Creating Custom Effects

1. Create a new YAML file in the `effects/` directory
2. Define the effect structure following the schema
3. The system automatically reloads effects when files change
4. Use via: `await bridge.triggerEffect('your_effect_name')`

## 🔌 Hardware Integration

### Supported Devices

- **Lighting**: Philips Hue Entertainment, Mock controllers
- **DMX**: EnTTec DMX interfaces, Mock DMX universe
- **MIDI**: Any MIDI controller (optimized for DDJ-400), JZZ MIDI library
- **Beat Detection**: MIDI clock synchronization, configurable BPM

### Mock Implementations

All hardware has comprehensive mock implementations for development:

- **`MockLightController`** - Simulates Hue Entertainment lights with console output
- **`MockDMXController`** - Simulates DMX universe with channel tracking
- **`MockMIDIController`** - Simulates MIDI devices with beat generation
- **Demo Mode** - Automatically activated when hardware credentials are missing

## 🏗️ Domain Models

### Core Entities

- **`Effect`** - Lighting sequences with steps, parameters, and metadata
- **`Show`** - Collections of effects with cues and beat-synchronized triggers
- **`LightDevice`** - Individual controllable lights with capabilities and state
- **`DMXDevice`** - DMX fixtures with channel mappings and capabilities
- **`MIDIDevice`** - MIDI controllers and interfaces with mapping configuration

### Value Objects

- **`Color`** - RGB color values (0-255)
- **`Position`** - 3D spatial coordinates for light placement
- **`Intensity`** - Light brightness levels (0-1)
- **`BeatPosition`** - Musical timing information (beat, measure, downbeat)
- **`BPM`** - Beats per minute for tempo synchronization
- **`TimeRange`** - Duration specifications for effects

## 🏗️ Extending the System

### Adding New Hardware

1. **Create Domain Interface** in `src/domain/`
2. **Implement Infrastructure** in `src/infrastructure/`
3. **Register in DI Container** (`src/infrastructure/di/container.ts`)
4. **Add Mock Implementation** for testing
5. **Update Configuration** schema and YAML files

### Adding New Effects

1. **Create YAML Definition** in `effects/` directory
2. **System Automatically Loads** effects on startup and file changes
3. **Use via API**: `await bridge.triggerEffect('effect_name')`

### Adding New Services

1. **Define Domain Interface** following DDD principles
2. **Implement Service** in application or infrastructure layer
3. **Register with InversifyJS** container
4. **Inject Dependencies** using `@inject()` decorator

## 🧪 Testing

```bash
# Build the project first
npm run build

# Run main DI container validation test
node tests/test-di.js

# Run comprehensive service tests
node tests/test-all-services.js

# Type checking
npm run type-check

# Linting
npm run lint

# Demo mode testing
npm run demo
npm run demo-cli
```

### Test Files

All test files are located in the `tests/` directory:
- `test-di.js` - Main dependency injection container validation
- `test-all-services.js` - Comprehensive service resolution testing  
- `validate-di-fixes.js` - @unmanaged() decorator validation
- `test-direct.js` - Direct service instantiation tests
- `test-manual.js` - Manual testing utilities
- `test-minimal.js` - Minimal functionality tests

See `tests/README.md` for detailed documentation of each test file.

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

- **TypeScript 5.2+** - Type safety and modern JavaScript features
- **InversifyJS 6.0** - Dependency injection container with decorators
- **ES Modules** - Modern module system for Node.js
- **YAML** - Human-readable configuration and effect definitions
- **Node.js 18+** - Runtime environment with modern async/await support
- **Domain-Driven Design** - Clean architecture with clear domain boundaries

## 📦 Dependencies

### Core Runtime
- **`inversify`** - Dependency injection container
- **`reflect-metadata`** - Decorator metadata for DI
- **`yaml`** - YAML parsing for configurations and effects
- **`dotenv`** - Environment variable management

### Hardware Integration
- **`jzz`** - Cross-platform MIDI controller interface
- **`dmx`** - DMX lighting control library
- **`node-hue-api`** - Philips Hue Entertainment API integration

### Development & Build
- **`typescript`** - TypeScript compiler with strict mode
- **`tsx`** - Fast TypeScript execution for development
- **`eslint`** - Code linting with TypeScript rules
- **`@types/node`** - Node.js type definitions

## 🎯 Current Status & Roadmap

### ✅ Implemented Features

- **TypeScript Architecture** - Full DDD with dependency injection
- **Demo Mode** - Complete mock implementation for development
- **Effect System** - YAML-based effect definitions with hot reload
- **MIDI Integration** - JZZ library with mock controllers
- **DMX Support** - Real and mock DMX controllers
- **Configuration System** - YAML-based with environment variables
- **Beat Detection** - MIDI clock synchronization
- **Interactive API** - Global bridge object for live interaction
- **Test Suite** - Comprehensive DI container and service tests

### 🚧 In Progress

- [ ] **Real Hue Entertainment** - Physical Philips Hue integration
- [ ] **Audio Analysis** - Beat detection from audio input
- [ ] **Show Sequencing** - Advanced cue and timeline management
- [ ] **Web Interface** - Browser-based control panel

### 🔮 Future Roadmap

- [ ] **ArtNet/sACN** - Professional lighting network protocols
- [ ] **Plugin Architecture** - Extensible effect and controller system
- [ ] **Performance Monitoring** - Real-time system metrics
- [ ] **Multi-universe DMX** - Support for multiple DMX universes
- [ ] **Cloud Sync** - Configuration and show synchronization
- [ ] **Advanced MIDI Mapping** - Complex controller mappings
- [ ] **Mobile App** - iOS/Android remote control

## 📄 License

**MIT License** - See LICENSE file for details.

## 🤝 Contributing

This project follows enterprise-grade development practices:

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow TypeScript** strict mode and ESLint rules
4. **Add tests** for new functionality
5. **Commit changes**: `git commit -m 'Add amazing feature'`  
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request** with detailed description

### Development Setup

```bash
# Clone and install
git clone https://github.com/tamaygz/jsrekordfxbridge.git
cd jsrekordfxbridge
npm install

# Run tests
npm run build
node tests/test-di.js

# Start in demo mode
npm run demo
```