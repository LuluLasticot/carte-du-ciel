import { describe, expect, it } from 'vitest';
import { E, Tweens, to, updateTweens, wait } from '../../src/core/util';

describe('tweens', () => {
  it('interpole les propriétés et se résout à la fin', async () => {
    const o = { x: 0, y: 10 };
    let resolved = false;
    to(o, { x: 1, y: 0 }, { dur: 1, ease: E.lin }).then(() => (resolved = true));
    updateTweens(0.5);
    expect(o.x).toBeCloseTo(0.5);
    expect(o.y).toBeCloseTo(5);
    updateTweens(0.6);
    await Promise.resolve();
    expect(o).toEqual({ x: 1, y: 0 });
    expect(resolved).toBe(true);
    expect(Tweens.size).toBe(0);
  });

  it('respecte le délai', () => {
    const o = { v: 0 };
    to(o, { v: 1 }, { dur: 1, delay: 0.5, ease: E.lin });
    updateTweens(0.4);
    expect(o.v).toBe(0);
    updateTweens(0.6);
    expect(o.v).toBeCloseTo(0.5);
    updateTweens(1);
  });

  it('peut être interrompu en appliquant l\'état final', () => {
    const o = { v: 0 };
    const p = to(o, { v: 2 }, { dur: 1 });
    p.tw.kill(true);
    expect(o.v).toBe(2);
    expect(Tweens.size).toBe(0);
  });

  it('wait() attend la durée demandée', async () => {
    let done = false;
    wait(0.3).then(() => (done = true));
    updateTweens(0.2); await Promise.resolve();
    expect(done).toBe(false);
    updateTweens(0.2); await Promise.resolve();
    expect(done).toBe(true);
  });
});
