// src/beat-to-light.js
const MidiController = require('./midi');
const Rekordbox = require('./rekordbox');
const HueEntertainment = require('./hue');
const FxEngine = require('./fx-engine');
const fs = require('fs');

// Default depth map
const DEFAULT_DEPTH_MAP = {
  zones: {
    floor: [1,2],
    mid: [3,4],
    ceiling: [5,6]
  }
};

// Configuration
const CONFIG = {
  midiInput: 'DDJ-400',      // Replace with your MIDI input name
  hueBridgeId: '<bridge-id>', // Replace with your Hue Bridge ID
  hueUsername: '<username>',  // Replace with Hue username
  entertainmentId: '<entertainment-id>'
};

async function main() {
  // 1. Initialize Hue
  const hue = new HueEntertainment({
    bridge_id: CONFIG.hueBridgeId,
    username: CONFIG.hueUsername,
    entertainment_id: CONFIG.entertainmentId
  });
  await hue.connect();
  await hue.startStream();

  // 2. Initialize FX engine
  const fx = new FxEngine({
    hueClient: hue,
    depthMap: DEFAULT_DEPTH_MAP
  });

  // 3. Connect to MIDI
  const midi = new MidiController(CONFIG.midiInput);
  await midi.connect();

  // 4. Connect to Rekordbox
  const rekordbox = new Rekordbox(midi);
  rekordbox.on('beat', () => {
    // On every beat, emit Hue frame using the default depth map
    fx.onBeat();
  });

  console.log('Beat-to-light pipeline is running...');
}

// Run the pipeline
main().catch(err => console.error(err));
