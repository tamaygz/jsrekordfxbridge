import { injectable } from 'inversify';
import {
  RekordboxController,
  type RekordboxChannel,
  type RekordboxStatus
} from '../../domain/rekordbox/rekordbox-controller.js';
import type { IMIDIController, MIDIMessage } from '../../domain/midi/midi-controller.js';

/**
 * Real implementation of rekordbox controller using MIDI
 * Connects to rekordbox's virtual MIDI output to receive:
 * - MIDI clock for beat synchronization
 * - BPM information from different channels
 * - Channel play/stop states
 */
@injectable()
export class MIDIRekordboxController extends RekordboxController {
  private connected = false;
  private channels: Map<number, RekordboxChannel> = new Map();
  private masterBPM: number | null = null;
  private activeChannel: number | null = null;
  
  private channelCallbacks: Array<(channel: RekordboxChannel) => void> = [];
  private bpmCallbacks: Array<(channel: number, bpm: number) => void> = [];
  private masterChannelCallbacks: Array<(channel: number) => void> = [];

  constructor(private midiController: IMIDIController) {
    super();
    // Initialize 4 channels (standard rekordbox setup)
    for (let i = 1; i <= 4; i++) {
      this.channels.set(i, {
        channel: i,
        isPlaying: false,
        bpm: null,
        trackName: undefined
      });
    }
  }

