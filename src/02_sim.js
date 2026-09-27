/* ===================== 模拟核心 v0.5（不依赖 DOM，可在 node 中测试） ===================== */
const rnd = Math.random;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- 能量粒子 SoA：pr = 凝结度 0..255（255 才能被吃） ---------- */
const px = new Float32Array(MAXP), py = new Float32Array(MAXP), pvx = new Float32Array(MAXP), pvy = new Float32Array(MAXP);
const pr = new Uint8Array(MAXP), pv = new Uint16Array(MAXP);
let pN = 0;
// 空间网格按“是否已凝结”分两个桶：桶 1 = 可吃
const pStart = new Int32Array(2 * SNC + 1), pItems = new Int32Array(MAXP), pCur = new Int32Array(2 * SNC), pKey = new Int32Array(MAXP);

/* ---------- 生物 SoA ---------- */
const cx = new Float32Array(MAXC), cy = new Float32Array(MAXC), cvx = new Float32Array(MAXC), cvy = new Float32Array(MAXC);
const cpx = new Float32Array(MAXC), cpy = new Float32Array(MAXC);
const ce = new Int32Array(MAXC), csp = new Uint8Array(MAXC), cage = new Float32Array(MAXC), cmeta = new Float32Array(MAXC);
const cthink = new Float32Array(MAXC), cst = new Uint8Array(MAXC), ctx_ = new Float32Array(MAXC), cty = new Float32Array(MAXC);
const ctg = new Int32Array(MAXC), ctgId = new Uint32Array(MAXC), cid = new Uint32Array(MAXC), crep = new Float32Array(MAXC);
const cph = new Float32Array(MAXC), ctim = new Float32Array(MAXC), cwire = new Float32Array(MAXC), cstas = new Float32Array(MAXC);
const chop = new Float32Array(MAXC), cdead = new Uint8Array(MAXC), cgen = new Uint16Array(MAXC), cmood = new Float32Array(MAXC);
const cg = new Float32Array(MAXC), ckin = new Uint8Array(MAXC), cfc = new Float32Array(MAXC), cang = new Float32Array(MAXC), cmt = new Float32Array(MAXC);
const cflag = new Uint8Array(MAXC), cdr = new Float32Array(MAXC); // cflag bit0 = 已涅槃；cdr = 汲取/祝福计时
/* ---------- 光灵（环境中的白色能量球）SoA ---------- */
const wx = new Float32Array(MAXW), wy = new Float32Array(MAXW), wvx = new Float32Array(MAXW), wvy = new Float32Array(MAXW), wval = new Uint8Array(MAXW), wage = new Float32Array(MAXW), wph = new Float32Array(MAXW), wtg = new Int16Array(MAXW);
let wN = 0;
/* ---------- 物质结晶 SoA ---------- */
const mx = new Float32Array(MAXM), my = new Float32Array(MAXM), mvx = new Float32Array(MAXM), mvy = new Float32Array(MAXM), mval = new Uint16Array(MAXM), mage = new Float32Array(MAXM);
let mN = 0;
let cN = 0;
const cStart = new Int32Array(SNC + 1), cItems = new Int32Array(MAXC), cCur = new Int32Array(SNC), cKey = new Int32Array(MAXC);
const ST_WANDER = 0, ST_FOOD = 1, ST_HUNT = 2, ST_FLEE = 3, ST_REST = 4, ST_MATE = 5, ST_FIGHT = 6;
const ST_NAME = ['闲逛', '觅食', '追猎', '逃跑', '休息', '求偶', '驱赶'];

/* ---------- 墙体 ---------- */
const whp = new Float32Array(GN * GN), wE = new Uint8Array(GN * GN), wMax = new Float32Array(GN * GN), seen = new Uint8Array(GN * GN);
const WALL_DIRTY = [];

/* ---------- 全局状态 ---------- */
const G = {
  t: 0, lv: 0, maxLv: 0, wt: 0, towerAcc: 0, devAcc: 0, lastScore: 0, lastRaw: 0, lastHarm: 1, lastBreak: null,
  hist: [], popHist: [], total0: 0, wallSealed: 0, nextId: 1, devs: [], devId: 1,
  orb: { x: 0, y: 60, vx: 0, vy: 0, hp: 100, dead: 0, attract: false, spray: false, drill: 0, ix: 0, iy: 0, tank: 60, sprAcc: 0, absorbed: 0 },
  rp: 0, resT: '', rpRate: 0, wAcc: 0, expR: START_R,
  matter: 0, pois: [], flow: { spray: 0, gen: 0, burn: 0, mat: 0 }, flowWin: { inE: 0, burn: 0, mat: 0 }, lastFlow: { inE: 0, burn: 0, mat: 0 },
  spCount: new Int32Array(NS), spAlive: 0, births: 0, deaths: 0, starve: 0, oldDeaths: 0, eaten: 0, fights: 0,
  unlocked: [], won: false, frame: 0, events: [], seed: 1, sancts: [], arenas: [], lures: [], catchers: [], suns: [], labs: [], nurs: [], cols: [], relays: [], open: 1, open0: 0, kMul: 1,
};
function emit(type, a, b, c, d) { if (G.events.length < 500) G.events.push({ type, a, b, c, d }); }

/* ===================== 工具 ===================== */
function gIdx(x, y) { const gx = ((x + HALF) / CELL) | 0, gy = ((y + HALF) / CELL) | 0; if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) return -1; return gy * GN + gx; }
function isWall(x, y) { const i = gIdx(x, y); return i < 0 || whp[i] > 0; }
function sCell(x, y) { let gx = ((x + HALF) / SC) | 0, gy = ((y + HALF) / SC) | 0; if (gx < 0) gx = 0; else if (gx >= SN) gx = SN - 1; if (gy < 0) gy = 0; else if (gy >= SN) gy = SN - 1; return gy * SN + gx; }
// 卡进墙里时：移到最近的开阔格（不会“穿墙”跑到别处）
function unstick(x, y) {
  const gx = ((x + HALF) / CELL) | 0, gy = ((y + HALF) / CELL) | 0; let best = null, bd = 1e18;
  for (let r = 1; r <= 3 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN || whp[ny * GN + nx] > 0) continue;
    const wx = (nx + 0.5) * CELL - HALF, wy = (ny + 0.5) * CELL - HALF, d = dist2(x, y, wx, wy); if (d < bd) { bd = d; best = [wx, wy]; }
  }
  return best;
}
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

/* ===================== 世界生成 ===================== */
function genWorld(seed) {
  G.seed = seed; const R = mulberry32(seed);
  for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++) {
    const i = gy * GN + gx, x = (gx + 0.5) * CELL - HALF, y = (gy + 0.5) * CELL - HALF;
    const d = Math.hypot(x, y), a = Math.atan2(y, x), wob = Math.sin(a * 5 + 1.3) * 14 + Math.sin(a * 9 + 0.4) * 8;
    if (d > VOID_R) { whp[i] = Infinity; wMax[i] = Infinity; wE[i] = 0; }
    else if (d < START_R + wob) { whp[i] = 0; wMax[i] = 0; wE[i] = 0; }
    else { const h = wallHP(d) * (0.85 + R() * 0.3); whp[i] = h; wMax[i] = h; wE[i] = wallE(d); }
  }
  for (let i = 0; i < GN * GN; i++) wE[i] = 0; // v0.5：墙里没有能量（能量不可再生）
  // 特殊地点：藏在黑墙里的遗迹 / 能量洞（彼此保持距离）
  const pois = [], plan = [['cave', 11, 800, 3800], ['crystal', 6, 700, 2400], ['pod', 5, 800, 2600], ['reactor', 4, 1000, 3200], ['relay', 4, 900, 3000], ['obelisk', 3, 1500, 3700]];
  for (const [key, n, d0, d1] of plan) for (let k = 0; k < n; k++) {
    for (let tries = 0; tries < 40; tries++) {
      const a = R() * Math.PI * 2, d = d0 + R() * (d1 - d0), x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (pois.some(q => dist2(q.x, q.y, x, y) < 380 * 380)) continue;
      const rr = key === 'cave' ? 70 + R() * 80 : key === 'reactor' || key === 'obelisk' ? 80 : 62;
      pois.push({ type: POI_IDX[key], x, y, r: rr, found: false, used: false, on: false, acc: 0, amt: 0, sp: -1 }); break;
    }
  }
  for (const q of pois) forCells(q.x, q.y, q.r, i => { if (whp[i] < Infinity) { whp[i] = 0; wMax[i] = 0; } });
  G.wallSealed = 0; pN = 0; cN = 0; mN = 0;
  for (let k = 0; k < 500; k++) { const a = R() * 6.2832, r = Math.sqrt(-2 * Math.log(R() + 1e-9)) * 90; addP(Math.cos(a) * r, Math.sin(a) * r, 1, 0, 0, 255); }
  for (const q of pois) {
    const key = POI[q.type].key, dd = Math.hypot(q.x, q.y);
    if (key === 'cave') { const tot = Math.round(300 + dd * 0.35 + R() * 400); q.amt = tot; let rem = tot; while (rem > 0) { const v = Math.min(rem, 1 + (R() * 4 | 0)); rem -= v; const a = R() * 6.2832, r = Math.sqrt(R()) * q.r * 0.7; addP(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r, v, 0, 0, 255); } }
    else if (key === 'crystal') q.amt = Math.round(60 + dd / 18);
    else if (key === 'pod') q.sp = -1; // 唤醒时决定物种
  }
  G.pois = pois; G.caves = pois.filter(q => POI[q.type].key === 'cave');
  seen.fill(0); revealFlood(gIdx(0, 0));
  G.total0 = ledger().total; computeOpen();
}
/* ---------- 迷雾：只看得见与中心连通的区域 + 白球附近 ---------- */
function markSeen(i) { if (!seen[i]) { seen[i] = 1; SEEN_DIRTY.push(i); const x = (i % GN + 0.5) * CELL - HALF, y = ((i / GN | 0) + 0.5) * CELL - HALF, d = Math.hypot(x, y); if (d > G.expR && whp[i] <= 0) G.expR = d; } }
const SEEN_DIRTY = [];
function revealFlood(i0) {
  if (i0 < 0) return; const st = [i0]; const vis = new Set([i0]);
  while (st.length) {
    const i = st.pop(); markSeen(i); const gx = i % GN, gy = (i / GN) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue; const j = ny * GN + nx;
      if (whp[j] > 0) { markSeen(j); continue; }
      if (!vis.has(j) && !seen[j]) { vis.add(j); st.push(j); }
    }
  }
}
function revealAround(x, y, R) {
  forCells(x, y, R, i => { if (seen[i]) return; if (whp[i] <= 0) revealFlood(i); else markSeen(i); });
}
function checkPOIs() {
  for (const q of G.pois) if (!q.found) { const i = gIdx(q.x, q.y); if (i >= 0 && seen[i]) { q.found = true; emit('found', q.x, q.y, q.type); } }
}
function computeOpen() { // 可达开阔面积（从中心洪泛）
  const seen = new Uint8Array(GN * GN), st = [gIdx(0, 0)]; seen[st[0]] = 1; let n = 0;
  while (st.length) { const i = st.pop(); n++; const gx = i % GN, gy = (i / GN) | 0; for (const j of [i - 1, i + 1, i - GN, i + GN]) { if (j < 0 || j >= GN * GN || seen[j] || whp[j] > 0) continue; if ((j === i - 1 && gx === 0) || (j === i + 1 && gx === GN - 1)) continue; seen[j] = 1; st.push(j); } }
  G.open = n; if (!G.open0) G.open0 = n; G.kMul = Math.max(1, G.open / G.open0);
}
function forCells(x, y, rr, fn) {
  for (let gy = ((y - rr + HALF) / CELL) | 0; gy <= ((y + rr + HALF) / CELL | 0); gy++) for (let gx = ((x - rr + HALF) / CELL) | 0; gx <= ((x + rr + HALF) / CELL | 0); gx++) {
    if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) continue; const cxw = (gx + 0.5) * CELL - HALF, cyw = (gy + 0.5) * CELL - HALF;
    if (dist2(cxw, cyw, x, y) < rr * rr) fn(gy * GN + gx);
  }
}

