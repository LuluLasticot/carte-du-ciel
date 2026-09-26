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

  /** Ouvre le jeu (hasard figé) ; `init` s'exécute après la remise à zéro du stockage. */
  async open(hash = '', { path = '/', waitFor = 'idle', init = '' } = {}) {
    await this.page.addInitScript(DETERMINISM);
    if (init) await this.page.addInitScript(init);
    await this.page.goto(path + '?q=high' + hash);
    await this.page.waitForFunction((s) => (window as any).CDC?.state === s && !(window as any).CDC.busy, waitFor, { timeout: 240_000, polling: 500 });
    await this.page.evaluate(() => (window as any).CDC.setManual(true));
  }

  /** Avance le jeu jusqu'à ce qu'il ne soit plus occupé dans l'état voulu. */
  async settle(state: string, step = 0.25, max = 120) {
    for (let i = 0; i < max; i++) {
      if (await this.page.evaluate((s) => (window as any).CDC.state === s && !(window as any).CDC.busy, state)) return;
      await this.advance(step);
    }
    throw new Error(`État « ${state} » jamais stabilisé (actuel : ${await this.state()})`);
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

/** Collection de démonstration : 15 planches, 6 constellations complètes, de la poussière et des doublons. */
export const DEMO_COLLECTION = `localStorage.setItem('cdc.collection', ${JSON.stringify(JSON.stringify({
  cards: { 1: 1, 2: 2, 7: 1, 8: 1, 13: 1, 14: 3, 16: 1, 17: 1, 27: 1, 18: 1, 23: 1, 28: 1, 31: 1, 21: 1, 24: 1 },
  packs: 6, dust: 400, lastDaily: '', rewarded: ['ORI', 'LYR', 'CYG', 'AND', 'SGR', 'CMA'],
}))});`;
