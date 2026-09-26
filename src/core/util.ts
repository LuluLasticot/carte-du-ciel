// ---------------------------------------------------------------------------
// Outils : maths, easings, hasard, tweens, stockage
// ---------------------------------------------------------------------------
import { pickWeighted, rng } from './random';

export { rng };

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const REDUCED = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const E = {
  lin: (t) => t,
  sio: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  p2o: (t) => 1 - (1 - t) * (1 - t),
  p3o: (t) => 1 - Math.pow(1 - t, 3),
  p4o: (t) => 1 - Math.pow(1 - t, 4),
  xo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  p2i: (t) => t * t,
  p3i: (t) => t * t * t,
  xi: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  p2io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  p3io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  xio: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  bo: (s = 1.70158) => (t) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  bi: (s = 1.70158) => (t) => (s + 1) * t * t * t - s * t * t,
};

// Générateur pseudo-aléatoire du jeu (graine différente à chaque partie)
export const RND = rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
export const rand = (a = 0, b = 1) => a + (b - a) * RND();
export const pickW = (weights: readonly number[]) => pickWeighted(weights, RND);

// Horloge et tweens pilotés par la boucle de rendu (le temps peut être accéléré)
export const Clock = { t: 0, scale: 1 };
export type Ease = (t: number) => number;
export interface TweenOptions {
  dur?: number;
  delay?: number;
  ease?: Ease;
  /** appelée à chaque image avec la progression adoucie (e) et brute (p) */
  update?: (e: number, p: number) => void;
  done?: () => void;
}
export interface Tween {
  age: number;
  dur: number;
  ease: Ease;
  update?: (e: number, p: number) => void;
  done?: () => void;
  resolve: () => void;
  dead: boolean;
  kill: (complete?: boolean) => void;
}
export type TweenPromise = Promise<void> & { tw: Tween };

export const Tweens = new Set<Tween>();
export function tween({ dur = 1, delay = 0, ease = E.p3o, update, done }: TweenOptions): TweenPromise {
  let resolveFn: () => void = () => {};
  const p = new Promise<void>((r) => (resolveFn = r)) as TweenPromise;
  const tw: Tween = { age: -delay, dur: Math.max(1e-4, dur), ease, update, done, resolve: resolveFn, dead: false, kill: () => {} };
  tw.kill = (complete = false) => {
    if (tw.dead) return;
    tw.dead = true;
    Tweens.delete(tw);
    if (complete) { tw.update && tw.update(1, 1); tw.done && tw.done(); }
    tw.resolve();
  };
  Tweens.add(tw);
  p.tw = tw;
  return p;
}
// anime des propriétés numériques d'un objet (valeurs de départ lues au démarrage)
export function to<T extends object>(obj: T, props: { [K in keyof T]?: number }, { dur = 1, delay = 0, ease = E.p3o, done }: Omit<TweenOptions, 'update'> = {}): TweenPromise {
  let from: Record<string, number> | null = null;
  const o = obj as Record<string, number>;
  return tween({
    dur, delay, ease, done,
    update: (e) => {
      if (!from) { from = {}; for (const k in props) from[k] = o[k]; }
      for (const k in props) o[k] = from[k] + ((props as Record<string, number>)[k] - from[k]) * e;
    },
  });
}
export function wait(sec: number): TweenPromise { return tween({ dur: sec, ease: E.lin }); }
// Attente de la prochaine image du jeu (et non du navigateur) : reste reproductible quand
// le temps est piloté à la main (tests), identique à requestAnimationFrame en jeu normal.
const frameWaiters: (() => void)[] = [];
export function nextFrame(): Promise<void> { return new Promise<void>((r) => frameWaiters.push(r)); }
export function flushFrame() { for (const r of frameWaiters.splice(0)) r(); }
/** Rend la main au navigateur (dessin, saisie) pendant un long calcul. */
export function yieldToBrowser(): Promise<void> { return new Promise<void>((r) => requestAnimationFrame(() => r())); }

export function updateTweens(dt: number) {
  for (const tw of [...Tweens]) {
    if (tw.dead) continue;
    tw.age += dt;
    if (tw.age < 0) continue;
    const p = Math.min(1, tw.age / tw.dur);
    tw.update && tw.update(tw.ease(p), p);
    if (p >= 1) {
      tw.dead = true;
      Tweens.delete(tw);
      tw.done && tw.done();
      tw.resolve();
    }
  }
}

// Ressort critique amorti (pour les inclinaisons interactives)
export class Spring {
  declare c: any;
  declare k: any;
  declare t: any;
  declare v: any;
  declare vel: any;
  constructor(v = 0, k = 120, c = 18) { this.v = v; this.t = v; this.vel = 0; this.k = k; this.c = c; }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.t - this.v) - this.c * this.vel;
      this.vel += a * h;
      this.v += this.vel * h;
    }
    return this.v;
  }
}

export const fmtFR = (n) => String(n).replace('.', ',');
export const pad2 = (n) => String(n).padStart(2, '0');
