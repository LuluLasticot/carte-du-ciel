// Positions approchées des objets du Système solaire pour une date donnée.
// Planètes, Soleil et Lune : éléments orbitaux moyens de P. Schlyter (« How to compute planetary positions »),
// précision de l'ordre du degré, largement suffisante pour placer un repère sur une carte du ciel.
// Comètes et Cérès : orbite képlérienne à partir de leurs éléments (passage au périhélie).

const RAD = Math.PI / 180;
const rev = (x: number) => x - Math.floor(x / 360) * 360;
const sind = (x: number) => Math.sin(x * RAD), cosd = (x: number) => Math.cos(x * RAD);

export interface Equatorial { ra: number; dec: number }       // heures, degrés
interface Vec { x: number; y: number; z: number }

/** Jour julien d'une date JavaScript (temps universel). */
export function julianDay(date: Date): number { return date.getTime() / 86400000 + 2440587.5; }
/** Jours écoulés depuis 2000 janv. 0,0 TU (convention de Schlyter). */
export function dayNumber(date: Date): number { return julianDay(date) - 2451543.5; }

interface Elements { N: number; i: number; w: number; a: number; e: number; M: number }
type ElementsAt = (d: number) => Elements;

const ELEMENTS: Record<string, ElementsAt> = {
  sun: (d) => ({ N: 0, i: 0, w: 282.9404 + 4.70935e-5 * d, a: 1, e: 0.016709 - 1.151e-9 * d, M: 356.047 + 0.9856002585 * d }),
  moon: (d) => ({ N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.0549, M: 115.3654 + 13.0649929509 * d }),
  mercury: (d) => ({ N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d }),
  venus: (d) => ({ N: 76.6799 + 2.4659e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.891 + 1.38374e-5 * d, a: 0.72333, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d }),
  mars: (d) => ({ N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d }),
  jupiter: (d) => ({ N: 100.4542 + 2.76854e-5 * d, i: 1.303 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.895 + 0.0830853001 * d }),
  saturn: (d) => ({ N: 113.6634 + 2.3898e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.967 + 0.0334442282 * d }),
  uranus: (d) => ({ N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: 142.5905 + 0.011725806 * d }),
  neptune: (d) => ({ N: 131.7806 + 3.0173e-5 * d, i: 1.77 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: 260.2471 + 0.005995147 * d }),
};

/** Orbites définies par leur passage au périhélie (jour julien T, distance q en UA). */
interface PerihelionOrbit { T: number; q: number; e: number; i: number; N: number; w: number }
export const SMALL_BODIES: Record<string, PerihelionOrbit> = {
  // 1P/Halley, passage de 1986
  halley: { T: 2446470.96, q: 0.5871, e: 0.96714, i: 162.26, N: 58.42, w: 111.33 },
  // C/1995 O1 Hale-Bopp, passage de 1997
  haleBopp: { T: 2450539.64, q: 0.9141, e: 0.99508, i: 89.43, N: 282.47, w: 130.59 },
  // (1) Cérès : orbite quasi circulaire, périhélie fin 2022 (position approximative)
  ceres: { T: 2459920.5, q: 2.5494, e: 0.0785, i: 10.59, N: 80.3, w: 73.6 },
};

export function obliquity(d: number) { return 23.4393 - 3.563e-7 * d; }

function kepler(M: number, e: number): number {
  // M en degrés, renvoie l'anomalie excentrique en degrés (Newton, robuste pour e proche de 1)
  const m = rev(M) * RAD;
  let E = e < 0.8 ? m : Math.PI;
  for (let k = 0; k < 60; k++) {
    const dE = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E / RAD;
}

/** Position dans le plan de l'orbite puis dans le repère écliptique. */
function orbitToEcliptic(el: Elements): Vec {
  const E = kepler(el.M, el.e);
  const xv = el.a * (cosd(E) - el.e), yv = el.a * Math.sqrt(1 - el.e * el.e) * sind(E);
  const v = Math.atan2(yv, xv) / RAD, r = Math.hypot(xv, yv);
  const vw = v + el.w;
  return {
    x: r * (cosd(el.N) * cosd(vw) - sind(el.N) * sind(vw) * cosd(el.i)),
    y: r * (sind(el.N) * cosd(vw) + cosd(el.N) * sind(vw) * cosd(el.i)),
    z: r * sind(vw) * sind(el.i),
  };
}

function eclipticToEquatorial(v: Vec, d: number): Equatorial {
  const ecl = obliquity(d);
  const xe = v.x, ye = v.y * cosd(ecl) - v.z * sind(ecl), ze = v.y * sind(ecl) + v.z * cosd(ecl);
  const ra = rev(Math.atan2(ye, xe) / RAD) / 15;
  const dec = Math.atan2(ze, Math.hypot(xe, ye)) / RAD;
  return { ra, dec };
}

/** Position géocentrique du Soleil dans l'écliptique (UA). */
function sunEcliptic(d: number): Vec { return orbitToEcliptic(ELEMENTS.sun(d)); }

function smallBodyHelio(o: PerihelionOrbit, jd: number): Vec {
  const a = o.q / (1 - o.e);
  const n = 0.9856076686 / Math.pow(a, 1.5);
  return orbitToEcliptic({ N: o.N, i: o.i, w: o.w, a, e: o.e, M: n * (jd - o.T) });
}

export type BodyKey = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'halley' | 'haleBopp' | 'ceres';

/** Ascension droite et déclinaison géocentriques d'un corps à une date. */
export function bodyPosition(body: BodyKey, date: Date): Equatorial {
  const d = dayNumber(date);
  const sun = sunEcliptic(d);
  if (body === 'sun') return eclipticToEquatorial(sun, d);
  if (body === 'moon') return eclipticToEquatorial(orbitToEcliptic(ELEMENTS.moon(d)), d);
  const helio = body in SMALL_BODIES ? smallBodyHelio(SMALL_BODIES[body], julianDay(date)) : orbitToEcliptic(ELEMENTS[body](d));
  // géocentrique = héliocentrique + position géocentrique du Soleil
  return eclipticToEquatorial({ x: helio.x + sun.x, y: helio.y + sun.y, z: helio.z + sun.z }, d);
}

/** Latitude écliptique (degrés) d'une position équatoriale, pour les tests et le tracé de l'écliptique. */
export function eclipticLatitude(p: Equatorial, date: Date): number {
  const ecl = obliquity(dayNumber(date));
  const ra = p.ra * 15;
  return Math.asin(sind(p.dec) * cosd(ecl) - cosd(p.dec) * sind(ecl) * sind(ra)) / RAD;
}

/** Points de l'écliptique en coordonnées équatoriales (pour le tracer sur la sphère). */
export function eclipticPath(date: Date, steps = 120): Equatorial[] {
  const d = dayNumber(date), out: Equatorial[] = [];
  for (let k = 0; k <= steps; k++) {
    const l = (k / steps) * 360;
    out.push(eclipticToEquatorial({ x: cosd(l), y: sind(l), z: 0 }, d));
  }
  return out;
}
