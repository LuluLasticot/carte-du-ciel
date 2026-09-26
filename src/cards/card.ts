// ---------------------------------------------------------------------------
// Planche 3D : faces, tranche, matériaux et état d'animation
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { Clock, Spring, TAU } from '../core/util';
import { TIERS } from '../data/catalog';
import { device, quality, renderer } from '../render/engine';
import { BACK_FS, CARD_FS, CARD_VS, EDGE_FS, EDGE_VS, GLSL_ART, GLSL_COMMON } from '../shaders/index';
import { CH, AC, CW, drawCardBack, drawCardFace } from './textures';
import type { FaceBitmaps } from './faces';

export const CARD_W = 2.5, CARD_H = 3.5, CARD_T = 0.014, CARD_RAD = 0.12;
export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
export function faceGeometry(shape, w, h) {
  const g = new THREE.ShapeGeometry(shape, 8);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}
export function edgeGeometry(shape, depth) {
  const pts = shape.getPoints(8);
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const n = pts.length, pos = [], nor = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n], pr = pts[(i - 1 + n) % n], nx = pts[(i + 1) % n];
    const tx = nx.x - pr.x, ty = nx.y - pr.y, l = Math.hypot(tx, ty) || 1;
    pos.push(p.x, p.y, depth / 2, p.x, p.y, -depth / 2);
    nor.push(ty / l, -tx / l, 0, ty / l, -tx / l, 0);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
export const CARD_SHAPE = roundedRectShape(CARD_W, CARD_H, CARD_RAD);
export const CARD_FACE_GEO = faceGeometry(CARD_SHAPE, CARD_W, CARD_H);
export const CARD_EDGE_GEO = edgeGeometry(CARD_SHAPE, CARD_T);
/** Échelle des textures : le profil de qualité, plafonnée à 1 sur les petits écrans. */
export function texScale() { const s = quality.profile.texScale; return device.screenPx >= 1300 ? s : Math.min(1, s); }
export const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
export const PARALLAX = [0, 0, 0.08, 0.08, 0.15];
export const EDGE_COL = [[0.8, 0.7, 0.49], [0.75, 0.8, 0.88], [0.7, 0.72, 0.8], [1.0, 0.74, 0.32], [0.05, 0.05, 0.07]];
export const EDGE_HOLO = [0, 0, 1, 0, 0.7];

