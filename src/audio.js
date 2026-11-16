/* Original procedural score, "Pocketful of Sunlight" — no external recording.
 * Music, effects and personal voice messages have independent buses. The transport
 * uses the AudioContext clock; previews use the identical score and synth. */
(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),midi=n=>440*Math.pow(2,(n-69)/12);
  const dbGain=db=>Math.pow(10,db/20),levelGain=v=>v<=0?0:dbGain(32*Math.log10(v));
  const DEFAULT_LEVELS=Object.freeze({music:.72,sfx:.8,voice:1});
  const SCENES={home:{root:62,bpm:114,pluck:'pluck'},forest:{root:65,bpm:110,pluck:'wood'},coast:{root:67,bpm:118,pluck:'pluck'},lake:{root:60,bpm:112,pluck:'bell'}};
  // [beat, duration in beats, semitones above tonic]. A asks; B answers higher.
  const A=[
    [[0,.5,4],[.5,.5,7],[1,1,9],[2,.5,7],[2.5,.5,4],[3,.75,2]],
    [[0,.75,4],[1,.5,7],[1.5,.5,11],[2,1,9],[3,.5,7],[3.5,.5,4]],
    [[0,.5,5],[.5,.5,9],[1,.75,12],[2,.5,9],[2.5,.5,7],[3,.75,5]],
    [[0,1,4],[1.5,.5,2],[2,.5,4],[2.5,.5,7],[3,.75,2]],
    [[0,.5,4],[.5,.5,7],[1,.5,9],[1.5,.5,12],[2,1,11],[3,.75,7]],
    [[0,.75,9],[1,.5,7],[1.5,.5,4],[2,.5,2],[3,.75,4]],
    [[0,.5,5],[.5,.5,4],[1,1,2],[2,.5,7],[2.5,.5,11],[3,.75,9]],
    [[0,.5,7],[.5,.5,4],[1,.75,2],[2,1.5,0]]
  ];
  const B=[
    [[0,.75,12],[1,.5,11],[1.5,.5,9],[2,.5,7],[2.5,.5,9],[3,.75,12]],
    [[0,.5,14],[.5,.5,12],[1,1,11],[2,.5,9],[3,.75,7]],
    [[0,.5,9],[.5,.5,12],[1,.75,16],[2,.5,14],[2.5,.5,12],[3,.75,9]],
    [[0,.75,11],[1,.5,9],[1.5,.5,7],[2,.75,4],[3,.5,7]],
    [[0,.5,12],[.5,.5,9],[1,.5,7],[1.5,.5,4],[2,1,5],[3,.5,9]],
    [[0,.75,11],[1,.5,7],[1.5,.5,4],[2,.5,2],[2.5,.5,4],[3,.75,7]],
    [[0,.5,9],[.5,.5,7],[1,.5,5],[1.5,.5,4],[2,.5,2],[3,.75,7]],
    [[0,.5,4],[.5,.5,2],[1,1,0],[2.5,.5,7],[3,.75,12]]
  ];
  const CHORDS=[[0,4,7],[9,12,16],[5,9,12],[7,11,14],[0,4,7],[9,12,16],[5,9,12],[7,11,14],
    [0,4,7],[7,11,14],[9,12,16],[4,7,11],[5,9,12],[0,4,7],[7,11,14],[0,4,7]];
  let active=false,engine=null,transport=null,suspendTimer=null,bar=0,nextBar=0,region='home',phase='day',manualDuck=false,initError='';
  let levels={...DEFAULT_LEVELS};const voiceRecords=new Set(),voiceSources=new WeakMap(),cooldowns=new Map();
  const stats={schedulerStarts:0,barsScheduled:0,effects:0,lastEffect:null,unlocked:false};
  const hidden=()=>!!document.hidden;
  function ramp(param,value,at,duration=.12){
    if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(at);else{const current=param.value;param.cancelScheduledValues(at);param.setValueAtTime(current,at);}
    param.linearRampToValueAtTime(value,at+duration);
  }
  class Mixer {
    constructor(context,settings=DEFAULT_LEVELS,offline=false){
      this.ctx=context;this.offline=offline;this.sources=new Set();this.created=0;this.ended=0;this.maxSources=0;this.seed=81723;this.levels={...settings};this.scene='home';this.phase='day';this.ducked=false;
      this.master=context.createGain();this.master.gain.value=offline?.78:0;
      this.music=context.createGain();this.sfx=context.createGain();this.voice=context.createGain();this.musicDuck=context.createGain();
      this.musicFilter=context.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=4300;this.musicFilter.Q.value=.25;
      this.music.connect(this.musicDuck);this.musicDuck.connect(this.musicFilter);this.musicFilter.connect(this.master);this.sfx.connect(this.master);this.voice.connect(this.master);
      this.limiter=context.createDynamicsCompressor();this.limiter.threshold.value=-5;this.limiter.knee.value=4;this.limiter.ratio.value=8;this.limiter.attack.value=.003;this.limiter.release.value=.18;
      this.meter=context.createAnalyser();this.meter.fftSize=2048;this.meterBuffer=new Float32Array(2048);this.master.connect(this.limiter);this.limiter.connect(this.meter);this.meter.connect(context.destination);
      this.noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const n=this.noise.getChannelData(0);let smooth=0;for(let i=0;i<n.length;i++){smooth=.55*smooth+.45*(this.random()*2-1);n[i]=smooth;}
      this.setLevels(settings,0);
    }
    random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
    setLevels(values,duration=.12){for(const key of ['music','sfx','voice'])if(Number.isFinite(values[key])){this.levels[key]=clamp(values[key]);if(duration)ramp(this[key].gain,levelGain(this.levels[key]),this.ctx.currentTime,duration);else this[key].gain.value=levelGain(this.levels[key]);}}
    duck(yes){this.ducked=!!yes;ramp(this.musicDuck.gain,yes?dbGain(-11):1,this.ctx.currentTime,yes?.1:.55);}
    track(source,nodes,at,end,bus){
      if(!this.offline&&this.sources.size>=128){nodes.forEach(n=>n.disconnect());source.disconnect();return false;}
      const record={source,nodes,at,end,bus};this.sources.add(record);this.created++;this.maxSources=Math.max(this.maxSources,this.sources.size);
      source.onended=()=>{source.disconnect();nodes.forEach(n=>n.disconnect());this.sources.delete(record);this.ended++;};source.start(at);source.stop(end);return true;
    }
    envelope(gain,at,duration,volume,attack=.006){const g=gain.gain;g.setValueAtTime(0,at);g.linearRampToValueAtTime(volume,at+attack);g.exponentialRampToValueAtTime(Math.max(.00002,volume*.58),at+Math.max(attack+.004,duration*.24));g.exponentialRampToValueAtTime(Math.max(.000015,volume*.1),at+Math.max(attack+.008,duration*.7));g.exponentialRampToValueAtTime(.00001,at+Math.max(attack+.015,duration));g.setValueAtTime(0,at+duration+.008);}
    note(note,at,duration=.4,volume=.12,instrument='pluck',bus='music',pan=0,endNote=null){
      const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),panner=c.createStereoPanner();osc.type=instrument==='pluck'?'triangle':'sine';osc.frequency.setValueAtTime(midi(note),at);if(endNote!==null)osc.frequency.exponentialRampToValueAtTime(midi(endNote),at+duration*.85);
      panner.pan.value=clamp(pan,-1,1);this.envelope(gain,at,duration,volume,instrument==='bass'?.014:.006);osc.connect(gain);gain.connect(panner);panner.connect(this[bus]);this.track(osc,[gain,panner],at,at+duration+.015,bus);
      if(instrument==='bell'){
        const partial=c.createOscillator(),spark=c.createGain();partial.type='sine';partial.frequency.value=midi(note)*2.006;this.envelope(spark,at,Math.min(.28,duration*.45),volume*.19,.003);partial.connect(spark);spark.connect(this[bus]);this.track(partial,[spark],at,at+Math.min(.28,duration*.45)+.02,bus);
      }
    }
    noiseHit(at,duration,volume,frequency=1300,type='bandpass',pan=0){
      const c=this.ctx,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),panner=c.createStereoPanner();source.buffer=this.noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.65;panner.pan.value=pan;this.envelope(gain,at,duration,volume,.004);source.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(this.sfx);this.track(source,[filter,gain,panner],at,at+duration+.015,'sfx');
    }
    drum(at,kind,volume){
      if(kind==='kick'){this.note(43,at,.14,volume,'bass','music',0,26);return;}
      if(kind==='wood'){this.note(76,at,.055,volume,'wood','music',.16);return;}
      const c=this.ctx,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;filter.type='highpass';filter.frequency.value=kind==='brush'?2600:3900;this.envelope(gain,at,kind==='brush'?.065:.035,volume,.003);source.connect(filter);filter.connect(gain);gain.connect(this.music);this.track(source,[filter,gain],at,at+.09,'music');
    }
    queueBar(index,at,scene=this.scene,dayPhase=this.phase){
      const setting=SCENES[scene]||SCENES.home,night=dayPhase==='night',beat=60/(setting.bpm-(night?6:0)),position=index%16,chord=CHORDS[position],melody=position<8?A[position]:B[position-8],root=setting.root;
      this.scene=scene;this.phase=dayPhase;
      for(const [start,length,interval] of melody)this.note(root+12+interval,at+start*beat,Math.max(.18,length*beat*.85),night?.15:.19,'bell','music',-.08);
      for(let i=0;i<8;i++){const pick=chord[[0,1,2,1,0,2,1,2][i]],swing=i%2?.025:0;this.note(root+pick,at+i*.5*beat+swing,.29,night?.065:.085,setting.pluck,'music',i%2?.26:-.26);}
      this.note(root+chord[0]-24,at,beat*1.6,.23,'bass','music');this.note(root+chord[0]-17,at+2*beat,beat*1.35,.17,'bass','music');
      for(let i=0;i<3;i++)this.note(root+chord[i],at+i*.018,beat*1.65,.047,'pluck','music',.12);
      this.drum(at,'kick',night?.055:.105);this.drum(at+2*beat,'kick',night?.045:.082);
      for(const n of [1,3])this.drum(at+n*beat,'wood',night?.018:.033);
      if(!night)for(let n=0;n<8;n++)this.drum(at+(n*.5+.03)*beat,'brush',n%2?.041:.023);
      if(position===7||position===15){for(let n=0;n<3;n++)this.note(root+24+[7,4,0][n],at+(3+n*.25)*beat,.38,.05,'bell','music',.22);}
      return beat*4;
    }
    effect(kind,at=this.ctx.currentTime+.008){
      const variation=(this.random()-.5)*.6,v=.93+this.random()*.14;
      const n=(note,delay,duration,volume=.15,type='pluck',end=null)=>this.note(note+variation,at+delay,duration,volume*v,type,'sfx',0,end===null?null:end+variation);
      const hit=(delay,duration,volume,freq=1200,type='bandpass')=>this.noiseHit(at+delay,duration,volume*v,freq,type);
      switch(kind){
        case 'button':n(79,0,.055,.07,'wood');n(86,.035,.07,.035,'bell');break;
        case 'dialogue':hit(0,.085,.055,950,'lowpass');n(74,.025,.1,.06,'wood');break;
        case 'memory':case 'pickup':[74,78,81,86].forEach((pitch,i)=>n(pitch,i*.095,.52,.14,'bell'));break;
        case 'wrong':n(67,0,.14,.11,'wood');n(64,.11,.17,.08,'wood');break;
        case 'finale':[62,66,69,74,78,81,86,90].forEach((pitch,i)=>n(pitch,i*.12,.85,.14,i<3?'pluck':'bell'));[50,57,62].forEach(p=>n(p,.02,1.25,.08,'bass'));break;
        case 'jump':n(62,0,.17,.105,'pluck',81);hit(.02,.07,.025,2000);break;
        case 'land':n(43,0,.12,.14,'bass',32);hit(0,.13,.15,this.scene==='coast'?550:900,'lowpass');break;
        case 'footstep':n(this.scene==='coast'?42:46,0,.055,.055,'wood');hit(0,.07,this.scene==='coast'?.09:.055,this.scene==='forest'?1700:800,'lowpass');break;
        case 'plant':hit(0,.18,.16,650,'lowpass');n(62,.08,.16,.08);n(69,.16,.22,.095,'bell');break;
        case 'water':hit(0,.45,.09,1800);[79,83,86].forEach((pitch,i)=>n(pitch,.08+i*.105,.16,.07,'wood',pitch-7));break;
        case 'paper_boat':hit(0,.16,.07,2300);hit(.14,.3,.095,800,'lowpass');n(74,.16,.36,.09,'bell');n(81,.34,.52,.09,'bell');break;
        case 'stone_skip':for(let i=0;i<3;i++){const delay=i*.31;hit(delay,.065,.1-i*.02,1450+i*250);n(78+i*3,delay,.105,.105-i*.02,'wood',70+i*3);}break;
        case 'windmill':for(let i=0;i<4;i++)n(67+i%2*7,i*.085,.09,.065,'wood');n(86,.24,.5,.085,'bell');hit(.08,.4,.035,1500,'lowpass');break;
        case 'sandcastle':hit(0,.16,.18,470,'lowpass');hit(.16,.12,.11,650,'lowpass');n(50,.015,.12,.09,'bass');n(74,.25,.23,.07,'bell');break;
        case 'swing':n(62,0,.28,.095,'pluck',69);n(81,.19,.42,.07,'bell');hit(0,.22,.025,700,'lowpass');break;
        case 'stroll':n(74,0,.35,.095);n(78,.17,.45,.075,'bell');n(81,.32,.55,.08,'bell');break;
        case 'shutter':hit(0,.026,.25,2100,'highpass');hit(.055,.045,.15,1300,'bandpass');n(84,.065,.04,.045,'wood');break;
        default:n(74,0,.12,.065,'wood');
      }
    }
    stopSources(fade=0){for(const item of [...this.sources]){if(fade){for(const node of item.nodes)if(node.gain)ramp(node.gain,0,this.ctx.currentTime,fade);try{item.source.stop(this.ctx.currentTime+fade+.005);}catch{}}else{try{item.source.stop(this.ctx.currentTime);}catch{}item.source.disconnect();item.nodes.forEach(n=>n.disconnect());this.sources.delete(item);}}}
    meterValue(){this.meter.getFloatTimeDomainData(this.meterBuffer);let peak=0,sum=0;for(const sample of this.meterBuffer){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}return{peak,rms:Math.sqrt(sum/this.meterBuffer.length)};}
  }
  function ensure(){
    if(engine)return engine;
    if(navigator.userActivation&&!navigator.userActivation.hasBeenActive&&!navigator.userActivation.isActive)return null;
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context){initError='Web Audio unavailable';return null;}
    try{engine=new Mixer(new Context({latencyHint:'interactive'}),levels);stats.unlocked=true;initError='';for(const record of voiceRecords)connectVoice(record);return engine;}catch(error){initError=error.message||'Audio initialization failed';return null;}
  }
  function clearTransport(){if(transport!==null){clearInterval(transport);transport=null;}}
  function applyDuck(){engine?.duck((manualDuck||[...voiceRecords].some(r=>!r.element.paused&&!r.element.ended))&&levels.voice>0);}
  function cleanVoices(){for(const record of [...voiceRecords]){if(record.element.isConnected)record.wasConnected=true;else if(record.wasConnected)releaseVoice(record.element);}}
  function tick(){
    if(!engine||!active||hidden()||engine.ctx.state!=='running')return;
    cleanVoices();const now=engine.ctx.currentTime;if(nextBar<now-.2)nextBar=now+.04;
    while(nextBar<now+.12){nextBar+=engine.queueBar(bar++,nextBar,region,phase);stats.barsScheduled++;}
  }
  function startTransport(){
    if(!active||hidden()||!engine)return;
    clearTimeout(suspendTimer);suspendTimer=null;
    engine.ctx.resume().then(()=>{if(!active||hidden()){engine.ctx.suspend().catch(()=>{});return;}ramp(engine.master.gain,.78,engine.ctx.currentTime,.16);if(transport===null){nextBar=engine.ctx.currentTime+.045;tick();transport=setInterval(tick,25);stats.schedulerStarts++;}applyDuck();}).catch(()=>{});
  }
  function set(on){
    active=!!on;clearTimeout(suspendTimer);suspendTimer=null;
    if(active){const mixer=ensure();if(!mixer&&initError)active=false;for(const record of voiceRecords)record.element.muted=!mixer;if(mixer)startTransport();}
    else{clearTransport();manualDuck=false;for(const record of voiceRecords){record.resume=false;record.element.pause();record.element.muted=true;}if(engine){ramp(engine.master.gain,0,engine.ctx.currentTime,.035);engine.stopSources(.025);suspendTimer=setTimeout(()=>{if(!active){engine.stopSources();engine.ctx.suspend().catch(()=>{});}suspendTimer=null;},55);}}
    return active;
  }
  function setLevels(values={}){for(const key of ['music','sfx','voice'])if(Number.isFinite(values[key]))levels[key]=clamp(values[key]);engine?.setLevels(levels);applyDuck();return{...levels};}
  function setRegion(id){region=SCENES[id]?id:'home';}
  function setPhase(value){phase=['day','dusk','night'].includes(value)?value:'day';}
  function sound(kind,rate=0){
    if(!active||hidden())return false;const mixer=ensure();if(!mixer||mixer.ctx.state!=='running')return false;
    const now=mixer.ctx.currentTime;if(rate&&now-(cooldowns.get(kind)??-100)<rate)return false;cooldowns.set(kind,now);mixer.scene=region;mixer.effect(kind);stats.effects++;stats.lastEffect=kind;return true;
  }
  function activity(kind){return sound(({build:'sandcastle',skip:'stone_skip',boat:'paper_boat',garden:'plant'})[kind]||kind,.055);}
  function connectVoice(record){
    if(!engine)return;let source=voiceSources.get(record.element);if(!source){try{source=engine.ctx.createMediaElementSource(record.element);voiceSources.set(record.element,source);}catch{record.element.muted=true;return;}}
    if(record.source!==source){source.connect(engine.voice);record.source=source;}record.element.muted=!active;
  }
  function attachVoice(element){
    if(!element)return()=>{};cleanVoices();const existing=[...voiceRecords].find(r=>r.element===element);if(existing)return()=>releaseVoice(element);
    const record={element,source:null,wasConnected:element.isConnected,resume:false};record.play=()=>{if(!active){element.muted=true;return;}ensure();connectVoice(record);startTransport();applyDuck();};record.stop=()=>applyDuck();
    element.addEventListener('play',record.play);element.addEventListener('pause',record.stop);element.addEventListener('ended',record.stop);voiceRecords.add(record);element.muted=!active;if(engine)connectVoice(record);return()=>releaseVoice(element);
  }
  function releaseVoice(element){const record=[...voiceRecords].find(r=>r.element===element);if(!record)return;record.element.pause();record.element.removeEventListener('play',record.play);record.element.removeEventListener('pause',record.stop);record.element.removeEventListener('ended',record.stop);record.source?.disconnect();voiceRecords.delete(record);applyDuck();}
  function visibility(){
    if(!engine)return;
    if(hidden()){clearTransport();for(const record of voiceRecords){record.resume=!record.element.paused&&!record.element.ended;record.element.pause();}engine.master.gain.cancelScheduledValues(engine.ctx.currentTime);engine.master.gain.setValueAtTime(0,engine.ctx.currentTime);engine.stopSources();engine.ctx.suspend().catch(()=>{});}
    else if(active){startTransport();for(const record of voiceRecords)if(record.resume){record.resume=false;record.element.play().catch(()=>{});}}
  }
  function unlock(){if(active&&!hidden()){ensure();for(const record of voiceRecords)if(engine)connectVoice(record);startTransport();}}
  document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',visibility);
  async function renderPreview(options={}){
    const duration=clamp(Number(options.duration)||18,1,90),rate=44100,offline=new OfflineAudioContext(2,Math.ceil(rate*duration),rate),mixer=new Mixer(offline,{...DEFAULT_LEVELS,...options.levels},true);
    const scene=SCENES[options.region]?options.region:'home',dayPhase=options.phase||'day';mixer.scene=scene;mixer.phase=dayPhase;
    if(options.music!==false){let at=.06,index=options.startBar||0;while(at<duration-.1)at+=mixer.queueBar(index++,at,scene,dayPhase);}
    if(options.effects){const sequence=Array.isArray(options.effects)?options.effects:['button','dialogue','memory','jump','land','plant','water','paper_boat','stone_skip','windmill','sandcastle','swing','shutter','finale'];sequence.forEach((kind,i)=>mixer.effect(kind,.15+i*Math.max(.45,(duration-2)/sequence.length)));}
    if(options.duckAt!==undefined){mixer.musicDuck.gain.setValueAtTime(1,options.duckAt);mixer.musicDuck.gain.linearRampToValueAtTime(dbGain(-11),options.duckAt+.1);mixer.musicDuck.gain.setValueAtTime(dbGain(-11),options.duckAt+2);mixer.musicDuck.gain.linearRampToValueAtTime(1,options.duckAt+2.55);}
    if(options.muteAt!==undefined){mixer.master.gain.setValueAtTime(.78,Math.max(0,options.muteAt));mixer.master.gain.linearRampToValueAtTime(0,options.muteAt+.035);}
    else{mixer.master.gain.setValueAtTime(.78,Math.max(0,duration-.45));mixer.master.gain.linearRampToValueAtTime(0,duration-.02);}
    return offline.startRendering();
  }
  function snapshot(){const meter=engine?.ctx.state==='running'?engine.meterValue():{peak:0,rms:0};return{...stats,active,initError,contextState:engine?.ctx.state||'uninitialized',timerCount:transport===null?0:1,region,phase,section:Math.max(0,bar-1)%16<8?'A':'B',bar,levels:{...levels},gains:engine?{master:engine.master.gain.value,music:engine.music.gain.value,sfx:engine.sfx.gain.value,voice:engine.voice.gain.value,duck:engine.musicDuck.gain.value}:null,liveSources:engine?.sources.size||0,createdSources:engine?.created||0,endedSources:engine?.ended||0,maxSources:engine?.maxSources||0,voiceElements:voiceRecords.size,...meter};}
  window.IslandAudio={set,setLevels,setRegion,setPhase,activity,attachVoice,releaseVoice,renderPreview,snapshot,defaults:DEFAULT_LEVELS,
    chime:(kind='memory')=>sound(kind,.075),footstep:()=>sound('footstep',.15),jump:()=>sound('jump',.1),land:()=>sound('land',.1),ui:(kind='button')=>sound(kind,.055),dialogue:()=>sound('dialogue',.08),duck:yes=>{manualDuck=!!yes;applyDuck();}};
})();
