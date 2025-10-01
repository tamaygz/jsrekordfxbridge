# JSRekordFXBridge v3.0 - TypeScript Edition

> A modern, enterprise-grade DJ lighting control system built with TypeScript, Domain-Driven Design, and dependency injection.

## 🚀 Overview

JSRekordFXBridge is a professional DJ lighting control system that synchronizes Philips Hue Entertainment lights and DMX fixtures with music. Built from the ground up in TypeScript with clean architecture principles, it provides beat-synced lighting effects, customizable FX patterns, and comprehensive hardware integration.

### Key Features

- **🎵 Beat-Synced Lighting** - Real-time synchronization with MIDI clock or audio analysis
- **🎚️ Rekordbox Integration** - Direct connection to rekordbox DJ software with multi-channel BPM tracking
- **🎨 YAML Effect Definitions** - Easy-to-create lighting effects using human-readable YAML
- **🎛️ Multi-Hardware Support** - Philips Hue, DMX fixtures, MIDI controllers, and rekordbox
- **🏗️ Enterprise Architecture** - Domain-Driven Design with dependency injection
- **🎭 Demo Mode** - Full mock implementation for development without hardware
- **⚡ Real-time Performance** - Low-latency lighting control for live performances
- **🔧 Hot Reload** - Effects reload automatically when files change

## 🏛️ Architecture

The system follows Domain-Driven Design (DDD) with clean architecture principles:

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
│   ├── rekordbox/     # Rekordbox controller interfaces & models
│   ├── effects/       # Effect domain models & interfaces
│   │   ├── effect.ts           # Core effect entities
│   │   ├── effect-engine.ts    # Business orchestration interface
│   │   ├── effect-executor.ts  # Hardware execution interface
│   │   └── effect-repository.ts # Persistence interface
│   ├── shows/         # Show orchestration & cue management
│   ├── beat/          # Beat detection & timing services
│   └── configuration/ # System configuration models
├── application/        # Use cases & application services
│   ├── orchestration-service.ts # Main system orchestrator
│   └── effects/       # Effect engine business logic
│       └── effect-engine.service.ts # Effect orchestration implementation
├── infrastructure/     # External dependencies & implementations
│   ├── lighting/      # Hue & mock light controllers
│   ├── dmx/          # Real & mock DMX implementations
│   ├── midi/         # JZZ & mock MIDI implementations
│   ├── rekordbox/    # Real & mock rekordbox implementations
│   ├── effects/      # Effect infrastructure implementations
│   │   ├── file-effect-repository.ts    # YAML file-based persistence
│   │   └── hardware-effect-executor.ts  # Hardware command execution
│   ├── configuration/ # YAML configuration service
│   ├── shows/        # YAML show service
│   ├── beat/         # MIDI clock beat detection
│   └── di/           # InversifyJS container configuration
└── interfaces/         # User interfaces
    └── cli/           # Command line interfaces
```

### Clean Architecture Principles

The system implements proper **separation of concerns** with clear dependencies:

- **Domain Layer**: Pure business logic and entities (no dependencies)
- **Application Layer**: Use cases and orchestration (depends only on Domain)
- **Infrastructure Layer**: External integrations and hardware (depends on Domain & Application)
- **Interface Layer**: User interfaces (depends on Application)

#### Effect System Architecture Example

The effect system demonstrates clean architecture principles:

```typescript
// Domain Layer - Pure interfaces and entities
interface EffectEngine {
  triggerEffect(id: EffectId): Promise<EffectExecution>
  executeEffectWithIntensity(effect: Effect, intensity: number): Promise<void>
}

interface EffectExecutor {
  executeStep(step: EffectStep, context: EffectExecutionContext): Promise<void>
}

// Application Layer - Business logic implementation
@injectable()
class EffectEngineService implements EffectEngine {
  constructor(
    @inject(TYPES.EffectRepository) private repository: EffectRepository,
    @inject(TYPES.EffectExecutor) private executor: EffectExecutor
  ) {}
  // Business orchestration, execution tracking, beat sync
}

