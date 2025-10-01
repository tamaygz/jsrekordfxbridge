#!/usr/bin/env node

/**
 * Debug script to check individual groups and bypass validation errors
 */

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

  console.log('🔍 Direct Bridge API Debugging\n');
  console.log(`Bridge: ${bridgeIp}`);
  console.log(`Username: ${username}`);
  
  try {
    // Import node-hue-api directly
    const hueApi = await import('node-hue-api');
    const api = await hueApi.v3.api.createLocal(bridgeIp).connect(username);
    
    console.log('\n🎭 Attempting to get Entertainment groups specifically...\n');
    
    // Method 1: Try the specific Entertainment groups API method
    try {
      console.log('🔍 Method 1: Using api.groups.getEntertainment()...');
      const entertainmentGroups = await api.groups.getEntertainment();
      console.log(`✅ Found ${entertainmentGroups.length} Entertainment groups directly:`);
      
      entertainmentGroups.forEach(group => {
        console.log(`  🎭 ${group.name} (ID: ${group.id})`);
        console.log(`     - Class: ${group.class}`);
        console.log(`     - Lights: ${group.lights ? group.lights.length : 0}`);
        console.log(`     - Stream Active: ${group.stream?.active || false}`);
        if (group.locations) {
          console.log(`     - Light Locations: ${Object.keys(group.locations).length} configured`);
        }
        console.log('');
      });
      
      if (entertainmentGroups.length > 0) {
        const terraceGroup = entertainmentGroups.find(g => g.name.toLowerCase().includes('terrace'));
        if (terraceGroup) {
          console.log(`🎯 Found Terrace Entertainment group!`);
          console.log(`Add this to your .env file:`);
          console.log(`HUE_ENTERTAINMENT_GROUP_ID=${terraceGroup.id}`);
          console.log(`HUE_ENTERTAINMENT_GROUP_NAME=${terraceGroup.name}`);
        } else {
          console.log(`🔧 Available Entertainment groups:`);
          entertainmentGroups.forEach(group => {
            console.log(`  HUE_ENTERTAINMENT_GROUP_ID=${group.id}  # ${group.name}`);
          });
        }
        return; // Success, exit early
      }
      
    } catch (entertainmentError) {
      console.log(`❌ Method 1 failed: ${entertainmentError.message}`);
    }
    
    // Method 2: Exhaustive individual group checking
    console.log('\n🔍 Method 2: Exhaustive individual group checking (1-100)...\n');
    
    const foundGroups = [];
    const entertainmentGroups = [];
    
    for (let i = 1; i <= 200; i++) {
      try {
        const group = await api.groups.getGroup(i);
        foundGroups.push(group);
        
        console.log(`📍 Group ${i}: ${group.name} (Type: ${group.type}, Class: ${group.class || 'undefined'})`);
        
        if (group.type === 'Entertainment') {
          entertainmentGroups.push(group);
          console.log(`  🎭 *** ENTERTAINMENT GROUP FOUND! ***`);
          console.log(`     - ID: ${group.id}`);
          console.log(`     - Name: ${group.name}`);
          console.log(`     - Class: ${group.class}`);
          console.log(`     - Lights: ${group.lights ? group.lights.length : 0} lights`);
          console.log(`     - Stream Active: ${group.stream?.active || false}`);
          console.log(`     - Locations: ${group.locations ? Object.keys(group.locations).length : 0} configured`);
          
          if (group.name.toLowerCase().includes('terrace')) {
            console.log(`  🎯 *** THIS IS THE TERRACE GROUP! ***`);
          }
        }
        
      } catch (err) {
        if (err.message.includes('not available') || err.message.includes('resource not available')) {
          // Group doesn't exist, continue silently
          continue;
        } else {
          console.log(`⚠️  Group ${i}: ${err.message}`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Total groups checked: 200`);
    console.log(`  - Total groups found: ${foundGroups.length}`);
    console.log(`  - Entertainment groups found: ${entertainmentGroups.length}`);
    
    if (entertainmentGroups.length > 0) {
      console.log(`\n🎭 All Entertainment Groups:`);
      entertainmentGroups.forEach(group => {
        console.log(`  - ${group.name} (ID: ${group.id}, Class: ${group.class})`);
      });
      
      const terraceGroup = entertainmentGroups.find(g => g.name.toLowerCase().includes('terrace'));
      if (terraceGroup) {
        console.log(`\n🎯 TERRACE ENTERTAINMENT GROUP CONFIGURATION:`);
        console.log(`HUE_ENTERTAINMENT_GROUP_ID=${terraceGroup.id}`);
        console.log(`HUE_ENTERTAINMENT_GROUP_NAME=${terraceGroup.name}`);
        console.log(`HUE_LIGHT_COUNT=${terraceGroup.lights ? terraceGroup.lights.length : 0}`);
      }
    }
    

    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);