/* ===================== Q版生物精灵（全部代码绘制，预渲染 + mipmap） ===================== */
// 变体：0 普通 1 眨眼 2 年迈(困倦+褪色) 3 开心 4 害怕 5 生气（战斗）
const NVAR = 6;
const SPR_BODY = 0.30; // 身体半径占画布比例
const SPRITES = []; // SPRITES[s][variant] = [c128, c64, c32, c16]
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mixc(h, h2, t) { const a = hex2rgb(h), b = hex2rgb(h2); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; }
function shade(h, k) { const a = hex2rgb(h); return 'rgb(' + a.map(v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))).join(',') + ')'; }

function drawFace(g, x, y, R, v, dark) {
  const ex = R * 0.36, ey = y, er = R * 0.15;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 腮红
  g.fillStyle = 'rgba(255,120,150,0.45)';
  g.beginPath(); g.ellipse(x - R * 0.58, y + R * 0.26, R * 0.17, R * 0.1, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x + R * 0.58, y + R * 0.26, R * 0.17, R * 0.1, 0, 0, 7); g.fill();
  g.strokeStyle = dark; g.fillStyle = dark; g.lineWidth = R * 0.09;
  if (v === 0) {
    for (const s of [-1, 1]) {
      g.fillStyle = dark; g.beginPath(); g.ellipse(x + s * ex, ey, er * 0.85, er * 1.1, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + s * ex - er * 0.3, ey - er * 0.4, er * 0.38, 0, 7); g.fill();
      g.beginPath(); g.arc(x + s * ex + er * 0.3, ey + er * 0.35, er * 0.16, 0, 7); g.fill();
    }
  } else if (v === 1) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * ex - er, ey); g.quadraticCurveTo(x + s * ex, ey + er * 0.8, x + s * ex + er, ey); g.stroke(); }
  } else if (v === 2) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * ex - er, ey + er * 0.2); g.lineTo(x + s * ex + er, ey + er * 0.2); g.stroke(); g.lineWidth = R * 0.05; g.beginPath(); g.moveTo(x + s * ex - er * 1.1, ey - er * 0.6); g.lineTo(x + s * ex + er * 0.6, ey - er * 0.9); g.stroke(); g.lineWidth = R * 0.09; }
  } else if (v === 3) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * ex - er, ey + er * 0.3); g.quadraticCurveTo(x + s * ex, ey - er * 1.1, x + s * ex + er, ey + er * 0.3); g.stroke(); }
  } else if (v === 5) {
    for (const s of [-1, 1]) {
      g.fillStyle = dark; g.beginPath(); g.ellipse(x + s * ex, ey + er * 0.15, er * 0.8, er * 0.85, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + s * ex - er * 0.25, ey - er * 0.1, er * 0.3, 0, 7); g.fill();
      g.lineWidth = R * 0.1; g.beginPath(); g.moveTo(x + s * ex * 1.55, ey - er * 1.5); g.lineTo(x + s * ex * 0.45, ey - er * 0.8); g.stroke();
    }
    // 💢 怒气符号
    g.strokeStyle = '#ff4d6d'; g.lineWidth = R * 0.08; const ax = x + R * 0.78, ay = y - R * 0.78, q = R * 0.13;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(ax + sx * q * 0.4, ay + sy * q * 1.6); g.quadraticCurveTo(ax + sx * q * 0.5, ay + sy * q * 0.5, ax + sx * q * 1.6, ay + sy * q * 0.4); g.stroke(); }
    g.strokeStyle = dark;
  } else if (v === 4) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * ex - er * s, ey - er); g.lineTo(x + s * ex + er * 0.6 * s, ey); g.lineTo(x + s * ex - er * s, ey + er); g.stroke(); }
    g.fillStyle = 'rgba(150,220,255,0.9)'; g.beginPath(); g.moveTo(x + R * 0.8, y - R * 0.5); g.quadraticCurveTo(x + R * 0.95, y - R * 0.25, x + R * 0.8, y - R * 0.15); g.quadraticCurveTo(x + R * 0.65, y - R * 0.25, x + R * 0.8, y - R * 0.5); g.fill();
  }
  // 嘴
  g.lineWidth = R * 0.07; g.strokeStyle = dark;
  if (v === 4) { g.beginPath(); g.ellipse(x, y + R * 0.3, R * 0.08, R * 0.1, 0, 0, 7); g.stroke(); }
  else if (v === 5) { g.beginPath(); g.moveTo(x - R * 0.14, y + R * 0.34); g.quadraticCurveTo(x, y + R * 0.2, x + R * 0.14, y + R * 0.34); g.stroke(); g.fillStyle = '#fff'; g.fillRect(x - R * 0.05, y + R * 0.26, R * 0.04, R * 0.05); g.fillRect(x + R * 0.02, y + R * 0.26, R * 0.04, R * 0.05); }
  else if (v === 3) { g.fillStyle = '#ff6b8b'; g.beginPath(); g.moveTo(x - R * 0.14, y + R * 0.22); g.quadraticCurveTo(x, y + R * 0.5, x + R * 0.14, y + R * 0.22); g.closePath(); g.fill(); }
  else { g.beginPath(); g.moveTo(x - R * 0.13, y + R * 0.24); g.quadraticCurveTo(x - R * 0.065, y + R * 0.34, x, y + R * 0.25); g.quadraticCurveTo(x + R * 0.065, y + R * 0.34, x + R * 0.13, y + R * 0.24); g.stroke(); }
}
function blob(g, x, y, rx, ry, col, col2) {
  const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, rx * 0.1, x, y, Math.max(rx, ry) * 1.1);
  gr.addColorStop(0, shade(col, 0.55)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.22));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
}
function shine(g, x, y, R) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(x - R * 0.42, y - R * 0.5, R * 0.2, R * 0.12, -0.6, 0, 7); g.fill(); g.beginPath(); g.arc(x - R * 0.15, y - R * 0.66, R * 0.06, 0, 7); g.fill(); }
function outline(g, lw, c) { g.lineWidth = lw; g.strokeStyle = c; g.stroke(); }

