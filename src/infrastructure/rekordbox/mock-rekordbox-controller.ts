import { injectable } from 'inversify';
import {
  RekordboxController,
  type RekordboxChannel,
  type RekordboxStatus
} from '../../domain/rekordbox/rekordbox-controller.js';

/**
 * Mock implementation of rekordbox controller for testing without hardware
 * Simulates channel states and BPM changes
 */
@injectable()
export class MockRekordboxController extends RekordboxController {
  private connected = false;
  private channels: Map<number, RekordboxChannel> = new Map();
  private masterBPM: number | null = 128; // Default BPM
  private activeChannel: number | null = 1;
  private simulationTimer: NodeJS.Timeout | null = null;
  
  private channelCallbacks: Array<(channel: RekordboxChannel) => void> = [];
  private bpmCallbacks: Array<(channel: number, bpm: number) => void> = [];
  private masterChannelCallbacks: Array<(channel: number) => void> = [];

  constructor() {
    super();
    // Initialize 4 channels
    for (let i = 1; i <= 4; i++) {
      this.channels.set(i, {
        channel: i,
        isPlaying: i === 1, // Channel 1 playing by default
        bpm: i === 1 ? 128 : null,
        trackName: i === 1 ? 'Mock Track 1' : undefined
      });
    }
  }

  async connect(virtualPort?: string): Promise<void> {
    console.log('🎚️ Rekordbox [Mock]: Connecting to simulated rekordbox...');
    
    this.connected = true;
    this.activeChannel = 1;
    this.masterBPM = 128;
    
    // Start simulation of channel/BPM changes
    this.startSimulation();
    
    console.log('🎚️ Rekordbox [Mock]: Connected to simulated rekordbox');
    console.log('🎚️ Rekordbox [Mock]: Channel 1 playing at 128 BPM');
  }

  async disconnect(): Promise<void> {
    console.log('🎚️ Rekordbox [Mock]: Disconnecting...');
    
    this.stopSimulation();
    this.connected = false;
    this.masterBPM = null;
    this.activeChannel = null;
    
    // Reset all channels
    this.channels.forEach((_, channelNum) => {
      this.channels.set(channelNum, {
        channel: channelNum,
        isPlaying: false,
        bpm: null,
        trackName: undefined
      });
    });
    
    console.log('🎚️ Rekordbox [Mock]: Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): RekordboxStatus {
    return {
      connected: this.connected,
      midiConnected: this.connected,
      channels: Array.from(this.channels.values()),
      masterBPM: this.masterBPM,
      activeChannel: this.activeChannel
    };
  }

  getChannelBPM(channel: number): number | null {
    const channelData = this.channels.get(channel);
    return channelData?.bpm || null;
  }

  getMasterBPM(): number | null {
    return this.masterBPM;
  }

  onChannelChange(callback: (channel: RekordboxChannel) => void): void {
    this.channelCallbacks.push(callback);
  }

  onBPMChange(callback: (channel: number, bpm: number) => void): void {
    this.bpmCallbacks.push(callback);
  }

  onMasterChannelChange(callback: (channel: number) => void): void {
    this.masterChannelCallbacks.push(callback);
  }

  // Mock-specific methods for testing
  
  /**
   * Simulate starting playback on a channel
   */
  simulateChannelStart(channel: number, bpm?: number): void {
    const channelData = this.channels.get(channel);
    if (!channelData) return;
    
    const updated: RekordboxChannel = {
      ...channelData,
      isPlaying: true,
      bpm: bpm || channelData.bpm || 128,
      trackName: `Mock Track ${channel}`
    };
    
    this.channels.set(channel, updated);
    this.setMasterChannel(channel);
    
    console.log(`🎚️ Rekordbox [Mock]: Channel ${channel} started at ${updated.bpm} BPM`);
    
    // Notify listeners
    this.notifyChannelChange(updated);
    if (updated.bpm) {
      this.notifyBPMChange(channel, updated.bpm);
    }
  }

  /**
   * Simulate stopping playback on a channel
   */
  simulateChannelStop(channel: number): void {
    const channelData = this.channels.get(channel);
    if (!channelData) return;
    
    const updated: RekordboxChannel = {
      ...channelData,
      isPlaying: false
    };
    
    this.channels.set(channel, updated);
    
    console.log(`🎚️ Rekordbox [Mock]: Channel ${channel} stopped`);
    
    // Notify listeners
    this.notifyChannelChange(updated);
    
    // If this was the master channel, find another
    if (this.activeChannel === channel) {
      this.findNewMasterChannel();
    }
  }

  /**
   * Simulate BPM change on a channel
   */
  simulateBPMChange(channel: number, bpm: number): void {
    const channelData = this.channels.get(channel);
    if (!channelData) return;
    
    const updated: RekordboxChannel = {
      ...channelData,
      bpm
    };
    
    this.channels.set(channel, updated);
    
    if (this.activeChannel === channel) {
      this.masterBPM = bpm;
    }
    
    console.log(`🎚️ Rekordbox [Mock]: Channel ${channel} BPM changed to ${bpm}`);
    
    // Notify listeners
    this.notifyChannelChange(updated);
    this.notifyBPMChange(channel, bpm);
  }

  private startSimulation(): void {
    // Simulate occasional BPM changes for realism
    this.simulationTimer = setInterval(() => {
      if (!this.connected || !this.activeChannel) return;
      
      // Randomly vary BPM slightly (±2 BPM) to simulate real DJ mixing
      const currentBPM = this.masterBPM || 128;
      const variation = (Math.random() - 0.5) * 4; // -2 to +2
      const newBPM = Math.round((currentBPM + variation) * 10) / 10;
      
      if (Math.abs(newBPM - currentBPM) > 0.1) {
        this.simulateBPMChange(this.activeChannel, newBPM);
      }
    }, 10000); // Every 10 seconds
  }

  private stopSimulation(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  private setMasterChannel(channel: number): void {
    if (this.activeChannel !== channel) {
      this.activeChannel = channel;
      
      const channelData = this.channels.get(channel);
      if (channelData?.bpm) {
        this.masterBPM = channelData.bpm;
      }
      
      console.log(`🎚️ Rekordbox [Mock]: Master channel changed to ${channel}`);
      
      // Notify listeners
      this.masterChannelCallbacks.forEach(callback => {
        try {
          callback(channel);
        } catch (error) {
          console.error('🎚️ Rekordbox [Mock]: Error in master channel callback:', error);
        }
      });
    }
  }

  private findNewMasterChannel(): void {
    for (const [channelNum, channel] of this.channels.entries()) {
      if (channel.isPlaying) {
        this.setMasterChannel(channelNum);
        return;
      }
    }
    
    this.activeChannel = null;
    this.masterBPM = null;
    console.log('🎚️ Rekordbox [Mock]: No active master channel');
  }

  private notifyChannelChange(channel: RekordboxChannel): void {
    this.channelCallbacks.forEach(callback => {
      try {
        callback(channel);
      } catch (error) {
        console.error('🎚️ Rekordbox [Mock]: Error in channel callback:', error);
      }
    });
  }

  private notifyBPMChange(channel: number, bpm: number): void {
    this.bpmCallbacks.forEach(callback => {
      try {
        callback(channel, bpm);
      } catch (error) {
        console.error('🎚️ Rekordbox [Mock]: Error in BPM callback:', error);
      }
    });
  }
}
