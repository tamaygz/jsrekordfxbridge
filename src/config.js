// src/config.js
// Configuration loader for YAML files and environment variables
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
require('dotenv').config();

class ConfigLoader {
  constructor(configPath = 'config/default-config.yaml') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      // Load YAML config file
      const configFile = fs.readFileSync(this.configPath, 'utf8');
      const config = yaml.parse(configFile);
      
      // Replace environment variables
      return this.replaceEnvVars(config);
    } catch (err) {
      console.warn(`Failed to load config from ${this.configPath}:`, err.message);
      return this.getDefaultConfig();
    }
  }

  replaceEnvVars(obj) {
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with environment variable
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvVars(item));
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvVars(value);
      }
      return result;
    }
    return obj;
  }

  getDefaultConfig() {
    return {
      midi: {
        device_name: process.env.MIDI_DEVICE_NAME || "DDJ-400",
        map: {
          mode_toggle: "button_1",
          strobe: "pad_1",
          suspense: "pad_2",
          sweep: "pad_3",
          blackout: "pad_4"
        }
      },
      rekordbox: {
        use_midi_clock: true,
        virtual_port: process.env.REKORDBOX_VIRTUAL_MIDI_PORT || "rekordbox-out"
      },
      beat_to_light: {
        source: "midi_clock",
        sensitivity: 0.8,
        default_depth_map: "config/depth-map.yaml"
      },
      hue: {
        enabled: process.env.HUE_BRIDGE_ID ? true : false,
        bridge_id: process.env.HUE_BRIDGE_ID || "",
        username: process.env.HUE_USERNAME || "",
        entertainment_id: process.env.HUE_ENTERTAINMENT_ID || ""
      },
      dmx: {
        enabled: process.env.DMX_DEVICE ? true : false,
        device: process.env.DMX_DEVICE || "/dev/ttyUSB0"
      },
      effects: {
        directory: "effects"
      },
      demo: {
        mode: process.env.DEMO_MODE === 'true' || (!process.env.HUE_BRIDGE_ID && !process.env.DMX_DEVICE),
        simulate_hardware: true,
        auto_beat: true,
        beat_interval: 500
      }
    };
  }

  get(path) {
    return this.getNestedValue(this.config, path);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  isDemo() {
    const demoMode = this.get('demo.mode');
    return demoMode === true;
  }

  isHueEnabled() {
    const enabled = this.get('hue.enabled');
    const bridgeId = this.get('hue.bridge_id');
    return enabled === true && bridgeId && bridgeId !== '' && !bridgeId.includes('${');
  }

  isDmxEnabled() {
    const enabled = this.get('dmx.enabled');
    const device = this.get('dmx.device');
    return enabled === true && device && device !== '' && !device.includes('${');
  }
}

module.exports = ConfigLoader;