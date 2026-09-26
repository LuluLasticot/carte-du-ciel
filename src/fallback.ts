// Page de repli : l'appareil ne sait pas afficher la scène 3D (WebGL 2 absent ou désactivé).
// On présente quand même la Série I, avec les images pré-rendues des planches.
import { pad2 } from './core/util';
import { CARDS, TIERS } from './data/catalog';
import { collection, loadCollection, ownedCount } from './store/collection';

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!); }

export async function showFallback(reason: string) {
  document.documentElement.classList.add('is-fallback');
  document.getElementById('loader')?.classList.add('off');
  await loadCollection().catch(() => null);
  const owned = ownedCount(collection);
  const items = CARDS.map((c, i) => {
    const T = TIERS[c.tier], has = !!collection.cards[c.n];
    return `<li class="fb-card${has ? ' has' : ''}" style="--tc:${T.css}">
      <img src="/plates/${pad2(c.n)}.webp" alt="${esc(c.name)}, planche ${c.n} : ${esc(c.type)}" width="500" height="700" loading="${i < 12 ? 'eager' : 'lazy'}" decoding="async">
      <div class="fb-cap"><span class="fb-n">${pad2(c.n)}</span><b>${esc(c.name)}</b><span class="fb-t">${T.name} · ${T.finish}</span>${has ? '<span class="fb-own">Dans votre collection</span>' : ''}</div>
    </li>`;
  }).join('');
  const page = document.createElement('main');
  page.className = 'fallback';
  page.innerHTML = `
    <header class="fb-head">
      <div class="brand"><b>Carte du Ciel</b><span>Série I · 32 planches</span></div>
      ${owned ? `<span class="count">Collection<br><em>${pad2(owned)}</em>/32</span>` : ''}
    </header>
    <section class="fb-msg" aria-labelledby="fbTitle">
      <h1 id="fbTitle">La pochette ne peut pas s’ouvrir sur cet appareil</h1>
      <p>L’ouverture en 3D a besoin de WebGL 2, que ce navigateur ne propose pas ou a désactivé. Essayez une version récente de Chrome, Safari, Firefox ou Edge, ou activez l’accélération matérielle dans les réglages du navigateur.</p>
      <p>En attendant, voici les 32 planches de la Série I.</p>
      <p class="fb-why">Détail technique : ${esc(reason)}.</p>
    </section>
    <ul class="fb-grid">${items}</ul>`;
  document.body.appendChild(page);
}
