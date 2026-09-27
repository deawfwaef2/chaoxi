/* ===================== 渲染 ===================== */
const CAM = { x: 0, y: 0, z: 1, tz: 1, W: 800, H: 600, dpr: 1 };
let cvs, ctx, floorC, floorG, floorImg, floor32, rimC, rimG, pbC, pbG, pbImg, pb32, pbW = 0, pbH = 0, accL, accE;
let floorDirty = true, rimDirty = true, rimT = 0;
const FX = [];
const LOD = { lodPx: 2.6, avg: 8 };
const DEV_COL = ['#7fe8ff', '#8fffd0', '#9fd0ff', '#ffb070', '#b890ff', '#ff9ff0', '#ffe08a', '#ff8fa8', '#ffd0a0', '#a0c8ff', '#ff7a7a', '#d0ffa0', '#ffffff', '#ffc8ff', '#fff2b0'];

function initRender(canvas) {
  cvs = canvas; ctx = cvs.getContext('2d', { alpha: false });
  floorC = document.createElement('canvas'); floorC.width = floorC.height = GN; floorG = floorC.getContext('2d');
  floorImg = floorG.createImageData(GN, GN); floor32 = new Uint32Array(floorImg.data.buffer);
  rimC = document.createElement('canvas'); rimC.width = rimC.height = GN; rimG = rimC.getContext('2d');
  pbC = document.createElement('canvas'); pbG = pbC.getContext('2d');
  resize();
  for (let i = 0; i < GN * GN; i++) paintCell(i);
  floorDirty = true; rimDirty = true;
}
function resize() {
  CAM.dpr = Math.min(window.devicePixelRatio || 1, 2); CAM.W = innerWidth; CAM.H = innerHeight;
  cvs.width = Math.round(CAM.W * CAM.dpr); cvs.height = Math.round(CAM.H * CAM.dpr);
  pbW = Math.ceil(CAM.W / 2); pbH = Math.ceil(CAM.H / 2); pbC.width = pbW; pbC.height = pbH;
  pbImg = pbG.createImageData(pbW, pbH); pb32 = new Uint32Array(pbImg.data.buffer); accL = new Uint16Array(pbW * pbH); accE = new Uint16Array(pbW * pbH);
}
function paintCell(i) {
  const gx = i % GN, gy = (i / GN) | 0, x = (gx + 0.5) * CELL - HALF, y = (gy + 0.5) * CELL - HALF, d = Math.hypot(x, y);
  const h = whp[i];
  if (h <= 0) {
    const t = Math.min(1, d / 2600), n = ((gx * 73856093 ^ gy * 19349663) >>> 0) % 7;
    const r = Math.round(18 - 9 * t + n * 0.6), g = Math.round(34 - 16 * t + n * 0.8), b = Math.round(62 - 26 * t + n);
    floor32[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  } else if (h === Infinity) floor32[i] = 0;
  else { const dm = 1 - h / wMax[i]; floor32[i] = dm > 0.02 ? ((Math.round(dm * 200) << 24) | (60 << 16) | (20 << 8) | 90) : 0; }
}
function flushFloor() {
  if (WALL_DIRTY.length) { for (const i of WALL_DIRTY) { paintCell(i); if (whp[i] <= 0) rimDirty = true; } WALL_DIRTY.length = 0; floorDirty = true; }
  if (floorDirty) { floorG.putImageData(floorImg, 0, 0); floorDirty = false; }
  if (rimDirty && performance.now() - rimT > 300) {
    rimT = performance.now(); rimDirty = false;
    rimG.globalCompositeOperation = 'source-over'; rimG.clearRect(0, 0, GN, GN); rimG.globalAlpha = 0.22;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0], [-2, 0], [2, 0], [0, 2], [0, -2]]) rimG.drawImage(floorC, ox, oy);
    rimG.globalAlpha = 1; rimG.globalCompositeOperation = 'source-in'; rimG.fillStyle = '#4fd8ff'; rimG.fillRect(0, 0, GN, GN); rimG.globalCompositeOperation = 'source-over';
  }
}
function w2s(x, y) { return [(x - CAM.x) * CAM.z + CAM.W / 2, (y - CAM.y) * CAM.z + CAM.H / 2]; }
function s2w(sx, sy) { return [(sx - CAM.W / 2) / CAM.z + CAM.x, (sy - CAM.H / 2) / CAM.z + CAM.y]; }
function worldT() { const k = CAM.z * CAM.dpr; ctx.setTransform(k, 0, 0, k, (CAM.W / 2 - CAM.x * CAM.z) * CAM.dpr, (CAM.H / 2 - CAM.y * CAM.z) * CAM.dpr); }

