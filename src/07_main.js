/* ===================== 主程序：UI / 输入 / 存档 / 离线推演 ===================== */
const $ = id => document.getElementById(id);
const UI = { state: 'title', build: -1, ghost: null, ang: 0, sel: -1, selId: 0, selDev: null, panel: null, tab: 0, boostT: 0, keys: {}, joy: { x: 0, y: 0, id: null }, touch: false, hidden: 0, lastSave: 0, tut: 0 };
const META_KEY = 'chaoxi2_meta', SAVE_KEY = 'chaoxi2_save';
let META = { unlocked: [], bestLv: 0, tut: 0, sound: true, music: true, wins: 0 };
function loadMeta() { try { const m = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (m) META = Object.assign(META, m); } catch (e) { } }
function saveMeta() { META.unlocked = G.unlocked.slice(); META.bestLv = Math.max(META.bestLv, G.maxLv); try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) { } }

/* ---------- 存档（二进制打包 + base64） ---------- */
function b64enc(u8) { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }
function b64dec(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function mergeParticlesForSave() { // 粒子太多时按格子合并（守恒）
  const map = new Map(); for (let i = 0; i < pN; i++) { const k = pt[i] * SNC + sCell(px[i], py[i]); const m = map.get(k); if (m !== undefined && pv[m] + pv[i] < 60000) { pv[m] += pv[i]; pv[i] = 0; } else map.set(k, i); } compactP();
}
function serialize() {
  const P = new DataView(new ArrayBuffer(pN * 8));
  for (let i = 0; i < pN; i++) { const o = i * 8; P.setInt16(o, Math.round(px[i]), true); P.setInt16(o + 2, Math.round(py[i]), true); P.setUint16(o + 4, pv[i], true); P.setUint8(o + 6, pt[i]); }
  const CB = 32, C = new DataView(new ArrayBuffer(cN * CB));
  for (let i = 0; i < cN; i++) { const o = i * CB; C.setFloat32(o, cx[i], true); C.setFloat32(o + 4, cy[i], true); C.setInt32(o + 8, ce[i], true); C.setUint8(o + 12, csp[i]); C.setUint16(o + 13, cgen[i], true); C.setFloat32(o + 16, cage[i], true); C.setFloat32(o + 20, crep[i], true); C.setUint32(o + 24, cid[i], true); C.setFloat32(o + 28, cmeta[i], true); }
  const diffs = []; for (let i = 0; i < GN * GN; i++) if (whp[i] !== wMax[i]) diffs.push(i);
  const Wb = new DataView(new ArrayBuffer(diffs.length * 8)); diffs.forEach((i, k) => { Wb.setUint32(k * 8, i, true); Wb.setFloat32(k * 8 + 4, whp[i], true); });
  const o = G.orb;
  return JSON.stringify({
    v: 2, ver: VERSION, savedAt: Date.now(), seed: G.seed, t: G.t, lv: G.lv, maxLv: G.maxLv, wt: G.wt, towerAcc: G.towerAcc, devAcc: G.devAcc, lastScore: G.lastScore, lastBreak: G.lastBreak,
    hist: G.hist, popHist: G.popHist, total0: G.total0, nextId: G.nextId, devId: G.devId, won: G.won,
    stats: [G.births, G.deaths, G.starve, G.oldDeaths, G.eaten, G.summons || 0],
    orb: { x: o.x, y: o.y, hp: o.hp }, cam: CAM.tz,
    devs: G.devs.map(d => ({ id: d.id, type: d.type, x: d.x, y: d.y, ang: d.ang, bt: d.bt, bt0: d.bt0 })),
    P: b64enc(new Uint8Array(P.buffer)), C: b64enc(new Uint8Array(C.buffer)), W: b64enc(new Uint8Array(Wb.buffer)),
  });
}
function saveGame(silent) {
  if (UI.state !== 'play') return;
  let tries = 0;
  while (tries < 4) {
    try { localStorage.setItem(SAVE_KEY, serialize()); saveMeta(); UI.lastSave = performance.now(); if (!silent) toast('💾 已保存'); return true; }
    catch (e) { tries++; mergeParticlesForSave(); }
  }
  if (!silent) toast('⚠ 存档失败（浏览器存储空间不足）'); return false;
}
function loadGame() {
  let s; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; }
  if (!s || s.v !== 2) return null;
  genWorld(s.seed);
  // 墙体差异
  const W = new DataView(b64dec(s.W).buffer); for (let k = 0; k < W.byteLength / 8; k++) { const i = W.getUint32(k * 8, true), h = W.getFloat32(k * 8 + 4, true); whp[i] = h; if (h <= 0) wE[i] = 0; }
  let sealed = 0; for (let i = 0; i < GN * GN; i++) if (whp[i] > 0 && whp[i] < Infinity) sealed += wE[i]; G.wallSealed = sealed;
  const P = new DataView(b64dec(s.P).buffer); pN = 0; for (let k = 0; k < P.byteLength / 8; k++) { const o = k * 8; px[pN] = P.getInt16(o, true); py[pN] = P.getInt16(o + 2, true); pv[pN] = P.getUint16(o + 4, true); pt[pN] = P.getUint8(o + 6); pvx[pN] = pvy[pN] = 0; if (pv[pN] > 0) pN++; }
  const C = new DataView(b64dec(s.C).buffer); cN = 0; const CB = 32;
  for (let k = 0; k < C.byteLength / CB; k++) { const o = k * CB; const i = newC(C.getUint8(o + 12), C.getFloat32(o, true), C.getFloat32(o + 4, true), C.getInt32(o + 8, true), C.getUint16(o + 13, true)); if (i < 0) break; cage[i] = C.getFloat32(o + 16, true); crep[i] = C.getFloat32(o + 20, true); cid[i] = C.getUint32(o + 24, true); cmeta[i] = C.getFloat32(o + 28, true); }
  Object.assign(G, { t: s.t, lv: s.lv, maxLv: s.maxLv, wt: s.wt, towerAcc: s.towerAcc, devAcc: s.devAcc, lastScore: s.lastScore, lastBreak: s.lastBreak, hist: s.hist || [], popHist: s.popHist || [], total0: s.total0, nextId: s.nextId, devId: s.devId, won: s.won });
  [G.births, G.deaths, G.starve, G.oldDeaths, G.eaten, G.summons] = s.stats;
  G.orb.x = s.orb.x; G.orb.y = s.orb.y; G.orb.hp = s.orb.hp; G.orb.dead = 0; G.orb.vx = G.orb.vy = 0;
  G.devs = s.devs.map(d => Object.assign({ powered: true, acc: 0, lastAcc: 0, tt: Math.random(), conn: false, mult: 1, n: 0 }, d));
  recomputePower(); CAM.tz = CAM.z = s.cam || 1;
  // 存档里的能量总量若和当前账本不符（例如旧版本），以当前为准
  const L = ledger(); if (L.total !== G.total0) { console.warn('ledger adjust', G.total0, L.total); G.total0 = L.total; }
  return s;
}

