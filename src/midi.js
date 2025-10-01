// src/midi.js
// Handles MIDI input from DDJ-400 or other DJ controllers
const JZZ = require('jzz');
const EventEmitter = require('events');

class MidiController extends EventEmitter {
  constructor(inputName){
    super();
    this.inputName = inputName;
    this.input = null;
  }

  async connect(){
    try {
      // Find and open the MIDI input
      const info = await JZZ.info();
      const inputs = info.inputs || [];
      
      // Find input by name or use first available
      let inputInfo = inputs.find(inp => inp.name.includes(this.inputName));
      if (!inputInfo && inputs.length > 0) {
        inputInfo = inputs[0];
        console.log(`MIDI input "${this.inputName}" not found, using "${inputInfo.name}"`);
      }
      
      if (!inputInfo) {
        console.warn('No MIDI inputs available, creating mock input');
        this.input = null;
        return;
      }

      this.input = await JZZ().openMidiIn(inputInfo.name);
      this.input.and(msg => {
        if (msg[0] >= 0x90 && msg[0] <= 0x9F) {
          // Note on
          this.emit('noteon', { channel: msg[0] & 0x0F, note: msg[1], velocity: msg[2] });
        } else if (msg[0] >= 0x80 && msg[0] <= 0x8F) {
          // Note off
          this.emit('noteoff', { channel: msg[0] & 0x0F, note: msg[1], velocity: msg[2] });
        } else if (msg[0] >= 0xB0 && msg[0] <= 0xBF) {
          // Control change
          this.emit('cc', { channel: msg[0] & 0x0F, controller: msg[1], value: msg[2] });
        } else if (msg[0] === 0xF8) {
          // MIDI clock
          this.emit('clock');
        }
      });
      
      console.log(`Connected to MIDI input ${inputInfo.name}`);
    } catch (err) {
      console.warn('Failed to connect to MIDI input:', err.message);
      this.input = null;
    }
  }

  disconnect(){
    if(this.input) {
      this.input.close();
      this.input = null;
    }
  }
}

module.exports = MidiController;
