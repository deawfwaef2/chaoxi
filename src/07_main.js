/* ===================== 主程序 v0.5：UI / 输入 / 存档 / 离线推演 ===================== */
const $ = id => document.getElementById(id);
const UI = { state: 'title', build: -1, ghost: null, ang: 0, sel: -1, selId: 0, selDev: null, selPOI: null, selSp: -1, panel: null, tab: 0, boostT: 0, keys: {}, joy: { x: 0, y: 0, id: null }, touch: false, hidden: 0, lastSave: 0, dock: 0, sprayTouch: false, dockSig: '' };
const META_KEY = 'chaoxi6_meta', SAVE_KEY = 'chaoxi6_save';
let META = { unlocked: [], bestLv: 0, tut: 0, sound: true, music: true, wins: 0, seenCards: [], introSeen: [] };
function loadMeta() { try { let m = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (!m) { const o = JSON.parse(localStorage.getItem('chaoxi5_meta') || 'null'); if (o) m = { sound: o.sound, music: o.music, bestLv: o.bestLv || 0 }; } if (m) META = Object.assign(META, m); META.unlocked = (META.unlocked || []).filter(k => SP_IDX[k] !== undefined || DV_IDX[k.slice(1)] !== undefined); } catch (e) { } }
function saveMeta() { META.unlocked = G.unlocked.slice(); META.bestLv = Math.max(META.bestLv, G.maxLv); try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) { } }
const fmtN = n => { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n); };

/* ---------- 存档 v4（二进制打包 + base64） ---------- */
function b64enc(u8) { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }
function b64dec(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function mergeParticlesForSave() { const map = new Map(); for (let i = 0; i < pN; i++) { const k = (pr[i] === 255 ? SNC : 0) + sCell(px[i], py[i]); const m = map.get(k); if (m !== undefined && pv[m] + pv[i] < 60000) { pv[m] += pv[i]; pv[i] = 0; } else map.set(k, i); } compactP(); }
function packBits(a) { const u = new Uint8Array((a.length + 7) >> 3); for (let i = 0; i < a.length; i++) if (a[i]) u[i >> 3] |= 1 << (i & 7); return u; }
function unpackBits(u, a) { for (let i = 0; i < a.length; i++) a[i] = (u[i >> 3] >> (i & 7)) & 1; }
function serialize() {
  const P = new DataView(new ArrayBuffer(pN * 8));
  for (let i = 0; i < pN; i++) { const o = i * 8; P.setInt16(o, Math.round(px[i]), true); P.setInt16(o + 2, Math.round(py[i]), true); P.setUint16(o + 4, pv[i], true); P.setUint8(o + 6, pr[i]); }
  const CB = 40, C = new DataView(new ArrayBuffer(cN * CB));
  for (let i = 0; i < cN; i++) { const o = i * CB; C.setFloat32(o, cx[i], true); C.setFloat32(o + 4, cy[i], true); C.setInt32(o + 8, ce[i], true); C.setUint8(o + 12, csp[i]); C.setUint16(o + 13, cgen[i], true); C.setFloat32(o + 16, cage[i], true); C.setFloat32(o + 20, crep[i], true); C.setUint32(o + 24, cid[i], true); C.setFloat32(o + 28, cmeta[i], true); C.setFloat32(o + 32, cg[i], true); C.setFloat32(o + 36, cmt[i], true); }
  const M = new DataView(new ArrayBuffer(mN * 8));
  for (let j = 0; j < mN; j++) { const o = j * 8; M.setInt16(o, Math.round(mx[j]), true); M.setInt16(o + 2, Math.round(my[j]), true); M.setUint16(o + 4, mval[j], true); M.setUint16(o + 6, Math.round(mage[j]), true); }
  const diffs = []; for (let i = 0; i < GN * GN; i++) if (whp[i] !== wMax[i]) diffs.push(i);
  const Wb = new DataView(new ArrayBuffer(diffs.length * 8)); diffs.forEach((i, k) => { Wb.setUint32(k * 8, i, true); Wb.setFloat32(k * 8 + 4, whp[i], true); });
  const o = G.orb;
  return JSON.stringify({
    v: 5, ver: VERSION, rp: G.rp, resT: G.resT, savedAt: Date.now(), seed: G.seed, t: G.t, lv: G.lv, maxLv: G.maxLv, wt: G.wt, towerAcc: G.towerAcc, devAcc: G.devAcc, lastScore: G.lastScore, lastBreak: G.lastBreak,
    hist: G.hist, popHist: G.popHist, nextId: G.nextId, devId: G.devId, won: G.won, wallBroken: G.wallBroken || 0,
    stats: [G.births, G.deaths, G.starve, G.oldDeaths, G.eaten, G.summons || 0, G.fights || 0],
    matter: G.matter, flow: G.flow, flowWin: G.flowWin, lastFlow: G.lastFlow, inRate: G.inRate || 0,
    orb: { x: o.x, y: o.y, hp: o.hp, tank: o.tank, ab: o.absorbed }, cam: CAM.tz,
    pois: G.pois.map(q => [q.found ? 1 : 0, q.used ? 1 : 0, q.amt, q.sp, +(q.acc || 0).toFixed(2)]),
    devs: G.devs.map(d => ({ id: d.id, type: d.type, x: d.x, y: d.y, ang: d.ang, bt: d.bt, bt0: d.bt0, n: d.n || 0 })),
    P: b64enc(new Uint8Array(P.buffer)), C: b64enc(new Uint8Array(C.buffer)), W: b64enc(new Uint8Array(Wb.buffer)), M: b64enc(new Uint8Array(M.buffer)), S: b64enc(packBits(seen)),
  });
}
function saveGame(silent) {
  if (UI.state !== 'play') return;
  for (let tries = 0; tries < 4; tries++) {
    try { localStorage.setItem(SAVE_KEY, serialize()); saveMeta(); UI.lastSave = performance.now(); if (!silent) toast('💾 已保存'); return true; }
    catch (e) { mergeParticlesForSave(); }
  }
  if (!silent) toast('⚠ 存档失败（浏览器存储空间不足）'); return false;
}
function loadGame() {
  let s; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; }
  if (!s || s.v !== 5) return null;
  genWorld(s.seed);
  const W = new DataView(b64dec(s.W).buffer); for (let k = 0; k < W.byteLength / 8; k++) { const i = W.getUint32(k * 8, true), h = W.getFloat32(k * 8 + 4, true); whp[i] = h; if (h <= 0) wE[i] = 0; }
  G.wallSealed = 0;
  unpackBits(b64dec(s.S), seen);
  const P = new DataView(b64dec(s.P).buffer); pN = 0; for (let k = 0; k < P.byteLength / 8; k++) { const o = k * 8; px[pN] = P.getInt16(o, true); py[pN] = P.getInt16(o + 2, true); pv[pN] = P.getUint16(o + 4, true); pr[pN] = P.getUint8(o + 6); pvx[pN] = pvy[pN] = 0; if (pv[pN] > 0) pN++; }
  const C = new DataView(b64dec(s.C).buffer); cN = 0; const CB = 40;
  for (let k = 0; k < C.byteLength / CB; k++) { const o = k * CB; const i = newC(C.getUint8(o + 12), C.getFloat32(o, true), C.getFloat32(o + 4, true), C.getInt32(o + 8, true), C.getUint16(o + 13, true)); if (i < 0) break; cage[i] = C.getFloat32(o + 16, true); crep[i] = C.getFloat32(o + 20, true); cid[i] = C.getUint32(o + 24, true); cmeta[i] = C.getFloat32(o + 28, true); cg[i] = C.getFloat32(o + 32, true) || 1; cmt[i] = C.getFloat32(o + 36, true); }
  const M = new DataView(b64dec(s.M).buffer); mN = 0; for (let k = 0; k < M.byteLength / 8 && mN < MAXM; k++) { const o = k * 8; mx[mN] = M.getInt16(o, true); my[mN] = M.getInt16(o + 2, true); mval[mN] = M.getUint16(o + 4, true); mage[mN] = M.getUint16(o + 6, true); mvx[mN] = mvy[mN] = 0; if (mval[mN]) mN++; }
  (s.pois || []).forEach((a, k) => { const q = G.pois[k]; if (!q) return; q.found = !!a[0]; q.used = !!a[1]; q.amt = a[2]; q.sp = a[3]; q.acc = a[4] || 0; });
  Object.assign(G, { t: s.t, lv: s.lv, maxLv: s.maxLv, wt: s.wt, towerAcc: s.towerAcc, devAcc: s.devAcc, lastScore: s.lastScore, lastBreak: s.lastBreak, hist: s.hist || [], popHist: s.popHist || [], nextId: s.nextId, devId: s.devId, won: s.won, wallBroken: s.wallBroken || 0, matter: s.matter || 0, inRate: s.inRate || 0, rp: s.rp || 0, resT: s.resT || '' });
  wN = 0; for (let k = 0; k < 30; k++) spawnWisp();
  if (s.flow) G.flow = s.flow; if (s.flowWin) G.flowWin = s.flowWin; if (s.lastFlow) G.lastFlow = s.lastFlow;
  [G.births, G.deaths, G.starve, G.oldDeaths, G.eaten, G.summons, G.fights] = s.stats; G.fights = G.fights || 0; computeOpen();
  const o = G.orb; o.x = s.orb.x; o.y = s.orb.y; o.hp = s.orb.hp; o.tank = s.orb.tank != null ? s.orb.tank : 60; o.absorbed = s.orb.ab || 0; o.dead = 0; o.vx = o.vy = 0;
  G.devs = s.devs.map(d => Object.assign({ powered: true, acc: 0, lastAcc: 0, tt: Math.random(), conn: false, mult: 1, n: 0 }, d));
  recomputePower(); CAM.tz = CAM.z = s.cam || 1;
  G.spCount.fill(0); for (let i = 0; i < cN; i++) G.spCount[csp[i]]++; G._lastCount = Int32Array.from(G.spCount); G.spAlive = G.spCount.filter(x => x > 0).length;
  return s;
}

