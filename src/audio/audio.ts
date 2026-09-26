// ---------------------------------------------------------------------------
// Son : tout est synthétisé (WebAudio), aucune ressource externe
// ---------------------------------------------------------------------------

import { clamp } from '../core/util';
import { store } from '../store/storage';

export const NOTE = { D3: 146.83, A3: 220, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440, B4: 493.88, D5: 587.33, E5: 659.26, Fs5: 739.99, A5: 880, B5: 987.77, D6: 1174.66, E6: 1318.5, Fs6: 1479.98, A6: 1760 };
export const PENTA = [NOTE.D5, NOTE.E5, NOTE.Fs5, NOTE.A5, NOTE.B5, NOTE.D6, NOTE.E6, NOTE.Fs6, NOTE.A6];
// Sur iPhone, le bouton « silencieux » coupe WebAudio sauf si la page se déclare lecteur audio.
// Safari 16.4+ : navigator.audioSession ; plus ancien : une piste silencieuse jouée en boucle.
function silentWavUrl(): string {
  const n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true);
  v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
let unmuted = false;
export function unmuteIOS() {
  if (unmuted) return;
  unmuted = true;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) { try { nav.audioSession.type = 'playback'; } catch (e) { /* ignoré */ } return; }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios) return;
  const a = document.createElement('audio');
  a.setAttribute('x-webkit-airplay', 'deny');
  a.preload = 'auto'; a.loop = true; a.src = silentWavUrl();
  a.play().catch(() => { /* refusé : le son restera soumis au bouton silencieux */ });
}