/* ===================== 粒子 ===================== */
function addP(x, y, v, vx, vy, ripe) {
  if (v <= 0) return;
  if (pN >= MAXP) { for (let t = 0; t < 20; t++) { const j = (rnd() * pN) | 0; if (pv[j] > 0 && pv[j] + v < 65000) { pv[j] += v; return; } } }
  while (v > 60000) { addP(x, y, 60000, vx, vy, ripe); v -= 60000; }
  px[pN] = x; py[pN] = y; pvx[pN] = vx; pvy[pN] = vy; pr[pN] = ripe || 0; pv[pN] = v; pN++;
}
// 把 e 点能量溅射成若干未凝结粒子
function burst(x, y, e, spread) {
  if (e <= 0) return;
  const n = Math.min(12, e), base = Math.floor(e / n); let rem = e - base * n;
  for (let k = 0; k < n; k++) { const v = base + (rem > 0 ? 1 : 0); if (rem > 0) rem--; const a = rnd() * 6.2832, s = spread * (0.5 + rnd()); addP(x + Math.cos(a) * 3, y + Math.sin(a) * 3, v, Math.cos(a) * s, Math.sin(a) * s, 0); }
}
function buildPGrid() {
  pStart.fill(0);
  for (let i = 0; i < pN; i++) { const k = (pr[i] === 255 ? SNC : 0) + sCell(px[i], py[i]); pKey[i] = k; pStart[k + 1]++; }
  for (let k = 0; k < 2 * SNC; k++) pStart[k + 1] += pStart[k];
  pCur.set(pStart.subarray(0, 2 * SNC));
  for (let i = 0; i < pN; i++) pItems[pCur[pKey[i]]++] = i;
}
function cellDensity(c) { return pStart[c + 1] - pStart[c] + pStart[SNC + c + 1] - pStart[SNC + c]; }
function compactP() { let j = 0; for (let i = 0; i < pN; i++) { if (pv[i] > 0) { if (i !== j) { px[j] = px[i]; py[j] = py[i]; pvx[j] = pvx[i]; pvy[j] = pvy[i]; pr[j] = pr[i]; pv[j] = pv[i]; } j++; } } pN = j; }

