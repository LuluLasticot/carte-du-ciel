// ---------------------------------------------------------------------------
// Pochette : sachet coussin métallisé, déchirure qui suit le doigt
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { canvasTex } from '../cards/card';
import { TEAR_V, drawPackBack, drawPackFront } from '../cards/textures';
import { Clock, Spring, clamp, lerp } from '../core/util';
import { GLSL_COMMON, LEAK_FS, LEAK_VS, PACK_FS, PACK_TEAR, PACK_VS, STRIP_VS } from '../shaders/index';

export const PACK_W = 2.9, PACK_H = 4.75;
export const STRIP_V0 = 0.82;
export const PACK_TEX = [null, null, null];
export function packTextures(type) {
  if (!PACK_TEX[type]) {
    const f = drawPackFront(type), b = drawPackBack(type);
    PACK_TEX[type] = { fc: canvasTex(f.color, true), fm: canvasTex(f.mask, false), bc: canvasTex(b.color, true), bm: canvasTex(b.mask, false) };
  }
  return PACK_TEX[type];
}

export class Pack {
  declare back: any;
  declare backMat: any;
  declare common: any;
  declare dir: any;
  declare done: any;
  declare flyT: any;
  declare flying: any;
  declare front: any;
  declare frontMat: any;
  declare front_: any;
  declare group: any;
  declare idle: any;
  declare inner: any;
  declare lastFrontX: any;
  declare leak: any;
  declare leakMat: any;
  declare progress: any;
  declare s: any;
  declare stack: any;
  declare started: any;
  declare strip: any;
  declare stripAng: any;
  declare stripHolder: any;
  declare stripMat: any;
  declare stripVel: any;
  declare target: any;
  declare tearU: any;
  declare tilt: any;
  declare type: any;
  declare yOff: any;
  constructor() {
    this.group = new THREE.Group();
    this.inner = new THREE.Group();
    this.group.add(this.inner);
    this.tearU = { uTearOn: { value: 0 }, uFront: { value: 0 }, uDir: { value: 1 }, uTearV: { value: new Float32Array(65).fill(TEAR_V) } };
    this.common = {
      uPS: { value: new THREE.Vector2(PACK_W, PACK_H) }, uTime: { value: 0 }, uGleam: { value: -2 }, uLeak: { value: 0 },
      uLeakCol: { value: new THREE.Color(1, 0.8, 0.5) }, uFoilType: { value: 0 }, uFade: { value: 1 }, uCurl: { value: 0.35 },
    };
    const mk = (vs, fs, extra, defines = {}) => new THREE.ShaderMaterial({
      vertexShader: GLSL_COMMON + PACK_TEAR + vs, fragmentShader: GLSL_COMMON + PACK_TEAR + fs, defines,
      uniforms: { ...this.tearU, ...this.common, ...extra },
    });
    const texU = () => ({ uTex: { value: null }, uMsk: { value: null }, uTexB: { value: null }, uMskB: { value: null } });
    this.frontMat = mk(PACK_VS, PACK_FS, { ...texU(), uFlipU: { value: 0 } });
    this.backMat = mk(PACK_VS, PACK_FS, { ...texU(), uFlipU: { value: 1 } });
    this.stripMat = mk(STRIP_VS, PACK_FS, { ...texU(), uFlipU: { value: 0 } }, { STRIP: 1 });
    this.stripMat.side = THREE.DoubleSide;
    const bodyGeo = new THREE.PlaneGeometry(PACK_W, PACK_H, 56, 90);
    this.front = new THREE.Mesh(bodyGeo, this.frontMat);
    this.back = new THREE.Mesh(bodyGeo, this.backMat);
    this.back.rotation.y = Math.PI;
    const bandH = PACK_H * (1 - STRIP_V0);
    const sg = new THREE.PlaneGeometry(PACK_W, bandH, 140, 12);
    const sp = sg.attributes.position, su = sg.attributes.uv;
    for (let i = 0; i < sp.count; i++) {
      sp.setY(i, sp.getY(i) + (STRIP_V0 + (1 - STRIP_V0) / 2 - 0.5) * PACK_H);
      su.setY(i, STRIP_V0 + su.getY(i) * (1 - STRIP_V0));
    }
    this.strip = new THREE.Mesh(sg, this.stripMat);
    this.strip.frustumCulled = false;
    this.stripHolder = new THREE.Group();
    this.stripHolder.add(this.strip);
    const lg = new THREE.PlaneGeometry(PACK_W, PACK_H * (1 - STRIP_V0) + 2.2, 8, 8);
    lg.translate(0, (STRIP_V0 - 0.5) * PACK_H + (PACK_H * (1 - STRIP_V0) + 2.2) / 2, 0);
    this.leakMat = new THREE.ShaderMaterial({
      vertexShader: LEAK_VS, fragmentShader: GLSL_COMMON + PACK_TEAR + LEAK_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { ...this.tearU, ...this.common },
    });
    this.leak = new THREE.Mesh(lg, this.leakMat);
    this.leak.renderOrder = 5;
    this.inner.add(this.front, this.back, this.stripHolder, this.leak);
    this.stack = new THREE.Group();
    this.inner.add(this.stack);
    // état
    this.s = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sc: 1 };
    this.tilt = { x: new Spring(0, 60, 10), y: new Spring(0, 60, 10), z: new Spring(0, 60, 10) };
    this.idle = 1;
    this.reset(0);
  }
  setType(type) {
    this.type = type;
    const T = packTextures(type);
    for (const m of [this.frontMat, this.stripMat]) { m.uniforms.uTex.value = T.fc; m.uniforms.uMsk.value = T.fm; m.uniforms.uTexB.value = T.bc; m.uniforms.uMskB.value = T.bm; }
    this.backMat.uniforms.uTex.value = T.bc; this.backMat.uniforms.uMsk.value = T.bm;
    this.common.uFoilType.value = type;
  }
  reset(type) {
    this.setType(type ?? this.type ?? 0);
    this.tearU.uTearOn.value = 0; this.tearU.uFront.value = 0; this.tearU.uDir.value = 1;
    this.tearU.uTearV.value.fill(TEAR_V);
    this.common.uLeak.value = 0; this.common.uCurl.value = 0.35; this.common.uFade.value = 1;
    this.started = false; this.done = false; this.flying = false; this.progress = 0;
    this.front_ = 0; this.dir = 1; this.target = 0; this.yOff = 0; this.lastFrontX = 0;
    this.stripHolder.position.set(0, 0, 0); this.stripHolder.rotation.set(0, 0, 0); this.strip.position.set(0, 0, 0);
    this.strip.visible = true; this.leak.visible = true;
    this.stripVel = new THREE.Vector3(); this.stripAng = new THREE.Vector3();
    this.group.visible = true;
  }
  startTear(dir) {
    if (this.started) return;
    this.started = true; this.dir = dir;
    this.front_ = dir > 0 ? 0 : 1;
    this.target = this.front_;
    this.tearU.uTearOn.value = 1; this.tearU.uDir.value = dir; this.tearU.uFront.value = this.front_;
  }
  // u cible (position du doigt sur la largeur), décalage vertical (en v)
  pull(u, vOff) {
    if (!this.started || this.done) return;
    this.yOff = clamp(vOff, -0.04, 0.04);
    this.target = this.dir > 0 ? Math.max(this.target, clamp(u, 0, 1)) : Math.min(this.target, clamp(u, 0, 1));
  }
  // avance du front ; renvoie la distance parcourue cette image (en u)
  step(dt) {
    if (!this.started || this.done) return 0;
    const maxV = 3.2 * dt;
    const prev = this.front_;
    const diff = this.target - this.front_;
    this.front_ += clamp(diff, -maxV, maxV);
    const arr = this.tearU.uTearV.value;
    const i0 = Math.round(prev * 64), i1 = Math.round(this.front_ * 64);
    const lo = Math.min(i0, i1), hi = Math.max(i0, i1);
    for (let i = lo; i <= hi; i++) {
      const prevI = clamp(i - this.dir, 0, 64);
      const want = TEAR_V + this.yOff;
      arr[i] = i === prevI ? want : lerp(arr[prevI], want, 0.35);
    }
    // le reste de la ligne suit, pour un raccord sans marche
    for (let i = 0; i <= 64; i++) {
      const ahead = this.dir > 0 ? i > hi : i < lo;
      if (ahead) arr[i] = lerp(arr[i], arr[this.dir > 0 ? hi : lo], 0.25);
    }
    this.tearU.uFront.value = this.front_;
    this.progress = this.dir > 0 ? this.front_ : 1 - this.front_;
    this.common.uCurl.value = 0.3 + this.progress * 0.75;
    return Math.abs(this.front_ - prev);
  }
  // point du front de déchirure dans le monde
  frontWorld(out = new THREE.Vector3()) {
    const u = this.front_;
    const i = clamp(Math.round(u * 64), 0, 64);
    const v = this.tearU.uTearV.value[i];
    out.set((u - 0.5) * PACK_W, (v - 0.5) * PACK_H, 0.1);
    return this.inner.localToWorld(out);
  }
  fling(vx, vy) {
    this.done = true; this.flying = true;
    this.front_ = this.dir > 0 ? 1 : 0;
    this.tearU.uFront.value = this.front_;
    // pivot au bout de la bande, là où elle vient de se détacher
    const px = (this.front_ - 0.5) * PACK_W, py = (TEAR_V - 0.5) * PACK_H + 0.15;
    this.stripHolder.position.set(px, py, 0.05);
    this.strip.position.set(-px, -py, -0.05);
    this.stripVel.set(clamp(vx, -9, 9) + this.dir * 2.8, 3.2 + Math.max(0, vy) * 0.4, 1.8);
    this.stripAng.set(-2.2 - Math.random(), this.dir * (1.2 + Math.random()), -this.dir * (2.6 + Math.random() * 1.5));
    this.flyT = 0;
  }
  update(dt) {
    const s = this.s;
    this.tilt.x.step(dt); this.tilt.y.step(dt); this.tilt.z.step(dt);
    const t = Clock.t;
    const w = this.idle;
    this.group.position.set(s.x, s.y + Math.sin(t * 0.9) * 0.05 * w, s.z);
    this.group.rotation.set(s.rx + Math.sin(t * 0.63) * 0.04 * w, s.ry + Math.sin(t * 0.47 + 1) * 0.07 * w, s.rz + Math.sin(t * 0.37) * 0.012 * w, 'ZXY');
    this.group.scale.setScalar(s.sc);
    this.inner.rotation.set(this.tilt.x.v, this.tilt.y.v, this.tilt.z.v);
    this.common.uTime.value = t;
    if (this.flying) {
      this.flyT += dt;
      this.stripVel.y -= 11 * dt;
      this.stripHolder.position.addScaledVector(this.stripVel, dt);
      this.stripHolder.rotation.x += this.stripAng.x * dt;
      this.stripHolder.rotation.y += this.stripAng.y * dt;
      this.stripHolder.rotation.z += this.stripAng.z * dt;
      this.common.uCurl.value = Math.min(2.2, this.common.uCurl.value + dt * 1.4);
      if (this.flyT > 2.2) { this.flying = false; this.strip.visible = false; }
    }
  }
}
