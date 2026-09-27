/* ===================== 渲染 v0.4（有机地面 + 边缘辉光 + 星点能量 + 泛光 + 暗角） ===================== */
const CAM = { x: 0, y: 0, z: 1, tz: 1, W: 800, H: 600, dpr: 1, shake: 0 };
let cvs, ctx, floorC, floorG, floorImg, floor32, pbC, pbG, pbImg, pb32, pbW = 0, pbH = 0, accR, accU, bloomC, bloomG;
let floorDirty = true, rimDirty = true, rimT = 0;
const FS = 4, FW = GN * FS, RS = 2, RW = GN * RS; // 高清地面 4px/格；辉光 2px/格
let nebC = null, maskC, maskG, hiC, hiG, rimC, rimG, invC, invG, vigC = null, runeC = null, starSpr = null, glowSpr = null;
let hiDirty = null; // 需要重绘的格子范围 [gx0,gy0,gx1,gy1]
const FX = [];
const MOTES = [];
const LOD = { lodPx: 2.6, avg: 8, maxSpr: 4000, nSpr: 0, fAvg: 16, stars: 1400 };
const DEV_COL = ['#7fe8ff', '#8fffd0', '#9fd0ff', '#dffcff', '#b890ff', '#ff9ff0', '#ffd27a', '#ff8fa8', '#ffd0a0', '#ffe0c0', '#a8ffd0', '#d0ffa0', '#ff7a7a', '#ffc8ff', '#fff2b0', '#e0b8ff', '#c8e0ff'];

function mkC(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function initRender(canvas) {
  cvs = canvas; ctx = cvs.getContext('2d', { alpha: false });
  floorC = mkC(GN); floorG = floorC.getContext('2d');
  floorImg = floorG.createImageData(GN, GN); floor32 = new Uint32Array(floorImg.data.buffer);
  maskC = mkC(FW); maskG = maskC.getContext('2d');
  hiC = mkC(FW); hiG = hiC.getContext('2d');
  rimC = mkC(RW); rimG = rimC.getContext('2d');
  invC = mkC(RW); invG = invC.getContext('2d');
  pbC = mkC(4); pbG = pbC.getContext('2d'); bloomC = mkC(4); bloomG = bloomC.getContext('2d');
  starSpr = makeStar(); glowSpr = makeGlow(); runeC = makeRune();
  for (let k = 0; k < 46; k++) MOTES.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, s: 0.5 + Math.random() * 1.8, ph: Math.random() * 6.28 });
  resize();
  rebuildFloor();
}
function resize() {
  CAM.dpr = Math.min(window.devicePixelRatio || 1, 2); CAM.W = innerWidth; CAM.H = innerHeight;
  cvs.width = Math.round(CAM.W * CAM.dpr); cvs.height = Math.round(CAM.H * CAM.dpr);
  pbW = Math.ceil(CAM.W / 2); pbH = Math.ceil(CAM.H / 2); pbC.width = pbW; pbC.height = pbH;
  bloomC.width = Math.ceil(pbW / 4); bloomC.height = Math.ceil(pbH / 4);
  pbImg = pbG.createImageData(pbW, pbH); pb32 = new Uint32Array(pbImg.data.buffer); accR = new Uint16Array(pbW * pbH); accU = new Uint16Array(pbW * pbH);
  // 暗角
  vigC = mkC(256, 256); const vg = vigC.getContext('2d'); const gr = vg.createRadialGradient(128, 128, 60, 128, 128, 182); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,8,0.25)'); gr.addColorStop(1, 'rgba(0,0,8,0.75)'); vg.fillStyle = gr; vg.fillRect(0, 0, 256, 256);
}

