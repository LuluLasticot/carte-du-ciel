// ---------------------------------------------------------------------------
// Moteur : rendu, post-traitement HDR, ciel, caméras
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { D2R } from '../cards/textures';
import { $ } from '../core/dom';
import { Clock, E, REDUCED, tween } from '../core/util';
import { CONS } from '../data/catalog';
import { CLINE_FS, CLINE_VS, COMP_FS, CSTAR_FS, CSTAR_VS, DOWN_FS, FS_VS, GLSL_COMMON, SKY_FS, SKY_VS, UP_FS } from '../shaders/index';

export const canvas = $('gl');
export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
export let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' });
} catch (err) {
  $('loadMsg').textContent = "WebGL 2 n'est pas disponible sur cet appareil ou ce navigateur.";
  throw err;
}
renderer.autoClear = false;
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

export const mainScene = new THREE.Scene();
export const skyScene = new THREE.Scene();
export const CAM_Z = 12;
export const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
cam.position.set(0, 0, CAM_Z);
export const skyCam = new THREE.PerspectiveCamera(46, 1, 0.1, 300);

export const view = { w: 1, h: 1, dpr: 1, res: 1, visH: 1, visW: 1, aspect: 1, portrait: false, px2w: 0.01 };
export const MAX_DPR = Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 2 : 2);

// --------------------------- post-traitement ---------------------------
export const FS_GEO = new THREE.BufferGeometry();
FS_GEO.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
export const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
export function fsMat(fs, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader: FS_VS, fragmentShader: GLSL_COMMON + fs, uniforms, depthTest: false, depthWrite: false });
}
export const post = {
  exposure: 1, bloom: 0.85, vig: 0.62, grain: 0.028, ca: 0, flash: 0, flashCol: new THREE.Color(1, 1, 1), bars: 0, zoomBlur: 0, sat: 1,
  shock: new THREE.Vector4(0.5, 0.5, 0, 0), lens: new THREE.Vector4(0.5, 0.5, 0.1, 0),
};
export const HDR = THREE.HalfFloatType;
export const rtScene = new THREE.WebGLRenderTarget(4, 4, { type: HDR, samples: 4, depthBuffer: true });
export const bloomDown = [], bloomUp = [];
for (let i = 0; i < 6; i++) bloomDown.push(new THREE.WebGLRenderTarget(4, 4, { type: HDR, depthBuffer: false }));
for (let i = 0; i < 5; i++) bloomUp.push(new THREE.WebGLRenderTarget(4, 4, { type: HDR, depthBuffer: false }));
export const downMat = fsMat(DOWN_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 }, uPrefilter: { value: 1 } });
export const upMat = fsMat(UP_FS, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
export const compMat = fsMat(COMP_FS, {
  tScene: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
  uExposure: { value: 1 }, uBloomK: { value: 1 }, uVig: { value: 0.6 }, uGrain: { value: 0.03 }, uCA: { value: 0 },
  uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color() }, uBars: { value: 0 }, uZoomBlur: { value: 0 }, uSat: { value: 1 },
  uShock: { value: new THREE.Vector4() }, uLens: { value: new THREE.Vector4() },
});
export const fsMesh = new THREE.Mesh(FS_GEO, downMat);
fsMesh.frustumCulled = false;
export const fsScene = new THREE.Scene();
fsScene.add(fsMesh);
export function drawFS(mat, target) { fsMesh.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }

export function renderFrame() {
  renderer.setRenderTarget(rtScene);
  renderer.clear(true, true, false);
  renderer.render(skyScene, skyCam);
  renderer.clearDepth();
  renderer.render(mainScene, cam);
  // bloom (filtre double de Kawase)
  let src = rtScene.texture, sw = rtScene.width, sh = rtScene.height;
  for (let i = 0; i < bloomDown.length; i++) {
    downMat.uniforms.tSrc.value = src;
    downMat.uniforms.uTexel.value.set(1 / sw, 1 / sh);
    downMat.uniforms.uPrefilter.value = i === 0 ? 1 : 0;
    drawFS(downMat, bloomDown[i]);
    src = bloomDown[i].texture; sw = bloomDown[i].width; sh = bloomDown[i].height;
  }
  let low = bloomDown[bloomDown.length - 1];
  for (let i = bloomUp.length - 1; i >= 0; i--) {
    upMat.uniforms.tSrc.value = low.texture;
    upMat.uniforms.uTexel.value.set(1 / low.width, 1 / low.height);
    upMat.uniforms.tAdd.value = bloomDown[i].texture;
    drawFS(upMat, bloomUp[i]);
    low = bloomUp[i];
  }
  const u = compMat.uniforms;
  u.tScene.value = rtScene.texture; u.tBloom.value = bloomUp[0].texture;
  u.uRes.value.set(rtScene.width, rtScene.height);
  u.uTime.value = Clock.t;
  u.uExposure.value = post.exposure; u.uBloomK.value = post.bloom / 6; u.uVig.value = post.vig; u.uGrain.value = post.grain;
  u.uCA.value = post.ca; u.uFlash.value = post.flash; u.uFlashCol.value.copy(post.flashCol); u.uBars.value = post.bars;
  u.uZoomBlur.value = post.zoomBlur; u.uSat.value = post.sat; u.uShock.value.copy(post.shock); u.uLens.value.copy(post.lens);
  drawFS(compMat, null);
}