export function canvasTex(cv, srgb) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = Math.min(8, MAX_ANISO);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}
/** Texture depuis une ImageBitmap déjà retournée par le Worker (voir faces.worker.ts). */
export function bitmapTex(bmp: ImageBitmap, srgb: boolean) {
  const t = new THREE.Texture(bmp);
  t.flipY = false;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = Math.min(8, MAX_ANISO);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
export let BACK_TEX = null;
export function backTextures() {
  if (!BACK_TEX) { const b = drawCardBack(texScale()); BACK_TEX = { c: canvasTex(b.color, true), m: canvasTex(b.mask, false), texel: new THREE.Vector2(1 / b.mask.width, 1 / b.mask.height) }; }
  return BACK_TEX;
}

export class Card {
  declare autoTilt: any;
  declare back: any;
  declare backMat: any;
  declare data: any;
  declare dim: any;
  declare edge: any;
  declare edgeMat: any;
  declare flash: any;
  declare front: any;
  declare frontMat: any;
  declare glow: any;
  declare group: any;
  declare holo: any;
  declare hover: any;
  declare idle: any;
  declare phase: any;
  declare s: any;
  declare sweep: any;
  declare texC: any;
  declare texM: any;
  declare tier: any;
  declare tx: any;
  declare ty: any;
  constructor(data, pre?: FaceBitmaps | null) {
    this.data = data;
    this.tier = data.tier;
    this.group = new THREE.Group();
    const face = pre || drawCardFace(data, texScale());
    this.texC = pre ? bitmapTex(pre.color, true) : canvasTex(face.color, true);
    this.texM = pre ? bitmapTex(pre.mask, false) : canvasTex(face.mask, false);
    const a = data.art;
    const glowCol = new THREE.Color(...TIERS[data.tier].rgb);
    this.frontMat = new THREE.ShaderMaterial({
      vertexShader: CARD_VS,
      fragmentShader: GLSL_COMMON + GLSL_ART + CARD_FS,
      defines: { ART: a.t, TIER: data.tier, PARALLAX: PARALLAX[data.tier].toFixed(3) },
      uniforms: {
        uLayout: { value: this.texC }, uMask: { value: this.texM }, uTexel: { value: new THREE.Vector2(1 / face.mask.width, 1 / face.mask.height) },
        uArtC: { value: new THREE.Vector2(AC.x / CW, 1 - AC.y / CH) }, uArtR: { value: AC.r / CH }, uAspect: { value: CARD_W / CARD_H },
        uGlow: { value: 0 }, uGlowCol: { value: glowCol }, uFlash: { value: 0 }, uDim: { value: 0 }, uHolo: { value: 1 }, uSweep: { value: -3 },
        uTime: { value: 0 }, uA: { value: new THREE.Vector4(...(a.A || [0, 0, 0, 0])) }, uB: { value: new THREE.Vector4(...(a.B || [0, 0, 0, 0])) },
        uC1: { value: new THREE.Color(...(a.c1 || [0, 0, 0])) }, uC2: { value: new THREE.Color(...(a.c2 || [0, 0, 0])) }, uSeed: { value: (data.n * 0.137) % 1 },
      },
    });
    const B = backTextures();
    this.backMat = new THREE.ShaderMaterial({
      vertexShader: CARD_VS, fragmentShader: GLSL_COMMON + BACK_FS,
      uniforms: {
        uLayout: { value: B.c }, uMask: { value: B.m }, uTexel: { value: B.texel }, uAspect: { value: CARD_W / CARD_H },
        uGlow: { value: 0 }, uGlowCol: { value: glowCol }, uFlash: { value: 0 }, uDim: { value: 0 }, uSweep: { value: -3 },
      },
    });
    this.edgeMat = new THREE.ShaderMaterial({
      vertexShader: EDGE_VS, fragmentShader: GLSL_COMMON + EDGE_FS,
      uniforms: { uEdge: { value: new THREE.Color(...EDGE_COL[data.tier]) }, uEdgeHolo: { value: EDGE_HOLO[data.tier] }, uGlow: { value: 0 }, uGlowCol: { value: glowCol }, uDim: { value: 0 } },
    });
    this.front = new THREE.Mesh(CARD_FACE_GEO, this.frontMat);
    this.front.position.z = CARD_T / 2;
    this.back = new THREE.Mesh(CARD_FACE_GEO, this.backMat);
    this.back.rotation.y = Math.PI;
    this.back.position.z = -CARD_T / 2;
    this.edge = new THREE.Mesh(CARD_EDGE_GEO, this.edgeMat);
    this.group.add(this.front, this.back, this.edge);
    this.s = { x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0, sc: 1 };
    this.tx = new Spring(0, 70, 13);
    this.ty = new Spring(0, 70, 13);
    this.idle = 0;
    this.autoTilt = 0;
    this.phase = Math.random() * 10;
    this.glow = 0; this.flash = 0; this.dim = 0; this.sweep = -3; this.holo = 1;
    this.hover = 0;
  }
  // repasse l'état en coordonnées du monde après un changement de parent
  syncFromWorld() {
    const g = this.group;
    this.s.x = g.position.x; this.s.y = g.position.y; this.s.z = g.position.z; this.s.sc = g.scale.x;
    const e = new THREE.Euler().setFromQuaternion(g.quaternion, 'ZXY');
    this.s.rx = e.x - this.tx.v; this.s.rz = e.z;
    let ry = e.y - this.ty.v;
    while (ry < Math.PI * 0.5 - 0.0001 && this.s.ry > Math.PI * 0.5) ry += TAU;
    this.s.ry = ry;
  }
  update(dt) {
    const s = this.s;
    this.tx.step(dt); this.ty.step(dt);
    const t = Clock.t + this.phase;
    const w = this.idle, at = this.autoTilt;
    this.group.position.set(s.x, s.y + Math.sin(t * 1.1) * 0.035 * w, s.z);
    this.group.rotation.set(
      s.rx + this.tx.v + Math.sin(t * 0.72) * 0.05 * w + Math.sin(t * 0.9) * 0.16 * at,
      s.ry + this.ty.v + Math.sin(t * 0.53 + 1) * 0.08 * w + Math.sin(t * 0.61 + 2) * 0.26 * at,
      s.rz, 'ZXY');
    this.group.scale.setScalar(s.sc);
    const fu = this.frontMat.uniforms, bu = this.backMat.uniforms, eu = this.edgeMat.uniforms;
    fu.uTime.value = Clock.t;
    fu.uGlow.value = bu.uGlow.value = eu.uGlow.value = this.glow;
    fu.uFlash.value = bu.uFlash.value = this.flash;
    fu.uDim.value = bu.uDim.value = eu.uDim.value = this.dim;
    fu.uSweep.value = bu.uSweep.value = this.sweep;
    fu.uHolo.value = this.holo;
  }
  dispose() {
    this.group.parent && this.group.parent.remove(this.group);
    this.texC.dispose(); this.texM.dispose();
    this.frontMat.dispose(); this.backMat.dispose(); this.edgeMat.dispose();
  }
}
