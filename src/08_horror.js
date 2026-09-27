/* ============================================================
   v0.8 规则怪谈层：守则簿（自己发现规则）/ 未知单位 / 巨兽 / 暗处的眼睛 / 激励广告点位
   —— 本文件通过“重新赋值”包装 07_main 的函数，不改动原模块逻辑
   ============================================================ */
const RULES = [
  { id: 'wisp', ev: 'wabs', t: '飘着的白光可以吃。它们不会反抗。', h: '白色的……靠近它。' },
  { id: 'spray', chk: () => G.flow.spray >= 20, t: '站着不动，你会流血。流出来的光会被舔干净。', h: '别动。等一等。' },
  { id: 'feed', chk: () => (G.summons || 0) >= 1, t: '底下的卡片不是图鉴。是名单。你点谁，谁就从黑暗里爬出来。', h: '看看屏幕最下面。' },
  { id: 'birth', ev: 'birth', t: '喂饱的东西会变成两个。', h: '让它们吃饱。' },
  { id: 'kill', ev: 'kill', t: '它们会吃掉彼此。不要阻止。这是好事。', h: '大的，小的。' },
  { id: 'death', ev: 'death', t: '死掉的东西会变回光。没有什么被浪费。', h: '等它们老去。' },
  { id: 'mat', ev: 'matget', t: '金色碎屑是它们留下的。捡起来。别问是什么。', h: '它们会掉东西。' },
  { id: 'lv', ev: 'lvup', t: '塔在数它们。数得越多、种类越多，天越亮。', h: '中间那座塔在看。' },
  { id: 'build', ev: 'built', t: '碎屑可以换成建筑。建筑会自己做事——你永远不知道是什么事，直到它做了。', h: '碎屑能换东西。' },
  { id: 'unlock', ev: 'unlock', t: '塔亮着的时候，黑暗里会有新的东西被“调查”出来。', h: '让塔一直亮着。' },
  { id: 'wall', ev: 'wallbreak', t: '黑墙会疼。你也会。', h: '撞上去试试。' },
  { id: 'found', ev: 'found', t: '墙后面有东西在等你。一直都在。', h: '往黑暗更深处走。' },
  { id: 'orbdie', ev: 'orbdie', t: '如果你熄灭了，你会在塔下醒来。你不会记得疼。', h: '在墙里待太久。' },
  { id: 'extinct', ev: 'extinct', t: '有些东西会永远消失。名单上不会划掉它们。', h: '不要喂它们。' },
  { id: 'dark', ev: 'lvzero', t: '塔饿了就会闭眼。闭眼的时候，所有建筑都会死。', h: '让塔掉下去。' },
  { id: 'quake', ev: 'giant', t: '地面震动时，不要站在它的路上。', h: '等。它会来的。' },
  { id: 'gift', ev: 'giftleft', t: '它吃饱了会离开，并留下鳞片。鳞片很值钱。', h: '活过它。' },
  { id: 'bite', ev: 'bitten', t: '它也吃光。包括你身上的。', h: '靠近它。别。' },
  { id: 'eyes', ev: 'eyes', t: '黑暗里的眼睛不会伤害你。至少现在不会。', h: '看屏幕边缘。' },
  { id: 'zzz', chk: () => G.maxLv >= 3, t: '天快亮的时候，会有更大的东西醒来。', h: '让天更亮。' },
];
if (!META.rules) META.rules = []; if (!META.hints) META.hints = []; if (!META.wit) META.wit = [];
const HZ = { cv: null, x: null, flash: 0, flashC: '255,0,0', vig: 0, eyes: [], eyeT: 25, g: null, gNext: 150, offer: null, whisT: 70 };
const WHISPERS = ['……你听到了吗？', '有东西在数你。', '不要回头。', '塔刚才眨了一下眼。', '它们在看灯。', '……还有几条守则你没发现？', '今晚有点安静。太安静了。', '你不是第一个值夜班的人。'];

