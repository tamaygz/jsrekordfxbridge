declare module 'dmx' {
  interface UniverseOptions {
    host?: string;
    port?: number;
    refresh?: number;
  }

  interface Universe {
    update(channels: Record<number, number>): void;
    updateAll(channels: number[]): void;
  }

  class DMX {
    addUniverse(name: string, driver: string, device?: string, options?: UniverseOptions): Universe;
    removeUniverse(name: string): void;
  }

  export = DMX;
}