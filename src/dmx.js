// src/dmx.js
// DMX output support using dmx
const DMX = require('dmx');

class DmxController {
  constructor(driver='enttec-usb-dmx-pro', device='/dev/ttyUSB0'){
    try {
      this.dmx = new DMX();
      this.universe = this.dmx.addUniverse('main', driver, device);
      console.log(`DMX controller initialized with ${driver} on ${device}`);
    } catch (err) {
      console.warn('DMX initialization failed:', err.message);
      this.dmx = null;
      this.universe = null;
    }
  }

  setChannel(channel,value){
    if (this.universe) {
      this.universe.update({[channel]: value});
    }
  }

  blackout(){
    if (this.universe) {
      const channels = {}; 
      for(let i=1;i<=512;i++) channels[i]=0;
      this.universe.update(channels);
    }
  }

  isConnected() {
    return this.universe !== null;
  }
}

module.exports = DmxController;
