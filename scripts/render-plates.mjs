// Produit public/plates/NN.webp : l'image de chaque planche, rendue par le vrai moteur.
// Usage : npm run build && npm run render:plates   (option : --only=5,31 pour certaines planches)
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean).map(Number);
const plates = only.length ? only : Array.from({ length: 32 }, (_, i) => i + 1);
const out = new URL('../public/plates/', import.meta.url);
await mkdir(out, { recursive: true });

const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'warn' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error('  erreur :', e.message));
  for (const n of plates) {
    const t0 = Date.now();
    await page.goto(`http://localhost:4179/?plate=${n}&q=high&nosw`);
    await page.waitForFunction((k) => document.documentElement.dataset.plateReady === String(k), n, { timeout: 180_000, polling: 250 });
    const url = await page.evaluate(() => window.CDC.capturePlate(500, 700, 'image/webp', 0.9));
    const file = new URL(`${String(n).padStart(2, '0')}.webp`, out);
    await writeFile(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`planche ${String(n).padStart(2, '0')} → ${file.pathname.split('/').slice(-3).join('/')} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
} finally {
  await browser.close();
  await server.close();
}
