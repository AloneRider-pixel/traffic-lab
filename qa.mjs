import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let source = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, 'application script exists');
source = source.replace(
  'setup();resize();',
  `setup();resize();window.__trafficQA={
    maxActive:0,maxWaiting:0,maxQueued:0,minGapDuringRun:Infinity,spacingViolationPairChecks:0,spacingPairChecks:0,junctionConflictSteps:0,groundJunctionTransitions:0,maxGroundTransitionsPerJunctionStep:0,
    checkSpacing(){const groups=new Map();for(const v of vehicles){const k=v.edge+':'+v.dir+':'+v.lane;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(v)}for(const group of groups.values()){group.sort((a,b)=>b.pos-a.pos);for(let i=1;i<group.length;i++){const gap=group[i-1].pos-group[i].pos-CAR_LENGTH_KM;this.minGapDuringRun=Math.min(this.minGapDuringRun,gap);this.spacingPairChecks++;if(gap<0)this.spacingViolationPairChecks++}}},
    checkJunctionTransitions(before){const perNode=new Map();for(const v of vehicles){const old=before.get(v.id);if(!old||v.pathIndex<=old.pathIndex)continue;if(edges[old.edge].fly||edges[v.edge].fly)continue;const node=old.arc.to;perNode.set(node,(perNode.get(node)||0)+1);this.groundJunctionTransitions++}for(const count of perNode.values()){this.maxGroundTransitionsPerJunctionStep=Math.max(this.maxGroundTransitionsPerJunctionStep,count);if(count>1)this.junctionConflictSteps++}},
    advance(seconds,step=.25){let left=seconds;while(left>1e-9){const dt=Math.min(step,left);if(running){const before=new Map(vehicles.map(v=>[v.id,{pathIndex:v.pathIndex,arc:v.arc,edge:v.edge}]));tick(dt);this.checkSpacing();this.checkJunctionTransitions(before);this.maxActive=Math.max(this.maxActive,vehicles.length);this.maxWaiting=Math.max(this.maxWaiting,pending.length);this.maxQueued=Math.max(this.maxQueued,vehicles.filter(v=>v.queued).length+pending.length)}left-=dt}render();metrics()},
    renderAt(width,height){W=width;H=height;window.__drawOps.length=0;render();return window.__drawOps.slice()},
    phoneMetrics(){let minProjectedBumperGap=Infinity,minIconClearance=Infinity,lanePlacementViolations=0;const groups=new Map();for(const v of vehicles){const k=v.edge+':'+v.dir+':'+v.lane;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(v);const roadHalfWidth=(edges[v.edge].lanes*2*4+4)/2,laneOffset=2+v.lane*4;if(laneOffset>roadHalfWidth)lanePlacementViolations++}for(const group of groups.values()){group.sort((a,b)=>b.pos-a.pos);for(let i=1;i<group.length;i++){const front=group[i-1],rear=group[i],e=edges[rear.edge],a=point(nodes[e.a]),b=point(nodes[e.b]),pixelScale=Math.hypot(b.x-a.x,b.y-a.y)/e.length,iconLength=Math.max(.85,Math.min(3.2,pixelScale*CAR_LENGTH_KM));minProjectedBumperGap=Math.min(minProjectedBumperGap,(front.pos-rear.pos-CAR_LENGTH_KM)*pixelScale);minIconClearance=Math.min(minIconClearance,(front.pos-rear.pos)*pixelScale-iconLength)}}return{minProjectedBumperGapPx:minProjectedBumperGap,minIconClearancePx:minIconClearance,lanePlacementViolations}},
    cars(){return vehicles.map(v=>({id:v.id,edge:v.edge,dir:v.dir,lane:v.lane,pos:v.pos,queued:v.queued,speed:v.speed}))},
    state(){const lanes=new Map();let overlaps=0,minGap=Infinity;for(const v of vehicles){const k=v.edge+':'+v.dir+':'+v.lane;if(!lanes.has(k))lanes.set(k,[]);lanes.get(k).push(v)}for(const list of lanes.values()){list.sort((a,b)=>b.pos-a.pos);for(let i=1;i<list.length;i++){const gap=list[i-1].pos-list[i].pos-CAR_LENGTH_KM;minGap=Math.min(minGap,gap);if(gap<0)overlaps++}}const recent=history.filter(s=>s.t>elapsed-60),sourceSpillback=pending.filter(req=>{const a=req.path?.[0];return a&&Array.from({length:edges[a.edge].lanes},(_,lane)=>vehicles.some(v=>v.edge===a.edge&&v.dir===a.dir&&v.lane===lane&&v.pos<gapFor({speed:0}))).every(Boolean)}).length;return{network:network.value,simSeconds:elapsed,arrivals:tripId,active:vehicles.length,waiting:pending.length,unroutable:pending.filter(v=>!v.path?.length).length,sourceSpillback,completed,queued:vehicles.filter(v=>v.queued).length+pending.length,speed:Number.parseFloat($('speedMetric').innerHTML)||0,flow:Number.parseFloat($('flowMetric').innerHTML)||0,meanTrip:tripTimes.length?tripTimes.reduce((a,b)=>a+b,0)/tripTimes.length/60:null,overlaps,minGap,minGapDuringRunKm:this.minGapDuringRun,spacingViolationPairChecks:this.spacingViolationPairChecks,spacingPairChecks:this.spacingPairChecks,junctionConflictSteps:this.junctionConflictSteps,groundJunctionTransitions:this.groundJunctionTransitions,maxGroundTransitionsPerJunctionStep:this.maxGroundTransitionsPerJunctionStep,recentDistance:recent.reduce((n,s)=>n+s.d,0),recentCompletions:recent.reduce((n,s)=>n+s.c,0),maxActive:this.maxActive,maxWaiting:this.maxWaiting,maxQueued:this.maxQueued,flyovers:$('flyovers').checked,signals:$('signals').checked,capacity:capacity.value,demand:demand.value,vehiclesOnFlyover:vehicles.filter(v=>edges[v.edge].fly).length,vehiclesOnDisabledFlyover:vehicles.filter(v=>!$('flyovers').checked&&edges[v.edge].fly).length,closedFutureRoutes:vehicles.filter(v=>v.path.slice(v.pathIndex+1).some(a=>edges[a.edge].fly)&&!$('flyovers').checked).length,pendingClosedRoutes:pending.filter(v=>v.path?.some(a=>edges[a.edge].fly)&&!$('flyovers').checked).length,counts:$('linkCount').textContent,status:$('status').textContent,button:$('toggle').innerHTML,timer:$('simtime').textContent,runHint:$('runHint').textContent,waitingLabel:$('waitingCount').textContent,activeLabel:$('activeCount').textContent,completedLabel:$('completedCount').textContent,simRate:$('simSpeed').textContent}},
    reset:()=>setup(),run:()=>{if(!running)$('toggle').onclick()},pause:()=>{if(running)$('toggle').onclick()},set:({network:net,demand:d,capacity:c,flyovers:f,signals:g})=>{if(net!==undefined)network.value=net;if(d!==undefined)demand.value=d;if(c!==undefined)capacity.value=c;if(f!==undefined)$('flyovers').checked=f;if(g!==undefined)$('signals').checked=g;this.maxActive=0;this.maxWaiting=0;this.maxQueued=0;this.minGapDuringRun=Infinity;this.spacingViolationPairChecks=0;this.spacingPairChecks=0;this.junctionConflictSteps=0;this.groundJunctionTransitions=0;this.maxGroundTransitionsPerJunctionStep=0;setup();demand.oninput();capacity.oninput();signalCycle.oninput()}
  };`
);

