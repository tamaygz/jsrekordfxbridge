import type { DeviceId } from '../../types/domain/devices.js';
import type { DomainEvent } from '../../types/domain/events.js';
import type { BeatPosition, BPM } from '../../types/domain/beats.js';

export type MIDIMessageType = 'noteon' | 'noteoff' | 'cc' | 'clock' | 'start' | 'stop' | 'continue' | 'song_position';

export interface MIDIMessage {
  readonly type: MIDIMessageType;
  readonly channel?: number;
  readonly data: number[];
  readonly timestamp: number;
}

export interface MIDIDevice {
  readonly id: DeviceId;
  readonly name: string;
  readonly manufacturer?: string;
  readonly type: 'input' | 'output';
}

export interface IMIDIController {
  getDevices(): Promise<MIDIDevice[]>;
  connect(deviceId?: DeviceId): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  onMessage(callback: (message: MIDIMessage) => void): void;
  sendMessage(message: MIDIMessage): Promise<void>;
}

export abstract class MIDIController implements IMIDIController {
  abstract getDevices(): Promise<MIDIDevice[]>;
  abstract connect(deviceId?: DeviceId): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  abstract onMessage(callback: (message: MIDIMessage) => void): void;
  abstract sendMessage(message: MIDIMessage): Promise<void>;
}

export interface BeatDetector {
  readonly currentBPM: BPM;
  readonly currentBeat: BeatPosition;
  onBeat(callback: (beat: BeatPosition) => void): void;
  start(): void;
  stop(): void;
}

export interface MIDIMessageReceivedEvent extends DomainEvent {
  readonly type: 'midi.message.received';
  readonly message: MIDIMessage;
  readonly deviceId: DeviceId;
}