// 环形搜索最近的【已凝结】能量
function findP(x, y, R, rmin, rmax) {
  const b0 = rmin < 255 ? 0 : 1, b1 = rmax < 255 ? 0 : 1;
  const gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; const rings = Math.min(6, Math.ceil(R / SC));
  let best = -1, bd = R * R;
  for (let r = 0; r <= rings; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const gy = gy0 + dy; if (gy < 0 || gy >= SN) continue; const edge = (dy === -r || dy === r);
      for (let dx = -r; dx <= r; dx += (edge || r === 0) ? 1 : 2 * r) {
        const gx = gx0 + dx; if (gx < 0 || gx >= SN) continue;
        for (let b = b0; b <= b1; b++) { const k = b * SNC + gy * SN + gx;
        let e = pStart[k + 1], s = pStart[k]; if (e - s > 10) e = s + 10;
        for (let q = s; q < e; q++) { const j = pItems[q]; if (pv[j] === 0 || pr[j] < rmin || pr[j] > rmax) continue; const d = dist2(x, y, px[j], py[j]); if (d < bd) { bd = d; best = j; } } }
        if (r === 0) break;
      }
    }
    if (best >= 0 && r >= 1) break;
  }
  return best;
}
function findC(x, y, R, mask, self, pred) {
  const gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; const rings = Math.min(13, Math.ceil(R / SC));
  let best = -1, bd = R * R;
  for (let r = 0; r <= rings; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const gy = gy0 + dy; if (gy < 0 || gy >= SN) continue; const edge = (dy === -r || dy === r);
      for (let dx = -r; dx <= r; dx += (edge || r === 0) ? 1 : 2 * r) {
        const gx = gx0 + dx; if (gx < 0 || gx >= SN) continue; const c = gy * SN + gx;
        let e = cStart[c + 1], s = cStart[c]; if (e - s > 14) e = s + 14;
        for (let q = s; q < e; q++) { const j = cItems[q]; if (j === self || j >= cN || cdead[j] || !(mask & (1 << csp[j]))) continue; if (pred && !pred(j)) continue; const d = dist2(x, y, cx[j], cy[j]); if (d < bd) { bd = d; best = j; } }
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

/* ===================== 生物属性（基因影响） ===================== */
function capE(i) { const g = cg[i]; return Math.max(3, (S_maxE[csp[i]] * g * g + 0.5) | 0); }
function repEi(i) { const g = cg[i]; return SPECIES[csp[i]].repE * g * g; }
function radius(i) { return S_r[csp[i]] * cg[i]; }
function ageF(i) { const s = csp[i], a = cage[i], L = S_life[s], m = SPECIES[s].mature; if (a < m) return 0.5 + 0.5 * a / m; if (a > L * 0.75) return 1 - 0.45 * (a - L * 0.75) / (L * 0.25); return 1; }
// 战力
function power(i, defending) {
  const s = csp[i], sp = SPECIES[s], g = cg[i];
  let p = S_pow[s] * g * g * (0.6 + 0.4 * ce[i] / capE(i)) * ageF(i);
  if (sp.soc === SOC_HERD || sp.soc === SOC_PACK) p *= 1 + 0.15 * Math.min(4, ckin[i]);
  if (defending && sp.shell) p *= sp.shell;
  return p;
}

/* ---------- v0.6 特性辅助 ---------- */
const THORNY = Uint8Array.from(SPECIES, s => s.tr.includes('thorn') ? 1 : 0), WOOL = Uint8Array.from(SPECIES, s => s.tr.includes('wool') ? 1 : 0);
const SPECIAL = Uint8Array.from(SPECIES, s => (s.drain || s.tr.includes('bless')) ? 1 : 0), CARRIER = Uint8Array.from(SPECIES, s => s.tr.includes('carrier') ? 1 : 0);
const S_tongue = Float32Array.from(SPECIES, s => s.tongue || 0);
let CAN_FX = true;
function inR(list, x, y, R) { for (const d of list) if (dist2(x, y, d.x, d.y) < R * R) return true; return false; }
function special(i, s, r) {
  const sp = SPECIES[s];
  if (sp.drain) { // 汲取：贴近其他物种，慢慢吸走能量
    const cap = capE(i); if (ce[i] >= cap - 1) return;
    const j = findC(cx[i], cy[i], r + 30, ~(1 << s), i, null); if (j < 0) { if (cst[i] === ST_WANDER && rnd() < 0.5) { const k = findC(cx[i], cy[i], 200, ~(1 << s), i, null); if (k >= 0) { ctx_[i] = cx[k]; cty[i] = cy[k]; } } return; }
    if (G.sancts.length && inSanct(cx[j], cy[j])) return;
    const take = Math.min(ce[j], 2, cap - ce[i]); ce[j] -= take; ce[i] += take; ctx_[i] = cx[j]; cty[i] = cy[j];
    if (CAN_FX && rnd() < 0.5) emit('drain', cx[j], cy[j], cx[i], cy[i]);
    if (ce[j] <= 0) { killC(j, false); G.deaths++; emit('death', cx[j], cy[j], csp[j]); }
  } else { // 祝福：身边生物衰老减半
    countInR(cx[i], cy[i], 90, j => { if (cstas[j] < 0.6) cstas[j] = 0.6; });
  }
}
function newC(s, x, y, e, gen, g) {
  if (cN >= MAXC) return -1;
  const i = cN++;
  cx[i] = x; cy[i] = y; cvx[i] = 0; cvy[i] = 0; cpx[i] = x; cpy[i] = y; ce[i] = e; csp[i] = s; cage[i] = 0; cmeta[i] = rnd();
  cthink[i] = rnd() * 0.5; cst[i] = ST_WANDER; ctx_[i] = x; cty[i] = y; ctg[i] = -1; ctgId[i] = 0; cid[i] = G.nextId++;
  crep[i] = SPECIES[s].mature * 0.3; cph[i] = rnd() * 6.28; ctim[i] = 0; cwire[i] = -99; cstas[i] = 0; chop[i] = rnd() * 0.5; cdead[i] = 0; cgen[i] = gen || 0; cmood[i] = 1.2;
  cg[i] = g || (0.95 + rnd() * 0.1); ckin[i] = 0; cfc[i] = 0; cang[i] = 0; cmt[i] = SPECIES[s].matT * (0.3 + rnd() * 0.7); cflag[i] = 0; cdr[i] = rnd();
  return i;
}
function killC(i, burstIt, natural) {
  if (cdead[i]) return; cdead[i] = 1;
  const sp = SPECIES[csp[i]];
  if (natural && ce[i] > 0) { // 寿终：孢子分裂 / 凤凰涅槃
    if (sp.tr.includes('spore')) { for (let k = 0; k < 2; k++) { const e = Math.min(ce[i], sp.childE); if (e < 2) break; ce[i] -= e; const a = rnd() * 6.2832, j = newC(csp[i], cx[i] + Math.cos(a) * 8, cy[i] + Math.sin(a) * 8, e, cgen[i] + 1, cg[i]); if (j >= 0) { cvx[j] = Math.cos(a) * 50; cvy[j] = Math.sin(a) * 50; G.births++; } } emit('spore', cx[i], cy[i], csp[i]); }
    else if (sp.tr.includes('rebirth') && !(cflag[i] & 1) && ce[i] >= 20) { const j = newC(csp[i], cx[i], cy[i], ce[i], cgen[i], cg[i]); if (j >= 0) { cflag[j] |= 1; ce[i] = 0; emit('rebirth', cx[i], cy[i], csp[i]); } }
  }
  if (ce[i] > 0) burst(cx[i], cy[i], ce[i], burstIt ? 55 : 25);
  ce[i] = 0; G.deaths++;
}
const C_ARRS = () => [cx, cy, cvx, cvy, cpx, cpy, ce, csp, cage, cmeta, cthink, cst, ctx_, cty, ctg, ctgId, cid, crep, cph, ctim, cwire, cstas, chop, cgen, cmood, cg, ckin, cfc, cang, cmt, cflag, cdr];
let _carrs = null;
function compactC() { // 交换删除（顺序无关；目标引用用 cid 校验）
  const A = _carrs || (_carrs = C_ARRS()), L = A.length;
  let n = cN;
  for (let i = 0; i < n; i++) {
    if (!cdead[i]) continue;
    while (n > i + 1 && cdead[n - 1]) n--;
    n--; if (n > i) { for (let k = 0; k < L; k++) A[k][i] = A[k][n]; cdead[i] = 0; }
    cdead[n] = 0;
  }
  cN = n;
}
function findById(id, hint) { if (hint >= 0 && hint < cN && cid[hint] === id && !cdead[hint]) return hint; for (let i = 0; i < cN; i++) if (cid[i] === id && !cdead[i]) return i; return -1; }

function readyToBreed(j) { const s = csp[j]; return ce[j] >= repEi(j) && cage[j] >= SPECIES[s].mature && crep[j] <= 0 && cst[j] !== ST_FLEE; }
// 猎场饱和：捕食者附近同类太多就不繁殖
const HUNT_ROOM = 320, HUNT_MAX = 2;
function countSp(x, y, R, s, self, lim) {
  let n = 0; const g0x = Math.max(0, ((x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((x + R + HALF) / SC) | 0), g0y = Math.max(0, ((y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((y + R + HALF) / SC) | 0), R2 = R * R;
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const c = gy * SN + gx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (j === self || j >= cN || cdead[j] || csp[j] !== s) continue; if (dist2(x, y, cx[j], cy[j]) < R2 && ++n >= lim) return n; } }
  return n;
}
function crowdedHunt(i) { return S_diet[csp[i]] !== D_E && countSp(cx[i], cy[i], HUNT_ROOM, csp[i], i, HUNT_MAX) >= HUNT_MAX; }
function partnerOK(j) { const s = csp[j], sp = SPECIES[s]; return ce[j] >= repEi(j) * 0.7 && ce[j] > sp.childE * cg[j] * cg[j] / 2 + 2 && cage[j] >= sp.mature && crep[j] <= 0 && cst[j] !== ST_FLEE; }
function inSanct(x, y) { for (const d of G.sancts) if (dist2(x, y, d.x, d.y) < 140 * 140) return true; return false; }

function setWander(i, far) {
  const s = csp[i], sp = SPECIES[s];
  let tx, ty;
  if (sp.mv === MV_ORBIT) {
    const R = 150 + (cid[i] % 9) * 45, a = Math.atan2(cy[i], cx[i]) + 0.4 + rnd() * 0.3; tx = Math.cos(a) * R; ty = Math.sin(a) * R;
  } else {
    const a = rnd() * 6.2832, d = far ? 200 + rnd() * 300 : 50 + rnd() * 140; tx = cx[i] + Math.cos(a) * d; ty = cy[i] + Math.sin(a) * d;
    if (sp.soc === SOC_HERD || sp.soc === SOC_PACK) { const j = findC(cx[i], cy[i], 140, 1 << s, i, null); if (j >= 0) { tx = (tx + cx[j] * 2) / 3; ty = (ty + cy[j] * 2) / 3; } }
    if (sp.diet === D_E && G.lures.length) for (const d of G.lures) { if (dist2(cx[i], cy[i], d.x, d.y) < 320 * 320) { tx = d.x + (rnd() - 0.5) * 120; ty = d.y + (rnd() - 0.5) * 120; break; } }
  }
  ctx_[i] = tx; cty[i] = ty; cst[i] = ST_WANDER;
}
function countKin(i) {
  const s = csp[i], x = cx[i], y = cy[i], gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; let n = 0;
  for (let yy = gy0 - 1; yy <= gy0 + 1; yy++) { if (yy < 0 || yy >= SN) continue; for (let xx = gx0 - 1; xx <= gx0 + 1; xx++) { if (xx < 0 || xx >= SN) continue; const c = yy * SN + xx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (j !== i && j < cN && csp[j] === s && !cdead[j] && dist2(x, y, cx[j], cy[j]) < 65 * 65) { if (++n >= 8) return 8; } } } }
  return n;
}
// 捕食者挑猎物：优先近的、弱的（落单/虚弱/年幼），不打比自己强太多的
const hunted = new Uint32Array(MAXC), huntedBy = new Int32Array(MAXC);
function pickPrey(i) {
  const s = csp[i], x = cx[i], y = cy[i], R = SPECIES[s].sense || 220, mask = S_preyMask[s];
  const myP = power(i, false); const gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0, rings = Math.min(6, Math.ceil(R / SC));
  let best = -1, bs = 1e9, checks = 0; const starving = ce[i] < capE(i) * 0.2;
  for (let r = 0; r <= rings && checks < 50; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const gy = gy0 + dy; if (gy < 0 || gy >= SN) continue; const edge = (dy === -r || dy === r);
      for (let dx = -r; dx <= r; dx += (edge || r === 0) ? 1 : 2 * r) {
        const gx = gx0 + dx; if (gx < 0 || gx >= SN) continue; const c = gy * SN + gx;
        let e = cStart[c + 1], st = cStart[c]; if (e - st > 10) e = st + 10;
        for (let q = st; q < e; q++) {
          const j = cItems[q]; if (j >= cN || cdead[j] || !(mask & (1 << csp[j]))) continue; checks++;
          const d = Math.sqrt(dist2(x, y, cx[j], cy[j])); if (d > R) continue;
          const nj = G.spCount[csp[j]]; if (!starving && nj < 12 && rnd() > nj * nj / (nj * nj + 25)) continue; // 猎物稀少时很难找到（III 型功能反应）
          const pp = power(j, true); if (pp > myP * 1.6) continue;
          if (hunted[j] === G.frame && huntedBy[j] !== i) continue;
          if (G.sancts.length && inSanct(cx[j], cy[j])) continue;
          let sc = d / R + 1.2 * pp / myP - 1.6 * Math.min(1, ce[j] / (capE(i) - ce[i] + 1)); if (THORNY[csp[j]] && !SPECIES[s].dash) sc += 1.5; if (sc < bs) { bs = sc; best = j; }
        }
        if (r === 0) break;
      }
    }
    if (best >= 0 && r >= 2) break;
  }
  return best;
}

function think(i) {
  const s = csp[i], sp = SPECIES[s], x = cx[i], y = cy[i], sense = sp.sense || (150 + sp.r * 4);
  ckin[i] = countKin(i);
  // 1. 面对捕食者：逃跑 / 抱团反击 / 无畏
  if (S_predMask[s]) {
    const j = findC(x, y, sense * 0.75, S_predMask[s], i, null);
    if (j >= 0 && SPECIES[csp[j]].al !== AL_PASSIVE) {
      const d2 = dist2(x, y, cx[j], cy[j]), myP = power(i, true), thP = power(j, false), targeted = cst[j] === ST_HUNT && ctg[j] === i;
      if (sp.al === AL_MOB && ckin[i] >= 3 && myP > thP * 0.8 && d2 < 130 * 130 && cfc[i] <= 0) { cst[i] = ST_FIGHT; ctg[i] = j; ctgId[i] = cid[j]; ctim[i] = 2.5; return; }
      const scared = sp.al === AL_BOLD ? thP > myP * 1.5 : thP > myP * 0.8;
      if (scared && (d2 < 80 * 80 || targeted && d2 < 160 * 160)) { const dx = x - cx[j], dy = y - cy[j], d = Math.sqrt(d2) + 1e-3; cst[i] = ST_FLEE; ctx_[i] = x + dx / d * 170; cty[i] = y + dy / d * 170; ctim[i] = 1.5; return; }
    }
  }
  if (cst[i] === ST_REST && ctim[i] > 0) return;
  // 2. 繁殖
  if (readyToBreed(i) && !crowdedHunt(i) && breedRoom(s)) {
    if (!sp.pair) { reproduce(i, -1); return; }
    const j = findC(x, y, 600, 1 << s, i, partnerOK);
    if (j >= 0) { cst[i] = ST_MATE; ctg[i] = j; ctgId[i] = cid[j]; ctim[i] = 6; if (cst[j] !== ST_MATE) { cst[j] = ST_MATE; ctg[j] = i; ctgId[j] = cid[i]; ctim[j] = 6; cthink[j] = 3; } return; }
  }
  const cap = capE(i), e = ce[i];
  // 3. 领地：驱赶同类
  if (sp.soc === SOC_TERR && cfc[i] <= 0 && e < cap * 0.9 && rnd() < 0.3) {
    const j = findC(x, y, 60, 1 << s, i, null);
    if (j >= 0) { cst[i] = ST_FIGHT; ctg[i] = j; ctgId[i] = cid[j]; ctim[i] = 3; return; }
  }
  // 4. 捕猎（食肉 / 杂食）
  if (sp.diet !== D_E && sp.al !== AL_PASSIVE) {
    if (e < Math.min(cap - 2, Math.max(cap * 0.5, repEi(i) + 3))) {
      let j = pickPrey(i);
      if (j < 0 && sp.diet === D_M && e < cap * 0.25) { const myP = power(i, false); j = findC(x, y, sense, 1 << s, i, k => power(k, true) < myP * 0.6); } // 饿极了吃同类
      if (j >= 0) { cst[i] = ST_HUNT; ctg[i] = j; ctgId[i] = cid[j]; ctim[i] = 7; return; }
    }
  }
  // 5. 吃能量（食能 / 杂食）
  if (S_eats[s] && e < cap - 1) {
    const j = findP(x, y, sense, S_ripeMin[s], S_ripeMax[s]);
    if (j >= 0) {
      if (sp.al === AL_TERR && cfc[i] <= 0 && rnd() < 0.3) { // 护食：赶走来抢的其他食能者
        const k = findC(px[j], py[j], 50, E_MASK & ~(1 << s), i, null);
        if (k >= 0) { cst[i] = ST_FIGHT; ctg[i] = k; ctgId[i] = cid[k]; ctim[i] = 3; return; }
      }
      cst[i] = ST_FOOD; ctx_[i] = px[j]; cty[i] = py[j]; ctim[i] = 6; return;
    }
    if (e < cap * 0.5) { setWander(i, true); return; }
  }
  const dxx = ctx_[i] - x, dyy = cty[i] - y;
  if (cst[i] !== ST_WANDER || dxx * dxx + dyy * dyy < 400 || rnd() < 0.25) setWander(i, false);
}

function reproduce(i, j) {
  const s = csp[i], sp = SPECIES[s]; if (cN >= MAXC) return;
  let e, g;
  if (j < 0) { e = Math.max(2, Math.round(sp.childE * cg[i] * cg[i])); if (ce[i] - e < 2) return; ce[i] -= e; g = cg[i]; }
  else { const tot = Math.max(2, Math.round(sp.childE * (cg[i] * cg[i] + cg[j] * cg[j]) / 2)), a = Math.ceil(tot / 2), b = tot - a; if (ce[i] <= a + 1 || ce[j] <= b + 1) return; ce[i] -= a; ce[j] -= b; e = tot; g = (cg[i] + cg[j]) / 2; crep[j] = sp.mature * (sp.diet !== D_E ? 1.5 : 0.6) + rnd() * 4; cmood[j] = 1.5; }
  g *= 1 + (rnd() - 0.5) * 0.14; if (g < 0.7) g = 0.7; if (g > 1.6) g = 1.6; // 遗传 + 突变
  crep[i] = sp.mature * (sp.diet !== D_E ? 1.5 : 0.6) + rnd() * 4; cmood[i] = 1.5;
  const a = rnd() * 6.2832, bx = j < 0 ? cx[i] : (cx[i] + cx[j]) / 2, by = j < 0 ? cy[i] : (cy[i] + cy[j]) / 2;
  let nx = bx + Math.cos(a) * sp.r, ny = by + Math.sin(a) * sp.r; if (isWall(nx, ny)) { nx = bx; ny = by; }
  const k = newC(s, nx, ny, e, cgen[i] + 1, g);
  if (k >= 0) { cvx[k] = Math.cos(a) * 60; cvy[k] = Math.sin(a) * 60; cvx[i] -= Math.cos(a) * 30; cvy[i] -= Math.sin(a) * 30; G.births++; onBirth(nx, ny, s); }
  cst[i] = ST_WANDER;
}

function eatNear(i, R) {
  const cap = capE(i), x = cx[i], y = cy[i], gx0 = ((x + HALF) / SC) | 0, gy0 = ((y + HALF) / SC) | 0; let ate = false; const R2 = R * R;
  const rmin = S_ripeMin[csp[i]], rmax = S_ripeMax[csp[i]], b0 = rmin < 255 ? 0 : 1, b1 = rmax < 255 ? 0 : 1;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (let b = b0; b <= b1; b++) {
    const gx = gx0 + dx, gy = gy0 + dy; if (gx < 0 || gy < 0 || gx >= SN || gy >= SN) continue; const k = b * SNC + gy * SN + gx;
    let e = pStart[k + 1], st = pStart[k]; if (e - st > 16) e = st + 16;
    for (let q = st; q < e; q++) { const j = pItems[q]; if (pv[j] === 0 || pr[j] < rmin || pr[j] > rmax) continue; if (dist2(x, y, px[j], py[j]) < R2) { const take = Math.min(pv[j], cap - ce[i]); if (take <= 0) return ate; ce[i] += take; pv[j] -= take; ate = true; } }
  }
  return ate;
}

/* ---------- 战斗（守恒：受伤掉的能量洒回地图） ---------- */
function hurt(i, frac) {
  const dmg = Math.min(ce[i], Math.max(1, Math.ceil(capE(i) * frac)));
  ce[i] -= dmg; burst(cx[i], cy[i], dmg, 40);
  if (ce[i] <= 0) { cdead[i] = 1; G.deaths++; emit('death', cx[i], cy[i], csp[i]); }
  return dmg;
}
function fleeFromPt(i, x, y, t) { const dx = cx[i] - x, dy = cy[i] - y, d = Math.hypot(dx, dy) + 1e-3; cst[i] = ST_FLEE; ctx_[i] = cx[i] + dx / d * 220; cty[i] = cy[i] + dy / d * 220; ctim[i] = t; }
function fleeFrom(i, j, t) { const dx = cx[i] - cx[j], dy = cy[i] - cy[j], d = Math.hypot(dx, dy) + 1e-3; cst[i] = ST_FLEE; ctx_[i] = cx[i] + dx / d * 170; cty[i] = cy[i] + dy / d * 170; ctim[i] = t; cvx[i] += dx / d * 90; cvy[i] += dy / d * 90; }
function fight(a, d, lethal) {
  if (cfc[a] > 0 || cdead[a] || cdead[d]) return 0;
  if (G.sancts.length && (inSanct(cx[a], cy[a]) || inSanct(cx[d], cy[d]))) { cst[a] = ST_WANDER; cthink[a] = 0.5; return 0; }
  const A = power(a, false), D = power(d, true), p = A * A / (A * A + D * D);
  const x = (cx[a] + cx[d]) / 2, y = (cy[a] + cy[d]) / 2, spD = SPECIES[csp[d]];
  if (lethal && spD.tr.includes('ink') && rnd() < 0.6) { // 墨遁：毫发无伤逃走
    cfc[a] = 1.2; emit('ink', cx[d], cy[d]); const a2 = rnd() * 6.2832; let nx = cx[d] + Math.cos(a2) * 70, ny = cy[d] + Math.sin(a2) * 70; if (!isWall(nx, ny)) { cx[d] = nx; cy[d] = ny; } fleeFrom(d, a, 2); cst[a] = ST_REST; ctim[a] = 1.2; return 1;
  }
  if (spD.tr.includes('thorn')) { hurt(a, 0.18); emit('thorn', cx[d], cy[d]); if (cdead[a]) return 1; }
  if (SPECIES[csp[a]].dash && lethal) { cst[a] = ST_REST; ctim[a] = 2.5; }
  cfc[a] = 1.2; if (cfc[d] < 0.6) cfc[d] = 0.6; cang[a] = 1; cang[d] = 1; G.fights++;
  let killed = false;
  if (rnd() < p) {
    if (lethal) {
      const pe = ce[d], take = Math.min(Math.ceil(pe * 0.75), capE(a) - ce[a]); ce[a] += take; const rest = pe - take; ce[d] = 0; if (rest > 0) burst(cx[d], cy[d], rest, 45);
      cdead[d] = 1; G.deaths++; G.eaten++; killed = true; emit('kill', cx[d], cy[d], csp[d]);
      cst[a] = ST_REST; ctim[a] = 2 + 6 * ce[a] / capE(a); // 消化 cmood[a] = 1.2;
    } else { hurt(d, lethal ? 0.2 : 0.15); if (!cdead[d]) fleeFrom(d, a, 1.8); cst[a] = ST_WANDER; cthink[a] = 0.8; }
  } else {
    hurt(a, lethal ? 0.1 : 0.12); if (!cdead[a]) { fleeFrom(a, d, 1.6); } if (!lethal) hurt(d, 0.05);
  }
  emit('fight', x, y, killed ? 1 : 0);
  if (G.arenas.length) for (const ar of G.arenas) if (dist2(ar.x, ar.y, x, y) < 190 * 190) { const v = (killed ? 2.5 : 1) * ar.mult; ar.acc += v; ar.flash = 1; G.devAcc += v; emit('tidegain', ar.x, ar.y - 20, v); }
  return killed ? 2 : 1;
}

// 生态位饱和：某物种总数超过其容量 K 后代谢升高（K 与体型成反比，随开拓面积增长）
const S_crowd = new Float32Array(NS).fill(1);
// 种内竞争（同种之间争夺空间/配偶，比种间竞争更强 → 多物种共存）。容量随开拓面积增长 → 探索黑墙有意义
function inRate() { return Math.max(tankRegen(G.lv), G.inRate || 0); }
// 能量金字塔：捕食者只能拿到下一级能量的一小部分 → 容量约为食能者的 30%
function nicheK(s) { return Math.max(3, (S_diet[s] === D_E ? 0.35 : 0.11) * inRate() / (S_meta[s] * META_MUL)) * Math.sqrt(G.kMul || 1); }
const META_MUL = 0.7;
const S_K = new Float32Array(NS);
function updateCrowd() { for (let s = 0; s < NS; s++) { const K = S_K[s] = nicheK(s); S_crowd[s] = 1 + 0.5 * G.spCount[s] / K; } }
// 密度依赖的繁殖：接近容量时繁殖意愿下降，超过就不繁殖（给其他物种留能量）
function breedRoom(s) { const q = G.spCount[s] / S_K[s]; return q < 0.6 || rnd() < (1 - q) / 0.4; }
function stepC(dt) {
  updateCrowd();
  const t = G.t, orb = G.orb, big = dt > 0.2;
  const loadF = 1 + cN / 6000;
  for (let i = 0; i < cN; i++) {
    if (cdead[i]) continue;
    const s = csp[i], sp = SPECIES[s], g = cg[i], r = S_r[s] * g;
    let ageMul = 1, metaMul = 1;
    if (cstas[i] > 0) { cstas[i] -= dt; ageMul = 0.5; metaMul = 0.7; }
    cage[i] += dt * ageMul;
    const life = S_life[s];
    if (cage[i] > life) { killC(i, true, true); G.oldDeaths++; emit('death', cx[i], cy[i], s); continue; }
    // 代谢：能量以未凝结粒子形式散逸（守恒）。体型大 → 代谢高
    cmeta[i] += S_meta[s] * META_MUL * g * Math.sqrt(g) * dt * metaMul * (1 + 0.1 * ckin[i]) * S_crowd[s]; // 同类拥挤 + 生态位饱和 → 代谢升高
    if (cmeta[i] >= 1) {
      let k = Math.floor(cmeta[i]); if (k > ce[i]) k = ce[i]; cmeta[i] -= Math.floor(cmeta[i]);
      if (k > 0) { ce[i] -= k; G.flow.burn += k; G.flowWin.burn += k; } // v0.5：代谢让能量消失（不可再生）
    }
    // 代谢物 → 物质结晶（吃饱的成年个体才会产出；高级生物产量高得多）
    cmt[i] -= dt;
    if (cmt[i] <= 0) { cmt[i] = sp.matT * (0.8 + rnd() * 0.4); if (cage[i] >= sp.mature && ce[i] > capE(i) * 0.4) dropMatter(cx[i], cy[i] + r * 0.5, sp.mat * (WOOL[s] && ckin[i] >= 2 ? 2 : 1)); }
    if (SPECIAL[s]) { cdr[i] -= dt; if (cdr[i] <= 0) { cdr[i] = 0.5; special(i, s, r); if (cdead[i]) continue; } }
    if (ce[i] <= 0) { killC(i, false); G.starve++; emit('death', cx[i], cy[i], s); continue; }
    if (crep[i] > 0) crep[i] -= dt * (G.nurs.length && inR(G.nurs, cx[i], cy[i], 170) ? 1.67 : 1); if (cmood[i] > 0) cmood[i] -= dt; if (cfc[i] > 0) cfc[i] -= dt; if (cang[i] > 0) cang[i] -= dt;
    cthink[i] -= dt;
    if (cthink[i] <= 0) { think(i); cthink[i] = (0.4 + rnd() * 0.5) * loadF; if (cdead[i]) continue; }
    let tx = ctx_[i], ty = cty[i], spMul = 1;
    const st = cst[i];
    if (st === ST_HUNT || st === ST_MATE || st === ST_FIGHT) {
      const j = ctg[i];
      if (j < 0 || j >= cN || cid[j] !== ctgId[i] || cdead[j]) { cst[i] = ST_WANDER; cthink[i] = 0; }
      else {
        tx = cx[j]; ty = cy[j]; ctim[i] -= dt;
        const rr = r + radius(j) + 3 + (st === ST_HUNT ? S_tongue[s] : 0), d2 = dist2(cx[i], cy[i], tx, ty), reach = rr + (big ? S_speed[s] * dt : 0);
        if (st === ST_HUNT) { hunted[j] = G.frame + 1; huntedBy[j] = i; }
        if (st === ST_HUNT || st === ST_FIGHT) {
          spMul = st === ST_HUNT ? (sp.dash ? 1.8 : 1.15) : 1.05;
          if (d2 < reach * reach) { if (st === ST_HUNT && S_tongue[s] && CAN_FX) emit('tongue', cx[i], cy[i], cx[j], cy[j]); fight(i, j, st === ST_HUNT); }
          else if (ctim[i] <= 0) { cst[i] = ST_REST; ctim[i] = 0.8; }
        } else {
          if (d2 < (rr + 6) * (rr + 6) || big && d2 < reach * reach) { if (readyToBreed(i) && partnerOK(j)) reproduce(i, j); cst[i] = ST_WANDER; cthink[i] = 0.3; }
          else if (ctim[i] <= 0) cst[i] = ST_WANDER;
        }
      }
    } else if (st === ST_FLEE) { spMul = 1.4; ctim[i] -= dt; if (ctim[i] <= 0) { cst[i] = ST_WANDER; cthink[i] = 0; } }
    else if (st === ST_REST) { spMul = 0.2; ctim[i] -= dt; if (ctim[i] <= 0) { cst[i] = ST_WANDER; cthink[i] = 0; } }
    else if (st === ST_FOOD) {
      ctim[i] -= dt;
      const d2 = dist2(cx[i], cy[i], tx, ty), reach = r + 6 + S_reach[s] + (big ? S_speed[s] * dt : 0);
      if (d2 < reach * reach) { if (big) { cx[i] = tx; cy[i] = ty; } eatNear(i, r + 8 + S_reach[s]); cst[i] = ST_WANDER; cthink[i] = 0.05; }
      else if (ctim[i] <= 0) { cst[i] = ST_WANDER; cthink[i] = 0; }
    }
    if (cdead[i]) continue;
    if (S_eats[s] && ((G.frame + i) & 7) === 0 && ce[i] < capE(i) - 1) eatNear(i, r + 5 + S_reach[s]);
    // 运动
    const mv = S_mv[s];
    let spd = S_speed[s] * spMul / Math.pow(g, 0.3); if (cage[i] > life * 0.75) spd *= 0.7;
    let dx = tx - cx[i], dy = ty - cy[i]; const d = Math.hypot(dx, dy);
    if (d > 1e-3) { dx /= d; dy /= d; } else { dx = 0; dy = 0; }
    const arrive = d < 30 ? d / 30 : 1;
    if (mv === MV_HOP) {
      chop[i] -= dt;
      if (chop[i] <= 0 && d > 6) { chop[i] = 0.5 + rnd() * 0.25; cvx[i] = dx * spd * 1.9 * arrive; cvy[i] = dy * spd * 1.9 * arrive; }
      const f = Math.exp(-3.2 * dt); cvx[i] *= f; cvy[i] *= f;
    } else {
      let wx = 0, wy = 0;
      if (mv === MV_FLOAT || mv === MV_ORBIT) { const w = Math.sin(t * 2 + cph[i]) * 0.5; wx = -dy * w; wy = dx * w; }
      else if (mv === MV_FLY) { wx = Math.sin(t * 3.1 + cph[i]) * 0.6; wy = Math.cos(t * 2.3 + cph[i] * 1.7) * 0.6; }
      const dvx = (dx + wx) * spd * arrive, dvy = (dy + wy) * spd * arrive;
      const k = Math.min(1, 3.5 * dt); cvx[i] += (dvx - cvx[i]) * k; cvy[i] += (dvy - cvy[i]) * k;
    }
    // 白球推挤
    const ox = cx[i] - orb.x, oy = cy[i] - orb.y, od2 = ox * ox + oy * oy, orr = r + 16;
    if (od2 < orr * orr && od2 > 0.01 && !orb.dead) { const od = Math.sqrt(od2); cvx[i] += ox / od * 140; cvy[i] += oy / od * 140; }
    cpx[i] = cx[i]; cpy[i] = cy[i];
    // 碰撞推挤（隔帧）+ 水母被动蛰人
    if (!big && ((G.frame + i) & 1) === 0) {
      const c = sCell(cx[i], cy[i]), gx0 = c % SN, gy0 = (c / SN) | 0; let checks = 0; const mi = r * r;
      const passive = sp.al === AL_PASSIVE && cfc[i] <= 0 && ce[i] < capE(i) - 2;
      for (let yy = gy0 - 1; yy <= gy0 + 1 && checks < 10; yy++) { if (yy < 0 || yy >= SN) continue; for (let xx = gx0 - 1; xx <= gx0 + 1 && checks < 10; xx++) { if (xx < 0 || xx >= SN) continue; const cc = yy * SN + xx;
        for (let q = cStart[cc]; q < cStart[cc + 1] && checks < 10; q++) {
          const j = cItems[q]; if (j === i || j >= cN || cdead[j]) continue; checks++;
          const rj = radius(j), ddx = cx[i] - cx[j], ddy = cy[i] - cy[j], dd2 = ddx * ddx + ddy * ddy, rs = (r + rj) * 0.85;
          if (dd2 < rs * rs && dd2 > 1e-4) {
            if (passive && (S_preyMask[s] & (1 << csp[j]))) { fight(i, j, true); if (cdead[i]) break; continue; }
            const dd = Math.sqrt(dd2), push = (rs - dd) * 0.9 * (rj * rj / (mi + rj * rj)); cx[i] += ddx / dd * push; cy[i] += ddy / dd * push;
          }
        } } }
      if (cdead[i]) continue;
    }
    let mx = cvx[i] * dt, my = cvy[i] * dt; const md = Math.hypot(mx, my), maxd = (big ? Math.max(spd * dt, 40) : spd * 3 * dt + 4);
    if (md > maxd) { mx *= maxd / md; my *= maxd / md; }
    if (big && d > 0 && md > d) { mx = tx - cx[i]; my = ty - cy[i]; }
    const nx = cx[i] + mx, ny = cy[i] + my, rq = r * 0.6;
    if (!isWall(nx + Math.sign(mx) * rq, ny + Math.sign(my) * rq)) { cx[i] = nx; cy[i] = ny; }
    else if (!isWall(nx + Math.sign(mx) * rq, cy[i])) { cx[i] = nx; cvy[i] *= -0.5; }
    else if (!isWall(cx[i], ny + Math.sign(my) * rq)) { cy[i] = ny; cvx[i] *= -0.5; }
    else { cvx[i] *= -0.5; cvy[i] *= -0.5; if (cst[i] === ST_WANDER || cst[i] === ST_FOOD) { ctx_[i] = cx[i] * 0.7; cty[i] = cy[i] * 0.7; cst[i] = ST_WANDER; } }
    if (isWall(cx[i], cy[i])) { const u = unstick(cx[i], cy[i]); if (u) { cx[i] = u[0]; cy[i] = u[1]; } }
    cph[i] += dt * (3 + Math.hypot(cvx[i], cvy[i]) * 0.05);
  }
}

/* ===================== 粒子：凝结 + 密度扩散（只能“聚集”不能“聚团”）+ 吸引 ===================== */
function stepP(dt) {
  const orb = G.orb, att = orb.attract && !orb.dead, ox = orb.x, oy = orb.y, AR = 190 * 190;
  const damp = Math.exp(-2.2 * dt), K = 0.55, big = dt > 0.2, TP2 = TOWER_PULL * TOWER_PULL;
  G.ripAcc = (G.ripAcc || 0) + dt * 255 / RIPEN; const rip = Math.floor(G.ripAcc); G.ripAcc -= rip;
  for (let i = 0; i < pN; i++) {
    if (pv[i] === 0) continue;
    if (rip && pr[i] < 255) { const q = pr[i] + rip; pr[i] = q > 255 ? 255 : q; }
    let x = px[i], y = py[i], vx = pvx[i], vy = pvy[i];
    const gx = ((x + HALF) / SC) | 0, gy = ((y + HALF) / SC) | 0;
    if (gx > 0 && gy > 0 && gx < SN - 1 && gy < SN - 1) {
      const c = gy * SN + gx, dc = cellDensity(c);
      if (dc > 10) { const fx = cellDensity(c - 1) - cellDensity(c + 1), fy = cellDensity(c - SN) - cellDensity(c + SN); vx += fx * K * dt + (rnd() - 0.5) * 60 * dt; vy += fy * K * dt + (rnd() - 0.5) * 60 * dt; }
    }
    const d2t = x * x + y * y; if (d2t < TP2 && d2t > 3600) { const d = Math.sqrt(d2t); vx -= x / d * 3 * dt; vy -= y / d * 3 * dt; }
    if (att) { const dx = ox - x, dy = oy - y, d2 = dx * dx + dy * dy; if (d2 < AR && d2 > 100) { const d = Math.sqrt(d2), f = 160 * dt / (0.3 + d / 190); vx += dx / d * f; vy += dy / d * f; } }
    vx *= damp; vy *= damp;
    if (big) { const sp = Math.hypot(vx, vy); if (sp > 40) { vx *= 40 / sp; vy *= 40 / sp; } }
    if (vx !== 0 || vy !== 0) {
      const nx = x + vx * dt, ny = y + vy * dt;
      const fx = Math.fround(nx), fy = Math.fround(ny); // Float32 存储后再判断，避免舍入落进墙格
      if (!isWall(fx, fy)) { px[i] = fx; py[i] = fy; }
      else { vx = -vx * 0.4; vy = -vy * 0.4; if (isWall(x, y)) { const u = unstick(x, y); if (u) { px[i] = u[0]; py[i] = u[1]; } } }
    }
    pvx[i] = vx; pvy[i] = vy;
  }
}

/* ===================== 墙体与白球 ===================== */
function breakCell(i) {
  if (whp[i] <= 0 || whp[i] === Infinity) return;
  whp[i] = 0; const gx = i % GN, gy = (i / GN) | 0, x = (gx + 0.5) * CELL - HALF, y = (gy + 0.5) * CELL - HALF;
  const e = 0; wE[i] = 0;
  G.open++; G.kMul = Math.max(1, G.open / G.open0); G.wallBroken = (G.wallBroken || 0) + 1;
  revealFlood(i);
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
  const R = 14; let nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
  o.drill = 0; let touching = 0;
  const g0x = ((nx - R - 6 + HALF) / CELL) | 0, g1x = ((nx + R + 6 + HALF) / CELL) | 0, g0y = ((ny - R - 6 + HALF) / CELL) | 0, g1y = ((ny + R + 6 + HALF) / CELL) | 0;
  const dps = orbDPS();
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
    if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) continue; const i = gy * GN + gx; if (whp[i] <= 0) continue;
    const x0 = gx * CELL - HALF, y0 = gy * CELL - HALF;
    const qx = Math.max(x0, Math.min(nx, x0 + CELL)), qy = Math.max(y0, Math.min(ny, y0 + CELL));
    const dx = nx - qx, dy = ny - qy, d2 = dx * dx + dy * dy;
    if (d2 < (R + 4) * (R + 4) && whp[i] !== Infinity && (o.ix || o.iy)) { whp[i] -= dps * dt; touching++; if (whp[i] <= 0) breakCell(i); else if ((G.frame & 3) === 0) WALL_DIRTY.push(i); }
    if (whp[i] > 0 && d2 < R * R) { const d = Math.sqrt(d2) || 0.01; const push = R - d; if (d2 > 1e-6) { nx += dx / d * push; ny += dy / d * push; } else { nx -= o.vx * dt; ny -= o.vy * dt; } }
  }
  // 能量槽：按住喷洒 / 松开回充
  const TM = tankMax(G.lv);
  if (o.spray && o.tank >= 1) {
    o.sprAcc += SPRAY_RATE * dt; let n = Math.min(Math.floor(o.sprAcc), Math.floor(o.tank)); o.sprAcc -= Math.floor(o.sprAcc);
    while (n > 0) { const v = Math.min(n, 2); n -= v; o.tank -= v; G.flow.spray += v; G.flowWin.inE += v; const a = rnd() * 6.2832, sp = 40 + rnd() * 70; addP(o.x + Math.cos(a) * 8, o.y + Math.sin(a) * 8, v, Math.cos(a) * sp + o.vx * 0.3, Math.sin(a) * sp + o.vy * 0.3, 170); }
  }
  if (o.tank > TM) o.tank = TM;
  if ((G.frame & 7) === 0) { revealAround(o.x, o.y, 170); checkPOIs(); }
  for (const q of G.pois) if (!q.used && q.found && dist2(q.x, q.y, o.x, o.y) < 55 * 55) touchPOI(q);
  if (touching) { const d = Math.hypot(nx, ny); o.hp -= (1.5 + d / 500) * dt; o.drill = 1; if (o.hp <= 0) { o.hp = 0; o.dead = 2.5; emit('orbdie', o.x, o.y); return; } }
  else o.hp = Math.min(100, o.hp + 7 * dt);
  if (isWall(nx, ny)) { nx = o.x; ny = o.y; o.vx *= 0.3; o.vy *= 0.3; }
  o.x = nx; o.y = ny;
}
function teleportOrb(tx, ty) {
  const o = G.orb; if (o.dead) return false;
  const x = o.x, y = o.y, dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy), n = Math.ceil(d / 8);
  if (!isWall(tx, ty) && d < 6000) { let ok = true; for (let k = 1; k <= n; k++) if (isWall(x + dx * k / n, y + dy * k / n)) { ok = false; break; } if (ok) { o.x = tx; o.y = ty; o.vx = o.vy = 0; emit('tp', x, y); return true; } }
  let lx = x, ly = y; for (let k = 1; k <= n; k++) { const qx = x + dx * k / n, qy = y + dy * k / n; if (isWall(qx, qy)) break; lx = qx; ly = qy; }
  const back = Math.min(16, Math.hypot(lx - x, ly - y)); if (d > 0) { lx -= dx / d * back; ly -= dy / d * back; }
  if (Math.hypot(lx - x, ly - y) < 4) return false;
  o.x = lx; o.y = ly; o.vx = dx / d * 60; o.vy = dy / d * 60; emit('tp', x, y); return true;
}

