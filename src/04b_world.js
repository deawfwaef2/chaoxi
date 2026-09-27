/* ===================== 世界细节 v0.5：异星植被 / 物质结晶 / 遗迹 / 信号 / 环境光 ===================== */
let PROPS = null, MATSPR = null, SIGSPR = null;
const PROP_GLOW = [1, 1, 1, 1, 1, 0, 0, 1, 1, 0]; // 哪些植被会发光
const PROP_GCOL = ['#7ff4ff', '#c79bff', '#6fffd8', '#ff9fd8', '#b8ff8a', '', '', '#7fd8ff', '#ff9fb8', ''];
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
  const crystal = (c1, c2) => propCanvas(g => { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 0, 26, 7, 0, 0, 7); g.fill(); shard(g, -14, 0, 7, 26, -0.35, c1, c2); shard(g, 12, 0, 6, 22, 0.4, c1, c2); shard(g, 0, 2, 9, 42, 0.02, c1, c2); shard(g, 5, 2, 4, 14, 0.9, c1, c2); });
  P.push(crystal('#e6ffff', '#2bb8e8'));
  P.push(crystal('#f6e8ff', '#7a4ad8'));
  const mush = (cap, stem) => propCanvas(g => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 0, 24, 6, 0, 0, 7); g.fill();
    for (const [x, h, r] of [[-11, 20, 11], [9, 30, 14], [20, 12, 7]]) {
      g.fillStyle = stem; g.beginPath(); g.moveTo(x - 3, 0); g.quadraticCurveTo(x - 2, -h * 0.6, x - 2, -h); g.lineTo(x + 2, -h); g.quadraticCurveTo(x + 2, -h * 0.6, x + 3, 0); g.fill();
      const gr = g.createRadialGradient(x - r * 0.3, -h - r * 0.4, 1, x, -h, r * 1.2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, cap); gr.addColorStop(1, 'rgba(0,0,0,0.2)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, -h, r, r * 0.62, 0, Math.PI, 0); g.quadraticCurveTo(x, -h + r * 0.25, x - r, -h); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - r * 0.4 + k * r * 0.4, -h - r * 0.3 + (k % 2) * 2, r * 0.1, 0, 7); g.fill(); }
    }
  });
  P.push(mush('#5ff0d0', '#d8fff4'));
  P.push(mush('#ff8fcf', '#fff0f8'));
  P.push(propCanvas(g => { // 卷曲蕨类 + 发光芽尖
    g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const a = -1.2 + k * 0.48, L = 22 + (k % 3) * 8; g.strokeStyle = k % 2 ? '#3fa87a' : '#57c98f'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 0); const ex = Math.sin(a) * L, ey = -Math.cos(a) * L; g.quadraticCurveTo(ex * 0.3, ey * 0.7, ex, ey); g.stroke();
      g.fillStyle = '#d9ff9a'; g.beginPath(); g.arc(ex, ey, 3.2, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex - 1, ey - 1, 1.2, 0, 7); g.fill(); }
  }));
  P.push(propCanvas(g => { // 圆石 + 苔藓
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 0, 28, 7, 0, 0, 7); g.fill();
    const gr = g.createLinearGradient(-20, -30, 20, 0); gr.addColorStop(0, '#5a6a8a'); gr.addColorStop(1, '#1e2438'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-24, 0); g.bezierCurveTo(-28, -18, -10, -32, 6, -28); g.bezierCurveTo(22, -26, 28, -10, 24, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-6, -22, 10, 4, -0.3, 0, 7); g.fill();
    g.fillStyle = '#4fbf8a'; g.beginPath(); g.moveTo(-24, -2); g.bezierCurveTo(-18, -12, -4, -8, 4, -4); g.bezierCurveTo(-2, 0, -14, 0, -24, -2); g.fill();
  }));
  P.push(propCanvas(g => { // 卵石
    for (const [x, y, r, c] of [[-14, -3, 6, '#3a4666'], [2, -2, 8, '#46557a'], [15, -4, 5, '#2e3854'], [-3, -9, 4, '#52628a']]) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + r * 0.6, r * 1.1, r * 0.35, 0, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.2, 0, 0, 7); g.fill(); }
  }));
  P.push(propCanvas(g => { // 科技残骸：碎裂的六边形板 + 暗灯
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 0, 28, 7, 0, 0, 7); g.fill();
    g.save(); g.scale(1, 0.5); g.fillStyle = '#2a3446'; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24 - 8); } g.closePath(); g.fill();
    g.strokeStyle = '#6f8bb0'; g.lineWidth = 2; g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.moveTo(-10, -20); g.lineTo(2, -6); g.lineTo(-4, 10); g.stroke(); g.restore();
    g.fillStyle = '#7fe8ff'; g.beginPath(); g.arc(8, -6, 2.2, 0, 7); g.fill(); g.fillStyle = '#ff9fb8'; g.beginPath(); g.arc(-12, -2, 1.6, 0, 7); g.fill();
    g.fillStyle = '#3a4a64'; g.fillRect(12, -14, 4, 10); g.fillStyle = '#9fd8ff'; g.fillRect(12.5, -13, 3, 2);
  }));
  P.push(propCanvas(g => { // 珊瑚扇
    g.lineCap = 'round';
    const br = (x, y, a, L, w, d) => { if (d > 3) return; const ex = x + Math.sin(a) * L, ey = y - Math.cos(a) * L; g.strokeStyle = d < 2 ? '#ff7fa8' : '#ffb0c8'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); br(ex, ey, a - 0.45, L * 0.72, w * 0.7, d + 1); br(ex, ey, a + 0.45, L * 0.72, w * 0.7, d + 1); if (d === 3) { g.fillStyle = '#fff0f6'; g.beginPath(); g.arc(ex, ey, 1.6, 0, 7); g.fill(); } };
    br(0, 0, 0, 14, 4, 0);
  }));
  P.push(propCanvas(g => { // 小花丛
    for (let k = 0; k < 7; k++) { const x = (k - 3) * 6 + (k % 2) * 2, h = 8 + (k * 7) % 12; g.strokeStyle = '#4aa878'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (k % 3 - 1) * 2, -h); g.stroke();
      const c = ['#fff27a', '#ffffff', '#9ff4ff', '#ffb3f2'][k % 4]; g.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q * 1.2566; g.beginPath(); g.arc(x + (k % 3 - 1) * 2 + Math.cos(a) * 2.6, -h + Math.sin(a) * 2.6, 1.9, 0, 7); g.fill(); } g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(x + (k % 3 - 1) * 2, -h, 1.4, 0, 7); g.fill(); }
  }));
  PROPS = P;
  // 物质结晶（金色六棱晶体）
  MATSPR = mkC(48); { const g = MATSPR.getContext('2d'); g.translate(24, 26); const gl = g.createRadialGradient(0, 0, 0, 0, 0, 22); gl.addColorStop(0, 'rgba(255,220,120,0.55)'); gl.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gl; g.fillRect(-24, -26, 48, 48);
    const gr = g.createLinearGradient(-8, -12, 8, 10); gr.addColorStop(0, '#fff8d8'); gr.addColorStop(0.5, '#ffd36b'); gr.addColorStop(1, '#c47a16'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(8, -6); g.lineTo(8, 6); g.lineTo(0, 13); g.lineTo(-8, 6); g.lineTo(-8, -6); g.closePath(); g.fill(); g.strokeStyle = '#fff3c0'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(0, -13); g.lineTo(-8, -6); g.lineTo(-3, -3); g.lineTo(0, -8); g.closePath(); g.fill(); }
  SIGSPR = mkC(64); { const g = SIGSPR.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, 'rgba(160,220,255,0.4)'); gr.addColorStop(1, 'rgba(120,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
}

/* ---------- 植被：按格子哈希确定位置（开阔 + 已探索的格子才画） ---------- */
function drawProps(gx0, gy0, gx1, gy1) {
  const z = CAM.z; if (z < 0.3 || !PROPS) return;
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
  if (glows.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < glows.length; k += 5) { const tp = glows[k + 3]; ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 1.6 + glows[k + 4] * 20); ctx.drawImage(glowTint(tp), glows[k] - glows[k + 2], glows[k + 1] - glows[k + 2], glows[k + 2] * 2, glows[k + 2] * 2); }
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