function ruleFound(id) {
  if (META.rules.includes(id)) return; const k = RULES.findIndex(r => r.id === id); if (k < 0) return;
  META.rules.push(id); saveMeta();
  HZ.flash = 0.55; HZ.flashC = '255,40,40'; CAM.shake = Math.max(CAM.shake, 0.5);
  if (AU.ac && AU.on) { const n = AU.ac.currentTime; AU.tone(90, 0.6, 'sawtooth', 0.05, null, 0.005, 45); AU.tone(AU.mtof(61), 1.4, 'triangle', 0.04, null, 0.01, 0, n + 0.12).connect(AU.rev); AU.tone(AU.mtof(62), 1.4, 'sine', 0.03, null, 0.01, 0, n + 0.12).connect(AU.rev); }
  const d = document.createElement('div'); d.className = 'ruleStamp';
  d.innerHTML = `<div class="rsH">📜 守则 #${k + 1} 已验证 <span>${META.rules.length}/${RULES.length}</span></div><div class="rsT">${RULES[k].t}</div>`;
  document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 4200); setTimeout(() => d.remove(), 5000);
  updRuleBtn();
}
function updRuleBtn() { const b = $('bRules'); if (b) b.querySelector('span').textContent = META.rules.length + '/' + RULES.length; }
function openRules() {
  AU.play('open');
  openPanel('📜 值夜守则', ['守则'], () => {
    let h = `<div class="rbook"><div class="rbHead">本缸共 ${RULES.length} 条守则。<br>我们一条也不会告诉你。<b>活下去，然后自己发现它们。</b></div>`;
    RULES.forEach((r, k) => {
      const f = META.rules.includes(r.id), hi = META.hints.includes(r.id);
      h += `<div class="rr ${f ? 'ok' : ''}"><b>#${k + 1}</b>${f ? `<span>${r.t}</span>` : `<span class="red">${'█'.repeat(6 + (k * 7) % 9)}${hi ? `<i>残页：「${r.h}」</i>` : ''}</span>${hi ? '' : `<button class="btn ad sm" data-hint="${r.id}">📺 撕开</button>`}`}</div>`;
    });
    $('pBody').innerHTML = h + '</div>';
  });
}
/* openPanel 签名兼容：(title, tabs, renderFn, tab) —— 我们自己绑定按钮 */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-hint]'); if (!b) return;
  const id = b.dataset.hint; Ads.rewarded(() => { if (!META.hints.includes(id)) META.hints.push(id); saveMeta(); AU.play('research'); refreshPanel(); }, m => toast(m));
});

/* ---- 事件钩子 ---- */
const _hzPE = processEvents;
processEvents = function () {
  for (const e of G.events) {
    if (e.type === 'lv') { if (e.a > e.b) ruleFound('lv'); if (e.a === 0 && e.b > 0) ruleFound('dark'); continue; }
    const r = RULES.find(q => q.ev === e.type); if (r) ruleFound(r.id);
    if (e.type === 'summon') { const k = SPECIES[e.c].key; if (!META.wit.includes(k)) { META.wit.push(k); saveMeta(); } }
    if (e.type === 'built') { const k = 'd' + DEVICES[e.c].key; if (!META.wit.includes(k)) { META.wit.push(k); saveMeta(); } }
    if (e.type === 'extinct') offer('💀 它们走了……', '📺 灌满灯油', () => { G.orb.tank = tankMax(G.lv); toast('🔥 灯油已满'); });
  }
  _hzPE();
  for (const r of RULES) if (r.chk && !META.rules.includes(r.id) && r.chk()) ruleFound(r.id);
};
/* 关闭所有文字教程 */
updateHint = function () { const f = $('tutF'), c = $('tutCap'); if (f) f.style.display = 'none'; if (c) c.style.display = 'none'; };
/* 未知化：介绍卡不显示任何数值/特性/机制 */
const _hzSI = showIntro;
showIntro = function (kind, idx, detail) {
  _hzSI(kind, idx, false);
  const box = $('introBox'), key = kind === 's' ? SPECIES[idx].key : 'd' + DEVICES[idx].key, wit = META.wit.includes(key);
  const m = box.querySelector('.imore'); if (m) m.remove(); const im = $('iMore'); if (im) im.remove();
  const sub = box.querySelector('.isub'); if (sub) sub.innerHTML = '<span>能力：？？？</span><span>特性：？？？</span>';
  const ids = box.querySelector('.ids'); if (ids && !ids.textContent.includes('黑暗里')) {
    const d = kind === 's' ? SPECIES[idx].desc : DEVICES[idx].desc;
    ids.innerHTML = wit ? `<span style="opacity:.55">目击记录（残缺）：</span><br><span style="filter:blur(.4px)">${d.replace(/[，。,]/g, '……').slice(0, 26)}……</span>` : '<span style="color:#ff8a8a">没有人知道它会做什么。</span><br>放出来，然后看着。';
  }
};
const _hzBN = bigNotice;
bigNotice = function (ic, title, name, col, sub) { _hzBN(ic, '👁 有东西被调查出来了', name, col, '它会做什么？没人知道。'); };

