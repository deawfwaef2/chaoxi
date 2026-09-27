/* ===================== 模拟核心（不依赖 DOM，可在 node 中测试） ===================== */
const rnd = Math.random;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- 能量粒子 SoA（稠密数组，删除时标记 pv=0，步末压缩） ---------- */
const px = new Float32Array(MAXP), py = new Float32Array(MAXP), pvx = new Float32Array(MAXP), pvy = new Float32Array(MAXP);
const pt = new Uint8Array(MAXP), pv = new Uint16Array(MAXP);
let pN = 0;
const pStart = new Int32Array(2 * SNC + 1), pItems = new Int32Array(MAXP), pCur = new Int32Array(2 * SNC), pKey = new Int32Array(MAXP);

/* ---------- 生物 SoA ---------- */
const cx = new Float32Array(MAXC), cy = new Float32Array(MAXC), cvx = new Float32Array(MAXC), cvy = new Float32Array(MAXC);
const cpx = new Float32Array(MAXC), cpy = new Float32Array(MAXC);
const ce = new Int32Array(MAXC), csp = new Uint8Array(MAXC), cage = new Float32Array(MAXC), cmeta = new Float32Array(MAXC);
const cthink = new Float32Array(MAXC), cst = new Uint8Array(MAXC), ctx_ = new Float32Array(MAXC), cty = new Float32Array(MAXC);
const ctg = new Int32Array(MAXC), ctgId = new Uint32Array(MAXC), cid = new Uint32Array(MAXC), crep = new Float32Array(MAXC);
const cph = new Float32Array(MAXC), ctim = new Float32Array(MAXC), cwire = new Float32Array(MAXC), cstas = new Float32Array(MAXC);
const chop = new Float32Array(MAXC), cdead = new Uint8Array(MAXC), cgen = new Uint16Array(MAXC), cmood = new Float32Array(MAXC);
let cN = 0;
const cStart = new Int32Array(SNC + 1), cItems = new Int32Array(MAXC), cCur = new Int32Array(SNC), cKey = new Int32Array(MAXC);
const ST_WANDER = 0, ST_FOOD = 1, ST_HUNT = 2, ST_FLEE = 3, ST_REST = 4, ST_MATE = 5;
const ST_NAME = ['闲逛', '觅食', '追猎', '逃跑', '休息', '求偶'];

/* ---------- 墙体 ---------- */
const whp = new Float32Array(GN * GN), wE = new Uint8Array(GN * GN), wMax = new Float32Array(GN * GN);
const WALL_DIRTY = []; // 变化的格子（渲染层用）

/* ---------- 全局状态 ---------- */
const G = {
  t: 0, lv: 0, maxLv: 0, wt: 0, towerAcc: 0, devAcc: 0, lastScore: 0, lastRaw: 0, lastHarm: 1, lastBreak: null,
  hist: [], popHist: [], total0: 0, wallSealed: 0, nextId: 1, devs: [], devId: 1,
  orb: { x: 0, y: 60, vx: 0, vy: 0, hp: 100, dead: 0, attract: false, drill: 0, ix: 0, iy: 0 },
  spCount: new Int32Array(NS), spAlive: 0, births: 0, deaths: 0, starve: 0, oldDeaths: 0, eaten: 0,
  unlocked: [], won: false, frame: 0, events: [], seed: 1, simSpeed: 1, stasisOn: false,
};
function emit(type, a, b, c) { if (G.events.length < 400) G.events.push({ type, a, b, c }); }

/* ===================== 工具 ===================== */
function gIdx(x, y) { const gx = ((x + HALF) / CELL) | 0, gy = ((y + HALF) / CELL) | 0; if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) return -1; return gy * GN + gx; }
function isWall(x, y) { const i = gIdx(x, y); return i < 0 || whp[i] > 0; }
function sCell(x, y) { let gx = ((x + HALF) / SC) | 0, gy = ((y + HALF) / SC) | 0; if (gx < 0) gx = 0; else if (gx >= SN) gx = SN - 1; if (gy < 0) gy = 0; else if (gy >= SN) gy = SN - 1; return gy * SN + gx; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

/* ===================== 世界生成 ===================== */
function genWorld(seed) {
  G.seed = seed; const R = mulberry32(seed);
  let sealed = 0;
  for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++) {
    const i = gy * GN + gx, x = (gx + 0.5) * CELL - HALF, y = (gy + 0.5) * CELL - HALF;
    const d = Math.hypot(x, y);
    // 轻微扭曲的圆，边缘更自然
    const a = Math.atan2(y, x), wob = Math.sin(a * 5 + 1.3) * 14 + Math.sin(a * 9 + 0.4) * 8;
    if (d > VOID_R) { whp[i] = Infinity; wMax[i] = Infinity; wE[i] = 0; }
    else if (d < START_R + wob) { whp[i] = 0; wMax[i] = 0; wE[i] = 0; }
    else { const h = wallHP(d) * (0.85 + R() * 0.3); whp[i] = h; wMax[i] = h; wE[i] = wallE(d); }
  }
  // 能量矿脉（封存能量 x4）与 隐藏洞穴
  const caves = [];
  for (let k = 0; k < 70; k++) {
    const a = R() * Math.PI * 2, d = 650 + R() * 3600, x = Math.cos(a) * d, y = Math.sin(a) * d, rr = 30 + R() * 70;
    for (let gy = ((y - rr + HALF) / CELL) | 0; gy <= ((y + rr + HALF) / CELL | 0); gy++) for (let gx = ((x - rr + HALF) / CELL) | 0; gx <= ((x + rr + HALF) / CELL | 0); gx++) {
      if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) continue; const i = gy * GN + gx;
      const cxw = (gx + 0.5) * CELL - HALF, cyw = (gy + 0.5) * CELL - HALF;
      if (dist2(cxw, cyw, x, y) < rr * rr && whp[i] > 0 && whp[i] < Infinity) wE[i] = Math.min(250, wE[i] * 4);
    }
  }
  for (let k = 0; k < 26; k++) {
    const a = R() * Math.PI * 2, d = 900 + R() * 3300, x = Math.cos(a) * d, y = Math.sin(a) * d, rr = 60 + R() * 100;
    caves.push({ x, y, r: rr });
    for (let gy = ((y - rr + HALF) / CELL) | 0; gy <= ((y + rr + HALF) / CELL | 0); gy++) for (let gx = ((x - rr + HALF) / CELL) | 0; gx <= ((x + rr + HALF) / CELL | 0); gx++) {
      if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) continue; const i = gy * GN + gx;
      const cxw = (gx + 0.5) * CELL - HALF, cyw = (gy + 0.5) * CELL - HALF;
      if (dist2(cxw, cyw, x, y) < rr * rr && whp[i] < Infinity) { whp[i] = 0; wMax[i] = 0; wE[i] = 0; }
    }
  }
  for (let i = 0; i < GN * GN; i++) if (whp[i] > 0 && whp[i] < Infinity) sealed += wE[i];
  G.wallSealed = sealed;
  pN = 0; cN = 0;
  // 中央能量团（很多粒子聚集）
  for (let k = 0; k < 800; k++) { const a = R() * 6.2832, r = Math.sqrt(-2 * Math.log(R() + 1e-9)) * 70; addP(Math.cos(a) * r, Math.sin(a) * r, 0, 1, 0, 0); }
  // 洞穴里的能量（遗落的光能团）
  for (const c of caves) { const n = Math.floor(20 + Math.hypot(c.x, c.y) / 40); for (let k = 0; k < n; k++) { const a = R() * 6.2832, r = R() * c.r * 0.6; addP(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, R() < 0.8 ? 0 : 1, 1 + (R() * 3 | 0), 0, 0); } }
  G.caves = caves;
  G.total0 = ledger().total;
}

