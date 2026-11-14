import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let source = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, 'application script exists');
source = source.replace(
  'setup();resize();',
  `setup();resize();window.__trafficQA={
    maxActive:0,maxWaiting:0,maxQueued:0,
    advance(seconds,step=.25){let left=seconds;while(left>1e-9){const dt=Math.min(step,left);if(running){tick(dt);this.maxActive=Math.max(this.maxActive,vehicles.length);this.maxWaiting=Math.max(this.maxWaiting,pending.length);this.maxQueued=Math.max(this.maxQueued,vehicles.filter(v=>v.queued).length+pending.length)}left-=dt}render();metrics()},
    cars(){return vehicles.map(v=>({id:v.id,edge:v.edge,dir:v.dir,lane:v.lane,pos:v.pos,queued:v.queued,speed:v.speed}))},
    state(){const lanes=new Map();let overlaps=0,minGap=Infinity;for(const v of vehicles){const k=v.edge+':'+v.dir+':'+v.lane;if(!lanes.has(k))lanes.set(k,[]);lanes.get(k).push(v)}for(const list of lanes.values()){list.sort((a,b)=>b.pos-a.pos);for(let i=1;i<list.length;i++){const gap=list[i-1].pos-list[i].pos-.005;minGap=Math.min(minGap,gap);if(gap<0)overlaps++}}const recent=history.filter(s=>s.t>elapsed-60),sourceSpillback=pending.filter(req=>{const a=req.path?.[0];return a&&Array.from({length:edges[a.edge].lanes},(_,lane)=>vehicles.some(v=>v.edge===a.edge&&v.dir===a.dir&&v.lane===lane&&v.pos<gapFor({speed:0}))).every(Boolean)}).length;return{network:network.value,simSeconds:elapsed,arrivals:tripId,active:vehicles.length,waiting:pending.length,unroutable:pending.filter(v=>!v.path?.length).length,sourceSpillback,completed,queued:vehicles.filter(v=>v.queued).length+pending.length,speed:Number.parseFloat($('speedMetric').innerHTML)||0,flow:Number.parseFloat($('flowMetric').innerHTML)||0,meanTrip:tripTimes.length?tripTimes.reduce((a,b)=>a+b,0)/tripTimes.length/60:null,overlaps,minGap,recentDistance:recent.reduce((n,s)=>n+s.d,0),recentCompletions:recent.reduce((n,s)=>n+s.c,0),maxActive:this.maxActive,maxWaiting:this.maxWaiting,maxQueued:this.maxQueued,flyovers:$('flyovers').checked,signals:$('signals').checked,capacity:capacity.value,demand:demand.value,vehiclesOnFlyover:vehicles.filter(v=>edges[v.edge].fly).length,vehiclesOnDisabledFlyover:vehicles.filter(v=>!$('flyovers').checked&&edges[v.edge].fly).length,closedFutureRoutes:vehicles.filter(v=>v.path.slice(v.pathIndex+1).some(a=>edges[a.edge].fly)&&!$('flyovers').checked).length,pendingClosedRoutes:pending.filter(v=>v.path?.some(a=>edges[a.edge].fly)&&!$('flyovers').checked).length,counts:$('linkCount').textContent,status:$('status').textContent,button:$('toggle').innerHTML,timer:$('simtime').textContent,runHint:$('runHint').textContent,waitingLabel:$('waitingCount').textContent,activeLabel:$('activeCount').textContent,completedLabel:$('completedCount').textContent,simRate:$('simSpeed').textContent}},
    reset:()=>setup(),run:()=>{if(!running)$('toggle').onclick()},pause:()=>{if(running)$('toggle').onclick()},set:({network:net,demand:d,capacity:c,flyovers:f,signals:g})=>{if(net!==undefined)network.value=net;if(d!==undefined)demand.value=d;if(c!==undefined)capacity.value=c;if(f!==undefined)$('flyovers').checked=f;if(g!==undefined)$('signals').checked=g;this.maxActive=0;this.maxWaiting=0;this.maxQueued=0;setup();demand.oninput();capacity.oninput();signalCycle.oninput()}
  };`
);

