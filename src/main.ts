// ---------------------------------------------------------------------------
// Entrées, boucle, démarrage
// ---------------------------------------------------------------------------

import './styles/main.css';
import * as THREE from 'three';
import { Snd } from './audio/audio';
import { CARD_H, CARD_W, Card } from './cards/card';
import { D2R } from './cards/textures';
import { $ } from './core/dom';
import { pointer } from './core/input';
import { Clock, E, REDUCED, clamp, flushFrame, lerp, nextFrame, updateTweens } from './core/util';
import { CARDS } from './data/catalog';
import { LAY, autoTear, busy, cards, closeInspect, enterIdle, go, touch, fillPack, ghost, heroCard, inspect, inspected, lastInteract, newPack, owned, pack, packType, pickCard, revealIdx, revealNext, setPackType, skipWalkout, state, tearFrame, toSummary } from './flow/flow';
import { PACK_H, PACK_W } from './pack/pack';
import { post, CON_R, IS_TOUCH, cam, canvas, conLineMat, conStarMat, mainScene, renderFrame, renderer, resize, rtScene, sky, skyCam, skyGroup, skyMat, skyScene, updateCamera, view } from './render/engine';
import { burstColor, heroRays, packRays, parts, updateFlare } from './render/fx';
import { UI } from './ui/ui';

const _rc = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _hit = new THREE.Vector3();
function toNDC(ev) { const r = canvas.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1]; }
function packLocal(nx, ny) {
  _rc.setFromCamera(new THREE.Vector2(nx, ny), cam);
  pack.inner.updateWorldMatrix(true, false);
  const n = new THREE.Vector3(0, 0, 1).transformDirection(pack.inner.matrixWorld);
  const o = new THREE.Vector3().setFromMatrixPosition(pack.inner.matrixWorld);
  _plane.setFromNormalAndCoplanarPoint(n, o);
  if (!_rc.ray.intersectPlane(_plane, _hit)) return null;
  const p = pack.inner.worldToLocal(_hit.clone());
  return { u: p.x / PACK_W + 0.5, v: p.y / PACK_H + 0.5 };
}
function onDown(e) {
  if (pointer.down) return;
  Snd.ensure();
  pointer.down = true; pointer.id = e.pointerId; pointer.moved = false;
  pointer.sx = pointer.x = pointer.lx = e.clientX; pointer.sy = pointer.y = pointer.ly = e.clientY;
  pointer.t0 = pointer.lt = performance.now(); pointer.vx = pointer.vy = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  const [nx, ny] = toNDC(e);
  pointer.nx = nx; pointer.ny = ny;
  touch();
  pointer.mode = 'none';
  if ((state === 'idle' || state === 'tearing') && !busy) {
    const L = packLocal(nx, ny);
    if (L && L.u > -0.15 && L.u < 1.15 && L.v > -0.05 && L.v < 1.12) {
      pointer.mode = 'tear'; pointer.u0 = L.u; pointer.v0 = L.v;
      pack.tilt.x.t = -0.07;
      Snd.crackle(0.08);
      canvas.style.cursor = 'grabbing';
    }
  } else if (state === 'reveal') pointer.mode = 'tap';
  else if (state === 'walkout') skipWalkout();
  else if (state === 'hero' || state === 'inspect') pointer.mode = 'rotate';
  else if (state === 'summary') pointer.mode = 'pick';
}
function onMove(e) {
  const [nx, ny] = toNDC(e);
  if (!pointer.down) { pointer.nx = nx; pointer.ny = ny; return; }
  if (e.pointerId !== pointer.id) return;
  pointer.nx = nx; pointer.ny = ny;
  const now = performance.now();
  const dtm = Math.max(1, now - pointer.lt) / 1000;
  const wx = (e.clientX - pointer.lx) * view.px2w, wy = -(e.clientY - pointer.ly) * view.px2w;
  pointer.vx = lerp(pointer.vx, wx / dtm, 0.35); pointer.vy = lerp(pointer.vy, wy / dtm, 0.35);
  pointer.lx = e.clientX; pointer.ly = e.clientY; pointer.lt = now;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy) > 8) pointer.moved = true;
  if (pointer.mode === 'tear') {
    const L = packLocal(nx, ny);
    if (!L) return;
    if (!pack.started && state === 'idle') {
      const du = L.u - pointer.u0;
      if (Math.abs(du) > 0.03) {
        pack.startTear(Math.sign(du)); go('tearing');
        Snd.tearStart();
        UI.show(UI.packs, false); UI.hint(null);
      }
    }
    if (pack.started) pack.pull(L.u, (L.v - pointer.v0) * 0.35);
  } else if (pointer.mode === 'rotate') {
    const c = state === 'hero' ? heroCard : cards[inspected];
    if (c) { c.ty.t = clamp((e.clientX - pointer.sx) / 170, -1.2, 1.2) * 0.95; c.tx.t = clamp((e.clientY - pointer.sy) / 170, -1, 1) * 0.6; }
  }
}
function onUp(e) {
  if (!pointer.down || e.pointerId !== pointer.id) return;
  pointer.down = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  const tap = !pointer.moved && performance.now() - pointer.t0 < 500;
  const [nx, ny] = toNDC(e);
  switch (pointer.mode) {
    case 'tear':
      pack.tilt.x.t = 0;
      canvas.style.cursor = '';
      if (pack.started && !pack.done) { Snd.tearStop(); UI.hint('Continuez jusqu’au bout du pointillé'); }
      else if (!pack.started && tap) { pack.tilt.z.vel += 1.2; Snd.crackle(0.1); }
      break;
    case 'tap': revealNext(); break;
    case 'rotate': {
      const c = state === 'hero' ? heroCard : cards[inspected];
      if (c) { c.tx.t = 0; c.ty.t = 0; }
      if (tap) { if (state === 'hero') toSummary(); else if (state === 'inspect') closeInspect(); }
      break;
    }
    case 'pick': if (tap) { const i = pickCard(nx, ny); if (i >= 0) inspect(i); } break;
  }
  pointer.mode = 'none';
}
canvas.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove, { passive: true });
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target as HTMLElement).tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault(); Snd.ensure();
    if (state === 'idle') autoTear();
    else if (state === 'reveal') revealNext();
    else if (state === 'walkout') skipWalkout();
    else if (state === 'hero') toSummary();
    else if (state === 'summary') inspect(4);
    else if (state === 'inspect') closeInspect();
  } else if (e.key === 'Escape') { if (state === 'inspect') closeInspect(); }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && state === 'idle') setPackType((packType + (e.key === 'ArrowRight' ? 1 : 2)) % 3);
});
for (const b of UI.packs.querySelectorAll('button')) b.addEventListener('click', () => { Snd.ensure(); setPackType(+b.dataset.pack); });
$('again').addEventListener('click', () => newPack());
$('inspClose').addEventListener('click', () => closeInspect());
UI.snd.addEventListener('click', () => {
  Snd.ensure();
  Snd.setMuted(!Snd.muted);
  UI.snd.setAttribute('aria-pressed', String(Snd.muted));
  UI.snd.setAttribute('aria-label', Snd.muted ? 'Activer le son' : 'Couper le son');
});
UI.snd.setAttribute('aria-pressed', String(Snd.muted));
UI.snd.setAttribute('aria-label', Snd.muted ? 'Activer le son' : 'Couper le son');

