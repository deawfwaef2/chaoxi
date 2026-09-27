/* ===================== 音频：WebAudio 实时合成（音效 + 慢节奏氛围 BGM） ===================== */
const AU = {
  ac: null, master: null, sfx: null, mus: null, rev: null, on: true, musOn: true, vol: 0.8, musVol: 0.55, sfxVol: 0.7,
  drillG: null, lastSfx: {}, chordI: 0, nextBar: 0, nextNote: 0, timer: 0, ducked: false,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = this.ac = new AC();
    this.master = ac.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(ac.destination);
    this.sfx = ac.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    this.mus = ac.createGain(); this.mus.gain.value = this.musOn ? this.musVol : 0; this.mus.connect(this.master);
    // 混响（生成的脉冲响应）
    const len = ac.sampleRate * 3.2, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = ac.createConvolver(); this.rev.buffer = ir; const rg = ac.createGain(); rg.gain.value = 0.55; this.rev.connect(rg); rg.connect(this.master);
    // 回声
    this.dly = ac.createDelay(2); this.dly.delayTime.value = 0.62; const fb = ac.createGain(); fb.gain.value = 0.38; const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.dly.connect(dl); dl.connect(fb); fb.connect(this.dly); dl.connect(this.rev); dl.connect(this.mus);
    // 钻墙噪声
    const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 1.2;
    this.drillG = ac.createGain(); this.drillG.gain.value = 0; ns.connect(nf); nf.connect(this.drillG); this.drillG.connect(this.sfx); ns.start();
    this.nextBar = ac.currentTime + 0.5; this.nextNote = ac.currentTime + 2;
    this.timer = setInterval(() => this.schedule(), 200);
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v && !this.ducked ? this.vol : 0, this.ac.currentTime, 0.1); },
  setMus(v) { this.musOn = v; if (this.mus) this.mus.gain.setTargetAtTime(v ? this.musVol : 0, this.ac.currentTime, 0.3); },
  duck(v) { this.ducked = v; if (this.master) this.master.gain.setTargetAtTime(this.on && !v ? this.vol : 0, this.ac.currentTime, 0.1); },
  mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  tone(f, dur, type, gain, dest, attack, f2, when) {
    const ac = this.ac, t = when || ac.currentTime; const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05); return g;
  },
  play(name, p) {
    if (!this.ac || !this.on) return; const now = this.ac.currentTime;
    const lim = { birth: 0.12, death: 0.15, eat: 0.1, gain: 0.08, wall: 0.07, fight: 0.14, eaten: 0.12 }[name] || 0.03;
    if (this.lastSfx[name] && now - this.lastSfx[name] < lim) return; this.lastSfx[name] = now;
    p = p || 0;
    switch (name) {
      case 'birth': { const f = 520 + p * 60; this.tone(f, 0.18, 'sine', 0.07, null, 0.01, f * 1.6); this.tone(f * 2, 0.12, 'sine', 0.02).connect(this.rev); break; }
      case 'death': { this.tone(300 - p * 10, 0.35, 'triangle', 0.05, null, 0.01, 110); break; }
      case 'eaten': { this.tone(200, 0.12, 'square', 0.02, null, 0.005, 90); this.tone(700, 0.08, 'sine', 0.03, null, 0.005, 400); break; }
      case 'gain': { const f = this.mtof(84 + [0, 2, 4, 7, 9][(Math.random() * 5) | 0]); const g = this.tone(f, 0.25, 'sine', 0.025); g.connect(this.rev); break; }
      case 'fight': { this.tone(900 + Math.random() * 300, 0.06, 'triangle', 0.018, null, 0.002, 500); this.tone(140, 0.08, 'sine', 0.03, null, 0.003, 80); break; }
      case 'wall': { this.tone(160, 0.12, 'triangle', 0.06, null, 0.005, 60); break; }
      case 'tp': { this.tone(400, 0.22, 'sine', 0.06, null, 0.01, 1400).connect(this.rev); break; }
      case 'click': { this.tone(1200, 0.05, 'sine', 0.04); break; }
      case 'place': { this.tone(300, 0.1, 'square', 0.03, null, 0.005, 600); break; }
      case 'built': { [0, 4, 7, 12].forEach((s, k) => this.tone(this.mtof(67 + s), 0.5, 'triangle', 0.04, null, 0.01, 0, now + k * 0.07).connect(this.rev)); break; }
      case 'summon': { for (let k = 0; k < 5; k++) this.tone(this.mtof(76 + k * 3), 0.3, 'sine', 0.035, null, 0.01, 0, now + k * 0.05).connect(this.rev); break; }
      case 'settle': { const base = 60 + Math.min(10, p) * 1; [0, 7, 12].forEach((s, k) => { const f = this.mtof(base + s); this.tone(f, 2.2, 'sine', 0.05 / (k + 1), null, 0.005).connect(this.rev); this.tone(f * 2.76, 1.2, 'sine', 0.012, null, 0.005).connect(this.rev); }); break; }
      case 'lvup': { [0, 4, 7, 11, 14, 19].forEach((s, k) => this.tone(this.mtof(64 + s), 1.6, 'sine', 0.06, null, 0.01, 0, now + k * 0.12).connect(this.rev)); break; }
      case 'lvdown': { [0, -5, -9].forEach((s, k) => this.tone(this.mtof(55 + s), 2, 'triangle', 0.05, null, 0.02, 0, now + k * 0.3).connect(this.rev)); break; }
      case 'extinct': { this.tone(this.mtof(50), 2.5, 'sine', 0.06, null, 0.05, this.mtof(43)).connect(this.rev); break; }
      case 'error': { this.tone(180, 0.18, 'square', 0.03, null, 0.005, 140); break; }
      case 'win': { for (let k = 0; k < 12; k++) this.tone(this.mtof(60 + [0, 4, 7, 12, 16, 19, 24][k % 7] + (k > 6 ? 12 : 0)), 2.5, 'sine', 0.05, null, 0.01, 0, now + k * 0.15).connect(this.rev); break; }
    }
  },
  setDrill(on) { if (this.drillG) this.drillG.gain.setTargetAtTime(on && this.on ? 0.06 : 0, this.ac.currentTime, 0.05); },
  // 慢节奏生成式 BGM：长 pad 和弦 + 稀疏五声音阶拨弦 + 回声
  schedule() {
    const ac = this.ac; if (!ac || !this.musOn) return;
    const lv = G.lv, dark = lv === 0;
    const prog = dark ? [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [40, 47, 52, 55]] : [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59], [48, 52, 55, 62], [40, 47, 52, 55]];
    const barLen = 9.6;
    while (this.nextBar < ac.currentTime + 1) {
      const ch = prog[this.chordI % prog.length]; this.chordI++;
      const t = this.nextBar, cut = 500 + lv * 180;
      for (const m of ch) for (const det of [-6, 6]) {
        const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
        o.type = det < 0 ? 'triangle' : 'sawtooth'; o.frequency.value = this.mtof(m); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = det < 0 ? cut * 1.5 : cut * 0.6;
        const pk = det < 0 ? 0.035 : 0.012; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + 3.2); g.gain.setValueAtTime(pk, t + barLen - 1); g.gain.linearRampToValueAtTime(0.0001, t + barLen + 3);
        o.connect(f); f.connect(g); g.connect(this.mus); g.connect(this.rev); o.start(t); o.stop(t + barLen + 3.2);
      }
      // 低音
      const bo = ac.createOscillator(), bg = ac.createGain(); bo.type = 'sine'; bo.frequency.value = this.mtof(ch[0] - 12); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.05, t + 2); bg.gain.linearRampToValueAtTime(0.0001, t + barLen + 1); bo.connect(bg); bg.connect(this.mus); bo.start(t); bo.stop(t + barLen + 1.2);
      this.curChord = ch; this.nextBar += barLen;
    }
    while (this.nextNote < ac.currentTime + 1) {
      const t = this.nextNote, beat = 1.2; this.nextNote += beat * (Math.random() < 0.5 ? 1 : 2);
      if (Math.random() > (dark ? 0.25 : 0.35 + lv * 0.03)) continue;
      const scale = dark ? [69, 72, 74, 76, 79, 81] : [72, 74, 76, 79, 81, 84, 86, 88];
      const m = scale[(Math.random() * scale.length) | 0], f = this.mtof(m);
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g); g.connect(this.mus); g.connect(this.dly); g.connect(this.rev); o.start(t); o.stop(t + 2.3);
      const o2 = ac.createOscillator(), g2 = ac.createGain(); o2.type = 'sine'; o2.frequency.value = f * 3; g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.008, t + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); o2.connect(g2); g2.connect(this.mus); o2.start(t); o2.stop(t + 0.9);
    }
  },
};
