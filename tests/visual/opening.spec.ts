import { expect, test } from '@playwright/test';
import { Scene } from './helpers';

test('ouverture complète d\'une pochette jusqu\'à la fiche d\'une planche', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || t.includes('Transition inattendue')) problems.push(`${m.type()}: ${t}`);
  });

  const s = new Scene(page);
  await s.open('#legendaire');
  await s.advance(1.6);
  await expect(page).toHaveScreenshot('01-pochette.png');

  await s.call('autoTear()');
  await s.until('reveal');
  await s.advance(0.6);
  await expect(page).toHaveScreenshot('02-pile.png');

  await s.call('revealNext()');
  await s.advance(1.4);
  await expect(page).toHaveScreenshot('03-premiere-planche.png');

  for (let i = 0; i < 4; i++) { await s.call('revealNext()'); await s.advance(1.3); }
  expect(await s.state()).toBe('walkout');
  await s.call('skipWalkout()');
  await s.until('hero');
  await s.advance(1.6);
  await expect(page).toHaveScreenshot('04-planche-rare.png');

  await s.call('toSummary()');
  await s.until('summary');
  await s.advance(1.2);
  await expect(page).toHaveScreenshot('05-recapitulatif.png');

  await s.call('inspect(4)');
  await s.until('inspect');
  await s.advance(1.2);
  await expect(page).toHaveScreenshot('06-fiche.png');

  await s.call('closeInspect()');
  await s.until('summary');
  await s.call('newPack()');
  await s.until('idle', 0.25, 60);

  expect(await page.locator('#count em').textContent()).toBe('05');
  expect(problems).toEqual([]);
});