/* ===================== 粒子 ===================== */
function addP(x, y, type, v, vx, vy) {
  if (v <= 0) return;
  if (pN >= MAXP) { // 达到上限：把能量并入一个同类型的随机粒子（守恒）
    for (let tries = 0; tries < 20; tries++) { const j = (rnd() * pN) | 0; if (pt[j] === type && pv[j] > 0 && pv[j] + v < 65000) { pv[j] += v; return; } }
    const j = (rnd() * pN) | 0; if (pv[j] + v < 65000) { pv[j] += v; return; }
  }
  while (v > 60000) { addP(x, y, type, 60000, vx, vy); v -= 60000; }
  px[pN] = x; py[pN] = y; pvx[pN] = vx; pvy[pN] = vy; pt[pN] = type; pv[pN] = v; pN++;
}
function burst(x, y, e, type, spread) { // 把 e 点能量爆成若干粒子
  if (e <= 0) return;
  const n = Math.min(10, e), base = Math.floor(e / n); let rem = e - base * n;
  for (let k = 0; k < n; k++) { const v = base + (rem > 0 ? 1 : 0); if (rem > 0) rem--; const a = rnd() * 6.2832, s = spread * (0.4 + rnd()); addP(x + Math.cos(a) * 3, y + Math.sin(a) * 3, type, v, Math.cos(a) * s, Math.sin(a) * s); }
}
function buildPGrid() {
  pStart.fill(0);
  for (let i = 0; i < pN; i++) { const k = pt[i] * SNC + sCell(px[i], py[i]); pKey[i] = k; pStart[k + 1]++; }
  for (let k = 0; k < 2 * SNC; k++) pStart[k + 1] += pStart[k];
  pCur.set(pStart.subarray(0, 2 * SNC));
  for (let i = 0; i < pN; i++) pItems[pCur[pKey[i]]++] = i;
}
function cellDensity(c) { return pStart[c + 1] - pStart[c] + pStart[SNC + c + 1] - pStart[SNC + c]; }
function compactP() { let j = 0; for (let i = 0; i < pN; i++) { if (pv[i] > 0) { if (i !== j) { px[j] = px[i]; py[j] = py[i]; pvx[j] = pvx[i]; pvy[j] = pvy[i]; pt[j] = pt[i]; pv[j] = pv[i]; } j++; } } pN = j; }

// 环形搜索最近的可食粒子
function findP(x, y, R, mask) {
  const gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; const rings = Math.min(6, Math.ceil(R / SC));
  let best = -1, bd = R * R;
  for (let r = 0; r <= rings; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const gy = gy0 + dy; if (gy < 0 || gy >= SN) continue;
      const edge = (dy === -r || dy === r); const step = edge ? 1 : 2 * r;
      for (let dx = -r; dx <= r; dx += (step || 1)) {
        const gx = gx0 + dx; if (gx < 0 || gx >= SN) continue; const c = gy * SN + gx;
        for (let t = 0; t < 2; t++) {
          if (!(mask & (1 << t))) continue; const k = t * SNC + c; let e = pStart[k + 1], s = pStart[k]; if (e - s > 10) e = s + 10;
          for (let q = s; q < e; q++) { const j = pItems[q]; if (pv[j] === 0) continue; const d = dist2(x, y, px[j], py[j]); if (d < bd) { bd = d; best = j; } }
        }
        if (r === 0) break;
      }
    }
    if (best >= 0 && r >= 1) break;
  }
  return best;
}
// 环形搜索最近的某些物种的生物
function findC(x, y, R, mask, self, pred) {
  const gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; const rings = Math.min(7, Math.ceil(R / SC));
  let best = -1, bd = R * R;
  for (let r = 0; r <= rings; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const gy = gy0 + dy; if (gy < 0 || gy >= SN) continue;
      const edge = (dy === -r || dy === r); const step = edge ? 1 : 2 * r;
      for (let dx = -r; dx <= r; dx += (step || 1)) {
        const gx = gx0 + dx; if (gx < 0 || gx >= SN) continue; const c = gy * SN + gx;
        let e = cStart[c + 1], s = cStart[c]; if (e - s > 14) e = s + 14;
        for (let q = s; q < e; q++) { const j = cItems[q]; if (j === self || cdead[j] || !(mask & (1 << csp[j]))) continue; if (pred && !pred(j)) continue; const d = dist2(x, y, cx[j], cy[j]); if (d < bd) { bd = d; best = j; } }
        if (r === 0) break;
      }
    }
    if (best >= 0 && r >= 1) break;
  }
  return best;
}
function buildCGrid() {
  cStart.fill(0);
  for (let i = 0; i < cN; i++) { const k = sCell(cx[i], cy[i]); cKey[i] = k; cStart[k + 1]++; }
  for (let k = 0; k < SNC; k++) cStart[k + 1] += cStart[k];
  cCur.set(cStart.subarray(0, SNC));
  for (let i = 0; i < cN; i++) cItems[cCur[cKey[i]]++] = i;
}

