// ---------------------------------------------------------------------------
// Atlas céleste : la collection affichée sur la sphère céleste.
// Chaque planche possédée s'allume à sa position réelle ; les constellations se tracent
// à mesure qu'on les complète ; on fait tourner le ciel au doigt et on zoome.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { eclipticPath } from '../astro/ephemeris';
import { $ } from '../core/dom';
import { Clock, E, clamp, to, tween } from '../core/util';
import { CONS, TIERS } from '../data/catalog';
import { constellationStatus } from '../data/economy';
import { CON_R, constellationGeometry, eqToSky, rtScene, sky, skyCam, skyGroup, skyQuatFor, view } from '../render/engine';
import { ATLAS_MARKER_FS, ATLAS_MARKER_VS, CLINE_FS, CLINE_VS, CSTAR_FS, CSTAR_VS } from '../shaders/index';
import { collection } from '../store/collection';
import { type AtlasObject, atlasObjects } from './objects';

const D2R = Math.PI / 180;
const R_MARK = CON_R * 0.985;
export const FOV_ATLAS = 58, FOV_MIN = 14, FOV_MAX = 84;

export const atlasGroup = new THREE.Group();
atlasGroup.visible = false;
skyGroup.add(atlasGroup);

interface ConLayer {
  key: string; name: string; segments: number; plates: number[];
  lines: THREE.Mesh; stars: THREE.Points; lineMat: THREE.ShaderMaterial; starMat: THREE.ShaderMaterial;
  center: THREE.Vector3; label: HTMLElement; draw: number; complete: boolean;
}

export const atlas = {
  built: false,
  fade: 0,
  hover: -1,
  labelsOn: 1,
  date: new Date(),
  objects: [] as AtlasObject[],
  dirs: [] as THREE.Vector3[],
  cons: [] as ConLayer[],
  buttons: [] as HTMLButtonElement[],
  onPick: (_n: number) => {},
};

let markers: THREE.Points, markerMat: THREE.ShaderMaterial, aOwned: THREE.BufferAttribute, aHover: THREE.BufferAttribute;
let eclMat: THREE.ShaderMaterial;
const hoverVal = new Float32Array(32);

function lineMaterial(col: THREE.Color, alpha: number) {
  return new THREE.ShaderMaterial({
    vertexShader: CLINE_VS, fragmentShader: CLINE_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uW: { value: 0.05 }, uDraw: { value: 0 }, uAlpha: { value: alpha }, uCol: { value: col } },
  });
}
function starMaterial(col: THREE.Color) {
  return new THREE.ShaderMaterial({
    vertexShader: CSTAR_VS, fragmentShader: CSTAR_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 99 }, uPx: { value: 1 }, uAlpha: { value: 0 }, uCol: { value: col } },
  });
}