/* ---------- 离线推演 ---------- */
let offCancel = false;
function runOffline(sec, title, done) {
  sec = Math.min(sec, 12 * 3600);
  const before = { lv: G.lv, pop: cN, sp: Array.from(G.spCount), births: G.births, deaths: G.deaths, t: G.t, L: ledger() };
  const ext = new Set(), newSp = new Set(); let maxLvSeen = G.lv, minLvSeen = G.lv;
  $('offline').classList.add('show'); $('offTxt').textContent = title || '你离开期间，生态圈仍在运转'; offCancel = false;
  const tStart = performance.now(); let simmed = 0, dt = 0.25; const budget = 9000;
  // 先测速
  const t0 = performance.now(); for (let k = 0; k < 8 && simmed < sec; k++) { simStep(dt); simmed += dt; G.events.length = 0; }
  const ms = Math.max(0.3, (performance.now() - t0) / 8); const steps = budget / ms; dt = Math.max(0.25, Math.min(4, (sec - simmed) / steps));
  function chunk() {
    const c0 = performance.now();
    while (simmed < sec && performance.now() - c0 < 50) {
      const d = Math.min(dt, sec - simmed); simStep(d); simmed += d;
      for (const e of G.events) { if (e.type === 'extinct') ext.add(e.a); if (e.type === 'lv') { maxLvSeen = Math.max(maxLvSeen, e.a); minLvSeen = Math.min(minLvSeen, e.a); } if (e.type === 'unlock') newSp.add(e.a + ':' + e.b); if (e.type === 'win') G._winPending = true; }
      G.events.length = 0;
    }
    $('offBar').firstChild.style.width = (simmed / sec * 100).toFixed(1) + '%';
    if (simmed < sec && !offCancel && performance.now() - tStart < budget * 1.6) setTimeout(chunk, 0);
    else {
      $('offline').classList.remove('show');
      const rep = { sec: simmed, want: sec, before, after: { lv: G.lv, pop: cN, sp: Array.from(G.spCount) }, births: G.births - before.births, deaths: G.deaths - before.deaths, ext: [...ext], maxLv: maxLvSeen, minLv: minLvSeen };
      showReport(rep); saveGame(true); if (done) done(rep);
    }
  }
  setTimeout(chunk, 30);
}
function fmtTime(s) { s = Math.round(s); if (s < 60) return s + ' 秒'; if (s < 3600) return Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒'; return Math.floor(s / 3600) + ' 小时 ' + Math.floor(s % 3600 / 60) + ' 分'; }
function showReport(r) {
  const spLines = SPECIES.map((s, i) => (r.before.sp[i] || r.after.sp[i]) ? `<tr><td><img src="${speciesIcon(i, 28)}" style="width:22px;vertical-align:middle"> ${s.name}</td><td>${r.before.sp[i]}</td><td>→</td><td style="color:${r.after.sp[i] > r.before.sp[i] ? '#8f8' : r.after.sp[i] < r.before.sp[i] ? '#f99' : '#ccc'}">${r.after.sp[i]}${r.after.sp[i] === 0 ? ' 💀' : ''}</td></tr>` : '').join('');
  const collapsed = r.after.pop === 0 && r.before.pop > 0;
  $('repBox').innerHTML = `<div style="font-size:19px;font-weight:700">${collapsed ? '💀 生态圈崩溃了…' : r.after.lv > r.before.lv ? '🌊 潮汐上涨！' : r.after.lv < r.before.lv ? '🌘 潮汐退去了…' : '🎁 开盲盒时间'}</div>
  <div style="opacity:.8">推演了 ${fmtTime(r.sec)}${r.sec < r.want - 1 ? `（离开 ${fmtTime(r.want)}，超出部分已省略）` : ''}</div>
  <div>潮汐：Lv.${r.before.lv} → <b style="color:${LV_COLORS[r.after.lv]}">Lv.${r.after.lv} ${LV_NAMES[r.after.lv]}</b>（期间最高 Lv.${r.maxLv}）</div>
  <div>生物：${r.before.pop} → <b>${r.after.pop}</b>　出生 ${r.births} · 死亡 ${r.deaths}</div>
  ${r.ext.length ? `<div style="color:#f99">灭绝：${r.ext.map(s => SPECIES[s].name).join('、')}</div>` : ''}
  <table class="tb" style="margin-top:6px">${spLines}</table>
  ${collapsed ? '<div style="margin-top:6px;opacity:.8">能量都还在地图上（守恒）。解锁的物种不会丢失——去方塔重新召唤吧。</div>' : ''}
  <div style="text-align:center;margin-top:12px"><button class="btn" id="repOk">继续</button></div>`;
  $('report').classList.add('show'); $('repOk').onclick = () => { $('report').classList.remove('show'); AU.play('click'); if (G._winPending) { G._winPending = false; showWin(); } };
}

/* ---------- 提示 / Toast ---------- */
function toast(msg, col) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = msg; if (col) d.style.borderColor = col; $('toasts').appendChild(d); while ($('toasts').children.length > 6) $('toasts').firstChild.remove(); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 700); }, 4200); }
const TUT = [
  { txt: '👆 点击中央的【方塔】（或按 B）召唤生物吧！先召唤 啵啵史莱姆 和 菇菇仔。', done: () => (G.summons || 0) >= 2 },
  { txt: '🔁 史莱姆吃【光能】排出【余烬】；菇菇仔吃余烬排出光能。两种都要有，循环才能转起来。', done: () => G.t > 60 || G.lv >= 1 },
  { txt: '🌊 每 10 秒结算一次【观测潮汐】。物种越多越均衡，潮汐越高。Lv.1 后可以在方塔里建造观测装置。', done: () => G.lv >= 1 && G.devs.length > 0 },
  { txt: '⚡ 装置只能建在能量场里：先铺【导能塔】，连成网络，再建【绊线仪】等装置。', done: () => G.devs.some(d => d.type !== D_PYLON) },
  { txt: '🧱 撞向黑墙可以消融它（会掉血），释放封存的能量。离方塔越远墙越硬。按住空格/吸引按钮可以把能量带回来。', done: () => G.wallBroken > 5 },
];
function updateHint() {
  if (META.tut >= TUT.length) { $('hint').style.display = 'none'; return; }
  const s = TUT[META.tut]; if (s.done()) { META.tut++; saveMeta(); return updateHint(); }
  $('hint').style.display = 'block'; $('hint').textContent = s.txt;
}