/* ---------- 星云地面纹理（每个种子生成一次） ---------- */
function vnoise(seed) {
  const N = 256, T = new Float32Array(N * N), R = mulberry32(seed); for (let i = 0; i < N * N; i++) T[i] = R();
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = T[(yi & 255) * N + (xi & 255)], b = T[(yi & 255) * N + ((xi + 1) & 255)], c = T[((yi + 1) & 255) * N + (xi & 255)], d = T[((yi + 1) & 255) * N + ((xi + 1) & 255)];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
function buildNebula() {
  const N = 400, c = mkC(N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const n1 = vnoise(G.seed * 7 + 1), n2 = vnoise(G.seed * 13 + 5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const wx = (x + 0.5) / N * GN * CELL - HALF, wy = (y + 0.5) / N * GN * CELL - HALF, dist = Math.hypot(wx, wy) / HALF;
    let f = 0, amp = 0.5, fr = 1 / 22; for (let o = 0; o < 5; o++) { f += amp * n1(x * fr, y * fr); amp *= 0.5; fr *= 2.03; }
    let h = 0; amp = 0.5; fr = 1 / 40; for (let o = 0; o < 3; o++) { h += amp * n2(x * fr + 50, y * fr + 20); amp *= 0.5; fr *= 2.1; }
    const k = Math.max(0, f - 0.35) * 1.6, fall = Math.max(0.35, 1 - dist * 0.55);
    // 深海蓝 → 青绿 / 紫罗兰 两种星云按 h 混合
    let r = 10 + k * (h > 0.5 ? 70 : 20), gg = 16 + k * (h > 0.5 ? 30 : 75), b = 34 + k * (h > 0.5 ? 95 : 70);
    const i = (y * N + x) * 4; d[i] = r * fall; d[i + 1] = gg * fall; d[i + 2] = b * fall; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  nebC = mkC(FW); const ng = nebC.getContext('2d'); ng.imageSmoothingEnabled = true; ng.imageSmoothingQuality = 'high'; ng.drawImage(c, 0, 0, FW, FW);
  // 六边形科技网格（很淡）
  const hexS = 18 * FS / CELL * 6, hh = hexS * Math.sqrt(3); ng.strokeStyle = 'rgba(120,200,255,0.07)'; ng.lineWidth = 1; ng.beginPath();
  for (let row = 0; row * hh * 0.5 < FW + hh; row++) for (let col = 0; col * hexS * 3 < FW + hexS * 3; col++) {
    const cx0 = col * hexS * 3 + (row % 2 ? hexS * 1.5 : 0), cy0 = row * hh * 0.5;
    for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3, a2 = (q + 1) * Math.PI / 3; if (q > 2) continue; ng.moveTo(cx0 + Math.cos(a) * hexS, cy0 + Math.sin(a) * hexS); ng.lineTo(cx0 + Math.cos(a2) * hexS, cy0 + Math.sin(a2) * hexS); }
  }
  ng.stroke();
  // 星尘
  const R = mulberry32(G.seed + 99); for (let k = 0; k < 9000; k++) { const x = R() * FW, y = R() * FW, a = R(); ng.fillStyle = `rgba(${180 + a * 70 | 0},${200 + a * 55 | 0},255,${0.05 + a * a * 0.35})`; ng.fillRect(x, y, a > 0.93 ? 2 : 1, a > 0.93 ? 2 : 1); }
  nebC._seed = G.seed;
}
/* ---------- 地面遮罩：开阔格子画成相互重叠的圆 → 有机的洞穴边缘 ---------- */
function maskRegion(gx0, gy0, gx1, gy1) {
  gx0 = Math.max(0, gx0); gy0 = Math.max(0, gy0); gx1 = Math.min(GN - 1, gx1); gy1 = Math.min(GN - 1, gy1);
  const X = gx0 * FS, Y = gy0 * FS, Wd = (gx1 - gx0 + 1) * FS, Ht = (gy1 - gy0 + 1) * FS;
  maskG.save(); maskG.beginPath(); maskG.rect(X, Y, Wd, Ht); maskG.clip(); maskG.clearRect(X, Y, Wd, Ht);
  maskG.fillStyle = '#fff'; maskG.beginPath(); const rr = FS * 0.74;
  for (let gy = Math.max(0, gy0 - 1); gy <= Math.min(GN - 1, gy1 + 1); gy++) for (let gx = Math.max(0, gx0 - 1); gx <= Math.min(GN - 1, gx1 + 1); gx++) {
    if (whp[gy * GN + gx] > 0) continue; const x = (gx + 0.5) * FS, y = (gy + 0.5) * FS; maskG.moveTo(x + rr, y); maskG.arc(x, y, rr, 0, 6.2832);
  }
  maskG.fill(); maskG.restore();
  hiG.save(); hiG.beginPath(); hiG.rect(X, Y, Wd, Ht); hiG.clip(); hiG.clearRect(X, Y, Wd, Ht);
  hiG.globalCompositeOperation = 'source-over'; hiG.drawImage(maskC, X, Y, Wd, Ht, X, Y, Wd, Ht);
  hiG.globalCompositeOperation = 'source-in'; hiG.drawImage(nebC, X, Y, Wd, Ht, X, Y, Wd, Ht);
  hiG.restore(); hiG.globalCompositeOperation = 'source-over';
}
function rebuildRim() {
  // 墙体（遮罩反相）→ 阴影模糊 → 只保留落在地面上的部分 = 贴着墙边的青色辉光
  invG.globalCompositeOperation = 'source-over'; invG.clearRect(0, 0, RW, RW); invG.fillStyle = '#fff'; invG.fillRect(0, 0, RW, RW);
  invG.globalCompositeOperation = 'destination-out'; invG.drawImage(maskC, 0, 0, RW, RW); invG.globalCompositeOperation = 'source-over';
  rimG.clearRect(0, 0, RW, RW); rimG.save(); rimG.shadowColor = 'rgba(80,220,255,1)'; rimG.shadowBlur = 9; rimG.shadowOffsetX = RW * 2;
  rimG.drawImage(invC, -RW * 2, 0); rimG.drawImage(invC, -RW * 2, 0); rimG.restore();
  rimG.globalCompositeOperation = 'destination-in'; rimG.drawImage(maskC, 0, 0, RW, RW); rimG.globalCompositeOperation = 'source-over';
}
function rebuildFloor() {
  if (!nebC || nebC._seed !== G.seed) buildNebula();
  for (let i = 0; i < GN * GN; i++) paintCell(i);
  floorDirty = true;
  // 只重绘有开阔格子的范围
  let a = GN, b = GN, c = 0, d = 0; for (let i = 0; i < GN * GN; i++) if (whp[i] <= 0) { const gx = i % GN, gy = (i / GN) | 0; if (gx < a) a = gx; if (gy < b) b = gy; if (gx > c) c = gx; if (gy > d) d = gy; }
  maskG.clearRect(0, 0, FW, FW); hiG.clearRect(0, 0, FW, FW);
  if (c >= a) maskRegion(a, b, c, d);
  rebuildRim(); rimDirty = false; hiDirty = null;
}
function paintCell(i) { // 低清地面：小地图 + 墙体受损的裂纹色
  const h = whp[i];
  if (h <= 0) { const gx = i % GN, gy = (i / GN) | 0, d = Math.hypot((gx + 0.5) * CELL - HALF, (gy + 0.5) * CELL - HALF), t = Math.min(1, d / 2600); floor32[i] = (255 << 24) | ((62 - 26 * t) << 16) | ((34 - 16 * t) << 8) | (18 - 9 * t); }
  else if (h === Infinity) floor32[i] = 0;
  else { const dm = 1 - h / wMax[i]; floor32[i] = dm > 0.02 ? ((Math.round(dm * 230) << 24) | (170 << 16) | (60 << 8) | 255) : 0; }
}
function flushFloor() {
  if (WALL_DIRTY.length) {
    for (const i of WALL_DIRTY) {
      paintCell(i);
      if (whp[i] <= 0) { const gx = i % GN, gy = (i / GN) | 0; if (!hiDirty) hiDirty = [gx, gy, gx, gy]; else { hiDirty[0] = Math.min(hiDirty[0], gx); hiDirty[1] = Math.min(hiDirty[1], gy); hiDirty[2] = Math.max(hiDirty[2], gx); hiDirty[3] = Math.max(hiDirty[3], gy); } }
    }
    WALL_DIRTY.length = 0; floorDirty = true;
  }
  if (floorDirty) { floorG.putImageData(floorImg, 0, 0); floorDirty = false; }
  if (hiDirty) { const [a, b, c, d] = hiDirty; maskRegion(a - 1, b - 1, c + 1, d + 1); hiDirty = null; rimDirty = true; }
  if (rimDirty && performance.now() - rimT > 450) { rimT = performance.now(); rimDirty = false; rebuildRim(); }
}
function w2s(x, y) { return [(x - CAM.x) * CAM.z + CAM.W / 2, (y - CAM.y) * CAM.z + CAM.H / 2]; }
function s2w(sx, sy) { return [(sx - CAM.W / 2) / CAM.z + CAM.x, (sy - CAM.H / 2) / CAM.z + CAM.y]; }
function worldT() { const k = CAM.z * CAM.dpr; ctx.setTransform(k, 0, 0, k, (CAM.W / 2 - CAM.x * CAM.z) * CAM.dpr, (CAM.H / 2 - CAM.y * CAM.z) * CAM.dpr); }
function addFX(type, x, y, o) { if (FX.length > 300) FX.shift(); FX.push(Object.assign({ type, x, y, t: 0, life: 1 }, o || {})); }

/* ---------- 预渲染小图 ---------- */
function makeStar() { const c = mkC(32), g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(200,250,255,0.85)'); gr.addColorStop(0.45, 'rgba(90,200,255,0.25)'); gr.addColorStop(1, 'rgba(40,120,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  g.globalCompositeOperation = 'lighter'; const lg = g.createLinearGradient(0, 16, 32, 16); lg.addColorStop(0, 'rgba(150,230,255,0)'); lg.addColorStop(0.5, 'rgba(220,250,255,0.8)'); lg.addColorStop(1, 'rgba(150,230,255,0)'); g.fillStyle = lg; g.fillRect(0, 15, 32, 2); g.save(); g.translate(16, 16); g.rotate(Math.PI / 2); g.translate(-16, -16); g.fillRect(0, 15, 32, 2); g.restore(); return c; }
function makeGlow() { const c = mkC(64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; }
function makeRune() { // 方塔脚下的符文环
  const S = 512, c = mkC(S), g = c.getContext('2d'), o = S / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  g.lineWidth = 2; g.beginPath(); g.arc(o, o, 240, 0, 7); g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(o, o, 226, 0, 7); g.stroke(); g.beginPath(); g.arc(o, o, 170, 0, 7); g.stroke();
  const R = mulberry32(7);
  for (let k = 0; k < 48; k++) { const a = k / 48 * 6.2832; g.save(); g.translate(o + Math.cos(a) * 233, o + Math.sin(a) * 233); g.rotate(a + Math.PI / 2); g.lineWidth = 1.4; g.beginPath();
    const t = R() * 4 | 0; if (t === 0) { g.moveTo(-3, -4); g.lineTo(3, -4); g.lineTo(0, 4); g.closePath(); } else if (t === 1) { g.moveTo(-4, 0); g.lineTo(4, 0); g.moveTo(0, -4); g.lineTo(0, 4); } else if (t === 2) { g.arc(0, 0, 3, 0, 7); } else { g.moveTo(-4, -3); g.lineTo(0, 3); g.lineTo(4, -3); } g.stroke(); g.restore(); }
  for (let k = 0; k < 120; k++) { const a = k / 120 * 6.2832, l = k % 5 === 0 ? 14 : 6; g.globalAlpha = k % 5 === 0 ? 0.9 : 0.5; g.beginPath(); g.moveTo(o + Math.cos(a) * 170, o + Math.sin(a) * 170); g.lineTo(o + Math.cos(a) * (170 + l), o + Math.sin(a) * (170 + l)); g.stroke(); }
  g.globalAlpha = 1; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832; g.beginPath(); g.moveTo(o + Math.cos(a) * 60, o + Math.sin(a) * 60); g.lineTo(o + Math.cos(a) * 165, o + Math.sin(a) * 165); g.globalAlpha = 0.35; g.stroke(); }
  g.globalAlpha = 1; return c;
}
function star4(x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }

/* ===================== 主渲染 ===================== */
function render(realDt, ui) {
  const t0 = performance.now();
  const W = CAM.W, H = CAM.H, dpr = CAM.dpr; let z = CAM.z;
  flushFloor();
  // 镜头震动
  let shx = 0, shy = 0; if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - realDt * 3); shx = (Math.random() - 0.5) * CAM.shake * 8; shy = (Math.random() - 0.5) * CAM.shake * 8; }
  const cx0 = CAM.x, cy0 = CAM.y; CAM.x += shx / z; CAM.y += shy / z;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  const x0 = CAM.x - W / 2 / z, y0 = CAM.y - H / 2 / z, x1 = CAM.x + W / 2 / z, y1 = CAM.y + H / 2 / z;
  worldT(); ctx.imageSmoothingEnabled = true;
  const gx0 = Math.max(0, Math.floor((x0 + HALF) / CELL) - 2), gy0 = Math.max(0, Math.floor((y0 + HALF) / CELL) - 2), gx1 = Math.min(GN, Math.ceil((x1 + HALF) / CELL) + 2), gy1 = Math.min(GN, Math.ceil((y1 + HALF) / CELL) + 2);
  if (gx1 > gx0 && gy1 > gy0) {
    const sx = gx0 * CELL - HALF, sy = gy0 * CELL - HALF, sw = (gx1 - gx0) * CELL, sh = (gy1 - gy0) * CELL;
    ctx.drawImage(hiC, gx0 * FS, gy0 * FS, (gx1 - gx0) * FS, (gy1 - gy0) * FS, sx, sy, sw, sh);
    // 墙体受损裂纹（紫红色）
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(floorC, gx0, gy0, gx1 - gx0, gy1 - gy0, sx, sy, sw, sh);
    // 墙边辉光
    const pulse = 0.65 + 0.25 * Math.sin(G.t * 0.8);
    ctx.globalAlpha = pulse * (G.lv > 0 ? 1 : 0.55); ctx.drawImage(rimC, gx0 * RS, gy0 * RS, (gx1 - gx0) * RS, (gy1 - gy0) * RS, sx, sy, sw, sh);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  drawRune();
  if (ui.build >= 0 || ui.showField) drawFields();
  drawPylonLinks();
  for (const d of G.devs) if (d.x > x0 - 300 && d.x < x1 + 300 && d.y > y0 - 300 && d.y < y1 + 300) drawDevice(d, false);
  drawParticles(x0, y0, x1, y1);
  worldT();
  drawCreatures(x0, y0, x1, y1, ui);
  for (const d of G.devs) if (d.x > x0 - 300 && d.x < x1 + 300 && d.y > y0 - 300 && d.y < y1 + 300) drawDevice(d, true);
  drawTower();
  drawOrb(ui);
  if (ui.build >= 0 && ui.ghost) drawGhost(ui);
  drawFX(realDt);
  drawScreenFX(realDt);
  CAM.x = cx0; CAM.y = cy0;
  const dtR = performance.now() - t0; LOD.avg = LOD.avg * 0.95 + dtR * 0.05;
  if (realDt > 0 && realDt < 0.5) LOD.fAvg = LOD.fAvg * 0.95 + realDt * 1000 * 0.05;
  const slow = LOD.avg > 14 || LOD.fAvg > 26, fast = LOD.avg < 8 && LOD.fAvg < 19;
  if (slow) { if (LOD.maxSpr > 250) LOD.maxSpr *= (LOD.avg > 30 || LOD.fAvg > 45) ? 0.9 : 0.97; if (LOD.lodPx < 8) LOD.lodPx += 0.05; if (LOD.stars > 100) LOD.stars *= 0.95; }
  else if (fast) { if (LOD.maxSpr < 12000 && LOD.nSpr >= LOD.maxSpr * 0.9) LOD.maxSpr += 30; if (LOD.lodPx > 2.6) LOD.lodPx -= 0.03; if (LOD.stars < 2500) LOD.stars += 10; }
}
function drawRune() {
  const lv = G.lv, on = lv > 0, col = LV_COLORS[lv], t = G.t;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // 方塔脚下的光池
  const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 260); g.addColorStop(0, on ? col : '#334'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = on ? 0.13 + 0.03 * Math.sin(t) : 0.06; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 260, 0, 7); ctx.fill();
  ctx.globalAlpha = on ? 0.22 + 0.06 * Math.sin(t * 1.3) : 0.07; ctx.rotate(t * (on ? 0.05 : 0.005)); ctx.drawImage(runeC, -125, -125, 250, 250);
  ctx.rotate(-t * (on ? 0.13 : 0.01)); ctx.globalAlpha *= 0.6; ctx.drawImage(runeC, -80, -80, 160, 160);
  ctx.restore();
  if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.2 / CAM.z; ctx.setLineDash([4, 10]); ctx.lineDashOffset = -t * 12; ctx.beginPath(); ctx.arc(0, 0, TOWER_FIELD, 0, 7); ctx.stroke(); ctx.restore(); }
}