/** Bande en pointillés le long de points de la sphère (écliptique). */
function dashedStrip(points: THREE.Vector3[]): THREE.BufferGeometry {
  const pos: number[] = [], other: number[] = [], side: number[] = [], tt: number[] = [], idx: number[] = [], index: number[] = [];
  for (let k = 0; k < points.length - 1; k += 2) {
    const a = points[k], b = points[k + 1], base = pos.length / 3;
    for (const [p, o, s, t] of [[a, b, -1, 0], [a, b, 1, 0], [b, a, -1, 1], [b, a, 1, 1]] as [THREE.Vector3, THREE.Vector3, number, number][]) {
      pos.push(p.x, p.y, p.z); other.push(o.x, o.y, o.z); side.push(s); tt.push(t); idx.push(0);
    }
    index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aOther', new THREE.Float32BufferAttribute(other, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  g.setAttribute('aIdx', new THREE.Float32BufferAttribute(idx, 1));
  g.setIndex(index);
  return g;
}

function build() {
  atlas.built = true;
  atlas.date = new Date();
  atlas.objects = atlasObjects(atlas.date);
  atlas.dirs = atlas.objects.map((o) => eqToSky(o.ra, o.dec).normalize());

  // repères des planches
  const pos: number[] = [], col: number[] = [], seed: number[] = [];
  atlas.objects.forEach((o, i) => {
    const p = atlas.dirs[i].clone().multiplyScalar(R_MARK);
    pos.push(p.x, p.y, p.z);
    col.push(...TIERS[o.card.tier].rgb);
    seed.push((o.n * 0.618) % 1);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  aOwned = new THREE.Float32BufferAttribute(new Float32Array(32), 1);
  aHover = new THREE.Float32BufferAttribute(hoverVal, 1);
  g.setAttribute('aOwned', aOwned);
  g.setAttribute('aHover', aHover);
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  markerMat = new THREE.ShaderMaterial({
    vertexShader: ATLAS_MARKER_VS, fragmentShader: ATLAS_MARKER_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uPx: { value: 1 }, uTime: { value: 0 }, uFade: { value: 0 } },
  });
  markers = new THREE.Points(g, markerMat);
  markers.frustumCulled = false;
  markers.renderOrder = 3;

  // constellations
  const labels = $('atlasLabels');
  for (const key of Object.keys(CONS)) {
    const { C, lines, stars, segments, dirs } = constellationGeometry(key, CON_R * 0.99);
    const lineMat = lineMaterial(new THREE.Color(0.93, 0.9, 0.84), 0);
    const starMat = starMaterial(new THREE.Color(0.93, 0.9, 0.84));
    const lm = new THREE.Mesh(lines, lineMat); lm.frustumCulled = false; lm.renderOrder = 1;
    const sm = new THREE.Points(stars, starMat); sm.frustumCulled = false; sm.renderOrder = 2;
    atlasGroup.add(lm, sm);
    const center = dirs.reduce((a, d) => a.add(d), new THREE.Vector3()).normalize().multiplyScalar(R_MARK);
    const label = document.createElement('span');
    label.className = 'acon';
    label.textContent = C.name;
    labels.appendChild(label);
    atlas.cons.push({ key, name: C.name, segments, plates: [], lines: lm, stars: sm, lineMat, starMat, center, label, draw: 0, complete: false });
  }

  // écliptique (le Soleil, la Lune et les planètes restent tout près de cette ligne)
  const path = eclipticPath(atlas.date, 240).map((p) => eqToSky(p.ra, p.dec).normalize().multiplyScalar(CON_R * 0.992));
  eclMat = lineMaterial(new THREE.Color(0.89, 0.74, 0.44), 0);
  eclMat.uniforms.uDraw.value = 1;
  const ecl = new THREE.Mesh(dashedStrip(path), eclMat); ecl.frustumCulled = false;
  atlasGroup.add(ecl, markers);

  // étiquettes cliquables (accessibles au clavier)
  atlas.objects.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'amark';
    b.style.setProperty('--tc', TIERS[o.card.tier].css);
    b.dataset.n = String(o.n);
    b.innerHTML = '<i aria-hidden="true"></i><span></span>';
    b.addEventListener('click', () => atlas.onPick(o.n));
    b.addEventListener('pointerenter', () => { atlas.hover = i; });
    b.addEventListener('pointerleave', () => { if (atlas.hover === i) atlas.hover = -1; });
    b.addEventListener('focus', () => { atlas.hover = i; });
    b.addEventListener('blur', () => { if (atlas.hover === i) atlas.hover = -1; });
    labels.appendChild(b);
    atlas.buttons.push(b);
  });
}

/** Met à jour possession, étiquettes et avancement des constellations. */
export function refreshAtlas() {
  if (!atlas.built) return;
  const status = new Map(constellationStatus(collection).map((c) => [c.key, c]));
  atlas.objects.forEach((o, i) => {
    const owned = !!collection.cards[o.n];
    aOwned.setX(i, owned ? 1 : 0);
    const b = atlas.buttons[i];
    b.classList.toggle('owned', owned);
    b.querySelector('span')!.textContent = owned ? o.card.name : `Planche ${o.n}`;
    b.setAttribute('aria-label', owned
      ? `${o.card.name}, ${TIERS[o.card.tier].name.toLowerCase()} : voir la planche`
      : `Planche ${o.n}, ${TIERS[o.card.tier].name.toLowerCase()}, pas encore découverte`);
  });
  aOwned.needsUpdate = true;
  for (const c of atlas.cons) {
    const s = status.get(c.key);
    const frac = s ? s.owned / s.plates.length : 0;
    c.plates = s ? s.plates : [];
    c.complete = !!s?.complete;
    c.draw = frac * c.segments;
    c.lineMat.uniforms.uCol.value.set(c.complete ? 0xe8c47d : 0xeee6d6);
    c.starMat.uniforms.uCol.value.set(c.complete ? 0xf3d28e : 0xeee6d6);
    c.label.classList.toggle('done', c.complete);
    c.label.classList.toggle('some', frac > 0 && !c.complete);
  }
}

