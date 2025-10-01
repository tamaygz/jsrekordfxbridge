#!/usr/bin/env node

/**
 * Script to fix Entertainment group class from invalid values to "Other"
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
  const entertainmentGroupId = envVars.HUE_ENTERTAINMENT_GROUP_ID;

  console.log('🔧 Fixing Entertainment Group Class\n');
  console.log(`Bridge: ${bridgeIp}`);
  console.log(`Username: ${username}`);
  console.log(`Entertainment Group ID: ${entertainmentGroupId}\n`);
  
  if (!entertainmentGroupId) {
    console.log('❌ No Entertainment Group ID configured in .env file');
    return;
  }
  
  try {
    // Import node-hue-api directly
    const hueApi = await import('node-hue-api');
    const api = await hueApi.v3.api.createLocal(bridgeIp).connect(username);
    
    console.log('🔍 Getting current Entertainment group info...');
    
    // Get the group directly by ID (this should work even with invalid class)
    const group = await api.groups.getGroup(parseInt(entertainmentGroupId));
    
    console.log(`📍 Current group: ${group.name}`);
    console.log(`   Type: ${group.type}`);
    console.log(`   Class: ${group.class}`);
    console.log(`   Lights: ${group.lights ? group.lights.length : 0}`);
    
    if (group.type !== 'Entertainment') {
      console.log('❌ This is not an Entertainment group!');
      return;
    }
    
    if (group.class === 'Other') {
      console.log('✅ Group class is already set to "Other" - no changes needed!');
      return;
    }
    
    console.log(`\n🔧 Changing class from "${group.class}" to "Other"...`);
    
    // Update the group class
    group.class = 'Other';
    
    const result = await api.groups.updateGroupAttributes(group);
    
    if (result) {
      console.log('✅ Successfully updated Entertainment group class to "Other"!');
      
      // Verify the change
      const updatedGroup = await api.groups.getGroup(parseInt(entertainmentGroupId));
      console.log(`📍 Verified: ${updatedGroup.name} class is now "${updatedGroup.class}"`);
      
      console.log('\n🎉 Entertainment group is now compatible with node-hue-api!');
      console.log('You can now run: npm run setup-hue validate');
      
    } else {
      console.log('❌ Failed to update group class');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Value') && error.message.includes('not one of the allowed values')) {
      console.log('\n💡 The group has an invalid class value that prevents API access.');
      console.log('Let me try a direct HTTP approach to fix this...\n');
      
      try {
        const https = await import('https');
        
        const updateData = JSON.stringify({
          class: 'Other'
        });
        
        const options = {
          hostname: bridgeIp,
          port: 443,
          path: `/api/${username}/groups/${entertainmentGroupId}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': updateData.length
          },
          rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              console.log('📡 Direct API response:', JSON.stringify(response, null, 2));
              
              if (response[0] && response[0].success) {
                console.log('✅ Successfully updated group class via direct API!');
                console.log('🎉 You can now run: npm run setup-hue validate');
              } else {
                console.log('❌ Direct API update failed:', response);
              }
            } catch (parseError) {
              console.log('Raw response:', data);
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ Direct API request failed:', error.message);
        });

        req.write(updateData);
        req.end();
        
      } catch (httpError) {
        console.log(`❌ Direct HTTP method failed: ${httpError.message}`);
      }
    }
  }
}

main().catch(console.error);