// ---------------------------------------------------------------------------
// Interface HTML superposée
// ---------------------------------------------------------------------------

import { D2R } from '../cards/textures';
import { $ } from '../core/dom';
import { pad2 } from '../core/util';
import { PACKS, TIERS } from '../data/catalog';

export const UI = {
  top: $('top'), cinfo: $('cinfo'), hintEl: $('hint'), packs: $('packs'), odds: $('odds'), hero: $('hero'),
  heroT: $('heroT'), heroN: $('heroN'), heroS: $('heroS'), sum: $('sum'), insp: $('insp'), loader: $('loader'),
  woC: $('woC'), woCName: $('woCName'), woT: $('woT'), woCoord: $('woCoord'), woType: $('woType'), woD: $('woD'), woDig: $('woDig'),
  woUnit: $('woUnit'), woRet: $('woRet'), woSkip: $('woSkip'), count: $('count'), snd: $('snd'),
  /** Annonce brève (récompense), empilée sous la barre du haut. */
  toast(title: string, detail: string, delay = 0) {
    setTimeout(() => {
      const box = $('toasts');
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = `<i class="dust" aria-hidden="true">✦</i><div><b></b><span></span></div>`;
      t.querySelector('b')!.textContent = title;
      t.querySelector('span')!.textContent = detail;
      box.appendChild(t);
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
      setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 700); }, 4200);
    }, delay);
  },
  show(el, on) { el.classList.toggle('on', !!on); if (on) el.classList.remove('out'); },
  out(el) { el.classList.add('out'); el.classList.remove('on'); },
  hint(text) {
    if (!text) { this.show(this.hintEl, false); return; }
    if (this.hintEl.textContent !== text) this.hintEl.textContent = text;
    this.show(this.hintEl, true);
  },
  setTier(t) { document.documentElement.style.setProperty('--tier', TIERS[t].css); },
  setCount(n) { this.count.innerHTML = `Collection<br><em>${pad2(n)}</em>/32`; },
  setOdds(type) {
    const p = PACKS[type].last;
    const parts = p.map((x, i) => (x ? `${TIERS[i].name} ${Math.round(x * 100)} %` : null)).filter(Boolean);
    this.odds.textContent = `5ᵉ planche · ${parts.join(' · ')}`;
    for (const b of this.packs.querySelectorAll('button')) b.setAttribute('aria-checked', String(+b.dataset.pack === type));
  },
  cardInfo(card, idx, isNew) {
    const T = TIERS[card.tier];
    this.setTier(card.tier);
    this.cinfo.innerHTML = `<span class="num">${idx + 1} / 5</span><span class="chip">${T.name} · ${T.finish}</span>${isNew ? '<span class="new">Nouvelle</span>' : ''}`;
    this.show(this.cinfo, true);
  },
  buildReticle() {
    let s = '<circle r="88" fill="none" stroke="currentColor" stroke-width=".8"/><circle r="74" fill="none" stroke="currentColor" stroke-width=".45" stroke-dasharray="1 3.2"/>';
    for (let i = 0; i < 72; i++) {
      const a = i * 5 * D2R, main = i % 6 === 0, l = main ? 8 : 4;
      s += `<line x1="${(Math.sin(a) * 88).toFixed(2)}" y1="${(-Math.cos(a) * 88).toFixed(2)}" x2="${(Math.sin(a) * (88 - l)).toFixed(2)}" y2="${(-Math.cos(a) * (88 - l)).toFixed(2)}" stroke="currentColor" stroke-width="${main ? 0.9 : 0.5}"/>`;
    }
    s += '<path d="M0 -60V-14M0 14V60M-60 0H-14M14 0H60" stroke="currentColor" stroke-width=".7"/>';
    s += '<path d="M-6 -6L6 6M6 -6L-6 6" stroke="currentColor" stroke-width=".5" opacity=".6"/>';
    s += '<text id="woRetA" x="0" y="-95" text-anchor="middle"></text><text id="woRetB" x="0" y="101" text-anchor="middle"></text>';
    this.woRet.innerHTML = s;
  },
  setDigits(str) {
    this.woDig.innerHTML = '';
    const cols = [];
    let k = 0;
    for (const ch of str) {
      if (ch === ' ') { const sp = document.createElement('span'); sp.className = 'sep'; this.woDig.appendChild(sp); continue; }
      const d = document.createElement('span'); d.className = 'digit';
      const col = document.createElement('span'); col.className = 'col';
      const n = 12 + k * 3;
      let html = '';
      for (let i = 0; i < n; i++) html += `<span>${Math.floor(Math.random() * 10)}</span>`;
      col.innerHTML = html + `<span>${ch}</span>`;
      d.appendChild(col); this.woDig.appendChild(d);
      cols.push({ col, n });
      k++;
    }
    return cols;
  },
  rollDigits(cols, dur) {
    cols.forEach((c, i) => {
      c.col.style.transition = `transform ${(dur + i * 0.09).toFixed(2)}s cubic-bezier(.12,.62,.08,1)`;
      c.col.style.transform = `translateY(-${c.n}em)`;
    });
  },
  inspectFill(card) {
    const d = card.data, T = TIERS[d.tier];
    this.setTier(d.tier);
    $('inspT').textContent = `${T.name} · ${T.finish} · Planche\u00A0${pad2(d.n)}`;
    $('inspN').textContent = d.name;
    $('inspTy').textContent = `${d.type} · ${d.sub}`;
    $('inspD').textContent = d.desc;
    const rows = [
      ['Magnitude', d.mag === '∞' ? '∞ (aucune lumière ne s’échappe)' : d.mag],
      [d.s[0][0], `${d.s[0][1]} ${d.s[0][2]}`.trim()],
      [d.s[1][0], `${d.s[1][1]} ${d.s[1][2]}`.trim()],
      ['Découverte', d.d[1] ? `${d.d[0]} · ${d.d[1]}` : d.d[0]],
      ['Catalogue', d.l1],
      [d.ra != null ? 'Position' : 'Orbite', d.l2],
    ];
    $('inspDl').innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  },
};
UI.buildReticle();