export const Snd = {
  ctx: null, muted: store.get('cdc.muted', false), tear: null, drone: null,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (e) { return false; }
    unmuteIOS();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.85;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    this.master.connect(comp); comp.connect(c.destination);
    this.dry = c.createGain(); this.dry.connect(this.master);
    this.rev = c.createConvolver(); this.rev.buffer = this.impulse(3.2, 2.4);
    const rg = c.createGain(); rg.gain.value = 0.42; this.rev.connect(rg); rg.connect(this.master);
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  },
  impulse(dur, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * dur), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  },
  get ok() { return !!this.ctx && !this.muted; },
  now() { return this.ctx.currentTime; },
  out(node, wet = 0.25, pan = 0) {
    let n = node;
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); n = p; }
    n.connect(this.dry);
    if (wet > 0) { const g = this.ctx.createGain(); g.gain.value = wet; n.connect(g); g.connect(this.rev); }
  },
  setMuted(m) {
    this.muted = m; store.set('cdc.muted', m);
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
  },
  env(g, t0, a, peak, dec, sus = 0.0001) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t0 + a + dec);
  },
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4; return s; },
  // ---------- déchirure ----------
  tearStart() {
    if (!this.ok || this.tear) return;
    const c = this.ctx;
    const src = this.noiseSrc();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    const g = c.createGain(); g.gain.value = 0.0001;
    src.connect(bp); bp.connect(hp); hp.connect(g); this.out(g, 0.08);
    src.start();
    this.tear = { src, bp, g };
  },
  tearUpdate(speed, pan) {
    if (!this.tear) return;
    const c = this.ctx, t = c.currentTime;
    const v = clamp(speed * 1.6, 0, 1);
    this.tear.g.gain.setTargetAtTime(0.02 + v * 0.5, t, 0.025);
    this.tear.bp.frequency.setTargetAtTime(1500 + v * 2600 + Math.random() * 900, t, 0.02);
    if (Math.random() < v * 0.75) this.crackle(0.05 + Math.random() * 0.12 * v, pan);
  },
  tearStop() {
    if (!this.tear) return;
    const { src, g } = this.tear; const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0.0001, t, 0.04); src.stop(t + 0.3);
    this.tear = null;
  },
  crackle(gain, pan = 0) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + Math.random() * 0.02;
    const s = this.noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500 + Math.random() * 5000; f.Q.value = 3;
    const g = c.createGain(); this.env(g, t, 0.001, gain, 0.018 + Math.random() * 0.03);
    s.connect(f); f.connect(g); this.out(g, 0.05, pan); s.start(t); s.stop(t + 0.08);
  },
  rip() {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const s = this.noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.32);
    const g = c.createGain(); this.env(g, t, 0.004, 0.7, 0.34);
    s.connect(f); f.connect(g); this.out(g, 0.2); s.start(t); s.stop(t + 0.5);
    for (let i = 0; i < 7; i++) setTimeout(() => this.crackle(0.25 + Math.random() * 0.2), i * 25);
  },
  whoosh(dur = 0.6, f0 = 400, f1 = 2400, gain = 0.3, pan = 0) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const s = this.noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); this.out(g, 0.3, pan); s.start(t); s.stop(t + dur + 0.05);
  },
  boom(gain = 0.8, f0 = 90, f1 = 34, dur = 1.1) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    const g = c.createGain(); this.env(g, t, 0.006, gain, dur);
    o.connect(g); this.out(g, 0.15); o.start(t); o.stop(t + dur + 0.1);
    const s = this.noiseSrc();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    const g2 = c.createGain(); this.env(g2, t, 0.003, gain * 0.5, 0.5);
    s.connect(lp); lp.connect(g2); this.out(g2, 0.3); s.start(t); s.stop(t + 0.7);
  },
  bell(freq, gain = 0.2, dur = 1.6, delay = 0, pan = 0) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + delay;
    const car = c.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
    const mod = c.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * 3.5;
    const mg = c.createGain(); mg.gain.setValueAtTime(freq * 2.2, t); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain(); this.env(g, t, 0.004, gain, dur);
    car.connect(g); this.out(g, 0.55, pan);
    car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  },
  pad(freqs, dur = 3, gain = 0.1, attack = 0.08) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(3200, t + 0.4); lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); this.out(g, 0.6);
    for (const f of freqs) for (const det of [-7, 6]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const og = c.createGain(); og.gain.value = 0.25 / freqs.length;
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    }
  },
  shimmer(n = 6, gain = 0.07, spread = 0.07, base = 0) {
    for (let i = 0; i < n; i++) this.bell(PENTA[Math.min(PENTA.length - 1, base + Math.floor(Math.random() * (PENTA.length - base)))], gain * (0.6 + Math.random() * 0.6), 1.4, i * spread + Math.random() * 0.02, (Math.random() - 0.5) * 1.2);
  },
  tick(gain = 0.12) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 2200 + Math.random() * 300;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    const g = c.createGain(); this.env(g, t, 0.001, gain, 0.025);
    o.connect(f); f.connect(g); this.out(g, 0.1); o.start(t); o.stop(t + 0.05);
  },
  servo() {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.32);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(lp); lp.connect(g); this.out(g, 0.15); o.start(t); o.stop(t + 0.4);
    setTimeout(() => { this.tick(0.3); this.bell(NOTE.A5, 0.08, 0.8); }, 330);
  },
  riser(dur = 1.3, gain = 0.28) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const s = this.noiseSrc();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    s.connect(f); f.connect(g); this.out(g, 0.35); s.start(t); s.stop(t + dur + 0.05);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(5000, t + dur);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(gain * 0.3, t + dur); g2.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    o.connect(lp); lp.connect(g2); this.out(g2, 0.3); o.start(t); o.stop(t + dur + 0.05);
  },
  droneStart() {
    if (!this.ok || this.drone) return;
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 1.2);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    lp.connect(g); this.out(g, 0.5);
    const oscs = [55, 110, 110 * 1.5, 164.8].map((f, i) => { const o = c.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 5; const og = c.createGain(); og.gain.value = [0.5, 0.25, 0.15, 0.12][i]; o.connect(og); og.connect(lp); o.start(t); return o; });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.18; const lg = c.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    this.drone = { g, oscs: [...oscs, lfo], lp };
  },
  droneSwell(to = 2400, dur = 1.2) { if (this.drone) this.drone.lp.frequency.exponentialRampToValueAtTime(to, this.ctx.currentTime + dur); },
  droneStop(fade = 0.08) {
    if (!this.drone) return;
    const t = this.ctx.currentTime, d = this.drone;
    d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(Math.max(d.g.gain.value, 0.0001), t); d.g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    d.oscs.forEach((o) => o.stop(t + fade + 0.05));
    this.drone = null;
  },
  flip(t = 0) {
    this.whoosh(0.34, 700, 3200, 0.14 + t * 0.03);
    this.crackle(0.16);
  },
  reveal(t) {
    if (!this.ok) return;
    if (t === 0) { this.bell(NOTE.D5, 0.1, 1.2); }
    else if (t === 1) { this.bell(NOTE.A4, 0.12, 1.4); this.bell(NOTE.D5, 0.12, 1.6, 0.09); this.shimmer(3, 0.04, 0.05, 4); }
    else if (t === 2) { [NOTE.D5, NOTE.Fs5, NOTE.A5, NOTE.D6].forEach((f, i) => this.bell(f, 0.13, 1.8, i * 0.07)); this.shimmer(5, 0.05, 0.05, 5); }
    else { this.boom(0.4); this.pad([NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.E5], 3, 0.12); this.shimmer(8, 0.06, 0.05, 3); }
  },
  impact(t) {
    if (!this.ok) return;
    this.boom(1.0, 110, 30, 1.6);
    this.pad(t >= 4 ? [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.E5] : [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.E5], t >= 4 ? 5 : 4, t >= 3 ? 0.17 : 0.13, 0.03);
    this.shimmer(t >= 4 ? 16 : 10, 0.07, 0.06, 2);
    this.whoosh(0.9, 3000, 400, 0.25);
  },
};
