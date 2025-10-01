// src/beat-detector.js
// Simple beat detection from audio input or MIDI clock
const EventEmitter = require('events');

class BeatDetector extends EventEmitter {
  constructor(){
    super();
    this.lastBeat = Date.now();
    this.interval = 500; // default 120bpm
  }

  simulateBeat(){
    const now = Date.now();
    if(now - this.lastBeat >= this.interval){
      this.lastBeat = now;
      this.emit('beat');
    }
  }

  startSimulation(){
    this.timer = setInterval(()=>this.simulateBeat(),10);
  }

  stopSimulation(){
    clearInterval(this.timer);
  }
}

module.exports = BeatDetector;