/* ---------- 离线推演 ---------- */
let offCancel = false;
function worldE() { const L = ledger(); return L.map + L.bio; }
// 玩家能“看见”的光：已探索区域的地面光 + 小怪体内（不含迷雾中封存的光洞）
function visibleE() { let e = 0; for (let i = 0; i < pN; i++) { const g = gIdx(px[i], py[i]); if (g >= 0 && seen[g]) e += pv[i]; } for (let i = 0; i < cN; i++) if (!cdead[i]) e += ce[i]; return e; }
function runOffline(sec, title, done) {
  sec = Math.min(sec, 12 * 3600);
  const before = { lv: G.lv, pop: cN, sp: Array.from(G.spCount), births: G.births, deaths: G.deaths, t: G.t, E: visibleE(), mat: G.matter };
  const ext = new Set(); let maxLvSeen = G.lv, minLvSeen = G.lv;
  $('offline').classList.add('show'); $('offTxt').textContent = title || '你离开期间，生态缸仍在运转'; offCancel = false;
  const tStart = performance.now(); let simmed = 0, dt = 0.25; const budget = 9000; G.offline = true;
  const t0 = performance.now(); for (let k = 0; k < 8 && simmed < sec; k++) { simStep(dt); simmed += dt; G.events.length = 0; }
  const ms = Math.max(0.3, (performance.now() - t0) / 8); const steps = budget / ms; dt = Math.max(0.25, Math.min(4, (sec - simmed) / steps));
  function chunk() {
    const c0 = performance.now();
    while (simmed < sec && performance.now() - c0 < 50) {
      const d = Math.min(dt, sec - simmed); simStep(d); simmed += d;
      for (const e of G.events) { if (e.type === 'extinct') ext.add(e.a); if (e.type === 'lv') { maxLvSeen = Math.max(maxLvSeen, e.a); minLvSeen = Math.min(minLvSeen, e.a); } if (e.type === 'win') G._winPending = true; }
      G.events.length = 0;
    }
    $('offBar').firstChild.style.width = (simmed / sec * 100).toFixed(1) + '%';
    if (simmed < sec && !offCancel && performance.now() - tStart < budget * 1.6) setTimeout(chunk, 0);
    else {
      $('offline').classList.remove('show'); UI.dockSig = ''; G.offline = false;
      const rep = { sec: simmed, want: sec, before, after: { lv: G.lv, pop: cN, sp: Array.from(G.spCount), E: visibleE(), mat: G.matter }, births: G.births - before.births, deaths: G.deaths - before.deaths, ext: [...ext], maxLv: maxLvSeen, minLv: minLvSeen };
      showReport(rep); saveGame(true); if (done) done(rep);
    }
  }
  setTimeout(chunk, 30);
}
function fmtTime(s) { s = Math.round(s); if (s < 60) return s + ' 秒'; if (s < 3600) return Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒'; return Math.floor(s / 3600) + ' 小时 ' + Math.floor(s % 3600 / 60) + ' 分'; }
function showReport(r) {
  const spLines = SPECIES.map((s, i) => (r.before.sp[i] || r.after.sp[i]) ? `<tr><td><img src="${speciesIcon(i, 40)}" style="width:28px;vertical-align:middle"> ${s.name}</td><td>${r.before.sp[i]}</td><td>→</td><td style="color:${r.after.sp[i] > r.before.sp[i] ? '#8f8' : r.after.sp[i] < r.before.sp[i] ? '#f99' : '#ccc'}">${r.after.sp[i]}${r.after.sp[i] === 0 ? ' 💀' : ''}</td></tr>` : '').join('');
  const collapsed = r.after.pop === 0 && r.before.pop > 0, dE = r.after.E - r.before.E, dM = r.after.mat - r.before.mat;
  $('repBox').innerHTML = `<div style="font-size:22px;font-weight:800">${collapsed ? '💀 生态缸崩溃了…' : r.after.lv > r.before.lv ? '🌊 光域上涨！' : r.after.lv < r.before.lv ? '🌘 光域退去了…' : '🎁 开盲盒时间'}</div>
  <div style="opacity:.75">⏱ ${fmtTime(r.sec)}${r.sec < r.want - 1 ? `（离开 ${fmtTime(r.want)}，超出部分已省略）` : ''}</div>
  <div class="kv" style="margin:8px 0">
    <div class="i">🌊</div><div>光域</div><b style="color:${LV_COLORS[r.after.lv]}">Lv${r.before.lv} → Lv${r.after.lv}</b>
    <div class="i">🐾</div><div>小怪</div><b>${r.before.pop} → ${r.after.pop}</b>
    <div class="i" style="color:#9ff4ff">✦</div><div>夜晚光</div><b class="${dE >= 0 ? 'up' : 'dn'}">${dE >= 0 ? '+' : ''}${fmtN(dE)}</b>
    <div class="i cm">◆</div><div>魂晶</div><b class="${dM >= 0 ? 'up' : 'dn'}">${dM >= 0 ? '+' : ''}${fmtN(dM)}</b>
  </div>
  ${r.ext.length ? `<div style="color:#f99">💀 灭绝：${r.ext.map(s => SPECIES[s].name).join('、')}</div>` : ''}
  <table class="tb" style="margin-top:6px">${spLines}</table>
  ${collapsed ? '<div class="note warn">光耗尽，小怪全部饿死了。洒光光、开拓光洞、建造发生器，然后重新召唤吧——解锁的物种不会丢失。</div>' : dE < 0 && r.after.pop > 0 ? '<div class="note">光在减少：食肉动物能控制食草动物的数量，让光用得更久。</div>' : ''}
  <div style="text-align:center;margin-top:14px"><button class="btn pri" id="repOk">继续</button></div>`;
  $('report').classList.add('show'); $('repOk').onclick = () => { $('report').classList.remove('show'); AU.play('click'); if (G._winPending) { G._winPending = false; showWin(); } };
}

/* ---------- 提示 / Toast ---------- */
function bigNotice(ic, title, name, col, sub) {
  const d = document.createElement('div'); d.className = 'bign'; d.style.setProperty('--c', col || '#9ff4ff');
  d.innerHTML = `<img src="${ic}"><div><div class="bt">${title}</div><div class="bnm" style="color:${col}">${name}<i class="nw">NEW</i></div><div class="bs">${sub || ''}</div></div>`;
  $('notices').appendChild(d); while ($('notices').children.length > 2) $('notices').firstChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 600); }, 4200);
}
function toast(msg, col) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = msg; if (col) d.style.borderColor = col; $('toasts').appendChild(d); while ($('toasts').children.length > 4) $('toasts').firstChild.remove(); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 700); }, 3600); }
const isTouch = () => UI.touch || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
const hasDev = key => G.devs.some(d => DEVICES[d.type].key === key);
function nearestWisp() { let bd = 1e18, bx = 0, by = 0; for (let k = 0; k < wN; k++) { if (wval[k] <= 0) continue; const d = dist2(wx[k], wy[k], G.orb.x, G.orb.y); if (d < bd) { bd = d; bx = wx[k]; by = wy[k]; } } return bd < 1e18 ? [bx, by] : null; }
/* v0.7 新手引导：3 个手指动画，一句话 */
const TUT = [
  { cap: '拖动小灯，吸收漂浮的光', mode: 'drag', from: () => w2s(G.orb.x, G.orb.y), to: () => { const w = nearestWisp(); return w ? w2s(w[0], w[1]) : null; }, done: () => G.orb.absorbed >= 10 },
  { cap: '按住不动，把光洒在地上', mode: 'press', at: () => w2s(G.orb.x, G.orb.y), done: () => G.flow.spray >= 30 },
  { cap: '点卡片，召唤小怪', mode: 'tap', at: () => { const el = document.querySelector('#dList .dc[data-s]'); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.45]; }, done: () => (G.summons || 0) >= 2 },
];
function tutNext() { META.ft = (META.ft || 0) + 1; saveMeta(); AU.play('gain'); if (META.ft >= TUT.length) { toast('🕯️ 守则已掌握——让这片黑暗亮起来吧'); } updateHint(); }
function updateHint() {
  const f = $('tutF'), c = $('tutCap'), st = META.ft || 0;
  if (st >= TUT.length || UI.state !== 'play' || UI.panel || $('intro').classList.contains('show')) { f.style.display = 'none'; c.style.display = 'none'; return; }
  const s = TUT[st]; if (s.done()) return tutNext();
  c.style.display = 'flex';
  if (c._k !== st) { c._k = st; c.innerHTML = `<b>守则 ${st + 1}/${TUT.length}</b><span>${s.cap}</span><button id="tutX">跳过</button>`; $('tutX').onclick = e => { e.stopPropagation(); META.ft = TUT.length; saveMeta(); updateHint(); }; }
  let p0 = s.mode === 'drag' ? s.from() : s.at(), p1 = s.mode === 'drag' ? s.to() : p0;
  if (!p0 || !p1) { f.style.display = 'none'; return; }
  f.style.display = 'block'; f.className = s.mode;
  f.style.setProperty('--x0', p0[0] + 'px'); f.style.setProperty('--y0', p0[1] + 'px'); f.style.setProperty('--x1', p1[0] + 'px'); f.style.setProperty('--y1', p1[1] + 'px');
}

/* ---------- 装置图标（复用渲染器绘制） ---------- */
const _devIcon = {};
function devIcon(t) {
  if (_devIcon[t]) return _devIcon[t];
  const c = mkC(96), g = c.getContext('2d'), sv = ctx, lv = G.lv, z = CAM.z;
  ctx = g; G.lv = Math.max(1, G.lv); CAM.z = 0.2; g.translate(48, 66); g.scale(1.3, 1.3);
  const d = { id: 1, type: t, x: 0, y: 0, ang: 0, bt: 0, powered: true, conn: true, flash: 0, tt: 0, mult: 1, acc: 0, n: 0 };
  try { if (DEVICES[t].len) { g.save(); g.scale(0.3, 0.3); drawDevice(d, false); g.restore(); } else drawDevice(d, false); drawDevice(d, true); } catch (e) { }
  ctx = sv; G.lv = lv; CAM.z = z; return _devIcon[t] = c.toDataURL();
}