/* ===================== 光灵：环境中的白色能量球（v0.6 唯一的“天然”能量来源） ===================== */
function addW(x, y, v) { if (wN >= MAXW) return -1; const k = wN++; wx[k] = x; wy[k] = y; const a = rnd() * 6.2832; wvx[k] = Math.cos(a) * 8; wvy[k] = Math.sin(a) * 8; wval[k] = v; wage[k] = 0; wph[k] = rnd() * 6.28; wtg[k] = -1; return k; }
function wispTarget() { return Math.min(260, 26 + G.open / 140); }
function spawnWisp() {
  const R = Math.min(VOID_R - 100, G.expR + 40);
  for (let t = 0; t < 24; t++) {
    const a = rnd() * 6.2832, d = Math.sqrt(rnd()) * R, x = Math.cos(a) * d, y = Math.sin(a) * d, i = gIdx(x, y);
    if (i < 0 || !seen[i] || whp[i] > 0 || d < 110) continue;
    if (isWall(x + 14, y) || isWall(x - 14, y) || isWall(x, y + 14) || isWall(x, y - 14)) continue;
    addW(x, y, Math.min(9, 3 + (d / 700 | 0))); return true; // 越远的光灵越亮（能量越多）
  }
  return false;
}
function stepW(dt) {
  // 生成：已探索区域越大，光灵越多
  G.wAcc += dt * (0.45 + G.open / 9000);
  while (G.wAcc >= 1) { G.wAcc -= 1; if (wN < wispTarget()) spawnWisp(); }
  // 星光汇聚塔：在周围降下光灵
  if (G.lv >= 1) for (const d of G.suns) { d.acc2 = (d.acc2 || 0) + dt / 1.5; while (d.acc2 >= 1) { d.acc2 -= 1; const a = rnd() * 6.2832, r = 40 + rnd() * 160, x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r; if (!isWall(x, y)) { const k = addW(x, y, 5); if (k >= 0) emit('wdrop', x, y); } } }
  const o = G.orb, TM = tankMax(G.lv), canAbs = !o.dead && !G.offline && o.tank < TM - 0.5, cat = G.lv >= 1 ? G.catchers : [];
  let got = 0;
  for (let k = 0; k < wN; k++) {
    if (!wval[k]) continue;
    wage[k] += dt; if (wage[k] > WISP_LIFE) { wval[k] = 0; continue; }
    let vx = wvx[k], vy = wvy[k]; const x = wx[k], y = wy[k]; wph[k] += dt;
    // 缓慢漂浮
    vx += Math.cos(wph[k] * 0.7 + k) * 10 * dt; vy += Math.sin(wph[k] * 0.9 + k * 1.3) * 10 * dt;
    let pulled = false;
    if (canAbs) { const dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy;
      if (d2 < 20 * 20) { const v = Math.min(wval[k], TM - o.tank); o.tank += v; o.absorbed += v; got += v; emit('wabs', x, y, v); wval[k] = 0; continue; }
      if (d2 < WISP_MAG * WISP_MAG) { const d = Math.sqrt(d2), f = 1400 * dt / (0.35 + d / WISP_MAG); vx += dx / d * f; vy += dy / d * f; pulled = true; } }
    if (!pulled) for (const c of cat) { const dx = c.x - x, dy = c.y - y, d2 = dx * dx + dy * dy;
      if (d2 < 18 * 18) { const v = wval[k]; for (let q = 0; q < v; q++) { const a = rnd() * 6.2832, r = 8 + rnd() * 26; addP(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 1, Math.cos(a) * 30, Math.sin(a) * 30, 255); } G.flow.gen += v; G.flowWin.inE += v; c.n = (c.n || 0) + v; c.flash = 1; emit('wcat', c.x, c.y, v); wval[k] = 0; break; }
      if (d2 < 260 * 260) { const d = Math.sqrt(d2), f = 300 * dt / (0.5 + d / 260); vx += dx / d * f; vy += dy / d * f; pulled = true; break; } }
    const f = Math.exp(-(pulled ? 2.5 : 1.2) * dt); vx *= f; vy *= f;
    const nx = x + vx * dt, ny = y + vy * dt;
    if (!isWall(nx, ny) || pulled) { wx[k] = nx; wy[k] = ny; } else { vx = -vx; vy = -vy; }
    wvx[k] = vx; wvy[k] = vy;
  }
  if (!wval[0] || (G.frame & 15) === 0) { let j = 0; for (let k = 0; k < wN; k++) if (wval[k]) { if (k !== j) { wx[j] = wx[k]; wy[j] = wy[k]; wvx[j] = wvx[k]; wvy[j] = wvy[k]; wval[j] = wval[k]; wage[j] = wage[k]; wph[j] = wph[k]; } j++; } wN = j; }
  return got;
}
/* ===================== 科研（研究速度由潮汐驱动） ===================== */
function resKey(kind, idx) { return kind === 's' ? SPECIES[idx].key : 'd' + DEVICES[idx].key; }
function resItem(key) { if (key[0] === 'd' && DV_IDX[key.slice(1)] !== undefined) { const d = DEVICES[DV_IDX[key.slice(1)]]; return { kind: 'd', idx: d.id, def: d, tier: d.tier, cost: RES_COST[d.tier] || 0 }; } const i = SP_IDX[key]; if (i === undefined) return null; const sp = SPECIES[i]; return { kind: 's', idx: i, def: sp, tier: sp.tier, cost: RES_COST[sp.tier] || 0 }; }
function resErr(key) { const it = resItem(key); if (!it) return '未知项目'; if (G.unlocked.includes(key)) return '已解锁'; if (G.maxLv < resGate(it.tier)) return '需要潮汐 Lv' + resGate(it.tier); return ''; }
function researchRate() { // 每秒研究点数
  let base = 0; for (const d of G.labs) base += DEVICES[d.type].rs * d.mult;
  return base * (1 + Math.max(0, G.lastScore) / WINDOW);
}
function stepResearch(dt) {
  G.rpRate = G.lv >= 1 ? researchRate() : 0;
  if (!G.resT) { if (G.rpRate > 0) G.rp = Math.min(G.rp + G.rpRate * dt, 99999); return; }
  const it = resItem(G.resT); if (!it || G.unlocked.includes(G.resT)) { G.resT = ''; return; }
  G.rp += G.rpRate * dt;
  if (G.rp >= it.cost) { G.rp -= it.cost; finishResearch(G.resT); }
}
function finishResearch(key) {
  const it = resItem(key); if (!it || G.unlocked.includes(key)) return; G.unlocked.push(key); if (G.resT === key) G.resT = '';
  emit('unlock', it.kind, it.idx);
}
function setResearch(key) { const e = resErr(key); if (e) return e; G.resT = key; const it = resItem(key); if (G.rp >= it.cost) { G.rp -= it.cost; finishResearch(key); } return ''; }

