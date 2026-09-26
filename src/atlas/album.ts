// Album : les 32 planches de la Série I, les doublons et la création de planches manquantes.
import { $ } from '../core/dom';
import { pad2 } from '../core/util';
import { CARDS, CONS, TIERS } from '../data/catalog';
import { CRAFT_COST, convertDuplicates, duplicatesValue } from '../data/economy';
import { craftPlate, focusPlate, refreshAtlasUI, setAlbumRenderer, showAlbum } from '../flow/atlas-flow';
import { collection, commit, ownedCount } from '../store/collection';
import { UI } from '../ui/ui';

const el = { grid: $('albumGrid'), counts: $('albumCounts'), dust: $('albumDust'), convert: $('convertBtn') as HTMLButtonElement, note: $('albumNote') };
let armed = 0, armTimer = 0, fresh = 0;

function tile(n: number): string {
  const d = CARDS[n - 1], T = TIERS[d.tier], count = collection.cards[n] || 0;
  if (count) {
    return `<li class="tile owned${fresh === n ? ' fresh' : ''}" style="--tc:${T.css}">
      <button type="button" data-open="${n}" aria-label="${d.name}, planche ${n}, ${T.name.toLowerCase()} : voir dans l'Atlas">
        <img src="/plates/${pad2(n)}.webp" alt="" width="500" height="700" loading="lazy" decoding="async">
        <b>${d.name}</b><span class="t-r">${pad2(n)} · ${T.name}</span>
      </button>${count > 1 ? `<span class="t-dup" title="${count - 1} doublon${count > 2 ? 's' : ''}">×${count}</span>` : ''}
    </li>`;
  }
  const cost = CRAFT_COST[d.tier], can = collection.dust >= cost;
  return `<li class="tile missing" style="--tc:${T.css}">
    <button type="button" data-open="${n}" aria-label="Planche ${n}, ${T.name.toLowerCase()}, à découvrir">
      <span class="sil"><i aria-hidden="true">?</i><em>${pad2(n)}</em></span>
      <b>À découvrir</b><span class="t-r">${T.name} · ${d.con ? CONS[d.con].name : 'Système solaire'}</span>
    </button>
    <button type="button" class="craft${armed === n ? ' armed' : ''}" data-craft="${n}" ${can ? '' : 'disabled'} aria-label="Créer la planche ${n} pour ${cost} poussières d'étoiles">
      ${armed === n ? `Confirmer · ${cost} ✦` : `Créer · ${cost} ✦`}
    </button>
  </li>`;
}

export function renderAlbum() {
  const byTier = TIERS.map((T, t) => {
    const all = CARDS.filter((c) => c.tier === t);
    return `${T.name}s ${all.filter((c) => collection.cards[c.n]).length}/${all.length}`;
  });
  el.counts.textContent = `${ownedCount(collection)} / 32 · ${byTier.join(' · ')}`;
  el.dust.textContent = String(collection.dust);
  const dup = duplicatesValue(collection);
  el.convert.disabled = dup.copies === 0;
  el.convert.textContent = dup.copies ? `Convertir ${dup.copies} doublon${dup.copies > 1 ? 's' : ''} (+${dup.dust} ✦)` : 'Aucun doublon à convertir';
  el.grid.innerHTML = CARDS.map((c) => tile(c.n)).join('');
  fresh = 0;
}

function convert() {
  const r = convertDuplicates(collection);
  if (!r.copies) return;
  void commit(r.state);
  UI.toast(`${r.copies} doublon${r.copies > 1 ? 's' : ''} converti${r.copies > 1 ? 's' : ''}`, `+${r.gained} poussières d'étoiles`);
  refreshAtlasUI();
  renderAlbum();
}

export function initAlbum() {
  setAlbumRenderer(renderAlbum);
  el.convert.addEventListener('click', convert);
  el.grid.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const craftBtn = t.closest<HTMLButtonElement>('[data-craft]');
    if (craftBtn) {
      const n = +craftBtn.dataset.craft!;
      if (armed !== n) {
        armed = n; clearTimeout(armTimer);
        armTimer = window.setTimeout(() => { armed = 0; renderAlbum(); }, 4000);
        renderAlbum();
        (el.grid.querySelector(`[data-craft="${n}"]`) as HTMLButtonElement | null)?.focus();
        return;
      }
      armed = 0; clearTimeout(armTimer);
      fresh = n;
      void craftPlate(n);
      return;
    }
    const open = t.closest<HTMLButtonElement>('[data-open]');
    if (open) { showAlbum(false); void focusPlate(+open.dataset.open!); }
  });
}
