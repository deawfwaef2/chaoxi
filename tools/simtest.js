// 用法: node tools/simtest.js [分钟] [dt] [物种 key=数量,...]
const fs=require('fs');const code=fs.readFileSync(__dirname+'/../src/01_data.js','utf8')+fs.readFileSync(__dirname+'/../src/02_sim.js','utf8');
const extraE=+process.argv[5]||0; const mins=+process.argv[2]||20, dt=+process.argv[3]||1/30, spec=process.argv[4]||'slime=6,mush=6';
eval(code+`
G.unlocked=SPECIES.map(s=>s.key);
newGame(12345); for(let q=0;q<extraE;q++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*400;addP(Math.cos(a)*r,Math.sin(a)*r,0,1,0,0);}
for(const kv of spec.split(',')){const [k,n]=kv.split('=');for(let q=0;q<+n;q++){const r=summon(SP_IDX[k]);if(r){ // 方塔附近光能不够时直接放（测试用，L0 在之后统计）
 const s=SP_IDX[k],a=Math.random()*6.28;const i=newC(s,Math.cos(a)*120,Math.sin(a)*120,SPECIES[s].cost,0);cage[i]=SPECIES[s].mature*0.5;}}}
const L0=ledger().total;console.log('total',L0,'sealed',G.wallSealed,'pN',pN,'cN',cN);
const t0=Date.now();let steps=Math.round(mins*60/dt);
for(let k=0;k<steps;k++){simStep(dt); G.events.length=0;
 if(k%Math.round(60/dt)===0){const L=ledger();console.log(('t='+(G.t/60).toFixed(0)+'m').padEnd(7),'lv',G.lv,'score',G.lastScore.toFixed(1),'pop',cN,'|',SPECIES.map((s,i)=>G.spCount[i]?s.key+':'+G.spCount[i]:'').filter(Boolean).join(' '),'| L',L.light,'E',L.ember,'B',L.bio,'tot',L.total===L0?'OK':'BAD '+L.total,'pN',pN)}}
console.log('ms/step',((Date.now()-t0)/steps).toFixed(3),'births',G.births,'deaths',G.deaths,'starve',G.starve,'old',G.oldDeaths,'eaten',G.eaten);
`);