const ids = `map network demand capacity signal flyovers signals toggle reset status chartUnit chartAgo networkDesc networkBadge linkCount speedMetric flowMetric timeMetric congMetric congLabel speedDelta flowWindow activeCount waitingCount completedCount simtime runHint simSpeed insight linePath areaPath toast demandOut capacityOut signalOut`;
const elements = Object.fromEntries(ids.split(/\s+/).map(id => [id, {
  id, value: ({network:'grid', demand:'3', capacity:'3', signal:'45'}[id] || ''),
  textContent:'', innerHTML:'', checked:id==='flyovers'||id==='signals',
  setAttribute(){}, addEventListener(){}, classList:{add(){},remove(){}}
}]));
const drawOps=[];
const context = new Proxy({fillStyle:'',strokeStyle:'',lineWidth:1}, {get(target,key){if(key==='setLineDash')return ()=>{};if(key==='fillRect')return (...args)=>drawOps.push({type:'rect',color:target.fillStyle,args});if(key==='strokeRect')return (...args)=>drawOps.push({type:'strokeRect',color:target.strokeStyle,width:target.lineWidth,args});if(key==='stroke')return ()=>drawOps.push({type:'stroke',color:target.strokeStyle,width:target.lineWidth});if(key==='fillText')return (...args)=>drawOps.push({type:'text',text:args[0],x:args[1],y:args[2]});return target[key]||(()=>{})},set(target,key,value){target[key]=value;return true}});
elements.map.getContext=()=>context;
elements.map.getBoundingClientRect=()=>({width:960,height:427});
const document={getElementById:id=>elements[id],body:{}};
const window={devicePixelRatio:1,addEventListener(){},__drawOps:drawOps};
let now=0;
const sandbox={document,window,performance:{now:()=>now},requestAnimationFrame(){},setTimeout(){return 0},Math,Date,console};
vm.runInNewContext(source,sandbox,{filename:'index.html inline script'});
const qa=window.__trafficQA;
assert.ok(qa,'QA hooks injected into isolated test copy');
const history=[];
function scenario(config,duration=180){qa.set(config);qa.run();qa.advance(duration);qa.pause();const result=qa.state();history.push({...config,...result});return result}
function longScenario(config,duration=600){const result=scenario(config,duration);assert.equal(result.simSeconds,duration);assert.equal(result.arrivals,duration*2,'120 trips/min demand is identical for each long arterial case');assert.equal(result.unroutable,0);return result}

