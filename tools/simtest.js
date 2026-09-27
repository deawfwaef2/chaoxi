// v0.5 用法: node tools/simtest.js [分钟] [dt] [物种 key=数量,...] [输入能量/秒] [每隔N秒打印] [输入持续分钟]
// 输入能量模拟玩家喷洒 + 发生器（在中心附近随机生成已凝结能量）。能量不可再生：代谢会让能量消失。
const fs=require('fs');const code=fs.readFileSync(__dirname+'/../src/01_data.js','utf8')+fs.readFileSync(__dirname+'/../src/02_sim.js','utf8');
const INR=+process.argv[5]||0; const mins=+process.argv[2]||20, dt=+process.argv[3]||1/30, spec=process.argv[4]||'slime=6,bunny=6', every=+process.argv[6]||60, inMins=process.argv[7]!==undefined?+process.argv[7]:1e9;
eval(code+`
G.unlocked=SPECIES.map(s=>s.key);
newGame(12345);
for(const kv of spec.split(',')){const [k,n]=kv.split('=');for(let q=0;q<+n;q++){
 const s=SP_IDX[k],a=Math.random()*6.28,r=60+Math.random()*250;const i=newC(s,Math.cos(a)*r,Math.sin(a)*r,SPECIES[s].cost,0);cage[i]=SPECIES[s].mature*0.6;}}
console.log('pN',pN,'cN',cN,'inRate',INR);
const t0=Date.now();let steps=Math.round(mins*60/dt), acc=0;
for(let k=0;k<steps;k++){
 if(G.t<inMins*60){acc+=INR*dt; while(acc>=1){acc-=1;const a=Math.random()*6.28,r=Math.sqrt(Math.random())*380;addP(Math.cos(a)*r,Math.sin(a)*r,1,0,0,255);G.flowWin.inE++;}}
 simStep(dt); G.events.length=0;
 if(k%Math.round(every/dt)===0){const L=ledger();const f=G.lastFlow;console.log(('t='+(G.t/60).toFixed(1)+'m').padEnd(8),'lv',G.lv,'sc',G.lastScore.toFixed(1),'pop',cN,'|',SPECIES.map((s,i)=>G.spCount[i]?s.key+':'+G.spCount[i]:'').filter(Boolean).join(' '),'| E',L.ripe,'raw',L.raw,'B',L.bio,'| mat',G.matter+Math.round(mN?Array.from(mval.subarray(0,mN)).reduce((a,b)=>a+b,0):0),'burn/10s',f.burn,'f',G.fights)}}
console.log('ms/step',((Date.now()-t0)/steps).toFixed(3),'births',G.births,'deaths',G.deaths,'starve',G.starve,'old',G.oldDeaths,'eaten',G.eaten);
`);