/* ---------- 底部坞站（v0.7 极简：只显示已解锁 + 「下一个」调查格） ---------- */
function spUnlocked(i) { return G.unlocked.includes(SPECIES[i].key); }
function isNew(key) { return G.unlocked.includes(key) && !META.introSeen.includes(key); }
function itemIcon(it) { return it.kind === 's' ? speciesIcon(it.idx, 96) : devIcon(it.idx); }
function nextSlot() {
  const key = G.resT || nextRes(); if (!key) return '';
  const it = resItem(key), f = Math.min(1, G.rp / Math.max(1, it.cost)), gate = resGate(it.tier), locked = G.maxLv < gate;
  return `<div class="dc nx" data-nx="${key}"><div class="nxr"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" class="bg"/><circle cx="20" cy="20" r="17" class="fg" stroke-dasharray="${(f * 106.8).toFixed(1)} 200"/></svg><img src="${itemIcon(it)}"><b>?</b></div><div class="nm">下一个</div><div class="cs"><span class="np">${locked ? '🔒 ' + LV_NAMES[gate] : Math.floor(f * 100) + '%'}</span></div></div>`;
}
function buildDock() {
  const L = $('dList'); let h = nextSlot();
  SPECIES.forEach((s, i) => {
    if (!spUnlocked(i)) return; const nw = isNew(s.key);
    h += `<div class="dc ${nw ? 'new' : ''}" data-s="${i}" data-k="${s.key}"><div class="glow" style="--c:${s.col}"></div><img src="${speciesIcon(i, 96)}" style="--sz:${[0.62, 0.78, 0.9, 1, 1][sizeClass(s.r)]}"><div class="nm">${s.name}</div><div class="cs"><span class="ce">⚡${s.cost}</span>${s.mcost ? `<span class="cm">◆${s.mcost}</span>` : ''}</div><div class="bd">${G.spCount[i]}</div></div>`;
  });
  let sep = false;
  DEVICES.forEach((d, i) => {
    if (!devUnlocked(i)) return; const key = 'd' + d.key, nw = d.tier > 0 && isNew(key);
    if (!sep) { h += '<div class="dsep"></div>'; sep = true; }
    h += `<div class="dc dv ${nw ? 'new' : ''}" data-d="${i}" data-k="${key}"><div class="glow" style="--c:${DEV_COL[i]}"></div><img src="${devIcon(i)}"><div class="nm">${d.name}</div><div class="cs"><span class="cm">◆${d.mc}</span></div></div>`;
  });
  L.innerHTML = h; updateDock();
}
function updateDock() {
  const sig = G.unlocked.length + '|' + G.maxLv + '|' + G.resT + '|' + META.introSeen.length;
  if (sig !== UI.dockSig) { UI.dockSig = sig; buildDock(); return; }
  const L = $('dList');
  const nx = L.querySelector('.nx'); if (nx) { const it = resItem(nx.dataset.nx); if (it) { const f = Math.min(1, G.rp / Math.max(1, it.cost)); nx.querySelector('.fg').setAttribute('stroke-dasharray', (f * 106.8).toFixed(1) + ' 200'); if (G.maxLv >= resGate(it.tier)) nx.querySelector('.np').textContent = Math.floor(f * 100) + '%'; } }
  const used = capUsed(), cap = totalCap();
  for (const el of L.children) {
    if (el.dataset.s !== undefined) { const i = +el.dataset.s, s = SPECIES[i]; const okE = G.orb.tank >= s.cost, okM = G.matter >= s.mcost; el.classList.toggle('poor', !(okE && okM)); const cs = el.querySelector('.cs'); cs.children[0].classList.toggle('no', !okE); if (cs.children[1]) cs.children[1].classList.toggle('no', !okM); el.querySelector('.bd').textContent = G.spCount[i]; }
    else if (el.dataset.d !== undefined) { const d = DEVICES[+el.dataset.d]; const okM = G.matter >= d.mc; el.classList.toggle('poor', !okM || used + d.cost > cap); el.querySelector('.cs').children[0].classList.toggle('no', !okM); }
  }
}
function setDock() { UI.dockSig = ''; updateDock(); }
function doSummon(i, el) {
  const s = SPECIES[i], o = G.orb, r = summon(i, isWall(o.x, o.y) ? null : { x: o.x, y: o.y });
  if (r) { AU.play('error'); toast('⚠ ' + r + ''); if (el) el.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 220); }
  else { AU.play('summon'); addFX('text', o.x, o.y - 24, { text: '-' + s.cost + '⚡', life: 1, color: '#ffe3a0' }); }
  updateDock();
}
/* 自动选位：先在小灯附近找，再在长明灯附近找；路灯优先放在光场边缘向小灯方向延伸 */
function autoSpot(t) {
  const def = DEVICES[t], o = G.orb, cands = [];
  const tryAt = (x, y) => !canPlace(t, x, y);
  if (def.pf) { // 路灯：沿 塔→小灯 方向，尽量靠外
    const a0 = Math.atan2(o.y, o.x || 0.01);
    for (let r = 900; r >= 90; r -= 30) for (const da of [0, 0.25, -0.25, 0.5, -0.5, 0.9, -0.9]) { const x = Math.cos(a0 + da) * r, y = Math.sin(a0 + da) * r; if (Math.hypot(x - o.x, y - o.y) < 420 && tryAt(x, y)) return [x, y]; }
  }
  for (const [cx0, cy0] of [[o.x, o.y], [0, 0]]) for (let r = 50; r <= 600; r += 22) { const n = Math.max(8, Math.round(r / 14)), off = rnd() * 6.28; for (let k = 0; k < n; k++) { const a = off + k / n * 6.2832, x = cx0 + Math.cos(a) * r, y = cy0 + Math.sin(a) * r; if (tryAt(x, y)) return [x, y]; } }
  return null;
}
function tryBuild(i) {
  const d = DEVICES[i];
  if (G.matter < d.mc) { AU.play('error'); toast(`⚠ 魂晶不足：需要 ◆${d.mc}`); return; }
  if (capUsed() + d.cost > totalCap()) { AU.play('error'); toast('⚠ 建筑已达上限——提升光域等级可以建更多'); return; }
  const p = autoSpot(i); if (!p) { AU.play('error'); toast('⚠ 附近没有空位——先建【' + DEVICES[DV_IDX.pylon].name + '】照亮更多地方'); return; }
  placeDev(i, p[0], p[1], rnd() * 6.28); AU.play('place'); addFX('ring', p[0], p[1], { life: 0.8, r: 60, color: DEV_COL[i] });
  toast(`🔨 ${d.name} 开工了（${d.time} 秒）`); updateDock();
}
function onDockClick(e) {
  const el = e.target.closest('.dc'); if (!el || UI.lpFired) { UI.lpFired = false; return; }
  if (el.dataset.nx) { const it = resItem(el.dataset.nx); showIntro(it.kind, it.idx); return; }
  if (el.dataset.s !== undefined) { const i = +el.dataset.s; if (!META.introSeen.includes(SPECIES[i].key)) { showIntro('s', i); return; } doSummon(i, el); return; }
  if (el.dataset.d !== undefined) { const i = +el.dataset.d; if (DEVICES[i].tier > 0 && !META.introSeen.includes('d' + DEVICES[i].key)) { showIntro('d', i); return; } tryBuild(i); }
}
function setupDockLongPress() { // 长按卡片 = 查看详情（代替图鉴）
  const L = $('dList'); let tm = 0;
  L.addEventListener('pointerdown', e => { const el = e.target.closest('.dc'); if (!el) return; UI.lpFired = false; clearTimeout(tm); tm = setTimeout(() => { UI.lpFired = true; if (el.dataset.s !== undefined) showIntro('s', +el.dataset.s, true); else if (el.dataset.d !== undefined) showIntro('d', +el.dataset.d, true); else if (el.dataset.nx) { const it = resItem(el.dataset.nx); showIntro(it.kind, it.idx, true); } }, 480); });
  const cancel = () => clearTimeout(tm); L.addEventListener('pointerup', cancel); L.addEventListener('pointercancel', cancel); L.addEventListener('pointerleave', cancel); L.addEventListener('scroll', cancel);
}