const low=scenario({network:'grid',demand:1,capacity:3,flyovers:true,signals:true},180);
assert.equal(low.simSeconds,180);
assert.equal(low.status,'PAUSED');
assert.equal(low.button.includes('Resume'),true);
assert.equal(low.waiting,0,'low demand is admitted without an entry queue');
assert.equal(low.queued,0,'low demand stays free-flowing');
assert.equal(low.arrivals,low.active+low.waiting+low.completed,'low-demand arrivals are accounted for');
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
for(const [network,sets] of Object.entries(comparisons))for(const [control,result] of Object.entries(sets)){assert.equal(result.simSeconds,180,network+' '+control+' uses the same run duration');assert.equal(result.arrivals,360,network+' '+control+' starts with the same Peak arrival count');assert.equal(result.unroutable,0,network+' '+control+' has no discarded/unroutable trips')}

const arterialLong={};
const arterialBase={network:'arterial',demand:5,capacity:3,flyovers:true,signals:true};
arterialLong.capacityMinus20=longScenario({...arterialBase,capacity:1});
arterialLong.capacityBase=longScenario({...arterialBase,capacity:3});
arterialLong.capacityPlus20=longScenario({...arterialBase,capacity:5});
arterialLong.flyoversOff=longScenario({...arterialBase,flyovers:false});
arterialLong.flyoversOn=longScenario({...arterialBase,flyovers:true});
arterialLong.signalsOff=longScenario({...arterialBase,signals:false});
arterialLong.signalsOn=longScenario({...arterialBase,signals:true});