// Infrastructure Layer - Hardware implementation
@injectable() 
class HardwareEffectExecutor implements EffectExecutor {
  constructor(
    @inject(TYPES.LightController) private lights: ILightController,
    @inject(TYPES.DMXController) private dmx: DMXController
  ) {}
  // Actual hardware command generation and execution
}
```

This ensures:
- **Testability**: Easy to mock dependencies for unit testing
- **Flexibility**: Swap implementations without changing business logic  
- **Maintainability**: Changes to hardware don't affect business rules
- **Single Responsibility**: Each layer has one clear purpose

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

## 🎨 Effects System

The effect system follows clean architecture with proper separation between business logic and hardware execution:

### Architecture

- **EffectEngine** (Domain): Business orchestration interface for effect lifecycle
- **EffectExecutor** (Domain): Hardware execution interface for command generation
- **EffectRepository** (Domain): Persistence interface for effect storage
- **EffectEngineService** (Application): Business logic implementation with execution tracking
- **HardwareEffectExecutor** (Infrastructure): Hardware command generation and execution
- **FileEffectRepository** (Infrastructure): YAML-based effect storage

### Available Effects

- **`strobo.yaml`** - High-intensity white strobe effect
- **`sweep.yaml`** - Color sweep across lights  
- **`red_suspense.yaml`** - Red suspense lighting
- **`blackout.yaml`** - Turn off all lights

### Effect Definition Format

Effects are defined using YAML with a `steps` structure:

```yaml
# effects/strobo.yaml
name: strobo
description: "Strobe effect with white flashing lights"
steps:
  - action:
      type: pulse
      color: { r: 255, g: 255, b: 255 }
      intensity: 1.0
    duration: 100
    target:
      type: all
      selector: all
  - action:
      type: fade
      color: { r: 0, g: 0, b: 0 }
      intensity: 0.0
    duration: 100
    target:
      type: all
      selector: all