function drawSpecies(g, s, S, v, noRim) {
  const sp = SPECIES[s]; const R = S * SPR_BODY, x = S / 2, y = S / 2 + S * 0.05;
  let col = sp.col, col2 = sp.col2;
  if (v === 2) { col = mixc(col, '#d8d0e8', 0.2); col2 = mixc(col2, '#e0dcea', 0.18); }
  const dark = '#3a2a3a', ol = shade(col, -0.35), lw = S * 0.018;
  g.save();
  const key = sp.key;
  if (key === 'slime') {
    const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.3, R * 0.1, x, y, R * 1.2); gr.addColorStop(0, shade(col, 0.6)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, -0.25));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - R * 1.12); g.bezierCurveTo(x + R * 0.35, y - R * 0.95, x + R * 1.08, y - R * 0.3, x + R * 1.05, y + R * 0.4); g.quadraticCurveTo(x + R * 1.02, y + R * 0.95, x, y + R * 0.95); g.quadraticCurveTo(x - R * 1.02, y + R * 0.95, x - R * 1.05, y + R * 0.4); g.bezierCurveTo(x - R * 1.08, y - R * 0.3, x - R * 0.35, y - R * 0.95, x, y - R * 1.12); g.fill(); outline(g, lw, ol);
    shine(g, x, y, R); drawFace(g, x, y + R * 0.12, R, v, dark);
  } else if (key === 'mush') {
    blob(g, x, y + R * 0.28, R * 0.78, R * 0.66, col2, col2); g.beginPath(); g.ellipse(x, y + R * 0.28, R * 0.78, R * 0.66, 0, 0, 7); outline(g, lw, shade(col2, -0.3));
    drawFace(g, x, y + R * 0.3, R * 0.8, v, dark);
    const gr = g.createLinearGradient(0, y - R * 1.1, 0, y); gr.addColorStop(0, shade(col, 0.25)); gr.addColorStop(1, shade(col, -0.15));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - R * 1.12, y - R * 0.02); g.bezierCurveTo(x - R * 1.1, y - R * 1.25, x + R * 1.1, y - R * 1.25, x + R * 1.12, y - R * 0.02); g.quadraticCurveTo(x, y + R * 0.18, x - R * 1.12, y - R * 0.02); g.fill(); outline(g, lw, shade(col, -0.35));
    g.fillStyle = 'rgba(255,255,255,0.92)'; for (const [a, b, r] of [[-0.55, -0.55, 0.2], [0.25, -0.75, 0.16], [0.7, -0.3, 0.13], [-0.1, -0.3, 0.1]]) { g.beginPath(); g.arc(x + a * R, y + b * R, r * R, 0, 7); g.fill(); }
  } else if (key === 'bunny') {
    for (const sx of [-1, 1]) { g.save(); g.translate(x + sx * R * 0.38, y - R * 0.75); g.rotate(sx * 0.18); blob(g, 0, -R * 0.42, R * 0.24, R * 0.62, col, col); g.beginPath(); g.ellipse(0, -R * 0.42, R * 0.24, R * 0.62, 0, 0, 7); outline(g, lw, shade(col, -0.25)); g.fillStyle = col2; g.beginPath(); g.ellipse(0, -R * 0.38, R * 0.11, R * 0.42, 0, 0, 7); g.fill(); g.restore(); }
    blob(g, x, y + R * 0.05, R * 1.05, R * 0.9, col, col); g.beginPath(); g.ellipse(x, y + R * 0.05, R * 1.05, R * 0.9, 0, 0, 7); outline(g, lw, shade(col, -0.25));
    shine(g, x, y, R); drawFace(g, x + R * 0.08, y + R * 0.12, R, v, dark);
  } else if (key === 'firefly') {
    const glow = g.createRadialGradient(x, y, 0, x, y, R * 1.7); glow.addColorStop(0, 'rgba(255,250,150,0.55)'); glow.addColorStop(1, 'rgba(255,250,150,0)'); g.fillStyle = glow; g.beginPath(); g.arc(x, y, R * 1.7, 0, 7); g.fill();
    g.fillStyle = 'rgba(220,245,255,0.7)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(x + sx * R * 0.55, y - R * 0.85, R * 0.35, R * 0.6, sx * 0.6, 0, 7); g.fill(); }
    blob(g, x, y, R, R * 0.95, col, col); g.beginPath(); g.ellipse(x, y, R, R * 0.95, 0, 0, 7); outline(g, lw, shade(col, -0.3));
    g.strokeStyle = dark; g.lineWidth = lw * 1.2; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * R * 0.25, y - R * 0.85); g.quadraticCurveTo(x + sx * R * 0.4, y - R * 1.3, x + sx * R * 0.6, y - R * 1.3); g.stroke(); g.fillStyle = col2; g.beginPath(); g.arc(x + sx * R * 0.62, y - R * 1.3, R * 0.12, 0, 7); g.fill(); }
    shine(g, x, y, R); drawFace(g, x, y + R * 0.08, R, v, dark);
  } else if (key === 'fox') {
    // 尾巴
    g.save(); g.translate(x - R * 0.95, y + R * 0.3); g.rotate(-0.7); blob(g, 0, -R * 0.2, R * 0.38, R * 0.7, col, col); g.fillStyle = col2; g.beginPath(); g.ellipse(0, -R * 0.72, R * 0.22, R * 0.22, 0, 0, 7); g.fill(); g.restore();
    for (const sx of [-1, 1]) { g.fillStyle = col; g.beginPath(); g.moveTo(x + sx * R * 0.85, y - R * 0.35); g.quadraticCurveTo(x + sx * R * 0.85, y - R * 1.2, x + sx * R * 0.55, y - R * 1.2); g.quadraticCurveTo(x + sx * R * 0.3, y - R * 0.9, x + sx * R * 0.15, y - R * 0.75); g.closePath(); g.fill(); outline(g, lw, ol); g.fillStyle = '#ffd9e6'; g.beginPath(); g.moveTo(x + sx * R * 0.72, y - R * 0.5); g.quadraticCurveTo(x + sx * R * 0.72, y - R * 1.0, x + sx * R * 0.58, y - R * 1.0); g.quadraticCurveTo(x + sx * R * 0.42, y - R * 0.8, x + sx * R * 0.32, y - R * 0.72); g.fill(); }
    blob(g, x, y, R * 1.02, R * 0.92, col, col); g.beginPath(); g.ellipse(x, y, R * 1.02, R * 0.92, 0, 0, 7); outline(g, lw, ol);
    g.fillStyle = col2; g.beginPath(); g.ellipse(x, y + R * 0.38, R * 0.62, R * 0.46, 0, 0, 7); g.fill();
    shine(g, x, y, R); drawFace(g, x, y + R * 0.08, R, v, dark);
    g.fillStyle = dark; g.beginPath(); g.ellipse(x, y + R * 0.2, R * 0.08, R * 0.055, 0, 0, 7); g.fill();
  } else if (key === 'fish') {
    g.fillStyle = shade(col, -0.1); g.beginPath(); g.moveTo(x - R * 0.8, y); g.lineTo(x - R * 1.35, y - R * 0.55); g.quadraticCurveTo(x - R * 1.15, y, x - R * 1.35, y + R * 0.55); g.closePath(); g.fill(); outline(g, lw, ol);
    g.beginPath(); g.moveTo(x - R * 0.2, y - R * 0.75); g.quadraticCurveTo(x + R * 0.1, y - R * 1.25, x + R * 0.4, y - R * 0.72); g.fill();
    blob(g, x, y, R * 1.05, R * 0.82, col, col); g.beginPath(); g.ellipse(x, y, R * 1.05, R * 0.82, 0, 0, 7); outline(g, lw, ol);
    g.fillStyle = col2; g.beginPath(); g.ellipse(x + R * 0.1, y + R * 0.4, R * 0.6, R * 0.3, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = lw; g.beginPath(); g.arc(x + R * 1.25, y - R * 0.7, R * 0.14, 0, 7); g.stroke(); g.beginPath(); g.arc(x + R * 1.45, y - R * 1.0, R * 0.09, 0, 7); g.stroke();
    shine(g, x, y, R); drawFace(g, x + R * 0.25, y, R * 0.9, v, dark);
  } else if (key === 'snail') {
    blob(g, x + R * 0.1, y + R * 0.45, R * 1.15, R * 0.5, col2, col2); g.beginPath(); g.ellipse(x + R * 0.1, y + R * 0.45, R * 1.15, R * 0.5, 0, 0, 7); outline(g, lw, shade(col2, -0.3));
    g.strokeStyle = shade(col2, -0.3); g.lineWidth = lw * 1.4; for (const sx of [0.55, 0.95]) { g.beginPath(); g.moveTo(x + R * sx, y + R * 0.1); g.lineTo(x + R * (sx + 0.1), y - R * 0.5); g.stroke(); g.fillStyle = col2; g.beginPath(); g.arc(x + R * (sx + 0.1), y - R * 0.55, R * 0.12, 0, 7); g.fill(); }
    const gr = g.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x - R * 0.2, y - R * 0.1, R); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.4, shade(col, 0.2)); gr.addColorStop(1, shade(col, -0.2));
    g.fillStyle = gr; g.globalAlpha = 0.92; g.beginPath(); g.arc(x - R * 0.2, y - R * 0.1, R * 0.82, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(x - R * 0.2, y - R * 0.1, R * 0.82, 0, 7); outline(g, lw, shade(col, -0.35));
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = lw * 1.5; g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const rr = R * 0.06 * a; const qx = x - R * 0.2 + Math.cos(a) * rr * 0.9, qy = y - R * 0.1 + Math.sin(a) * rr * 0.9; if (a === 0) g.moveTo(qx, qy); else g.lineTo(qx, qy); } g.stroke();
    drawFace(g, x + R * 0.7, y + R * 0.42, R * 0.5, v, dark);
  } else if (key === 'bear') {
    for (const sx of [-1, 1]) { blob(g, x + sx * R * 0.72, y - R * 0.72, R * 0.3, R * 0.3, '#c98a50', '#c98a50'); g.fillStyle = '#ffd1c4'; g.beginPath(); g.arc(x + sx * R * 0.72, y - R * 0.72, R * 0.15, 0, 7); g.fill(); }
    blob(g, x, y + R * 0.05, R * 1.05, R * 0.95, col2, col2); g.beginPath(); g.ellipse(x, y + R * 0.05, R * 1.05, R * 0.95, 0, 0, 7); outline(g, lw, shade(col2, -0.35));
    // 焦糖顶
    g.fillStyle = '#b8743c'; g.beginPath(); g.moveTo(x - R * 0.98, y - R * 0.2); g.bezierCurveTo(x - R * 0.9, y - R * 1.05, x + R * 0.9, y - R * 1.05, x + R * 0.98, y - R * 0.2);
    for (let k = 0; k <= 6; k++) { const qx = x + R * 0.98 - k * R * 0.327, qy = y - R * 0.2 + (k % 2 ? R * 0.22 : 0); g.lineTo(qx, qy); } g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(x - R * 0.4, y - R * 0.62, R * 0.22, R * 0.08, -0.4, 0, 7); g.fill();
    g.fillStyle = '#fff8e0'; g.beginPath(); g.ellipse(x, y + R * 0.38, R * 0.36, R * 0.26, 0, 0, 7); g.fill();
    drawFace(g, x, y + R * 0.15, R, v, dark);
    g.fillStyle = dark; g.beginPath(); g.ellipse(x, y + R * 0.3, R * 0.09, R * 0.06, 0, 0, 7); g.fill();
  } else if (key === 'jelly') {
    g.strokeStyle = shade(col2, -0.05); g.lineWidth = R * 0.13; g.lineCap = 'round';
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * R * 0.3, y + R * 0.3); g.bezierCurveTo(x + k * R * 0.3 + R * 0.2, y + R * 0.7, x + k * R * 0.3 - R * 0.2, y + R * 0.9, x + k * R * 0.32, y + R * 1.15); g.stroke(); }
    const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.5, R * 0.1, x, y, R * 1.2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.25));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - R * 1.05, y + R * 0.35); g.bezierCurveTo(x - R * 1.1, y - R * 1.15, x + R * 1.1, y - R * 1.15, x + R * 1.05, y + R * 0.35); for (let k = 0; k < 5; k++) { g.quadraticCurveTo(x + R * 1.05 - (k + 0.5) * R * 0.42, y + R * 0.55, x + R * 1.05 - (k + 1) * R * 0.42, y + R * 0.35); } g.fill(); outline(g, lw, shade(col, -0.35));
    // 星星
    g.fillStyle = '#fff27a'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? R * 0.1 : R * 0.24; g.lineTo(x + Math.cos(a) * rr, y - R * 0.6 + Math.sin(a) * rr); } g.fill();
    drawFace(g, x, y - R * 0.05, R * 0.85, v, dark);
  } else if (key === 'bird') {
    g.fillStyle = col2; g.beginPath(); g.moveTo(x + R * 0.95, y - R * 0.05); g.lineTo(x + R * 1.35, y + R * 0.08); g.lineTo(x + R * 0.95, y + R * 0.25); g.fill();
    blob(g, x, y, R * 1.05, R, col, col); g.beginPath(); g.ellipse(x, y, R * 1.05, R, 0, 0, 7); outline(g, lw, shade(col, -0.25));
    for (let k = 0; k < 3; k++) { g.fillStyle = col; g.beginPath(); g.ellipse(x - R * 0.1 + k * R * 0.15, y - R * 1.0, R * 0.1, R * 0.25, -0.4 + k * 0.4, 0, 7); g.fill(); }
    g.fillStyle = shade(col, -0.08); g.beginPath(); g.ellipse(x - R * 0.55, y + R * 0.2, R * 0.45, R * 0.3, -0.5, 0, 7); g.fill(); outline(g, lw * 0.8, shade(col, -0.25));
    shine(g, x, y, R); drawFace(g, x + R * 0.25, y + R * 0.02, R * 0.9, v, dark);
  } else if (key === 'whale') {
    g.fillStyle = col; g.beginPath(); g.moveTo(x - R * 0.85, y + R * 0.1); g.quadraticCurveTo(x - R * 1.3, y - R * 0.1, x - R * 1.5, y - R * 0.55); g.quadraticCurveTo(x - R * 1.25, y - R * 0.2, x - R * 1.6, y + R * 0.15); g.quadraticCurveTo(x - R * 1.25, y + R * 0.2, x - R * 0.85, y + R * 0.4); g.fill(); outline(g, lw, shade(col, -0.25));
    blob(g, x, y + R * 0.05, R * 1.12, R * 0.88, col, col); g.beginPath(); g.ellipse(x, y + R * 0.05, R * 1.12, R * 0.88, 0, 0, 7); outline(g, lw, shade(col, -0.25));
    g.fillStyle = '#fff'; for (const [a, b, r] of [[-0.6, -0.72, 0.3], [-0.2, -0.85, 0.32], [0.25, -0.78, 0.26]]) { g.beginPath(); g.arc(x + a * R, y + b * R, r * R, 0, 7); g.fill(); }
    g.fillStyle = col2; g.beginPath(); g.ellipse(x + R * 0.1, y + R * 0.52, R * 0.75, R * 0.3, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(160,220,255,0.9)'; g.lineWidth = lw * 1.5; g.beginPath(); g.moveTo(x + R * 0.2, y - R * 0.95); g.quadraticCurveTo(x + R * 0.1, y - R * 1.35, x - R * 0.1, y - R * 1.4); g.moveTo(x + R * 0.2, y - R * 0.95); g.quadraticCurveTo(x + R * 0.35, y - R * 1.35, x + R * 0.55, y - R * 1.4); g.stroke();
    drawFace(g, x + R * 0.35, y + R * 0.1, R * 0.8, v, dark);
  } else if (key === 'dragon') {
    g.fillStyle = shade(col, -0.15); g.beginPath(); g.moveTo(x - R * 0.9, y + R * 0.3); g.quadraticCurveTo(x - R * 1.5, y + R * 0.5, x - R * 1.45, y + R * 0.05); g.quadraticCurveTo(x - R * 1.2, y + R * 0.35, x - R * 0.9, y + R * 0.1); g.fill();
    g.fillStyle = 'rgba(255,190,220,0.9)'; g.beginPath(); g.moveTo(x - R * 0.3, y - R * 0.5); g.quadraticCurveTo(x - R * 1.2, y - R * 1.4, x - R * 1.1, y - R * 0.3); g.quadraticCurveTo(x - R * 0.8, y - R * 0.6, x - R * 0.3, y - R * 0.2); g.fill(); outline(g, lw, '#d98bb0');
    for (let k = 0; k < 3; k++) { g.fillStyle = col2; g.beginPath(); const qx = x - R * 0.2 - k * R * 0.35, qy = y - R * 0.9 + k * R * 0.18; g.moveTo(qx - R * 0.14, qy + R * 0.1); g.lineTo(qx, qy - R * 0.22); g.lineTo(qx + R * 0.14, qy + R * 0.1); g.fill(); }
    blob(g, x, y, R * 1.05, R * 0.95, col, col); g.beginPath(); g.ellipse(x, y, R * 1.05, R * 0.95, 0, 0, 7); outline(g, lw, ol);
    for (const sx of [0.25, 0.75]) { g.fillStyle = '#fff6d0'; g.beginPath(); g.moveTo(x + R * sx - R * 0.12, y - R * 0.78); g.quadraticCurveTo(x + R * sx, y - R * 1.3, x + R * sx + R * 0.14, y - R * 0.72); g.fill(); outline(g, lw * 0.8, '#d8c080'); }
    g.fillStyle = col2; g.beginPath(); g.ellipse(x + R * 0.1, y + R * 0.4, R * 0.6, R * 0.42, 0, 0, 7); g.fill();
    shine(g, x, y, R); drawFace(g, x + R * 0.2, y + R * 0.05, R * 0.95, v, dark);
  }
  g.restore();
  if (!noRim) rimLight(g, S, col);
}
// 轮廓光 + 次表面散射：让身体有“果冻”透光感
function rimLight(g, S, col) {
  const x = S / 2, y = S / 2 + S * 0.05, R = S * SPR_BODY;
  g.save(); g.globalCompositeOperation = 'source-atop';
  const rg = g.createRadialGradient(x - R * 0.35, y - R * 0.45, R * 0.6, x, y, R * 1.45);
  rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.72, 'rgba(255,255,255,0)'); rg.addColorStop(0.9, 'rgba(190,240,255,0.32)'); rg.addColorStop(1, 'rgba(210,250,255,0.55)');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  const sg = g.createLinearGradient(0, y + R * 0.2, 0, y + R * 1.1); sg.addColorStop(0, 'rgba(40,10,60,0)'); sg.addColorStop(1, 'rgba(40,10,60,0.22)');
  g.fillStyle = sg; g.fillRect(0, 0, S, S);
  g.restore();
}
// 柔和深色描边：小尺寸下也能从地面上清晰分辨轮廓
function outlineSprite(c) {
  const S = c.width, o = document.createElement('canvas'); o.width = o.height = S; const g = o.getContext('2d');
  const k = S * 0.026;
  for (let a = 0; a < 12; a++) g.drawImage(c, Math.cos(a / 12 * 6.2832) * k, Math.sin(a / 12 * 6.2832) * k);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(8,12,34,0.82)'; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over'; g.drawImage(c, 0, 0);
  const cg = c.getContext('2d'); cg.clearRect(0, 0, S, S); cg.drawImage(o, 0, 0);
}
function buildSprites() {
  for (let s = 0; s < NS; s++) {
    SPRITES[s] = [];
    for (let v = 0; v < NVAR; v++) {
      const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
      drawSpecies(g, s, S, v); outlineSprite(c);
      const mips = [c]; let prev = c;
      for (let m = 1; m < 4; m++) { const n = S >> m, cc = document.createElement('canvas'); cc.width = cc.height = n; const gg = cc.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(prev, 0, 0, n, n); mips.push(cc); prev = cc; }
      // 预先水平翻转的副本（朝左），渲染时不用 setTransform
      const flips = mips.map(m => { const f = document.createElement('canvas'); f.width = f.height = m.width; const fg = f.getContext('2d'); fg.translate(m.width, 0); fg.scale(-1, 1); fg.drawImage(m, 0, 0); return f; });
      SPRITES[s][v] = mips; SPRITES[s][v + NVAR] = flips;
    }
  }
  // 图集：每个 mip 级别一张（行 = 物种，列 = 变体），渲染时同一张纹理，减少切换
  for (let m = 0; m < 4; m++) { const n = 128 >> m, A = document.createElement('canvas'); A.width = n * NVAR * 2; A.height = n * NS; const ag = A.getContext('2d');
    for (let s = 0; s < NS; s++) for (let v = 0; v < NVAR * 2; v++) ag.drawImage(SPRITES[s][v][m], v * n, s * n); SPR_ATLAS[m] = A; }
}
const SPR_ATLAS = [];
let _iconCache = {};
function speciesIcon(s, size) { const k = s + '_' + size; if (_iconCache[k]) return _iconCache[k]; const c = document.createElement('canvas'); c.width = c.height = size; drawSpecies(c.getContext('2d'), s, size, 0); return _iconCache[k] = c.toDataURL(); }

// 柔和的地面投影（单独绘制，跳跃时留在地面）
let SHADOW = null;
function shadowSprite() { if (SHADOW) return SHADOW; const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 16, 2, 32, 16, 30); gr.addColorStop(0, 'rgba(0,0,10,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,10,0.25)'); gr.addColorStop(1, 'rgba(0,0,10,0)'); g.fillStyle = gr; g.save(); g.scale(1, 0.5); g.beginPath(); g.arc(32, 32, 30, 0, 7); g.restore(); g.fill(); return SHADOW = c; }
