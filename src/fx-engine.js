// src/fx-engine.js
// FX engine: executes effects, beat-mode, maps to Hue and DMX
class FxEngine {
  constructor({ hueClient, dmxController, depthMap, logger = console }) {
    this.hue = hueClient;
    this.dmx = dmxController;
    this.depthMap = depthMap || {};
    this.logger = logger;
    this.activeEffects = new Map();
    this.beatCounter = 0;
    this.beatModeEnabled = true;

    this.defaultColors = {
      bass: { r:255,g:180,b:80 },
      mids: { r:120,g:200,b:255 },
      highs: { r:255,g:255,b:255 }
    };
  }

  async triggerEffect(effectDef) {
    const id = `${effectDef.name}-${Date.now()}`;
    this.logger.log('Triggering effect', effectDef.name, id);
    if (effectDef.pattern && Array.isArray(effectDef.pattern)) {
      const run = async () => {
        for (const step of effectDef.pattern) await this._runStep(step, effectDef.params||{});
      };
      run().catch(err => this.logger.error(err));
      this.activeEffects.set(id,{def:effectDef,running:true});
      return id;
    }
    return null;
  }

  async _runStep(step, params) {
    const action = step.action;
    const target = step.target || 'all';
    const p = {...params,...(step.params||{})};

    switch(action){
      case 'pulse': await this._pulse(target,p); break;
      case 'fade_in': await this._fade(target,p.from||0,p.to||254,p.ms||500); break;
      case 'fade_out_fast': await this._fade(target,p.from||254,p.to||0,p.ms||80); break;
      case 'hold': await this._sleep(p.ms||200); break;
      case 'sweep': await this._sweep(p); break;
      case 'set_brightness': await this._setBrightness(target,p.brightness); break;
      default: this.logger.warn('Unknown FX action',action);
    }
  }

  async _pulse(target,p){
    const intensity = p.intensity||254;
    const ms = p.duration||50;
    const frames = this._buildFramesForTarget(target,p.color?[...p.color]:[255,255,255],intensity);
    this.hue.sendFrame(frames);
    if(this.dmx) this._sendDmxForTarget(target,intensity);
    await this._sleep(ms);
    const restore = this._buildFramesForTarget(target,[0,0,0],0);
    this.hue.sendFrame(restore);
    if(this.dmx) this._sendDmxForTarget(target,0);
  }

  async _fade(target,from,to,ms){
    const steps = Math.max(3,Math.round(ms/50));
    for(let i=0;i<=steps;i++){
      const b=Math.round(from+(to-from)*(i/steps));
      const frames=this._buildFramesForTarget(target,null,b);
      this.hue.sendFrame(frames);
      if(this.dmx) this._sendDmxForTarget(target,b);
      await this._sleep(Math.round(ms/steps));
    }
  }

  async _sweep(params){
    const ms=params.ms||1200;
    const from=params.from||'left';
    const to=params.to||'right';
    const color=params.color||[0,128,255];
    const orderedLights=this.hue.lightOrder.slice();
    if(from==='right') orderedLights.reverse();
    const per=Math.max(1,Math.round(ms/orderedLights.length));
    for(const lid of orderedLights){
      this.hue.sendFrame([{lightId:lid,r:color[0],g:color[1],b:color[2],brightness:254}]);
      if(this.dmx) this._sendDmxForTarget(lid,254);
      await this._sleep(per);
      this.hue.sendFrame([{lightId:lid,r:0,g:0,b:0,brightness:0}]);
      if(this.dmx) this._sendDmxForTarget(lid,0);
    }
  }

  async _setBrightness(target,brightness){
    const frames=this._buildFramesForTarget(target,null,brightness);
    this.hue.sendFrame(frames);
    if(this.dmx) this._sendDmxForTarget(target,brightness);
  }

  _buildFramesForTarget(target,color,brightness){
    const lights=this.hue.lightOrder||[];
    const frames=[];
    const rgb=Array.isArray(color)?color:null;
    if(target==='all'){for(const lid of lights) frames.push({lightId:lid,r:rgb?rgb[0]:0,g:rgb?rgb[1]:0,b:rgb?rgb[2]:0,brightness}); return frames;}
    if(['front','mid','far','floor','ceiling'].includes(target)){
      const zoneLights=this._lightsForZone(target);
      for(const lid of zoneLights) frames.push({lightId:lid,r:rgb?rgb[0]:0,g:rgb?rgb[1]:0,b:rgb?rgb[2]:0,brightness});
      return frames;
    }
    if(typeof target==='number'||/^\d+$/.test(String(target))){frames.push({lightId:Number(target),r:rgb?rgb[0]:0,g:rgb?rgb[1]:0,b:rgb?rgb[2]:0,brightness});return frames;}
    return this._buildFramesForTarget('all',color,brightness);
  }

  _lightsForZone(zone){
    const zones=this.depthMap&&this.depthMap.zones;
    if(!zones) return this.hue.lightOrder||[];
    return zones[zone]||[];
  }

  _sendDmxForTarget(target,value){
    if(!this.dmx||!this.dmx.universe) return;
    const lights=this._lightsForZone(target||'all');
    let ch=1;
    for(const lid of lights){
      try{this.dmx.setChannel(ch,Math.round((value/254)*255));}catch(err){this.logger.warn(err.message)}
      ch+=1;
    }
  }

  onBeat(){
    if(!this.beatModeEnabled) return;
    this.beatCounter+=1;
    const isDownbeat=(this.beatCounter%4)===1;
    if(isDownbeat){
      const color=this.defaultColors.bass;
      const frames=this._buildFramesForTarget('floor',[color.r,color.g,color.b],254);
      this.hue.sendFrame(frames);
      if(this.dmx) this._sendDmxForTarget('floor',254);
    }else{
      const color=this.defaultColors.highs;
      const frames=this._buildFramesForTarget('ceiling',[color.r,color.g,color.b],150);
      this.hue.sendFrame(frames);
      if(this.dmx) this._sendDmxForTarget('ceiling',150);
    }
    setTimeout(()=>{
      const restore=this._buildFramesForTarget('all',[0,0,0],0);
      this.hue.sendFrame(restore);
      if(this.dmx) this._sendDmxForTarget('all',0);
    },80);
  }

  _sleep(ms){return new Promise(r=>setTimeout(r,ms));}
}

module.exports = FxEngine;
