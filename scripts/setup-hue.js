#!/usr/bin/env node

/**
 * Simple setup script for JSRekordFXBridge Hue integration
 * This script will guide you through the complete setup process
 */

import { HueSetupCLI } from '../src/infrastructure/hue/hue-setup-cli.js';

async function main() {
  const args = process.argv.slice(2);
  const firstArg = args[0];
  
  // Check if first argument is a command or an IP address
  const isCommand = ['validate', 'test', 'help', '--help', '-h'].includes(firstArg);
  const command = isCommand ? firstArg : null;
  const ipAddress = isCommand ? args[1] : firstArg;

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
    } else if (command === 'help' || firstArg === '--help' || firstArg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      // Check if manual IP was provided
      if (ipAddress && ipAddress !== 'validate' && ipAddress !== 'help') {
        console.log(`🚀 Starting manual Hue setup with IP: ${ipAddress}...\n`);
        const result = await cli.setupHueManual(ipAddress);
        
        if (result.success) {
          console.log('🎉 Manual setup completed successfully!');
          console.log('\nNext steps:');
          console.log('  1. Review your .env file');
          console.log('  2. Set DEMO_MODE=false');  
          console.log('  3. Start your application');
          console.log('  4. Test with: npm run setup-hue validate');
          process.exit(0);
        } else {
          console.log(`❌ Manual setup failed: ${result.error}`);
          process.exit(1);
        }
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
  console.log('  npm run setup-hue                # Run complete setup process');
  console.log('  npm run setup-hue 192.168.1.3    # Manual setup with specific IP');
  console.log('  npm run setup-hue validate       # Test existing configuration');  
  console.log('  npm run setup-hue help           # Show this help message');
  console.log('  npm run generate-env             # Create up-to-date .env file');
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
  console.log('Pro tips:');
  console.log('  • Run "npm run generate-env" first to create a clean .env file');
  console.log('  • Use the manual IP option if discovery finds wrong bridge');
  console.log('  • Press the physical link button on your bridge when prompted');
  console.log('');
}

// Run the CLI
main().catch(console.error);