```

### Effect Execution Flow

1. **Trigger**: `bridge.triggerEffect("strobo")` via orchestration service
2. **Repository**: Load effect definition from YAML file
3. **Engine**: Business logic processes steps with intensity scaling
4. **Executor**: Generate hardware commands for lights/DMX
5. **Hardware**: Send commands to actual devices (Hue, DMX, etc.)

### Creating Custom Effects

1. Create a new YAML file in the `effects/` directory
2. Define `steps` with `action`, `duration`, and `target` properties
3. The system automatically reloads effects when files change (hot reload)
4. Use via: `await bridge.triggerEffect('your_effect_name')`

### Effect Features

- **Clean Architecture**: Proper separation between business logic and hardware execution
- **Hot Reload**: Effects automatically reload when YAML files change
- **Intensity Scaling**: Master brightness and per-effect intensity control
- **Beat Synchronization**: Effects can respond to beat detection
- **Hardware Abstraction**: Same effects work with different hardware implementations
- **Execution Tracking**: Monitor running effects and stop them programmatically
- **Single Responsibility**: Each service has one clear purpose (orchestration, execution, persistence)

## 🔌 Hardware Integration

### Supported Devices

- **Lighting**: Philips Hue Entertainment, Mock controllers
- **DMX**: EnTTec DMX interfaces, Mock DMX universe
- **MIDI**: Any MIDI controller (optimized for DDJ-400), JZZ MIDI library
- **Rekordbox**: Direct integration via MIDI for multi-channel BPM and beat sync
- **Beat Detection**: MIDI clock synchronization, rekordbox BPM tracking, configurable BPM

### Rekordbox Integration

The system can connect directly to rekordbox DJ software to:

- **Track Multiple Channels** - Monitor BPM and playback state of all 4 decks
- **Auto-Sync BPM** - Automatically sync lighting effects to the active deck's BPM
- **Channel Detection** - Detect which channel is currently playing (master channel)
- **Beat Synchronization** - React to beats from the active channel in real-time
- **Multi-Deck Support** - Switch lighting between different channels seamlessly

**Setup:**
1. Enable MIDI Clock output in rekordbox preferences
2. Configure the virtual port name in `config/default-config.yaml`:
   ```yaml
   rekordbox:
     use_midi_clock: true
     virtual_port: "rekordbox-out"
   ```
3. Start the system - it will automatically connect to rekordbox

### Mock Implementations

All hardware has comprehensive mock implementations for development:

- **`MockLightController`** - Simulates Hue Entertainment lights with console output
- **`MockDMXController`** - Simulates DMX universe with channel tracking
- **`MockMIDIController`** - Simulates MIDI devices with beat generation
- **`MockRekordboxController`** - Simulates rekordbox with channel states and BPM changes
- **Demo Mode** - Automatically activated when hardware credentials are missing

## 🏗️ Domain Models

### Core Entities

- **`Effect`** - Complete lighting sequences with steps, parameters, and metadata  
- **`EffectStep`** - Individual effect actions with duration and targeting
- **`EffectAction`** - Specific light commands (fade, pulse, sweep, etc.)
- **`EffectExecution`** - Runtime tracking of effect execution state
- **`Show`** - Collections of effects with cues and beat-synchronized triggers
- **`LightDevice`** - Individual controllable lights with capabilities and state
- **`DMXDevice`** - DMX fixtures with channel mappings and capabilities
- **`MIDIDevice`** - MIDI controllers and interfaces with mapping configuration
- **`RekordboxChannel`** - Individual DJ deck/channel with BPM and playback state

### Domain Interfaces

- **`EffectEngine`** - Business orchestration interface for effect lifecycle management
- **`EffectExecutor`** - Hardware execution interface for command generation and sending
- **`EffectRepository`** - Persistence interface for effect storage and retrieval
- **`LightController`** - Hardware abstraction for lighting devices
- **`DMXController`** - Hardware abstraction for DMX fixtures
- **`MIDIController`** - Hardware abstraction for MIDI devices
- **`RekordboxController`** - Hardware abstraction for rekordbox DJ software integration

### Value Objects

- **`Color`** - RGB color values (0-255)
- **`Position`** - 3D spatial coordinates for light placement
- **`Intensity`** - Light brightness levels (0-1 normalized)
- **`BeatPosition`** - Musical timing information (beat, measure, downbeat)
- **`BPM`** - Beats per minute for tempo synchronization
- **`TimeRange`** - Duration specifications for effects and timing
- **`EffectId`** - Unique identifier for effects
- **`LightId`** - Unique identifier for individual lights

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

- **Clean Architecture** - Complete DDD implementation with proper separation of concerns
- **Effect System** - Clean architecture with Domain/Application/Infrastructure layers
  - Domain interfaces: `EffectEngine`, `EffectExecutor`, `EffectRepository` 
  - Application service: Business logic with execution tracking
  - Infrastructure: Hardware execution and YAML file persistence
- **Philips Hue Integration** - Full Entertainment API with light targeting
- **TypeScript Architecture** - Strict typing with InversifyJS dependency injection
- **Demo Mode** - Complete mock implementation for hardware-free development
- **YAML Effect Definitions** - Hot reload with proper steps-based structure
- **MIDI Integration** - JZZ library with mock controllers for development
- **DMX Support** - Real and mock DMX controllers with fixture management
- **Rekordbox Integration** - Multi-channel BPM tracking and automatic beat sync
  - Track all 4 channels independently with playback state
  - Auto-sync lighting to active channel's BPM
  - React to beats from different decks
  - Seamless channel switching
- **Configuration System** - Environment-based YAML configuration
- **Beat Detection** - MIDI clock synchronization with beat-responsive effects
- **Interactive API** - Global bridge object for live interaction and testing
- **Comprehensive Testing** - DI container validation and service resolution tests

### 🚧 In Progress

- [ ] **Audio Analysis** - Beat detection from audio input using Web Audio API
- [ ] **Show Sequencing** - Advanced cue and timeline management with beat sync
- [ ] **Web Interface** - Browser-based control panel with real-time feedback

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