const ids = `map network demand capacity signal flyovers signals toggle reset status chartUnit chartAgo networkDesc networkBadge linkCount speedMetric flowMetric timeMetric congMetric congLabel speedDelta flowWindow activeCount waitingCount completedCount simtime runHint simSpeed insight linePath areaPath toast demandOut capacityOut signalOut`;
const elements = Object.fromEntries(ids.split(/\s+/).map(id => [id, {
  id, value: ({network:'grid', demand:'3', capacity:'3', signal:'45'}[id] || ''),
  textContent:'', innerHTML:'', checked:id==='flyovers'||id==='signals',
  setAttribute(){}, addEventListener(){}, classList:{add(){},remove(){}}
}]));
const context = new Proxy({}, {get(target,key){if(key==='setLineDash')return ()=>{};return target[key]||(()=>{})}});
elements.map.getContext=()=>context;
elements.map.getBoundingClientRect=()=>({width:960,height:427});
const document={getElementById:id=>elements[id],body:{}};
const window={devicePixelRatio:1,addEventListener(){}};
let now=0;
const sandbox={document,window,performance:{now:()=>now},requestAnimationFrame(){},setTimeout(){return 0},Math,Date,console};
vm.runInNewContext(source,sandbox,{filename:'index.html inline script'});
const qa=window.__trafficQA;
assert.ok(qa,'QA hooks injected into isolated test copy');
const history=[];
function scenario(config,duration=180){qa.set(config);qa.run();qa.advance(duration);qa.pause();const result=qa.state();history.push({...config,...result});return result}

const low=scenario({network:'grid',demand:1,capacity:3,flyovers:true,signals:true},180);
assert.equal(low.simSeconds,180);
assert.equal(low.status,'PAUSED');
assert.equal(low.button.includes('Resume'),true);
assert.equal(low.waiting,0,'low demand is admitted without an entry queue');
assert.equal(low.queued,0,'low demand stays free-flowing');
assert.equal(Number(low.waitingLabel),low.waiting);
assert.equal(Number(low.activeLabel),low.active);
assert.equal(Number(low.completedLabel),low.completed);

const comparisons={};
for(const network of ['grid','arterial','mixed']){
  const base={network,demand:5,capacity:3,flyovers:true,signals:true};
  comparisons[network]={
    capacityMinus20:scenario({...base,capacity:1}),
    capacityBase:scenario({...base,capacity:3}),
    capacityPlus20:scenario({...base,capacity:5}),
    flyoversOff:scenario({...base,flyovers:false}),
    flyoversOn:scenario({...base,flyovers:true}),
    signalsOff:scenario({...base,signals:false}),
    signalsOn:scenario({...base,signals:true})
  };
}

const heavy=scenario({network:'grid',demand:5,capacity:3,flyovers:true,signals:true},900);
assert.equal(heavy.simSeconds,900);
assert.equal(heavy.unroutable,0,'all generated demand has a route in the connected test networks');
assert.equal(heavy.overlaps,0,'no vehicles overlap in the same directed lane');
assert.ok(heavy.waiting>0,'heavy arrivals remain visible in source queues');
assert.ok(heavy.completed>0,'heavy run completes trips');
assert.ok(heavy.sourceSpillback>0,'some source queues are blocked by physically occupied entry lanes');
assert.equal(heavy.arrivals,heavy.active+heavy.waiting+heavy.completed,'every generated request is completed, active, or waiting');

qa.set({network:'grid',demand:5,capacity:3,flyovers:true,signals:true});qa.run();qa.advance(60);const beforeFlyoverClose=qa.state();elements.flyovers.checked=false;elements.flyovers.onchange();const closingFlyover=qa.state();qa.advance(180);qa.pause();const afterFlyoverClose=qa.state();assert.ok(beforeFlyoverClose.vehiclesOnFlyover>0,'at least one vehicle is on a flyover before closure');assert.equal(closingFlyover.closedFutureRoutes,0,'remaining route legs avoid newly closed flyovers');assert.equal(closingFlyover.pendingClosedRoutes,0,'waiting demand is rerouted off closed flyovers');assert.equal(afterFlyoverClose.vehiclesOnDisabledFlyover,0,'vehicles already on a flyover clear it after closure');

