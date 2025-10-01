# JSRekordFXBridge Scripts

This directory contains utility scripts for managing and testing the JSRekordFXBridge system.

## 🔧 Core Management Scripts

### `hue-manager.js`
**Comprehensive Hue bridge management and testing tool**

All-in-one script for Hue bridge setup, configuration, and testing.

**Direct script usage:**
```bash
# Interactive setup
node scripts/hue-manager.js setup

# Setup with specific IP
node scripts/hue-manager.js setup 192.168.1.100

# Validate current configuration
node scripts/hue-manager.js validate

# List all Entertainment groups
node scripts/hue-manager.js list-groups

# Test basic streaming functionality  
node scripts/hue-manager.js test-streaming

# Test strobo and color effects
node scripts/hue-manager.js test-effects

# Debug connection and group issues
node scripts/hue-manager.js debug

# Fix Entertainment group class issues
node scripts/hue-manager.js fix-groups

# Show help
node scripts/hue-manager.js help
```

**NPM script shortcuts:**
```bash
# Show help
npm run hue

# Interactive setup
npm run hue:setup

# Validate configuration
npm run hue:validate

# Test streaming
npm run hue:test

# Test effects
npm run hue:test-effects

# Debug issues 
npm run hue:debug

# List Entertainment groups
npm run hue:list-groups

# Fix group issues
npm run hue:fix-groups
```

### `env-manager.js`
**Environment configuration management**

Manage `.env` files for the project.

**Direct script usage:**
```bash
# Generate new .env file template
node scripts/env-manager.js generate

# Clean up duplicate variables
node scripts/env-manager.js cleanup

# Validate current configuration
node scripts/env-manager.js validate

# Show help
node scripts/env-manager.js help
```

**NPM script shortcuts:**
```bash
# Show help
npm run env

# Generate .env template
npm run env:generate

# Validate configuration
npm run env:validate

# Clean up duplicates
npm run env:cleanup
```

## 🧪 Test Scripts

### `hue-streaming-test.js`
**Entertainment streaming core functionality test**

Tests the fundamental Entertainment streaming features:
- DTLS connection attempts with REST fallback
- Bridge streaming enable/disable
- Graceful shutdown handling
- Process signal handling

```bash
# Direct usage
node scripts/hue-streaming-test.js

# NPM shortcut
npm run test:hue-streaming
```

### `hue-effects-test.js`
**Visual effects testing**

Tests Entertainment streaming with visual effects:
- Strobo (red flashing) effect
- Rainbow color sweep
- Entertainment group control
- Proper API usage

```bash
# Direct usage
node scripts/hue-effects-test.js

# NPM shortcut
npm run test:hue-effects
```

## 🚀 Quick Start

1. **First time setup:**
   ```bash
   # Generate environment file
   npm run env:generate
   
   # Set up Hue bridge
   npm run hue:setup
   
   # Validate configuration
   npm run hue:validate
   ```

2. **Test your setup:**
   ```bash
   # Quick streaming test
   npm run hue:test
   
   # Full effects test
   npm run hue:test-effects
   ```

3. **Troubleshooting:**
   ```bash
   # Debug connection issues
   npm run hue:debug
   
   # List all Entertainment groups
   npm run hue:list-groups
   
   # Fix group class issues
   npm run hue:fix-groups
   ```

## 📋 NPM Commands Reference

### 🌉 Hue Commands
| Command | Description |
|---------|-------------|
| `npm run hue` | Show Hue manager help |
| `npm run hue:setup` | Interactive Hue bridge setup |
| `npm run hue:validate` | Validate Hue configuration |
| `npm run hue:test` | Test Entertainment streaming |
| `npm run hue:test-effects` | Test visual effects |
| `npm run hue:debug` | Debug connection issues |
| `npm run hue:list-groups` | List Entertainment groups |
| `npm run hue:fix-groups` | Fix group class issues |

### 🔧 Environment Commands
| Command | Description |
|---------|-------------|
| `npm run env` | Show environment manager help |
| `npm run env:generate` | Create new .env file |
| `npm run env:validate` | Show current configuration |
| `npm run env:cleanup` | Remove duplicate variables |

### 🧪 Test Commands
| Command | Description |
|---------|-------------|
| `npm run test:hue-streaming` | Test core streaming functionality |
| `npm run test:hue-effects` | Test visual effects |

## 📋 Script Organization

- **Management Scripts**: Complete tools for setup and configuration
- **Test Scripts**: Focused testing of specific functionality
- **NPM Integration**: Easy-to-remember npm run commands
- **No clutter**: Removed redundant debug scripts and consolidated functionality

## 🛠️ Development

All scripts use ES modules and expect the project to be built (`npm run build`) for testing functionality that depends on compiled TypeScript files.

For adding new scripts:
1. Use `#!/usr/bin/env node` shebang
2. Include clear documentation header
3. Provide help/usage information
4. Handle errors gracefully
5. Follow the established naming convention

## 🔍 Troubleshooting

If scripts fail:
1. Ensure the project is built: `npm run build`
2. Check environment variables: `node scripts/env-manager.js validate`
3. Verify Hue configuration: `node scripts/hue-manager.js debug`
4. Test basic connectivity: `node scripts/hue-manager.js validate`