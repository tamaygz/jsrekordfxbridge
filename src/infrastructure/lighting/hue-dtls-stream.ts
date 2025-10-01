import { dtls } from 'node-dtls-client';
import { EventEmitter } from 'events';

const PACKET_HEADER = Buffer.from([0x48, 0x75, 0x65, 0x53, 0x74, 0x72, 0x65, 0x61, 0x6d]); // "HueStream"

export interface ColorUpdate {
  lightId: number;
  color: [number, number, number]; // RGB values 0-65535
}

export class HueDtlsStreamController extends EventEmitter {
  private readonly host: string;
  private readonly username: string;
  private readonly clientKey: string;
  private readonly port = 2100;

  private socket: dtls.Socket | null = null;
  private opened = false;
  private skip = false;

  private lastUpdate: ColorUpdate[] | null = null;
  private lastUpdateTimestamp: Date | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private cleanedUp = false;

  constructor(host: string, username: string, clientKey: string) {
    super();
    this.host = host;
    this.username = username;
    this.clientKey = clientKey;
  }

  async connect(): Promise<void> {
    // Reset cleanup flag for new connection attempt
    this.cleanedUp = false;
    
    return new Promise((resolve, reject) => {
      const dtlsConfig = {
        type: 'udp4' as const,
        port: this.port,
        address: this.host,
        psk: { [this.username]: this.clientKey },
        ciphers: ['TLS_PSK_WITH_AES_128_GCM_SHA256' as const],
        timeout: 10000,
      };

      console.log('🌉 DTLS: Attempting connection with config:', {
        host: this.host,
        port: this.port,
        username: this.username,
        clientKeyLength: this.clientKey.length
      });

      const connectionTimeout = setTimeout(() => {
        console.warn('🌉 DTLS: Connection timeout after 8 seconds, falling back to REST mode');
        this.cleanup();
        reject(new Error('DTLS connection timeout'));
      }, 8000);

      try {
        const socket = dtls.createSocket(dtlsConfig);
        this.socket = socket;

        socket.on('connected', () => {
          console.log('🌉 DTLS: Connected to Entertainment streaming');
          clearTimeout(connectionTimeout);
          this.opened = true;
          this.startKeepalive();
          this.emit('connected');
          resolve();
        });

        socket.on('error', (error: any) => {
          if (!this.cleanedUp) {
            console.error('🌉 DTLS: Connection error:', error);
            clearTimeout(connectionTimeout);
            this.cleanup();
            // Don't emit error to prevent unhandled error crashes
            reject(error);
          }
        });

        socket.on('close', () => {
          console.log('🌉 DTLS: Connection closed');
          clearTimeout(connectionTimeout);
          this.cleanup();
          this.emit('close');
        });

        socket.on('message', (msg: any) => {
          // Handle incoming messages if needed
          this.emit('message', msg);
        });
      } catch (error: any) {
        console.error('🌉 DTLS: Failed to create socket:', error);
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    if (!this.opened || !this.socket) {
      return;
    }

    console.log('🌉 DTLS: Closing connection...');
    this.cleanup();
    
    return new Promise<void>(resolve => {
      if (this.socket) {
        try {
          this.socket.close();
          console.log('🌉 DTLS: Connection closed');
          resolve();
        } catch (error) {
          console.warn('🌉 DTLS: Error during close:', error);
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  sendUpdate(updates: ColorUpdate[]): void {
    if (!this.socket || !this.opened) {
      return;
    }

    // Skip every other frame to avoid overwhelming the bridge (25fps -> 12.5fps)
    if (this.skip) {
      this.skip = false;
      return;
    }
    this.skip = true;

    this.lastUpdate = updates;
    this.lastUpdateTimestamp = new Date();

    this.sendUpdatePacket(updates);
  }

  private sendUpdatePacket(updates: ColorUpdate[]): void {
    if (!this.socket || !this.opened) {
      return;
    }

    // Create message buffer: 16 byte header + 9 bytes per light
    const message = Buffer.alloc(16 + (updates.length * 9), 0x00);
    
    // Copy header
    PACKET_HEADER.copy(message, 0);
    
    // Protocol version
    message.writeUInt8(1, 9);  // Major version
    message.writeUInt8(0, 10); // Minor version
    message.writeUInt8(0, 11); // Sequence (ignored)
    message.writeUInt16BE(0, 12); // Reserved
    message.writeUInt8(0, 14); // Color space: RGB
    message.writeUInt8(0, 15); // Reserved

    // Write light data
    let offset = 16;
    updates.forEach(update => {
      message.writeUInt8(0, offset);                    // Device type: Light
      message.writeUInt16BE(update.lightId, offset + 1); // Light ID
      message.writeUInt16BE(update.color[0], offset + 3); // R
      message.writeUInt16BE(update.color[1], offset + 5); // G
      message.writeUInt16BE(update.color[2], offset + 7); // B
      offset += 9;
    });

    // Send the message
    this.socket.send(message);
  }

  private startKeepalive(): void {
    this.keepaliveInterval = setInterval(() => {
      this.updateKeepalive();
    }, 1000);
  }

  private updateKeepalive(): void {
    // Send keepalive if no update has been sent in the last 2 seconds
    if (this.lastUpdateTimestamp !== null && 
        Date.now() - this.lastUpdateTimestamp.getTime() <= 2000) {
      return;
    }

    // Resend last update as keepalive
    if (this.lastUpdate) {
      this.sendUpdatePacket(this.lastUpdate);
    }
  }

  private cleanup(): void {
    if (this.cleanedUp) return;
    
    this.cleanedUp = true;
    this.opened = false;
    
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    
    if (this.socket) {
      try {
        // Remove all listeners to prevent delayed events
        this.socket.removeAllListeners();
        // Close the socket if it has a close method
        if (typeof this.socket.close === 'function') {
          this.socket.close();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.opened;
  }
}