#!/usr/bin/env node

/**
 * Comprehensive Hue Setup and Testing Script
 * This script combines setup, validation, testing, and debugging functionality
 */

import { HueSetupCLI } from '../dist/infrastructure/hue/hue-setup-cli.js';
import { HueLightController } from '../dist/infrastructure/lighting/hue-light-controller.js';
import { HueEntertainmentSetup } from '../dist/infrastructure/hue/hue-entertainment-setup.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const COMMANDS = {
  'setup': 'Interactive Hue bridge setup and authentication',
  'validate': 'Validate current Hue configuration',
  'list-groups': 'List all Entertainment groups on the bridge',
  'test-streaming': 'Test Entertainment streaming functionality',
  'test-effects': 'Test strobo and color sweep effects',
  'debug': 'Debug groups and connection issues',
  'fix-groups': 'Fix Entertainment group class issues',
  'help': 'Show this help message'
};

async function showHelp() {
  console.log(`
🎪 JSRekordFXBridge Hue Management Tool
======================================

Available commands:
`);
  
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(15)} - ${desc}`);
  });
  
  console.log(`
Usage:
  node scripts/hue-manager.js <command> [options]
  
Examples:
  node scripts/hue-manager.js setup                    # Interactive setup
  node scripts/hue-manager.js validate                 # Check configuration
  node scripts/hue-manager.js test-streaming           # Test Entertainment streaming
  node scripts/hue-manager.js list-groups              # Show all Entertainment groups
  node scripts/hue-manager.js debug                    # Debug connection issues