/* ===================== 生物 ===================== */
function newC(s, x, y, e, gen) {
  if (cN >= MAXC) return -1;
  const i = cN++;
  cx[i] = x; cy[i] = y; cvx[i] = 0; cvy[i] = 0; cpx[i] = x; cpy[i] = y; ce[i] = e; csp[i] = s; cage[i] = 0; cmeta[i] = rnd();
  cthink[i] = rnd() * 0.5; cst[i] = ST_WANDER; ctx_[i] = x; cty[i] = y; ctg[i] = -1; ctgId[i] = 0; cid[i] = G.nextId++;
  crep[i] = SPECIES[s].mature * 0.3; cph[i] = rnd() * 6.28; ctim[i] = 0; cwire[i] = -99; cstas[i] = 0; chop[i] = rnd() * 0.5; cdead[i] = 0; cgen[i] = gen || 0; cmood[i] = 1.2;
  return i;
}
function killC(i, burstIt) {
  if (cdead[i]) return; cdead[i] = 1;
  if (burstIt && ce[i] > 0) burst(cx[i], cy[i], ce[i], 0, 30);
  if (ce[i] > 0 && !burstIt) { /* 能量已被转移（捕食），此处不应有剩余 */ burst(cx[i], cy[i], ce[i], 0, 20); }
  ce[i] = 0; G.deaths++;
}
function compactC() {
  let j = 0;
  for (let i = 0; i < cN; i++) {
    if (!cdead[i]) {
      if (i !== j) {
        cx[j] = cx[i]; cy[j] = cy[i]; cvx[j] = cvx[i]; cvy[j] = cvy[i]; cpx[j] = cpx[i]; cpy[j] = cpy[i]; ce[j] = ce[i]; csp[j] = csp[i]; cage[j] = cage[i]; cmeta[j] = cmeta[i];
        cthink[j] = cthink[i]; cst[j] = cst[i]; ctx_[j] = ctx_[i]; cty[j] = cty[i]; ctg[j] = ctg[i]; ctgId[j] = ctgId[i]; cid[j] = cid[i]; crep[j] = crep[i]; cph[j] = cph[i]; ctim[j] = ctim[i];
        cwire[j] = cwire[i]; cstas[j] = cstas[i]; chop[j] = chop[i]; cdead[j] = 0; cgen[j] = cgen[i]; cmood[j] = cmood[i];
      }
      j++;
    }
  }
  cN = j;
}
function findById(id, hint) { if (hint >= 0 && hint < cN && cid[hint] === id && !cdead[hint]) return hint; for (let i = 0; i < cN; i++) if (cid[i] === id && !cdead[i]) return i; return -1; }

function readyToBreed(j) { const s = csp[j]; return ce[j] >= SPECIES[s].repE && cage[j] >= SPECIES[s].mature && crep[j] <= 0 && cst[j] !== ST_FLEE; }
let _thinkFor = 0;
function isHungryPrey(j) { return true; }

function setWander(i, far) {
  const s = csp[i], sp = SPECIES[s];
  let tx, ty;
  if (sp.mv === MV_ORBIT) {
    const R = 150 + (cid[i] % 9) * 45, a = Math.atan2(cy[i], cx[i]) + 0.5 + rnd() * 0.3; tx = Math.cos(a) * R; ty = Math.sin(a) * R;
  } else {
    const a = rnd() * 6.2832, d = far ? 200 + rnd() * 300 : 50 + rnd() * 140; tx = cx[i] + Math.cos(a) * d; ty = cy[i] + Math.sin(a) * d;
    if (sp.social) { const j = findC(cx[i], cy[i], 120, 1 << s, i, null); if (j >= 0) { tx = (tx + cx[j] * 2) / 3; ty = (ty + cy[j] * 2) / 3; } }
    // 诱导信标
    if (!sp.prey && G.lures) for (const d of G.lures) { if (dist2(cx[i], cy[i], d.x, d.y) < 320 * 320) { tx = d.x + (rnd() - 0.5) * 120; ty = d.y + (rnd() - 0.5) * 120; break; } }
  }
  ctx_[i] = tx; cty[i] = ty; cst[i] = ST_WANDER;
}

function think(i) {
  const s = csp[i], sp = SPECIES[s], x = cx[i], y = cy[i];
  // 1. 躲避捕食者
  if (S_predMask[s]) {
    const j = findC(x, y, sp.sense * 0.7, S_predMask[s], i, null);
    if (j >= 0 && cst[j] === ST_HUNT || j >= 0 && dist2(x, y, cx[j], cy[j]) < 90 * 90) {
      const dx = x - cx[j], dy = y - cy[j], d = Math.hypot(dx, dy) + 1e-3;
      cst[i] = ST_FLEE; ctx_[i] = x + dx / d * 170; cty[i] = y + dy / d * 170; ctim[i] = 1.6; return;
    }
  }
  if (cst[i] === ST_REST && ctim[i] > 0) return;
  // 2. 繁殖
  if (readyToBreed(i)) {
    if (!sp.pair) { reproduce(i, -1); return; }
    const j = findC(x, y, sp.sense, 1 << s, i, readyToBreed);
    if (j >= 0) { cst[i] = ST_MATE; ctg[i] = j; ctgId[i] = cid[j]; ctim[i] = 6; return; }
  }
  // 3. 进食
  const e = ce[i], maxE = sp.maxE;
  if (sp.prey) {
    if (e < maxE * 0.62) {
      const j = findC(x, y, sp.sense, S_preyMask[s], i, null);
      if (j >= 0) { cst[i] = ST_HUNT; ctg[i] = j; ctgId[i] = cid[j]; ctim[i] = 5; return; }
    }
  } else if (e < maxE - 1) {
    const j = findP(x, y, sp.sense, S_eatMask[s]);
    if (j >= 0) { cst[i] = ST_FOOD; ctx_[i] = px[j]; cty[i] = py[j]; ctim[i] = 6; return; }
    if (e < maxE * 0.5) { setWander(i, true); return; }
  }
  // 4. 闲逛
  const dxx = ctx_[i] - x, dyy = cty[i] - y;
  if (cst[i] !== ST_WANDER || dxx * dxx + dyy * dyy < 400 || rnd() < 0.25) setWander(i, false);
}

function reproduce(i, j) {
  const s = csp[i], sp = SPECIES[s];
  if (cN >= MAXC) return;
  let e;
  if (j < 0) { e = sp.childE; if (ce[i] - e < 2) return; ce[i] -= e; }
  else { const a = Math.ceil(sp.childE / 2), b = sp.childE - a; if (ce[i] <= a + 1 || ce[j] <= b + 1) return; ce[i] -= a; ce[j] -= b; e = a + b; crep[j] = sp.mature * 0.6 + rnd() * 10; cmood[j] = 1.5; }
  crep[i] = sp.mature * 0.6 + rnd() * 10; cmood[i] = 1.5;
  const a = rnd() * 6.2832, bx = j < 0 ? cx[i] : (cx[i] + cx[j]) / 2, by = j < 0 ? cy[i] : (cy[i] + cy[j]) / 2;
  let nx = bx + Math.cos(a) * sp.r, ny = by + Math.sin(a) * sp.r; if (isWall(nx, ny)) { nx = bx; ny = by; }
  const k = newC(s, nx, ny, e, (cgen[i] + 1));
  if (k >= 0) { cvx[k] = Math.cos(a) * 60; cvy[k] = Math.sin(a) * 60; cvx[i] -= Math.cos(a) * 30; cvy[i] -= Math.sin(a) * 30; G.births++; onBirth(nx, ny, s); }
  cst[i] = ST_WANDER;
}