/* ===================== 遗迹 ===================== */
function touchPOI(q) {
  const key = POI[q.type].key;
  if (key === 'crystal') { q.used = true; G.matter += q.amt; G.flow.mat += q.amt; emit('poi', q.x, q.y, q.type, q.amt); }
  else if (key === 'pod') {
    q.used = true; const pool = SPECIES.filter(s => s.tier <= G.maxLv + 2 && s.tier >= 1 && !G.unlocked.includes(s.key)).concat(SPECIES.filter(s => s.tier >= 1 && s.tier <= G.maxLv + 1)); const sp = pool.length ? pool[(rnd() * pool.length) | 0] : SPECIES[0];
    q.sp = sp.id; if (!G.unlocked.includes(sp.key)) { G.unlocked.push(sp.key); emit('unlock', 's', sp.id); }
    const n = sp.pair ? 4 : 5; for (let k = 0; k < n; k++) { const a = k / n * 6.2832, j = newC(sp.id, q.x + Math.cos(a) * 25, q.y + Math.sin(a) * 25, Math.round(sp.maxE * 0.8), 0); if (j >= 0) { cage[j] = sp.mature; crep[j] = 5; } }
    emit('poi', q.x, q.y, q.type, sp.id);
  }
}
function stepPOIs(dt) {
  for (const q of G.pois) {
    const key = POI[q.type].key;
    if (key === 'reactor' || key === 'obelisk' || key === 'relay') {
      q.on = q.found && G.lv >= 1 && (key === 'relay' ? !!q.conn : inField(q.x, q.y, q));
      if (!q.on) continue;
      if (key === 'reactor') { q.acc += 4 * dt; while (q.acc >= 1) { q.acc -= 1; const a = rnd() * 6.2832, r = 20 + rnd() * 40; addP(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r, 1, Math.cos(a) * 20, Math.sin(a) * 20, 255); G.flow.gen++; G.flowWin.inE++; } }
      else if (key === 'obelisk') { const v = 0.4 * dt; G.devAcc += v; q.acc += v; }
    }
  }
}
function poiBonusCap() { let n = 0; for (const q of G.pois) if (q.on && POI[q.type].key === 'obelisk') n += 2; return n; }
/* ===================== 物质结晶 ===================== */
function dropMatter(x, y, v) {
  if (v <= 0) return;
  if (mN >= MAXM) { const j = (rnd() * mN) | 0; mval[j] = Math.min(60000, mval[j] + v); return; }
  const a = rnd() * 6.2832; mx[mN] = x; my[mN] = y; mvx[mN] = Math.cos(a) * 25; mvy[mN] = Math.sin(a) * 25 - 20; mval[mN] = v; mage[mN] = 0; mN++;
  emit('mat', x, y, v);
}
function collectM(j) { const v = mval[j]; G.matter += v; G.flow.mat += v; G.flowWin.mat += v; mval[j] = 0; return v; }
function stepM(dt) {
  const o = G.orb, cols = G.cols || [];
  let got = 0; const car = [];
  if (G.spCount[SP_IDX.mite] > 0) for (let i = 0; i < cN && car.length < 120; i++) if (CARRIER[csp[i]] && !cdead[i] && cage[i] > 3) car.push(i);
  for (let j = 0; j < mN; j++) {
    if (!mval[j]) continue;
    mage[j] += dt; if (mage[j] > MAT_LIFE) { mval[j] = 0; continue; }
    let vx = mvx[j], vy = mvy[j];
    // 白球吸取
    if (!o.dead && !G.offline) { const dx = o.x - mx[j], dy = o.y - my[j], d2 = dx * dx + dy * dy; if (d2 < 22 * 22) { got += collectM(j); continue; } if (d2 < 150 * 150) { const d = Math.sqrt(d2), f = 900 * dt / (0.4 + d / 150); vx += dx / d * f; vy += dy / d * f; } }
    if (car.length) { let hit = -1; for (const i of car) { const dx = cx[i] - mx[j], dy = cy[i] - my[j]; if (dx * dx + dy * dy < 26 * 26) { hit = i; break; } } if (hit >= 0) { const v = collectM(j); if (CAN_FX) emit('carry', cx[hit], cy[hit], v); continue; } }
    for (const c of cols) { const dx = c.x - mx[j], dy = c.y - my[j], d2 = dx * dx + dy * dy; if (d2 < 18 * 18) { collectM(j); c.n = (c.n || 0) + 1; break; } if (d2 < 210 * 210) { const d = Math.sqrt(d2); vx += dx / d * 260 * dt; vy += dy / d * 260 * dt; } }
    if (!mval[j]) continue;
    const f = Math.exp(-3 * dt); vx *= f; vy *= f;
    const nx = mx[j] + vx * dt, ny = my[j] + vy * dt; if (!isWall(nx, ny)) { mx[j] = nx; my[j] = ny; } else { vx = -vx * 0.3; vy = -vy * 0.3; }
    mvx[j] = vx; mvy[j] = vy;
  }
  if (got) emit('matget', o.x, o.y, got);
  let k = 0; for (let j = 0; j < mN; j++) if (mval[j]) { if (j !== k) { mx[k] = mx[j]; my[k] = my[j]; mvx[k] = mvx[j]; mvy[k] = mvy[j]; mval[k] = mval[j]; mage[k] = mage[j]; } k++; } mN = k;
}