/** Fait apparaître l'atlas : repères, puis tracés des constellations. */
export function showAtlas() {
  if (!atlas.built) build();
  refreshAtlas();
  atlasGroup.visible = true;
  $('atlasLabels').classList.add('on');
  to(atlas, { fade: 1 }, { dur: 0.9, ease: E.p2o });
  atlas.cons.forEach((c, k) => {
    c.lineMat.uniforms.uDraw.value = 0;
    to(c.lineMat.uniforms.uDraw, { value: c.draw }, { dur: 0.9 + c.segments * 0.05, delay: 0.35 + k * 0.05, ease: E.p2io });
  });
}
export function hideAtlas() {
  $('atlasLabels').classList.remove('on');
  return to(atlas, { fade: 0 }, { dur: 0.5, ease: E.p2i, done: () => { atlasGroup.visible = false; } });
}

// --------------------------- navigation dans le ciel ---------------------------
const ctl = { active: false, down: new Map<number, { x: number; y: number }>(), vx: 0, vy: 0, pinch0: 0, fov0: FOV_ATLAS, moved: false, t0: 0, sx: 0, sy: 0, lock: 0 };
const qTmp = new THREE.Quaternion();
const AX_X = new THREE.Vector3(1, 0, 0), AX_Y = new THREE.Vector3(0, 1, 0), AX_Z = new THREE.Vector3(0, 0, 1);

function rotateSky(ax: number, ay: number) {
  sky.q.premultiply(qTmp.setFromAxisAngle(AX_Y, -ax)).premultiply(qTmp.setFromAxisAngle(AX_X, -ay)).normalize();
}
/** Active ou coupe le contrôle du ciel par le pointeur (actif dans l'état « atlas »). */
export function setAtlasControl(on: boolean) { ctl.active = on; ctl.down.clear(); ctl.vx = ctl.vy = 0; }
/** Bloque la mise à niveau automatique pendant un pivotement programmé. */
export function lockLeveling(sec: number) { ctl.lock = Math.max(ctl.lock, sec); }

