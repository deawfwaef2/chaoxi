// 用法: node tools/simtest.js [分钟] [dt] [物种 key=数量,...] [额外能量] [每隔N秒打印]
const fs=require('fs');const code=fs.readFileSync(__dirname+'/../src/01_data.js','utf8')+fs.readFileSync(__dirname+'/../src/02_sim.js','utf8');
const extraE=+process.argv[5]||0; const mins=+process.argv[2]||20, dt=+process.argv[3]||1/30, spec=process.argv[4]||'slime=6,bunny=6', every=+process.argv[6]||60;
eval(code+`
G.unlocked=SPECIES.map(s=>s.key);
newGame(12345); for(let q=0;q<extraE;q++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*400;addP(Math.cos(a)*r,Math.sin(a)*r,1,0,0,255);}
for(const kv of spec.split(',')){const [k,n]=kv.split('=');for(let q=0;q<+n;q++){ // 测试直接投放（不从地图扣能量，L0 在之后统计）
 const s=SP_IDX[k],a=Math.random()*6.28,r=60+Math.random()*250;const i=newC(s,Math.cos(a)*r,Math.sin(a)*r,SPECIES[s].cost,0);cage[i]=SPECIES[s].mature*0.6;}}
G.total0=ledger().total;const L0=G.total0;console.log('total',L0,'sealed',G.wallSealed,'pN',pN,'cN',cN);
const t0=Date.now();let steps=Math.round(mins*60/dt);
for(let k=0;k<steps;k++){simStep(dt); G.events.length=0;
 if(k%Math.round(every/dt)===0){const L=ledger();let gs=0;for(let i=0;i<cN;i++)gs+=cg[i];console.log(('t='+(G.t/60).toFixed(1)+'m').padEnd(8),'lv',G.lv,'sc',G.lastScore.toFixed(1),'h',G.lastHarm.toFixed(2),'pop',cN,'|',SPECIES.map((s,i)=>G.spCount[i]?s.key+':'+G.spCount[i]:'').filter(Boolean).join(' '),'| ripe',L.ripe,'raw',L.raw,'B',L.bio,L.total===L0?'OK':'BAD '+L.total,'g',(gs/Math.max(1,cN)).toFixed(2),'f',G.fights)}}
console.log('ms/step',((Date.now()-t0)/steps).toFixed(3),'births',G.births,'deaths',G.deaths,'starve',G.starve,'old',G.oldDeaths,'eaten',G.eaten,'fights',G.fights);
`);