function eatNear(i, R) {
  const s = csp[i], mask = S_eatMask[s], maxE = S_maxE[s]; if (!mask) return false;
  const x = cx[i], y = cy[i], gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; let ate = false; const R2 = R * R;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const gx = gx0 + dx, gy = gy0 + dy; if (gx < 0 || gy < 0 || gx >= SN || gy >= SN) continue; const c = gy * SN + gx;
    for (let t = 0; t < 2; t++) {
      if (!(mask & (1 << t))) continue; const k = t * SNC + c; let e = pStart[k + 1], st = pStart[k]; if (e - st > 16) e = st + 16;
      for (let q = st; q < e; q++) {
        const j = pItems[q]; if (pv[j] === 0) continue;
        if (dist2(x, y, px[j], py[j]) < R2) { const take = Math.min(pv[j], maxE - ce[i]); if (take <= 0) return ate; ce[i] += take; pv[j] -= take; ate = true; }
      }
    }
  }
  return ate;
}

function stepC(dt) {
  const t = G.t, orb = G.orb, big = dt > 0.2;
  const loadF = 1 + cN / 6000;
  for (let i = 0; i < cN; i++) {
    if (cdead[i]) continue;
    const s = csp[i], r = S_r[s];
    let ageMul = 1, metaMul = 1;
    if (cstas[i] > 0) { cstas[i] -= dt; ageMul = 0.5; metaMul = 0.7; }
    cage[i] += dt * ageMul;
    const life = S_life[s];
    if (cage[i] > life) { killC(i, true); G.oldDeaths++; emit('death', cx[i], cy[i], s); continue; }
    // 代谢：能量以粒子形式排出（守恒）
    cmeta[i] += S_meta[s] * dt * metaMul;
    if (cmeta[i] >= 1) {
      let k = Math.floor(cmeta[i]); if (k > ce[i]) k = ce[i];
      cmeta[i] -= Math.floor(cmeta[i]);
      if (k > 0) { ce[i] -= k; const a = rnd() * 6.2832; addP(cx[i] - cvx[i] * 0.1 + Math.cos(a) * r * 0.6, cy[i] - cvy[i] * 0.1 + Math.sin(a) * r * 0.6, SPECIES[s].exc, k, Math.cos(a) * 8, Math.sin(a) * 8); }
    }
    if (ce[i] <= 0) { killC(i, false); G.starve++; emit('death', cx[i], cy[i], s); continue; }
    if (crep[i] > 0) crep[i] -= dt;
    if (cmood[i] > 0) cmood[i] -= dt;
    // 思考（分帧）
    cthink[i] -= dt;
    if (cthink[i] <= 0) { think(i); cthink[i] = (0.45 + rnd() * 0.6) * loadF; if (cdead[i]) continue; }
    // 状态行为
    let tx = ctx_[i], ty = cty[i], spMul = 1;
    const st = cst[i];
    if (st === ST_HUNT || st === ST_MATE) {
      const j = ctg[i];
      if (j < 0 || j >= cN || cid[j] !== ctgId[i] || cdead[j]) { cst[i] = ST_WANDER; cthink[i] = 0; }
      else {
        tx = cx[j]; ty = cy[j]; ctim[i] -= dt;
        const rr = r + S_r[csp[j]] + 3, d2 = dist2(cx[i], cy[i], tx, ty), reach = rr + (big ? S_speed[s] * dt : 0);
        if (st === ST_HUNT) {
          spMul = 1.15;
          if (d2 < reach * reach) {
            if (rnd() < (SPECIES[s].bite || 0.5)) { // 捕食成功：能量转移，溢出部分爆回地图
              const pe = ce[j], take = Math.min(pe, S_maxE[s] - ce[i]); ce[i] += take; ce[j] = pe - take;
              if (ce[j] > 0) burst(cx[j], cy[j], ce[j], 0, 25); ce[j] = 0; cdead[j] = 1; G.deaths++; G.eaten++; emit('eaten', cx[j], cy[j], csp[j]);
              cst[i] = ST_REST; ctim[i] = 2.5; cmood[i] = 1.2;
            } else { const dx = cx[j] - cx[i], dy = cy[j] - cy[i], d = Math.hypot(dx, dy) + 1e-3; cvx[j] += dx / d * 120; cvy[j] += dy / d * 120; cst[i] = ST_REST; ctim[i] = 1.6; cst[j] = ST_FLEE; ctx_[j] = cx[j] + dx / d * 160; cty[j] = cy[j] + dy / d * 160; ctim[j] = 1.6; }
          } else if (ctim[i] <= 0) { cst[i] = ST_REST; ctim[i] = 2.5; }
        } else {
          if (d2 < (rr + 6) * (rr + 6) || big && d2 < reach * reach) { if (readyToBreed(i) && readyToBreed(j)) reproduce(i, j); cst[i] = ST_WANDER; cthink[i] = 0.3; }
          else if (ctim[i] <= 0) { cst[i] = ST_WANDER; }
        }
      }
    } else if (st === ST_FLEE) { spMul = 1.4; ctim[i] -= dt; if (ctim[i] <= 0) { cst[i] = ST_WANDER; cthink[i] = 0; } }
    else if (st === ST_REST) { spMul = 0.2; ctim[i] -= dt; if (ctim[i] <= 0) { cst[i] = ST_WANDER; cthink[i] = 0; } }
    else if (st === ST_FOOD) {
      ctim[i] -= dt;
      const d2 = dist2(cx[i], cy[i], tx, ty), reach = r + 6 + (big ? S_speed[s] * dt : 0);
      if (d2 < reach * reach) { if (big) { cx[i] = tx; cy[i] = ty; } eatNear(i, r + 8); cst[i] = ST_WANDER; cthink[i] = 0.05; }
      else if (ctim[i] <= 0) { cst[i] = ST_WANDER; cthink[i] = 0; }
    }
    // 顺路进食
    if (((G.frame + i) & 7) === 0 && ce[i] < S_maxE[s] - 1 && st !== ST_FLEE) eatNear(i, r + 5);
    // 运动
    const mv = S_mv[s];
    let sp = S_speed[s] * spMul; if (cage[i] > life * 0.75) sp *= 0.7;
    let dx = tx - cx[i], dy = ty - cy[i]; const d = Math.hypot(dx, dy);
    if (d > 1e-3) { dx /= d; dy /= d; } else { dx = 0; dy = 0; }
    const arrive = d < 30 ? d / 30 : 1;
    if (mv === MV_HOP) {
      chop[i] -= dt;
      if (chop[i] <= 0 && d > 6) { chop[i] = 0.5 + rnd() * 0.25; cvx[i] = dx * sp * 1.9 * arrive; cvy[i] = dy * sp * 1.9 * arrive; }
      const f = Math.exp(-3.2 * dt); cvx[i] *= f; cvy[i] *= f;
    } else {
      let wx = 0, wy = 0;
      if (mv === MV_FLOAT || mv === MV_ORBIT) { const w = Math.sin(t * 2 + cph[i]) * 0.5; wx = -dy * w; wy = dx * w; }
      else if (mv === MV_FLY) { wx = Math.sin(t * 3.1 + cph[i]) * 0.6; wy = Math.cos(t * 2.3 + cph[i] * 1.7) * 0.6; }
      const dvx = (dx + wx) * sp * arrive, dvy = (dy + wy) * sp * arrive;
      const k = Math.min(1, 3.5 * dt); cvx[i] += (dvx - cvx[i]) * k; cvy[i] += (dvy - cvy[i]) * k;
    }
    // 白球推挤（物理）
    const ox = cx[i] - orb.x, oy = cy[i] - orb.y, od2 = ox * ox + oy * oy, orr = r + 16;
    if (od2 < orr * orr && od2 > 0.01 && !orb.dead) { const od = Math.sqrt(od2); cvx[i] += ox / od * 140; cvy[i] += oy / od * 140; }
    // 碰撞（软体推挤）
    cpx[i] = cx[i]; cpy[i] = cy[i];
    if (!big && ((G.frame + i) & 1) === 0) { // 碰撞隔帧计算（推力加倍）
      const c = sCell(cx[i], cy[i]); const gx0 = c % SN, gy0 = (c / SN) | 0; let checks = 0; const mi = S_mass[s];
      for (let yy = gy0 - 1; yy <= gy0 + 1 && checks < 10; yy++) { if (yy < 0 || yy >= SN) continue; for (let xx = gx0 - 1; xx <= gx0 + 1 && checks < 10; xx++) { if (xx < 0 || xx >= SN) continue; const cc = yy * SN + xx; for (let q = cStart[cc]; q < cStart[cc + 1] && checks < 10; q++) { const j = cItems[q]; if (j === i || cdead[j]) continue; checks++; const rj = S_r[csp[j]], ddx = cx[i] - cx[j], ddy = cy[i] - cy[j], dd2 = ddx * ddx + ddy * ddy, rs = (r + rj) * 0.85; if (dd2 < rs * rs && dd2 > 1e-4) { const dd = Math.sqrt(dd2), push = (rs - dd) * 0.9 * (S_mass[csp[j]] / (mi + S_mass[csp[j]])); cx[i] += ddx / dd * push; cy[i] += ddy / dd * push; } } } }
    }
    // 位移（限制最大位移，离线大步长也稳定）
    let mx = cvx[i] * dt, my = cvy[i] * dt; const md = Math.hypot(mx, my), maxd = (big ? Math.max(sp * dt, 40) : sp * 3 * dt + 4);
    if (md > maxd) { mx *= maxd / md; my *= maxd / md; }
    if (big && d > 0 && md > d) { mx = tx - cx[i]; my = ty - cy[i]; }
    const nx = cx[i] + mx, ny = cy[i] + my;
    if (!isWall(nx + Math.sign(mx) * r * 0.6, ny + Math.sign(my) * r * 0.6)) { cx[i] = nx; cy[i] = ny; }
    else if (!isWall(nx + Math.sign(mx) * r * 0.6, cy[i])) { cx[i] = nx; cvy[i] *= -0.5; }
    else if (!isWall(cx[i], ny + Math.sign(my) * r * 0.6)) { cy[i] = ny; cvx[i] *= -0.5; }
    else { cvx[i] *= -0.5; cvy[i] *= -0.5; if (cst[i] === ST_WANDER || cst[i] === ST_FOOD) { ctx_[i] = cx[i] * 0.7; cty[i] = cy[i] * 0.7; cst[i] = ST_WANDER; } }
    if (isWall(cx[i], cy[i])) { // 卡墙：往中心挪
      const d0 = Math.hypot(cx[i], cy[i]) + 1e-3; cx[i] -= cx[i] / d0 * 6; cy[i] -= cy[i] / d0 * 6;
    }
    cph[i] += dt * (3 + Math.hypot(cvx[i], cvy[i]) * 0.05);
  }
}

