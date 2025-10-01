// src/hue.js
// Hue Entertainment wrapper with streaming client and REST fallback
const { v3 } = require('node-hue-api');
const EventEmitter = require('events');

class HueEntertainment extends EventEmitter {
  constructor({ bridge_id, username, entertainment_id }) {
    super();
    this.bridgeId = bridge_id;
    this.username = username;
    this.entertainmentId = entertainment_id;
    this.api = null;
    this.streamingClient = null;
    this.lightOrder = [];
  }

  async connect() {
    if (!this.bridgeId || !this.username) {
      throw new Error('Hue bridge id and username required. Set HUE_BRIDGE_ID and HUE_USERNAME environment variables or run in demo mode.');
    }

    this.api = await v3.api.createLocal(this.bridgeId).connect(this.username);
    console.log('Connected to Hue bridge', this.bridgeId);

    const allLightResources = await this.api.lights.getAll();

    if (this.entertainmentId) {
      try {
        const group = await this.api.groups.getGroup(this.entertainmentId);
        if (group && group.lights) this.lightOrder = group.lights.map(l => parseInt(l,10));
      } catch(err) {
        console.warn('Could not fetch entertainment group by id, using fallback');
      }
    }

    if (!this.lightOrder.length) this.lightOrder = allLightResources.map(l => parseInt(l.id,10));

    console.log('Hue lights mapped:', this.lightOrder);
  }

  async startStream(mapping = null) {
    if (!this.api) throw new Error('Hue API not connected');

    if (!this.api.streaming || !this.api.streaming.createClient) {
      console.warn('Streaming client not available. Falling back to REST mode.');
      this.streamingClient = null;
      return;
    }

    const client = this.api.streaming.createClient();
    const lightObjects = this.lightOrder.map(id => ({ id }));

    if (mapping) {
      for (let i=0; i<mapping.length; i++) {
        lightObjects[i].position = mapping[i].position || {x:0,y:0,z:0};
      }
    }

    await client.connect(this.entertainmentId);
    this.streamingClient = client;
    console.log('Hue Entertainment streaming started');
  }

  sendFrame(frames) {
    if (this.streamingClient) {
      const frame = frames.map(f => ({
        lightId: f.lightId,
        r: f.r,
        g: f.g,
        b: f.b,
        brightness: f.brightness || 254
      }));
      try { this.streamingClient.setLights(frame); } catch(err) { console.warn(err.message); }
      return;
    }

    frames.forEach(async f => {
      try {
        await this.api.lights.setLightState(f.lightId.toString(),
          new v3.model.lightStates.LightState().on().rgb(f.r,f.g,f.b).brightness(f.brightness||254));
      } catch(err) { console.warn(err.message); }
    });
  }

  stopStream() {
    if (this.streamingClient) {
      try { this.streamingClient.disconnect(); } catch(e){}
      this.streamingClient = null;
    }
  }
}

module.exports = HueEntertainment;
