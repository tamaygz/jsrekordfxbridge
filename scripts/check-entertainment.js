#!/usr/bin/env node

/**
 * Simple script to list Entertainment groups and help with manual setup
 */

import { HueEntertainmentSetup } from '../src/infrastructure/hue/hue-entertainment-setup.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ No .env file found. Please run setup first.');
    return;
  }

  // Read environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  const bridgeIp = envVars.HUE_BRIDGE_IP;
  const username = envVars.HUE_USERNAME;
  const clientKey = envVars.HUE_CLIENT_KEY;

  if (!bridgeIp || !username) {
    console.log('❌ Missing bridge configuration. Please run setup first.');
    return;
  }

  console.log('🎭 Entertainment Groups Status\n');
  console.log(`Bridge: ${bridgeIp}`);
  console.log(`Username: ${username}`);
  console.log(`Client Key: ${clientKey ? 'Yes ✅' : 'No ❌'}\n`);

  try {
    const entertainmentSetup = new HueEntertainmentSetup(bridgeIp, username, clientKey);
    
    console.log('🔍 Checking for existing Entertainment groups...\n');
    
    const groups = await entertainmentSetup.getEntertainmentGroups();
    
    if (groups.length === 0) {
      console.log('❌ No Entertainment groups found.\n');
      console.log('📱 To create Entertainment groups:');
      console.log('1. Open the official Philips Hue app on your phone');
      console.log('2. Go to Settings → Entertainment areas');
      console.log('3. Create a new Entertainment area');
      console.log('4. Add the lights you want to control');
      console.log('5. Save the Entertainment area');
      console.log('6. Run this script again to detect the new group\n');
    } else {
      console.log(`✅ Found ${groups.length} Entertainment group(s):\n`);
      
      groups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.name} (ID: ${group.id})`);
        console.log(`   Type: ${group.type || 'Entertainment'}`);
        console.log(`   Lights: ${group.lights?.length || 0} configured`);
        if (group.lights && group.lights.length > 0) {
          group.lights.forEach(light => {
            console.log(`     - ${light.name || `Light ${light.id}`}`);
          });
        }
        console.log('');
      });

      // If groups exist, offer to update .env file
      if (groups.length > 0) {
        console.log('🔧 To use one of these groups:');
        console.log('1. Note the Group ID from above');
        console.log('2. Add it to your .env file:');
        console.log(`   HUE_ENTERTAINMENT_GROUP_ID=${groups[0].id}`);
        console.log(`   HUE_ENTERTAINMENT_GROUP_NAME=${groups[0].name}`);
        console.log('3. Run: npm run setup-hue validate');
      }
    }
    
  } catch (error) {
    console.log('❌ Error checking Entertainment groups:', error.message);
    console.log('\nThis might be because:');
    console.log('• No Entertainment groups exist yet');
    console.log('• API version compatibility issues');
    console.log('• Network connectivity problems\n');
    
    console.log('📱 Try creating Entertainment groups manually:');
    console.log('1. Open the Philips Hue app');
    console.log('2. Go to Settings → Entertainment areas');
    console.log('3. Create a new Entertainment area');
    console.log('4. Run this script again');
  }
}

main().catch(console.error);