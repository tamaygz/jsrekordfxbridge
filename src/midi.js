// src/midi.js
// Handles MIDI input from DDJ-400 or other DJ controllers
const easymidi = require('easymidi');
const EventEmitter = require('events');

class MidiController extends EventEmitter {
  constructor(inputName){
    super();
    this.inputName = inputName;
    this.input = null;
  }

  connect(){
    this.input = new easymidi.Input(this.inputName);
    this.input.on('noteon',(msg)=>this.emit('noteon',msg));
    this.input.on('noteoff',(msg)=>this.emit('noteoff',msg));
    this.input.on('cc',(msg)=>this.emit('cc',msg));
    console.log(`Connected to MIDI input ${this.inputName}`);
  }

  disconnect(){
    if(this.input) this.input.close();
  }
}

module.exports = MidiController;