const beforeProgress=qa.cars();qa.run();qa.advance(60);qa.pause();const afterProgress=qa.cars(),afterHeavy=qa.state();
const afterById=new Map(afterProgress.map(v=>[v.id,v]));
const stuckNonqueued=beforeProgress.filter(v=>{const after=afterById.get(v.id);return after&&!after.queued&&after.edge===v.edge&&after.dir===v.dir&&after.lane===v.lane&&Math.abs(after.pos-v.pos)<1e-9}).length;
assert.ok(afterHeavy.recentDistance>0,'traffic continues moving during heavy load');
assert.ok(afterHeavy.recentCompletions>0,'heavy scenario is not gridlocked');

const pauseStart=qa.state();qa.run();qa.advance(10);qa.pause();const frozen=qa.state();qa.advance(30);const remainsFrozen=qa.state();assert.equal(remainsFrozen.simSeconds,frozen.simSeconds,'paused simulation time stays fixed');assert.equal(remainsFrozen.active,frozen.active,'paused vehicle count stays fixed');assert.deepEqual(remainsFrozen, frozen);
qa.run();qa.advance(10);qa.pause();const resumed=qa.state();assert.ok(resumed.simSeconds>remainsFrozen.simSeconds,'resume advances the timer');assert.notEqual(JSON.stringify(resumed),JSON.stringify(remainsFrozen),'resume advances state');
qa.reset();let resetState=qa.state();assert.equal(resetState.status,'READY');assert.equal(resetState.timer,'00:00');assert.ok(resetState.button.includes('Run simulation'));assert.ok(resetState.timeMetric==='undefined'||resetState.meanTrip===null);

qa.set({network:'grid',demand:5,capacity:3,flyovers:true,signals:true});qa.run();qa.advance(10);qa.pause();elements.network.value='arterial';elements.network.onchange();const changedPaused=qa.state();assert.equal(changedPaused.status,'READY');assert.equal(changedPaused.timer,'00:00');assert.ok(changedPaused.button.includes('Run simulation'));assert.match(changedPaused.counts,/10 active \/ 10 links · 8 junctions/);
qa.run();qa.advance(10);elements.network.value='mixed';elements.network.onchange();const changedRunning=qa.state();assert.equal(changedRunning.status,'READY');assert.equal(changedRunning.timer,'00:00');assert.ok(changedRunning.button.includes('Run simulation'));assert.match(changedRunning.counts,/15 active \/ 15 links · 9 junctions/);
assert.match(html,/@media\(max-width:850px\)/);assert.match(html,/@media\(max-width:520px\)/);

console.log(JSON.stringify({lowDemand:low,comparisons,heavyLoad:{...heavy,arrivalsAccounted:heavy.arrivals===heavy.active+heavy.waiting+heavy.completed,maxActive:heavy.maxActive,maxWaiting:heavy.maxWaiting,maxQueued:heavy.maxQueued,progressAfterAdditional60s:{recentDistance:afterHeavy.recentDistance,recentCompletions:afterHeavy.recentCompletions,stuckNonqueued},flyoverClosure:{vehiclesAlreadyOnFlyover:beforeFlyoverClose.vehiclesOnFlyover,closedFutureRoutesAfterToggle:closingFlyover.closedFutureRoutes,pendingClosedRoutesAfterToggle:closingFlyover.pendingClosedRoutes,strandedOnClosedFlyoverAfterClearance:afterFlyoverClose.vehiclesOnDisabledFlyover}},lifecycle:{pauseFreeze:true,resumeRestarts:true,resetReady:true,changeNetworkWhilePausedReady:true,changeNetworkWhileRunningReady:true,mobileCssBreakpointsPresent:true},simulations:history.length},null,2));