/* ---------- HUD ---------- */
let hudT = 0, mmT = 0, ledgerCache = null;
function updateHUD() {
  const L = ledgerCache = ledger(); const ok = L.total === G.total0;
  const used = capUsed(), cap = buildCap(G.lv);
  const mini = innerWidth < 700 && !UI.statsOpen;
  $('stats').className = 'hud glass' + (mini ? ' mini' : '');
  $('stats').innerHTML = `<div class="row"><span>🧬 生物 <b>${cN}</b></span><span>物种 <b>${G.spAlive}</b>/${G.unlocked.filter(k => SP_IDX[k] !== undefined).length}</span></div>
  <div class="row"><span class="lc">✦ 光能 ${L.light}</span><span class="ec">✦ 余烬 ${L.ember}</span></div>
  <div class="more"><div class="row"><span class="bc">♥ 生物体内 ${L.bio}</span><span class="sc">▣ 墙中 ${L.sealed}</span></div>
  <div class="row"><span>能量总量 ${L.total}</span><span class="${ok ? 'ok' : 'bad'}">${ok ? '✓守恒' : '⚠偏差 ' + (L.total - G.total0)}</span></div>
  <div class="row"><span>🔧 建造额度 ${used}/${cap}</span><span class="dim">⏱ ${fmtClock(G.t)}</span></div></div>
  <div class="row"><span>白球 ${G.orb.dead ? '重生中…' : Math.round(G.orb.hp)}</span><span class="dim">消融力 ${orbDPS().toFixed(0)}</span></div><div id="hpbar"><i style="width:${G.orb.hp}%;${G.orb.hp < 40 ? 'background:#f88' : ''}"></i></div>`;
  // 潮汐
  const lv = G.lv, nxt = lv < MAXLV ? THRESH[lv + 1] : THRESH[MAXLV], col = LV_COLORS[lv];
  $('tideLv').innerHTML = `<span style="color:${col}">观测潮汐 Lv.${lv}</span> · ${LV_NAMES[lv]}`;
  const est = (G.towerAcc + G.devAcc) * G.lastHarm * WINDOW / Math.max(0.5, G.wt);
  $('tideFill').style.width = Math.min(100, G.lastScore / nxt * 100) + '%'; $('tideFill').style.background = `linear-gradient(90deg,${col},${LV_COLORS[Math.min(MAXLV, lv + 1)]})`;
  $('tideWin').style.width = (G.wt / WINDOW * 100) + '%';
  $('tideSub').textContent = `上次结算 ${G.lastScore.toFixed(1)} / 下一级 ${nxt}　·　本轮预估 ${est.toFixed(1)}　·　${Math.ceil(WINDOW - G.wt)}s`;
  // 加速标签
  if (UI.boostT > 0) { $('speedTag').style.display = 'block'; $('speedTag').textContent = '⏩ ×4 ' + Math.ceil(UI.boostT) + 's'; } else $('speedTag').style.display = 'none';
  updateCard(); updateHint();
}
function fmtClock(t) { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60); return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
function updateCard() {
  const c = $('card');
  if (UI.selId) {
    const i = findById(UI.selId, UI.sel); UI.sel = i;
    if (i < 0) { c.innerHTML = '<div style="opacity:.8">它已经离开了这个世界…（能量回到了地图上）</div>'; UI.selId = 0; setTimeout(() => { if (!UI.selId && !UI.selDev) c.style.display = 'none'; }, 2000); return; }
    const s = csp[i], sp = SPECIES[s], ageP = cage[i] / sp.life, eP = ce[i] / sp.maxE;
    const food = sp.eat ? '吃 ' + sp.eat.map(t => ET_NAME[t]).join('/') : '捕食 ' + sp.prey.map(k => SPECIES[SP_IDX[k]].name).join('/');
    c.style.display = 'block';
    c.innerHTML = `<div class="t"><img src="${speciesIcon(s, 64)}">${sp.name} <span style="font-size:11px;opacity:.6">#${cid[i]} · 第${cgen[i]}代 · ${ST_NAME[cst[i]]}</span></div>
    <div>能量 ${ce[i]}/${sp.maxE}　<span style="opacity:.7">繁殖需 ${sp.repE}</span></div><div class="bar"><i style="width:${eP * 100}%;background:#8ff"></i></div>
    <div>年龄 ${Math.floor(cage[i])}s / 寿命 ${sp.life}s ${ageP > 0.75 ? '（年迈）' : cage[i] < sp.mature ? '（幼年）' : ''}</div><div class="bar"><i style="width:${Math.min(100, ageP * 100)}%;background:${ageP > 0.75 ? '#f9a' : '#fd8'}"></i></div>
    <div style="opacity:.75">${food} · 排出 ${ET_NAME[sp.exc]}</div>`;
  } else if (UI.selDev) {
    const d = UI.selDev; if (!G.devs.includes(d)) { UI.selDev = null; c.style.display = 'none'; return; }
    const def = DEVICES[d.type];
    const st = d.bt > 0 ? `建造中 ${Math.ceil(d.bt)}s` : !d.powered ? '⚠ 不在能量场内' : G.lv < 1 ? '停机（潮汐归零，遗迹状态）' : '运转中';
    c.style.display = 'block';
    c.innerHTML = `<div class="t">${def.name} <span style="font-size:11px;opacity:.6">${st}</span></div><div style="opacity:.8">${def.desc}</div>
    <div>上轮贡献：${(d.lastAcc || 0).toFixed(2)} 潮汐 ${d.mult > 1 ? '（透镜 ×' + d.mult.toFixed(2) + '）' : ''}${d.n ? ' · 计数 ' + d.n : ''}</div>
    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${d.bt > 0 ? '<button class="btn ad" id="cdAd">📺 看广告立即完成</button>' : ''}${def.key === 'nest' && d.bt <= 0 ? '<button class="btn" id="cdNest">🥚 在这里召唤</button>' : ''}<button class="btn red" id="cdDel">拆除（返还额度）</button><button class="btn" id="cdX">关闭</button></div>`;
    const ad = $('cdAd'); if (ad) ad.onclick = () => Ads.rewarded(() => { d.bt = 0.01; toast('⚡ 建造完成！'); }, m => toast(m));
    const nb = $('cdNest'); if (nb) nb.onclick = () => openTower(0, d);
    $('cdDel').onclick = () => { removeDev(d); UI.selDev = null; c.style.display = 'none'; AU.play('click'); toast('已拆除 ' + def.name); };
    $('cdX').onclick = () => { UI.selDev = null; c.style.display = 'none'; };
  } else c.style.display = 'none';
}
function drawMinimap() {
  const c = $('mmC'), g = c.getContext('2d'); const S = 150;
  let R = 700; for (let i = 0; i < GN * GN; i += 97) if (whp[i] <= 0) { const gx = i % GN, gy = (i / GN) | 0, d = Math.hypot((gx + 0.5) * CELL - HALF, (gy + 0.5) * CELL - HALF); if (d > R) R = d; }
  R = Math.min(HALF, Math.max(R * 1.1, Math.hypot(G.orb.x, G.orb.y) * 1.15, 600));
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.imageSmoothingEnabled = true;
  const src = R / CELL; g.drawImage(floorC, GN / 2 - src, GN / 2 - src, src * 2, src * 2, 0, 0, S, S);
  const k = S / (2 * R), o = S / 2;
  g.fillStyle = 'rgba(160,240,255,0.8)'; for (let i = 0; i < pN; i += Math.max(1, pN / 400 | 0)) if (pt[i] === 0) g.fillRect(o + px[i] * k, o + py[i] * k, 1, 1);
  for (let i = 0; i < cN; i += Math.max(1, cN / 300 | 0)) { g.fillStyle = SPECIES[csp[i]].col; g.fillRect(o + cx[i] * k - 1, o + cy[i] * k - 1, 2, 2); }
  for (const d of G.devs) { g.fillStyle = devActive(d) ? DEV_COL[d.type] : '#666'; g.fillRect(o + d.x * k - 1.5, o + d.y * k - 1.5, 3, 3); }
  g.fillStyle = LV_COLORS[G.lv]; g.fillRect(o - 3, o - 3, 6, 6);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(o + G.orb.x * k, o + G.orb.y * k, 3, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.4)'; const vw = CAM.W / CAM.z * k, vh = CAM.H / CAM.z * k; g.strokeRect(o + CAM.x * k - vw / 2, o + CAM.y * k - vh / 2, vw, vh);
}

