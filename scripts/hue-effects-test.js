#!/usr/bin/env node

/**
 * Hue Effects Test Script
 * Tests Entertainment streaming with visual effects:
 * - Strobo (red flashing) effect
 * - Color sweep through rainbow spectrum
 * - Proper Entertainment group control
 */
import { HueLightController } from '../dist/infrastructure/lighting/hue-light-controller.js';
import dotenv from 'dotenv';
dotenv.config();

async function testStreamingCommands() {
    console.log('🧪 Testing Entertainment streaming commands...');
    
    const controller = new HueLightController({
        bridgeIp: process.env.HUE_BRIDGE_IP,
        username: process.env.HUE_USERNAME,
        clientKey: process.env.HUE_CLIENT_KEY,
        entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP_ID
    });

    try {
        // Connect and start streaming
        console.log('🔌 Connecting...');
        await controller.connect();
        
        console.log('🎭 Testing strobo effect via Entertainment streaming...');
        
        // Test strobo effect (red flashing)
        for (let i = 0; i < 6; i++) {
            const isOn = i % 2 === 0;
            const color = isOn ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 0 };
            const intensity = isOn ? { value: 254 } : { value: 0 };
            
            console.log(`💡 Flash ${i + 1}: ${isOn ? 'ON (Red)' : 'OFF'}`);
            await controller.setAllLights(color, intensity);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('🌟 Testing color sweep...');
        const colors = [
            { r: 255, g: 0, b: 0 },   // Red
            { r: 255, g: 165, b: 0 }, // Orange  
            { r: 255, g: 255, b: 0 }, // Yellow
            { r: 0, g: 255, b: 0 },   // Green
            { r: 0, g: 0, b: 255 },   // Blue
            { r: 75, g: 0, b: 130 }   // Indigo
        ];
        
        for (let i = 0; i < colors.length; i++) {
            console.log(`🎨 Color ${i + 1}: RGB(${colors[i].r}, ${colors[i].g}, ${colors[i].b})`);
            await controller.setAllLights(colors[i], { value: 254 });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('⚫ Blackout...');
        await controller.setAllLights({ r: 0, g: 0, b: 0 }, { value: 0 });
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        try {
            await controller.stopEntertainmentStream();
            console.log('🛑 Entertainment streaming stopped');
        } catch (error) {
            console.error('❌ Error stopping streaming:', error);
        }
    }
}

testStreamingCommands();