/* ===================== 观测者装置 ===================== */
function devActive(d) { return d.bt <= 0 && d.powered && G.lv >= 1; }
function recomputePower() {
  const pylons = G.devs.filter(d => DEVICES[d.type].pf);
  for (const p of pylons) { p.conn = false; p.fr = DEVICES[p.type].pf; }
  const q = [];
  // 远古中继塔：找到后也算一个导能节点（能量场半径 320）
  for (const r of G.pois) if (POI[r.type].key === 'relay') { r.conn = false; r.bt = r.found ? 0 : 1; r.fr = 320; if (r.found) pylons.push(r); }
  const fr = p => p.fr || PYLON_FIELD;
  for (const p of pylons) if (p.bt <= 0 && Math.hypot(p.x, p.y) <= TOWER_FIELD + (p.fr > PYLON_FIELD ? p.fr - PYLON_FIELD : 0)) { p.conn = true; q.push(p); }
  while (q.length) { const a = q.pop(); for (const p of pylons) { const R = Math.max(fr(a), fr(p)); if (!p.conn && p.bt <= 0 && dist2(a.x, a.y, p.x, p.y) <= R * R) { p.conn = true; q.push(p); } } }
  G.relays = pylons.filter(p => p.conn && p.bt <= 0);
  for (const d of G.devs) d.powered = inField(d.x, d.y, d);
  const lenses = G.devs.filter(d => d.type === DV_IDX.lens && d.bt <= 0);
  for (const d of G.devs) { d.mult = 1; for (const l of lenses) if (l !== d && dist2(l.x, l.y, d.x, d.y) < 260 * 260) d.mult *= 1.3; }
  G.lures = G.devs.filter(d => d.type === DV_IDX.lure && devActive(d));
  G.sancts = G.devs.filter(d => d.type === DV_IDX.sanct && devActive(d));
  G.arenas = G.devs.filter(d => d.type === DV_IDX.arena && devActive(d));
  G.cols = G.devs.filter(d => d.type === DV_IDX.collector && d.bt <= 0 && d.powered);
  G.catchers = G.devs.filter(d => d.type === DV_IDX.catcher && d.bt <= 0 && d.powered);
  G.suns = G.devs.filter(d => d.type === DV_IDX.sun && devActive(d));
  G.labs = G.devs.filter(d => DEVICES[d.type].rs && devActive(d));
  G.nurs = G.devs.filter(d => d.type === DV_IDX.nursery && devActive(d));
}
function inField(x, y, except) {
  if (x * x + y * y <= TOWER_FIELD * TOWER_FIELD) return true;
  if (G.relays) for (const r of G.relays) if (r !== except && dist2(x, y, r.x, r.y) <= r.fr * r.fr) return true;
  return false;
}
function capUsed() { let s = 0; for (const d of G.devs) s += DEVICES[d.type].cost; return s; }
function devUnlocked(type) { return DEVICES[type].tier === 0 || G.unlocked.includes('d' + DEVICES[type].key); }
function canPlace(type, x, y) {
  const def = DEVICES[type];
  if (!devUnlocked(type)) return '需要先在科研站研究';
  if (capUsed() + def.cost > totalCap()) return '建造额度不足（提升潮汐等级可增加）';
  if (G.matter < def.mc) return '物质不足（需要 ' + def.mc + '）';
  if (x * x + y * y < 80 * 80) return '离方塔太近';
  for (const q of G.pois) if (dist2(q.x, q.y, x, y) < 50 * 50) return '离遗迹太近';
  if (!inField(x, y, null)) return '必须建在能量场内（先铺设导能塔）';
  if (isWall(x, y)) return '这里被黑墙挡住了';
  for (let a = 0; a < 6.28; a += 1.05) if (isWall(x + Math.cos(a) * 14, y + Math.sin(a) * 14)) return '这里被黑墙挡住了';
  for (const d of G.devs) if (dist2(d.x, d.y, x, y) < 40 * 40) return '离其他装置太近';
  return '';
}
function totalCap() { return buildCap(G.lv) + poiBonusCap(); }
function placeDev(type, x, y, ang) {
  const def = DEVICES[type]; G.matter = Math.max(0, G.matter - (def.mc || 0));
  const d = { id: G.devId++, type, x, y, ang: ang || 0, bt: def.time, bt0: def.time, powered: true, acc: 0, lastAcc: 0, tt: rnd(), conn: false, mult: 1, n: 0 };
  G.devs.push(d); recomputePower(); emit('place', x, y, type); return d;
}
function removeDev(d) { const k = G.devs.indexOf(d); if (k >= 0) { G.devs.splice(k, 1); G.matter += Math.floor((DEVICES[d.type].mc || 0) * (d.bt > 0 ? 1 : 0.5)); } recomputePower(); }
function onBirth(x, y, s) {
  emit('birth', x, y, s);
  if (G.lv < 1) return;
  for (const d of G.devs) if (d.type === DV_IDX.bell && devActive(d) && dist2(d.x, d.y, x, y) < 200 * 200) { const v = 1 * d.mult; d.acc += v; G.devAcc += v; emit('tidegain', d.x, d.y - 20, v); }
}
function countInR(x, y, R, fn) {
  const g0x = Math.max(0, ((x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((x + R + HALF) / SC) | 0), g0y = Math.max(0, ((y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((y + R + HALF) / SC) | 0), R2 = R * R;
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const c = gy * SN + gx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (j >= cN || cdead[j]) continue; if (dist2(x, y, cx[j], cy[j]) < R2) fn(j); } }
}
function forPInR(x, y, R, bucket, fn) {
  const g0x = Math.max(0, ((x - R + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((x + R + HALF) / SC) | 0), g0y = Math.max(0, ((y - R + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((y + R + HALF) / SC) | 0), R2 = R * R;
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const k = bucket * SNC + gy * SN + gx; for (let q = pStart[k]; q < pStart[k + 1]; q++) { const j = pItems[q]; if (pv[j] === 0) continue; if (dist2(x, y, px[j], py[j]) < R2) fn(j); } }
}
function segCross(ax, ay, bx, by, p0x, p0y, p1x, p1y) {
  const s0 = (bx - ax) * (p0y - ay) - (by - ay) * (p0x - ax), s1 = (bx - ax) * (p1y - ay) - (by - ay) * (p1x - ax);
  if ((s0 > 0) === (s1 > 0) || s0 === 0 && s1 === 0) return false;
  const t0 = (p1x - p0x) * (ay - p0y) - (p1y - p0y) * (ax - p0x), t1 = (p1x - p0x) * (by - p0y) - (p1y - p0y) * (bx - p0x);
  return (t0 > 0) !== (t1 > 0);
}
function segEnds(d) { const L = (DEVICES[d.type].len || 200) / 2, c = Math.cos(d.ang), s = Math.sin(d.ang); return [d.x - c * L, d.y - s * L, d.x + c * L, d.y + s * L]; }
function forCInSeg(d, fn) {
  const [ax, ay, bx, by] = segEnds(d);
  const g0x = Math.max(0, ((Math.min(ax, bx) - 20 + HALF) / SC) | 0), g1x = Math.min(SN - 1, ((Math.max(ax, bx) + 20 + HALF) / SC) | 0), g0y = Math.max(0, ((Math.min(ay, by) - 20 + HALF) / SC) | 0), g1y = Math.min(SN - 1, ((Math.max(ay, by) + 20 + HALF) / SC) | 0);
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) { const c = gy * SN + gx; for (let q = cStart[c]; q < cStart[c + 1]; q++) { const j = cItems[q]; if (j >= cN || cdead[j]) continue; if (segCross(ax, ay, bx, by, cpx[j], cpy[j], cx[j], cy[j])) fn(j); } }
}
function stepDevs(dt) {
  let dirty = false;
  for (const d of G.devs) if (d.bt > 0) { d.bt -= dt; if (d.bt <= 0) { d.bt = 0; emit('built', d.x, d.y, d.type); dirty = true; } }
  if (dirty) recomputePower();
  stepResearch(dt);
  if (G.lv < 1) return; // 潮汐归零：所有装置停机（遗迹）
  for (const d of G.devs) {
    if (!devActive(d)) continue;
    const def = DEVICES[d.type], key = def.key; d.tt += dt;
    if (key === 'census' || key === 'prism' || key === 'elder' || key === 'ark') {
      if (d.tt >= 1) {
        const k = Math.floor(d.tt); d.tt -= k; let v = 0;
        if (key === 'census') { let n = 0; countInR(d.x, d.y, def.r, () => n++); d.n = n; v = n * 0.01 * k; }
        else if (key === 'prism' || key === 'ark') { let m = 0; countInR(d.x, d.y, def.r, j => { m |= 1 << csp[j]; }); let n = 0; while (m) { n += m & 1; m >>>= 1; } d.n = n; v = key === 'prism' ? n * 0.15 * k : (n >= 6 ? 0.6 * k : 0); }
        else { let n = 0; countInR(d.x, d.y, def.r, j => { if (cage[j] > S_life[csp[j]] * 0.6) n++; }); d.n = n; v = n * 0.04 * k; }
        v *= d.mult; d.acc += v; G.devAcc += v;
      }
    } else if (key === 'wire') {
      forCInSeg(d, j => { if (G.t - cwire[j] > 4) { cwire[j] = G.t; const v = 0.5 * d.mult; d.acc += v; G.devAcc += v; d.flash = 0.4; emit('tidegain', cx[j], cy[j], v); } });
    } else if (key === 'barrier') {
      forCInSeg(d, j => { if (S_diet[csp[j]] === D_E) return; cx[j] = cpx[j]; cy[j] = cpy[j]; cvx[j] *= -1; cvy[j] *= -1; d.flash = 0.3; if (cst[j] === ST_HUNT) { cst[j] = ST_REST; ctim[j] = 1; } });
    } else if (key === 'ripen') {
      const add = Math.round(dt * 255 * 3 / RIPEN); let n = 0;
      forPInR(d.x, d.y, def.r, 0, j => { const q = pr[j] + add; pr[j] = q > 255 ? 255 : q; n++; }); d.n = n;
    } else if (key === 'well') {
      const R = def.r;
      for (let b = 0; b < 2; b++) forPInR(d.x, d.y, R, b, j => { const dx = d.x - px[j], dy = d.y - py[j], d2 = dx * dx + dy * dy; if (d2 < 50 * 50) return; const dd = Math.sqrt(d2); pvx[j] += dx / dd * 14 * dt; pvy[j] += dy / dd * 14 * dt; });
    } else if (key === 'pool') {
      if (d.tt >= 1) { const k = Math.floor(d.tt); d.tt -= k; let e = 0, m = 0, a = 0; countInR(d.x, d.y, def.r, j => { const s = csp[j]; if (S_apex[s]) a = 1; else if (S_diet[s] !== D_E) m = 1; else e = 1; }); d.n = e + m + a; const v = d.n * 0.4 * k * d.mult; d.acc += v; G.devAcc += v; }
    } else if (key === 'scare') {
      if (d.tt >= 0.5) { d.tt -= 0.5; let n = 0; countInR(d.x, d.y, def.r, j => { if (S_diet[csp[j]] === D_E) return; n++; fleeFromPt(j, d.x, d.y, 2); }); d.n = n; if (n) d.flash = 0.5; }
    } else if (key === 'stasis') {
      if (d.tt >= 0.5) { d.tt -= 0.5; let n = 0; countInR(d.x, d.y, def.r, j => { cstas[j] = 0.7; n++; }); d.n = n; }
    }
  }
}
function chronBonus() {
  const h = G.popHist; if (h.length < 6) return 0;
  const last = h.slice(-6); const mx = Math.max(...last), mn = Math.min(...last); if (mx < 30) return 0;
  return Math.max(0, 14 * (1 - (mx - mn) / mx / 0.2));
}

/* ===================== 潮汐结算（多样性 × 营养级） ===================== */
function trophic() {
  let e = 0, m = 0, a = 0;
  for (let s = 0; s < NS; s++) if (G.spCount[s] > 0) { if (S_apex[s]) a = 1; else if (S_diet[s] !== D_E) m = 1; else e = 1; }
  return { e, m, a, n: e + m + a };
}
function settle() {
  let N = 0, H = 0; for (let s = 0; s < NS; s++) N += G.spCount[s];
  if (N > 0) for (let s = 0; s < NS; s++) { const p = G.spCount[s] / N; if (p > 0) H -= p * Math.log(p); }
  const eff = N > 0 ? Math.exp(H) : 0, tr = trophic();
  const troph = tr.n > 0 ? 1 + 0.3 * (tr.n - 1) : 1;
  const harm = Math.min(5, (0.5 + 0.25 * eff) * troph);
  G.popHist.push(N); if (G.popHist.length > 60) G.popHist.shift();
  let chron = 0;
  if (G.lv >= 1) for (const d of G.devs) if (d.type === DV_IDX.chron && devActive(d)) { const v = chronBonus() * d.mult; d.acc += v; chron += v; }
  const raw = G.towerAcc + G.devAcc + chron, score = raw * harm, prevLv = G.lv;
  let L = 0; for (let k = MAXLV; k >= 0; k--) if (score >= THRESH[k]) { L = k; break; }
  if (L > G.lv) G.lv = L; else if (L < G.lv) G.lv = G.lv - 1;
  G.lastBreak = { tower: G.towerAcc, dev: G.devAcc + chron, harm, eff, troph, tr, score, pop: N, species: G.spAlive };
  for (const d of G.devs) { d.lastAcc = d.acc; d.acc = 0; }
  G.lastScore = score; G.lastRaw = raw; G.lastHarm = harm;
  G.hist.push({ t: G.t, s: score, lv: G.lv, pop: N }); if (G.hist.length > 120) G.hist.shift();
  G.towerAcc = 0; G.devAcc = 0;
  G.lastFlow = G.flowWin; G.inRate = (G.inRate || 0) * 0.75 + 0.25 * G.flowWin.inE / WINDOW; G.flowWin = { inE: 0, burn: 0, mat: 0 };
  if (G.lv > G.maxLv) G.maxLv = G.lv;
  if (G.lv !== prevLv) { recomputePower(); emit('lv', G.lv, prevLv); }
  emit('settle', score, G.lv, prevLv);
  if (G.lv >= MAXLV && !G.won) { G.won = true; emit('win'); }
}
function unlockUpTo() { // v0.6：只有 tier 0 自带，其它全部靠科研
  for (const s of SPECIES) if (s.tier === 0 && !G.unlocked.includes(s.key)) G.unlocked.push(s.key);
  for (const d of DEVICES) if (d.tier === 0 && !G.unlocked.includes('d' + d.key)) G.unlocked.push('d' + d.key);
}

/* ===================== 召唤（消耗方塔/孵化巢附近的能量，守恒） ===================== */
function gatherLight(x, y, R, need, dry) {
  let got = 0; const list = [];
  for (let b = 1; b >= 0; b--) forPInR(x, y, R, b, j => { if (!dry && got >= need) return; got += pv[j]; list.push(j); });
  if (dry) return got; if (got < need) return 0;
  let rem = need; for (const j of list) { const take = Math.min(pv[j], rem); pv[j] -= take; rem -= take; if (rem <= 0) break; }
  return need;
}
function summonErr(s) {
  const sp = SPECIES[s];
  if (!G.unlocked.includes(sp.key)) return '尚未解锁';
  if (cN >= MAXC) return '生物数量已达上限';
  if (G.orb.tank < sp.cost) return '白球能量不足（需要 ' + sp.cost + '）';
  if (G.matter < sp.mcost) return '物质不足（需要 ' + sp.mcost + '）';
  return '';
}
// 召唤：白球能量槽里的能量凝聚成生物（+ 高级生物需要物质）
function summon(s, at) {
  const sp = SPECIES[s], err = summonErr(s); if (err) return err;
  const x0 = at ? at.x : 0, y0 = at ? at.y : 0;
  G.orb.tank -= sp.cost; G.matter -= sp.mcost;
  const a = rnd() * 6.2832, rr = at ? 30 : TOWER_R + 30;
  let x = x0 + Math.cos(a) * rr, y = y0 + Math.sin(a) * rr; if (isWall(x, y)) { x = x0; y = y0; }
  const i = newC(s, x, y, sp.cost, 0); cage[i] = sp.mature * 0.6; cvx[i] = Math.cos(a) * 80; cvy[i] = Math.sin(a) * 80; crep[i] = sp.mature * 0.3;
  G.summons = (G.summons || 0) + 1; emit('summon', x, y, s);
  return '';
}

/* ===================== 能量账本 ===================== */
function ledger() {
  let ripe = 0, raw = 0, c = 0;
  for (let i = 0; i < pN; i++) { if (pr[i] === 255) ripe += pv[i]; else raw += pv[i]; }
  for (let i = 0; i < cN; i++) if (!cdead[i]) c += ce[i];
  return { map: ripe + raw, ripe, raw, bio: c, sealed: G.wallSealed, total: ripe + raw + c + G.wallSealed };
}

/* ===================== 主步进 ===================== */
function simStep(dt) {
  G.frame++;
  buildPGrid(); buildCGrid();
  stepDevs(dt); stepPOIs(dt); stepC(dt); stepP(dt); stepOrb(dt); stepW(dt); stepM(dt);
  compactP(); compactC();
  G.spCount.fill(0); for (let i = 0; i < cN; i++) G.spCount[csp[i]]++;
  let alive = 0; for (let s = 0; s < NS; s++) if (G.spCount[s] > 0) alive++;
  if (G._lastCount) for (let s = 0; s < NS; s++) if (G.spCount[s] === 0 && G._lastCount[s] > 0) emit('extinct', s);
  G._lastCount = G._lastCount || new Int32Array(NS); G._lastCount.set(G.spCount);
  G.spAlive = alive;
  G.towerAcc += (0.1 * alive + 0.001 * Math.min(cN, 3000)) * dt;
  G.t += dt; G.wt += dt;
  if (G.wt >= WINDOW) { G.wt -= WINDOW; settle(); }
}
function newGame(seed) {
  Object.assign(G, { t: 0, lv: 0, wt: 0, towerAcc: 0, devAcc: 0, lastScore: 0, hist: [], popHist: [], devs: [], devId: 1, nextId: 1, births: 0, deaths: 0, starve: 0, oldDeaths: 0, eaten: 0, fights: 0, won: false, summons: 0, lastBreak: null, wallBroken: 0, _lastCount: null, matter: 20, flow: { spray: 0, gen: 0, burn: 0, mat: 0 }, flowWin: { inE: 0, burn: 0, mat: 0 }, lastFlow: { inE: 0, burn: 0, mat: 0 } });
  G.orb.x = 0; G.orb.y = 70; G.orb.vx = G.orb.vy = 0; G.orb.hp = 100; G.orb.dead = 0; G.orb.tank = 60; G.orb.sprAcc = 0; G.orb.absorbed = 0; wN = 0; G.rp = 0; G.resT = ''; G.rpRate = 0; G.wAcc = 0; G.expR = START_R;
  G.open0 = 0; genWorld(seed || ((Math.random() * 1e9) | 0));
  unlockUpTo(); recomputePower();
  for (let k = 0; k < 34; k++) spawnWisp();
}