/* ---------- 面板 ---------- */
function openPanel(title, tabs, renderFn, tab) {
  UI.panel = { title, tabs, renderFn }; UI.tab = tab || 0; $('panel').classList.add('show'); document.body.classList.add('pOpen'); $('pTitle').textContent = title;
  $('pTabs').innerHTML = tabs.map((t, k) => `<div class="tab ${k === UI.tab ? 'on' : ''}" data-k="${k}">${t}</div>`).join('');
  $('pTabs').querySelectorAll('.tab').forEach(el => el.onclick = () => { UI.tab = +el.dataset.k; AU.play('click'); openPanel(title, tabs, renderFn, UI.tab); });
  renderFn(UI.tab);
}
function closePanel() { $('panel').classList.remove('show'); document.body.classList.remove('pOpen'); UI.panel = null; }
function refreshPanel() { if (UI.panel) UI.panel.renderFn(UI.tab); }
function foodText(sp) { return sp.eat ? '吃 ' + sp.eat.map(t => `<span style="color:${ET_COLOR[t]}">${ET_NAME[t]}</span>`).join('/') : '捕食 ' + sp.prey.map(k => SPECIES[SP_IDX[k]].name).join('、'); }
function predText(i) { const L = []; SPECIES.forEach((s, j) => { if (S_preyMask[j] & (1 << i)) L.push(s.name); }); return L.length ? '天敌：' + L.join('、') : '没有天敌'; }
function openTower(tab, nest) {
  AU.play('click');
  openPanel(nest ? '🥚 孵化巢' : '🔷 中央方塔', nest ? ['召唤生物'] : ['召唤生物', '建造装置', '潮汐详情'], (k) => {
    const B = $('pBody');
    if (k === 0) {
      buildPGrid(); const avail = nest ? gatherLight(nest.x, nest.y, 160, 0, true) : gatherLight(0, 0, TOWER_PULL, 0, true);
      B.innerHTML = `<div style="margin-bottom:8px">${nest ? '孵化巢' : '方塔'}附近可用光能：<b class="lc" style="color:#9ff4ff">${avail}</b>　<span style="opacity:.7">召唤会把这些光能凝聚成生物（能量守恒）。附近光能不够时，可以按住空格 / 吸引按钮把能量带过来。</span></div><div class="grid">` +
        SPECIES.map((s, i) => { const un = G.unlocked.includes(s.key); return `<div class="cardx ${un ? '' : 'lock'}" data-s="${i}"><img src="${speciesIcon(i, 64)}"><div class="nm">${s.name}</div><div class="ds">${un ? `消耗 ${s.cost} 光能<br>${foodText(s)}<br>排出 ${ET_NAME[s.exc]} · 存活 ${G.spCount[i]}` : `🔒 潮汐 Lv.${s.unlock} 解锁`}</div></div>`; }).join('') + '</div>';
      B.querySelectorAll('.cardx').forEach(el => el.onclick = () => { const s = +el.dataset.s; if (!G.unlocked.includes(SPECIES[s].key)) { AU.play('error'); return; } const r = summon(s, nest); if (r) { toast('⚠ ' + r); AU.play('error'); } else { AU.play('summon'); toast('✨ 召唤了 ' + SPECIES[s].name); } refreshPanel(); });
    } else if (k === 1) {
      const used = capUsed(), cap = buildCap(G.lv);
      B.innerHTML = `<div style="margin-bottom:8px">建造额度 <b>${used}/${cap}</b>（潮汐每升一级 +3）。装置必须建在<span style="color:#7fe8ff">能量场</span>内——先铺导能塔。潮汐归零时所有装置停机。</div><div class="grid">` +
        DEVICES.map((d, i) => { const un = d.unlock <= G.lv || G.unlocked.includes('d' + i); return `<div class="cardx ${un ? '' : 'lock'}" data-d="${i}"><div class="nm" style="color:${DEV_COL[i]}">${d.name}</div><div class="ds">${un ? `额度 ${d.cost} · 建造 ${d.time}s<br>${d.desc}` : `🔒 潮汐 Lv.${d.unlock} 解锁<br>${d.desc}`}</div></div>`; }).join('') + '</div>';
      B.querySelectorAll('.cardx').forEach(el => el.onclick = () => { const d = +el.dataset.d; const def = DEVICES[d]; if (!(def.unlock <= G.lv || G.unlocked.includes('d' + d))) { AU.play('error'); return; } if (capUsed() + def.cost > buildCap(G.lv)) { toast('⚠ 建造额度不足'); AU.play('error'); return; } closePanel(); enterBuild(d); });
    } else {
      const b = G.lastBreak;
      B.innerHTML = `<div>当前 <b style="color:${LV_COLORS[G.lv]}">Lv.${G.lv} ${LV_NAMES[G.lv]}</b>　最高 Lv.${G.maxLv}</div>
      ${b ? `<table class="tb"><tr><td>方塔基础（物种×0.1/s + 生物×0.001/s）</td><td>${b.tower.toFixed(2)}</td></tr><tr><td>观测装置</td><td>${b.dev.toFixed(2)}</td></tr><tr><td>和谐倍率（有效物种 ${b.eff.toFixed(2)}）</td><td>×${b.harm.toFixed(2)}</td></tr><tr><td><b>结算潮汐</b></td><td><b>${b.score.toFixed(2)}</b></td></tr></table>` : '<div style="opacity:.7">还没有结算记录</div>'}
      <div style="margin:8px 0 4px">近期潮汐</div><canvas class="spark" id="spark" width="700" height="90"></canvas>
      <div style="margin-top:8px">等级阈值：${THRESH.slice(1).map((v, k) => `<span class="tag" style="color:${LV_COLORS[k + 1]}">Lv${k + 1} ${v}</span>`).join('')}</div>
      <div style="opacity:.75;margin-top:6px">潮汐不是累加资源：每 10 秒只根据这 10 秒的表现结算。上升立即生效，下降每次最多降 1 级。归零时所有装置停机成为遗迹，但已解锁的物种永久保留。</div>`;
      const cv = $('spark'); if (cv) { const g = cv.getContext('2d'), h = G.hist.slice(-70); const mx = Math.max(10, ...h.map(x => x.s)); g.clearRect(0, 0, 700, 90); for (let k = 1; k <= MAXLV; k++) { const y = 88 - THRESH[k] / mx * 84; if (y < 0) break; g.strokeStyle = LV_COLORS[k] + '44'; g.beginPath(); g.moveTo(0, y); g.lineTo(700, y); g.stroke(); } g.strokeStyle = '#9ff'; g.lineWidth = 2; g.beginPath(); h.forEach((x, k) => { const X = k * 10, Y = 88 - x.s / mx * 84; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); }
    }
  }, tab || 0);
}
function openDex() {
  AU.play('click');
  openPanel('📖 图鉴', ['生物', '观测装置', '玩法说明'], k => {
    const B = $('pBody');
    if (k === 0) B.innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">' + SPECIES.map((s, i) => { const un = G.unlocked.includes(s.key); return `<div class="cardx ${un ? '' : 'lock'}" style="cursor:default"><img src="${speciesIcon(i, 64)}" style="${un ? '' : 'filter:brightness(0)'}"><div class="nm">${un ? s.name : '？？？'}</div><div class="ds">${un ? s.desc + '<br>' : ''}${foodText(s)} · 排出 ${ET_NAME[s.exc]}<br>${predText(i)}<br><span class="tag">寿命 ${s.life}s</span><span class="tag">能量上限 ${s.maxE}</span><span class="tag">繁殖 ${s.repE}→幼崽 ${s.childE}</span><span class="tag">代谢 ${s.meta}/s</span><span class="tag">速度 ${s.speed}</span>${s.pair ? '<span class="tag">需配对繁殖</span>' : '<span class="tag">分裂繁殖</span>'}<span class="tag">Lv.${s.unlock} 解锁</span><br>存活 ${G.spCount[i]}</div></div>`; }).join('') + '</div>';
    else if (k === 1) B.innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">' + DEVICES.map((d, i) => `<div class="cardx" style="cursor:default"><div class="nm" style="color:${DEV_COL[i]}">${d.name}</div><div class="ds">${d.desc}<br><span class="tag">额度 ${d.cost}</span><span class="tag">建造 ${d.time}s</span><span class="tag">Lv.${d.unlock} 解锁</span>${d.r ? `<span class="tag">半径 ${d.r}</span>` : ''}</div></div>`).join('') + '</div>';
    else B.innerHTML = `<p><b>能量守恒</b>：能量只存在于地图（光能 / 余烬粒子）、生物体内和黑墙里。左上角实时显示账本，总量永远不变。</p>
    <p><b>循环</b>：食草生物吃光能、排出余烬；分解者（菇菇仔、萤火团、果冻蜗牛）吃余烬、排出光能；捕食者吃掉猎物时能量直接转移；生物老死时能量全部以光能爆出；饿死则早已把能量排光。余烬也会极其缓慢地自然变回光能。</p>
    <p><b>观测潮汐</b>：每 10 秒结算一次，根据这 10 秒内方塔与装置的观测数据 × 和谐倍率（物种越多越均衡越高）。潮汐达到 Lv.10【永恒之潮】即胜利。</p>
    <p><b>建造</b>：Lv.1 起可以在方塔里建造装置。装置需要能量场：导能塔必须接在已有能量场内，连成网络（像星际争霸神族的水晶塔）。建造需要时间，可以看广告加速。</p>
    <p><b>黑墙</b>：白球撞墙会消融它并掉血，墙里封存的能量会释放出来。离中央越远墙越硬、封存能量越多。潮汐越高，白球消融力越强。墙外还藏着洞穴和能量矿脉。</p>
    <p><b>离线</b>：关掉游戏后生态圈继续运转（最多推演 12 小时）。回来时像开盲盒——可能更繁荣，也可能全灭。潮汐归零时装置停机成为遗迹，但解锁的物种永久保留。</p>`;
  });
}
function openSpeed() {
  AU.play('click');
  openPanel('⏩ 加速', ['时间'], () => {
    const nb = G.devs.filter(d => d.bt > 0).length;
    $('pBody').innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
    <div class="cardx" id="spA"><div class="nm">📺 时间流速 ×4</div><div class="ds">看一个广告，接下来 3 分钟时间流速 ×4。${UI.boostT > 0 ? '<br>剩余 ' + Math.ceil(UI.boostT) + 's（可叠加）' : ''}</div></div>
    <div class="cardx" id="spB"><div class="nm">📺 快进 10 分钟</div><div class="ds">看一个广告，立即推演 10 分钟后的世界。</div></div>
    <div class="cardx ${nb ? '' : 'lock'}" id="spC"><div class="nm">📺 立即完成建造</div><div class="ds">看一个广告，所有建造中的装置（${nb} 个）立即完成。</div></div></div>`;
    $('spA').onclick = () => Ads.rewarded(() => { UI.boostT += 180; toast('⏩ 时间流速 ×4！'); closePanel(); }, m => toast(m));
    $('spB').onclick = () => Ads.rewarded(() => { closePanel(); runOffline(600, '⏩ 快进 10 分钟…'); }, m => toast(m));
    $('spC').onclick = () => { if (!nb) return; Ads.rewarded(() => { for (const d of G.devs) if (d.bt > 0) d.bt = 0.01; toast('⚡ 建造全部完成！'); closePanel(); }, m => toast(m)); };
  });
}
function openMenu() {
  AU.play('click');
  openPanel('☰ 菜单', ['设置'], () => {
    $('pBody').innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;max-width:360px">
    <button class="btn" id="mSave">💾 立即保存</button>
    <button class="btn" id="mSnd">${AU.on ? '🔊 音效：开' : '🔇 音效：关'}</button>
    <button class="btn" id="mMus">${AU.musOn ? '🎵 音乐：开' : '🎵 音乐：关'}</button>
    <button class="btn" id="mTitle">🏠 回到标题</button>
    <button class="btn red" id="mNew">🌱 新的世界（解锁的物种会保留）</button>
    <div style="opacity:.6;font-size:12px">版本 v${VERSION} · 广告平台：${Ads.platform} · 自动保存每 20 秒 · 画质自适应 LOD ${LOD.lodPx.toFixed(1)}</div></div>`;
    $('mSave').onclick = () => saveGame(false);
    $('mSnd').onclick = () => { AU.setOn(!AU.on); META.sound = AU.on; saveMeta(); refreshPanel(); };
    $('mMus').onclick = () => { AU.setMus(!AU.musOn); META.music = AU.musOn; saveMeta(); refreshPanel(); };
    $('mTitle').onclick = () => { saveGame(true); closePanel(); showTitle(); };
    $('mNew').onclick = () => { if (!confirm('确定开始新的世界吗？当前世界会被覆盖（解锁的物种保留）。')) return; closePanel(); startNew(); };
  });
}
function showWin() {
  Ads.happytime(); AU.play('win');
  $('repBox').innerHTML = `<div style="font-size:22px;font-weight:700;color:#fff;text-align:center">🌟 永恒之潮 🌟</div><div style="text-align:center;opacity:.85;margin:8px 0">观测潮汐达到了最高等级 Lv.10！<br>你的生态圈稳定、和谐而多样。<br>用时 ${fmtClock(G.t)}</div><div style="text-align:center;opacity:.7">可以继续经营这个世界，看看它能维持多久。</div><div style="text-align:center;margin-top:12px"><button class="btn" id="repOk">继续</button></div>`;
  $('report').classList.add('show'); $('repOk').onclick = () => $('report').classList.remove('show');
  META.wins = (META.wins || 0) + 1; saveMeta();
}

/* ---------- 建造模式 ---------- */
function enterBuild(d) { document.body.classList.add('building'); UI.build = d; UI.ghost = UI.touch ? [G.orb.x + 60, G.orb.y] : null; $('buildBar').classList.add('show'); $('bbName').textContent = '建造：' + DEVICES[d].name; $('bbRot').style.display = DEVICES[d].len ? '' : 'none'; $('bbOk').style.display = UI.touch ? '' : 'none'; UI.selId = 0; UI.selDev = null; }
function exitBuild() { document.body.classList.remove('building'); UI.build = -1; UI.ghost = null; $('buildBar').classList.remove('show'); }
function tryPlace() {
  if (UI.build < 0 || !UI.ghost) return; const [x, y] = UI.ghost; const err = canPlace(UI.build, x, y);
  if (err) { toast('⚠ ' + err); AU.play('error'); return; }
  placeDev(UI.build, x, y, UI.ang); AU.play('place'); toast('🔧 开始建造 ' + DEVICES[UI.build].name + '（' + DEVICES[UI.build].time + 's）');
  if (capUsed() + DEVICES[UI.build].cost > buildCap(G.lv)) exitBuild();
}

/* ---------- 事件处理（音效 / 特效 / 提示） ---------- */
function inView(x, y) { return Math.abs(x - CAM.x) < CAM.W / 2 / CAM.z + 50 && Math.abs(y - CAM.y) < CAM.H / 2 / CAM.z + 50; }
function processEvents() {
  for (const e of G.events) {
    switch (e.type) {
      case 'birth': if (inView(e.a, e.b)) { addFX('heart', e.a, e.b, { life: 1.2 }); if (CAM.z > 0.5) AU.play('birth', 12 - SPECIES[e.c].r / 3); } break;
      case 'death': if (inView(e.a, e.b)) { addFX('puff', e.a, e.b, { life: 0.8, color: '#9ff4ff' }); if (CAM.z > 0.5) AU.play('death'); } break;
      case 'eaten': if (inView(e.a, e.b)) { addFX('puff', e.a, e.b, { life: 0.6, color: SPECIES[e.c].col }); AU.play('eaten'); } break;
      case 'tidegain': if (inView(e.a, e.b) && CAM.z > 0.4) { addFX('text', e.a, e.b - 10, { text: '+' + (+e.c).toFixed(1), life: 1.2, color: '#8fffd0' }); AU.play('gain'); } break;
      case 'wallbreak': G.wallBroken = (G.wallBroken || 0) + 1; if (inView(e.a, e.b)) { addFX('ring', e.a, e.b, { life: 0.5, r: 20, color: '#ff9ad0' }); AU.play('wall'); } break;
      case 'tp': addFX('ring', e.a, e.b, { life: 0.4, r: 30 }); AU.play('tp'); break;
      case 'orbdie': toast('💫 白球被黑墙消融了，2.5 秒后在方塔重生'); AU.play('lvdown'); break;
      case 'place': break;
      case 'built': addFX('ring', e.a, e.b, { life: 0.8, r: 50, color: DEV_COL[e.c] }); AU.play('built'); toast('✅ ' + DEVICES[e.c].name + ' 建造完成'); break;
      case 'summon': addFX('ring', e.a, e.b, { life: 0.8, r: 30, color: SPECIES[e.c].col }); break;
      case 'settle': G._pulse = 1; AU.play('settle', G.lv); break;
      case 'lv': if (e.a > e.b) { AU.play('lvup'); toast(`🌊 潮汐上升到 <b style="color:${LV_COLORS[e.a]}">Lv.${e.a} ${LV_NAMES[e.a]}</b>`, LV_COLORS[e.a]); } else { AU.play('lvdown'); toast(`🌘 潮汐下降到 Lv.${e.a}${e.a === 0 ? ' —— 所有装置停机了…' : ''}`, '#f99'); } refreshPanel(); break;
      case 'unlock': if (e.a === 's') toast(`🔓 解锁新物种：<b>${SPECIES[e.b].name}</b>`, SPECIES[e.b].col); else toast(`🔓 解锁新装置：<b>${DEVICES[e.b].name}</b>`, DEV_COL[e.b]); saveMeta(); break;
      case 'extinct': toast(`💀 ${SPECIES[e.a].name} 在这个世界灭绝了`, '#f99'); AU.play('extinct'); break;
      case 'win': showWin(); break;
    }
  }
  G.events.length = 0;
}

/* ---------- 输入 ---------- */
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, downPos = null, dragMoved = false;
function hitTest(wx, wy) {
  if (wx * wx + (wy + 20) * (wy + 20) < 55 * 55) return { tower: true };
  for (const d of G.devs) if (dist2(d.x, d.y - 8, wx, wy) < 26 * 26) return { dev: d };
  buildCGrid(); const j = findC(wx, wy, 60, 0xffffffff, -1, null); if (j >= 0 && dist2(cx[j], cy[j], wx, wy) < (S_r[csp[j]] + 12) * (S_r[csp[j]] + 12)) return { c: j };
  return null;
}
function tap(sx, sy, isTouch) {
  const [wx, wy] = s2w(sx, sy);
  if (UI.build >= 0) { UI.ghost = [wx, wy]; if (!isTouch) tryPlace(); return; }
  const h = hitTest(wx, wy);
  if (h && h.tower) { openTower(0); return; }
  if (h && h.dev) { UI.selDev = h.dev; UI.selId = 0; AU.play('click'); updateCard(); return; }
  if (h && h.c !== undefined) { UI.sel = h.c; UI.selId = cid[h.c]; UI.selDev = null; AU.play('click'); updateCard(); return; }
  UI.selId = 0; UI.selDev = null; $('card').style.display = 'none';
  teleportOrb(wx, wy);
}
function setupInput() {
  const c = cvs;
  addEventListener('keydown', e => {
    if (UI.state !== 'play') return; const k = e.key.toLowerCase(); UI.keys[k] = true;
    if (k === ' ') { e.preventDefault(); }
    if (k === 'escape') { if (UI.panel) closePanel(); else if (UI.build >= 0) exitBuild(); else { UI.selId = 0; UI.selDev = null; $('card').style.display = 'none'; } }
    if (k === 'b' && !UI.panel) openTower(0);
    if (k === 'r') UI.ang += Math.PI / 8;
    if (k === '=' || k === '+') CAM.tz = Math.min(3, CAM.tz * 1.2); if (k === '-') CAM.tz = Math.max(0.2, CAM.tz / 1.2);
  });
  addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { UI.keys = {}; });
  c.addEventListener('wheel', e => { e.preventDefault(); CAM.tz = Math.max(0.2, Math.min(3, CAM.tz * Math.pow(1.0015, -e.deltaY))); }, { passive: false });
  c.addEventListener('contextmenu', e => { e.preventDefault(); if (UI.build >= 0) exitBuild(); });
  c.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && !UI.touch) { UI.touch = true; document.body.classList.add('touch'); }
    AU.init(); c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { downPos = { x: e.clientX, y: e.clientY, t: performance.now(), btn: e.button }; dragMoved = false; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = CAM.tz; dragMoved = true; }
  });
  c.addEventListener('pointermove', e => {
    if (UI.build >= 0 && e.pointerType === 'mouse') UI.ghost = s2w(e.clientX, e.clientY);
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) CAM.tz = CAM.z = Math.max(0.2, Math.min(3, zoom0 * d / pinch0)); }
    else if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 12) { dragMoved = true; if (UI.build >= 0 && e.pointerType !== 'mouse') UI.ghost = s2w(e.clientX, e.clientY); }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (ptrs.size === 0 && downPos && !dragMoved && downPos.btn === 0 && UI.state === 'play') tap(e.clientX, e.clientY, e.pointerType !== 'mouse');
    if (ptrs.size === 0) downPos = null;
  };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); downPos = null; });
  // 摇杆
  const joy = $('joy'), K = $('joyK');
  joy.addEventListener('pointerdown', e => { e.stopPropagation(); AU.init(); UI.joy.id = e.pointerId; joy.setPointerCapture(e.pointerId); mv(e); });
  const mv = e => { if (UI.joy.id !== e.pointerId) return; const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; } UI.joy.x = dx / m; UI.joy.y = dy / m; K.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener('pointermove', mv);
  const jup = e => { if (UI.joy.id !== e.pointerId) return; UI.joy.id = null; UI.joy.x = UI.joy.y = 0; K.style.transform = ''; };
  joy.addEventListener('pointerup', jup); joy.addEventListener('pointercancel', jup);
  const att = $('attBtn');
  att.addEventListener('pointerdown', e => { e.stopPropagation(); UI.attTouch = true; att.setPointerCapture(e.pointerId); });
  att.addEventListener('pointerup', () => UI.attTouch = false); att.addEventListener('pointercancel', () => UI.attTouch = false);
  $('bTower').onclick = () => openTower(0); $('bDex').onclick = openDex; $('bSpeed').onclick = openSpeed; $('bMenu').onclick = openMenu;
  $('pClose').onclick = () => { AU.play('click'); closePanel(); };
  $('panel').addEventListener('pointerdown', e => { if (e.target === $('panel')) closePanel(); });
  $('tide').onclick = () => openTower(2);
  $('stats').onclick = () => { UI.statsOpen = !UI.statsOpen; updateHUD(); };
  $('bbCancel').onclick = exitBuild; $('bbRot').onclick = () => { UI.ang += Math.PI / 8; }; $('bbOk').onclick = tryPlace;
  $('offSkip').onclick = () => { offCancel = true; };
  $('hint').onclick = () => { META.tut++; saveMeta(); updateHint(); };
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (UI.state !== 'play') return;
    if (document.hidden) { UI.hidden = Date.now(); saveGame(true); Ads.gameplayStop(); }
    else { Ads.gameplayStart(); const away = (Date.now() - UI.hidden) / 1000; if (UI.hidden && away > 30) runOffline(away); UI.hidden = 0; last = performance.now(); }
  });
  addEventListener('pagehide', () => saveGame(true));
  addEventListener('beforeunload', () => saveGame(true));
}

