// src/dmx.js
// DMX output support using node-dmx
const DMX = require('dmx');

class DmxController {
  constructor(driver='enttec-usb-dmx-pro', device='/dev/ttyUSB0'){
    this.dmx = new DMX();
    this.universe = this.dmx.addUniverse('main', driver, device);
  }

  setChannel(channel,value){
    this.universe.update({[channel]: value});
  }

  blackout(){
    const channels = {}; for(let i=1;i<=512;i++) channels[i]=0;
    this.universe.update(channels);
  }
}

module.exports = DmxController;