/* ---------- 介绍卡（极简：大图 + 名字 + 一句话；「详细」可展开） ---------- */
function traitsOf(sp) {
  const L = [];
  L.push(sp.diet === D_E ? { ic: '✦', name: '食能', d: '吃地上的光星点' } : sp.diet === D_M ? (sp.drain ? { ic: '🩸', name: '寄生', d: '靠吸取其他小怪为生' } : { ic: '🍖', name: '食肉', d: '只能靠捕食小怪获得光' }) : { ic: '🍽️', name: '杂食', d: '既吃光也吃小怪' });
  L.push([{ ic: '👥', name: '群居', d: '同伴越多战力越高' }, { ic: '🚩', name: '领地', d: '会驱赶靠近的同类' }, { ic: '🐺', name: '猎团', d: '和同伴一起狩猎' }, { ic: '🚶', name: '独行', d: '独来独往' }][sp.soc]);
  L.push([{ ic: '😨', name: '胆小', d: '遇到强敌就逃' }, { ic: '✊', name: '抱团', d: '群体够强时会反击' }, { ic: '🍱', name: '护食', d: '赶走抢食者' }, { ic: '🦁', name: '无畏', d: '不怕比自己弱的对手' }, { ic: '🪼', name: '被动', d: '不追猎，等猎物上门' }][sp.al]);
  for (const t of sp.tr) if (TRAITS[t] && !(t === 'fly' && L.some(x => x.name === '飞行'))) L.push(TRAITS[t]);
  if (sp.pair) L.push({ ic: '💞', name: '成对', d: '需要两只才能繁殖' });
  return L;
}
function statBar(ic, label, f, col, txt) { f = Math.max(0.04, Math.min(1, f)); return `<div class="sb"><span class="si">${ic}</span><span class="sl">${label}</span><div class="st"><i style="width:${(f * 100).toFixed(0)}%;background:${col}"></i></div><span class="sv">${txt}</span></div>`; }
function spStats(sp) {
  const lg = (v, a, b) => (Math.log(v) - Math.log(a)) / (Math.log(b) - Math.log(a));
  return statBar('⚔', '战力', lg(sp.pow + 0.2, 0.4, 14), 'linear-gradient(90deg,#ff9a6a,#ffd27a)', stars(sp.pow))
    + statBar('📏', '体型', lg(sp.r, 3, 52), 'linear-gradient(90deg,#8fd8ff,#dff6ff)', SIZE_NAME[sizeClass(sp.r)])
    + statBar('💨', '速度', sp.speed / 92, 'linear-gradient(90deg,#8fffd0,#dffff2)', sp.speed < 20 ? '很慢' : sp.speed < 40 ? '慢' : sp.speed < 65 ? '中等' : '很快')
    + statBar('⏳', '寿命', lg(sp.life, 20, 520), 'linear-gradient(90deg,#ffd88a,#fff4d0)', sp.life + ' 秒')
    + statBar('🐣', '繁殖', 1 - lg(sp.mature, 4, 70), 'linear-gradient(90deg,#ff9fd0,#ffe0f0)', sp.mature < 8 ? '极快' : sp.mature < 16 ? '快' : sp.mature < 35 ? '中等' : '慢')
    + statBar('🔥', '食量', lg(sp.meta, 0.07, 2), 'linear-gradient(90deg,#6fd8ff,#bff8ff)', sp.meta < 0.18 ? '很少' : sp.meta < 0.3 ? '少' : sp.meta < 0.6 ? '中' : '很大')
    + statBar('◆', '魂晶', lg(sp.mat / sp.matT * 60, 1, 500), 'linear-gradient(90deg,#ffb84a,#ffe9a8)', '+' + (sp.mat / sp.matT * 60).toFixed(sp.mat / sp.matT * 60 < 10 ? 1 : 0) + '/分');
}
function webRow(label, arr, energy) {
  const ic = j => `<div class="wi ${spUnlocked(j) ? '' : 'unk'}" title="${SPECIES[j].name}"><img src="${speciesIcon(j, 64)}"></div>`;
  return `<div class="webr"><span class="wl">${label}</span>${energy ? '<div class="wi en">✦</div>' : ''}${arr.length || energy ? arr.map(ic).join('') : '<span class="none">没有</span>'}</div>`;
}
function showIntro(kind, idx, detail) {
  const box = $('introBox'); let h = '', key, act = '', more = '', locked = false;
  AU.play('open');
  if (kind === 's') {
    const sp = SPECIES[idx], un = spUnlocked(idx); key = sp.key; locked = !un;
    const tr = traitsOf(sp);
    h = `<div class="ih" style="--c:${sp.col}"><div class="ipic ${locked ? 'unk' : ''}"><div class="halo"></div><img src="${speciesIcon(idx, 160)}" style="--sz:${[0.6, 0.75, 0.88, 1, 1.06][sizeClass(sp.r)]}"></div>
      <div class="itx">${isNew(key) ? '<div class="newr">NEW</div>' : ''}<div class="inm">${locked ? '？？？' : sp.name}</div>
      <div class="isub">${tr.slice(0, 4).map(t => `<span>${t.ic} ${t.name}</span>`).join('')}</div>
      <div class="ids">${locked ? '还在黑暗里……调查完成后现身。' : sp.desc}</div></div></div>`;
    more = `<div class="icols"><div class="istats">${spStats(sp)}</div><div class="iside"><div class="ttl">特性</div><div class="traits">${tr.map(t => `<div class="trc"><span class="ti">${t.ic}</span><div><b>${t.name}</b><small>${t.d}</small></div></div>`).join('')}</div><div class="ttl">食物链</div>${webRow('吃', preyOf(idx), sp.diet !== D_M)}${webRow('天敌', predsOf(idx), false)}</div></div>`;
    if (un) act = `<button class="btn pri big2b" id="iAct">✨ 召唤 <small>⚡${sp.cost}${sp.mcost ? ' ◆' + sp.mcost : ''}</small></button>`;
  } else {
    const d = DEVICES[idx], un = devUnlocked(idx); key = 'd' + d.key; locked = !un;
    h = `<div class="ih" style="--c:${DEV_COL[idx]}"><div class="ipic dev ${locked ? 'unk' : ''}"><div class="halo"></div><img src="${devIcon(idx)}"></div>
      <div class="itx">${isNew(key) ? '<div class="newr">NEW</div>' : ''}<div class="inm" style="color:${DEV_COL[idx]}">${locked ? '？？？' : d.name}</div>
      <div class="isub"><span>◆ ${d.mc}</span><span>⏱ ${d.time} 秒</span></div>
      <div class="ids">${locked ? '还在黑暗里……调查完成后现身。' : d.desc}</div></div></div>`;
    if (un) act = `<button class="btn pri big2b" id="iAct">🔨 建造 <small>◆${d.mc}</small></button>`;
  }
  if (locked) {
    const it = resItem(key), gate = resGate(it.tier), f = Math.min(1, G.rp / it.cost), cur = (G.resT || nextRes()) === key;
    act = `<div class="icost">${G.maxLv < gate ? `<span style="color:#ffb0a0">🔒 需要光域达到「${LV_NAMES[gate]}」</span>` : cur ? `<span>🔍 调查中 ${Math.floor(f * 100)}%</span>` : '<span>排队调查中</span>'}</div>${cur ? '<button class="btn ad big2b" id="iAd">📺 加速调查</button>' : ''}`;
  }
  box.innerHTML = h + (more ? `<div class="imore ${detail ? 'open' : ''}">${locked ? '' : more}</div>` : '') + `<div class="iact">${more && !locked ? `<button class="btn" id="iMore">${detail ? '收起' : '详细 ▾'}</button>` : ''}${act || '<button class="btn pri big2b" id="iOk2">好的</button>'}</div><button class="x ix" id="iX">✕</button>`;
  $('intro').classList.add('show');
  const seen = () => { if (G.unlocked.includes(key) && !META.introSeen.includes(key)) { META.introSeen.push(key); saveMeta(); UI.dockSig = ''; updateDock(); } };
  const close = () => { $('intro').classList.remove('show'); seen(); };
  $('iX').onclick = close; const ok2 = $('iOk2'); if (ok2) ok2.onclick = close;
  $('intro').onpointerdown = e => { if (e.target === $('intro')) close(); };
  const im = $('iMore'); if (im) im.onclick = () => { const m = box.querySelector('.imore'); m.classList.toggle('open'); im.textContent = m.classList.contains('open') ? '收起' : '详细 ▾'; };
  const ia = $('iAct'); if (ia) ia.onclick = () => { close(); if (kind === 's') doSummon(idx, null); else tryBuild(idx); };
  const iad = $('iAd'); if (iad) iad.onclick = () => Ads.rewarded(() => { G.rp += Math.max(25, G.rpRate * 90); stepResearch(0); toast('🔍 调查进度大幅提升'); close(); }, m => toast(m));
}
function openResearch() { const k = G.resT || nextRes(); if (!k) { toast('所有秘密都已揭开'); return; } const it = resItem(k); showIntro(it.kind, it.idx); }

/* ---------- HUD ---------- */
let hudT = 0, mmT = 0;
function updateHUD() {
  const o = G.orb, TM = tankMax(G.lv), tf = Math.max(0, o.tank / TM);
  $('tankBar').style.width = (tf * 100) + '%'; $('tankBar').style.background = tf < 0.2 ? 'linear-gradient(90deg,#ff7a6a,#ffb0a0)' : ''; $('tankV').textContent = Math.floor(o.tank);
  $('sprArc').setAttribute('stroke-dasharray', (tf * 295.3) + ' 400'); $('sprArc').setAttribute('stroke', tf < 0.2 ? '#ff9a8a' : '#7ff4ff');
  $('matV').textContent = fmtN(G.matter); const mr = (G.lastFlow.mat || 0) * 6; $('matR').textContent = mr ? '+' + fmtN(mr) + '/分' : '';
  const E = visibleE(), net = ((G.lastFlow.inE || 0) - (G.lastFlow.burn || 0)) * 6;
  $('ecoV').textContent = fmtN(E); $('ecoR').innerHTML = net >= 0 ? `<span class="up">▲${fmtN(net)}</span>` : `<span class="dn">▼${fmtN(-net)}</span>`;
  $('popV').textContent = fmtN(cN); $('spV').textContent = G.spAlive + '种';
  const lv = G.lv, col = LV_COLORS[lv], lo = THRESH[lv], hi = lv < MAXLV ? THRESH[lv + 1] : THRESH[MAXLV];
  const frac = lv >= MAXLV ? 1 : Math.max(0, Math.min(1, (G.lastScore - lo) / (hi - lo)));
  $('tLv').textContent = lv; $('tLv').style.color = col; $('tArc').setAttribute('stroke', col); $('tArc').setAttribute('stroke-dasharray', (frac * 138.2) + ' 200');
  $('tName').textContent = LV_NAMES[lv]; $('tName').style.color = col;
  $('tNext').textContent = lv >= MAXLV ? '最高等级' : `${G.lastScore.toFixed(1)} / ${hi}`; $('tWin').firstChild.style.width = (G.wt / WINDOW * 100) + '%';
  if (UI.boostT > 0) { $('speedTag').style.display = 'block'; $('speedTag').textContent = '⏩×4 ' + Math.ceil(UI.boostT) + 's'; } else $('speedTag').style.display = 'none';
  { const it = G.resT ? resItem(G.resT) : null; $('resN').textContent = it ? it.def.name : (G.labs.length ? '选择调查' : '调查'); $('resBar').style.width = it ? Math.min(100, G.rp / it.cost * 100) + '%' : '0%'; $('cRes').classList.toggle('idle', !it && G.labs.length > 0); }
  updateDock(); updateCard(); updateHint();
  
}

