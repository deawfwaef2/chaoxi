/* ===================== 世界细节 v0.5：异星植被 / 物质结晶 / 遗迹 / 信号 / 环境光 ===================== */
let PROPS = null, MATSPR = null, SIGSPR = null;
const PROP_GLOW = [0, 1, 1, 1, 0, 0, 0, 1, 0, 1]; // 哪些植被会发光
const PROP_GCOL = ['#ffb347', '#ffb347', '#b8ff6a', '#c07aff', '#8a5aff', '#8a5aff', '#8a5aff', '#ff7a3a', '#8a5aff', '#ff3a4a'];
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function propCanvas(fn) { const S = 96, c = mkC(S), g = c.getContext('2d'); g.translate(S / 2, S * 0.78); fn(g); return c; }
function shard(g, x, y, w, h, a, c1, c2) {
  g.save(); g.translate(x, y); g.rotate(a);
  const gr = g.createLinearGradient(-w, -h, w, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -h); g.lineTo(w, -h * 0.72); g.lineTo(w * 0.8, 0); g.lineTo(-w * 0.8, 0); g.lineTo(-w, -h * 0.72); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(0, -h); g.lineTo(-w, -h * 0.72); g.lineTo(-w * 0.35, -h * 0.5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -h); g.lineTo(0, -2); g.stroke();
  g.restore();
}
function buildProps() {
  if (PROPS) return;
  const P = [];
  const sh = (g, w) => { g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(0, 0, w, w * 0.26, 0, 0, 7); g.fill(); };
  P.push(propCanvas(g => { // 0 小墓碑（歪的）
    sh(g, 22); g.rotate(-0.12); const gr = g.createLinearGradient(-12, -34, 12, 0); gr.addColorStop(0, '#8a8698'); gr.addColorStop(1, '#3a3746'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-13, 0); g.lineTo(-13, -22); g.arc(0, -22, 13, Math.PI, 0); g.lineTo(13, 0); g.closePath(); g.fill(); g.strokeStyle = '#25222e'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#2a2733'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -14); g.moveTo(-6, -24); g.lineTo(6, -24); g.stroke();
    g.fillStyle = '#4f8a5a'; g.beginPath(); g.ellipse(-8, -1, 9, 3.5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(-10, -30, 3, 24);
  }));
  P.push(propCanvas(g => { // 1 蜡烛丛
    sh(g, 20); for (const [x, h, w] of [[-10, 16, 5], [2, 26, 6], [12, 11, 4.5]]) {
      g.fillStyle = '#efe6d2'; g.fillRect(x - w / 2, -h, w, h); g.fillStyle = '#d6cbb2'; g.fillRect(x + w / 2 - 1.6, -h, 1.6, h); g.fillStyle = '#fff8e6'; g.beginPath(); g.ellipse(x, -h, w / 2, 1.4, 0, 0, 7); g.fill();
      g.fillStyle = '#efe6d2'; g.beginPath(); g.ellipse(x + 1, -h + 5, 1.2, 3, 0, 0, 7); g.fill();
      const fg = g.createRadialGradient(x, -h - 5, 0, x, -h - 5, 6); fg.addColorStop(0, '#fffbe0'); fg.addColorStop(0.5, '#ffc04a'); fg.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = fg; g.beginPath(); g.ellipse(x, -h - 5, 3, 6, 0, 0, 7); g.fill(); }
  }));
  P.push(propCanvas(g => { // 2 眼球花
    sh(g, 18); g.lineCap = 'round'; for (const [x, h, r, a] of [[-8, 26, 6, -0.2], [7, 18, 5, 0.25], [14, 30, 4, 0.1]]) {
      g.strokeStyle = '#3f7a4a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x * 0.3, 0); g.quadraticCurveTo(x, -h * 0.5, x + a * 10, -h); g.stroke();
      const ex = x + a * 10, ey = -h; g.fillStyle = '#6a3a5a'; for (let q = 0; q < 6; q++) { const aa = q * 1.047; g.beginPath(); g.ellipse(ex + Math.cos(aa) * r * 0.9, ey + Math.sin(aa) * r * 0.9, r * 0.55, r * 0.35, aa, 0, 7); g.fill(); }
      g.fillStyle = '#f4f0e8'; g.beginPath(); g.arc(ex, ey, r * 0.72, 0, 7); g.fill(); g.fillStyle = '#9dff5a'; g.beginPath(); g.arc(ex + a * 3, ey, r * 0.38, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(ex + a * 3, ey, r * 0.18, 0, 7); g.fill(); }
  }));
  P.push(propCanvas(g => { // 3 毒蘑菇（紫）
    sh(g, 22); for (const [x, h, r] of [[-10, 18, 10], [8, 28, 13], [19, 10, 6]]) {
      g.fillStyle = '#e8dcc8'; g.beginPath(); g.moveTo(x - 3, 0); g.quadraticCurveTo(x - 2, -h * 0.6, x - 2, -h); g.lineTo(x + 2, -h); g.quadraticCurveTo(x + 2, -h * 0.6, x + 3, 0); g.fill();
      const gr = g.createRadialGradient(x - r * 0.3, -h - r * 0.4, 1, x, -h, r * 1.2); gr.addColorStop(0, '#f2d8ff'); gr.addColorStop(0.4, '#a45ad8'); gr.addColorStop(1, '#3a1a5a');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, -h, r, r * 0.62, 0, Math.PI, 0); g.quadraticCurveTo(x, -h + r * 0.25, x - r, -h); g.fill();
      g.fillStyle = '#e6ff9a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - r * 0.45 + k * r * 0.45, -h - r * 0.28 + (k % 2) * 2, r * 0.11, 0, 7); g.fill(); } }
  }));
  P.push(propCanvas(g => { // 4 枯枝
    g.lineCap = 'round'; g.strokeStyle = '#3a2e2a'; const br = (x, y, a, L, w, d) => { if (d > 3) return; const ex = x + Math.sin(a) * L, ey = y - Math.cos(a) * L; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); br(ex, ey, a - 0.5, L * 0.68, w * 0.65, d + 1); br(ex, ey, a + 0.45, L * 0.62, w * 0.6, d + 1); };
    br(0, 0, 0.1, 16, 4, 0);
  }));
  P.push(propCanvas(g => { // 5 圆石
    sh(g, 28); const gr = g.createLinearGradient(-20, -30, 20, 0); gr.addColorStop(0, '#5e5866'); gr.addColorStop(1, '#221e28'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-24, 0); g.bezierCurveTo(-28, -18, -10, -32, 6, -28); g.bezierCurveTo(22, -26, 28, -10, 24, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(-6, -22, 10, 4, -0.3, 0, 7); g.fill(); g.fillStyle = '#3f6a48'; g.beginPath(); g.moveTo(-24, -2); g.bezierCurveTo(-18, -12, -4, -8, 4, -4); g.bezierCurveTo(-2, 0, -14, 0, -24, -2); g.fill();
  }));
  P.push(propCanvas(g => { // 6 卵石 + 小骨头
    for (const [x, y, r, c] of [[-14, -3, 6, '#46404e'], [2, -2, 8, '#524b5a'], [15, -4, 5, '#38333f']]) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + r * 0.6, r * 1.1, r * 0.4, 0, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, 7); g.fill(); }
    g.fillStyle = '#e8e0cc'; g.save(); g.translate(-2, -12); g.rotate(0.4); g.fillRect(-7, -1.3, 14, 2.6); for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 7, -1.4, 1.8, 0, 7); g.arc(s * 7, 1.4, 1.8, 0, 7); g.fill(); } g.restore();
  }));
  P.push(propCanvas(g => { // 7 纸灯笼
    sh(g, 12); g.strokeStyle = '#3a2a22'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -40); g.lineTo(8, -44); g.stroke();
    const gr = g.createRadialGradient(8, -30, 1, 8, -30, 12); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.5, '#ff7a3a'); gr.addColorStop(1, '#a8201a'); g.fillStyle = gr;
    g.beginPath(); g.ellipse(8, -30, 9, 11, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(90,20,10,0.6)'; g.lineWidth = 1; for (const k of [-5, 0, 5]) { g.beginPath(); g.ellipse(8, -30, Math.abs(k) + 1, 11, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#2a1a14'; g.fillRect(4, -42, 8, 2.5); g.fillRect(4, -20, 8, 2.5); g.fillStyle = '#ffd36b'; g.fillRect(7.3, -18, 1.4, 6);
  }));
  P.push(propCanvas(g => { // 8 树桩（有个洞，洞里有眼睛）
    sh(g, 22); const gr = g.createLinearGradient(-16, 0, 16, 0); gr.addColorStop(0, '#2e241f'); gr.addColorStop(0.5, '#4a3a30'); gr.addColorStop(1, '#241c18'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-17, 0); g.lineTo(-14, -26); g.lineTo(-6, -30); g.lineTo(2, -24); g.lineTo(9, -31); g.lineTo(15, -25); g.lineTo(17, 0); g.closePath(); g.fill();
    g.fillStyle = '#0a0606'; g.beginPath(); g.ellipse(0, -13, 6, 8, 0, 0, 7); g.fill(); g.fillStyle = '#ffe36a'; g.beginPath(); g.arc(-2.3, -14, 1.4, 0, 7); g.arc(2.3, -14, 1.4, 0, 7); g.fill();
  }));
  P.push(propCanvas(g => { // 9 彼岸花
    g.lineCap = 'round'; for (const [x, h] of [[-9, 24], [3, 32], [13, 20]]) {
      g.strokeStyle = '#3f7a3a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x * 0.4, 0); g.lineTo(x, -h); g.stroke();
      g.strokeStyle = '#ff2a3a'; g.lineWidth = 1.5; for (let q = 0; q < 7; q++) { const a = -Math.PI / 2 + (q - 3) * 0.42, L = 8 + (q % 2) * 3; g.beginPath(); g.moveTo(x, -h); g.quadraticCurveTo(x + Math.cos(a) * L * 0.5, -h + Math.sin(a) * L * 0.9, x + Math.cos(a) * L, -h + Math.sin(a) * L * 0.4 + 2); g.stroke(); }
      g.fillStyle = '#ff4a5a'; g.beginPath(); g.arc(x, -h, 3, 0, 7); g.fill(); }
  }));
  PROPS = P;
  // 物质结晶（金色六棱晶体）
  MATSPR = mkC(48); { const g = MATSPR.getContext('2d'); g.translate(24, 26); const gl = g.createRadialGradient(0, 0, 0, 0, 0, 22); gl.addColorStop(0, 'rgba(200,150,255,0.6)'); gl.addColorStop(1, 'rgba(170,110,255,0)'); g.fillStyle = gl; g.fillRect(-24, -26, 48, 48);
    const gr = g.createLinearGradient(-8, -12, 8, 10); gr.addColorStop(0, '#f6ecff'); gr.addColorStop(0.5, '#b98cff'); gr.addColorStop(1, '#5a2fb4'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(8, -6); g.lineTo(8, 6); g.lineTo(0, 13); g.lineTo(-8, 6); g.lineTo(-8, -6); g.closePath(); g.fill(); g.strokeStyle = '#efe0ff'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(0, -13); g.lineTo(-8, -6); g.lineTo(-3, -3); g.lineTo(0, -8); g.closePath(); g.fill(); }
  SIGSPR = mkC(64); { const g = SIGSPR.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, 'rgba(160,220,255,0.4)'); gr.addColorStop(1, 'rgba(120,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
}

/* ---------- 植被：按格子哈希确定位置（开阔 + 已探索的格子才画） ---------- */
function drawProps(gx0, gy0, gx1, gy1) {
  const z = CAM.z; if (z < 0.45 || !PROPS) return;
  const fade = Math.min(1, (z - 0.45) / 0.15); ctx.globalAlpha = fade;
  const seed = G.seed & 1023, t = G.t, glows = [];
  for (let gy = gy0; gy < gy1; gy++) for (let gx = gx0; gx < gx1; gx++) {
    const i = gy * GN + gx; if (whp[i] > 0 || !seen[i]) continue;
    const h = hash2(gx, gy, seed); if (h > 0.085) continue;
    const x = (gx + 0.5) * CELL - HALF, y = (gy + 0.5) * CELL - HALF;
    if (x * x + y * y < 120 * 120) continue; // 方塔脚下保持干净
    const nearWall = whp[i - 1] > 0 || whp[i + 1] > 0 || whp[i - GN] > 0 || whp[i + GN] > 0 || whp[i - GN - 1] > 0 || whp[i + GN + 1] > 0;
    const h2 = hash2(gx + 7, gy + 3, seed), h3 = hash2(gx + 11, gy + 17, seed);
    let type; if (nearWall) type = [0, 1, 5, 7, 0, 5, 6, 1][(h2 * 8) | 0]; else type = [4, 9, 2, 3, 6, 8, 4, 9, 2, 5][(h2 * 10) | 0];
    const s = (0.34 + h3 * 0.22) * (type === 0 || type === 1 ? 1.1 : 1), w = 96 * s, px_ = x + (h2 - 0.5) * 14, py_ = y + (h3 - 0.5) * 14;
    ctx.save(); ctx.translate(px_, py_); if (h3 > 0.5) ctx.scale(-1, 1);
    ctx.drawImage(PROPS[type], -w / 2, -w * 0.78, w, w); ctx.restore();
    if (PROP_GLOW[type]) glows.push(px_, py_ - w * 0.25, w * 0.55, type, h2);
  }
  ctx.globalAlpha = 1;
  if (glows.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < glows.length; k += 5) { const tp = glows[k + 3]; ctx.globalAlpha = (0.18 + 0.12 * Math.sin(t * 1.6 + glows[k + 4] * 20)) * fade; ctx.drawImage(glowTint(tp), glows[k] - glows[k + 2], glows[k + 1] - glows[k + 2], glows[k + 2] * 2, glows[k + 2] * 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
const _glowTints = {};
function glowTint(tp) { if (_glowTints[tp]) return _glowTints[tp]; const c = mkC(64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, PROP_GCOL[tp]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return _glowTints[tp] = c; }

/* ---------- 环境光斑：缓慢漂移的大块柔光，让地面“呼吸” ---------- */
function drawAmbient(x0, y0, x1, y1) {
  const t = G.t; ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const cx_ = Math.sin(t * 0.03 + k * 1.7) * 520 + Math.cos(t * 0.017 + k) * 300, cy_ = Math.cos(t * 0.025 + k * 2.3) * 520 + Math.sin(t * 0.021 + k * 3) * 280, r = 260 + 90 * Math.sin(t * 0.1 + k);
    if (cx_ + r < x0 || cx_ - r > x1 || cy_ + r < y0 || cy_ - r > y1) continue;
    ctx.globalAlpha = 0.05; ctx.drawImage(glowTint(k % 2 ? 0 : 2), cx_ - r, cy_ - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/* ---------- 物质结晶 ---------- */
function drawMatter(x0, y0, x1, y1) {
  if (!mN) return; const t = G.t, z = CAM.z;
  for (let j = 0; j < mN; j++) {
    const x = mx[j], y = my[j]; if (x < x0 - 20 || x > x1 + 20 || y < y0 - 20 || y > y1 + 20) continue;
    const gi = gIdx(x, y); if (gi >= 0 && !seen[gi]) continue;
    const v = mval[j], s = Math.min(36, 13 + Math.sqrt(v) * 3.5), bob = Math.sin(t * 3 + j) * 2.5;
    const left = MAT_LIFE - mage[j]; ctx.globalAlpha = left < 20 ? (Math.sin(t * 12) > 0 ? 0.9 : 0.35) : 1;
    ctx.drawImage(MATSPR, x - s / 2, y - s / 2 + bob - 4, s, s);
  }
  ctx.globalAlpha = 1;
}

/* ---------- 遗迹 ---------- */
function drawPOIs(x0, y0, x1, y1) {
  const t = G.t;
  for (const q of G.pois) {
    if (!q.found) continue; if (q.x < x0 - 200 || q.x > x1 + 200 || q.y < y0 - 200 || q.y > y1 + 200) continue;
    const key = POI[q.type].key, col = POI[q.type].col, on = q.on, x = q.x, y = q.y;
    ctx.save(); ctx.translate(x, y);
    // 远古平台：破碎的六边形地砖
    if (key !== 'cave') {
      ctx.fillStyle = 'rgba(0,0,10,0.45)'; ctx.beginPath(); ctx.ellipse(0, 10, 52, 18, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.scale(1, 0.55); for (let r = 0; r < 2; r++) { ctx.fillStyle = r ? '#1a2336' : '#121a2a'; hexPath(0, 0, 46 - r * 14, 0.3); ctx.fill(); ctx.strokeStyle = on ? col : '#3d4a60'; ctx.globalAlpha = on ? 0.8 : 0.6; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(-10, 4); ctx.lineTo(-20, 26); ctx.moveTo(22, -24); ctx.lineTo(14, 0); ctx.stroke(); ctx.restore();
    }
    if (on || (key === 'crystal' && !q.used) || (key === 'pod' && !q.used)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2); ctx.drawImage(glowTint(key === 'crystal' ? 3 : key === 'pod' ? 3 : key === 'obelisk' ? 1 : key === 'relay' ? 0 : 2), -70, -100, 140, 140); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    const bob = on ? Math.sin(t * 1.5 + q.x) * 3 : 0;
    if (key === 'reactor') {
      ctx.fillStyle = on ? '#20382e' : '#2a2e36'; ctx.fillRect(-16, -44, 32, 44); ctx.strokeStyle = on ? col : '#556'; ctx.lineWidth = 2; ctx.strokeRect(-16, -44, 32, 44);
      for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(0, -58 + bob); ctx.rotate(on ? t * (0.8 + k * 0.5) * (k % 2 ? -1 : 1) : 0.3 * k); ctx.strokeStyle = on ? col : '#4a5060'; ctx.globalAlpha = on ? 0.85 : 0.5; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, 0, 26 - k * 5, 9 - k, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      ctx.globalAlpha = 1; const gr = ctx.createRadialGradient(0, -58 + bob, 1, 0, -58 + bob, 11); gr.addColorStop(0, on ? '#ffffff' : '#777'); gr.addColorStop(1, on ? col : '#333'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -58 + bob, 9 + (on ? Math.sin(t * 5) : 0), 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = on ? (Math.sin(t * 4 + k) > 0 ? col : '#1a3a2a') : '#3a1a1a'; ctx.fillRect(-10 + k * 8, -30, 4, 4); }
    } else if (key === 'obelisk') {
      const gr = ctx.createLinearGradient(-12, -90, 12, 0); gr.addColorStop(0, on ? '#e8dcff' : '#6a6878'); gr.addColorStop(1, on ? '#3a2466' : '#22222a'); ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, -96 + bob); ctx.lineTo(12, -78 + bob); ctx.lineTo(9, -6 + bob); ctx.lineTo(-9, -6 + bob); ctx.lineTo(-12, -78 + bob); ctx.closePath(); ctx.fill(); ctx.strokeStyle = on ? col : '#555'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = on ? '#ffffff' : '#555'; for (let k = 0; k < 5; k++) { ctx.globalAlpha = on ? 0.5 + 0.5 * Math.sin(t * 3 - k) : 0.5; ctx.fillRect(-3, -70 + k * 12 + bob, 6, 2); ctx.fillRect(-1, -73 + k * 12 + bob, 2, 8); } ctx.globalAlpha = 1;
    } else if (key === 'relay') {
      ctx.strokeStyle = on ? col : '#556'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, -80); ctx.lineTo(14, 0); ctx.moveTo(-9, -28); ctx.lineTo(9, -28); ctx.moveTo(-5, -52); ctx.lineTo(5, -52); ctx.stroke();
      for (let k = 0; k < 3; k++) { const p = (t * 0.6 + k / 3) % 1; if (!on) break; ctx.globalAlpha = 1 - p; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -80, 8 + p * 40, (8 + p * 40) * 0.35, 0, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = on ? '#fff' : '#666'; ctx.beginPath(); ctx.arc(0, -82, 4.5, 0, 7); ctx.fill();
      if (on && CAM.z > 0.25) { ctx.strokeStyle = 'rgba(143,216,255,0.22)'; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 10; ctx.lineWidth = 2 / CAM.z; ctx.beginPath(); ctx.arc(0, 0, 320, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    } else if (key === 'crystal') {
      if (!q.used) { ctx.save(); ctx.scale(1.3, 1.3); shard(ctx, 0, 0, 12, 60, 0, '#fff8d8', '#d88a1a'); shard(ctx, -16, 0, 8, 36, -0.4, '#fff8d8', '#d88a1a'); shard(ctx, 16, 0, 8, 32, 0.45, '#fff8d8', '#d88a1a'); ctx.restore(); }
      else { ctx.fillStyle = '#5a4a30'; for (const [sx, h] of [[-12, 8], [0, 12], [11, 6]]) { ctx.beginPath(); ctx.moveTo(sx - 5, 0); ctx.lineTo(sx, -h); ctx.lineTo(sx + 5, 0); ctx.fill(); } }
    } else if (key === 'pod') {
      if (!q.used) { const beat = 1 + 0.04 * Math.max(0, Math.sin(t * 4)); ctx.save(); ctx.scale(beat, beat); const gr = ctx.createRadialGradient(-8, -46, 2, 0, -36, 30); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#ffc6e6'); gr.addColorStop(1, '#b0508a'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -36, 20, 28, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffe6f4'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(80,20,60,0.35)'; ctx.beginPath(); ctx.ellipse(0, -34, 10, 14, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else { ctx.fillStyle = '#7a4a66'; ctx.beginPath(); ctx.ellipse(0, -10, 20, 10, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = '#caa'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-12, -18); ctx.lineTo(-4, -10); ctx.lineTo(4, -19); ctx.lineTo(12, -10); ctx.lineTo(20, -16); ctx.stroke(); }
      ctx.fillStyle = '#2a3446'; ctx.fillRect(-16, -6, 32, 8);
    }
    ctx.restore();
    // 小标签（近看才显示）
    if (CAM.z > 0.55 && key !== 'cave') { ctx.font = `bold ${13 / CAM.z}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = on || (!q.used && (key === 'crystal' || key === 'pod')) ? col : 'rgba(200,210,230,0.6)'; ctx.fillText(POI[q.type].name + (key === 'reactor' || key === 'obelisk' || key === 'relay' ? (on ? ' · 运转中' : ' · 需接入能量网') : q.used ? ' · 已用尽' : ''), x, y + 34); }
  }
}
// 未发现的遗迹：黑暗里的声呐信号（提示玩家去挖黑墙）
function drawSignals(x0, y0, x1, y1) {
  const t = G.t, o = G.orb;
  for (const q of G.pois) {
    if (q.found) continue; const d = Math.hypot(q.x - o.x, q.y - o.y); if (d > 1300) continue;
    if (q.x < x0 - 100 || q.x > x1 + 100 || q.y < y0 - 100 || q.y > y1 + 100) continue;
    const a = Math.max(0.15, 1 - d / 1300), ph = ((t * 0.5 + q.x * 0.001) % 1 + 1) % 1;
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = POI[q.type].col; ctx.lineWidth = 2 / CAM.z;
    for (let k = 0; k < 2; k++) { const p = (ph + k * 0.5) % 1; ctx.globalAlpha = a * (1 - p) * 0.6; ctx.beginPath(); ctx.arc(q.x, q.y, 10 + p * 60, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = a * (0.5 + 0.3 * Math.sin(t * 3)); ctx.drawImage(SIGSPR, q.x - 16, q.y - 16, 32, 32);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.font = `bold ${16 / Math.max(0.5, CAM.z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('?', q.x, q.y + 6 / Math.max(0.5, CAM.z));
    ctx.globalAlpha = 1;
  }
}

/* ===================== v0.6 光灵（环境白色能量球） ===================== */
let WISPSPR = null;
function wispSprite() {
  if (WISPSPR) return WISPSPR; const S = 64, c = mkC(S), g = c.getContext('2d');
  let gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.18, 'rgba(255,246,210,0.95)'); gr.addColorStop(0.32, 'rgba(255,214,150,0.45)'); gr.addColorStop(0.6, 'rgba(255,170,90,0.12)'); gr.addColorStop(1, 'rgba(255,150,80,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return WISPSPR = c;
}
function drawWisps(x0, y0, x1, y1) {
  if (!wN) return; const spr = wispSprite(), t = G.t, z = CAM.z;
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < wN; k++) {
    if (!wval[k]) continue; const x = wx[k], y = wy[k]; if (x < x0 - 40 || x > x1 + 40 || y < y0 - 40 || y > y1 + 40) continue;
    const gi = gIdx(x, y); if (gi >= 0 && !seen[gi]) continue;
    const age = wage[k], fin = Math.min(1, age / 2), fout = age > WISP_LIFE - 12 ? Math.max(0, (WISP_LIFE - age) / 12) * (0.6 + 0.4 * Math.sin(age * 20)) : 1;
    const a = fin * fout, pul = 1 + 0.18 * Math.sin(t * 3 + wph[k] * 2), R = (7 + wval[k] * 1.1) * pul, bob = Math.sin(t * 1.6 + k) * 3;
    ctx.globalAlpha = a * 0.55; ctx.drawImage(spr, x - R * 2.2, y + bob - R * 2.2, R * 4.4, R * 4.4);
    ctx.globalAlpha = a; ctx.drawImage(spr, x - R * 0.8, y + bob - R * 0.8, R * 1.6, R * 1.6);
    if (z > 0.45) { ctx.fillStyle = '#ffffff'; for (let q = 0; q < 2; q++) { const an = t * (1.6 + q * 0.7) + k + q * 3.1; ctx.globalAlpha = a * 0.85; ctx.beginPath(); ctx.arc(x + Math.cos(an) * R * 1.25, y + bob + Math.sin(an) * R * 0.5, 1.2, 0, 7); ctx.fill(); } }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/* 彗星粒子：播撒 / 吸收光灵的拖尾动画 */
function drawComet(f, p) {
  const e = f.inw ? p * p : 1 - (1 - p) * (1 - p) * (1 - p);
  const pt = q => { const u = Math.max(0, Math.min(1, q)), ix = f.x + (f.tx - f.x) * u, iy = f.y + (f.ty - f.y) * u, dx = f.tx - f.x, dy = f.ty - f.y, bend = Math.sin(u * Math.PI) * (f.c || 0); return [ix - dy * bend, iy + dx * bend]; };
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const N = 7, tail = f.inw ? 0.35 : 0.3; let prev = pt(e - tail);
  for (let q = 1; q <= N; q++) { const u = e - tail + tail * q / N, cur = pt(u), w = q / N; ctx.globalAlpha = w * (f.inw ? 0.9 : 1 - p * 0.6); ctx.strokeStyle = f.color || '#bff8ff'; ctx.lineWidth = (f.w || 2.4) * w; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke(); prev = cur; }
  const [hx, hy] = pt(e), hr = (f.w || 2.4) * 3.2; ctx.globalAlpha = f.inw ? 1 : 1 - p * 0.5; ctx.drawImage(wispSprite(), hx - hr, hy - hr, hr * 2, hr * 2);
  if (!f.inw && p > 0.82) { ctx.globalAlpha = (1 - p) * 5 * 0.8; ctx.fillStyle = '#fff'; star4(f.tx, f.ty, 5 * (1 - p) * 5 + 1); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
