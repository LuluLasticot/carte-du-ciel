import type { Page } from '@playwright/test';

/** Rend le hasard et l'horloge reproductibles, et fige la résolution dynamique. */
export const DETERMINISM = `
  (() => {
    let a = 20260926 >>> 0;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const t0 = 1790000000000; Date.now = () => t0;
    window.CDC_NO_DYN = true;
    try { localStorage.clear(); } catch (e) {}
  })();
`;

const RAF = 'new Promise(r => { requestAnimationFrame(() => r(0)); setTimeout(() => r(-1), 15000); })';

export class Scene {
  constructor(public page: Page) {}

  async open(hash = '') {
    await this.page.addInitScript(DETERMINISM);
    await this.page.goto('/?q=high' + hash);
    await this.page.waitForFunction(() => (window as any).CDC?.state === 'idle', null, { timeout: 240_000, polling: 500 });
    await this.page.evaluate(() => (window as any).CDC.setManual(true));
  }

  state() { return this.page.evaluate(() => (window as any).CDC.state as string); }

  /** Avance le temps du jeu, puis laisse le navigateur produire une image. */
  async advance(sec: number) {
    await this.page.evaluate((s) => (window as any).CDC.advance(s), sec);
    await this.page.evaluate(RAF);
  }

  async call(fn: string) { await this.page.evaluate(`CDC.${fn}; 0`); }

  async until(state: string, step = 0.25, max = 120) {
    for (let i = 0; i < max; i++) {
      if ((await this.state()) === state) return;
      await this.advance(step);
    }
    throw new Error(`État « ${state} » jamais atteint (actuel : ${await this.state()})`);
  }
}