/* ===================== 粒子运动：密度扩散（能量只能“聚集”不能“聚团”）+ 吸引 ===================== */
function stepP(dt) {
  const orb = G.orb, att = orb.attract && !orb.dead, ox = orb.x, oy = orb.y, AR = 190 * 190;
  const damp = Math.exp(-2.2 * dt), K = 0.55, big = dt > 0.2;
  const TP2 = TOWER_PULL * TOWER_PULL;
  for (let i = 0; i < pN; i++) {
    if (pv[i] === 0) continue;
    let x = px[i], y = py[i], vx = pvx[i], vy = pvy[i];
    const gx = ((x + HALF) / SC) | 0, gy = ((y + HALF) / SC) | 0;
    if (gx > 0 && gy > 0 && gx < SN - 1 && gy < SN - 1) {
      const c = gy * SN + gx, dc = cellDensity(c);
      if (dc > 10) {
        const fx = cellDensity(c - 1) - cellDensity(c + 1), fy = cellDensity(c - SN) - cellDensity(c + SN);
        vx += fx * K * dt + (rnd() - 0.5) * 6 * dt * 10; vy += fy * K * dt + (rnd() - 0.5) * 6 * dt * 10;
      }
    }
    // 方塔微弱引力：保持中央能量团“聚集”
    if (pt[i] === 0) { const d2 = x * x + y * y; if (d2 < TP2 && d2 > 3600) { const d = Math.sqrt(d2); vx -= x / d * 3 * dt; vy -= y / d * 3 * dt; } }
    if (att) { const dx = ox - x, dy = oy - y, d2 = dx * dx + dy * dy; if (d2 < AR && d2 > 100) { const d = Math.sqrt(d2), f = 160 * dt / (0.3 + d / 190); vx += dx / d * f; vy += dy / d * f; } }
    vx *= damp; vy *= damp;
    if (big) { const sp = Math.hypot(vx, vy); if (sp > 40) { vx *= 40 / sp; vy *= 40 / sp; } }
    const nx = x + vx * dt, ny = y + vy * dt;
    if (vx !== 0 || vy !== 0) {
      if (!isWall(nx, ny)) { px[i] = nx; py[i] = ny; }
      else { vx = -vx * 0.4; vy = -vy * 0.4; if (isWall(x, y)) { const d = Math.hypot(x, y) + 1e-3; px[i] = x - x / d * 4; py[i] = y - y / d * 4; } }
    }
    pvx[i] = vx; pvy[i] = vy;
  }
  // 自然回归：余烬极其缓慢地自发变回光能（半衰期约 15 分钟），避免永久死局
  const conv = Math.min(1, dt / 1300) * pN; let n = Math.floor(conv) + (rnd() < conv - Math.floor(conv) ? 1 : 0);
  while (n-- > 0 && pN > 0) { const j = (rnd() * pN) | 0; if (pt[j] === 1) pt[j] = 0; }
}