// --------------------------- ciel ---------------------------
export function eqToSky(raH, decD, r = 1) {
  const a = raH * 15 * D2R, d = decD * D2R;
  const x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d);
  return new THREE.Vector3(x * r, z * r, -y * r);
}
export const skyGroup = new THREE.Group();
skyScene.add(skyGroup);
export const skyMat = new THREE.ShaderMaterial({
  vertexShader: SKY_VS, fragmentShader: GLSL_COMMON + SKY_FS, side: THREE.BackSide, depthWrite: false,
  uniforms: {
    uTime: { value: 0 }, uPxAng: { value: 0.001 }, uGrid: { value: 0.55 }, uMW: { value: 1 }, uBright: { value: 1 },
    uNGP: { value: eqToSky(12.8573, 27.128) }, uGC: { value: eqToSky(17.761, -28.936) }, uBlur: { value: new THREE.Vector4(0, 1, 0, 0) },
  },
});
export const skySphere = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), skyMat);
skyGroup.add(skySphere);
export const sky = {
  q: new THREE.Quaternion(), prevQ: new THREE.Quaternion(), drift: 0, driftOn: 1, bright: 1, fov: 46, grid: 0.55, extraQ: new THREE.Quaternion(),
};
// orientation qui amène une direction du ciel au centre de la vue, nord en haut
export function skyQuatFor(raH, decD, roll = 0) {
  const f = eqToSky(raH, decD).normalize();
  const pole = new THREE.Vector3(0, 1, 0);
  let u = pole.clone().sub(f.clone().multiplyScalar(pole.dot(f)));
  if (u.lengthSq() < 1e-6) u = new THREE.Vector3(0, 0, 1);
  u.normalize();
  const r = new THREE.Vector3().crossVectors(f, u).normalize();
  const mSky = new THREE.Matrix4().makeBasis(r, u, f);
  const mCam = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
  const m = mCam.multiply(mSky.transpose());
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  if (roll) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
  return q;
}
// vue de repos : le Cygne dans la Voie lactée
export const SKY_HOME = { ra: 20.2, dec: 38 };
sky.q.copy(skyQuatFor(SKY_HOME.ra, SKY_HOME.dec, 0.35));
sky.prevQ.copy(sky.q);

