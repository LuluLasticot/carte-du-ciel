import { expect, test } from '@playwright/test';
import { DEMO_COLLECTION, Scene } from './helpers';

test('Atlas céleste : ciel, planche, Album et création', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('Transition inattendue')) problems.push(m.text()); });
  const s = new Scene(page);
  await s.open('', { path: '/atlas', waitFor: 'atlas', init: DEMO_COLLECTION });
  await expect(page).toHaveTitle('Atlas céleste · Carte du Ciel');
  await expect(page.locator('#atlasStats')).toHaveText('15 planches sur 32 · 6 constellations complètes');
  await s.advance(2.5);
  await expect(page).toHaveScreenshot('20-atlas.png');

  // une planche possédée, ouverte depuis son repère
  await page.locator('.amark[data-n="24"]').click();
  await s.settle('atlasPlate');
  await s.advance(1.2);
  expect(new URL(page.url()).pathname).toBe('/planche/24');
  await expect(page.locator('#inspN')).toHaveText('Dentelles du Cygne');
  await expect(page).toHaveScreenshot('21-atlas-planche.png');
  await page.goBack();
  await s.settle('atlas');
  expect(new URL(page.url()).pathname).toBe('/atlas');

  // l'Album, les doublons et la création d'une planche manquante
  await page.locator('#tabAlbum').click();
  await expect(page.locator('#albumCounts')).toContainText('15 / 32');
  await page.evaluate(() => Promise.all([...document.querySelectorAll<HTMLImageElement>('#albumGrid img')].map((i) => i.decode().catch(() => null))));
  await s.advance(0.3);
  await expect(page).toHaveScreenshot('22-album.png', { mask: [page.locator('#albumGrid img')] });
  await page.locator('#convertBtn').click();
  await expect(page.locator('#albumDust')).toHaveText('435');
  await page.locator('[data-craft="9"]').click();
  await expect(page.locator('[data-craft="9"]')).toHaveText(/Confirmer/);
  await page.locator('[data-craft="9"]').click();
  await s.settle('atlasPlate');
  await expect(page.locator('#inspN')).toHaveText('Étoile polaire');
  // création (−40) et Petite Ourse complétée (+40)
  await expect(page.locator('#dustVal')).toHaveText('435');
  await expect(page.locator('#count em')).toHaveText('16');

  // retour à la pochette
  await page.locator('#inspClose').click();
  await s.settle('atlas');
  await page.locator('#atlasBack').click();
  await s.settle('idle');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(problems).toEqual([]);
});

test('lien direct vers une planche que l\'on ne possède pas', async ({ page }) => {
  const s = new Scene(page);
  await s.open('', { path: '/planche/31', waitFor: 'atlasPlate' });
  await expect(page).toHaveTitle('Sagittarius A* · Planche 31 · Carte du Ciel');
  await expect(page.locator('#inspN')).toHaveText('Sagittarius A*');
  await expect(page.locator('#inspAct')).toContainText('pas encore dans votre collection');
  await expect(page.locator('#inspAct button')).toBeDisabled();
  await s.advance(1.2);
  await expect(page).toHaveScreenshot('23-lien-planche.png');
  await page.locator('#inspClose').click();
  await s.settle('atlas');
  expect(new URL(page.url()).pathname).toBe('/atlas');
});