/* ===================== 墙体与白球 ===================== */
function breakCell(i) {
  if (whp[i] <= 0 || whp[i] === Infinity) return;
  whp[i] = 0; const gx = i % GN, gy = (i / GN) | 0, x = (gx + 0.5) * CELL - HALF, y = (gy + 0.5) * CELL - HALF;
  const e = wE[i]; wE[i] = 0; G.wallSealed -= e;
  if (e > 0) burst(x, y, e, 0, 20);
  WALL_DIRTY.push(i); emit('wallbreak', x, y, e);
}
function orbDPS() { return 10 * (1 + 0.4 * G.lv) + 3 * G.maxLv; }
function stepOrb(dt) {
  const o = G.orb;
  if (o.dead > 0) { o.dead -= dt; if (o.dead <= 0) { o.dead = 0; o.x = 0; o.y = 70; o.vx = o.vy = 0; o.hp = 100; emit('respawn'); } return; }
  const acc = 900, maxs = 260;
  o.vx += o.ix * acc * dt; o.vy += o.iy * acc * dt;
  const f = Math.exp(-6 * dt); if (!o.ix) o.vx *= f; if (!o.iy) o.vy *= f;
  const s = Math.hypot(o.vx, o.vy); if (s > maxs) { o.vx *= maxs / s; o.vy *= maxs / s; }
  const R = 14;
  let nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
  // 圆 vs 墙格 碰撞 + 消融
  o.drill = 0; let touching = 0;
  const g0x = ((nx - R - 6 + HALF) / CELL) | 0, g1x = ((nx + R + 6 + HALF) / CELL) | 0, g0y = ((ny - R - 6 + HALF) / CELL) | 0, g1y = ((ny + R + 6 + HALF) / CELL) | 0;
  const dps = orbDPS();
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
    if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) continue; const i = gy * GN + gx; if (whp[i] <= 0) continue;
    const x0 = gx * CELL - HALF, y0 = gy * CELL - HALF;
    const qx = Math.max(x0, Math.min(nx, x0 + CELL)), qy = Math.max(y0, Math.min(ny, y0 + CELL));
    const dx = nx - qx, dy = ny - qy, d2 = dx * dx + dy * dy;
    if (d2 < (R + 4) * (R + 4)) {
      if (whp[i] !== Infinity && (o.ix || o.iy || o.push)) { whp[i] -= dps * dt; touching++; if (whp[i] <= 0) breakCell(i); else if ((G.frame & 3) === 0) WALL_DIRTY.push(i); }
    }
    if (whp[i] > 0 && d2 < R * R) { // 推出
      const d = Math.sqrt(d2) || 0.01; const push = R - d; if (d2 > 1e-6) { nx += dx / d * push; ny += dy / d * push; } else { nx -= o.vx * dt; ny -= o.vy * dt; }
    }
  }
  if (touching) {
    const d = Math.hypot(nx, ny); o.hp -= (1.5 + d / 500) * dt; o.drill = 1;
    if (o.hp <= 0) { o.hp = 0; o.dead = 2.5; emit('orbdie', o.x, o.y); return; }
  } else o.hp = Math.min(100, o.hp + 7 * dt);
  if (isWall(nx, ny)) { nx = o.x; ny = o.y; o.vx *= 0.3; o.vy *= 0.3; }
  o.x = nx; o.y = ny;
}
// 瞬移：目标若在墙里，沿直线找到最后一个空地
function teleportOrb(tx, ty) {
  const o = G.orb; if (o.dead) return false;
  let x = o.x, y = o.y; const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy); const n = Math.ceil(d / 8);
  let lx = x, ly = y;
  if (!isWall(tx, ty) && d < 6000) { // 目标是空地：可直接瞬移（哪怕中间隔着墙也不行——需要可达）
    for (let k = 1; k <= n; k++) { const qx = x + dx * k / n, qy = y + dy * k / n; if (isWall(qx, qy)) { lx = null; break; } }
    if (lx !== null) { o.x = tx; o.y = ty; o.vx = o.vy = 0; emit('tp', x, y); return true; }
  }
  lx = x; ly = y;
  for (let k = 1; k <= n; k++) { const qx = x + dx * k / n, qy = y + dy * k / n; if (isWall(qx, qy)) break; lx = qx; ly = qy; }
  // 离墙留出身位
  const back = Math.min(16, Math.hypot(lx - x, ly - y)); if (d > 0) { lx -= dx / d * back; ly -= dy / d * back; }
  if (Math.hypot(lx - x, ly - y) < 4) return false;
  o.x = lx; o.y = ly; o.vx = dx / d * 60; o.vy = dy / d * 60; emit('tp', x, y); return true;
}

/* ===================== 观测者装置 ===================== */
function devDef(d) { return DEVICES[d.type]; }
function devActive(d) { return d.bt <= 0 && d.powered && G.lv >= 1; }
function recomputePower() {
  const pylons = G.devs.filter(d => d.type === D_PYLON);
  for (const p of pylons) p.conn = false;
  const q = [];
  for (const p of pylons) if (p.bt <= 0 && Math.hypot(p.x, p.y) <= TOWER_FIELD) { p.conn = true; q.push(p); }
  while (q.length) { const a = q.pop(); for (const p of pylons) if (!p.conn && p.bt <= 0 && dist2(a.x, a.y, p.x, p.y) <= PYLON_FIELD * PYLON_FIELD) { p.conn = true; q.push(p); } }
  for (const d of G.devs) d.powered = inField(d.x, d.y, d);
  // 透镜倍率
  const lenses = G.devs.filter(d => d.type === DV_IDX.lens && d.bt <= 0);
  for (const d of G.devs) { d.mult = 1; for (const l of lenses) if (l !== d && dist2(l.x, l.y, d.x, d.y) < 260 * 260) d.mult *= 1.3; }
  G.lures = G.devs.filter(d => d.type === DV_IDX.lure && devActive(d));
}
function inField(x, y, except) {
  if (x * x + y * y <= TOWER_FIELD * TOWER_FIELD) return true;
  for (const p of G.devs) if (p.type === D_PYLON && p !== except && p.conn && p.bt <= 0 && dist2(x, y, p.x, p.y) <= PYLON_FIELD * PYLON_FIELD) return true;
  return false;
}
function capUsed() { let s = 0; for (const d of G.devs) s += DEVICES[d.type].cost; return s; }
function canPlace(type, x, y) {
  const def = DEVICES[type];
  if (def.unlock > G.lv && !G.unlocked.includes('d' + type)) return '需要潮汐 Lv.' + def.unlock;
  if (capUsed() + def.cost > buildCap(G.lv)) return '建造额度不足（提升潮汐等级可增加）';
  if (x * x + y * y < 80 * 80) return '离方塔太近';
  if (!inField(x, y, null)) return '必须建在能量场内（先铺设导能塔）';
  for (let a = 0; a < 6.28; a += 1.05) if (isWall(x + Math.cos(a) * 14, y + Math.sin(a) * 14)) return '这里被黑墙挡住了';
  if (isWall(x, y)) return '这里被黑墙挡住了';
  for (const d of G.devs) if (dist2(d.x, d.y, x, y) < 40 * 40) return '离其他装置太近';
  return '';
}
function placeDev(type, x, y, ang) {
  const def = DEVICES[type];
  const d = { id: G.devId++, type, x, y, ang: ang || 0, bt: def.time, bt0: def.time, powered: true, acc: 0, lastAcc: 0, tt: rnd(), conn: false, mult: 1, n: 0 };
  G.devs.push(d); recomputePower(); emit('place', x, y, type); return d;
}
function removeDev(d) { const k = G.devs.indexOf(d); if (k >= 0) G.devs.splice(k, 1); recomputePower(); }

