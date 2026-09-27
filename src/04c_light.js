/* ============ v0.7 微恐主题：黑暗 + 光照 + 黑暗中的眼睛 ============ */
let LC = null, LG = null, LSPR = null, EYESPR = {};
const LIGHT_SCALE = 3; // 光照图 = 屏幕 1/3 分辨率
// 暗度随光域等级下降：Lv0 几乎漆黑，Lv9 天亮
function darkness() { return Math.max(0.28, 0.93 - G.lv * 0.07); }
function lightSprite() {
  if (LSPR) return LSPR; const S = 128, c = mkC(S), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.75, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return LSPR = c;
}
function eyeSprite(col) {
  if (EYESPR[col]) return EYESPR[col]; const S = 32, c = mkC(S), g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(0.45, col + '66'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return EYESPR[col] = c;
}
const GLOW_SP = { firefly: 55, phoenix: 90, jelly: 50, fish: 40, ghost: 45, unicorn: 60, mush: 30 };
let _lights = [];
function collectLights(x0, y0, x1, y1) {
  const L = _lights; L.length = 0; const t = G.t, o = G.orb, pad = 320;
  const inV = (x, y, r) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
  if (!o.dead) { const tf = Math.max(0, Math.min(1, o.tank / tankMax(G.lv))); L.push([o.x, o.y, (150 + 110 * tf) * (1 + Math.sin(t * 7) * 0.025 + Math.sin(t * 13) * 0.015) * (o.spray ? 1.18 : 1)]); }
  L.push([0, -30, 230 + G.lv * 14]);
  for (const d of G.devs) { if (!inV(d.x, d.y, pad)) continue; const def = DEVICES[d.type]; if (d.bt > 0) { L.push([d.x, d.y, 40]); continue; } L.push([d.x, d.y - 10, def.pf ? def.pf * 0.72 : 70]); }
  for (let k = 0; k < wN; k++) if (wval[k] && inV(wx[k], wy[k], 40)) L.push([wx[k], wy[k], 34]);
  if (CAM.z > 0.3) for (let i = 0; i < cN; i++) { if (cdead[i]) continue; const r = GLOW_SP[SPECIES[csp[i]].key]; if (r && inV(cx[i], cy[i], r)) L.push([cx[i], cy[i], r * cg[i]]); }
  return L;
}
function lightAt(x, y) { let m = 0; for (const l of _lights) { const dx = x - l[0], dy = y - l[1], r = l[2], d2 = dx * dx + dy * dy; if (d2 < r * r) { const f = 1 - Math.sqrt(d2) / r; const v = f < 0.45 ? f / 0.45 * 0.9 : 0.9 + (f - 0.45) * 0.18; if (v > m) m = v; } } return Math.min(1, m); }
function drawDarkness(x0, y0, x1, y1) {
  const W = CAM.W, H = CAM.H, lw = Math.ceil(W / LIGHT_SCALE), lh = Math.ceil(H / LIGHT_SCALE);
  if (!LC || LC.width !== lw || LC.height !== lh) { LC = mkC(lw, lh); LG = LC.getContext('2d'); }
  const D = darkness(), z = CAM.z / LIGHT_SCALE, spr = lightSprite();
  collectLights(x0, y0, x1, y1);
  LG.globalCompositeOperation = 'source-over'; LG.clearRect(0, 0, lw, lh);
  LG.fillStyle = `rgba(6,3,14,${D})`; LG.fillRect(0, 0, lw, lh);
  LG.globalCompositeOperation = 'destination-out';
  for (const l of _lights) { const sx = (l[0] - CAM.x) * z + lw / 2, sy = (l[1] - CAM.y) * z + lh / 2, r = l[2] * z; if (sx < -r || sy < -r || sx > lw + r || sy > lh + r) continue; LG.drawImage(spr, sx - r, sy - r, r * 2, r * 2); }
  // 暖色光晕（被照亮的地方偏暖橙）
  LG.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(LC, 0, 0, cvs.width, cvs.height);
  worldT();
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.55;
  for (const l of _lights) { if (l[2] < 100) continue; ctx.drawImage(glowTintW(), l[0] - l[2], l[1] - l[2], l[2] * 2, l[2] * 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
let _gtw = null;
function glowTintW() { if (_gtw) return _gtw; const c = mkC(64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return _gtw = c; }
// 黑暗中的眼睛：离光越远越亮；偶尔眨眼
function drawEyes(x0, y0, x1, y1) {
  if (CAM.z < 0.22) return; const D = darkness(), t = G.t; let n = 0;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < cN; i++) {
    if (cdead[i]) continue; const x = cx[i], y = cy[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    { const gi = gIdx(x, y); if (gi >= 0 && !seen[gi]) continue; }
    const a = D * (1 - lightAt(x, y)) * 1.15 - 0.12; if (a <= 0.05) continue;
    const ph = (cid[i] * 0.618) % 1, bl = ((t * 0.27 + ph) % 1); if (bl < 0.035) continue; // 眨眼
    const sp = SPECIES[csp[i]], r = S_r[csp[i]] * cg[i] * VIS, e = eyeSprite(sp.eye || '#ffd36b');
    const ex = r * 0.36, ey = y - r * 0.08 + (sp.mv === MV_FLY ? -r * 0.2 : 0), es = Math.max(2.4, r * 0.34) * (1 + Math.sin(t * 3 + ph * 9) * 0.06);
    ctx.globalAlpha = Math.min(1, a);
    if (sp.key === 'unicorn') ctx.drawImage(e, x - es * 1.3, ey - es * 1.3, es * 2.6, es * 2.6); // 独眼
    else { ctx.drawImage(e, x - ex - es, ey - es, es * 2, es * 2); ctx.drawImage(e, x + ex - es, ey - es, es * 2, es * 2); }
    if (++n > 1500) break;
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// 小灯（玩家）：一团会眨眼的暖色火苗
function drawLantern(o, t) {
  const x = o.x, y = o.y, fl = Math.sin(t * 9) * 0.6 + Math.sin(t * 14.3) * 0.4;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(glowTintW(), x - 46, y - 50, 92, 92); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // 火苗身体
  const g = ctx.createRadialGradient(x - 2, y + 2, 1, x, y, 16);
  g.addColorStop(0, '#fffbe8'); g.addColorStop(0.45, '#ffe08a'); g.addColorStop(0.8, '#ffab4a'); g.addColorStop(1, '#ff7a2a');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(x, y - 22 - fl * 2); ctx.bezierCurveTo(x + 6 + fl, y - 14, x + 13, y - 6, x + 12, y + 3);
  ctx.bezierCurveTo(x + 11, y + 12, x - 11, y + 12, x - 12, y + 3); ctx.bezierCurveTo(x - 13, y - 6, x - 6 + fl, y - 14, x, y - 22 - fl * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 4, y - 4, 2.4, 4, -0.4, 0, 7); ctx.fill();
  // 脸：会眨眼
  const bl = (t % 3.7) < 0.12; ctx.fillStyle = '#4a2410';
  if (bl) { ctx.fillRect(x - 6, y + 1, 4, 1.4); ctx.fillRect(x + 2, y + 1, 4, 1.4); }
  else { ctx.beginPath(); ctx.ellipse(x - 4, y + 1.5, 1.7, 2.3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 4, y + 1.5, 1.7, 2.3, 0, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#4a2410'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y + 5, 1.8, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,90,0.5)'; ctx.beginPath(); ctx.arc(x - 7.5, y + 5, 1.8, 0, 7); ctx.arc(x + 7.5, y + 5, 1.8, 0, 7); ctx.fill();
}
