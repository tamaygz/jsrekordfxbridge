#!/usr/bin/env node

/**
 * Debug Entertainment Group State
 * Check if Entertainment streaming is properly disabled
 */

import dotenv from 'dotenv';
dotenv.config();

async function checkGroupState() {
    console.log('🔍 Checking Entertainment group state...');
    
    try {
        // Import node-hue-api directly
        const hueApi = await import('node-hue-api');
        
        // Create API instance and connect
        const api = await hueApi.v3.api.createLocal(process.env.HUE_BRIDGE_IP).connect(process.env.HUE_USERNAME);
        
        // Get the Entertainment group
        const groupId = process.env.HUE_ENTERTAINMENT_GROUP_ID;
        const group = await api.groups.getGroup(groupId);
        
        console.log(`\n📋 Entertainment Group ${groupId} (${group.name}) Status:`);
        console.log('=====================================');
        console.log(`Type: ${group.type}`);
        console.log(`Class: ${group.class}`);
        console.log(`Lights: [${group.lights.join(', ')}]`);
        
        if (group.stream) {
            console.log(`\n🎭 Streaming Status:`);
            console.log(`Active: ${group.stream.active ? '✅ YES (STREAMING ENABLED)' : '❌ NO (STREAMING DISABLED)'}`);
            if (group.stream.active) {
                console.log('⚠️  WARNING: Entertainment streaming is still ACTIVE on the bridge!');
                console.log('   This means the bridge is still in Entertainment mode.');
            } else {
                console.log('✅ Entertainment streaming is properly DISABLED.');
            }
            
            if (group.stream.owner) {
                console.log(`Owner: ${group.stream.owner}`);
            }
            if (group.stream.proxymode) {
                console.log(`Proxy Mode: ${group.stream.proxymode}`);
            }
            if (group.stream.proxynode) {
                console.log(`Proxy Node: ${group.stream.proxynode}`);
            }
        } else {
            console.log('\n❌ No streaming information available');
        }
        
        console.log(`\n📊 Raw Group Object:`);
        console.log(JSON.stringify(group, null, 2));
        
    } catch (error) {
        console.error('❌ Failed to check group state:', error);
    }
}

checkGroupState();