/* ---- 激励广告小弹窗 ---- */
function offer(title, btn, fn) {
  let o = $('hzOffer'); if (!o) { o = document.createElement('div'); o.id = 'hzOffer'; o.className = 'glass'; document.body.appendChild(o); }
  o.innerHTML = `<div>${title}</div><button class="btn ad">${btn}</button><button class="x">✕</button>`; o.classList.add('show');
  o.querySelector('.ad').onclick = () => { o.classList.remove('show'); Ads.rewarded(fn, m => toast(m)); };
  o.querySelector('.x').onclick = () => o.classList.remove('show');
  clearTimeout(HZ.offerT); HZ.offerT = setTimeout(() => o.classList.remove('show'), 9000);
}

/* ---- 巨兽 ---- */
function giantStart() {
  const o = G.orb, lv = G.maxLv;
  HZ.g = { ph: 'warn', t: 0, x: 0, y: 0, a: 0, seg: [], eaten: 0, path: [], R: 55 + lv * 7, spd: 120 + lv * 6, life: 20 + lv, driven: false };
  toast('<b style="color:#ff5a5a">⚠ 地面在震动……</b>', '#ff3030');
  const b = $('hzDrive'); b.style.display = 'block';
}
function giantAppear() {
  const g = HZ.g, o = G.orb, a = Math.random() * 6.283, D = 900;
  g.x = o.x + Math.cos(a) * D; g.y = o.y + Math.sin(a) * D; g.a = a + Math.PI; g.ph = 'hunt'; g.t = 0;
  for (let k = 0; k < 18; k++) g.seg.push([g.x, g.y]);
  ruleFound('quake'); CAM.shake = 1.4;
  if (AU.ac && AU.on) { AU.tone(70, 2.2, 'sawtooth', 0.09, null, 0.2, 28); AU.tone(110, 1.8, 'square', 0.03, null, 0.3, 40); }
}
function giantEnd(gift) {
  const g = HZ.g; $('hzDrive').style.display = 'none';
  if (gift) {
    const n = Math.round((g.eaten * 2 + 25 + G.maxLv * 8) * (g.driven ? 2 : 1)), pts = g.path.length ? g.path : [[G.orb.x, G.orb.y]];
    for (let k = 0; k < 6; k++) { const p = pts[(Math.random() * pts.length) | 0]; dropMatter(p[0] + (Math.random() - 0.5) * 60, p[1] + (Math.random() - 0.5) * 60, Math.ceil(n / 6)); }
    G.events.push({ type: 'giftleft' });
    toast(`🦴 它离开了，留下了鳞片 <b class="cm">◆${n}</b>`, '#ffd36b');
    setTimeout(() => offer('🦴 鳞片还在发烫……', '📺 再撕下 ◆' + n, () => { const p = pts[0]; dropMatter(G.orb.x, G.orb.y, n); toast('◆ 鳞片翻倍'); }), 1500);
  }
  HZ.g = null; HZ.gNext = 160 + Math.random() * 140 - Math.min(80, G.maxLv * 10);
}
function giantStep(dt) {
  const g = HZ.g; g.t += dt; const o = G.orb;
  if (g.ph === 'warn') { HZ.vig = 0.5 + 0.3 * Math.sin(g.t * 8); CAM.shake = Math.max(CAM.shake, 0.25); if (g.t % 0.9 < dt) heartbeat(); if (g.t > 6) giantAppear(); return; }
  HZ.vig = 0.35;
  let tx = o.x, ty = o.y; if (g.ph === 'flee' || g.t > g.life) { tx = g.x + Math.cos(g.a) * 500; ty = g.y + Math.sin(g.a) * 500; }
  const want = Math.atan2(ty - g.y, tx - g.x); let da = want - g.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
  g.a += Math.max(-1, Math.min(1, da)) * dt * (g.ph === 'flee' ? 0.4 : 0.9) + Math.sin(g.t * 1.7) * dt * 0.5;
  const sp = g.spd * (g.ph === 'flee' ? 2.2 : 1); g.x += Math.cos(g.a) * sp * dt; g.y += Math.sin(g.a) * sp * dt;
  let px = g.x, py = g.y; const L = g.R * 0.55;
  for (const s of g.seg) { const dx = s[0] - px, dy = s[1] - py, d = Math.hypot(dx, dy) || 1; s[0] = px + dx / d * L; s[1] = py + dy / d * L; px = s[0]; py = s[1]; }
  if (Math.random() < dt * 3) CAM.shake = Math.max(CAM.shake, 0.35);
  const R = g.R;
  for (let i = 0; i < cN; i++) { if (cdead[i]) continue; const dx = cx[i] - g.x, dy = cy[i] - g.y; if (dx * dx + dy * dy < R * R) { killC(i, true); g.eaten++; if (inView(cx[i], cy[i])) addFX('ring', cx[i], cy[i], { life: 0.5, r: 26, color: '#ff3030' }); AU.play('eaten'); } }
  const od = Math.hypot(o.x - g.x, o.y - g.y);
  if (od < R + 20 && !o.dead && (!g.bite || g.t - g.bite > 2)) { g.bite = g.t; o.tank *= 0.6; o.vx += (o.x - g.x) / od * 600; o.vy += (o.y - g.y) / od * 600; HZ.flash = 0.8; HZ.flashC = '200,0,0'; CAM.shake = 2; G.events.push({ type: 'bitten' }); AU.play('lvdown'); }
  if (od < 600 && g.t % 0.5 < dt) g.path.push([g.x, g.y]);
  if ((g.ph === 'flee' || g.t > g.life) && od > 1300) giantEnd(true);
}
function heartbeat() { if (!AU.ac || !AU.on) return; const n = AU.ac.currentTime; AU.tone(58, 0.22, 'sine', 0.35, null, 0.005, 40); AU.tone(52, 0.22, 'sine', 0.28, null, 0.005, 36, n + 0.22); }