/* ---------- 能量粒子：JS 像素缓冲（凝结 = 明亮闪烁的星点；未凝结 = 暗淡紫雾） + 泛光 + 近景星芒 ---------- */
const _starList = new Int32Array(4000);
function drawParticles(x0, y0, x1, y1) {
  const z = CAM.z, W = CAM.W, H = CAM.H, hx = CAM.x, hy = CAM.y, t = G.t;
  accR.fill(0); accU.fill(0);
  const k = z * 0.5, ox = W / 4 - hx * k, oy = H / 4 - hy * k, bw = pbW, bh = pbH;
  const big = z > 1.1, huge = z > 2.2, wantStars = z > 1.25; let nStar = 0; const maxStar = Math.min(4000, LOD.stars | 0);
  for (let i = 0; i < pN; i++) {
    const v = pv[i]; if (v === 0) continue;
    const bx = (px[i] * k + ox) | 0, by = (py[i] * k + oy) | 0;
    if (bx < 1 || by < 1 || bx >= bw - 1 || by >= bh - 1) continue;
    const idx = by * bw + bx, w = v > 6 ? 6 : v;
    if (pr[i] === 255) {
      const tw = 3 + ((Math.sin(t * 3.1 + i * 1.7) + 1) * 2.2) | 0;
      accR[idx] += tw * w + 3;
      if (big) { accR[idx - 1] += w; accR[idx + 1] += w; accR[idx - bw] += w; accR[idx + bw] += w; if (huge) { accR[idx - bw - 1] += w; accR[idx - bw + 1] += w; accR[idx + bw - 1] += w; accR[idx + bw + 1] += w; } }
      if (wantStars && nStar < maxStar) _starList[nStar++] = i;
    } else {
      const a = 1 + (pr[i] >> 5); accU[idx] += a * w;
      if (big) { accU[idx - 1] += w; accU[idx + 1] += w; accU[idx - bw] += w; accU[idx + bw] += w; }
    }
  }
  const dim = G.lv > 0 ? 1 : 0.75;
  for (let i = 0, n = bw * bh; i < n; i++) {
    const l = accR[i], e = accU[i];
    if ((l | e) === 0) { pb32[i] = 0; continue; }
    const lf = l > 48 ? 48 : l, ef = e > 40 ? 40 : e;
    let r = (lf * 9 + ef * 4.5) * dim, g = (lf * 24 + ef * 2.2) * dim, b = (lf * 30 + ef * 7) * dim;
    if (lf > 20) { const w2 = (lf - 20) * 6; r += w2; g += w2; b += w2; } // 高密度发白
    if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
    pb32[i] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
  pbG.putImageData(pbImg, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  const D = CAM.dpr;
  ctx.drawImage(pbC, 0, 0, bw, bh, 0, 0, bw * 2 * D, bh * 2 * D);
  // 泛光：缩小到 1/4 再放大（便宜的模糊）
  bloomG.globalCompositeOperation = 'copy'; bloomG.imageSmoothingEnabled = true; bloomG.drawImage(pbC, 0, 0, bloomC.width, bloomC.height);
  ctx.globalAlpha = 0.85; ctx.drawImage(bloomC, 0, 0, bloomC.width, bloomC.height, 0, 0, bw * 2 * D, bh * 2 * D); ctx.globalAlpha = 1;
  // 近景：凝结能量画成星芒
  if (nStar) {
    const kk = z * D, offx = (W / 2 - hx * z) * D, offy = (H / 2 - hy * z) * D, base = Math.min(26, 5 + z * 4) * D;
    for (let q = 0; q < nStar; q++) {
      const i = _starList[q], s = base * (0.55 + 0.15 * Math.min(4, pv[i])) * (0.75 + 0.35 * Math.sin(t * 4 + i * 2.3));
      ctx.globalAlpha = 0.7; ctx.drawImage(starSpr, px[i] * kk + offx - s / 2, py[i] * kk + offy - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- 生物 ---------- */
let dbC = null, dbG = null, dbImg = null, db32 = null, dbDirty = false;
const SP_PACK = [], SP_PACK_HI = [];
function packCol(h) { const [r, g, b] = hex2rgb(h); return 0xff000000 | (b << 16) | (g << 8) | r; }
function rgb2hex(s) { return s.replace(/rgb\((\d+),(\d+),(\d+)\)/, (m, r, g, b) => '#' + [r, g, b].map(v => (+v).toString(16).padStart(2, '0')).join('')); }
const _sprList = new Int32Array(MAXC);
function drawCreatures(x0, y0, x1, y1, ui) {
  const z = CAM.z, D = CAM.dpr, k = z * D, t = G.t, offx = (CAM.W / 2 - CAM.x * z) * D, offy = (CAM.H / 2 - CAM.y * z) * D;
  const lod = LOD.lodPx; let nSpr = 0, nDot = 0; const maxSpr = LOD.maxSpr, ox0 = G.orb.x, oy0 = G.orb.y;
  const farR2 = cN > maxSpr ? (x1 - x0) * (y1 - y0) * maxSpr / Math.max(1, cN) / 3.2 : 1e12;
  if (!dbC || dbC.width !== pbW || dbC.height !== pbH) { dbC = mkC(pbW, pbH); dbG = dbC.getContext('2d'); dbImg = dbG.createImageData(pbW, pbH); db32 = new Uint32Array(dbImg.data.buffer); dbDirty = true; }
  if (!SP_PACK.length) for (let s = 0; s < NS; s++) { SP_PACK[s] = packCol(SPECIES[s].col); SP_PACK_HI[s] = packCol(rgb2hex(mixc(SPECIES[s].col, '#ffffff', 0.55))); }
  if (dbDirty) { db32.fill(0); dbDirty = false; }
  const hk = z * 0.5, hox = CAM.W / 4 - CAM.x * hk, hoy = CAM.H / 4 - CAM.y * hk, bw = pbW, bh = pbH;
  for (let i = 0; i < cN; i++) {
    if (cdead[i]) continue;
    const s = csp[i], r = S_r[s] * cg[i], x = cx[i], y = cy[i];
    if (x < x0 - r * 3 || x > x1 + r * 3 || y < y0 - r * 3 || y > y1 + r * 3) continue;
    if (r * z < lod || nSpr >= maxSpr || dist2(x, y, ox0, oy0) > farR2) {
      const bx = (x * hk + hox) | 0, by = (y * hk + hoy) | 0; let rr = r * hk; if (rr < 0.8) rr = 0.8; if (rr > 7) rr = 7;
      const ri = Math.ceil(rr), r2 = rr * rr, col = SP_PACK[s], hi = SP_PACK_HI[s];
      if (bx < ri || by < ri || bx >= bw - ri || by >= bh - ri) continue;
      for (let dy = -ri; dy <= ri; dy++) { const row = (by + dy) * bw + bx; for (let dx = -ri; dx <= ri; dx++) { const d2 = dx * dx + dy * dy; if (d2 <= r2) db32[row + dx] = (d2 * 5 < r2 && dx <= 0 && dy <= 0) ? hi : col; } }
      nDot++; continue;
    }
    _sprList[nSpr++] = i;
  }
  if (nDot) { dbG.putImageData(dbImg, 0, 0); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(dbC, 0, 0, bw, bh, 0, 0, bw * 2 * D, bh * 2 * D); dbDirty = true; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 1) 地面投影
  const sh = shadowSprite();
  for (let q = 0; q < nSpr; q++) {
    const i = _sprList[q], s = csp[i], r = S_r[s] * cg[i], mv = S_mv[s];
    const fly = mv === MV_FLY || mv === MV_FLOAT || mv === MV_ORBIT, w = r * 2.1 * k * (fly ? 0.7 : 1), h = w * 0.42;
    ctx.globalAlpha = fly ? 0.45 : 0.8; ctx.drawImage(sh, cx[i] * k + offx - w / 2, (cy[i] + r * (fly ? 1.5 : 0.92)) * k + offy - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
  // 2) 身体（Q弹：挤压拉伸 + 弹跳）
  for (let q = 0; q < nSpr; q++) {
    const i = _sprList[q], s = csp[i], g = cg[i], r = S_r[s] * g, x = cx[i], y = cy[i];
    const mv = S_mv[s];
    const vx = cvx[i], vy = cvy[i], spd = Math.hypot(vx, vy), ph = cph[i];
    let sx = 1 + Math.sin(ph * 2) * 0.05, sy = 1 - Math.sin(ph * 2) * 0.05, yo = 0;
    if (mv === MV_HOP) { const hp = Math.max(0, Math.min(1, 1 - chop[i] / 0.55)); const hh = Math.sin(hp * Math.PI); yo = -hh * r * (spd > 15 ? 1.1 : 0.2); const sq = hp > 0.85 || hp < 0.1 ? 0.16 : -0.1 * hh; sx = 1 + sq; sy = 1 - sq; }
    else if (mv === MV_FLY || mv === MV_FLOAT || mv === MV_ORBIT) { yo = Math.sin(t * 3 + ph) * r * 0.25 - r * 0.35; }
    else { const b = Math.abs(Math.sin(ph * 1.5)), m = Math.min(1, spd / 20); yo = -b * r * 0.2 * m; sx += (1 - b) * 0.07 * m; sy -= (1 - b) * 0.07 * m; }
    if (cmood[i] > 0) { const qq = Math.sin(cmood[i] * 12) * 0.13 * Math.min(1, cmood[i]); sx += qq; sy -= qq; }
    if (cang[i] > 0) { const qq = Math.sin(cang[i] * 30) * 0.08 * cang[i]; sx += qq; sy -= qq; }
    let v = 0; const st = cst[i];
    if (st === ST_FLEE) v = 4; else if (cang[i] > 0 || st === ST_FIGHT || (st === ST_HUNT && S_diet[s] !== D_E)) v = 5; else if (cage[i] > S_life[s] * 0.75) v = 2; else if (cmood[i] > 0 || st === ST_MATE) v = 3;
    if (v < 4 && ((t * 0.8 + cid[i] * 0.37) % 3.7) < 0.13) v = 1;
    const ds = r / SPR_BODY, dpx = ds * k; const mip = dpx > 90 ? 0 : dpx > 45 ? 1 : dpx > 22 ? 2 : 3;
    const img = SPRITES[s][vx < -2 ? v + NVAR : v][mip];
    const w = dpx * sx, h = dpx * sy, scx = x * k + offx, scy = (y + yo + r * 0.3 * (1 - sy)) * k + offy;
    ctx.drawImage(img, scx - w / 2, scy - h / 2, w, h);
    if (cang[i] > 0.6 && dpx > 20) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (cang[i] - 0.6) * 1.2; ctx.drawImage(glowSpr, scx - w * 0.6, scy - h * 0.6, w * 1.2, h * 1.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  LOD.nSpr = nSpr;
  worldT();
  if (ui.sel >= 0 && ui.selId) { const i = ui.sel; if (i < cN && !cdead[i]) { const r = S_r[csp[i]] * cg[i]; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 5 / z]); ctx.lineDashOffset = -t * 20 / z; ctx.beginPath(); ctx.arc(cx[i], cy[i], r * 1.7 + 4, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (cst[i] === ST_HUNT || cst[i] === ST_FIGHT || cst[i] === ST_MATE) { const j = ctg[i]; if (j >= 0 && j < cN && cid[j] === ctgId[i]) { ctx.strokeStyle = cst[i] === ST_MATE ? 'rgba(255,150,200,0.6)' : 'rgba(255,110,110,0.6)'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([3 / z, 5 / z]); ctx.beginPath(); ctx.moveTo(cx[i], cy[i]); ctx.lineTo(cx[j], cy[j]); ctx.stroke(); ctx.setLineDash([]); } } } }
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
    case 'ripen': {
      glowDot(0, -12, 24); ctx.fillStyle = act ? '#16283a' : '#2a2a2e'; ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-6, -22); ctx.lineTo(6, -22); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (act) for (let k = 0; k < 5; k++) { const p = ((t * 0.7 + k / 5) % 1), a = k * 1.26 + t; ctx.globalAlpha = 1 - p; ctx.fillStyle = '#dffcff'; ctx.beginPath(); ctx.arc(Math.cos(a) * (4 + p * 10), -22 - p * 18 + bob, 1.6, 0, 7); ctx.fill(); } ctx.globalAlpha = building ? 0.6 : 1;
      ctx.fillStyle = act ? '#fff' : '#888'; star4(0, -26 + bob, act ? 6 + Math.sin(t * 5) : 4); break; }
    case 'arena': {
      glowDot(0, -10, 26); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -2, 15, 6, 0, 0, 7); ctx.stroke();
      for (const sx of [-1, 1]) { ctx.save(); ctx.translate(0, -14 + bob); ctx.rotate(sx * (0.7 + (act ? Math.sin(t * 3) * 0.12 : 0))); ctx.fillStyle = act ? '#ffe6a8' : '#888'; ctx.fillRect(-1.5, -14, 3, 20); ctx.fillRect(-5, 3, 10, 2.5); ctx.restore(); }
      if (act && d.flash > 0) { ctx.globalAlpha = Math.min(1, d.flash); ctx.fillStyle = '#fff3c4'; star4(0, -16, 12); ctx.globalAlpha = 1; d.flash -= 1 / 60; } break; }
    case 'sanct': {
      if (act) { const gg = ctx.createRadialGradient(0, 0, 10, 0, 0, def.r); gg.addColorStop(0, 'rgba(210,255,230,0.10)'); gg.addColorStop(0.85, 'rgba(160,255,210,0.05)'); gg.addColorStop(1, 'rgba(160,255,210,0.22)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, def.r, 0, 7); ctx.fill(); }
      glowDot(0, -16, 26); ctx.fillStyle = act ? '#1c3028' : '#2a2a2e'; ctx.beginPath(); ctx.moveTo(0, -38 + bob); ctx.lineTo(10, -16 + bob); ctx.lineTo(0, 0 + bob); ctx.lineTo(-10, -16 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = act ? '#eafff4' : '#888'; ctx.beginPath(); ctx.moveTo(0, -24 + bob); ctx.bezierCurveTo(-6, -30 + bob, -7, -20 + bob, 0, -14 + bob); ctx.bezierCurveTo(7, -20 + bob, 6, -30 + bob, 0, -24 + bob); ctx.fill(); break; }
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
  ctx.save();
  const pulse = G._pulse || 0;
  if (pulse > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.globalAlpha = pulse * 0.8; ctx.lineWidth = 4 * pulse + 1; ctx.beginPath(); ctx.arc(0, 0, 60 + (1 - pulse) * 520, 0, 7); ctx.stroke(); ctx.globalAlpha = pulse * 0.3; ctx.lineWidth = 16 * pulse; ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  // 底座投影
  ctx.fillStyle = 'rgba(0,0,10,0.5)'; ctx.beginPath(); ctx.ellipse(0, 18, 52, 16, 0, 0, 7); ctx.fill();
  // 三层六边形底座（立体侧面）
  for (let L = 0; L < 3; L++) {
    const R = 46 - L * 11, yy = 12 - L * 9;
    ctx.fillStyle = L === 0 ? '#0a1220' : L === 1 ? '#111c30' : '#172640'; hexPath(0, yy + 6, R, 0); ctx.fill();
    const tg = ctx.createLinearGradient(0, yy - R * 0.6, 0, yy + R * 0.6); tg.addColorStop(0, L === 2 ? '#34507a' : '#24385a'); tg.addColorStop(1, '#0c1424');
    ctx.fillStyle = tg; ctx.save(); ctx.translate(0, yy); ctx.scale(1, 0.55); hexPath(0, 0, R, 0); ctx.restore(); ctx.fill();
    ctx.strokeStyle = on ? col : '#4a5468'; ctx.globalAlpha = on ? 0.75 : 0.5; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
    if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3 + t * 0.2 * (L % 2 ? -1 : 1); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + q + L); ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.85, yy + Math.sin(a) * R * 0.85 * 0.55, 1.6, 0, 7); ctx.fill(); } ctx.restore(); }
  }
  // 等级环
  for (let k = 0; k < lv; k++) {
    ctx.save(); ctx.translate(0, -34); ctx.rotate(t * (0.3 + k * 0.07) * (k % 2 ? -1 : 1)); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = LV_COLORS[k + 1]; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 34 + k * 5, (34 + k * 5) * 0.3, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = LV_COLORS[k + 1]; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(34 + k * 5, 0, 2.4, 0, 7); ctx.fill(); ctx.restore();
  }
  // 悬浮方晶
  const bob = on ? Math.sin(t * 1.3) * 4 : 0, cy = -40 + bob, s = 19 + lv * 0.9;
  if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 2); ctx.drawImage(glowSpr, -s * 3.2, cy - s * 3.2, s * 6.4, s * 6.4); ctx.restore(); }
  ctx.save(); ctx.translate(0, cy); const rot = on ? t * 0.6 : 0.4, cr = Math.cos(rot);
  // 旋转的八面体：两个可见面按角度着色
  const wx = s * Math.abs(cr), wx2 = s * Math.abs(Math.sin(rot)), h = s * 1.45;
  const c1 = on ? col : '#5a6272', light = on ? '#ffffff' : '#9aa2b2', dark = on ? '#0c1830' : '#1a1e26';
  const face = (xa, xb, top, c) => { const gr = ctx.createLinearGradient(xa, -h, xb, h); gr.addColorStop(0, top ? light : c); gr.addColorStop(1, top ? c : dark); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(xa, 0); ctx.lineTo(xb, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(xa, 0); ctx.lineTo(xb, 0); ctx.closePath(); ctx.fillStyle = dark; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; };
  face(-wx - wx2 * 0.2, wx2 * 0.4, true, c1); face(wx2 * 0.4, wx + wx2 * 0.2, false, c1);
  ctx.strokeStyle = on ? 'rgba(255,255,255,0.85)' : '#8890a0'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-wx - wx2 * 0.2, 0); ctx.lineTo(0, h); ctx.lineTo(wx + wx2 * 0.2, 0); ctx.closePath(); ctx.moveTo(0, -h); ctx.lineTo(wx2 * 0.4, 0); ctx.lineTo(0, h); ctx.stroke();
  if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 5); star4(0, -h * 0.35, 5 + lv * 0.4); }
  ctx.restore();
  // 光柱
  if (lv >= 2) { const H = 240 + lv * 34; const bgc = ctx.createLinearGradient(0, cy, 0, cy - H); bgc.addColorStop(0, col); bgc.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 3); ctx.fillStyle = bgc; const w = 5 + lv * 1.2; ctx.fillRect(-w / 2, cy - H, w, H); ctx.globalAlpha *= 0.5; ctx.fillRect(-w * 1.5, cy - H * 0.7, w * 3, H * 0.7); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  // 上升的光粒
  if (on && CAM.z > 0.4) { ctx.globalCompositeOperation = 'lighter'; for (let q = 0; q < 6 + lv; q++) { const p = (t * 0.35 + q * 0.137) % 1, a = q * 2.4; ctx.globalAlpha = (1 - p) * 0.8; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.cos(a + t) * (20 + q * 2) * (1 - p), cy + 20 - p * 120, 1.6, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (!on) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, cy - 12); ctx.lineTo(2, cy + 2); ctx.lineTo(-3, cy + 14); ctx.stroke(); }
  ctx.restore();
}
function drawOrb(ui) {
  const o = G.orb; if (o.dead > 0) { const p = o.dead / 2.5; ctx.globalAlpha = p * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x, o.y, 14 + (1 - p) * 30, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return; }
  const t = G.t;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55; ctx.drawImage(glowSpr, o.x - 50, o.y - 50, 100, 100); ctx.globalAlpha = 0.9; ctx.drawImage(glowSpr, o.x - 22, o.y - 22, 44, 44);
  // 环绕的小卫星
  for (let k = 0; k < 3; k++) { const a = t * 2.2 + k * 2.094; ctx.globalAlpha = 0.8; ctx.fillStyle = '#cff8ff'; ctx.beginPath(); ctx.arc(o.x + Math.cos(a) * 19, o.y + Math.sin(a) * 7 - 2, 1.8, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(o.x - 3, o.y - 4, 1, o.x, o.y, 12); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#eafcff'); g.addColorStop(1, '#a8e8ff');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, 11 + Math.sin(t * 4) * 0.8, 0, 7); ctx.fill();
  if (o.attract) { ctx.strokeStyle = 'rgba(160,240,255,0.5)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const p = 1 - ((t * 1.2 + k / 3) % 1); ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(o.x, o.y, 20 + p * 170, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; }
  if (o.hp < 100) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, 20, 0, 7); ctx.stroke(); ctx.strokeStyle = o.hp > 40 ? '#bff' : '#ff8a8a'; ctx.beginPath(); ctx.arc(o.x, o.y, 20, -Math.PI / 2, -Math.PI / 2 + o.hp / 100 * 6.283); ctx.stroke(); }
  if (o.drill) { ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 5; k++) { const a = rnd() * 6.28, d = 14 + rnd() * 8; ctx.fillStyle = rnd() < 0.5 ? '#fff' : '#ff9ad0'; ctx.fillRect(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 2, 2); } ctx.globalCompositeOperation = 'source-over'; }
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
  const z = CAM.z;
  for (let k = FX.length - 1; k >= 0; k--) {
    const f = FX[k]; f.t += dt; const p = f.t / f.life; if (p >= 1) { FX.splice(k, 1); continue; }
    if (f.type === 'text') { ctx.globalAlpha = 1 - p * p; ctx.fillStyle = f.color || '#8fffd0'; ctx.font = 'bold ' + (12 / Math.max(0.5, z)) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y - p * 30); }
    else if (f.type === 'ring') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = (3 * (1 - p) + 1) / z; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r0 || 5) + (1 - (1 - p) * (1 - p)) * (f.r || 40), 0, 7); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    else if (f.type === 'heart') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#ff8fb8'; const s = 4 + p * 3, x = f.x + Math.sin(p * 9) * 3, y = f.y - p * 26; ctx.beginPath(); ctx.moveTo(x, y + s * 0.8); ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.2, x, y - s * 0.4); ctx.bezierCurveTo(x + s * 0.5, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.8); ctx.fill(); }
    else if (f.type === 'puff') { ctx.globalAlpha = (1 - p) * 0.7; ctx.fillStyle = f.color || '#fff'; for (let q = 0; q < 7; q++) { const a = q * 0.9 + f.x; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * p * 20, f.y + Math.sin(a) * p * 20 - p * 6, 3.2 * (1 - p) + 1, 0, 7); ctx.fill(); } }
    else if (f.type === 'spark') { // 战斗火花
      ctx.globalCompositeOperation = 'lighter'; const n = f.big ? 10 : 7, R = (f.big ? 22 : 14) * (0.4 + p);
      ctx.globalAlpha = (1 - p); ctx.strokeStyle = f.big ? '#ffd27a' : '#fff4d0'; ctx.lineWidth = 2 / Math.max(0.6, z); ctx.lineCap = 'round'; ctx.beginPath();
      for (let q = 0; q < n; q++) { const a = q / n * 6.283 + f.x * 0.1; ctx.moveTo(f.x + Math.cos(a) * R * 0.45, f.y + Math.sin(a) * R * 0.45); ctx.lineTo(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R); } ctx.stroke();
      if (p < 0.3) { ctx.globalAlpha = (0.3 - p) * 3; ctx.drawImage(glowSpr, f.x - 16, f.y - 16, 32, 32); }
      ctx.globalCompositeOperation = 'source-over';
      if (z > 0.7 && p < 0.8) { ctx.globalAlpha = 1 - p; ctx.font = (14 / z > 18 ? 18 : 14) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💢', f.x + 10, f.y - 12 - p * 10); }
    }
    else if (f.type === 'slash') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffe0e0'; ctx.lineWidth = 3 * (1 - p) + 0.5; for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.moveTo(f.x - 14 + q * 5, f.y - 14 - q * 2 + p * 4); ctx.lineTo(f.x + 14 + q * 5, f.y + 14 - q * 2 - p * 4); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.globalAlpha = 1;
}
// 屏幕空间：漂浮光尘（视差）+ 暗角
function drawScreenFX(dt) {
  const W = CAM.W, H = CAM.H, D = CAM.dpr, t = G.t;
  ctx.setTransform(D, 0, 0, D, 0, 0); ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const px_ = ((m.x * W * 1.3 - CAM.x * CAM.z * m.z * 0.35 + t * 6 * m.z) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
    const py_ = ((m.y * H * 1.3 - CAM.y * CAM.z * m.z * 0.35 - t * 3 * m.z) % (H * 1.3) + H * 1.3) % (H * 1.3) - H * 0.15;
    const a = 0.08 + 0.1 * m.z * (0.6 + 0.4 * Math.sin(t + m.ph)); ctx.globalAlpha = a; const s = m.s * (1 + m.z) * 3;
    ctx.drawImage(glowSpr, px_ - s, py_ - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (vigC) ctx.drawImage(vigC, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1);
}
