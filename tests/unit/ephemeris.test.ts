import { describe, expect, it } from 'vitest';
import { type BodyKey, bodyPosition, eclipticLatitude, eclipticPath, julianDay } from '../../src/astro/ephemeris';

const J2000 = new Date(Date.UTC(2000, 0, 1, 12));
const dist = (a: { ra: number; dec: number }, b: { ra: number; dec: number }) => {
  const r = Math.PI / 180, ra1 = a.ra * 15 * r, ra2 = b.ra * 15 * r, d1 = a.dec * r, d2 = b.dec * r;
  return Math.acos(Math.min(1, Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(ra1 - ra2))) / r;
};

describe('éphémérides', () => {
  it('calcule le jour julien', () => {
    expect(julianDay(J2000)).toBeCloseTo(2451545.0, 6);
  });

  it('place le Soleil au bon endroit le 1er janvier 2000 (α 18 h 45 min, δ −23°)', () => {
    const s = bodyPosition('sun', J2000);
    expect(s.ra).toBeCloseTo(18.75, 1);
    expect(s.dec).toBeCloseTo(-23.03, 0);
  });

  it('met le Soleil au point vernal à l\'équinoxe de mars 2026', () => {
    const s = bodyPosition('sun', new Date(Date.UTC(2026, 2, 20, 14, 46)));
    expect(Math.abs(s.dec)).toBeLessThan(0.1);
    expect(Math.min(s.ra, 24 - s.ra)).toBeLessThan(0.05);
  });

  it('garde les planètes près de l\'écliptique et la Lune dans ses 5,3°', () => {
    const dates = [J2000, new Date(Date.UTC(2013, 5, 1)), new Date(Date.UTC(2026, 8, 26))];
    const limits: [BodyKey, number][] = [['moon', 5.4], ['mercury', 7.5], ['venus', 9], ['mars', 7], ['jupiter', 2], ['saturn', 3], ['neptune', 2]];
    for (const date of dates) for (const [b, lim] of limits) {
      const lat = Math.abs(eclipticLatitude(bodyPosition(b, date), date));
      expect(lat, `${b} ${date.toISOString()}`).toBeLessThan(lim);
    }
  });

  it('retrouve la grande conjonction Jupiter-Saturne du 21 décembre 2020 (moins d\'un degré)', () => {
    const d = new Date(Date.UTC(2020, 11, 21, 18));
    expect(dist(bodyPosition('jupiter', d), bodyPosition('saturn', d))).toBeLessThan(1);
  });

  it('retrouve la comète Hale-Bopp au périhélie d\'avril 1997, haut dans le ciel boréal (Persée-Andromède)', () => {
    const p = bodyPosition('haleBopp', new Date(Date.UTC(1997, 3, 1)));
    expect(p.dec).toBeGreaterThan(35);
    expect(p.dec).toBeLessThan(50);
    expect(p.ra).toBeGreaterThan(1.5);
    expect(p.ra).toBeLessThan(4);
  });

  it('trace une écliptique fermée qui monte à +23,4° et descend à −23,4°', () => {
    const path = eclipticPath(J2000, 360);
    const decs = path.map((p) => p.dec);
    expect(Math.max(...decs)).toBeCloseTo(23.44, 1);
    expect(Math.min(...decs)).toBeCloseTo(-23.44, 1);
    expect(dist(path[0], path[path.length - 1])).toBeLessThan(1e-6);
  });
});