// constellation affichée pendant la séquence finale
export const conGroup = new THREE.Group();
skyGroup.add(conGroup);
export const conLineMat = new THREE.ShaderMaterial({
  vertexShader: CLINE_VS, fragmentShader: CLINE_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uW: { value: 0.05 }, uDraw: { value: 0 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Color(1, 0.85, 0.6) } },
});
export const conStarMat = new THREE.ShaderMaterial({
  vertexShader: CSTAR_VS, fragmentShader: CSTAR_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  uniforms: { uT: { value: 0 }, uPx: { value: 1 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Color(1, 0.85, 0.6) } },
});
export let conLines = null, conStars = null;
export const CON_R = 60;
export function buildConstellation(key) {
  if (conLines) { conGroup.remove(conLines); conLines.geometry.dispose(); }
  if (conStars) { conGroup.remove(conStars); conStars.geometry.dispose(); }
  const C = CONS[key];
  const dirs = C.s.map(([ra, dec]) => eqToSky(ra, dec).normalize());
  const pos = [], other = [], side = [], tt = [], idx = [], index = [];
  const trim = 0.012;
  C.l.forEach(([i, j], li) => {
    const A = dirs[i], B = dirs[j];
    const ang = A.angleTo(B);
    const k0 = Math.min(0.4, trim / ang), k1 = 1 - k0;
    const a = new THREE.Vector3().copy(A).lerp(B, k0).normalize().multiplyScalar(CON_R);
    const b = new THREE.Vector3().copy(A).lerp(B, k1).normalize().multiplyScalar(CON_R);
    const base = pos.length / 3;
    for (const [p, o, s, t] of [[a, b, -1, 0], [a, b, 1, 0], [b, a, -1, 1], [b, a, 1, 1]] as [THREE.Vector3, THREE.Vector3, number, number][]) {
      pos.push(p.x, p.y, p.z); other.push(o.x, o.y, o.z); side.push(s); tt.push(t); idx.push(li);
    }
    index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aOther', new THREE.Float32BufferAttribute(other, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  g.setAttribute('aIdx', new THREE.Float32BufferAttribute(idx, 1));
  g.setIndex(index);
  conLines = new THREE.Mesh(g, conLineMat);
  conLines.frustumCulled = false;
  const sp = [], mag = [], del = [];
  C.s.forEach(([, , m], i) => { const d = dirs[i].clone().multiplyScalar(CON_R); sp.push(d.x, d.y, d.z); mag.push(m); del.push(i * 0.06); });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('aMag', new THREE.Float32BufferAttribute(mag, 1));
  sg.setAttribute('aDelay', new THREE.Float32BufferAttribute(del, 1));
  conStars = new THREE.Points(sg, conStarMat);
  conStars.frustumCulled = false;
  conGroup.add(conLines, conStars);
  return C;
}

// --------------------------- caméra : secousse et dérive ---------------------------
export const rig = { trauma: 0, shakeT: 0, px: 0, py: 0, driftAmt: 1, push: 0 };
// petite poussée de caméra : avance vite, revient lentement
export function camPush(amt, dur) {
  if (REDUCED) return;
  tween({ dur, ease: E.lin, update: (e) => { rig.push = amt * Math.sin(Math.min(1, e * 4.5) * Math.PI * 0.5) * (1 - E.p2io(e)); } });
}
export function addTrauma(x) { if (!REDUCED) rig.trauma = Math.min(1, rig.trauma + x); }
export function updateCamera(dt) {
  rig.trauma = Math.max(0, rig.trauma - dt * 1.6);
  rig.shakeT += dt;
  const s = rig.trauma * rig.trauma;
  const t = rig.shakeT;
  const n = (f, o) => Math.sin(t * f + o) * 0.6 + Math.sin(t * f * 2.13 + o * 1.7) * 0.4;
  const dx = n(31, 1.3) * 0.16 * s, dy = n(27, 4.1) * 0.16 * s, rz = n(23, 2.2) * 0.02 * s;
  const tt = Clock.t;
  const drift = rig.driftAmt;
  cam.position.set(dx + Math.sin(tt * 0.23) * 0.05 * drift + rig.px * 0.25, dy + Math.sin(tt * 0.31 + 1) * 0.04 * drift + rig.py * 0.18, CAM_Z * (1 - rig.push));
  cam.lookAt(rig.px * 0.1, rig.py * 0.08, 0);
  cam.rotation.z += rz;
  skyCam.quaternion.copy(cam.quaternion);
}

// --------------------------- redimensionnement ---------------------------
export let packLayout = () => {};
export function setPackLayout(fn: () => void) { packLayout = fn; }
export function resize() {
  const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
  view.w = w; view.h = h;
  view.dpr = Math.min(MAX_DPR, 2) * view.res;
  renderer.setPixelRatio(view.dpr);
  renderer.setSize(w, h, false);
  const pw = Math.max(1, Math.round(w * view.dpr)), ph = Math.max(1, Math.round(h * view.dpr));
  rtScene.setSize(pw, ph);
  for (let i = 0; i < bloomDown.length; i++) {
    const bw = Math.max(1, pw >> (i + 1)), bh = Math.max(1, ph >> (i + 1));
    bloomDown[i].setSize(bw, bh);
    if (i < bloomUp.length) bloomUp[i].setSize(bw, bh);
  }
  view.aspect = w / h;
  view.portrait = view.aspect < 0.9;
  cam.aspect = view.aspect;
  cam.fov = view.portrait ? 34 : 30;
  cam.updateProjectionMatrix();
  skyCam.aspect = view.aspect;
  skyCam.updateProjectionMatrix();
  view.visH = 2 * CAM_Z * Math.tan(cam.fov * D2R / 2);
  view.visW = view.visH * view.aspect;
  view.px2w = view.visH / h;
  packLayout();
}
