// Plugin Vite : écrit dist/sw.js, un service worker qui met en cache tout le jeu pour le hors-ligne.
// La liste des fichiers vient du build lui-même : rien à maintenir à la main.
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

function listPublic(dir: string, root = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listPublic(p, root));
    else out.push('/' + relative(root, p).split('\\').join('/'));
  }
  return out;
}

const worker = (cache: string, precache: string[]) => `// Service worker de Carte du Ciel (généré au build par tools/sw-plugin.ts)
const CACHE = ${JSON.stringify(cache)};
const PLATES = 'cdc-plates';
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cdc-') && k !== CACHE && k !== PLATES).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // pages : le réseau d'abord (nouvelle version), le cache si hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then((c) => c.put('/index.html', copy));
      return res;
    }).catch(() => caches.match('/index.html')));
    return;
  }
  // images des planches (page de repli) : cache puis mise à jour en arrière-plan
  if (url.pathname.startsWith('/plates/')) {
    e.respondWith(caches.open(PLATES).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; });
      return hit || net;
    })));
    return;
  }
  // fichiers versionnés du build : le cache d'abord
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`;

export function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'carte-du-ciel-sw',
    apply: 'build',
    configResolved(c) { publicDir = c.publicDir; },
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).map((f) => '/' + f).filter((f) => !f.endsWith('.map'));
      const pub = listPublic(publicDir).filter((f) => !f.startsWith('/plates/') && f !== '/sw.js');
      const precache = ['/', ...new Set([...built, ...pub])].sort();
      const version = createHash('sha256').update(precache.join('\n') + Object.values(bundle).map((b: any) => b.code || b.source || '').join('')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker(`cdc-${version}`, precache) });
    },
  };
}