// --------------------------- mise à jour par image ---------------------------
function ghostUpdate(dt) {
  if (state !== 'idle' || pointer.down || pack.started || busy) { ghost.run = -1; return; }
  ghost.t += dt;
  if (ghost.run < 0 && ghost.t > 3.6 && Clock.t - lastInteract > 2.2) { ghost.run = 0; ghost.t = 0; }
  if (ghost.run >= 0) {
    ghost.run += dt / 1.05;
    const u = lerp(0.04, 0.96, E.p2io(Math.min(ghost.run, 1)));
    const i = clamp(Math.round(u * 64), 0, 64);
    const p = new THREE.Vector3((u - 0.5) * PACK_W, (pack.tearU.uTearV.value[i] - 0.5) * PACK_H, 0.12);
    pack.inner.localToWorld(p);
    for (let k = 0; k < 3; k++) parts.emit({ x: p.x, y: p.y + (Math.random() - 0.5) * 0.03, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.5, c: [1.5, 1.45, 1.3], life: 0.6, drag: 3, grav: 0.4, s0: 0.045, s1: 0 });
    parts.emit({ x: p.x, y: p.y, z: p.z + 0.02, c: [3, 2.8, 2.5], life: 0.1, s0: 0.15, s1: 0.1, drag: 0 });
    if (ghost.run >= 1) ghost.run = -1;
  }
}
let emberAcc = 0;
function emitEmbers(dt) {
  const c = heroCard;
  emberAcc += dt * (c.tier >= 3 ? 24 : 14);
  while (emberAcc > 1) {
    emberAcc -= 1;
    const w = CARD_W * c.s.sc, h = CARD_H * c.s.sc;
    parts.emit({ x: (Math.random() - 0.5) * w * 1.6, y: c.s.y - h * 0.5 + Math.random() * h * 0.4, z: (Math.random() - 0.5) * 1.4,
      vx: (Math.random() - 0.5) * 0.2, vy: 0.35 + Math.random() * 0.6, c: burstColor(c.tier, 0.9 + Math.random() * 1.4), life: 2 + Math.random() * 1.6, drag: 0.2, grav: -0.05, s0: 0.035 + Math.random() * 0.05, s1: 0 });
  }
}
let hovered = -1;
const galleryCards = [];
function hoverUpdate() {
  if (IS_TOUCH) return;
  if (state === 'summary') {
    hovered = -1;
    cards.forEach((c, i) => {
      const p = c.group.position.clone().project(cam);
      const hw = CARD_W * c.s.sc / view.visW, hh = CARD_H * c.s.sc / view.visH;
      const dx = (pointer.nx - p.x) / hw, dy = (pointer.ny - p.y) / hh;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { c.ty.t = dx * 0.38; c.tx.t = -dy * 0.3; hovered = i; } else { c.tx.t = 0; c.ty.t = 0; }
    });
    canvas.style.cursor = hovered >= 0 ? 'pointer' : '';
  } else if ((state === 'inspect' || state === 'hero') && !pointer.down) {
    const c = state === 'hero' ? heroCard : cards[inspected];
    if (c) { c.ty.t = pointer.nx * 0.45; c.tx.t = -pointer.ny * 0.3; }
  } else if (state === 'reveal' && revealIdx > 0 && !busy) {
    const c = cards[revealIdx - 1];
    c.ty.t = pointer.nx * 0.3; c.tx.t = -pointer.ny * 0.2;
  }
}
const _dq = new THREE.Quaternion();
const _pole = new THREE.Vector3(0, 1, 0);
function skyUpdate(dt) {
  if (sky.driftOn) { _dq.setFromAxisAngle(_pole, -dt * 0.004); sky.q.multiply(_dq); }
  skyGroup.quaternion.copy(sky.q);
  const rel = sky.prevQ.clone().invert().multiply(sky.q);
  const w = clamp(Math.abs(rel.w), -1, 1);
  let ang = 2 * Math.acos(w);
  const sn = Math.sqrt(Math.max(0, 1 - w * w));
  const u = skyMat.uniforms;
  if (sn > 1e-7 && ang > 0.0008) { const sg = rel.w < 0 ? -1 : 1; u.uBlur.value.set(rel.x / sn * sg, rel.y / sn * sg, rel.z / sn * sg, -ang * 0.85); } else u.uBlur.value.w = 0;
  sky.prevQ.copy(sky.q);
  if (Math.abs(skyCam.fov - sky.fov) > 1e-4) { skyCam.fov = sky.fov; skyCam.updateProjectionMatrix(); }
  const pxAng = skyCam.fov * D2R / Math.max(1, rtScene.height);
  u.uTime.value = Clock.t; u.uPxAng.value = pxAng; u.uGrid.value = sky.grid; u.uBright.value = sky.bright;
  conLineMat.uniforms.uW.value = pxAng * CON_R * 1.25 * view.dpr;
  conStarMat.uniforms.uPx.value = view.dpr * clamp(view.h / 820, 0.8, 1.3);
}
function update(dt) {
  updateTweens(dt);
  flushFrame();
  if (state === 'idle' || state === 'tearing') {
    if (!pointer.down) { pack.tilt.y.t = IS_TOUCH ? 0 : pointer.nx * 0.22; pack.tilt.x.t = IS_TOUCH ? 0 : -pointer.ny * 0.12; if (!pack.started) pack.tilt.z.t = 0; }
    const g = (Clock.t % 4.4) / 1.25;
    pack.common.uGleam.value = g <= 1 ? lerp(-0.5, 1.9, E.p2io(g)) : -3;
    ghostUpdate(dt);
    if (state === 'idle' && !pointer.down && !IS_TOUCH) {
      const L = packLocal(pointer.nx, pointer.ny);
      canvas.style.cursor = L && L.u > 0 && L.u < 1 && L.v > 0 && L.v < 1 ? 'grab' : '';
    }
  }
  if (pack.started && !pack.done) tearFrame(dt);
  pack.update(dt);
  hoverUpdate();
  if (state === 'reveal' && !REDUCED) { const t = Clock.t; pack.stack.rotation.set(Math.sin(t * 0.72) * 0.03, Math.sin(t * 0.53 + 1) * 0.045, 0); }
  for (const c of cards) c.update(dt);
  for (const c of galleryCards) c.update(dt);
  if (state === 'hero' && heroCard && !REDUCED) emitEmbers(dt);
  parts.mat.uniforms.uPx.value = rtScene.height / (2 * Math.tan(cam.fov * D2R / 2));
  parts.update(dt);
  heroRays.update(); packRays.update(); updateFlare();
  skyUpdate(dt);
  updateCamera(dt);
}