const heavy=scenario({network:'grid',demand:5,capacity:3,flyovers:true,signals:true},900);
assert.equal(heavy.simSeconds,900);
assert.equal(heavy.unroutable,0,'all generated demand has a route in the connected test networks');
assert.equal(heavy.overlaps,0,'no vehicles overlap in the same directed lane');
assert.equal(heavy.spacingViolationPairChecks,0,'no negative bumper gaps occur in the heavy-load sampled ticks');
assert.ok(Number.isFinite(heavy.minGapDuringRunKm),'same-lane clearance is measured throughout the heavy run');
assert.ok(heavy.groundJunctionTransitions>0,'heavy run exercises ground junction transitions');
assert.equal(heavy.junctionConflictSteps,0,'no tick contains multiple ground-to-ground moves at one junction');
assert.ok(heavy.maxGroundTransitionsPerJunctionStep<=1,'junction reservations serialize ground-to-ground moves');
assert.ok(heavy.waiting>0,'heavy arrivals remain visible in source queues');
assert.ok(heavy.completed>0,'heavy run completes trips');
assert.ok(heavy.sourceSpillback>0,'some source queues are blocked by physically occupied entry lanes');
assert.equal(heavy.arrivals,heavy.active+heavy.waiting+heavy.completed,'every generated request is completed, active, or waiting');
const phoneDraw=qa.renderAt(290,360),carColors=new Set(['#51a87a','#5294a3','#477f69','#7c9b62','#518f86','#de6951','#de5944']);
const phoneCars=phoneDraw.filter(op=>op.type==='rect'&&carColors.has(op.color)&&op.args[2]<=4.5&&op.args[3]<=2);
const carIndexes=phoneDraw.map((op,i)=>op.type==='rect'&&carColors.has(op.color)&&op.args[2]<=4.5&&op.args[3]<=2?i:-1).filter(i=>i>=0);
const signalIndexes=phoneDraw.map((op,i)=>op.type==='text'&&(op.text==='EW'||op.text==='NS')?i:-1).filter(i=>i>=0);
const phoneQueueHighlights=phoneDraw.filter(op=>op.type==='stroke'&&op.color==='rgba(218,92,66,.5)');
const onRoadQueueLanes=new Set(qa.cars().filter(v=>v.queued).map(v=>v.edge+':'+v.dir+':'+v.lane)).size;
const desktopDraw=qa.renderAt(800,427),desktopCars=desktopDraw.filter(op=>op.type==='rect'&&carColors.has(op.color)&&op.args[2]<=4.5&&op.args[3]<=2),desktopQueueHighlights=desktopDraw.filter(op=>op.type==='stroke'&&op.color==='rgba(218,92,66,.5)');
const phoneMetrics=qa.phoneMetrics();
assert.equal(phoneCars.length,heavy.active,'every active vehicle remains drawn at phone canvas width');
assert.ok(Math.min(...phoneCars.map(op=>op.args[2]))>=2.8,'phone-width vehicle markers meet the minimum visible size');
assert.ok(phoneCars.every(op=>op.args[3]<=1.7),'phone-width marker cross sections stay within a lane pitch');
assert.ok(Math.max(...phoneCars.map(op=>op.args[2]))<=4.5,'phone-width markers have a bounded display size');
assert.equal(phoneQueueHighlights.length,onRoadQueueLanes,'each queued on-road lane has a real queue highlight');
assert.equal(desktopCars.length,heavy.active,'every active vehicle remains drawn at desktop canvas width');
assert.ok(desktopCars.every(op=>op.args[2]>=3.2&&op.args[3]<=2),'desktop vehicles are visible and remain lane-confined');
assert.ok(desktopQueueHighlights.length>0,'desktop map displays on-road queue highlights');
assert.ok(phoneMetrics.minProjectedBumperGapPx>0,'modeled bumper clearance remains positive at phone map scale');
assert.equal(phoneMetrics.lanePlacementViolations,0,'vehicle lane centers remain within road widths');
assert.equal(signalIndexes.length,18,'all nine grid junctions paint both approach labels');
assert.ok(Math.min(...signalIndexes)>Math.max(...carIndexes),'signal labels draw above all vehicles');

qa.set({network:'grid',demand:5,capacity:3,flyovers:true,signals:true});qa.run();qa.advance(60);const beforeFlyoverClose=qa.state();elements.flyovers.checked=false;elements.flyovers.onchange();const closingFlyover=qa.state();qa.advance(180);qa.pause();const afterFlyoverClose=qa.state();assert.ok(beforeFlyoverClose.vehiclesOnFlyover>0,'at least one vehicle is on a flyover before closure');assert.equal(closingFlyover.closedFutureRoutes,0,'remaining route legs avoid newly closed flyovers');assert.equal(closingFlyover.pendingClosedRoutes,0,'waiting demand is rerouted off closed flyovers');assert.equal(afterFlyoverClose.vehiclesOnDisabledFlyover,0,'vehicles already on a flyover clear it after closure');

const beforeProgress=qa.cars();qa.run();qa.advance(60);qa.pause();const afterProgress=qa.cars(),afterHeavy=qa.state();
const afterById=new Map(afterProgress.map(v=>[v.id,v]));
const stuckNonqueued=beforeProgress.filter(v=>{const after=afterById.get(v.id);return after&&!after.queued&&after.edge===v.edge&&after.dir===v.dir&&after.lane===v.lane&&Math.abs(after.pos-v.pos)<1e-9}).length;
assert.ok(afterHeavy.recentDistance>0,'traffic continues moving during heavy load');
assert.ok(afterHeavy.recentCompletions>0,'heavy scenario is not gridlocked');

