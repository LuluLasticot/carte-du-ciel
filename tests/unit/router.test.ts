import { describe, expect, it } from 'vitest';
import { parseRoute, routePath, routeTitle } from '../../src/core/router';

describe('adresses', () => {
  it('reconnaît les trois écrans', () => {
    expect(parseRoute('/')).toEqual({ name: 'pack' });
    expect(parseRoute('/atlas')).toEqual({ name: 'atlas' });
    expect(parseRoute('/atlas/')).toEqual({ name: 'atlas' });
    expect(parseRoute('/planche/31')).toEqual({ name: 'plate', n: 31 });
  });
  it('renvoie à la pochette pour une adresse inconnue ou une planche hors série', () => {
    expect(parseRoute('/planche/0')).toEqual({ name: 'pack' });
    expect(parseRoute('/planche/33')).toEqual({ name: 'pack' });
    expect(parseRoute('/inconnu')).toEqual({ name: 'pack' });
  });
  it('fait l\'aller-retour entre écran et adresse', () => {
    for (const r of [{ name: 'pack' }, { name: 'atlas' }, { name: 'plate', n: 7 }] as const) expect(parseRoute(routePath(r))).toEqual(r);
  });
  it('titre chaque page', () => {
    expect(routeTitle({ name: 'plate', n: 31 }, 'Sagittarius A*')).toBe('Sagittarius A* · Planche 31 · Carte du Ciel');
  });
});
