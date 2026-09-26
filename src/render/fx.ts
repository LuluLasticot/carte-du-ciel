// ---------------------------------------------------------------------------
// Effets : particules, rayons, éclat d'étoile
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { Clock, REDUCED, TAU } from '../core/util';
import { TIERS } from '../data/catalog';
import { FLARE_FS, GLSL_COMMON, PART_FS, PART_VS, QUAD_VS, RAYS_FS } from '../shaders/index';
import { cam, mainScene, quality } from './engine';

export class Particles {
  declare a0: any;
  declare aAlpha: any;
  declare aCol: any;
  declare aPos: any;
  declare aSize: any;
  declare active: any;
  declare alpha: any;
  declare attract: any;
  declare col: any;
  declare drag: any;
  declare grav: any;
  declare head: any;
  declare life: any;
  declare mat: any;
  declare max: any;
  declare maxLife: any;
  declare points: any;
  declare pos: any;
  declare s0: any;
  declare s1: any;
  declare size: any;
  declare spin: any;
  declare vel: any;
  constructor(max = 3200) {
    this.max = max;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max); this.grav = new Float32Array(max); this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max); this.attract = new Float32Array(max); this.spin = new Float32Array(max);
    this.head = 0;
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aColor', this.aCol); g.setAttribute('aSize', this.aSize); g.setAttribute('aAlpha', this.aAlpha);
    this.mat = new THREE.ShaderMaterial({ vertexShader: PART_VS, fragmentShader: PART_FS, uniforms: { uPx: { value: 400 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.active = 0;
  }
  emit(o) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = o.x; this.pos[i3 + 1] = o.y; this.pos[i3 + 2] = o.z || 0;
    this.vel[i3] = o.vx || 0; this.vel[i3 + 1] = o.vy || 0; this.vel[i3 + 2] = o.vz || 0;
    const c = o.c || [1, 1, 1];
    this.col[i3] = c[0]; this.col[i3 + 1] = c[1]; this.col[i3 + 2] = c[2];
    this.life[i] = 0; this.maxLife[i] = o.life || 1;
    this.drag[i] = o.drag ?? 1.5; this.grav[i] = o.grav ?? 0;
    this.s0[i] = o.s0 ?? 0.08; this.s1[i] = o.s1 ?? 0;
    this.a0[i] = o.a ?? 1; this.attract[i] = o.attract || 0; this.spin[i] = o.spin || 0;
    this.alpha[i] = 0.0001;
  }
  update(dt) {
    let any = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.maxLife[i] <= 0) continue;
      this.life[i] += dt;
      const t = this.life[i] / this.maxLife[i];
      const i3 = i * 3;
      if (t >= 1) { this.maxLife[i] = 0; this.alpha[i] = 0; continue; }
      any++;
      const dr = Math.exp(-this.drag[i] * dt);
      let vx = this.vel[i3] * dr, vy = this.vel[i3 + 1] * dr - this.grav[i] * dt, vz = this.vel[i3 + 2] * dr;
      const x = this.pos[i3], y = this.pos[i3 + 1], z = this.pos[i3 + 2];
      if (this.attract[i]) {
        const d = Math.hypot(x, y, z) + 0.05;
        const k = this.attract[i] * dt / (d * d + 0.2);
        vx -= x * k; vy -= y * k; vz -= z * k;
        const sp = this.spin[i] * dt / (d + 0.3);
        vx += -y * sp; vy += x * sp;
      }
      this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
      this.pos[i3] = x + vx * dt; this.pos[i3 + 1] = y + vy * dt; this.pos[i3 + 2] = z + vz * dt;
      const fade = Math.min(1, t * 8) * (1 - t) * (1 - t * 0.2);
      this.alpha[i] = this.a0[i] * fade;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
    }
    this.active = any;
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true; this.aAlpha.needsUpdate = true;
  }
  clear() { this.maxLife.fill(0); this.alpha.fill(0); this.aAlpha.needsUpdate = true; }
}
export const parts = new Particles(3600);
mainScene.add(parts.points);

export function tierColor(t, k = 1) { const c = TIERS[t].rgb; return [c[0] * k, c[1] * k, c[2] * k]; }
export function rainbow(h, k = 1) { const c = new THREE.Color().setHSL(h % 1, 0.9, 0.62); return [c.r * k, c.g * k, c.b * k]; }
export function burstColor(t, k) {
  if (t === 4) return rainbow(Math.random(), k);
  if (t === 2) return Math.random() < 0.5 ? tierColor(2, k) : rainbow(0.55 + Math.random() * 0.3, k);
  return tierColor(t, k);
}
export interface BurstOptions { flat?: boolean; up?: number; vz?: number; life?: number; drag?: number; grav?: number; size?: number }
export function burst(x, y, z, t, n, speed = 4, opts: BurstOptions = {}) {
  const N = Math.round(n * (REDUCED ? 0.35 : 1) * quality.profile.particles);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU, e = (Math.random() - 0.5) * Math.PI * (opts.flat ? 0.3 : 1);
    const v = speed * (0.25 + Math.random() * 0.9);
    parts.emit({
      x, y, z, vx: Math.cos(a) * Math.cos(e) * v, vy: Math.sin(a) * Math.cos(e) * v + (opts.up || 0), vz: Math.sin(e) * v * 0.6 + (opts.vz || 0),
      c: burstColor(t, 1.4 + Math.random() * 2.4), life: (opts.life || 1.6) * (0.5 + Math.random()), drag: opts.drag ?? 1.6, grav: opts.grav ?? 1.2,
      s0: (opts.size || 0.09) * (0.6 + Math.random()), s1: 0,
    });
  }
}

// rayons (plan additif)
export class Rays {
  declare int: any;
  declare mat: any;
  declare mesh: any;
  constructor(size, fan = 0) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: GLSL_COMMON + RAYS_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uInt: { value: 0 }, uFan: { value: fan }, uCol: { value: new THREE.Color(1, 0.8, 0.5) }, uPrism: { value: 0 } },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.mat);
    this.mesh.renderOrder = -1;
    this.mesh.visible = false;
    this.int = 0;
    mainScene.add(this.mesh);
  }
  update() { this.mat.uniforms.uTime.value = Clock.t; this.mat.uniforms.uInt.value = this.int; this.mesh.visible = this.int > 0.002; }
}
export const heroRays = new Rays(16, 0);
export const packRays = new Rays(12, 0.9);

// éclat d'étoile (billboard additif)
export const flare: { mat: THREE.ShaderMaterial; int: number; size: number; mesh?: THREE.Mesh } = {
  mat: new THREE.ShaderMaterial({
    vertexShader: QUAD_VS, fragmentShader: GLSL_COMMON + FLARE_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: new THREE.Color(1, 0.9, 0.7) }, uInt: { value: 0 } },
  }),
  int: 0, size: 1,
};
flare.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flare.mat);
flare.mesh.renderOrder = 20;
flare.mesh.visible = false;
mainScene.add(flare.mesh);
export function updateFlare() {
  flare.mat.uniforms.uInt.value = flare.int;
  flare.mesh.visible = flare.int > 0.002;
  flare.mesh.scale.setScalar(flare.size);
  flare.mesh.quaternion.copy(cam.quaternion);
}
