// Example script to start the system
const HueEntertainment = require('../src/hue');
const FxEngine = require('../src/fx-engine');
const fs = require('fs');
const yaml = require('yaml');


async function main(){
const hue = new HueEntertainment({ bridge_id:'<bridge-id>', username:'<username>', entertainment_id:'<entertainment-id>' });
await hue.connect();
await hue.startStream();


const fx = new FxEngine({ hueClient:hue });


// Load an effect YAML
const effectFile = fs.readFileSync('./effects/strobo.yaml','utf8');
const effectDef = yaml.parse(effectFile);


// Trigger the effect
fx.triggerEffect(effectDef);


// Simulate beat mode
setInterval(()=>fx.onBeat(),500);
}


main();