function onBirth(x, y, s) {
  emit('birth', x, y, s);
  if (G.lv < 1) return;
  for (const d of G.devs) if (d.type === DV_IDX.bell && devActive(d) && dist2(d.x, d.y, x, y) < 200 * 200) { const v = 1.5 * d.mult; d.acc += v; G.devAcc += v; emit('tidegain', d.x, d.y, v); }
}
function countInR(x, y, R, fn) {
  const g0x = Math.max(0, ((x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((x + R + HALF) / SC) | 0), g0y = Math.max(0, ((y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((y + R + HALF) / SC) | 0);
  const R2 = R * R;
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const c = gy * SN + gx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (cdead[j]) continue; if (dist2(x, y, cx[j], cy[j]) < R2) fn(j); } }
}
function segCross(ax, ay, bx, by, p0x, p0y, p1x, p1y) { // 线段 p0p1 是否穿过 ab
  const s0 = (bx - ax) * (p0y - ay) - (by - ay) * (p0x - ax), s1 = (bx - ax) * (p1y - ay) - (by - ay) * (p1x - ax);
  if ((s0 > 0) === (s1 > 0) || s0 === 0 && s1 === 0) return false;
  const t0 = (p1x - p0x) * (ay - p0y) - (p1y - p0y) * (ax - p0x), t1 = (p1x - p0x) * (by - p0y) - (p1y - p0y) * (bx - p0x);
  return (t0 > 0) !== (t1 > 0);
}
function segEnds(d) { const L = (DEVICES[d.type].len || 200) / 2, c = Math.cos(d.ang), s = Math.sin(d.ang); return [d.x - c * L, d.y - s * L, d.x + c * L, d.y + s * L]; }

function stepDevs(dt) {
  let powerDirty = false;
  for (const d of G.devs) {
    if (d.bt > 0) { d.bt -= dt; if (d.bt <= 0) { d.bt = 0; emit('built', d.x, d.y, d.type); if (d.type === D_PYLON || d.type === DV_IDX.lens || d.type === DV_IDX.lure) powerDirty = true; } continue; }
  }
  if (powerDirty) recomputePower();
  if (G.lv < 1) return; // 潮汐归零：所有装置停机（遗迹）
  for (const d of G.devs) {
    if (!devActive(d)) continue;
    const def = DEVICES[d.type], key = def.key; d.tt += dt;
    if (key === 'census' || key === 'prism' || key === 'elder' || key === 'ark') {
      if (d.tt >= 1) {
        const k = Math.floor(d.tt); d.tt -= k; let v = 0;
        if (key === 'census') { let n = 0; countInR(d.x, d.y, def.r, () => n++); d.n = n; v = n * 0.01 * k; }
        else if (key === 'prism' || key === 'ark') { let m = 0; countInR(d.x, d.y, def.r, j => { m |= 1 << csp[j]; }); let n = 0; while (m) { n += m & 1; m >>>= 1; } d.n = n; v = key === 'prism' ? n * 0.15 * k : (n >= 6 ? 0.6 * k : 0); }
        else { let n = 0; countInR(d.x, d.y, def.r, j => { if (cage[j] > S_life[csp[j]] * 0.6) n++; }); d.n = n; v = n * 0.03 * k; }
        v *= d.mult; d.acc += v; G.devAcc += v;
      }
    } else if (key === 'wire') {
      const [ax, ay, bx, by] = segEnds(d);
      const g0x = Math.max(0, ((Math.min(ax, bx) - 20 + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((Math.max(ax, bx) + 20 + HALF) / SC) | 0), g0y = Math.max(0, ((Math.min(ay, by) - 20 + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((Math.max(ay, by) + 20 + HALF) / SC) | 0);
      for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const c = gy * SN + gx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (j >= cN || cdead[j]) continue; if (G.t - cwire[j] > 4 && segCross(ax, ay, bx, by, cpx[j], cpy[j], cx[j], cy[j])) { cwire[j] = G.t; const v = 0.5 * d.mult; d.acc += v; G.devAcc += v; d.flash = 0.4; emit('tidegain', cx[j], cy[j], v); } } }
    } else if (key === 'barrier') {
      const [ax, ay, bx, by] = segEnds(d);
      const g0x = Math.max(0, ((Math.min(ax, bx) - 20 + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((Math.max(ax, bx) + 20 + HALF) / SC) | 0), g0y = Math.max(0, ((Math.min(ay, by) - 20 + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((Math.max(ay, by) + 20 + HALF) / SC) | 0);
      for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const c = gy * SN + gx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (j >= cN || cdead[j] || !S_preyMask[csp[j]]) continue; if (segCross(ax, ay, bx, by, cpx[j], cpy[j], cx[j], cy[j])) { cx[j] = cpx[j]; cy[j] = cpy[j]; cvx[j] *= -1; cvy[j] *= -1; d.flash = 0.3; if (cst[j] === ST_HUNT) { cst[j] = ST_REST; ctim[j] = 1; } } } }
    } else if (key === 'conv') {
      if (d.tt >= 0.5) {
        d.tt -= 0.5; let budget = 1; const R = def.r;
        const g0x = Math.max(0, ((d.x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((d.x + R + HALF) / SC) | 0), g0y = Math.max(0, ((d.y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((d.y + R + HALF) / SC) | 0);
        outer: for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const k = SNC + gy * SN + gx; for (let q = pStart[k]; q < pStart[k + 1]; q++) { const j = pItems[q]; if (pv[j] === 0 || pt[j] !== 1) continue; if (dist2(d.x, d.y, px[j], py[j]) > R * R) continue; pt[j] = 0; budget -= pv[j]; d.n = (d.n || 0) + pv[j]; if (budget <= 0) break outer; } }
      }
    } else if (key === 'well') {
      const R = def.r;
      const g0x = Math.max(0, ((d.x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((d.x + R + HALF) / SC) | 0), g0y = Math.max(0, ((d.y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((d.y + R + HALF) / SC) | 0);
      for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const k = gy * SN + gx; for (let q = pStart[k]; q < pStart[k + 1]; q++) { const j = pItems[q]; const dx = d.x - px[j], dy = d.y - py[j], d2 = dx * dx + dy * dy; if (d2 > R * R || d2 < 50 * 50) continue; const dd = Math.sqrt(d2); pvx[j] += dx / dd * 14 * dt; pvy[j] += dy / dd * 14 * dt; } }
    } else if (key === 'stasis') {
      if (d.tt >= 0.5) { d.tt -= 0.5; let n = 0; countInR(d.x, d.y, def.r, j => { cstas[j] = 0.7; n++; }); d.n = n; }
    }
  }
}
function chronBonus() {
  const h = G.popHist; if (h.length < 6) return 0;
  const last = h.slice(-6); const mx = Math.max(...last), mn = Math.min(...last); if (mx < 30) return 0;
  const v = (mx - mn) / mx; return Math.max(0, 14 * (1 - v / 0.2));
}

/* ===================== 潮汐结算 ===================== */
function settle() {
  // 物种多样性（Shannon 有效物种数）
  let N = 0, H = 0; for (let s = 0; s < NS; s++) N += G.spCount[s];
  if (N > 0) for (let s = 0; s < NS; s++) { const p = G.spCount[s] / N; if (p > 0) H -= p * Math.log(p); }
  const eff = N > 0 ? Math.exp(H) : 0, harm = Math.min(3.5, 0.5 + 0.25 * eff);
  G.popHist.push(N); if (G.popHist.length > 60) G.popHist.shift();
  let chron = 0;
  if (G.lv >= 1) for (const d of G.devs) if (d.type === DV_IDX.chron && devActive(d)) { const v = chronBonus() * d.mult; d.acc += v; chron += v; }
  const raw = G.towerAcc + G.devAcc + chron, score = raw * harm;
  const prevLv = G.lv;
  let L = 0; for (let k = MAXLV; k >= 0; k--) if (score >= THRESH[k]) { L = k; break; }
  if (L > G.lv) G.lv = L; else if (L < G.lv) G.lv = G.lv - 1;
  const br = { tower: G.towerAcc, dev: G.devAcc + chron, harm, eff, score, pop: N, species: G.spAlive, devs: [] };
  for (const d of G.devs) { d.lastAcc = d.acc; d.acc = 0; }
  G.lastScore = score; G.lastRaw = raw; G.lastHarm = harm; G.lastBreak = br;
  G.hist.push({ t: G.t, s: score, lv: G.lv, pop: N }); if (G.hist.length > 120) G.hist.shift();
  G.towerAcc = 0; G.devAcc = 0;
  if (G.lv > G.maxLv) G.maxLv = G.lv;
  if (G.lv !== prevLv) { recomputePower(); emit('lv', G.lv, prevLv); }
  unlockUpTo(G.lv);
  emit('settle', score, G.lv, prevLv);
  if (G.lv >= MAXLV && !G.won) { G.won = true; emit('win'); }
}
function unlockUpTo(lv) {
  for (const s of SPECIES) if (s.unlock <= lv && !G.unlocked.includes(s.key)) { G.unlocked.push(s.key); emit('unlock', 's', s.id); }
  for (const d of DEVICES) if (d.unlock <= lv && !G.unlocked.includes('d' + d.id)) { G.unlocked.push('d' + d.id); emit('unlock', 'd', d.id); }
}

/* ===================== 召唤（消耗方塔/孵化巢附近的光能，守恒） ===================== */
function gatherLight(x, y, R, need, dry) {
  const g0x = Math.max(0, ((x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((x + R + HALF) / SC) | 0), g0y = Math.max(0, ((y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((y + R + HALF) / SC) | 0);
  let got = 0; const R2 = R * R; const list = [];
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const k = gy * SN + gx; for (let q = pStart[k]; q < pStart[k + 1]; q++) { const j = pItems[q]; if (pv[j] === 0 || dist2(x, y, px[j], py[j]) > R2) continue; got += pv[j]; list.push(j); if (!dry && got >= need) break; } if (!dry && got >= need) break; }
  if (dry) return got;
  if (got < need) return 0;
  let rem = need; for (const j of list) { const take = Math.min(pv[j], rem); pv[j] -= take; rem -= take; if (rem <= 0) break; }
  return need;
}
function summon(s, at) {
  const sp = SPECIES[s]; const x0 = at ? at.x : 0, y0 = at ? at.y : 0, R = at ? 160 : TOWER_PULL;
  if (!G.unlocked.includes(sp.key)) return '尚未解锁';
  if (cN >= MAXC) return '生物数量已达上限';
  buildPGrid();
  if (gatherLight(x0, y0, R, sp.cost, false) < sp.cost) return (at ? '孵化巢' : '方塔') + '附近光能不足（需要 ' + sp.cost + '）';
  const a = rnd() * 6.2832, rr = at ? 30 : TOWER_R + 30;
  let x = x0 + Math.cos(a) * rr, y = y0 + Math.sin(a) * rr; if (isWall(x, y)) { x = x0; y = y0; }
  const i = newC(s, x, y, sp.cost, 0); cage[i] = sp.mature * 0.5; cvx[i] = Math.cos(a) * 80; cvy[i] = Math.sin(a) * 80;
  compactP(); G.summons = (G.summons || 0) + 1; emit('summon', x, y, s);
  return '';
}

/* ===================== 能量账本 ===================== */
function ledger() {
  let l = 0, e = 0, c = 0;
  for (let i = 0; i < pN; i++) { if (pt[i] === 0) l += pv[i]; else e += pv[i]; }
  for (let i = 0; i < cN; i++) if (!cdead[i]) c += ce[i];
  return { light: l, ember: e, bio: c, sealed: G.wallSealed, total: l + e + c + G.wallSealed };
}

/* ===================== 主步进 ===================== */
function simStep(dt) {
  G.frame++;
  buildPGrid(); buildCGrid();
  stepDevs(dt);
  stepC(dt);
  stepP(dt);
  stepOrb(dt);
  compactP(); compactC();
  // 物种计数 + 塔基础潮汐
  G.spCount.fill(0); for (let i = 0; i < cN; i++) G.spCount[csp[i]]++;
  let alive = 0; for (let s = 0; s < NS; s++) if (G.spCount[s] > 0) alive++;
  if (alive < G.spAlive) for (let s = 0; s < NS; s++) if (G.spCount[s] === 0 && G._lastCount && G._lastCount[s] > 0) emit('extinct', s);
  G._lastCount = G._lastCount || new Int32Array(NS); G._lastCount.set(G.spCount);
  G.spAlive = alive;
  G.towerAcc += (0.1 * alive + 0.001 * Math.min(cN, 3000)) * dt;
  G.t += dt; G.wt += dt;
  if (G.wt >= WINDOW) { G.wt -= WINDOW; settle(); }
}

function newGame(seed) {
  G.t = 0; G.lv = 0; G.wt = 0; G.towerAcc = 0; G.devAcc = 0; G.lastScore = 0; G.hist = []; G.popHist = []; G.devs = []; G.devId = 1; G.nextId = 1;
  G.births = 0; G.deaths = 0; G.starve = 0; G.oldDeaths = 0; G.eaten = 0; G.won = false; G.summons = 0; G.lastBreak = null;
  G.orb.x = 0; G.orb.y = 70; G.orb.vx = G.orb.vy = 0; G.orb.hp = 100; G.orb.dead = 0;
  genWorld(seed || ((Math.random() * 1e9) | 0));
  unlockUpTo(0);
  recomputePower();
}
