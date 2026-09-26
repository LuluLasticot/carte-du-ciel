import { describe, expect, it } from 'vitest';
import { type DeviceInfo, PROFILES, detectQuality, fromQuery, lower } from '../../src/render/quality';

const dev = (o: Partial<DeviceInfo>): DeviceInfo => ({ gpu: '', mobile: false, memory: 0, cores: 8, screenPx: 1440, ...o });

describe('niveaux de qualité', () => {
  it('réserve le niveau bas au rendu logiciel et aux petits appareils', () => {
    expect(detectQuality(dev({ gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))' }))).toBe('low');
    expect(detectQuality(dev({ gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' }))).toBe('low');
    expect(detectQuality(dev({ gpu: 'Mali-T880', mobile: true }))).toBe('low');
    expect(detectQuality(dev({ gpu: 'Adreno (TM) 506', mobile: true }))).toBe('low');
    expect(detectQuality(dev({ gpu: 'Adreno (TM) 740', mobile: true, memory: 2 }))).toBe('low');
  });

  it('donne le niveau moyen aux téléphones de milieu de gamme', () => {
    expect(detectQuality(dev({ gpu: 'Adreno (TM) 618', mobile: true, memory: 6 }))).toBe('medium');
    expect(detectQuality(dev({ gpu: 'Mali-G57 MC2', mobile: true, memory: 4 }))).toBe('medium');
  });

  it('donne le niveau haut aux GPU récents', () => {
    expect(detectQuality(dev({ gpu: 'Apple GPU', mobile: true, memory: 0 }))).toBe('high');
    expect(detectQuality(dev({ gpu: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)' }))).toBe('high');
    expect(detectQuality(dev({ gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' }))).toBe('high');
    expect(detectQuality(dev({ gpu: 'Adreno (TM) 740', mobile: true, memory: 8 }))).toBe('high');
  });

  it('ménage les GPU intégrés sur les très grands écrans', () => {
    expect(detectQuality(dev({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620)', screenPx: 1080 }))).toBe('high');
    expect(detectQuality(dev({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620)', screenPx: 2160 }))).toBe('medium');
  });

  it('descend d\'un cran sans passer sous le niveau bas', () => {
    expect(lower('high')).toBe('medium');
    expect(lower('medium')).toBe('low');
    expect(lower('low')).toBe('low');
  });

  it('accepte un niveau imposé dans l\'adresse', () => {
    expect(fromQuery('?q=low')).toBe('low');
    expect(fromQuery('?q=ultra')).toBeNull();
    expect(fromQuery('')).toBeNull();
  });

  it('allège chaque profil par rapport au suivant', () => {
    expect(PROFILES.low.maxDpr).toBeLessThan(PROFILES.medium.maxDpr);
    expect(PROFILES.medium.bloomLevels).toBeLessThan(PROFILES.high.bloomLevels);
    expect(PROFILES.low.particles).toBeLessThan(PROFILES.high.particles);
  });
});