export function atlasPointerDown(e: PointerEvent) {
  if (!ctl.active) return false;
  ctl.down.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ctl.down.size === 1) { ctl.moved = false; ctl.t0 = performance.now(); ctl.vx = ctl.vy = 0; ctl.sx = e.clientX; ctl.sy = e.clientY; }
  if (ctl.down.size === 2) {
    const [a, b] = [...ctl.down.values()];
    ctl.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); ctl.fov0 = sky.fov; ctl.moved = true;
  }
  return true;
}
export function atlasPointerMove(e: PointerEvent) {
  const p = ctl.down.get(e.pointerId);
  if (!ctl.active || !p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ctl.down.size >= 2) {
    const [a, b] = [...ctl.down.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (ctl.pinch0 > 0) sky.fov = clamp(ctl.fov0 * ctl.pinch0 / Math.max(1, d), FOV_MIN, FOV_MAX);
    return;
  }
  if (Math.abs(dx) + Math.abs(dy) > 0) {
    const k = (sky.fov * D2R) / Math.max(1, view.h);
    rotateSky(dx * k, dy * k);
    if (Math.hypot(e.clientX - ctl.sx, e.clientY - ctl.sy) > 6) ctl.moved = true;
    ctl.vx = dx * k * 60; ctl.vy = dy * k * 60;
  }
}
/** Renvoie le numéro de planche touchée (tap sans glisser), sinon 0. */
export function atlasPointerUp(e: PointerEvent): number {
  if (!ctl.down.has(e.pointerId)) return 0;
  ctl.down.delete(e.pointerId);
  if (ctl.down.size === 1) { ctl.vx = ctl.vy = 0; ctl.pinch0 = 0; }
  const tap = !ctl.moved && performance.now() - ctl.t0 < 450;
  if (!tap || ctl.down.size) return 0;
  ctl.vx = ctl.vy = 0;
  return nearestMarker(e.clientX, e.clientY, 30);
}
export function atlasWheel(e: WheelEvent) {
  if (!ctl.active) return;
  e.preventDefault();
  sky.fov = clamp(sky.fov * Math.exp(e.deltaY * 0.0012), FOV_MIN, FOV_MAX);
}

const vTmp = new THREE.Vector3(), camDir = new THREE.Vector3();
function screenOf(i: number, out: { x: number; y: number; vis: boolean }) {
  vTmp.copy(atlas.dirs[i]).multiplyScalar(R_MARK).applyQuaternion(skyGroup.quaternion);
  skyCam.getWorldDirection(camDir);
  out.vis = vTmp.dot(camDir) > 0;
  vTmp.project(skyCam);
  out.x = (vTmp.x + 1) / 2 * view.w; out.y = (1 - vTmp.y) / 2 * view.h;
  out.vis = out.vis && Math.abs(vTmp.x) < 1.08 && Math.abs(vTmp.y) < 1.08;
  return out;
}
export function nearestMarker(x: number, y: number, maxPx: number): number {
  let best = 0, bd = maxPx;
  const s = { x: 0, y: 0, vis: false };
  atlas.objects.forEach((o, i) => {
    screenOf(i, s);
    const d = Math.hypot(s.x - x, s.y - y);
    if (s.vis && d < bd) { bd = d; best = o.n; }
  });
  return best;
}
/** Position à l'écran d'une planche (pour y faire naître la carte en 3D). */
export function markerScreen(n: number) { return screenOf(atlas.objects.findIndex((o) => o.n === n), { x: 0, y: 0, vis: false }); }

/** Oriente le ciel vers une planche (nord en haut) et règle le champ. */
export function slewTo(n: number, fov: number, dur = 1.2) {
  const o = atlas.objects.find((x) => x.n === n) || atlasObjects(atlas.date).find((x) => x.n === n)!;
  const q0 = sky.q.clone(), q1 = skyQuatFor(o.ra, o.dec), f0 = sky.fov;
  lockLeveling(dur + 0.2);
  return tween({ dur, ease: E.sio, update: (e) => { sky.q.slerpQuaternions(q0, q1, e); sky.fov = f0 + (fov - f0) * e; } });
}

const scr = { x: 0, y: 0, vis: false };
export function updateAtlas(dt: number) {
  if (!atlasGroup.visible) return;
  // inertie et remise à niveau (nord en haut) quand on ne touche plus le ciel
  if (ctl.active && ctl.down.size === 0) {
    if (Math.abs(ctl.vx) + Math.abs(ctl.vy) > 1e-5) { rotateSky(ctl.vx * dt, ctl.vy * dt); const k = Math.exp(-dt * 3.5); ctl.vx *= k; ctl.vy *= k; }
  }
  ctl.lock = Math.max(0, ctl.lock - dt);
  if (ctl.active && ctl.lock <= 0) {
    const P = vTmp.set(0, 1, 0).applyQuaternion(sky.q);
    const len = Math.hypot(P.x, P.y);
    if (len > 0.12) {
      const err = Math.atan2(P.x, P.y);
      sky.q.premultiply(qTmp.setFromAxisAngle(AX_Z, err * (1 - Math.exp(-dt * (ctl.down.size ? 1.2 : 3))))).normalize();
    }
  }
  // uniformes
  const pxAng = skyCam.fov * D2R / Math.max(1, rtScene.height);
  const px = view.dpr * clamp(view.h / 820, 0.8, 1.3);
  markerMat.uniforms.uTime.value = Clock.t;
  markerMat.uniforms.uFade.value = atlas.fade;
  markerMat.uniforms.uPx.value = px;
  for (let i = 0; i < 32; i++) hoverVal[i] += ((atlas.hover === i ? 1 : 0) - hoverVal[i]) * (1 - Math.exp(-dt * 12));
  aHover.needsUpdate = true;
  const w = pxAng * CON_R * 1.1 * view.dpr;
  for (const c of atlas.cons) {
    c.lineMat.uniforms.uW.value = w * (c.complete ? 1.25 : 0.9);
    c.lineMat.uniforms.uAlpha.value = atlas.fade * (c.complete ? 0.95 : 0.5);
    c.starMat.uniforms.uAlpha.value = atlas.fade * (c.complete ? 0.95 : c.draw > 0 ? 0.6 : 0.28);
    c.starMat.uniforms.uPx.value = px * 0.8;
  }
  eclMat.uniforms.uW.value = w * 0.7;
  eclMat.uniforms.uAlpha.value = atlas.fade * 0.32;
  // étiquettes HTML
  const showNames = sky.fov < 70;
  atlas.objects.forEach((o, i) => {
    const b = atlas.buttons[i];
    screenOf(i, scr);
    if (!scr.vis || atlas.fade < 0.05) { if (!b.hidden) b.hidden = true; return; }
    if (b.hidden) b.hidden = false;
    b.style.transform = `translate(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px)`;
    b.classList.toggle('names', showNames);
  });
  for (const c of atlas.cons) {
    vTmp.copy(c.center).applyQuaternion(skyGroup.quaternion);
    skyCam.getWorldDirection(camDir);
    const front = vTmp.dot(camDir) > 0;
    vTmp.project(skyCam);
    const vis = front && Math.abs(vTmp.x) < 1 && Math.abs(vTmp.y) < 1 && atlas.fade > 0.05;
    c.label.hidden = !vis;
    if (vis) c.label.style.transform = `translate(${((vTmp.x + 1) / 2 * view.w).toFixed(1)}px, ${((1 - vTmp.y) / 2 * view.h + 26).toFixed(1)}px)`;
  }
}
