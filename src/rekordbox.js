// src/rekordbox.js
// Minimal interface for integrating Rekordbox via MIDI clock
const EventEmitter = require('events');

class Rekordbox extends EventEmitter {
  constructor(midiController){
    super();
    this.midi = midiController;
    this.midi.on('clock',(msg)=>this._onClock(msg));
    this.beatCounter = 0;
  }

  _onClock(msg){
    // Rekordbox sends 24 MIDI clock ticks per quarter note
    this.beatCounter = (this.beatCounter + 1) % 24;
    if(this.beatCounter === 0){
      this.emit('beat');
    }
  }
}

module.exports = Rekordbox;