/* ---- 暗处的眼睛 / 低语 ---- */
function eyesStep(dt) {
  HZ.eyeT -= dt; if (HZ.eyeT <= 0) {
    HZ.eyeT = 18 + Math.random() * 30; const W = CAM.W, H = CAM.H, side = Math.random() * 4 | 0;
    const x = side === 0 ? 30 + Math.random() * 80 : side === 1 ? W - 30 - Math.random() * 80 : Math.random() * W, y = side < 2 ? 120 + Math.random() * (H - 300) : 110 + Math.random() * 60;
    HZ.eyes.push({ x, y, t: 0, life: 5 + Math.random() * 4, s: 0.7 + Math.random() * 0.9 }); G.events.push({ type: 'eyes' });
  }
  HZ.whisT -= dt; if (HZ.whisT <= 0) { HZ.whisT = 60 + Math.random() * 80; toast(`<i style="color:#c9a0ff">${WHISPERS[(Math.random() * WHISPERS.length) | 0]}</i>`, '#6a2a8a'); }
}

/* ---- 叠加层绘制 ---- */
function hzDraw(dt) {
  const c = HZ.x, W = CAM.W, H = CAM.H, dpr = CAM.dpr || 1;
  if (HZ.cv.width !== Math.round(W * dpr)) { HZ.cv.width = Math.round(W * dpr); HZ.cv.height = Math.round(H * dpr); }
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const g = HZ.g, z = CAM.z;
  if (g && g.ph !== 'warn') {
    // 地面阴影
    for (let k = g.seg.length - 1; k >= -1; k--) {
      const p = k < 0 ? [g.x, g.y] : g.seg[k], [sx, sy] = w2s(p[0], p[1]), r = g.R * z * (k < 0 ? 1 : 0.95 - k * 0.04);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(sx + 18 * z, sy + 30 * z, r * 1.1, r * 0.8, 0, 0, 6.283); c.fill();
    }
    for (let k = g.seg.length - 1; k >= 0; k--) {
      const [sx, sy] = w2s(g.seg[k][0], g.seg[k][1]), r = g.R * z * (0.95 - k * 0.04), wob = Math.sin(g.t * 6 - k * 0.7);
      const gr = c.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r); gr.addColorStop(0, '#2a0f1c'); gr.addColorStop(0.7, '#0b0309'); gr.addColorStop(1, '#000');
      c.fillStyle = gr; c.beginPath(); c.arc(sx, sy, r, 0, 6.283); c.fill();
      c.strokeStyle = `rgba(255,40,60,${0.25 + 0.2 * wob})`; c.lineWidth = 2; c.stroke();
      // 刺
      const pk = k > 0 ? g.seg[k - 1] : [g.x, g.y], an = Math.atan2(pk[1] - g.seg[k][1], pk[0] - g.seg[k][0]);
      c.fillStyle = '#12040a'; for (const sgn of [-1, 1]) { const aa = an + sgn * (1.57 + wob * 0.3); c.beginPath(); c.moveTo(sx + Math.cos(aa) * r * 0.8, sy + Math.sin(aa) * r * 0.8); c.lineTo(sx + Math.cos(aa) * r * 1.7, sy + Math.sin(aa) * r * 1.7); c.lineTo(sx + Math.cos(aa + 0.3) * r * 0.8, sy + Math.sin(aa + 0.3) * r * 0.8); c.fill(); }
      if (k % 3 === 1) { c.fillStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.sin(g.t * 3 + k)})`; c.beginPath(); c.arc(sx, sy, r * 0.12, 0, 6.283); c.fill(); }
    }
    // 头
    const [hx, hy] = w2s(g.x, g.y), R = g.R * z * 1.15, a = g.a, jaw = 0.35 + 0.3 * Math.abs(Math.sin(g.t * 4));
    c.save(); c.translate(hx, hy); c.rotate(a);
    c.fillStyle = '#060106'; c.beginPath(); c.arc(0, 0, R, jaw, 6.283 - jaw); c.lineTo(0, 0); c.fill();
    c.strokeStyle = 'rgba(255,50,70,.55)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#e8dccf'; for (let t = 0; t < 7; t++) for (const sgn of [-1, 1]) { const aa = sgn * (jaw + t * 0.08), bx = Math.cos(aa) * R * (1 - t * 0.09), by = Math.sin(aa) * R * (1 - t * 0.09); c.beginPath(); c.moveTo(bx, by); c.lineTo(bx * 0.82, by * 0.82 - sgn * R * 0.12); c.lineTo(bx * 0.92, by * 0.92 + sgn * R * 0.04); c.fill(); }
    c.shadowColor = '#ff0000'; c.shadowBlur = 18;
    for (let e = 0; e < 6; e++) { const ex = -R * 0.15 - (e % 3) * R * 0.2, ey = (e < 3 ? -1 : 1) * (R * 0.45 + (e % 3) * R * 0.08), bl = (Math.sin(g.t * 2 + e * 1.3) > 0.96) ? 0.15 : 1; c.fillStyle = '#ff2a1a'; c.beginPath(); c.ellipse(ex, ey, R * 0.09, R * 0.09 * bl, 0, 0, 6.283); c.fill(); c.fillStyle = '#fff2a0'; c.beginPath(); c.arc(ex + R * 0.02, ey, R * 0.025 * bl, 0, 6.283); c.fill(); }
    c.restore();
  }
  // 眼睛
  for (let k = HZ.eyes.length - 1; k >= 0; k--) {
    const e = HZ.eyes[k]; e.t += dt; if (e.t > e.life) { HZ.eyes.splice(k, 1); continue; }
    const al = Math.min(1, e.t / 1.2, (e.life - e.t) / 0.6), bl = (e.t % 2.3 > 2.15) ? 0.1 : 1, s = e.s * 7;
    c.save(); c.globalAlpha = al * 0.9; c.shadowColor = '#ff2020'; c.shadowBlur = 14; c.fillStyle = '#ff3a22';
    for (const dx of [-s * 1.6, s * 1.6]) { c.beginPath(); c.ellipse(e.x + dx, e.y, s, s * 0.55 * bl, 0, 0, 6.283); c.fill(); }
    c.fillStyle = '#000'; for (const dx of [-s * 1.6, s * 1.6]) { c.beginPath(); c.ellipse(e.x + dx, e.y, s * 0.18, s * 0.5 * bl, 0, 0, 6.283); c.fill(); }
    c.restore();
  }
  // 红色暗角 / 闪光
  HZ.vig = Math.max(0, HZ.vig - dt * 0.5);
  if (HZ.vig > 0.01) { const gr = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(120,0,0,0)'); gr.addColorStop(1, `rgba(150,0,0,${HZ.vig})`); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  if (HZ.flash > 0.01) { c.fillStyle = `rgba(${HZ.flashC},${HZ.flash * 0.35})`; c.fillRect(0, 0, W, H); HZ.flash -= dt * 1.2; }
}
let hzLast = performance.now();
function hzFrame(now) {
  requestAnimationFrame(hzFrame); const dt = Math.min(0.1, (now - hzLast) / 1000); hzLast = now;
  if (UI.state !== 'play' || UI.panel || $('offline').classList.contains('show')) { if (UI.state !== 'play') HZ.x.clearRect(0, 0, HZ.cv.width, HZ.cv.height); return; }
  let alive = 0; for (let i = 0; i < cN; i++) if (!cdead[i]) alive++;
  if (HZ.g) giantStep(dt); else if (alive >= 6) { HZ.gNext -= dt; if (HZ.gNext <= 0) giantStart(); }
  eyesStep(dt); hzDraw(dt);
}
window.addEventListener('load', () => {
  const cv = document.createElement('canvas'); cv.id = 'hz'; $('c').after(cv); HZ.cv = cv; HZ.x = cv.getContext('2d');
  const b = document.createElement('button'); b.className = 'rb'; b.id = 'bRules'; b.innerHTML = '📜<span></span>'; b.onclick = openRules; $('side').insertBefore(b, $('side').firstChild);
  const d = document.createElement('button'); d.id = 'hzDrive'; d.className = 'btn ad'; d.innerHTML = '📺 用光驱散它<small>并让它留下双倍鳞片</small>'; document.body.appendChild(d);
  d.onclick = () => Ads.rewarded(() => { const g = HZ.g; if (!g) return; if (g.ph === 'warn') giantAppear(); g.ph = 'flee'; g.driven = true; g.a = Math.atan2(g.y - G.orb.y, g.x - G.orb.x); HZ.flash = 1; HZ.flashC = '255,255,230'; d.style.display = 'none'; toast('✨ 它尖叫着退回了黑暗'); }, m => toast(m));
  updRuleBtn();
  const sub = document.querySelector('#start .sub'); if (sub) sub.innerHTML = '<b>欢迎值夜班。</b><br>这里有 ' + RULES.length + ' 条守则，<span style="color:#ff6a6a">我们一条也不会告诉你。</span><br>所有东西会做什么——自己去发现。活下去。';
  requestAnimationFrame(hzFrame);
});
