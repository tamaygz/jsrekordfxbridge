#!/usr/bin/env node

/**
 * Environment Configuration Manager
 * Generate, clean, and validate .env files
 */

import * as fs from 'fs';
import * as path from 'path';

const ENV_TEMPLATE = `# ===================================================
# JSRekordFXBridge Configuration
# Generated on ${new Date().toISOString()}
# ===================================================

# ===================================================
# PHILIPS HUE CONFIGURATION
# ===================================================
# Run 'node scripts/hue-manager.js setup' to configure

HUE_BRIDGE_IP=
HUE_USERNAME=
HUE_CLIENT_KEY=
HUE_ENTERTAINMENT_GROUP_ID=

# Hue behavior settings
HUE_USE_STREAMING=true
HUE_MAX_BRIGHTNESS=254
HUE_TRANSITION_TIME=300

# ===================================================
# DEMO MODE
# ===================================================
# Set to false to enable real hardware mode
DEMO_MODE=false

# ===================================================
# DMX CONFIGURATION
# ===================================================
# DMX interface driver
# DMX_DRIVER=enttec-usb-dmx-pro

# Serial device path (adjust for your system)
# macOS: /dev/tty.usbserial-XXXXXXXX
# Linux: /dev/ttyUSB0
# Windows: COM3
# DMX_DEVICE=/dev/ttyUSB0

# ===================================================
# MIDI CONFIGURATION  
# ===================================================
# MIDI device names (use 'auto' for automatic detection)
MIDI_INPUT_DEVICE=auto
MIDI_OUTPUT_DEVICE=auto

# Controller type (auto-detect or specify: pioneer-djm, traktor, etc.)
MIDI_CONTROLLER_TYPE=auto

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
`;

function generateEnv() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists');
    console.log('Use "cleanup" command to clean duplicates or backup and delete first');
    return;
  }
  
  fs.writeFileSync(envPath, ENV_TEMPLATE);
  console.log('✅ Generated new .env file');
  console.log('📝 Next steps:');
  console.log('   1. Run: node scripts/hue-manager.js setup');
  console.log('   2. Configure other settings as needed');
}

function cleanupEnv() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ No .env file found');
    return;
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const variables = new Map();
  const cleanedLines = [];
  
  // Keep comments and process variables
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === '' || trimmed.startsWith('#')) {
      cleanedLines.push(line);
      continue;
    }
    
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=');
      variables.set(key, value);
    }
  }
  
  // Add unique variables at the end
  for (const [key, value] of variables) {
    cleanedLines.push(`${key}=${value}`);
  }
  
  const cleaned = cleanedLines.join('\n');
  fs.writeFileSync(envPath, cleaned);
  
  console.log(`✅ Cleaned .env file - removed duplicates`);
  console.log(`📊 Found ${variables.size} unique variables`);
}

function validateEnv() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ No .env file found');
    console.log('Run: node scripts/env-manager.js generate');
    return;
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const variables = new Map();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        const value = valueParts.join('=');
        variables.set(key, value);
      }
    }
  }
  
  console.log(`📋 Environment Configuration (${variables.size} variables)`);
  console.log('='.repeat(50));
  
  // Check critical Hue settings
  const hueVars = ['HUE_BRIDGE_IP', 'HUE_USERNAME', 'HUE_CLIENT_KEY', 'HUE_ENTERTAINMENT_GROUP_ID'];
  console.log('\n🌉 Hue Configuration:');
  for (const hueVar of hueVars) {
    const value = variables.get(hueVar);
    const status = value && value.trim() ? '✅' : '❌';
    console.log(`  ${status} ${hueVar}: ${value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'Not set'}`);
  }
  
  // Check other settings
  console.log('\n⚙️  System Settings:');
  const systemVars = ['DEMO_MODE', 'LOG_LEVEL', 'MAX_FPS'];
  for (const sysVar of systemVars) {
    const value = variables.get(sysVar);
    console.log(`  ${sysVar}: ${value || 'Not set'}`);
  }
}

function showHelp() {
  console.log(`
🔧 JSRekordFXBridge Environment Manager
======================================

Commands:
  generate   - Create a new .env file template
  cleanup    - Remove duplicate variables from .env
  validate   - Show current environment configuration
  help       - Show this help message

Usage:
  node scripts/env-manager.js <command>

Examples:
  node scripts/env-manager.js generate     # Create new .env file
  node scripts/env-manager.js cleanup      # Clean existing .env file
  node scripts/env-manager.js validate     # Check current configuration
`);
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      generateEnv();
      break;
    case 'cleanup':
      cleanupEnv();
      break;
    case 'validate':
      validateEnv();
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      showHelp();
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      showHelp();
  }
}

main();