function addFX(type, x, y, o) { if (FX.length > 260) FX.shift(); FX.push(Object.assign({ type, x, y, t: 0, life: 1 }, o || {})); }

function render(realDt, ui) {
  const t0 = performance.now();
  const W = CAM.W, H = CAM.H, dpr = CAM.dpr, z = CAM.z;
  flushFloor();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  const x0 = CAM.x - W / 2 / z, y0 = CAM.y - H / 2 / z, x1 = CAM.x + W / 2 / z, y1 = CAM.y + H / 2 / z;
  // 地面 + 边缘光
  worldT(); ctx.imageSmoothingEnabled = true;
  const gx0 = Math.max(0, Math.floor((x0 + HALF) / CELL) - 2), gy0 = Math.max(0, Math.floor((y0 + HALF) / CELL) - 2), gx1 = Math.min(GN, Math.ceil((x1 + HALF) / CELL) + 2), gy1 = Math.min(GN, Math.ceil((y1 + HALF) / CELL) + 2);
  if (gx1 > gx0 && gy1 > gy0) {
    const sx = gx0 * CELL - HALF, sy = gy0 * CELL - HALF, sw = (gx1 - gx0) * CELL, sh = (gy1 - gy0) * CELL;
    const pulse = 0.55 + 0.25 * Math.sin(G.t * 0.8);
    ctx.globalAlpha = pulse * (G.lv > 0 ? 1 : 0.5); ctx.drawImage(rimC, gx0, gy0, gx1 - gx0, gy1 - gy0, sx, sy, sw, sh); ctx.globalAlpha = 1;
    ctx.drawImage(floorC, gx0, gy0, gx1 - gx0, gy1 - gy0, sx, sy, sw, sh);
  }
  // 地面网格点（科技感）
  if (z > 0.5) {
    ctx.fillStyle = 'rgba(120,180,255,0.07)'; const step = 96; const ax = Math.floor(x0 / step) * step, ay = Math.floor(y0 / step) * step; ctx.beginPath();
    for (let x = ax; x < x1; x += step) for (let y = ay; y < y1; y += step) ctx.rect(x - 1.5, y - 1.5, 3, 3); ctx.fill();
  }
  // 能量场（建造模式）
  if (ui.build >= 0 || ui.showField) drawFields();
  // 装置底座 & 连线
  drawPylonLinks();
  for (const d of G.devs) if (d.x > x0 - 300 && d.x < x1 + 300 && d.y > y0 - 300 && d.y < y1 + 300) drawDevice(d, false);
  // 能量粒子（半分辨率发光缓冲）
  drawParticles(x0, y0, x1, y1);
  worldT();
  // 生物
  drawCreatures(x0, y0, x1, y1, ui);
  // 装置顶部效果
  for (const d of G.devs) if (d.x > x0 - 300 && d.x < x1 + 300 && d.y > y0 - 300 && d.y < y1 + 300) drawDevice(d, true);
  drawTower();
  drawOrb(ui);
  // 建造虚影
  if (ui.build >= 0 && ui.ghost) drawGhost(ui);
  drawFX(realDt);
  const dtR = performance.now() - t0; LOD.avg = LOD.avg * 0.95 + dtR * 0.05;
  if (LOD.avg > 16 && LOD.lodPx < 7) LOD.lodPx += 0.05; else if (LOD.avg < 9 && LOD.lodPx > 2.6) LOD.lodPx -= 0.02;
}