// --------------------------- boucle et résolution adaptative ---------------------------
const perf = { acc: 0, n: 0, cool: 0 };
function perfTick(rdt) {
  perf.acc += rdt; perf.n++; perf.cool = Math.max(0, perf.cool - rdt);
  if (perf.acc > 1.2) {
    const avg = perf.acc / perf.n;
    if (perf.cool <= 0 && avg > 1 / 40 && view.res > 0.55) { view.res = Math.max(0.55, view.res - 0.15); resize(); perf.cool = 2; }
    else if (perf.cool <= 0 && avg < 1 / 58 && view.res < 1) { view.res = Math.min(1, view.res + 0.1); resize(); perf.cool = 4; }
    perf.acc = 0; perf.n = 0;
  }
}
let manual = false;
let last = performance.now();
function loop(now) {
  const rdt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!manual) {
    const dt = rdt * Clock.scale;
    Clock.t += dt;
    update(dt);
    renderFrame();
    if (!window.CDC_NO_DYN && state !== 'loading') perfTick(rdt);
  }
  requestAnimationFrame(loop);
}
window.addEventListener('resize', resize);
new ResizeObserver(() => resize()).observe(canvas);

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const specs = ['600 70px "Bodoni Moda"', 'italic 700 80px "Bodoni Moda"', '700 40px "Bodoni Moda"', 'italic 400 30px "Bodoni Moda"', 'italic 500 30px "Bodoni Moda"', 'italic 600 60px "Bodoni Moda"', '500 16px "Martian Mono"', '400 16px "Martian Mono"', '600 16px "Martian Mono"'];
  const sample = 'CARTE du Ciel Éé 0123456789 −≈×–·∞☉αδ′″';
  const all = Promise.all(specs.map((s) => document.fonts.load(s, sample).catch(() => null)));
  await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
}