/* ---------- 主循环 ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = 0.1; if (dt <= 0) return;
  if (UI.state !== 'play') return;
  if ($('offline').classList.contains('show')) return;
  const k = UI.keys, o = G.orb;
  let ix = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + UI.joy.x, iy = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0) + UI.joy.y;
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  o.ix = ix; o.iy = iy; o.attract = !!(k[' '] || UI.attTouch);
  const spd = UI.boostT > 0 ? 4 : 1; if (UI.boostT > 0) UI.boostT -= dt;
  const simDt = dt * spd, n = Math.ceil(simDt / 0.075);
  for (let s = 0; s < n; s++) simStep(simDt / n);
  processEvents();
  if (G._pulse > 0) G._pulse -= dt * 0.6;
  AU.setDrill && AU.ac && AU.setDrill(o.drill);
  // 镜头：静态锁定白球，平滑缩放
  CAM.z += (CAM.tz - CAM.z) * Math.min(1, dt * 8); CAM.x = o.x; CAM.y = o.y;
  render(dt, UI);
  hudT -= dt; if (hudT <= 0) { hudT = 0.3; updateHUD(); }
  mmT -= dt; if (mmT <= 0) { mmT = 0.5; drawMinimap(); }
  if (performance.now() - UI.lastSave > 20000) saveGame(true);
}

/* ---------- 流程 ---------- */
function showTitle() {
  UI.state = 'title'; Ads.gameplayStop(); $('start').style.display = 'flex';
  const has = !!localStorage.getItem(SAVE_KEY);
  $('bStart').textContent = has ? '继续游戏' : '开始游戏'; $('bNew').style.display = has ? '' : 'none';
  $('startIcons').innerHTML = SPECIES.map((s, i) => `<img src="${speciesIcon(i, 64)}" style="animation-delay:${i * 0.15}s;${G.unlocked.includes(s.key) ? '' : 'filter:brightness(0) opacity(.4)'}">`).join('');
  $('ver').textContent = 'v' + VERSION + (META.bestLv ? ' · 历史最高潮汐 Lv.' + META.bestLv : '');
}
function beginPlay() { $('start').style.display = 'none'; UI.state = 'play'; last = performance.now(); Ads.gameplayStart(); AU.init(); AU.setOn(META.sound !== false); AU.setMus(META.music !== false); updateHUD(); drawMinimap(); }
function startNew() {
  const keepUnlocked = G.unlocked.slice();
  newGame(); G.unlocked = Array.from(new Set(keepUnlocked.concat(G.unlocked)));
  UI.selId = 0; UI.selDev = null; exitBuild(); CAM.tz = CAM.z = 1;
  for (let i = 0; i < GN * GN; i++) paintCell(i); floorDirty = true; rimDirty = true;
  beginPlay(); saveGame(true); toast('🌱 新的世界诞生了');
}
function continueGame() {
  const s = loadGame(); if (!s) { startNew(); return; }
  for (let i = 0; i < GN * GN; i++) paintCell(i); floorDirty = true; rimDirty = true;
  beginPlay(); const away = (Date.now() - s.savedAt) / 1000;
  if (away > 30) runOffline(away);
}
function boot() {
  loadMeta();
  G.unlocked = META.unlocked && META.unlocked.length ? META.unlocked.slice() : [];
  AU.on = META.sound !== false; AU.musOn = META.music !== false;
  initRender($('c')); buildSprites();
  newGame(1); // 标题背景世界
  G.unlocked = Array.from(new Set(G.unlocked.concat(META.unlocked || [])));
  for (let i = 0; i < GN * GN; i++) paintCell(i);
  setupInput(); Ads.init().then(() => Ads.loadingDone());
  $('bStart').onclick = () => { AU.init(); AU.play('click'); if (localStorage.getItem(SAVE_KEY)) continueGame(); else startNew(); };
  $('bNew').onclick = () => { if (confirm('确定开始新的世界吗？当前世界会被覆盖（解锁的物种保留）。')) { AU.init(); startNew(); } };
  showTitle(); requestAnimationFrame(frame);
}
window.addEventListener('load', boot);
