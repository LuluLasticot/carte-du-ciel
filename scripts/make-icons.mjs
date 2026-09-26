// Génère les icônes de l'application (PNG) à partir du dessin vectoriel de la boussole.
// Usage : npm run make:icons
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const mark = (scale) => `<g transform="scale(${scale})"><g fill="none" stroke="#E2BD71"><circle r="34" stroke-width="3"/><path d="M0-26V-8M0 8V26M-26 0H-8M8 0H26" stroke-width="3" stroke-linecap="round"/></g><path d="M0-15L3 0L0 15L-3 0Z M-15 0L0 3L15 0L0-3Z" fill="#EFE7D6"/></g>`;
// icône classique (coins arrondis) et icône « maskable » (fond plein, motif dans la zone sûre)
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><rect x="-50" y="-50" width="100" height="100" rx="22" fill="#05060B"/>${mark(1)}</svg>`;
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><rect x="-50" y="-50" width="100" height="100" fill="#05060B"/>${mark(0.78)}</svg>`;
const targets = [
  ['icon-192.png', rounded, 192], ['icon-512.png', rounded, 512],
  ['icon-maskable-512.png', full, 512], ['apple-touch-icon.png', full, 180],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, svg, size] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await writeFile(new URL(`../public/icons/${name}`, import.meta.url), await page.screenshot({ omitBackground: true }));
  console.log('icône', name);
}
await browser.close();
