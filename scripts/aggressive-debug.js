#!/usr/bin/env node

/**
 * Aggressive debug script to find hidden/corrupted Entertainment groups
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

  console.log('🔍 AGGRESSIVE Entertainment Area Search\n');
  console.log(`Bridge: ${bridgeIp}`);
  console.log(`Username: ${username}\n`);
  
  try {
    // Import node-hue-api directly
    const hueApi = await import('node-hue-api');
    const api = await hueApi.v3.api.createLocal(bridgeIp).connect(username);
    
    // Method 1: Try to make direct HTTP call to bridge API
    console.log('🔍 Method 1: Direct HTTP API call to bridge...\n');
    
    try {
      // This bypasses the node-hue-api validation entirely
      const https = await import('https');
      const url = `https://${bridgeIp}/api/${username}/groups`;
      
      console.log(`Making direct HTTPS request to: ${url}`);
      
      const options = {
        hostname: bridgeIp,
        port: 443,
        path: `/api/${username}/groups`,
        method: 'GET',
        rejectUnauthorized: false // Hue bridges use self-signed certificates
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const groups = JSON.parse(data);
            console.log(`✅ Raw API response received, parsing groups...\n`);
            
            let entertainmentCount = 0;
            Object.keys(groups).forEach(id => {
              const group = groups[id];
              console.log(`📍 Group ${id}: ${group.name} (Type: ${group.type}, Class: ${group.class || 'undefined'})`);
              
              if (group.type === 'Entertainment') {
                entertainmentCount++;
                console.log(`  🎭 *** ENTERTAINMENT GROUP FOUND! ***`);
                console.log(`     - ID: ${id}`);
                console.log(`     - Name: ${group.name}`);
                console.log(`     - Class: ${group.class}`);
                console.log(`     - Lights: ${group.lights ? group.lights.length : 0} lights`);
                console.log(`     - Stream Active: ${group.stream?.active || false}`);
                
                if (group.name.toLowerCase().includes('terrace')) {
                  console.log(`  🎯 *** THIS IS THE TERRACE ENTERTAINMENT GROUP! ***`);
                  console.log(`\n🎯 TERRACE ENTERTAINMENT GROUP CONFIGURATION:`);
                  console.log(`HUE_ENTERTAINMENT_GROUP_ID=${id}`);
                  console.log(`HUE_ENTERTAINMENT_GROUP_NAME=${group.name}`);
                  console.log(`HUE_LIGHT_COUNT=${group.lights ? group.lights.length : 0}`);
                }
              }
            });
            
            console.log(`\n📊 Direct API Summary:`);
            console.log(`  - Total groups found: ${Object.keys(groups).length}`);
            console.log(`  - Entertainment groups found: ${entertainmentCount}`);
            
          } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', parseError.message);
            console.log('Raw response:', data);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ HTTPS request failed:', error.message);
      });

      req.end();
      
    } catch (httpError) {
      console.log(`❌ Direct HTTP method failed: ${httpError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);