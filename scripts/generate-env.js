#!/usr/bin/env node

/**
 * Generate an up-to-date .env file for JSRekordFXBridge
 * This script creates a comprehensive .env file with all available configuration options
 */

import * as fs from 'fs';
import * as path from 'path';

function generateEnvFile() {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');
  
  console.log('🔧 Generating up-to-date .env file...\n');

  const envContent = `# ===================================================
# JSRekordFXBridge Configuration
# Generated on ${new Date().toISOString()}
# ===================================================

# ===================================================
# DEMO MODE
# ===================================================
# Set to true to use mock hardware for testing/development
# Set to false to connect to real hardware
DEMO_MODE=true

# ===================================================
# PHILIPS HUE CONFIGURATION
# ===================================================
# Bridge IP address (find via Hue app or run: npm run setup-hue)
HUE_BRIDGE_IP=

# Bridge ID (automatically discovered during setup)
HUE_BRIDGE_ID=

# Username for API access (generated during setup)
HUE_USERNAME=
HUE_USER_ID=

# Client key for Entertainment API (generated during setup)
HUE_CLIENT_KEY=

# Entertainment group settings
HUE_ENTERTAINMENT_GROUP_ID=
HUE_ENTERTAINMENT_GROUP_NAME=
HUE_LIGHT_COUNT=

# Hue behavior settings
HUE_USE_STREAMING=true
HUE_MAX_BRIGHTNESS=254
HUE_TRANSITION_TIME=300

# ===================================================
# DMX CONFIGURATION
# ===================================================
# DMX interface driver
DMX_DRIVER=enttec-usb-dmx-pro

# Serial device path (adjust for your system)
# macOS: /dev/tty.usbserial-XXXXXXXX
# Linux: /dev/ttyUSB0
# Windows: COM3
DMX_DEVICE=/dev/ttyUSB0

# DMX universe and channel settings
DMX_UNIVERSE=1
DMX_CHANNELS=512

# ===================================================
# MIDI CONFIGURATION  
# ===================================================
# MIDI device names (use 'auto' for automatic detection)
MIDI_INPUT_DEVICE=auto
MIDI_OUTPUT_DEVICE=auto

# Controller type (auto-detect or specify: pioneer-djm, traktor, etc.)
MIDI_CONTROLLER_TYPE=auto

# Custom MIDI mappings (JSON format)
MIDI_MAPPINGS={}

# ===================================================
# BEAT DETECTION CONFIGURATION
# ===================================================
# Beat detection sensitivity (0.0 - 1.0)
BEAT_THRESHOLD=0.6

# Audio analysis window size (samples)
BEAT_WINDOW_SIZE=1024

# Minimum time between beats (milliseconds)
BEAT_MIN_INTERVAL=150

# Beat detection decay factor (0.0 - 1.0)
BEAT_DECAY=0.95

# ===================================================
# EFFECTS CONFIGURATION
# ===================================================
# Directory containing effect definitions
EFFECTS_DIRECTORY=./effects

# Preload all effects at startup
EFFECTS_PRELOAD=true

# Enable effect caching for better performance
EFFECTS_ENABLE_CACHE=true

# Reload effects when files change (development mode)
EFFECTS_RELOAD_ON_CHANGE=false

# ===================================================
# SYSTEM CONFIGURATION
# ===================================================
# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=false

# API server port (if running web interface)
API_PORT=3000

# ===================================================
# ADVANCED SETTINGS
# ===================================================
# Maximum frames per second for light updates
MAX_FPS=30

# Network timeout for device connections (milliseconds)
NETWORK_TIMEOUT=5000

# Retry attempts for failed connections
CONNECTION_RETRIES=3

# ===================================================
# QUICK SETUP COMMANDS
# ===================================================
# Run these commands to configure your system:
#
# 1. Set up Hue bridge:
#    npm run setup-hue
#
# 2. Validate configuration:
#    npm run setup-hue validate
#
# 3. Start in demo mode:
#    npm run demo
#
# 4. Start with real hardware:
#    npm start
#
# ===================================================
`;

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    console.log(`📦 Backing up existing .env to: ${path.basename(backupPath)}`);
    fs.copyFileSync(envPath, backupPath);
  }

  // Write the new .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Generated .env file at: ${envPath}\n`);
  console.log('📝 Next steps:');
  console.log('  1. Edit the .env file with your specific settings');
  console.log('  2. Run: npm run setup-hue (to configure Hue bridge)');
  console.log('  3. Set DEMO_MODE=false when ready for real hardware');
  console.log('  4. Run: npm start\n');
  
  console.log('💡 Pro tip: Use "npm run setup-hue validate" to test your configuration');
}

// Run the generator
try {
  generateEnvFile();
} catch (error) {
  console.error('❌ Failed to generate .env file:', error.message);
  process.exit(1);
}