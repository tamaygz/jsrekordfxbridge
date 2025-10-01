#!/usr/bin/env node

/**
 * Simple setup script for JSRekordFXBridge Hue integration
 * This script will guide you through the complete setup process
 */

import { HueSetupCLI } from '../src/infrastructure/hue/hue-setup-cli.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const cli = new HueSetupCLI();

  try {
    if (command === 'validate' || command === 'test') {
      console.log('🔍 Validating existing Hue setup...\n');
      const isValid = await cli.validateSetup();
      
      if (isValid) {
        console.log('✅ Your Hue setup is working correctly!');
        process.exit(0);
      } else {
        console.log('❌ Setup validation failed. Please run setup again.');
        process.exit(1);
      }
    } else if (command === 'help' || command === '--help' || command === '-h') {
      printHelp();
      process.exit(0);
    } else {
      // Default: run full setup
      console.log('🚀 Starting Hue setup process...\n');
      const result = await cli.setupHue();
      
      if (result.success) {
        console.log('🎉 Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('  1. Review your .env file');
        console.log('  2. Set DEMO_MODE=false');  
        console.log('  3. Start your application');
        console.log('  4. Test with: npm run setup-hue validate');
        process.exit(0);
      } else {
        console.log(`❌ Setup failed: ${result.error}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error?.message || error);
    console.log('\nIf this error persists, please check:');
    console.log('  • Your network connection');
    console.log('  • Hue bridge is powered on');
    console.log('  • Bridge is on the same network');
    console.log('  • Bridge has been set up with the Hue app');
    process.exit(1);
  }
}

function printHelp() {
  console.log('\n🌈 JSRekordFXBridge - Hue Setup Tool\n');
  console.log('Usage:');
  console.log('  npm run setup-hue           # Run complete setup process');
  console.log('  npm run setup-hue validate  # Test existing configuration');  
  console.log('  npm run setup-hue help      # Show this help message');
  console.log('');
  console.log('The setup process will:');
  console.log('  1. 🔍 Discover Hue bridges on your network');
  console.log('  2. 🔐 Authenticate with your bridge (requires link button press)');
  console.log('  3. 🎭 Set up Entertainment groups for synchronized lighting');
  console.log('  4. 🧪 Test Entertainment streaming');
  console.log('  5. ⚙️  Generate configuration files');
  console.log('');
  console.log('Prerequisites:');
  console.log('  • Philips Hue bridge connected to your network');
  console.log('  • Bridge set up via the official Hue app');
  console.log('  • This computer on the same network as the bridge');
  console.log('');
}

// Run the CLI
main().catch(console.error);