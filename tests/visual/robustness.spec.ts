import { expect, test } from '@playwright/test';
import { DETERMINISM, Scene } from './helpers';

test('panneau de réglages : collection, import et qualité', async ({ page }, info) => {
  const s = new Scene(page);
  await s.open();
  await s.advance(1.6);
  await page.locator('#setBtn').click();
  await expect(page.locator('#settings')).toHaveClass(/\bon\b/);
  await s.advance(0.5);
  await expect(page).toHaveScreenshot('10-reglages.png');

  await page.locator('#importFile').setInputFiles({
    name: 'sauvegarde.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'carte-du-ciel/collection', version: 1, packs: 3, cards: { 1: 2, 14: 1, 31: 1 } })),
  });
  await expect(page.locator('#importMsg')).toContainText('3 planches, 3 pochettes');
  await page.locator('#importYes').click();
  await expect(page.locator('#colNote')).toHaveText('Collection importée.');
  await expect(page.locator('#count em')).toHaveText('03');

  await page.locator('#qualSeg button[data-q="low"]').click();
  expect(await page.evaluate(() => (window as any).CDC.quality.level)).toBe('low');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).not.toHaveClass(/\bon\b/);
  void info;
});

test('reprise après une perte du contexte WebGL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const s = new Scene(page);
  await s.open();
  await s.advance(1.6);
  await page.evaluate(() => { (window as any).__lose = (document.getElementById('gl') as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context'); (window as any).__lose.loseContext(); });
  await expect(page.locator('#glLost')).toHaveClass(/\bon\b/);
  await page.evaluate(() => (window as any).__lose.restoreContext());
  await expect(page.locator('#glLost')).not.toHaveClass(/\bon\b/);
  await s.advance(0.5);
  await expect(page).toHaveScreenshot('11-apres-perte-contexte.png');
  await s.call('autoTear()');
  await s.until('reveal');
  expect(errors).toEqual([]);
});

test('page de repli sans WebGL 2', async ({ page }) => {
  await page.addInitScript(DETERMINISM);
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
      return type === 'webgl2' || type === 'webgl' ? null : (orig as any).call(this, type, ...rest);
    } as any;
  });
  await page.goto('/');
  await expect(page.locator('.fallback h1')).toHaveText('La pochette ne peut pas s’ouvrir sur cet appareil');
  const imgs = page.locator('.fb-card img');
  await expect(imgs).toHaveCount(32);
  // les premières images (au-dessus de la ligne de flottaison) sont chargées et décodées
  // images visibles chargées ET décodées (sinon la capture peut les montrer vides)
  await page.evaluate(() => Promise.all([...document.querySelectorAll<HTMLImageElement>('.fb-card img[loading="eager"]')].map((i) => i.decode())));
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('.fb-card img[loading="eager"]')].every((i) => i.naturalWidth === 500))).toBe(true);
  // la capture couvre l'en-tête et le message ; le rendu des images, asynchrone dans Chromium sans écran, est vérifié ci-dessus
  await expect(page).toHaveScreenshot('12-repli.png', { mask: [page.locator('.fb-grid')] });
});