qa.run();const liveState=qa.state();assert.equal(liveState.status,'LIVE');assert.ok(liveState.button.includes('Pause simulation'));assert.match(liveState.runHint,/running/);qa.advance(10);qa.pause();const frozen=qa.state();qa.advance(30);const remainsFrozen=qa.state();assert.equal(remainsFrozen.simSeconds,frozen.simSeconds,'paused simulation time stays fixed');assert.equal(remainsFrozen.active,frozen.active,'paused vehicle count stays fixed');assert.deepEqual(remainsFrozen, frozen);
qa.run();qa.advance(10);qa.pause();const resumed=qa.state();assert.ok(resumed.simSeconds>remainsFrozen.simSeconds,'resume advances the timer');assert.notEqual(JSON.stringify(resumed),JSON.stringify(remainsFrozen),'resume advances state');
qa.reset();let resetState=qa.state();assert.equal(resetState.status,'READY');assert.equal(resetState.timer,'00:00');assert.ok(resetState.button.includes('Run simulation'));assert.equal(resetState.meanTrip,null);assert.equal(elements.timeMetric.textContent,'No completed trips yet');

qa.set({network:'grid',demand:5,capacity:3,flyovers:true,signals:true});qa.run();qa.advance(10);qa.pause();elements.network.value='arterial';elements.network.onchange();const changedPaused=qa.state();assert.equal(changedPaused.status,'READY');assert.equal(changedPaused.timer,'00:00');assert.ok(changedPaused.button.includes('Run simulation'));assert.match(changedPaused.counts,/10 active \/ 10 links · 8 junctions/);
qa.run();qa.advance(10);elements.network.value='mixed';elements.network.onchange();const changedRunning=qa.state();assert.equal(changedRunning.status,'READY');assert.equal(changedRunning.timer,'00:00');assert.ok(changedRunning.button.includes('Run simulation'));assert.match(changedRunning.counts,/15 active \/ 15 links · 9 junctions/);
assert.match(html,/@media\(max-width:850px\)/);assert.match(html,/@media\(max-width:520px\)/);
assert.match(html,/not a validated real-world traffic prediction/i);

console.log(JSON.stringify({lowDemand:low,comparisons,arterialLong:Object.fromEntries(Object.entries(arterialLong).map(([k,v])=>[k,{simSeconds:v.simSeconds,arrivals:v.arrivals,speed:v.speed,queued:v.queued,completed:v.completed,waiting:v.waiting,flow:v.flow,meanTrip:v.meanTrip}])),heavyLoad:{...heavy,arrivalsAccounted:heavy.arrivals===heavy.active+heavy.waiting+heavy.completed,maxActive:heavy.maxActive,maxWaiting:heavy.maxWaiting,maxQueued:heavy.maxQueued,minGapDuringRunMeters:heavy.minGapDuringRunKm*1000,progressAfterAdditional60s:{recentDistance:afterHeavy.recentDistance,recentCompletions:afterHeavy.recentCompletions,stuckNonqueued},flyoverClosure:{vehiclesAlreadyOnFlyover:beforeFlyoverClose.vehiclesOnFlyover,closedFutureRoutesAfterToggle:closingFlyover.closedFutureRoutes,pendingClosedRoutesAfterToggle:closingFlyover.pendingClosedRoutes,strandedOnClosedFlyoverAfterClearance:afterFlyoverClose.vehiclesOnDisabledFlyover},junctionRuleCheck:{groundTransitions:heavy.groundJunctionTransitions,conflictSteps:heavy.junctionConflictSteps,maxGroundMovementsPerNodePerTick:heavy.maxGroundTransitionsPerJunctionStep},phoneCanvas:{viewportWidth:320,canvasWidth:290,height:360,vehicleMarkers:phoneCars.length,minMarkerWidth:Math.min(...phoneCars.map(op=>op.args[2])),maxMarkerWidth:Math.max(...phoneCars.map(op=>op.args[2])),queueHighlights:phoneQueueHighlights.length,desktopMarkers:desktopCars.length,desktopQueueHighlights:desktopQueueHighlights.length,...phoneMetrics,signalLabels:signalIndexes.length,signalsDrawnAfterVehicles:true}},lifecycle:{pauseFreeze:true,resumeRestarts:true,resetReady:true,changeNetworkWhilePausedReady:true,changeNetworkWhileRunningReady:true,mobileCssBreakpointsPresent:true,illustrativeModelLabelPresent:true},simulations:history.length},null,2));