// accès de test / démonstration
window.__parts = parts;
window.CDC = {
  get state() { return state; }, get cards() { return cards; }, pack, post, sky, autoTear, revealNext, skipWalkout, toSummary, inspect, closeInspect, newPack, setPackType,
  setManual(v) { manual = v; last = performance.now(); },
  async advance(sec, fps = 30) {
    const n = Math.max(1, Math.round(sec * fps));
    for (let i = 0; i < n; i++) { const dt = (1 / fps) * Clock.scale; Clock.t += dt; update(dt); await new Promise((r) => setTimeout(r, 0)); }
    renderFrame();
  },
  render() { renderFrame(); },
  packScreen(u, v) {
    const w = new THREE.Vector3((u - 0.5) * PACK_W, (v - 0.5) * PACK_H, 0.1);
    pack.inner.localToWorld(w); w.project(cam);
    const r = canvas.getBoundingClientRect();
    return [r.left + (w.x + 1) / 2 * r.width, r.top + (1 - w.y) / 2 * r.height];
  },
  worldScreen(x, y, z) {
    const w = new THREE.Vector3(x, y, z).project(cam);
    const r = canvas.getBoundingClientRect();
    return [r.left + (w.x + 1) / 2 * r.width, r.top + (1 - w.y) / 2 * r.height];
  },
  get lay() { return LAY; },
  get clockScale() { return Clock.scale; },
  gallery(from, n, cols, tilt = 0) {
    pack.group.visible = false; cards.forEach((c) => (c.group.visible = false));
    galleryCards.forEach((c) => c.dispose()); galleryCards.length = 0;
    const list = CARDS.slice(from, from + n);
    const rows = Math.ceil(list.length / cols);
    const s = Math.min(view.visW * 0.97 / (cols * CARD_W * 1.04), view.visH * 0.95 / (rows * CARD_H * 1.04));
    list.forEach((d, i) => {
      const c = new Card(d);
      c.s = { x: ((i % cols) - (cols - 1) / 2) * CARD_W * s * 1.04, y: -(Math.floor(i / cols) - (rows - 1) / 2) * CARD_H * s * 1.04, z: 0, rx: 0, ry: tilt, rz: 0, sc: s };
      mainScene.add(c.group); c.update(0); galleryCards.push(c);
    });
    go('gallery'); UI.hint(null); UI.show(UI.packs, false);
  },
};

async function init() {
  resize();
  await loadFonts();
  UI.setCount(owned());
  pack.setType(packType);
  pack.s.sc = LAY.packS; pack.s.y = LAY.packY;
  $('loadMsg').textContent = 'Préparation des planches…';
  await fillPack();
  try { await renderer.compileAsync(skyScene, skyCam); } catch (e) { /* ignoré */ }
  requestAnimationFrame(loop);
  await nextFrame(); await nextFrame();
  UI.loader.classList.add('off');
  UI.show(UI.top, true);
  enterIdle(true);
}
init().catch((err) => { console.error(err); $('loadMsg').textContent = 'Une erreur empêche le chargement de la scène 3D. Rechargez la page.'; });
