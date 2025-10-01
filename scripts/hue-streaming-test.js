#!/usr/bin/env node

/**
 * Hue Entertainment Streaming Test
 * Tests the core Entertainment streaming functionality including:
 * - DTLS connection attempts with fallback to REST mode
 * - Proper streaming enable/disable on the bridge
 * - Graceful shutdown handling
 */

import { HueLightController } from '../dist/infrastructure/lighting/hue-light-controller.js';
import dotenv from 'dotenv';
dotenv.config();

let controller = null;

// Handle graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n📶 Received ${signal}, shutting down gracefully...`);
    if (controller) {
        try {
            await controller.stopEntertainmentStream();
            console.log('✅ Entertainment streaming properly stopped');
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        }
    }
    process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('beforeExit', () => gracefulShutdown('beforeExit'));

async function testStreaming() {
    console.log('Testing Entertainment streaming...');
    
    controller = new HueLightController({
        bridgeIp: process.env.HUE_BRIDGE_IP,
        username: process.env.HUE_USERNAME,
        clientKey: process.env.HUE_CLIENT_KEY,
        entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP_ID
    });

    try {
        // Connect to Hue API first
        console.log('Connecting to Hue bridge...');
        await controller.connect();
        
        // Start Entertainment streaming
        console.log('Starting Entertainment streaming...');
        await controller.startEntertainmentStream();
        
        // Send test colors via streaming
        console.log('Sending test colors via streaming...');
        const testColors = [
            { r: 255, g: 0, b: 0 },
            { r: 0, g: 255, b: 0 },
            { r: 0, g: 20, b: 255 },
            { r: 255, g: 255, b: 0 },
            { r: 255, g: 0, b: 255 },
            { r: 0, g: 255, b: 255 }
        ];
        
        // Convert to proper LightCommand structure using actual Entertainment group light IDs
        const entertainmentLights = [34, 35, 36, 40, 41, 42]; // Terrace Lily lights
        const lightCommands = testColors.map((color, index) => ({
            lightId: { value: entertainmentLights[index].toString() },
            state: {
                color,
                intensity: { value: 0.8 } // 80% brightness
            }
        }));
        
        await controller.sendCommands(lightCommands);
        
        // Wait a bit to see the effect
        console.log('Waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Send different colors
        console.log('Sending different test colors...');
        const testColors2 = [
            { r: 0, g: 0, b: 255 },
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 127, b: 0 },
            { r: 127, g: 0, b: 255 },
            { r: 0, g: 255, b: 127 },
            { r: 255, g: 0, b: 127 }
        ];
        
        // Convert to proper LightCommand structure using actual Entertainment group light IDs
        const lightCommands2 = testColors2.map((color, index) => ({
            lightId: { value: entertainmentLights[index].toString() },
            state: {
                color,
                intensity: { value: 1.0 } // 100% brightness
            }
        }));
        
        await controller.sendCommands(lightCommands2);
        
        console.log('Test completed successfully!');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Clean up
        try {
            console.log('🧹 Cleaning up...');
            await controller.stopEntertainmentStream();
            console.log('✅ Entertainment streaming properly stopped');
            
            // Give a moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('❌ Error stopping streaming:', error);
        }
    }
}

testStreaming();