`);
}

async function setupHue(ipAddress) {
  const cli = new HueSetupCLI();
  
  if (ipAddress) {
    await cli.setupWithIP(ipAddress);
  } else {
    await cli.interactiveSetup();
  }
}

async function validateConfig() {
  console.log('🔍 Validating Hue configuration...');
  
  if (!process.env.HUE_BRIDGE_IP || !process.env.HUE_USERNAME) {
    console.log('❌ Missing required environment variables. Run setup first.');
    return false;
  }
  
  try {
    const controller = new HueLightController({
      bridgeIp: process.env.HUE_BRIDGE_IP,
      username: process.env.HUE_USERNAME,
      clientKey: process.env.HUE_CLIENT_KEY,
      entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP_ID
    });
    
    await controller.connect();
    console.log('✅ Bridge connection successful');
    
    const devices = await controller.getDevices();
    console.log(`✅ Found ${devices.length} lights`);
    
    if (process.env.HUE_ENTERTAINMENT_GROUP_ID) {
      console.log(`✅ Entertainment group ${process.env.HUE_ENTERTAINMENT_GROUP_ID} configured`);
    } else {
      console.log('⚠️  No Entertainment group configured');
    }
    
    await controller.disconnect();
    return true;
    
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
    return false;
  }
}

async function listGroups() {
  console.log('📋 Listing Entertainment groups...');
  
  try {
    const setup = new HueEntertainmentSetup(
      process.env.HUE_BRIDGE_IP,
      process.env.HUE_USERNAME
    );
    
    const groups = await setup.listEntertainmentGroups();
    
    if (groups.length === 0) {
      console.log('❌ No Entertainment groups found');
      return;
    }
    
    console.log(`✅ Found ${groups.length} Entertainment groups:`);
    groups.forEach(group => {
      console.log(`
  Group ${group.id}: ${group.name}
  Class: ${group.class}
  Type: ${group.type}
  Lights: [${group.lights.join(', ')}]
  Stream: ${group.stream ? 'Available' : 'Not available'}
      `);
    });
  } catch (error) {
    console.log('❌ Failed to list groups:', error.message);
  }
}

async function testStreaming() {
  console.log('🧪 Testing Entertainment streaming...');
  
  if (!process.env.HUE_ENTERTAINMENT_GROUP_ID) {
    console.log('❌ No Entertainment group configured. Run setup first.');
    return;
  }
  
  const controller = new HueLightController({
    bridgeIp: process.env.HUE_BRIDGE_IP,
    username: process.env.HUE_USERNAME,
    clientKey: process.env.HUE_CLIENT_KEY,
    entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP_ID
  });

  try {
    console.log('🔌 Connecting...');
    await controller.connect();
    
    console.log('🎭 Testing quick color flash...');
    const colors = [
      { r: 255, g: 0, b: 0 },   // Red
      { r: 0, g: 255, b: 0 },   // Green
      { r: 0, g: 0, b: 255 },   // Blue
    ];
    
    for (const color of colors) {
      await controller.setAllLights(color, { value: 254 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('⚫ Blackout...');
    await controller.setAllLights({ r: 0, g: 0, b: 0 }, { value: 0 });
    
    console.log('✅ Streaming test completed successfully!');
    
  } catch (error) {
    console.log('❌ Streaming test failed:', error.message);
  } finally {
    try {
      await controller.stopEntertainmentStream();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

async function testEffects() {
  console.log('🎆 Testing strobo and color effects...');
  
  const controller = new HueLightController({
    bridgeIp: process.env.HUE_BRIDGE_IP,
    username: process.env.HUE_USERNAME,
    clientKey: process.env.HUE_CLIENT_KEY,
    entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP_ID
  });

  try {
    await controller.connect();
    
    // Strobo effect
    console.log('💡 Strobo effect...');
    for (let i = 0; i < 6; i++) {
      const isOn = i % 2 === 0;
      const color = isOn ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 0 };
      const intensity = isOn ? { value: 254 } : { value: 0 };
      
      await controller.setAllLights(color, intensity);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Color sweep
    console.log('🌈 Color sweep...');
    const colors = [
      { r: 255, g: 0, b: 0 },   // Red
      { r: 255, g: 165, b: 0 }, // Orange
      { r: 255, g: 255, b: 0 }, // Yellow
      { r: 0, g: 255, b: 0 },   // Green
      { r: 0, g: 0, b: 255 },   // Blue
      { r: 75, g: 0, b: 130 }   // Indigo
    ];
    
    for (const color of colors) {
      await controller.setAllLights(color, { value: 254 });
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    console.log('⚫ Final blackout...');
    await controller.setAllLights({ r: 0, g: 0, b: 0 }, { value: 0 });
    
    console.log('✅ Effects test completed!');
    
  } catch (error) {
    console.log('❌ Effects test failed:', error.message);
  } finally {
    try {
      await controller.stopEntertainmentStream();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

async function debugGroups() {
  console.log('🔧 Debugging groups and connections...');
  
  try {
    // Check environment
    console.log('\n📋 Environment Check:');
    console.log(`Bridge IP: ${process.env.HUE_BRIDGE_IP || 'Not set'}`);
    console.log(`Username: ${process.env.HUE_USERNAME ? 'Set' : 'Not set'}`);
    console.log(`Client Key: ${process.env.HUE_CLIENT_KEY ? 'Set' : 'Not set'}`);
    console.log(`Entertainment Group: ${process.env.HUE_ENTERTAINMENT_GROUP_ID || 'Not set'}`);
    
    if (!process.env.HUE_BRIDGE_IP || !process.env.HUE_USERNAME) {
      console.log('\n❌ Missing required configuration. Run setup first.');
      return;
    }
    
    // Test basic connection
    const controller = new HueLightController({
      bridgeIp: process.env.HUE_BRIDGE_IP,
      username: process.env.HUE_USERNAME,
      clientKey: process.env.HUE_CLIENT_KEY,
      entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP_ID
    });
    
    console.log('\n🔗 Testing connection...');
    await controller.connect();
    console.log('✅ Bridge connection successful');
    
    // List all groups with details
    console.log('\n📋 All groups on bridge:');
    const setup = new HueEntertainmentSetup(
      process.env.HUE_BRIDGE_IP,
      process.env.HUE_USERNAME
    );
    
    const allGroups = await setup.listAllGroups();
    allGroups.forEach(group => {
      const isEntertainment = group.type === 'Entertainment';
      const status = isEntertainment ? '🎭 Entertainment' : '💡 Regular';
      console.log(`  ${status} | Group ${group.id}: ${group.name} (${group.class || 'No class'})`);
    });
    
    await controller.disconnect();
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
    console.log('Full error:', error);
  }
}

async function fixGroups() {
  console.log('🔧 Fixing Entertainment group class issues...');
  
  try {
    const setup = new HueEntertainmentSetup(
      process.env.HUE_BRIDGE_IP,
      process.env.HUE_USERNAME
    );
    
    const groups = await setup.listEntertainmentGroups();
    let fixed = 0;
    
    for (const group of groups) {
      if (!group.class || group.class === 'null' || group.class === 'undefined') {
        console.log(`🔧 Fixing group ${group.id}: ${group.name}`);
        await setup.fixGroupClass(group.id);
        fixed++;
      }
    }
    
    if (fixed > 0) {
      console.log(`✅ Fixed ${fixed} groups`);
    } else {
      console.log('✅ All groups are already properly configured');
    }
    
  } catch (error) {
    console.log('❌ Fix failed:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const option = args[1];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }
  
  switch (command) {
    case 'setup':
      await setupHue(option);
      break;
    case 'validate':
      await validateConfig();
      break;
    case 'list-groups':
      await listGroups();
      break;
    case 'test-streaming':
      await testStreaming();
      break;
    case 'test-effects':
      await testEffects();
      break;
    case 'debug':
      await debugGroups();
      break;
    case 'fix-groups':
      await fixGroups();
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Run "node scripts/hue-manager.js help" for available commands');
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});