  async connect(virtualPort?: string): Promise<void> {
    console.log('🎚️ Rekordbox: Connecting to rekordbox MIDI...');
    
    try {
      // Connect to MIDI controller (which should connect to rekordbox virtual port)
      await this.midiController.connect();
      
      // Set up message handlers for rekordbox-specific messages
      this.setupRekordboxHandlers();
      
      this.connected = true;
      console.log('🎚️ Rekordbox: Connected successfully');
      console.log('🎚️ Rekordbox: Listening for channel updates and BPM changes...');
      
    } catch (error) {
      console.error('🎚️ Rekordbox: Connection failed:', error);
      throw new Error(`Failed to connect to rekordbox: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    console.log('🎚️ Rekordbox: Disconnecting...');
    
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
    
    this.channelCallbacks = [];
    this.bpmCallbacks = [];
    this.masterChannelCallbacks = [];
    
    console.log('🎚️ Rekordbox: Disconnected');
  }

  isConnected(): boolean {
    return this.connected && this.midiController.isConnected();
  }

  getStatus(): RekordboxStatus {
    return {
      connected: this.connected,
      midiConnected: this.midiController.isConnected(),
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

  private setupRekordboxHandlers(): void {
    this.midiController.onMessage((message) => {
      this.handleRekordboxMessage(message);
    });
  }

  private handleRekordboxMessage(message: MIDIMessage): void {
    if (!this.connected) return;

    // Handle different MIDI message types from rekordbox
    switch (message.type) {
      case 'clock':
        // MIDI clock messages - used by beat detection service
        // We don't need to handle this directly here
        break;
        
      case 'start':
      case 'continue':
        // Transport start - set a channel as playing
        this.handleTransportStart(message);
        break;
        
      case 'stop':
        // Transport stop
        this.handleTransportStop(message);
        break;
        
      case 'cc':
        // Control changes might indicate BPM or channel changes
        this.handleControlChange(message);
        break;
        
      case 'noteon':
      case 'noteoff':
        // Note messages might indicate deck cue points or triggers
        this.handleNoteMessage(message);
        break;
    }
  }

  private handleTransportStart(message: MIDIMessage): void {
    // When transport starts, mark the first available channel as playing
    // In a real setup, we'd need to determine which channel this is from
    const channel = this.getChannelFromMessage(message) || 1;
    
    this.updateChannelState(channel, { isPlaying: true });
    this.setMasterChannel(channel);
    
    console.log(`🎚️ Rekordbox: Channel ${channel} started playing`);
  }

  private handleTransportStop(message: MIDIMessage): void {
    const channel = this.getChannelFromMessage(message);
    
    if (channel) {
      this.updateChannelState(channel, { isPlaying: false });
      console.log(`🎚️ Rekordbox: Channel ${channel} stopped`);
      
      // If this was the master channel, find another playing channel
      if (this.activeChannel === channel) {
        this.findNewMasterChannel();
      }
    }
  }

  private handleControlChange(message: MIDIMessage): void {
    if (!message.data || message.data.length < 2) return;
    
    const controller = message.data[0];
    const value = message.data[1];
    
    // Different CC numbers might represent different channels or BPM controls
    // This is a simplified implementation - actual rekordbox MIDI mapping may vary
    
    // CC 7 might be master volume/BPM indicator
    // CC 10-13 might be per-channel controls
    const channel = this.getChannelFromMessage(message);
    
    if (channel && controller) {
      // Interpret some CC messages as BPM changes (simplified)
      // Real implementation would need proper MIDI mapping documentation
      if (controller >= 10 && controller <= 13) {
        // Rough BPM estimation from CC value (this is a placeholder)
        // Real rekordbox would send actual BPM via sysex or specific CC ranges
        const estimatedBPM = 60 + (value! * 140 / 127); // Map 0-127 to 60-200 BPM
        this.updateChannelBPM(channel, estimatedBPM);
      }
    }
  }

  private handleNoteMessage(message: MIDIMessage): void {
    // Note messages could indicate deck triggers, hot cues, etc.
    // For now, we can use them to track which decks are active
    if (message.type === 'noteon' && message.data && message.data[1] && message.data[1] > 0) {
      const channel = this.getChannelFromMessage(message) || 1;
      this.updateChannelState(channel, { isPlaying: true });
    }
  }

  private getChannelFromMessage(message: MIDIMessage): number | null {
    // Try to determine which channel this message is for
    // MIDI channels 0-3 could map to rekordbox channels 1-4
    if (message.channel !== undefined) {
      return (message.channel % 4) + 1;
    }
    return null;
  }

  private updateChannelState(channelNum: number, updates: Partial<Omit<RekordboxChannel, 'channel'>>): void {
    const current = this.channels.get(channelNum);
    if (!current) return;
    
    const updated: RekordboxChannel = {
      ...current,
      ...updates
    };
    
    this.channels.set(channelNum, updated);
    
    // Notify listeners
    this.channelCallbacks.forEach(callback => {
      try {
        callback(updated);
      } catch (error) {
        console.error('🎚️ Rekordbox: Error in channel callback:', error);
      }
    });
  }

  private updateChannelBPM(channelNum: number, bpm: number): void {
    const current = this.channels.get(channelNum);
    if (!current) return;
    
    // Only update if BPM changed significantly
    if (current.bpm === null || Math.abs(current.bpm - bpm) > 0.5) {
      this.updateChannelState(channelNum, { bpm });
      
      // If this is the active channel, update master BPM
      if (this.activeChannel === channelNum || current.isPlaying) {
        this.masterBPM = bpm;
        console.log(`🎚️ Rekordbox: Channel ${channelNum} BPM updated to ${bpm.toFixed(1)}`);
      }
      
      // Notify BPM listeners
      this.bpmCallbacks.forEach(callback => {
        try {
          callback(channelNum, bpm);
        } catch (error) {
          console.error('🎚️ Rekordbox: Error in BPM callback:', error);
        }
      });
    }
  }

  private setMasterChannel(channelNum: number): void {
    if (this.activeChannel !== channelNum) {
      this.activeChannel = channelNum;
      
      // Update master BPM to this channel's BPM
      const channel = this.channels.get(channelNum);
      if (channel?.bpm) {
        this.masterBPM = channel.bpm;
      }
      
      console.log(`🎚️ Rekordbox: Master channel changed to ${channelNum}`);
      
      // Notify listeners
      this.masterChannelCallbacks.forEach(callback => {
        try {
          callback(channelNum);
        } catch (error) {
          console.error('🎚️ Rekordbox: Error in master channel callback:', error);
        }
      });
    }
  }

  private findNewMasterChannel(): void {
    // Find the first playing channel to be the new master
    for (const [channelNum, channel] of this.channels.entries()) {
      if (channel.isPlaying) {
        this.setMasterChannel(channelNum);
        return;
      }
    }
    
    // No playing channels, clear master
    this.activeChannel = null;
    this.masterBPM = null;
    console.log('🎚️ Rekordbox: No active master channel');
  }
}
