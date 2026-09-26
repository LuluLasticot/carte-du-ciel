import { describe, expect, it } from 'vitest';
import { ART, CARDS, CONS, DIST_ROLL, PACKS, TIERS } from '../../src/data/catalog';

describe('catalogue de la Série I', () => {
  it('numérote les 32 planches de 1 à 32 sans trou ni doublon', () => {
    expect(CARDS.map((c) => c.n)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it('répartit les raretés comme prévu (12 / 8 / 6 / 4 / 2)', () => {
    const counts = TIERS.map((_, t) => CARDS.filter((c) => c.tier === t).length);
    expect(counts).toEqual([12, 8, 6, 4, 2]);
  });

  it('place chaque objet hors Système solaire dans une constellation connue, à des coordonnées valides', () => {
    for (const c of CARDS) {
      if (c.con === null) continue;
      expect(CONS, `${c.name} : constellation ${c.con}`).toHaveProperty(c.con);
      expect(c.ra, c.name).toBeGreaterThanOrEqual(0);
      expect(c.ra, c.name).toBeLessThan(24);
      expect(Math.abs(c.dec!), c.name).toBeLessThanOrEqual(90);
    }
  });

  it('associe un type d\'illustration existant à chaque planche', () => {
    const arts = new Set(Object.values(ART));
    for (const c of CARDS) expect(arts.has(c.art.t), c.name).toBe(true);
  });

  it('prévoit une distance défilante pour chaque planche épique ou plus rare', () => {
    for (const c of CARDS.filter((c) => c.tier >= 2)) expect(DIST_ROLL, c.name).toHaveProperty(String(c.n));
  });

  it('a des probabilités de pochette qui somment à 1', () => {
    for (const P of PACKS) {
      expect(P.slot.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      expect(P.last.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    }
  });

  it('relie chaque tracé de constellation à des étoiles existantes', () => {
    for (const [key, C] of Object.entries(CONS) as [string, { s: number[][]; l: number[][] }][]) {
      for (const [i, j] of C.l) {
        expect(C.s[i], `${key} ${i}`).toBeDefined();
        expect(C.s[j], `${key} ${j}`).toBeDefined();
      }
    }
  });
});
