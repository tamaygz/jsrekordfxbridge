# Types Architecture

This document describes the organized type structure used throughout the JSRekordfxbridge project.

## 📁 Directory Structure

```
src/types/
├── domain/                 # Domain-specific types organized by bounded context
│   ├── lighting.ts        # Color, LightId, Intensity
│   ├── beats.ts           # BeatPosition, BPM, TimeRange
│   ├── effects.ts         # EffectId, effect-related types
│   ├── devices.ts         # DeviceId, Position
│   ├── events.ts          # DomainEvent, BeatEvent, etc.
│   └── shared.ts          # Re-exports for convenience
├── infrastructure/        # Infrastructure-specific types
│   └── di-container.ts    # Dependency injection container identifiers
└── external/              # External library declarations
    └── dmx.d.ts           # DMX library TypeScript declarations
```

## 🎯 Domain Types

### Lighting (`domain/lighting.ts`)
- `Color` - RGB color values
- `LightId` - Unique light identifier
- `Intensity` - Light intensity (0-1)

### Beats (`domain/beats.ts`)  
- `BeatPosition` - Beat timing information
- `BPM` - Beats per minute
- `TimeRange` - Time duration specifications

### Effects (`domain/effects.ts`)
- `EffectId` - Unique effect identifier

### Devices (`domain/devices.ts`)
- `DeviceId` - Device identifier
- `Position` - 3D spatial coordinates

### Events (`domain/events.ts`)
- `DomainEvent` - Base domain event interface
- `BeatEvent` - Beat-related events
- `EffectTriggeredEvent` - Effect trigger events
- `DeviceStateChangedEvent` - Device state change events

### Shared (`domain/shared.ts`)
Convenient re-exports of commonly used types across domains.

## 🏗️ Infrastructure Types

### DI Container (`infrastructure/di-container.ts`)
- `TYPES` - Service identifier constants for InversifyJS
- `DITypes` - TypeScript type for service identifiers

## 🔌 External Types

### DMX (`external/dmx.d.ts`)
TypeScript declarations for the `dmx` npm package.

## 📚 Usage Examples

### Importing Domain Types
```typescript
// Import specific types
import type { Color, LightId } from '../types/domain/lighting.js';
import type { BeatPosition } from '../types/domain/beats.js';

// Import from shared for convenience
import type { Color, BeatPosition } from '../types/domain/shared.js';
```

### Importing Infrastructure Types
```typescript
import { TYPES } from '../types/infrastructure/di-container.js';
```

## ✅ Benefits

1. **Clear Separation** - Domain, infrastructure, and external types are distinct
2. **Focused Files** - Each file has a single responsibility 
3. **Scalable** - Easy to add new domain contexts without file bloat
4. **Discoverable** - Types are organized by purpose and context
5. **Maintainable** - Logical organization makes types easy to find and update
6. **Import Clarity** - Import paths clearly indicate the type's context

## 🔄 Migration Notes

This structure replaces the previous approach of:
- `src/domain/types.ts` - Now split into focused domain files
- `src/infrastructure/di/types.ts` - Now `infrastructure/di-container.ts` 
- `src/types/dmx.d.ts` - Now `external/dmx.d.ts`

All import statements throughout the codebase have been updated to use the new structure.