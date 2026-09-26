import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/random';
import { PACKS } from '../../src/data/catalog';
import { rollPack } from '../../src/data/roll';

const N = 20000;

function lastTierShares(type: number, seed: number) {
  const random = rng(seed);
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) counts[rollPack(type, { random }).at(-1)!.tier]++;
  return counts.map((c) => c / N);
}

describe('rollPack', () => {
  it('donne 5 planches distinctes, la plus rare en dernier, les autres triées', () => {
    const random = rng(1);
    for (let i = 0; i < 2000; i++) {
      for (const type of [0, 1, 2]) {
        const pack = rollPack(type, { random });
        expect(pack).toHaveLength(5);
        expect(pack.every(Boolean)).toBe(true);
        expect(new Set(pack.map((c) => c.n)).size).toBe(5);
        const last = pack[4];
        for (const c of pack.slice(0, 4)) expect(c.tier).toBeLessThanOrEqual(last.tier);
        for (let k = 1; k < 4; k++) {
          const a = pack[k - 1], b = pack[k];
          expect(a.tier < b.tier || (a.tier === b.tier && a.n < b.n)).toBe(true);
        }
      }
    }
  });

  it('respecte les probabilités affichées pour la dernière planche', () => {
    PACKS.forEach((P, type) => {
      const shares = lastTierShares(type, 42 + type);
      P.last.forEach((p, tier) => expect(Math.abs(shares[tier] - p)).toBeLessThan(0.015));
    });
  });

  it('garantit une mythique dans la pochette Singularité et une légendaire au moins dans la Dorée', () => {
    const random = rng(7);
    for (let i = 0; i < 3000; i++) {
      expect(rollPack(2, { random })[4].tier).toBe(4);
      expect(rollPack(1, { random })[4].tier).toBeGreaterThanOrEqual(3);
    }
  });

  it('offre une légendaire dans la toute première pochette Standard', () => {
    const random = rng(3);
    for (let i = 0; i < 500; i++) expect(rollPack(0, { random, first: true })[4].tier).toBe(3);
  });

  it('applique les ancres #epique, #legendaire et #mythique', () => {
    const random = rng(9);
    for (const force of [2, 3, 4]) {
      for (let i = 0; i < 200; i++) expect(rollPack(0, { random, force })[4].tier).toBe(force);
    }
  });

  it('est reproductible avec la même graine', () => {
    const a = rollPack(0, { random: rng(123) }).map((c) => c.n);
    const b = rollPack(0, { random: rng(123) }).map((c) => c.n);
    expect(a).toEqual(b);
  });
});