/* ---------- 信息卡 ---------- */
const MOOD = {}; MOOD[ST_FLEE] = '😱'; MOOD[ST_FIGHT] = '💢'; MOOD[ST_HUNT] = '🎯'; MOOD[ST_MATE] = '💕'; MOOD[ST_REST] = '💤';
function preyOf(s) { return SPECIES[s].prey ? SPECIES[s].prey.map(k => SP_IDX[k]) : []; }
function predsOf(s) { const L = []; SPECIES.forEach((x, j) => { if (S_preyMask[j] & (1 << s)) L.push(j); }); return L; }
function webHTML(s) {
  const sp = SPECIES[s], eats = preyOf(s), pr = predsOf(s);
  const ic = j => `<img src="${speciesIcon(j, 40)}" title="${SPECIES[j].name}" style="${spUnlocked(j) ? '' : 'filter:brightness(0) opacity(.5)'}">`;
  return `<div class="web"><span class="lb">吃</span>${sp.diet !== D_M ? '<span style="font-size:22px;color:#9ff4ff" title="光">✦</span>' : ''}${eats.map(ic).join('')}</div>
  <div class="web"><span class="lb">天敌</span>${pr.length ? pr.map(ic).join('') : '<span style="opacity:.6">—</span>'}</div>`;
}
function stars(p) { const n = p < 1 ? 1 : p < 2.5 ? 2 : p < 5 ? 3 : p < 9 ? 4 : 5; return '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(5 - n) + '</span>'; }
function clearSel() { UI.selId = 0; UI.selDev = null; UI.selPOI = null; UI.selSp = -1; $('card').style.display = 'none'; }
function showSpeciesCard(s) { clearSel(); UI.selSp = s; AU.play('click'); updateCard(); }
function showDevInfo(t) { clearSel(); UI.selDevInfo = t; UI.selSp = -2; AU.play('click'); updateCard(); }
function updateCard() {
  const c = $('card');
  if (UI.selId) {
    const i = findById(UI.selId, UI.sel); UI.sel = i;
    if (i < 0) { c.innerHTML = '<div class="ch"><div class="nm" style="font-size:16px">🌫 它已经回归了光…</div><button class="x" data-act="x">✕</button></div>'; UI.selId = 0; setTimeout(() => { if (!UI.selId && !UI.selDev && !UI.selPOI && UI.selSp === -1) c.style.display = 'none'; }, 1800); return; }
    const s = csp[i], sp = SPECIES[s], cap = capE(i), ageP = cage[i] / sp.life, eP = ce[i] / cap, pw = power(i, false);
    c.style.display = 'block';
    c.innerHTML = `<div class="ch"><img class="pt" src="${speciesIcon(s, 64)}"><div><div class="nm">${sp.name} ${MOOD[cst[i]] || ''}</div><div class="sub">第 ${cgen[i]} 代 · ${ST_NAME[cst[i]]}</div></div><button class="x" data-act="x">✕</button></div>
    <div class="pills"><span class="pl" style="color:#ffd07a">⚔ ${stars(pw)}</span><span class="pl">🧬 ×${cg[i].toFixed(2)}</span>${ckin[i] ? `<span class="pl">👥 ${Math.min(ckin[i], 8)}</span>` : ''}<span class="pl cm">◆${sp.mat}/${sp.matT}s</span></div>
    <div class="br"><span>⚡</span><div class="bb"><i style="width:${eP * 100}%;background:linear-gradient(90deg,#49c8ff,#bff8ff)"></i></div><span style="min-width:54px;text-align:right">${ce[i]}/${cap}</span></div>
    <div class="br"><span>⏳</span><div class="bb"><i style="width:${Math.min(100, ageP * 100)}%;background:${ageP > 0.75 ? '#ff9ab0' : cage[i] < sp.mature ? '#9fe8ff' : '#ffd88a'}"></i></div><span style="min-width:54px;text-align:right">${cage[i] < sp.mature ? '幼年' : ageP > 0.75 ? '年迈' : '成年'}</span></div>
    ${webHTML(s)}`;
  } else if (UI.selSp >= 0) {
    const s = UI.selSp, sp = SPECIES[s]; c.style.display = 'block';
    c.innerHTML = `<div class="ch"><img class="pt" src="${speciesIcon(s, 64)}"><div><div class="nm">${sp.name}</div><div class="sub">${DIET_NAME[sp.diet]} · 存活 ${G.spCount[s]}</div></div><button class="x" data-act="x">✕</button></div>
    <div class="pills"><span class="pl" style="color:#ffd07a">⚔ ${stars(sp.pow)}</span><span class="pl">⏳ ${sp.life}s</span><span class="pl ce">⚡${sp.cost}</span>${sp.mcost ? `<span class="pl cm">◆${sp.mcost}</span>` : ''}<span class="pl cm">产出 ◆${sp.mat}/${sp.matT}s</span></div>
    <div class="desc">${sp.desc}</div>${webHTML(s)}`;
  } else if (UI.selSp === -2) {
    const t = UI.selDevInfo, d = DEVICES[t]; c.style.display = 'block';
    c.innerHTML = `<div class="ch"><img class="pt" src="${devIcon(t)}"><div><div class="nm" style="color:${DEV_COL[t]}">${d.name}</div><div class="sub">第 ${d.tier} 阶 · 建造 ${d.time}s</div></div><button class="x" data-act="x">✕</button></div>
    <div class="pills"><span class="pl cm">◆${d.mc}</span><span class="pl cc">▣ 额度 ${d.cost}</span>${d.r ? `<span class="pl">◎ ${d.r}</span>` : ''}</div><div class="desc">${d.desc}</div>`;
  } else if (UI.selDev) {
    const d = UI.selDev; if (!G.devs.includes(d)) { clearSel(); return; }
    const def = DEVICES[d.type], act = devActive(d);
    const st = d.bt > 0 ? `<span style="color:#7fb8ff">🔨 建造中 ${Math.ceil(d.bt)}s</span>` : !d.powered ? '<span style="color:#ffb070">⚠ 不在灯光范围内</span>' : G.lv < 1 ? '<span style="color:#aaa">💤 停机（光域 Lv0）</span>' : '<span style="color:#8fffb0">● 运转中</span>';
    const extra = d.bt <= 0 && act ? (def.key === 'collector' ? `已收集 ${d.n || 0} 颗` : def.out ? `+${(def.out * (1 + 0.1 * G.lv)).toFixed(1)} ⚡/s` : d.lastAcc ? `+${d.lastAcc.toFixed(2)} 光域/10s` : '') : '';
    const key = d.id + '|' + (d.bt > 0) + '|' + act;
    if (c.dataset.k !== key || c.style.display === 'none') {
      c.dataset.k = key; c.style.display = 'block';
      c.innerHTML = `<div class="ch"><img class="pt" src="${devIcon(d.type)}"><div><div class="nm" style="color:${DEV_COL[d.type]}">${def.name}</div><div class="sub" id="cdSt"></div></div><button class="x" data-act="x">✕</button></div>
      <div class="desc">${def.desc}</div><div class="pills" id="cdEx"></div>
      <div class="acts">${d.bt > 0 ? '<button class="btn ad" data-act="ad">📺 施工 -60 秒</button>' : ''}<button class="btn red" data-act="del">🗑 拆除 <span class="cm">+◆${Math.floor(def.mc * (d.bt > 0 ? 1 : 0.5))}</span></button></div>`;
    }
    $('cdSt').innerHTML = st; $('cdEx').innerHTML = extra ? `<span class="pl">${extra}</span>` : '';
  } else if (UI.selPOI) {
    const q = UI.selPOI, P = POI[q.type], key = P.key; c.style.display = 'block';
    const st = key === 'crystal' || key === 'pod' ? (q.used ? '已用尽' : '靠近小灯即可触发') : key === 'cave' ? '封存的光' : q.on ? '<span style="color:#8fffb0">● 运转中</span>' : '<span style="color:#ffb070">⚠ 需要接入灯光范围（路灯）且光域 ≥ Lv1</span>';
    c.innerHTML = `<div class="ch"><div style="width:60px;height:60px;border-radius:14px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:32px;color:${P.col}">${P.icon}</div><div><div class="nm" style="color:${P.col}">${P.name}</div><div class="sub">${st}</div></div><button class="x" data-act="x">✕</button></div><div class="desc">${P.desc}</div>`;
  } else c.style.display = 'none';
}
function onCardClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; AU.play('click');
  if (a === 'x') clearSel();
  else if (a === 'ad' && UI.selDev) { const d = UI.selDev; Ads.rewarded(() => { d.bt = Math.max(0.01, d.bt - AD_BUILD_CUT); toast(d.bt <= 0.01 ? '⚡ 建造完成！' : '⚡ 施工缩短 60 秒'); UI.cardSig = ''; }, m => toast(m)); }
  else if (a === 'del' && UI.selDev) { const def = DEVICES[UI.selDev.type]; removeDev(UI.selDev); clearSel(); toast('🗑 已拆除 ' + def.name); }
}

/* ---------- 小地图（只显示已探索区域） ---------- */
function drawMinimap() {
  const c = $('mmC'), g = c.getContext('2d'), S = 160;
  let R = 600; for (let i = 0; i < GN * GN; i += 61) if (seen[i] && whp[i] <= 0) { const gx = i % GN, gy = (i / GN) | 0, d = Math.hypot((gx + 0.5) * CELL - HALF, (gy + 0.5) * CELL - HALF); if (d > R) R = d; }
  R = Math.min(HALF, Math.max(R * 1.25, Math.hypot(G.orb.x, G.orb.y) * 1.2, 700));
  g.fillStyle = '#02050b'; g.fillRect(0, 0, S, S); g.imageSmoothingEnabled = true;
  const src = R / CELL; g.drawImage(floorC, GN / 2 - src, GN / 2 - src, src * 2, src * 2, 0, 0, S, S);
  const k = S / (2 * R), o = S / 2, t = G.t;
  g.fillStyle = 'rgba(160,240,255,0.8)'; for (let i = 0; i < pN; i += Math.max(1, pN / 500 | 0)) if (pr[i] === 255) { const gi = gIdx(px[i], py[i]); if (gi >= 0 && seen[gi]) g.fillRect(o + px[i] * k, o + py[i] * k, 1, 1); }
  for (let i = 0; i < cN; i += Math.max(1, cN / 300 | 0)) { g.fillStyle = SPECIES[csp[i]].col; g.fillRect(o + cx[i] * k - 1, o + cy[i] * k - 1, 2.5, 2.5); }
  for (const d of G.devs) { g.fillStyle = devActive(d) ? DEV_COL[d.type] : '#666'; g.fillRect(o + d.x * k - 2, o + d.y * k - 2, 4, 4); }
  for (const q of G.pois) {
    const X = o + q.x * k, Y = o + q.y * k;
    if (q.found) { g.fillStyle = POI[q.type].col; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.globalAlpha = (q.used && POI[q.type].key !== 'cave') ? 0.4 : 1; g.fillText(POI[q.type].icon, X, Y + 4); g.globalAlpha = 1; }
    else if (Math.hypot(q.x - G.orb.x, q.y - G.orb.y) < 1500) { g.strokeStyle = POI[q.type].col; g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3 + q.x); g.beginPath(); g.arc(X, Y, 3 + 2 * Math.sin(t * 3 + q.x), 0, 7); g.stroke(); g.globalAlpha = 1; }
  }
  g.fillStyle = LV_COLORS[G.lv]; g.fillRect(o - 3, o - 3, 6, 6);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(o + G.orb.x * k, o + G.orb.y * k, 3.5, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; const vw = CAM.W / CAM.z * k, vh = CAM.H / CAM.z * k; g.strokeRect(o + CAM.x * k - vw / 2, o + CAM.y * k - vh / 2, vw, vh);
}

