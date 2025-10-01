import type { DeviceId } from '../../types/domain/devices.js';

/**
 * Represents a DJ deck/channel in rekordbox
 */
export interface RekordboxChannel {
  readonly channel: number; // 1, 2, 3, 4
  readonly isPlaying: boolean;
  readonly bpm: number | null;
  readonly trackName?: string | undefined;
}

/**
 * Status of the rekordbox connection
 */
export interface RekordboxStatus {
  readonly connected: boolean;
  readonly midiConnected: boolean;
  readonly channels: readonly RekordboxChannel[];
  readonly masterBPM: number | null;
  readonly activeChannel: number | null; // Which channel is currently master
}

/**
 * Rekordbox controller interface for managing rekordbox connection
 * and receiving beat/BPM information from different channels
 */
export interface IRekordboxController {
  /**
   * Connect to rekordbox via MIDI
   */
  connect(virtualPort?: string): Promise<void>;
  
  /**
   * Disconnect from rekordbox
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if connected to rekordbox
   */
  isConnected(): boolean;
  
  /**
   * Get current status of all channels and connection
   */
  getStatus(): RekordboxStatus;
  
  /**
   * Get BPM of a specific channel
   */
  getChannelBPM(channel: number): number | null;
  
  /**
   * Get the master (active) BPM - typically from the channel that's playing
   */
  getMasterBPM(): number | null;
  
  /**
   * Register callback for channel state changes
   */
  onChannelChange(callback: (channel: RekordboxChannel) => void): void;
  
  /**
   * Register callback for BPM changes on any channel
   */
  onBPMChange(callback: (channel: number, bpm: number) => void): void;
  
  /**
   * Register callback when active/master channel changes
   */
  onMasterChannelChange(callback: (channel: number) => void): void;
}

export abstract class RekordboxController implements IRekordboxController {
  abstract connect(virtualPort?: string): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  abstract getStatus(): RekordboxStatus;
  abstract getChannelBPM(channel: number): number | null;
  abstract getMasterBPM(): number | null;
  abstract onChannelChange(callback: (channel: RekordboxChannel) => void): void;
  abstract onBPMChange(callback: (channel: number, bpm: number) => void): void;
  abstract onMasterChannelChange(callback: (channel: number) => void): void;
}
