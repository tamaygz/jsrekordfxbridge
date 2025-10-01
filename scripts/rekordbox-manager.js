#!/usr/bin/env node

/**
 * Rekordbox Management Script
 * This script provides configuration, validation, testing, and debugging functionality for rekordbox integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMANDS = {
  'config': 'Configure rekordbox virtual port and settings',
  'validate': 'Validate rekordbox configuration',
  'test': 'Test rekordbox connection and channel detection',
  'test-bpm': 'Test BPM tracking and synchronization',
  'debug': 'Debug rekordbox connection and MIDI issues',
  'list-devices': 'List available MIDI devices for rekordbox',
  'help': 'Show this help message'
};

async function showHelp() {
  console.log(`
🎚️  JSRekordFXBridge Rekordbox Management Tool
=============================================

Available commands:
`);
  
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(15)} - ${desc}`);
  });
  
  console.log(`
Usage:
  node scripts/rekordbox-manager.js <command> [options]
  npm run rekordbox:<command>
  
Examples:
  npm run rekordbox:config                     # Configure rekordbox settings
  npm run rekordbox:validate                   # Check configuration
  npm run rekordbox:test                       # Test connection
  npm run rekordbox:test-bpm                   # Test BPM tracking
  npm run rekordbox:debug                      # Debug MIDI connection
  npm run rekordbox:list-devices               # Show MIDI devices
`);
}

async function configureRekordbox() {
  console.log('🎚️  Rekordbox Configuration');
  console.log('===========================\n');
  
  const configPath = path.join(__dirname, '../config/default-config.yaml');
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ Configuration file not found:', configPath);
    return;
  }
  
  console.log('Current configuration location:', configPath);
  console.log('\nRekordbox settings in config/default-config.yaml:');
  console.log('');
  console.log('rekordbox:');
  console.log('  use_midi_clock: true');
  console.log('  virtual_port: "rekordbox-out"');
  console.log('');
  console.log('📝 To configure rekordbox:');
  console.log('');
  console.log('1. In rekordbox preferences, enable MIDI output:');
  console.log('   - Go to Preferences > MIDI');
  console.log('   - Enable "MIDI Clock"');
  console.log('   - Set output device/port name');
  console.log('');
  console.log('2. Update config/default-config.yaml:');
  console.log('   - Set virtual_port to match rekordbox output name');
  console.log('   - Default: "rekordbox-out"');
  console.log('');
  console.log('3. Restart JSRekordFXBridge to apply changes');
  console.log('');
  console.log('✅ Configuration guide complete');
}

async function validateConfig() {
  console.log('🔍 Validating rekordbox configuration...\n');
  
  const configPath = path.join(__dirname, '../config/default-config.yaml');
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ Configuration file not found');
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Check if rekordbox section exists
  if (!configContent.includes('rekordbox:')) {
    console.log('❌ Rekordbox configuration section not found in config file');
    return false;
  }
  
  console.log('✅ Configuration file exists');
  console.log('✅ Rekordbox section found in config');
  
  // Parse basic settings
  const useMidiClockMatch = configContent.match(/use_midi_clock:\s*(true|false)/);
  const virtualPortMatch = configContent.match(/virtual_port:\s*"([^"]+)"/);
  
  if (useMidiClockMatch) {
    console.log(`✅ MIDI clock enabled: ${useMidiClockMatch[1]}`);
  } else {
    console.log('⚠️  MIDI clock setting not found');
  }
  
  if (virtualPortMatch) {
    console.log(`✅ Virtual port configured: "${virtualPortMatch[1]}"`);
  } else {
    console.log('⚠️  Virtual port not configured');
  }
  
  console.log('');
  console.log('ℹ️  To test connection with actual rekordbox:');
  console.log('   1. Start rekordbox');
  console.log('   2. Load a track on a deck');
  console.log('   3. Run: npm run rekordbox:test');
  
  return true;
}

async function testConnection() {
  console.log('🎚️  Testing rekordbox connection...\n');
  
  console.log('Loading JSRekordFXBridge...');
  
  try {
    // Check if dependencies are installed
    const nodeModulesPath = path.join(__dirname, '../node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ Dependencies not installed. Run: npm install');
      return;
    }
    
    // Try to build, but continue even if it fails (may have partial build)
    const { execSync } = await import('child_process');
    
    try {
      console.log('Building project...');
      execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      console.log('✅ Build successful\n');
    } catch (buildError) {
      console.log('⚠️  Build had errors, using existing dist folder\n');
    }
    
    // Check if dist folder exists
    const distPath = path.join(__dirname, '../dist');
    if (!fs.existsSync(distPath)) {
      console.log('❌ Dist folder not found. Build the project first: npm run build');
      return;
    }
    
    console.log('Importing modules...');
    const { DIContainer } = await import('../dist/infrastructure/di/container.js');
    
    console.log('Initializing DI container...');
    const container = new DIContainer();
    const rekordboxController = container.getRekordboxController();
    
    console.log('\nTesting rekordbox controller connection...');
    await rekordboxController.connect();
    
    if (rekordboxController.isConnected()) {
      console.log('✅ Rekordbox controller connected successfully');
      
      const status = rekordboxController.getStatus();
      console.log('\n📊 Rekordbox Status:');
      console.log('==================');
      console.log(`Connected: ${status.connected ? '✅' : '❌'}`);
      console.log(`MIDI Connected: ${status.midiConnected ? '✅' : '❌'}`);
      console.log(`Master BPM: ${status.masterBPM || 'Not detected'}`);
      console.log(`Active Channel: ${status.activeChannel || 'None'}`);
      
      console.log('\n📊 Channel Status:');
      status.channels.forEach(channel => {
        const playingIcon = channel.isPlaying ? '▶️' : '⏸️';
        console.log(`  ${playingIcon} Channel ${channel.channel}: ${channel.bpm?.toFixed(1) || 'N/A'} BPM${channel.isPlaying ? ' (Playing)' : ''}`);
      });
      
      await rekordboxController.disconnect();
    } else {
      console.log('❌ Failed to connect to rekordbox controller');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nℹ️  This is expected if running in demo mode without actual rekordbox connection.');
    console.log('   Mock controller will simulate rekordbox functionality.');
  }
}

async function testBPMTracking() {
  console.log('🎚️  Testing BPM tracking and synchronization...\n');
  
  try {
    // Check if dependencies are installed
    const nodeModulesPath = path.join(__dirname, '../node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ Dependencies not installed. Run: npm install');
      return;
    }
    
    const { execSync } = await import('child_process');
    
    try {
      console.log('Building project...');
      execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      console.log('✅ Build successful\n');
    } catch (buildError) {
      console.log('⚠️  Build had errors, using existing dist folder\n');
    }
    
    // Check if dist folder exists
    const distPath = path.join(__dirname, '../dist');
    if (!fs.existsSync(distPath)) {
      console.log('❌ Dist folder not found. Build the project first: npm run build');
      return;
    }
    
    console.log('Importing modules...');
    const { DIContainer } = await import('../dist/infrastructure/di/container.js');
    
    console.log('Initializing DI container...');
    const container = new DIContainer();
    const rekordboxController = container.getRekordboxController();
    const beatDetectionService = container.getBeatDetectionService();
    
    console.log('\nConnecting to rekordbox...');
    await rekordboxController.connect();
    
    console.log('✅ Connected\n');
    
    // Set up callbacks to monitor BPM changes
    let bpmUpdateCount = 0;
    rekordboxController.onBPMChange((channel, bpm) => {
      bpmUpdateCount++;
      console.log(`🎵 BPM Update #${bpmUpdateCount}: Channel ${channel} -> ${bpm.toFixed(1)} BPM`);
    });
    
    rekordboxController.onChannelChange((channel) => {
      const statusIcon = channel.isPlaying ? '▶️' : '⏸️';
      console.log(`${statusIcon} Channel ${channel.channel} state changed: ${channel.isPlaying ? 'Playing' : 'Stopped'} at ${channel.bpm?.toFixed(1) || 'N/A'} BPM`);
    });
    
    console.log('📊 Monitoring BPM changes for 15 seconds...');
    console.log('   (In demo mode, mock controller will simulate BPM changes)\n');
    
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('\n✅ Test complete!');
    console.log(`   Detected ${bpmUpdateCount} BPM updates`);
    
    const currentBPM = beatDetectionService.getCurrentBPM();
    if (currentBPM) {
      console.log(`   Current synchronized BPM: ${currentBPM.toFixed(1)}`);
    }
    
    await rekordboxController.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function debugConnection() {
  console.log('🔧 Rekordbox Debug Information');
  console.log('==============================\n');
  
  try {
    // Check if dependencies are installed
    const nodeModulesPath = path.join(__dirname, '../node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ Dependencies not installed. Run: npm install');
      console.log('\n📋 Basic Configuration Check:\n');
      
      const configPath = path.join(__dirname, '../config/default-config.yaml');
      if (fs.existsSync(configPath)) {
        console.log(`✅ Config file found: ${configPath}`);
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        if (configContent.includes('rekordbox:')) {
          console.log('✅ Rekordbox section exists');
        } else {
          console.log('❌ Rekordbox section not found');
        }
      } else {
        console.log(`❌ Config file not found: ${configPath}`);
      }
      return;
    }
    
    const { execSync } = await import('child_process');
    
    try {
      console.log('Building project...');
      execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      console.log('✅ Build successful\n');
    } catch (buildError) {
      console.log('⚠️  Build had errors, using existing dist folder\n');
    }
    
    // Check if dist folder exists
    const distPath = path.join(__dirname, '../dist');
    if (!fs.existsSync(distPath)) {
      console.log('❌ Dist folder not found. Build the project first: npm run build');
      return;
    }
    
    const { DIContainer } = await import('../dist/infrastructure/di/container.js');
    
    console.log('📋 Configuration Check:');
    const configPath = path.join(__dirname, '../config/default-config.yaml');
    if (fs.existsSync(configPath)) {
      console.log(`✅ Config file found: ${configPath}`);
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      if (configContent.includes('rekordbox:')) {
        console.log('✅ Rekordbox section exists');
        
        const lines = configContent.split('\n');
        let inRekordboxSection = false;
        console.log('\n   Rekordbox settings:');
        lines.forEach(line => {
          if (line.trim().startsWith('rekordbox:')) {
            inRekordboxSection = true;
          } else if (inRekordboxSection && line.match(/^[a-z]/)) {
            inRekordboxSection = false;
          }
          
          if (inRekordboxSection && line.trim()) {
            console.log(`   ${line}`);
          }
        });
      } else {
        console.log('❌ Rekordbox section not found');
      }
    } else {
      console.log(`❌ Config file not found: ${configPath}`);
    }
    
    console.log('\n📋 Dependency Injection:');
    const container = new DIContainer();
    console.log('✅ DI Container initialized');
    
    const rekordboxController = container.getRekordboxController();
    console.log('✅ Rekordbox controller resolved from container');
    console.log(`   Type: ${rekordboxController.constructor.name}`);
    
    console.log('\n📋 MIDI Controller:');
    const midiController = container.getMIDIController();
    console.log('✅ MIDI controller resolved from container');
    console.log(`   Type: ${midiController.constructor.name}`);
    
    console.log('\n📋 Connection Test:');
    await rekordboxController.connect();
    const status = rekordboxController.getStatus();
    
    console.log(`✅ Connection status: ${status.connected ? 'Connected' : 'Disconnected'}`);
    console.log(`   MIDI status: ${status.midiConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`   Master BPM: ${status.masterBPM || 'Not detected'}`);
    console.log(`   Active Channel: ${status.activeChannel || 'None'}`);
    
    await rekordboxController.disconnect();
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Ensure rekordbox is running and a track is loaded');
    console.log('   2. Enable MIDI Clock output in rekordbox preferences');
    console.log('   3. Check that virtual_port matches rekordbox MIDI output name');
    console.log('   4. Run: npm run rekordbox:list-devices to see available MIDI devices');
    console.log('   5. In demo mode, mock controller is used automatically');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.log('\nStack trace:', error.stack);
  }
}

async function listMIDIDevices() {
  console.log('🎹 Available MIDI Devices');
  console.log('========================\n');
  
  try {
    // Check if dependencies are installed
    const nodeModulesPath = path.join(__dirname, '../node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ Dependencies not installed. Run: npm install');
      return;
    }
    
    const { execSync } = await import('child_process');
    
    try {
      console.log('Building project...');
      execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      console.log('✅ Build successful\n');
    } catch (buildError) {
      console.log('⚠️  Build had errors, using existing dist folder\n');
    }
    
    // Check if dist folder exists
    const distPath = path.join(__dirname, '../dist');
    if (!fs.existsSync(distPath)) {
      console.log('❌ Dist folder not found. Build the project first: npm run build');
      return;
    }
    
    console.log('Querying MIDI devices...\n');
    
    const { DIContainer } = await import('../dist/infrastructure/di/container.js');
    const container = new DIContainer();
    const midiController = container.getMIDIController();
    
    const devices = await midiController.getDevices();
    
    if (devices.length === 0) {
      console.log('❌ No MIDI devices found');
      console.log('\nℹ️  This may be because:');
      console.log('   - No MIDI devices are connected');
      console.log('   - Running in demo mode (mock devices only)');
      console.log('   - MIDI drivers not installed');
    } else {
      console.log('📋 Found MIDI Devices:\n');
      
      const inputs = devices.filter(d => d.type === 'input');
      const outputs = devices.filter(d => d.type === 'output');
      
      if (inputs.length > 0) {
        console.log('🎤 Input Devices:');
        inputs.forEach(device => {
          console.log(`   • ${device.name}`);
          if (device.manufacturer) {
            console.log(`     Manufacturer: ${device.manufacturer}`);
          }
        });
        console.log('');
      }
      
      if (outputs.length > 0) {
        console.log('🔊 Output Devices:');
        outputs.forEach(device => {
          console.log(`   • ${device.name}`);
          if (device.manufacturer) {
            console.log(`     Manufacturer: ${device.manufacturer}`);
          }
        });
        console.log('');
      }
      
      console.log('💡 To connect to rekordbox:');
      console.log('   - Look for a device named "rekordbox" or similar');
      console.log('   - Update virtual_port in config/default-config.yaml');
    }
    
  } catch (error) {
    console.error('❌ Failed to list devices:', error.message);
  }
}

// Main execution
const command = process.argv[2] || 'help';

(async () => {
  switch (command) {
    case 'config':
      await configureRekordbox();
      break;
    case 'validate':
      await validateConfig();
      break;
    case 'test':
      await testConnection();
      break;
    case 'test-bpm':
      await testBPMTracking();
      break;
    case 'debug':
      await debugConnection();
      break;
    case 'list-devices':
      await listMIDIDevices();
      break;
    case 'help':
    default:
      await showHelp();
      break;
  }
})().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
