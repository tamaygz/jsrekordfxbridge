#!/usr/bin/env node

/**
 * Clean up duplicate environment variables in .env file
 * This script removes duplicate variables and keeps the latest values
 */

import * as fs from 'fs';
import * as path from 'path';

function cleanupEnvFile() {
  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ No .env file found');
    return;
  }
  
  console.log('🧹 Cleaning up duplicate environment variables...\n');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const processedVars = new Map();
  const cleanedLines = [];
  const duplicatesFound = [];
  
  // Process lines in reverse order to keep the last occurrence of each variable
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      cleanedLines.unshift(line);
      continue;
    }
    
    // Check if it's a variable assignment
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      if (processedVars.has(key)) {
        // This is a duplicate - skip it
        duplicatesFound.push(`${key}=${processedVars.get(key)}`);
        console.log(`🔄 Removing duplicate: ${key}=${value} (keeping: ${key}=${processedVars.get(key)})`);
      } else {
        // First occurrence of this variable (since we're going backwards)
        processedVars.set(key, value);
        cleanedLines.unshift(line);
      }
    } else {
      cleanedLines.unshift(line);
    }
  }
  
  if (duplicatesFound.length > 0) {
    // Create backup
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`\n📦 Created backup: ${path.basename(backupPath)}`);
    
    // Write cleaned content
    const cleanedContent = cleanedLines.join('\n');
    fs.writeFileSync(envPath, cleanedContent);
    
    console.log(`\n✅ Cleaned up ${duplicatesFound.length} duplicate variable(s)`);
    console.log('📝 Updated .env file with unique variables only');
    
    // Show summary of kept values
    console.log('\n🎯 Final Hue configuration:');
    const hueVars = ['HUE_BRIDGE_IP', 'HUE_BRIDGE_ID', 'HUE_USERNAME', 'HUE_CLIENT_KEY', 'DEMO_MODE'];
    for (const varName of hueVars) {
      if (processedVars.has(varName)) {
        const value = processedVars.get(varName);
        const displayValue = varName.includes('KEY') || varName.includes('USERNAME') 
          ? value.substring(0, 8) + '...' 
          : value;
        console.log(`  ${varName}=${displayValue}`);
      }
    }
  } else {
    console.log('✅ No duplicate variables found - .env file is already clean!');
  }
}

// Run the cleanup
try {
  cleanupEnvFile();
} catch (error) {
  console.error('❌ Failed to clean up .env file:', error.message);
  process.exit(1);
}