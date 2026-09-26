// Adresses du jeu : « / » (pochette), « /atlas », « /planche/12 ». Navigation par l'historique du navigateur.

export type Route = { name: 'pack' } | { name: 'atlas' } | { name: 'plate'; n: number };

export function parseRoute(path: string): Route {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/atlas') return { name: 'atlas' };
  const m = /^\/planche\/(\d{1,2})$/.exec(p);
  if (m && +m[1] >= 1 && +m[1] <= 32) return { name: 'plate', n: +m[1] };
  return { name: 'pack' };
}

export function routePath(r: Route): string {
  return r.name === 'atlas' ? '/atlas' : r.name === 'plate' ? `/planche/${r.n}` : '/';
}

const BASE_TITLE = 'Carte du Ciel';
export function routeTitle(r: Route, plateName?: string): string {
  if (r.name === 'atlas') return `Atlas céleste · ${BASE_TITLE}`;
  if (r.name === 'plate') return `${plateName ? `${plateName} · ` : ''}Planche ${r.n} · ${BASE_TITLE}`;
  return BASE_TITLE;
}

/** Met à jour l'adresse sans recharger (les paramètres de débogage comme ?q= sont conservés). */
export function navigate(r: Route, title: string, replace = false) {
  const url = routePath(r) + location.search;
  if (location.pathname + location.search !== url) (replace ? history.replaceState : history.pushState).call(history, { route: r }, '', url);
  document.title = title;
}

export function currentRoute(): Route { return parseRoute(location.pathname); }