function drawParticles(x0, y0, x1, y1) {
  const z = CAM.z, W = CAM.W, H = CAM.H, hx = CAM.x, hy = CAM.y;
  accL.fill(0); accE.fill(0);
  const k = z * 0.5, ox = W / 4 - hx * k, oy = H / 4 - hy * k, bw = pbW, bh = pbH;
  const big = z > 1.1, huge = z > 2.2;
  for (let i = 0; i < pN; i++) {
    const v = pv[i]; if (v === 0) continue;
    const bx = (px[i] * k + ox) | 0, by = (py[i] * k + oy) | 0;
    if (bx < 1 || by < 1 || bx >= bw - 1 || by >= bh - 1) continue;
    const a = pt[i] === 0 ? accL : accE, idx = by * bw + bx, w = v > 6 ? 6 : v;
    a[idx] += 3 * w;
    if (big) { a[idx - 1] += w; a[idx + 1] += w; a[idx - bw] += w; a[idx + bw] += w; if (huge) { a[idx - bw - 1] += w; a[idx - bw + 1] += w; a[idx + bw - 1] += w; a[idx + bw + 1] += w; } }
  }
  const dim = G.lv > 0 ? 1 : 0.75;
  for (let i = 0, n = bw * bh; i < n; i++) {
    const l = accL[i], e = accE[i];
    if ((l | e) === 0) { pb32[i] = 0; continue; }
    const lf = l > 40 ? 40 : l, ef = e > 40 ? 40 : e;
    let r = lf * 12 * dim + ef * 30, g = lf * 30 * dim + ef * 17, b = lf * 34 * dim + ef * 7;
    if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
    pb32[i] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
  pbG.putImageData(pbImg, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(pbC, 0, 0, bw, bh, 0, 0, bw * 2 * CAM.dpr, bh * 2 * CAM.dpr);
  ctx.globalCompositeOperation = 'source-over';
}

function drawCreatures(x0, y0, x1, y1, ui) {
  const z = CAM.z, k = z * CAM.dpr, t = G.t, offx = (CAM.W / 2 - CAM.x * z) * CAM.dpr, offy = (CAM.H / 2 - CAM.y * z) * CAM.dpr;
  const lod = LOD.lodPx; let dots = null;
  for (let i = 0; i < cN; i++) {
    if (cdead[i]) continue;
    const s = csp[i], r = S_r[s], x = cx[i], y = cy[i];
    if (x < x0 - r * 3 || x > x1 + r * 3 || y < y0 - r * 3 || y > y1 + r * 3) continue;
    const pxs = r * z;
    if (pxs < lod) { (dots || (dots = []))[s] = (dots[s] || []); dots[s].push(i); continue; }
    const sp = SPECIES[s], mv = sp.mv;
    // Q弹动画：挤压拉伸 + 弹跳
    const vx = cvx[i], vy = cvy[i], spd = Math.hypot(vx, vy), ph = cph[i];
    let sx = 1 + Math.sin(ph * 2) * 0.05, sy = 1 - Math.sin(ph * 2) * 0.05, yo = 0;
    if (mv === MV_HOP) { const hp = Math.max(0, Math.min(1, 1 - chop[i] / 0.55)); const hh = Math.sin(hp * Math.PI); yo = -hh * r * (spd > 15 ? 1.1 : 0.2); const sq = hp > 0.85 || hp < 0.1 ? 0.15 : -0.08 * hh; sx = 1 + sq; sy = 1 - sq; }
    else if (mv === MV_FLY || mv === MV_FLOAT || mv === MV_ORBIT) { yo = Math.sin(t * 3 + ph) * r * 0.25; }
    else { const b = Math.abs(Math.sin(ph * 1.5)); yo = -b * r * 0.18 * Math.min(1, spd / 20); sx += (1 - b) * 0.06 * Math.min(1, spd / 20); sy -= (1 - b) * 0.06 * Math.min(1, spd / 20); }
    if (cmood[i] > 0) { const q = Math.sin(cmood[i] * 12) * 0.12 * Math.min(1, cmood[i]); sx += q; sy -= q; }
    // 表情
    let v = 0; const st = cst[i];
    if (st === ST_FLEE) v = 4; else if (cage[i] > S_life[s] * 0.75) v = 2; else if (cmood[i] > 0 || st === ST_MATE) v = 3;
    if (v !== 4 && ((t * 0.8 + cid[i] * 0.37) % 3.7) < 0.13) v = 1;
    const face = vx < -2 ? -1 : 1;
    const ds = r / SPR_BODY, dpx = ds * k; const mip = dpx > 90 ? 0 : dpx > 45 ? 1 : dpx > 22 ? 2 : 3;
    const img = SPRITES[s][v][mip];
    ctx.setTransform(k * sx * face, 0, 0, k * sy, x * k + offx, (y + yo + r * 0.3 * (1 - sy)) * k + offy);
    ctx.drawImage(img, -ds / 2, -ds / 2, ds, ds);
  }
  if (dots) {
    worldT();
    for (let s = 0; s < NS; s++) { const L = dots[s]; if (!L) continue; ctx.fillStyle = SPECIES[s].col; ctx.beginPath(); const r = Math.max(S_r[s], 2.2 / z); for (const i of L) ctx.rect(cx[i] - r, cy[i] - r, r * 2, r * 2); ctx.fill(); }
  }
  worldT();
  // 选中
  if (ui.sel >= 0) { const i = ui.sel; const r = S_r[csp[i]]; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 5 / z]); ctx.lineDashOffset = -t * 20 / z; ctx.beginPath(); ctx.arc(cx[i], cy[i], r * 1.7 + 4, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
}

function drawFields() {
  ctx.fillStyle = 'rgba(80,190,255,0.07)'; ctx.strokeStyle = 'rgba(110,210,255,0.35)'; ctx.lineWidth = 1.5 / CAM.z;
  ctx.beginPath(); ctx.arc(0, 0, TOWER_FIELD, 0, 7); ctx.fill(); ctx.stroke();
  for (const p of G.devs) if (p.type === D_PYLON && p.conn) { ctx.beginPath(); ctx.arc(p.x, p.y, PYLON_FIELD, 0, 7); ctx.fill(); ctx.stroke(); }
  for (const p of G.devs) if (p.type === D_PYLON && !p.conn) { ctx.strokeStyle = 'rgba(255,200,120,0.3)'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(p.x, p.y, PYLON_FIELD, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(110,210,255,0.35)'; }
}
function drawPylonLinks() {
  const on = G.lv >= 1; ctx.lineCap = 'round';
  const pyl = G.devs.filter(d => d.type === D_PYLON && d.bt <= 0 && d.conn);
  for (const a of pyl) {
    const ends = [];
    if (Math.hypot(a.x, a.y) <= TOWER_FIELD) ends.push([0, 0]);
    for (const b of pyl) if (b.id < a.id && dist2(a.x, a.y, b.x, b.y) <= PYLON_FIELD * PYLON_FIELD) ends.push([b.x, b.y]);
    for (const [bx, by] of ends) {
      ctx.strokeStyle = on ? 'rgba(120,230,255,0.25)' : 'rgba(120,120,130,0.18)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bx, by); ctx.stroke();
      if (on) { ctx.strokeStyle = 'rgba(200,250,255,0.6)'; ctx.lineWidth = 1.2; ctx.setLineDash([10, 16]); ctx.lineDashOffset = -G.t * 40; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]); }
    }
  }
}
function hexPath(x, y, r, rot) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
function drawDevice(d, top) {
  const def = DEVICES[d.type], key = def.key, act = devActive(d), building = d.bt > 0, t = G.t, z = CAM.z;
  const col = act ? DEV_COL[d.type] : building ? '#7fb8ff' : '#6d6f78';
  const x = d.x, y = d.y;
  if (!top) {
    // 作用范围
    if (def.r && key !== 'pylon' && (act || building) && z > 0.25) { ctx.strokeStyle = act ? col : 'rgba(127,184,255,0.5)'; ctx.globalAlpha = 0.16; ctx.lineWidth = 2 / z; ctx.setLineDash([12 / z, 10 / z]); ctx.lineDashOffset = t * 8 * (d.id % 2 ? 1 : -1); ctx.beginPath(); ctx.arc(x, y, def.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    if (key === 'wire' || key === 'barrier') {
      const [ax, ay, bx, by] = segEnds(d);
      if (act) {
        const fl = d.flash > 0 ? d.flash : 0; if (d.flash > 0) d.flash -= 1 / 60;
        const c = key === 'wire' ? '143,255,208' : '255,122,122';
        ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(${c},${0.18 + fl})`; ctx.lineWidth = 8 + fl * 10; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.strokeStyle = `rgba(${c},0.9)`; ctx.lineWidth = 1.6; if (key === 'barrier') { ctx.setLineDash([6, 4]); ctx.lineDashOffset = t * 30; } ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      } else { ctx.strokeStyle = 'rgba(140,140,150,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]); }
      for (const [qx, qy] of [[ax, ay], [bx, by]]) { ctx.fillStyle = act ? '#1b2a3c' : '#2a2a2e'; hexPath(qx, qy, 8, t * 0.5 * (act ? 1 : 0)); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(qx, qy, 3, 0, 7); ctx.fill(); }
    }
    // 六边形底座
    const g = ctx.createLinearGradient(x, y - 18, x, y + 18); g.addColorStop(0, act ? '#2c3e58' : '#35353b'); g.addColorStop(1, act ? '#0e1622' : '#18181b');
    ctx.fillStyle = g; hexPath(x, y + 3, 17, Math.PI / 6); ctx.fill(); ctx.strokeStyle = act ? col : '#55575f'; ctx.globalAlpha = act ? 0.8 : 0.6; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    if (!act && !building) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 10, y - 4); ctx.lineTo(x - 2, y + 3); ctx.lineTo(x - 5, y + 12); ctx.moveTo(x + 7, y - 9); ctx.lineTo(x + 3, y); ctx.stroke(); }
    return;
  }
  ctx.save(); ctx.translate(x, y);
  if (building) { ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 6); }
  if (!act && !building) ctx.rotate(0.12);
  const bob = act ? Math.sin(t * 2 + d.id) * 2.5 : 0, glow = act ? 1 : 0;
  const glowDot = (gx, gy, r) => { if (!glow) return; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill(); ctx.globalAlpha = building ? 0.6 : 1; ctx.globalCompositeOperation = 'source-over'; };
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  switch (key) {
    case 'pylon': {
      glowDot(0, -14 + bob, 20);
      const g = ctx.createLinearGradient(-7, -30, 7, 0); g.addColorStop(0, act ? '#e8fdff' : '#8a8a92'); g.addColorStop(1, act ? col : '#4a4a50');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -32 + bob); ctx.lineTo(8, -14 + bob); ctx.lineTo(0, 2 + bob); ctx.lineTo(-8, -14 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (act) for (let k = 0; k < 3; k++) { const a = t * 1.5 + k * 2.09; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.cos(a) * 14, -14 + bob + Math.sin(a) * 5, 1.8, 0, 7); ctx.fill(); }
      break; }
    case 'wire': { glowDot(0, -6, 14); ctx.beginPath(); ctx.arc(0, -6 + bob, 6, 0, 7); ctx.stroke(); ctx.fillStyle = act ? '#eafff6' : '#777'; ctx.beginPath(); ctx.arc(0, -6 + bob, 3, 0, 7); ctx.fill(); break; }
    case 'census': {
      glowDot(0, -10, 22); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -10 + bob, 14, 5, 0, 0, 7); ctx.stroke();
      ctx.save(); ctx.translate(0, -10 + bob); ctx.rotate(act ? t : 0); ctx.beginPath(); ctx.ellipse(0, 0, 9, 14, 0, 0, 7); ctx.stroke(); ctx.restore();
      ctx.fillStyle = act ? '#fff' : '#888'; ctx.beginPath(); ctx.arc(0, -10 + bob, 3.5, 0, 7); ctx.fill();
      if (act && z > 0.4 && d.n) { ctx.fillStyle = 'rgba(200,230,255,0.9)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.n, 0, -30 + bob); }
      break; }
    case 'conv': {
      glowDot(0, -10, 22); ctx.fillStyle = act ? '#3a2418' : '#333'; ctx.beginPath(); ctx.moveTo(-11, 2); ctx.lineTo(-8, -20); ctx.lineTo(8, -20); ctx.lineTo(11, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (act) for (let k = 0; k < 6; k++) { const a = t * 3 + k * 1.05, rr = 4 + (k % 3) * 2; ctx.fillStyle = k % 2 ? '#ffb070' : '#9ff4ff'; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, -10 + Math.sin(a) * rr * 0.6, 1.6, 0, 7); ctx.fill(); }
      break; }
    case 'well': {
      if (act) for (let k = 0; k < 3; k++) { const p = ((t * 0.5 + k / 3) % 1), rr = 40 * (1 - p); ctx.globalAlpha = p * 0.5; ctx.beginPath(); ctx.arc(0, -4, rr, 0, 7); ctx.stroke(); } ctx.globalAlpha = building ? 0.6 : 1;
      ctx.fillStyle = '#05060c'; ctx.beginPath(); ctx.arc(0, -6 + bob, 8, 0, 7); ctx.fill(); ctx.stroke(); glowDot(0, -6 + bob, 16); break; }
    case 'prism': {
      glowDot(0, -14, 24); ctx.save(); ctx.translate(0, -14 + bob); ctx.rotate(act ? t * 0.8 : 0);
      const cols = ['#ff8fa8', '#ffe08a', '#8fffd0', '#8fb8ff'];
      for (let k = 0; k < 3; k++) { ctx.fillStyle = act ? cols[k] : ['#666', '#777', '#555'][k]; ctx.globalAlpha = (building ? 0.5 : 0.85); ctx.beginPath(); ctx.moveTo(0, 0); const a = k * 2.094; ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.lineTo(Math.cos(a + 2.094) * 13, Math.sin(a + 2.094) * 13); ctx.closePath(); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = building ? 0.6 : 1; break; }
    case 'bell': {
      glowDot(0, -14, 22); ctx.fillStyle = act ? '#fff2c0' : '#777'; ctx.beginPath(); ctx.moveTo(-10, -4 + bob); ctx.quadraticCurveTo(-10, -26 + bob, 0, -26 + bob); ctx.quadraticCurveTo(10, -26 + bob, 10, -4 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (act) { const p = (t * 0.7) % 1; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(0, -14, 14 + p * 30, -2.6, -0.5); ctx.stroke(); ctx.globalAlpha = 1; }
      break; }
    case 'lure': {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke(); glowDot(0, -28, 20 + (act ? Math.sin(t * 4) * 6 : 0)); ctx.fillStyle = act ? '#ffe0ea' : '#888'; ctx.beginPath(); ctx.arc(0, -28, 4.5, 0, 7); ctx.fill();
      if (act) { const p = (t * 0.6) % 1; ctx.globalAlpha = (1 - p) * 0.6; ctx.beginPath(); ctx.arc(0, -28, p * 60, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; } break; }
    case 'nest': {
      glowDot(0, -8, 20); ctx.fillStyle = act ? '#3b2a20' : '#333'; ctx.beginPath(); ctx.ellipse(0, -2, 14, 7, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = act ? '#fff4e0' : '#999'; ctx.beginPath(); ctx.ellipse(0, -10 + bob * 0.3, 7, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = act ? '#ffc0d8' : '#777'; ctx.beginPath(); ctx.arc(-2, -12 + bob * 0.3, 1.8, 0, 7); ctx.arc(3, -8 + bob * 0.3, 1.4, 0, 7); ctx.fill(); break; }
    case 'stasis': {
      if (act) { ctx.globalAlpha = 0.08; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, def.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      glowDot(0, -12, 20); ctx.beginPath(); ctx.moveTo(-8, -26 + bob); ctx.lineTo(8, -26 + bob); ctx.lineTo(-8, 0 + bob); ctx.lineTo(8, 0 + bob); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = act ? '#e0f0ff' : '#888'; ctx.beginPath(); ctx.moveTo(-4, -4 + bob); ctx.lineTo(4, -4 + bob); ctx.lineTo(0, -10 + bob); ctx.fill(); break; }
    case 'barrier': { glowDot(0, -8, 16); ctx.fillStyle = act ? '#3a1c22' : '#333'; hexPath(0, -8 + bob, 9, t * (act ? 1 : 0)); ctx.fill(); ctx.stroke(); break; }
    case 'chron': {
      glowDot(0, -20, 22); ctx.fillStyle = act ? '#1a2a1c' : '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-5, -38); ctx.lineTo(0, -44); ctx.lineTo(5, -38); ctx.lineTo(7, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (act) { const h = G.popHist.slice(-8), mx = Math.max(1, ...h); h.forEach((v, k) => { ctx.fillStyle = col; ctx.fillRect(-4 + k, -4 - v / mx * 30, 0.8, v / mx * 30); }); } break; }
    case 'lens': {
      glowDot(0, -18, 26); ctx.lineWidth = 3; ctx.save(); ctx.translate(0, -18 + bob); ctx.rotate(act ? Math.sin(t) * 0.5 : 0.3); ctx.beginPath(); ctx.ellipse(0, 0, 15, 15 * (act ? Math.abs(Math.cos(t * 0.7)) * 0.7 + 0.3 : 0.5), 0, 0, 7); ctx.stroke(); ctx.restore(); break; }
    case 'elder': {
      glowDot(0, -24, 22); ctx.fillStyle = act ? '#2e2034' : '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(0, -46 + bob); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (act) for (let k = 0; k < 3; k++) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, -46 + bob, 5 + ((t * 10 + k * 8) % 24), 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; break; }
    case 'ark': {
      glowDot(0, -20, 30); ctx.fillStyle = act ? '#20242e' : '#2a2a2a'; ctx.fillRect(-10, -42, 20, 44); ctx.strokeRect(-10, -42, 20, 44);
      if (act) for (let k = 0; k < 6; k++) { ctx.fillStyle = SPECIES[(k + Math.floor(t)) % NS].col; ctx.beginPath(); ctx.arc(0, -36 + k * 6.5, 2, 0, 7); ctx.fill(); } break; }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  if (building) { // 建造进度环
    const p = 1 - d.bt / d.bt0; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y + 3, 24, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#8fd8ff'; ctx.beginPath(); ctx.arc(x, y + 3, 24, -Math.PI / 2, -Math.PI / 2 + p * 6.283); ctx.stroke();
    if (CAM.z > 0.5) { ctx.fillStyle = '#cfe8ff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(d.bt) + 's', x, y + 42); }
  } else if (!d.powered && CAM.z > 0.4) { ctx.fillStyle = '#ffb080'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('无能量场', x, y + 34); }
}

function drawTower() {
  const t = G.t, lv = G.lv, col = LV_COLORS[lv], on = lv > 0;
  // 光环
  ctx.save();
  const pulse = G._pulse || 0;
  if (pulse > 0) { ctx.strokeStyle = col; ctx.globalAlpha = pulse; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 60 + (1 - pulse) * 500, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 90 + lv * 12); g.addColorStop(0, on ? col : '#445'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = on ? 0.35 + 0.05 * Math.sin(t * 2) : 0.12; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 90 + lv * 12, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // 底座
  const bg = ctx.createLinearGradient(0, -40, 0, 40); bg.addColorStop(0, '#26344a'); bg.addColorStop(1, '#0a1018');
  ctx.fillStyle = bg; hexPath(0, 8, 44, 0); ctx.fill(); ctx.strokeStyle = on ? col : '#556'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#121a26'; hexPath(0, 4, 32, 0); ctx.fill(); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
  // 环（数量 = 等级）
  for (let k = 0; k < lv; k++) {
    ctx.save(); ctx.translate(0, -30); ctx.rotate(t * (0.3 + k * 0.07) * (k % 2 ? -1 : 1)); ctx.strokeStyle = LV_COLORS[k + 1]; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 34 + k * 5, (34 + k * 5) * 0.32, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = LV_COLORS[k + 1]; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(34 + k * 5, 0, 2.2, 0, 7); ctx.fill(); ctx.restore();
  }
  // 悬浮方晶（方塔核心）
  const bob = on ? Math.sin(t * 1.3) * 4 : 0, cy = -34 + bob, s = 20 + lv * 0.8;
  ctx.save(); ctx.translate(0, cy); ctx.rotate(on ? t * 0.25 : 0.1);
  const cg = ctx.createLinearGradient(-s, -s, s, s); cg.addColorStop(0, on ? '#ffffff' : '#9098a8'); cg.addColorStop(0.5, on ? col : '#556070'); cg.addColorStop(1, on ? '#102040' : '#1a1e26');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.3); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = on ? '#fff' : '#889'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s * 1.3); ctx.lineTo(0, s * 1.3); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
  // 光柱
  if (lv >= 3) { const bgc = ctx.createLinearGradient(0, cy, 0, cy - 260 - lv * 30); bgc.addColorStop(0, col); bgc.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); ctx.fillStyle = bgc; ctx.fillRect(-4 - lv * 0.6, cy - 260 - lv * 30, 8 + lv * 1.2, 260 + lv * 30); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (!on) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-2, cy - 20, 1.5, 30); }
  ctx.restore();
}
function drawOrb(ui) {
  const o = G.orb; if (o.dead > 0) { const p = o.dead / 2.5; ctx.globalAlpha = p * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x, o.y, 14 + (1 - p) * 30, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return; }
  const t = G.t;
  const g = ctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, 44); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.3, 'rgba(200,240,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, 44, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x, o.y, 11 + Math.sin(t * 4) * 0.8, 0, 7); ctx.fill();
  if (o.attract) { ctx.strokeStyle = 'rgba(160,240,255,0.5)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const p = 1 - ((t * 1.2 + k / 3) % 1); ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(o.x, o.y, 20 + p * 170, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; }
  if (o.hp < 100) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, 20, 0, 7); ctx.stroke(); ctx.strokeStyle = o.hp > 40 ? '#bff' : '#ff8a8a'; ctx.beginPath(); ctx.arc(o.x, o.y, 20, -Math.PI / 2, -Math.PI / 2 + o.hp / 100 * 6.283); ctx.stroke(); }
  if (o.drill) { for (let k = 0; k < 3; k++) { const a = rnd() * 6.28; ctx.fillStyle = rnd() < 0.5 ? '#fff' : '#ff9ad0'; ctx.fillRect(o.x + Math.cos(a) * 16, o.y + Math.sin(a) * 16, 2, 2); } }
}
function drawGhost(ui) {
  const [x, y] = ui.ghost, def = DEVICES[ui.build]; const err = canPlace(ui.build, x, y);
  ctx.globalAlpha = 0.6; const col = err ? '#ff7a7a' : '#8fffd0';
  ctx.strokeStyle = col; ctx.lineWidth = 2 / CAM.z; hexPath(x, y + 3, 17, Math.PI / 6); ctx.stroke();
  if (def.r) { ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(x, y, def.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (def.len) { const [ax, ay, bx, by] = segEnds({ x, y, ang: ui.ang, type: ui.build }); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = col; ctx.font = (13 / CAM.z) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(err || def.name, x, y - 36 / Math.max(0.6, CAM.z));
}
function drawFX(dt) {
  for (let k = FX.length - 1; k >= 0; k--) {
    const f = FX[k]; f.t += dt; const p = f.t / f.life; if (p >= 1) { FX.splice(k, 1); continue; }
    if (f.type === 'text') { ctx.globalAlpha = 1 - p; ctx.fillStyle = f.color || '#8fffd0'; ctx.font = 'bold ' + (12 / Math.max(0.5, CAM.z)) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y - p * 30); }
    else if (f.type === 'ring') { ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = 2 / CAM.z; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r0 || 5) + p * (f.r || 40), 0, 7); ctx.stroke(); }
    else if (f.type === 'heart') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#ff8fb8'; const s = 4 + p * 3, x = f.x, y = f.y - p * 26; ctx.beginPath(); ctx.moveTo(x, y + s * 0.8); ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.2, x, y - s * 0.4); ctx.bezierCurveTo(x + s * 0.5, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.8); ctx.fill(); }
    else if (f.type === 'puff') { ctx.globalAlpha = (1 - p) * 0.7; ctx.fillStyle = f.color || '#fff'; for (let q = 0; q < 6; q++) { const a = q * 1.047 + f.x; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * p * 18, f.y + Math.sin(a) * p * 18, 3 * (1 - p) + 1, 0, 7); ctx.fill(); } }
  }
  ctx.globalAlpha = 1;
}