/* ---------- 面板 ---------- */
function openPanel(title, tabs, renderFn, tab) {
  UI.panel = { title, tabs, renderFn }; UI.tab = tab || 0; $('panel').classList.add('show'); document.body.classList.add('pOpen'); $('pTitle').textContent = title;
  $('pTabs').style.display = tabs.length > 1 ? '' : 'none';
  $('pTabs').innerHTML = tabs.map((t, k) => `<div class="tab ${k === UI.tab ? 'on' : ''}" data-k="${k}">${t}</div>`).join('');
  $('pTabs').querySelectorAll('.tab').forEach(el => el.onclick = () => { UI.tab = +el.dataset.k; AU.play('click'); openPanel(title, tabs, renderFn, UI.tab); });
  renderFn(UI.tab);
}
function closePanel() { $('panel').classList.remove('show'); document.body.classList.remove('pOpen'); UI.panel = null; }
function refreshPanel() { if (UI.panel) UI.panel.renderFn(UI.tab); }
function openTide() {
  AU.play('click');
  openPanel('🌊 光域', ['光域', '光账本'], k => {
    const B = $('pBody'), b = G.lastBreak, lv = G.lv, col = LV_COLORS[lv];
    if (k === 0) {
      B.innerHTML = `<div class="big2"><div style="width:84px;height:84px;border-radius:50%;border:6px solid ${col};display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:${col}">${lv}</div><div><div style="font-size:22px;font-weight:800;color:${col}">${LV_NAMES[lv]}</div><div style="opacity:.75">最高 Lv${G.maxLv} · 下一级需要 ${lv < MAXLV ? THRESH[lv + 1] : '—'}</div></div></div>
      ${b ? `<div class="kv"><div class="i">🗼</div><div>长明灯观测（物种数 · 小怪数）</div><b>${b.tower.toFixed(1)}</b><div class="i">🔧</div><div>建筑与遗迹</div><b>${b.dev.toFixed(1)}</b><div class="i">🌈</div><div>和谐倍率（有效物种 ${b.eff.toFixed(1)} · 营养级 ${b.tr ? b.tr.n : '?'}/3）</div><b>×${b.harm.toFixed(2)}</b><div class="i">🌊</div><div><b>本轮光域</b></div><b style="color:${col}">${b.score.toFixed(1)}</b></div>` : '<div style="opacity:.7">还没有结算记录</div>'}
      <div style="margin:12px 0 4px;opacity:.8">近期光域</div><canvas class="spark" id="spark" width="700" height="96"></canvas>
      <div class="note">光域每 10 秒结算一次：<b>物种越多越均衡、食物链越完整，光域越高</b>。它决定你能建造哪些建筑、建造多少（▣ 额度）。下降时每次最多降 1 级；归零时建筑停机。</div>`;
      const cv = $('spark'); if (cv) { const g = cv.getContext('2d'), h = G.hist.slice(-70); const mx = Math.max(10, ...h.map(x => x.s)); g.clearRect(0, 0, 700, 96); for (let q = 1; q <= MAXLV; q++) { const y = 94 - THRESH[q] / mx * 90; if (y < 0) break; g.strokeStyle = LV_COLORS[q] + '55'; g.beginPath(); g.moveTo(0, y); g.lineTo(700, y); g.stroke(); } g.strokeStyle = '#9ff'; g.lineWidth = 2.5; g.beginPath(); h.forEach((x, q) => { const X = q * 10, Y = 94 - x.s / mx * 90; if (q) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); }
    } else {
      const L = ledger(), f = G.lastFlow, net = (f.inE || 0) - (f.burn || 0), E = L.map + L.bio;
      const eta = net < 0 ? visibleE() / (-net / 10) : 0;
      B.innerHTML = `<div class="kv">
      <div class="i" style="color:#9ff4ff">✦</div><div>地面光（已探索）</div><b>${fmtN(visibleE() - L.bio)}</b>
      <div class="i">🐾</div><div>小怪体内</div><b>${fmtN(L.bio)}</b>
      <div class="i">⚡</div><div>小灯光槽</div><b>${Math.floor(G.orb.tank)} / ${tankMax(lv)}</b>
      <div class="i">➕</div><div>近 10 秒新增（洒光 + 发生器 + 反应堆）</div><b class="up">+${f.inE || 0}</b>
      <div class="i">🔥</div><div>近 10 秒代谢消耗</div><b class="dn">-${f.burn || 0}</b>
      <div class="i cm">◆</div><div>近 10 秒魂晶产出</div><b class="cm">+${f.mat || 0}</b></div>
      <div class="note ${net < 0 ? 'warn' : 'okb'}">${net < 0 ? `光正在减少，照此速度约 <b>${fmtTime(eta)}</b> 后耗尽。<br>办法：洒光光 · 开拓光洞 · 接通远古反应堆 · 建造发生器 · 引入捕食者控制食草动物数量。` : '光收支平衡或增长中。生态缸很健康！'}</div>
      <div class="note">🔬 生态学：光沿食物链单向流动、逐级耗散（约 10% 定律）。只有食草动物时，它们会繁殖到吃光光再集体饿死；捕食者让食草动物保持在较低数量（营养级联，就像黄石公园的狼），光就能细水长流。</div>`;
    }
  });
}
function openDex() {
  AU.play('click');
  openPanel('📖 图鉴', ['小怪', '建筑', '遗迹', '玩法'], k => {
    const B = $('pBody');
    if (k === 0) B.innerHTML = '<div class="grid">' + SPECIES.map((s, i) => { const un = spUnlocked(i); return `<div class="cardx ${un ? '' : 'lock'}"><div class="hd"><img src="${speciesIcon(i, 64)}" style="${un ? '' : 'filter:brightness(0)'}"><div><div class="nm">${un ? s.name : '？？？'}</div><div style="font-size:13px;opacity:.7">${DIET_NAME[s.diet]} · ${SIZE_NAME[sizeClass(s.r)]}</div></div></div><div><span class="tag" style="color:#ffd07a">⚔ ${stars(s.pow)}</span><span class="tag">⏳${s.life}s</span><span class="tag ce">⚡${s.cost}</span>${s.mcost ? `<span class="tag cm">◆${s.mcost}</span>` : ''}<span class="tag cm">产◆${s.mat}/${s.matT}s</span></div>${un ? `<div class="ds">${s.desc}</div>` : ''}${webHTML(i)}</div>`; }).join('') + '</div>';
    else if (k === 1) B.innerHTML = '<div class="grid">' + DEVICES.map((d, i) => `<div class="cardx ${devUnlocked(i) ? '' : 'lock'}"><div class="hd"><img src="${devIcon(i)}"><div><div class="nm" style="color:${DEV_COL[i]}">${d.name}</div><div style="font-size:13px;opacity:.7">第 ${d.tier} 阶 · ${d.time}s</div></div></div><div><span class="tag cm">◆${d.mc}</span><span class="tag cc">▣${d.cost}</span>${d.r ? `<span class="tag">◎${d.r}</span>` : ''}</div><div class="ds">${d.desc}</div></div>`).join('') + '</div>';
    else if (k === 2) B.innerHTML = '<div class="grid">' + POI.map(p => `<div class="cardx"><div class="hd"><div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;font-size:30px;color:${p.col}">${p.icon}</div><div><div class="nm" style="color:${p.col}">${p.name}</div><div style="font-size:13px;opacity:.7">已发现 ${G.pois.filter(q => q.type === POI_IDX[p.key] && q.found).length} / ${G.pois.filter(q => q.type === POI_IDX[p.key]).length}</div></div></div><div class="ds">${p.desc}</div></div>`).join('') + '</div>';
    else B.innerHTML = `<div class="help">
      <div class="i" style="color:#9ff4ff">✦</div><div><b>光是有限的。</b>小灯的光槽会慢慢回充，按住【洒光】把光喷到地上，小怪才有东西吃。小怪的代谢会让光消失。</div>
      <div class="i">🐾</div><div><b>召唤小怪</b>会消耗小灯的光（⚡），高级小怪还需要魂晶（◆）。</div>
      <div class="i cm">◆</div><div><b>魂晶</b>是小怪的代谢产物。越高级的动物产出越多——一头糖豆龙抵得上上百只史莱姆。靠近就能拾取，或建造魂晶收集器。</div>
      <div class="i">⚖️</div><div><b>生态平衡</b>：只有食草动物会吃光光然后集体饿死。加入捕食者，食物链越完整，光消耗越慢、魂晶越多、光域越高。</div>
      <div class="i">🌊</div><div><b>光域</b>决定建筑的种类与数量（▣ 额度）。Lv10【永恒之潮】即胜利。</div>
      <div class="i">🏗️</div><div><b>建筑</b>必须建在灯光范围内：先铺路灯。高光域解锁光发生器、恒星炉。</div>
      <div class="i">❓</div><div><b>黑墙外是迷雾。</b>撞墙可以消融它（会掉血）。? 信号下藏着光洞、魂晶晶簇、孵化舱、反应堆、中继塔与古碑——用路灯把遗迹接入光网络即可激活。</div>
      <div class="i">🌙</div><div><b>离线</b>时生态缸继续运转（最多 12 小时），回来像开盲盒。</div></div>`;
  });
}
function openSpeed() {
  AU.play('click');
  openPanel('⏩ 加速', ['时间'], () => {
    const nb = G.devs.filter(d => d.bt > 0).length;
    $('pBody').innerHTML = `<div class="grid">
    <div class="cardx" id="spA" style="cursor:pointer"><div class="nm">📺 时间 ×4</div><div class="ds">接下来 3 分钟时间流速 ×4${UI.boostT > 0 ? '<br>剩余 ' + Math.ceil(UI.boostT) + 's（可叠加）' : ''}</div></div>
    <div class="cardx" id="spB" style="cursor:pointer"><div class="nm">📺 快进 10 分钟</div><div class="ds">立即推演 10 分钟后的夜晚</div></div>
    <div class="cardx ${nb ? '' : 'lock'}" id="spC" style="cursor:pointer"><div class="nm">📺 施工加速</div><div class="ds">建造中的 ${nb} 个建筑各缩短 60 秒</div></div>
    <div class="cardx" id="spD" style="cursor:pointer"><div class="nm">📺 充满光槽</div><div class="ds">小灯光槽立即充满</div></div></div>`;
    $('spA').onclick = () => Ads.rewarded(() => { UI.boostT += 180; toast('⏩ 时间 ×4！'); closePanel(); }, m => toast(m));
    $('spB').onclick = () => Ads.rewarded(() => { closePanel(); runOffline(600, '⏩ 快进 10 分钟…'); }, m => toast(m));
    $('spC').onclick = () => { if (!nb) return; Ads.rewarded(() => { for (const d of G.devs) if (d.bt > 0) d.bt = Math.max(0.01, d.bt - AD_BUILD_CUT); toast('⚡ 所有施工缩短 60 秒'); closePanel(); }, m => toast(m)); };
    $('spD').onclick = () => Ads.rewarded(() => { G.orb.tank = tankMax(G.lv); toast('⚡ 光槽已充满'); closePanel(); }, m => toast(m));
  });
}
function openMenu() {
  AU.play('click');
  openPanel('⚙️ 菜单', ['设置'], () => {
    $('pBody').innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;max-width:380px">
    <button class="btn ad" id="mSpd">📺 加速 / 快进</button>
    <button class="btn" id="mDex">📖 图鉴</button>
    <button class="btn" id="mSave">💾 立即保存</button>
    <button class="btn" id="mSnd">${AU.on ? '🔊 音效：开' : '🔇 音效：关'}</button>
    <button class="btn" id="mMus">${AU.musOn ? '🎵 音乐：开' : '🎵 音乐：关'}</button>
    <button class="btn" id="mTut">🕯️ 重看新手守则</button>
    <button class="btn" id="mTitle">🏠 回到标题</button>
    <button class="btn red" id="mNew">🌱 新的夜晚（保留已解锁物种）</button>
    <div style="opacity:.55;font-size:13px">v${VERSION} · 广告：${Ads.platform} · 每 20 秒自动保存</div></div>`;
    $('mSave').onclick = () => saveGame(false); $('mSpd').onclick = () => { closePanel(); openSpeed(); }; $('mDex').onclick = () => { closePanel(); openDex(); };
    $('mSnd').onclick = () => { AU.setOn(!AU.on); META.sound = AU.on; saveMeta(); refreshPanel(); };
    $('mMus').onclick = () => { AU.setMus(!AU.musOn); META.music = AU.musOn; saveMeta(); refreshPanel(); };
    $('mTut').onclick = () => { META.ft = 0; saveMeta(); closePanel(); updateHint(); };
    $('mTitle').onclick = () => { saveGame(true); closePanel(); showTitle(); };
    $('mNew').onclick = () => { if (!confirm('确定开始新的夜晚吗？当前夜晚会被覆盖（解锁的物种保留）。')) return; closePanel(); startNew(); };
  });
}
function showWin() {
  Ads.happytime(); AU.play('win');
  $('repBox').innerHTML = `<div style="font-size:26px;font-weight:800;text-align:center">🌟 永恒之潮 🌟</div><div style="text-align:center;opacity:.85;margin:10px 0">光域达到最高等级 Lv10！<br>你的生态缸稳定、和谐而多样。<br>⏱ ${fmtClock(G.t)}</div><div style="text-align:center;margin-top:12px"><button class="btn pri" id="repOk">继续经营</button></div>`;
  $('report').classList.add('show'); $('repOk').onclick = () => $('report').classList.remove('show');
  META.wins = (META.wins || 0) + 1; saveMeta();
}
function fmtClock(t) { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60); return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }

/* ---------- 建造模式 ---------- */
function enterBuild(d) {
  document.body.classList.add('building'); UI.build = d; UI.ghost = [G.orb.x + 70, G.orb.y]; const def = DEVICES[d];
  $('bbIcon').src = devIcon(d); $('bbName').textContent = def.name; $('bbName').style.color = DEV_COL[d]; $('bbCost').innerHTML = `<span class="cm">◆${def.mc}</span> · <span class="cc">▣${def.cost}</span> · 🔨${def.time}s`;
  $('bbRot').style.display = def.len ? '' : 'none'; clearSel(); updateBuildTip();
}
function exitBuild() { document.body.classList.remove('building'); UI.build = -1; UI.ghost = null; }
function updateBuildTip() { if (UI.build < 0 || !UI.ghost) return; const err = canPlace(UI.build, UI.ghost[0], UI.ghost[1]); $('bbTip').innerHTML = err ? '⚠ ' + err : (UI.touch ? '👆 点地面选位置，再按 ✓' : '👆 点击放置 · 右键取消'); $('bbTip').style.color = err ? '#ffb0a0' : '#bff8ff'; $('bbOk').disabled = !!err; $('bbOk').style.opacity = err ? 0.45 : 1; }
function tryPlace() {
  if (UI.build < 0 || !UI.ghost) return; const [x, y] = UI.ghost; const err = canPlace(UI.build, x, y);
  if (err) { toast('⚠ ' + err); AU.play('error'); return; }
  const t = UI.build; placeDev(t, x, y, UI.ang); AU.play('place');
  const def = DEVICES[t]; if (capUsed() + def.cost > totalCap() || G.matter < def.mc) exitBuild(); else updateBuildTip();
}

/* ---------- 事件处理 ---------- */
function inView(x, y) { return Math.abs(x - CAM.x) < CAM.W / 2 / CAM.z + 50 && Math.abs(y - CAM.y) < CAM.H / 2 / CAM.z + 50; }
let matSnd = 0;
function processEvents() {
  for (const e of G.events) {
    switch (e.type) {
      case 'birth': if (inView(e.a, e.b)) { addFX('heart', e.a, e.b, { life: 1.2 }); if (CAM.z > 0.5) AU.play('birth', 12 - SPECIES[e.c].r / 3); } break;
      case 'death': if (inView(e.a, e.b)) { addFX('puff', e.a, e.b, { life: 0.8, color: '#9ff4ff' }); if (CAM.z > 0.5) AU.play('death'); } break;
      case 'kill': if (inView(e.a, e.b)) { addFX('puff', e.a, e.b, { life: 0.7, color: SPECIES[e.c].col }); addFX('slash', e.a, e.b, { life: 0.45 }); if (CAM.z > 0.5) AU.play('eaten'); } break;
      case 'fight': if (inView(e.a, e.b) && CAM.z > 0.35) { addFX('spark', e.a, e.b, { life: 0.5, big: e.c }); if (CAM.z > 0.6 && Math.random() < 0.5) AU.play('fight'); } break;
      case 'tidegain': if (inView(e.a, e.b) && CAM.z > 0.4) { addFX('text', e.a, e.b - 10, { text: '+' + (+e.c).toFixed(1), life: 1.2, color: '#8fffd0' }); } break;
      case 'mat': if (e.c >= 5 && inView(e.a, e.b) && CAM.z > 0.4) addFX('ring', e.a, e.b, { life: 0.5, r: 14, color: '#ffd36b' }); break;
      case 'matget': addFX('text', e.a, e.b - 26, { text: '+' + e.c + '◆', life: 1, color: '#ffd36b' }); if (G.t - matSnd > 0.15) { matSnd = G.t; AU.play('gain'); } break;
      case 'found': { const P = POI[e.c]; addFX('ring', e.a, e.b, { life: 1.2, r: 80, color: P.col }); AU.play('lvup'); toast(`<span style="color:${P.col};font-size:18px">${P.icon}</span> 发现 <b style="color:${P.col}">${P.name}</b>`, P.col); break; }
      case 'poi': { const P = POI[e.c]; addFX('ring', e.a, e.b, { life: 1, r: 60, color: P.col }); CAM.shake = 0.6; AU.play('built'); if (P.key === 'crystal') toast(`<span class="cm">◆</span> 采集晶簇 <b class="cm">+${e.d !== undefined ? e.d : ''}</b>`, P.col); else if (P.key === 'pod') toast('🥚 孵化舱苏醒了！', P.col); break; }
      case 'wallbreak': G.wallBroken = (G.wallBroken || 0) + 1; if (inView(e.a, e.b)) { addFX('ring', e.a, e.b, { life: 0.5, r: 20, color: '#ff9ad0' }); AU.play('wall'); } break;
      case 'tp': addFX('ring', e.a, e.b, { life: 0.4, r: 30 }); AU.play('tp'); break;
      case 'orbdie': toast('💫 小灯被黑墙消融了，稍后在长明灯重生'); AU.play('lvdown'); break;
      case 'built': addFX('ring', e.a, e.b, { life: 0.8, r: 50, color: DEV_COL[e.c] }); AU.play('built'); toast(`✅ ${DEVICES[e.c].name} 完成`); break;
      case 'summon': addFX('ring', e.a, e.b, { life: 0.8, r: 30, color: SPECIES[e.c].col }); break;
      case 'settle': G._pulse = 1; AU.play('settle', G.lv); break;
      case 'lv': if (e.a > e.b) { AU.play('lvup'); CAM.shake = 1; toast(`🌊 光域 <b style="color:${LV_COLORS[e.a]}">Lv${e.a} ${LV_NAMES[e.a]}</b>`, LV_COLORS[e.a]); } else { AU.play('lvdown'); toast(`🌘 光域降到 Lv${e.a}${e.a === 0 ? ' · 建筑停机' : ''}`, '#f99'); } refreshPanel(); break;
      case 'unlock': { const nm = e.a === 's' ? SPECIES[e.b].name : DEVICES[e.b].name, ic = e.a === 's' ? speciesIcon(e.b, 64) : devIcon(e.b), col = e.a === 's' ? SPECIES[e.b].col : DEV_COL[e.b];
        bigNotice(ic, '🔬 调查完成', nm, col, e.a === 's' ? '在底部【小怪】栏召唤它' : '在底部【建筑】栏建造它'); AU.play('research'); saveMeta(); UI.dockSig = ''; refreshPanel(); break; }
      case 'wabs': if (inView(e.a, e.b)) { addFX('comet', e.a, e.b, { tx: G.orb.x, ty: G.orb.y, follow: 1, inw: 1, c: 0.25, life: 0.35, w: 3, color: '#ffffff' }); addFX('ring', G.orb.x, G.orb.y, { life: 0.4, r: 16, r0: 12, color: '#dffcff' }); } AU.play('wisp'); break;
      case 'wcat': if (inView(e.a, e.b)) addFX('ring', e.a, e.b - 24, { life: 0.6, r: 26, color: '#ffffff' }); break;
      case 'wdrop': if (inView(e.a, e.b) && CAM.z > 0.35) addFX('comet', e.a + 40, e.b - 160, { tx: e.a, ty: e.b, c: 0.05, life: 0.7, w: 2, color: '#fff6c8' }); break;
      case 'spore': if (inView(e.a, e.b)) { addFX('puff', e.a, e.b, { life: 1, color: '#e8b8ff' }); addFX('ring', e.a, e.b, { life: 0.6, r: 30, color: '#e8b8ff' }); AU.play('pop'); } break;
      case 'rebirth': if (inView(e.a, e.b)) { addFX('ring', e.a, e.b, { life: 1.2, r: 90, color: '#ffab4a' }); addFX('ring', e.a, e.b, { life: 0.8, r: 50, color: '#ffe066' }); addFX('text', e.a, e.b - 30, { text: '🔥 涅槃', life: 1.6, color: '#ffd27a' }); AU.play('lvup'); } break;
      case 'ink': if (inView(e.a, e.b)) { addFX('ink', e.a, e.b, { life: 1.2 }); } break;
      case 'thorn': if (inView(e.a, e.b) && CAM.z > 0.4) addFX('text', e.a, e.b - 14, { text: '🌵', life: 0.8 }); break;
      case 'tongue': if (inView(e.a, e.b)) addFX('tongue', e.a, e.b, { tx: e.c, ty: e.d, life: 0.25 }); break;
      case 'drain': if (inView(e.a, e.b) && CAM.z > 0.4) addFX('comet', e.a, e.b, { tx: e.c, ty: e.d, c: 0.3, life: 0.5, w: 1.6, color: '#9fffe6', inw: 1 }); break;
      case 'carry': if (inView(e.a, e.b) && CAM.z > 0.4) addFX('text', e.a, e.b - 12, { text: '+' + e.c + '◆', life: 0.9, color: '#ffd36b' }); break;
      case 'extinct': toast(`💀 ${SPECIES[e.a].name} 灭绝了`, '#f99'); AU.play('extinct'); break;
      case 'win': showWin(); break;
    }
  }
  G.events.length = 0;
}

/* ---------- 输入 ---------- */
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, downPos = null, dragMoved = false;
function hitTest(wx, wy) {
  for (const d of G.devs) if (dist2(d.x, d.y - 8, wx, wy) < 26 * 26) return { dev: d };
  buildCGrid(); const j = findC(wx, wy, 60, 0xffffffff, -1, null); if (j >= 0 && dist2(cx[j], cy[j], wx, wy) < (S_r[csp[j]] + 14) * (S_r[csp[j]] + 14)) return { c: j };
  for (const q of G.pois) if (q.found && POI[q.type].key !== 'cave' && dist2(q.x, q.y - 30, wx, wy) < 50 * 50) return { poi: q };
  if (wx * wx + (wy + 20) * (wy + 20) < 55 * 55) return { tower: true };
  return null;
}
function tap(sx, sy, isTouch) {
  const [wx, wy] = s2w(sx, sy);
  const h = hitTest(wx, wy);
  if (h && h.tower) { openTide(); return; }
  if (h && h.dev) { clearSel(); UI.selDev = h.dev; AU.play('click'); updateCard(); return; }
  if (h && h.c !== undefined) { clearSel(); UI.sel = h.c; UI.selId = cid[h.c]; AU.play('click'); updateCard(); return; }
  if (h && h.poi) { clearSel(); UI.selPOI = h.poi; AU.play('click'); updateCard(); return; }
  clearSel(); teleportOrb(wx, wy);
}
function setupInput() {
  const c = cvs;
  addEventListener('keydown', e => {
    if (UI.state !== 'play') return; const k = e.key.toLowerCase(); UI.keys[k] = true;
    if (k === ' ' || k === 'tab') e.preventDefault();
    if (k === 'escape') { if ($('intro').classList.contains('show')) $('intro').classList.remove('show'); else if (UI.panel) closePanel(); else if (UI.build >= 0) exitBuild(); else clearSel(); }
    if (k === 'r') UI.ang += Math.PI / 8;
    if (k === '=' || k === '+') CAM.tz = Math.min(3, CAM.tz * 1.2); if (k === '-') CAM.tz = Math.max(0.2, CAM.tz / 1.2);
  });
  addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { UI.keys = {}; UI.sprayTouch = false; });
  c.addEventListener('wheel', e => { e.preventDefault(); CAM.tz = Math.max(0.2, Math.min(3, CAM.tz * Math.pow(1.0015, -e.deltaY))); }, { passive: false });
  c.addEventListener('contextmenu', e => { e.preventDefault(); if (UI.build >= 0) exitBuild(); });
  // v0.7 单指操作：按住拖动 = 小灯跟随手指；按住不动 = 洒光；轻点 = 查看/瞬移
  c.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && !UI.touch) { UI.touch = true; document.body.classList.add('touch'); }
    AU.init(); c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { downPos = { x: e.clientX, y: e.clientY, t: performance.now(), btn: e.button }; dragMoved = false; if (e.button === 0 && UI.state === 'play') UI.steer = { x: e.clientX, y: e.clientY, mx: e.clientX, my: e.clientY, still: 0, held: 0, wt: s2w(e.clientX, e.clientY) }; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = CAM.tz; dragMoved = true; UI.steer = null; }
  });
  c.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) CAM.tz = CAM.z = Math.max(0.25, Math.min(3, zoom0 * d / pinch0)); return; }
    const st = UI.steer; if (st) { st.x = e.clientX; st.y = e.clientY; if (Math.hypot(st.x - st.mx, st.y - st.my) > 14) { st.mx = st.x; st.my = st.y; st.still = 0; st.wt = s2w(st.x, st.y); } }
    if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 12) dragMoved = true;
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    const quick = downPos && performance.now() - downPos.t < 260;
    if (ptrs.size === 0 && downPos && !dragMoved && quick && downPos.btn === 0 && UI.state === 'play') tap(e.clientX, e.clientY, e.pointerType !== 'mouse');
    if (ptrs.size === 0) { downPos = null; UI.steer = null; }
  };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); downPos = null; UI.steer = null; });
  // 摇杆
  const joy = $('joy'), K = $('joyK');
  joy.addEventListener('pointerdown', e => { e.stopPropagation(); AU.init(); UI.joy.id = e.pointerId; joy.setPointerCapture(e.pointerId); mv(e); });
  const mv = e => { if (UI.joy.id !== e.pointerId) return; const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; } UI.joy.x = dx / m; UI.joy.y = dy / m; K.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener('pointermove', mv);
  const jup = e => { if (UI.joy.id !== e.pointerId) return; UI.joy.id = null; UI.joy.x = UI.joy.y = 0; K.style.transform = ''; };
  joy.addEventListener('pointerup', jup); joy.addEventListener('pointercancel', jup);
  // 洒光按钮（按住）
  const sp = $('spray');
  sp.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); AU.init(); UI.sprayTouch = true; sp.setPointerCapture(e.pointerId); });
  const sup = () => { UI.sprayTouch = false; }; sp.addEventListener('pointerup', sup); sp.addEventListener('pointercancel', sup); sp.addEventListener('lostpointercapture', sup);
  // 坞站 / 卡片 / 按钮
  $('dList').addEventListener('click', onDockClick);
  $('card').addEventListener('click', onCardClick);
  setupDockLongPress(); $('bDex').onclick = openDex; $('bRes').onclick = openResearch; $('cRes').onclick = openResearch; $('bSpeed').onclick = openSpeed; $('bMenu').onclick = openMenu;
  $('tide').onclick = openTide; $('cEco').onclick = () => { openTide(); openPanel('🌊 光域', UI.panel.tabs, UI.panel.renderFn, 1); }; $('cMat').onclick = () => openDex(); $('cTank').onclick = () => toast('🕯️ 按住屏幕不动，就能把光洒在地上');
  $('mm').onclick = () => { CAM.tz = CAM.tz > 0.45 ? 0.3 : 1; };
  $('pClose').onclick = () => { AU.play('click'); closePanel(); };
  $('panel').addEventListener('pointerdown', e => { if (e.target === $('panel')) closePanel(); });
  $('bbCancel').onclick = exitBuild; $('bbRot').onclick = () => { UI.ang += Math.PI / 8; }; $('bbOk').onclick = tryPlace;
  $('offSkip').onclick = () => { offCancel = true; };
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
  if (UI.state !== 'play') { if (UI.state === 'title') { simStep(Math.min(dt, 0.05)); G.events.length = 0; CAM.z += (0.55 - CAM.z) * 0.02; CAM.x = Math.sin(G.t * 0.05) * 60; CAM.y = Math.cos(G.t * 0.04) * 40; render(dt, UI); } return; }
  if ($('offline').classList.contains('show')) return;
  const k = UI.keys, o = G.orb;
  let ix = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + UI.joy.x, iy = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0) + UI.joy.y;
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  let stSpray = false; const st = UI.steer;
  if (st && !UI.panel) {
    st.held += dt; st.still += dt;
    const [tx, ty] = st.wt, dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
    { const vm = Math.min(260, d * 3.2), vx = d > 1 ? dx / d * vm : 0, vy = d > 1 ? dy / d * vm : 0; let ax = (vx - o.vx) / 90, ay = (vy - o.vy) / 90; const al = Math.hypot(ax, ay); if (al > 1) { ax /= al; ay /= al; } if (al > 0.02 || d > 6) { ix += ax || 1e-4; iy += ay || 1e-4; } }
    stSpray = st.held > 0.28 && st.still > 0.28;
    const pr = $('press'), ps = w2s(tx, ty); pr.style.display = 'block'; pr.style.left = ps[0] + 'px'; pr.style.top = ps[1] + 'px'; pr.classList.toggle('on', stSpray); pr.style.setProperty('--p', Math.min(1, st.still / 0.28));
  } else $('press').style.display = 'none';
  { const l2 = Math.hypot(ix, iy); if (l2 > 1) { ix /= l2; iy /= l2; } }
  o.ix = ix; o.iy = iy; o.attract = false; o.spray = !!(k[' '] || UI.sprayTouch || stSpray) && !UI.panel;
  $('spray').classList.toggle('on', o.spray);
  const spd = UI.boostT > 0 ? 4 : 1; if (UI.boostT > 0) UI.boostT -= dt;
  const simDt = dt * spd, n = Math.ceil(simDt / 0.075);
  for (let s = 0; s < n; s++) simStep(simDt / n);
  processEvents();
  if (G._pulse > 0) G._pulse -= dt * 0.6;
  AU.setDrill && AU.ac && AU.setDrill(o.drill);
  CAM.z += (CAM.tz - CAM.z) * Math.min(1, dt * 8); CAM.x = o.x; CAM.y = o.y;
  render(dt, UI);
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; updateHUD(); }
  if (performance.now() - UI.lastSave > 20000) saveGame(true);
}

/* ---------- 流程 ---------- */
function showTitle() {
  UI.state = 'title'; document.body.classList.remove('playing'); Ads.gameplayStop(); $('start').style.display = 'flex';
  const has = !!localStorage.getItem(SAVE_KEY);
  $('bStart').textContent = has ? '继续游戏' : '开始游戏'; $('bNew').style.display = has ? '' : 'none';
  $('startIcons').innerHTML = SPECIES.map((s, i) => `<img src="${speciesIcon(i, 64)}" style="animation-delay:${i * 0.15}s;${G.unlocked.includes(s.key) || i < 2 ? '' : 'filter:brightness(0) opacity(.4)'}">`).join('');
  $('ver').textContent = 'v' + VERSION + (META.bestLv ? ' · 历史最高光域 Lv' + META.bestLv : '');
}
function beginPlay() { $('start').style.display = 'none'; document.body.classList.add('playing'); UI.state = 'play'; last = performance.now(); Ads.gameplayStart(); AU.init(); AU.setOn(META.sound !== false); AU.setMus(META.music !== false); UI.dockSig = ''; updateHUD(); drawMinimap(); }
function startNew() {
  const keep = G.unlocked.slice();
  newGame(); G.unlocked = Array.from(new Set(keep.concat(G.unlocked)));
  clearSel(); exitBuild(); CAM.tz = CAM.z = 1;
  rebuildFloor(); beginPlay(); saveGame(true); toast('🌱 新的夜晚诞生了');
}
function continueGame() {
  const s = loadGame(); if (!s) { startNew(); return; }
  rebuildFloor(); beginPlay(); const away = (Date.now() - s.savedAt) / 1000;
  if (away > 30) runOffline(away);
}
function boot() {
  loadMeta();
  AU.on = META.sound !== false; AU.musOn = META.music !== false;
  initRender($('c')); buildSprites();
  newGame(1); // 标题背景夜晚
  G.unlocked = Array.from(new Set(G.unlocked.concat(META.unlocked || [])));
  for (let k = 0; k < 14; k++) { const s = k % 2, a = k * 0.45, r = 90 + (k % 5) * 30; const i = newC(s, Math.cos(a) * r, Math.sin(a) * r, 12, 0); if (i >= 0) cage[i] = 10; }
  rebuildFloor();
  setupInput(); Ads.init().then(() => Ads.loadingDone());
  $('bStart').onclick = () => { AU.init(); AU.play('click'); if (localStorage.getItem(SAVE_KEY)) continueGame(); else startNew(); };
  $('bNew').onclick = () => { if (confirm('确定开始新的夜晚吗？当前夜晚会被覆盖（解锁的物种保留）。')) { AU.init(); startNew(); } };
  showTitle(); requestAnimationFrame(frame);
}
window.addEventListener('load', boot);
