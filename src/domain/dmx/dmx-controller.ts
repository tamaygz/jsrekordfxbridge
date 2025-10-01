import type { DeviceId } from '../../types/domain/devices.js';
import type { DomainEvent } from '../../types/domain/events.js';

export interface DMXChannel {
  readonly channel: number; // 1-512
  readonly value: number;   // 0-255
}

export interface DMXFrame {
  readonly channels: DMXChannel[];
  readonly universe?: number;
}

export interface DMXDevice {
  readonly id: DeviceId;
  readonly channels: readonly number[];
  readonly deviceType: string;
  readonly capabilities: DMXCapabilities;
}

export interface DMXCapabilities {
  readonly channelCount: number;
  readonly supports16Bit: boolean;
  readonly channelMappings: Record<string, number>; // e.g., { "red": 1, "green": 2, "blue": 3 }
}

export interface IDMXController {
  sendFrame(frame: DMXFrame): Promise<void>;
  getDevices(): Promise<DMXDevice[]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  blackout(): Promise<void>;
}

export abstract class DMXController implements IDMXController {
  abstract sendFrame(frame: DMXFrame): Promise<void>;
  abstract getDevices(): Promise<DMXDevice[]>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  abstract blackout(): Promise<void>;
}

export interface DMXFrameSentEvent extends DomainEvent {
  readonly type: 'dmx.frame.sent';
  readonly frame: DMXFrame;
}