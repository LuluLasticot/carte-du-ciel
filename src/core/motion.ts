// Inclinaison du téléphone (gyroscope) : donne une petite inclinaison aux planches et à la pochette.
// La position neutre suit lentement la façon dont on tient le téléphone : on peut jouer allongé ou assis.

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
const DOE = (typeof window !== 'undefined' ? (window as any).DeviceOrientationEvent : undefined) as OrientationCtor | undefined;
const coarse = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

const raw = { x: 0, y: 0, fresh: false, seen: false };
const base = { x: 0, y: 0 };
const RANGE = 18;     // degrés pour une inclinaison maximale
const RECENTER = 4;   // secondes pour oublier une nouvelle position de repos

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  const angle = (screen.orientation?.angle ?? (window as any).orientation ?? 0) as number;
  let x = e.gamma, y = e.beta;
  if (angle === 90) { x = e.beta; y = -e.gamma; }
  else if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }
  else if (angle === 180) { x = -e.gamma; y = -e.beta; }
  if (!raw.seen) { base.x = x; base.y = y; raw.seen = true; }
  raw.x = x; raw.y = y; raw.fresh = true;
}

export const motion = {
  /** l'appareil annonce un gyroscope (téléphone ou tablette) */
  supported: !!DOE && coarse,
  /** des mesures arrivent */
  active: false,
  /** inclinaison lissée, de -1 à 1 */
  x: 0,
  y: 0,
  /** iOS exige une autorisation, demandée lors d'un geste du joueur */
  needsPermission: !!DOE && typeof DOE.requestPermission === 'function',
  asked: false,
  listening: false,

  /** À appeler depuis un geste (toucher) : nécessaire sur iOS. */
  async enable(): Promise<boolean> {
    if (!this.supported) return false;
    if (this.needsPermission && !this.asked) {
      this.asked = true;
      try { if ((await DOE!.requestPermission!()) !== 'granted') return false; } catch (e) { return false; }
    } else if (this.needsPermission && this.asked && !this.listening) {
      try { if ((await DOE!.requestPermission!()) !== 'granted') return false; } catch (e) { return false; }
    }
    if (!this.listening) { window.addEventListener('deviceorientation', onOrientation); this.listening = true; }
    return true;
  },
  disable() {
    window.removeEventListener('deviceorientation', onOrientation);
    this.listening = false; this.active = false; raw.seen = false; this.x = 0; this.y = 0;
  },
  update(dt: number) {
    if (!this.listening || !raw.seen) { this.x *= 0.9; this.y *= 0.9; return; }
    this.active = true;
    const k = 1 - Math.exp(-dt / RECENTER);
    base.x += (raw.x - base.x) * k; base.y += (raw.y - base.y) * k;
    const tx = Math.max(-1, Math.min(1, (raw.x - base.x) / RANGE));
    const ty = Math.max(-1, Math.min(1, (raw.y - base.y) / RANGE));
    const s = 1 - Math.exp(-dt * 10);
    this.x += (tx - this.x) * s; this.y += (ty - this.y) * s;
  },
};
