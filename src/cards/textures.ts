// ---------------------------------------------------------------------------
// Textures dessinées : faces des planches, masques de dorure, dos, pochettes
// ---------------------------------------------------------------------------

import { TAU, pad2, rng } from '../core/util';
import { CONS, PACKS, TIERS } from '../data/catalog';

export const SERIF = '"Bodoni Moda", "Bodoni 72", Didot, "Bodoni MT", "Times New Roman", serif';
export const MONO = '"Martian Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
export const CW = 1000, CH = 1400;
export const AC = { x: 500, y: 532, r: 322 };      // oculaire (fenêtre de l'image)
export const RING0 = 330, RING1 = 352;
export const D2R = Math.PI / 180;

/** Canvas 2D : élément HTML sur le fil principal, OffscreenCanvas dans un Worker. */
export function mkCanvas(w, h): any {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
export function rrPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
// les déliés du Bodoni disparaissent à petite taille : on épaissit légèrement chaque glyphe
export function fontPx(c) { const m = /(\d+(?:\.\d+)?)px/.exec(c.font); return m ? +m[1] : 20; }
export function sText(c, text, x, y, k = 0.032) {
  c.fillText(text, x, y);
  const w = fontPx(c) * k;
  if (w > 0.25) { c.lineWidth = w; c.strokeStyle = c.fillStyle; c.lineJoin = 'round'; c.strokeText(text, x, y); }
}
export function measureSp(c, text, sp) { let w = 0; const ch = [...text]; for (const k of ch) w += c.measureText(k).width; return w + sp * Math.max(0, ch.length - 1); }
export function textSp(c, text, x, y, sp, align = 'left', k = 0) {
  const ch = [...text];
  const total = measureSp(c, text, sp);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const a = c.textAlign; c.textAlign = 'left';
  for (const g of ch) { if (k) sText(c, g, cx, y, k); else c.fillText(g, cx, y); cx += c.measureText(g).width + sp; }
  c.textAlign = a;
  return total;
}
export function fitSize(c, text, style, fam, maxSize, maxW, spEm = 0, minSize = 10) {
  let s = maxSize;
  while (s > minSize) { c.font = `${style} ${s}px ${fam}`; if (measureSp(c, text, spEm * s) <= maxW) break; s -= 1; }
  c.font = `${style} ${s}px ${fam}`;
  return s;
}
export function star4(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.closePath();
}
export function annulus(c, x, y, r0, r1) { c.beginPath(); c.arc(x, y, r1, 0, TAU); c.arc(x, y, r0, 0, TAU, true); c.closePath(); }

// ensemble de calques : couleur, dorure (R), motif (G), fenêtre (B)
export class Layers {
  declare H: any;
  declare W: any;
  declare c: any;
  declare col: any;
  declare f: any;
  declare foil: any;
  declare p: any;
  declare pat: any;
  declare s: any;
  declare w: any;
  declare win: any;
  constructor(W, H, s) {
    this.W = W; this.H = H; this.s = s;
    this.col = mkCanvas(W, H); this.foil = mkCanvas(W, H); this.pat = mkCanvas(W, H); this.win = mkCanvas(W, H);
    this.c = this.col.getContext('2d'); this.f = this.foil.getContext('2d'); this.p = this.pat.getContext('2d'); this.w = this.win.getContext('2d');
    for (const x of [this.c, this.f, this.p, this.w]) { x.setTransform(s, 0, 0, s, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round'; x.textBaseline = 'alphabetic'; }
    for (const x of [this.f, this.p, this.w]) { x.fillStyle = '#000'; x.fillRect(0, 0, W / s, H / s); }
  }
  // dessine sur la couleur, et en blanc sur les masques demandés
  draw(fn, color, { foil = false, pat = false, maskAlpha = 1 } = {}) {
    fn(this.c, color);
    if (foil) { this.f.globalAlpha = maskAlpha; fn(this.f, '#fff'); this.f.globalAlpha = 1; }
    if (pat) { this.p.globalAlpha = maskAlpha; fn(this.p, '#fff'); this.p.globalAlpha = 1; }
  }
  maskTexture() {
    const W = this.W, H = this.H;
    const out = new ImageData(W, H);
    const a = this.f.getImageData(0, 0, W, H).data, b = this.p.getImageData(0, 0, W, H).data, c = this.w.getImageData(0, 0, W, H).data;
    const o = out.data;
    for (let i = 0; i < o.length; i += 4) { o[i] = a[i]; o[i + 1] = b[i]; o[i + 2] = c[i]; o[i + 3] = 255; }
    const cv = mkCanvas(W, H); cv.getContext('2d').putImageData(out, 0, 0);
    return cv;
  }
}

export const CARD_PAL = [
  { bg: '#E7D8B6', hi: '#EEE2C6', plate: '#DFCEA9', foil: '#24222E', text: '#1D1B26', text2: 'rgba(36,34,46,.76)', soft: 'rgba(36,34,46,.48)', faint: 'rgba(36,34,46,.14)', ret: 'rgba(36,34,46,.8)', tier: '#24222E', cut: '#E7D8B6' },
  { bg: '#0D1118', hi: '#182031', plate: '#090C12', foil: '#E6ECF4', text: '#EEF2F7', text2: 'rgba(226,232,240,.68)', soft: 'rgba(226,232,240,.42)', faint: 'rgba(210,222,240,.1)', ret: 'rgba(235,240,248,.6)', tier: '#DCE6F4', cut: '#0D1118' },
  { bg: '#0A0A12', hi: '#161629', plate: '#07070D', foil: '#FFFFFF', text: '#F2F0FA', text2: 'rgba(236,232,250,.68)', soft: 'rgba(236,232,250,.42)', faint: 'rgba(210,220,255,.1)', ret: 'rgba(240,240,255,.6)', tier: '#A6F7E8', cut: '#0A0A12' },
  { bg: '#0E0B07', hi: '#1D160B', plate: '#090704', foil: '#FFE7B0', text: '#F7ECD3', text2: 'rgba(247,236,211,.68)', soft: 'rgba(240,210,150,.44)', faint: 'rgba(240,200,120,.1)', ret: 'rgba(255,236,200,.6)', tier: '#F3C66E', cut: '#0E0B07' },
  { bg: '#050507', hi: '#0F0D18', plate: '#040406', foil: '#FFFFFF', text: '#F6F3FF', text2: 'rgba(240,236,255,.68)', soft: 'rgba(240,236,255,.42)', faint: 'rgba(230,225,255,.09)', ret: 'rgba(245,240,255,.65)', tier: '#FFFFFF', cut: '#050507' },
];

export function projectStars(stars, ra0, dec0) {
  const a0 = ra0 * 15 * D2R, d0 = dec0 * D2R;
  return stars.map(([ra, dec]) => {
    const a = ra * 15 * D2R, d = dec * D2R;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
    const x = Math.cos(d) * Math.sin(a - a0) / cosc;
    const y = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
    return [-x, y];
  });
}
export function conCenter(stars) {
  let x = 0, y = 0, z = 0;
  for (const [ra, dec] of stars) { const a = ra * 15 * D2R, d = dec * D2R; x += Math.cos(d) * Math.cos(a); y += Math.cos(d) * Math.sin(a); z += Math.sin(d); }
  const l = Math.hypot(x, y, z);
  const dec = Math.asin(z / l) / D2R;
  let ra = Math.atan2(y, x) / D2R / 15; if (ra < 0) ra += 24;
  return [ra, dec];
}
// constellation (ou système solaire) dans une boîte
export function drawGlyph(L, card, x, y, w, h, P, foil) {
  if (!card.con) {
    const cx = x + w * 0.5, cy = y + h * 0.5;
    L.draw((c, col) => {
      c.strokeStyle = col; c.lineWidth = 1.5;
      for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(cx, cy, 12 + k * 17, (12 + k * 17) * 0.4, -0.3, 0, TAU); c.stroke(); }
      c.fillStyle = col; c.beginPath(); c.arc(cx, cy, 5.5, 0, TAU); c.fill();
      const a = -0.9, rr = 12 + 2 * 17;
      c.beginPath(); c.arc(cx + Math.cos(a) * rr * Math.cos(-0.3) - Math.sin(a) * rr * 0.4 * Math.sin(-0.3), cy + Math.cos(a) * rr * Math.sin(-0.3) + Math.sin(a) * rr * 0.4 * Math.cos(-0.3), 4, 0, TAU); c.fill();
    }, P.foil, { foil });
    return;
  }
  const C = CONS[card.con];
  const [ra0, dec0] = conCenter(C.s);
  const pts = projectStars(C.s, ra0, dec0);
  const tp = card.ra != null ? projectStars([[card.ra, card.dec]], ra0, dec0)[0] : null;
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const [px, py] of pts.concat(tp ? [tp] : [])) { mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mny = Math.min(mny, py); mxy = Math.max(mxy, py); }
  const sc = Math.min((w - 12) / Math.max(mxx - mnx, 1e-3), (h - 12) / Math.max(mxy - mny, 1e-3));
  const ox = x + w / 2 - (mnx + mxx) / 2 * sc, oy = y + h / 2 + (mny + mxy) / 2 * sc;
  const P2 = (p) => [ox + p[0] * sc, oy - p[1] * sc];
  L.draw((c, col) => {
    c.strokeStyle = col; c.globalAlpha *= 0.7; c.lineWidth = 1.3;
    for (const [i, j] of C.l) { const a = P2(pts[i]), b = P2(pts[j]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    c.globalAlpha /= 0.7;
    c.fillStyle = col;
    C.s.forEach((s, i) => { const p = P2(pts[i]); c.beginPath(); c.arc(p[0], p[1], Math.max(1.6, 4.3 - s[2] * 0.62), 0, TAU); c.fill(); });
  }, P.foil, { foil });
  if (tp) {
    const p = P2(tp);
    L.draw((c, col) => { c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.arc(p[0], p[1], 6.5, 0, TAU); c.stroke(); }, P.foil, { foil });
  }
}

export function drawCardFace(card, scale) {
  const W = Math.round(CW * scale), H = Math.round(CH * scale);
  const L = new Layers(W, H, scale);
  const t = card.tier, P = CARD_PAL[t], F = t > 0;
  const c = L.c;
  const rnd = rng(card.n * 7919 + 13);

  // fond
  c.fillStyle = P.bg; c.fillRect(0, 0, CW, CH);
  const g = c.createRadialGradient(AC.x, AC.y, 120, AC.x, AC.y + 80, 900);
  g.addColorStop(0, P.hi); g.addColorStop(1, P.bg);
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);

  // carte céleste gravée en fond (cercles de déclinaison, heures d'ascension droite)
  for (const x of [L.c, L.p]) { x.save(); rrPath(x, 40, 40, CW - 80, CH - 80, 22); x.clip(); }
  L.draw((x, col) => {
    x.strokeStyle = col; x.lineWidth = 1.3;
    for (let r = 392; r < 1150; r += 58) { x.beginPath(); x.arc(AC.x, AC.y, r, 0, TAU); x.stroke(); }
    for (let a = 0; a < 360; a += 15) {
      const ca = Math.cos(a * D2R), sa = Math.sin(a * D2R);
      x.beginPath(); x.moveTo(AC.x + ca * 364, AC.y + sa * 364); x.lineTo(AC.x + ca * 1300, AC.y + sa * 1300); x.stroke();
    }
    x.setLineDash([2, 9]); x.lineWidth = 1.6;
    x.beginPath(); x.arc(AC.x, AC.y, 421, 0, TAU); x.stroke();
    x.setLineDash([]);
  }, P.faint, { pat: F });
  const dots = [];
  for (let i = 0; i < 70; i++) {
    const px = 50 + rnd() * 900, py = 50 + rnd() * 880;
    if (Math.hypot(px - AC.x, py - AC.y) < 372) continue;
    dots.push([px, py, 0.8 + rnd() * rnd() * 3]);
  }
  L.draw((x, col) => { x.fillStyle = col; for (const [px, py, r] of dots) { x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); } }, P.soft, { pat: F });
  for (const x of [L.c, L.p]) x.restore();

  // cadres
  L.draw((x, col) => {
    x.strokeStyle = col;
    x.lineWidth = 6; rrPath(x, 24, 24, CW - 48, CH - 48, 34); x.stroke();
    x.lineWidth = 1.6; rrPath(x, 40, 40, CW - 80, CH - 80, 22); x.stroke();
    x.fillStyle = col;
    for (const [px, py] of [[62, 62], [CW - 62, 62], [62, CH - 62], [CW - 62, CH - 62]]) { star4(x, px, py, 11); x.fill(); }
  }, P.foil, { foil: true });

  // oculaire : on perce la fenêtre de l'image
  c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(AC.x, AC.y, AC.r, 0, TAU); c.fill(); c.restore();
  L.w.fillStyle = '#fff'; L.w.beginPath(); L.w.arc(AC.x, AC.y, AC.r, 0, TAU); L.w.fill();

  // cercle gradué
  L.draw((x, col) => { x.fillStyle = col; annulus(x, AC.x, AC.y, RING0, RING1); x.fill('evenodd'); x.lineWidth = 2; x.strokeStyle = col; x.beginPath(); x.arc(AC.x, AC.y, AC.r + 3, 0, TAU); x.stroke(); }, P.foil, { foil: true });
  const ticks = (x, col) => {
    x.strokeStyle = col;
    for (let i = 0; i < 180; i++) {
      const a = i * 2 * D2R, long = i % 5 === 0, big = i % 45 === 0;
      const len = big ? 19 : long ? 13 : 7;
      x.lineWidth = big ? 3 : long ? 2.2 : 1.4;
      const ca = Math.sin(a), sa = -Math.cos(a);
      x.beginPath(); x.moveTo(AC.x + ca * (RING1 + 1), AC.y + sa * (RING1 + 1)); x.lineTo(AC.x + ca * (RING1 - len), AC.y + sa * (RING1 - len)); x.stroke();
    }
  };
  ticks(L.c, P.cut); ticks(L.f, '#000');
  // points cardinaux (le ciel se lit avec l'est à gauche)
  L.c.fillStyle = P.text2; L.c.font = `500 17px ${MONO}`; L.c.textAlign = 'center';
  ([['N', 0], ['O', 90], ['S', 180], ['E', 270]] as [string, number][]).forEach(([k, a]) => {
    const ca = Math.sin(a * D2R), sa = -Math.cos(a * D2R);
    L.c.fillText(k, AC.x + ca * 374, AC.y + sa * 374 + 6);
  });
  // repères du réticule, par-dessus l'image
  c.strokeStyle = P.ret;
  for (let i = 0; i < 12; i++) {
    const a = i * 30 * D2R, main = i % 3 === 0;
    const r0 = AC.r - 1, r1 = AC.r - (main ? 34 : 13);
    c.lineWidth = main ? 2.2 : 1.4;
    c.beginPath(); c.moveTo(AC.x + Math.sin(a) * r0, AC.y - Math.cos(a) * r0); c.lineTo(AC.x + Math.sin(a) * r1, AC.y - Math.cos(a) * r1); c.stroke();
  }

  // colonne de gauche : magnitude, type, constellation
  c.textAlign = 'left';
  fitSize(c, card.mag, 'italic 700', SERIF, 84, 196);
  L.draw((x, col) => { x.font = c.font; x.fillStyle = col; x.textAlign = 'left'; sText(x, card.mag, 64, 150, 0.04); }, P.foil, { foil: true });
  c.font = `500 16px ${MONO}`; c.fillStyle = P.text2; textSp(c, 'MAG', 67, 184, 3.6);
  L.draw((x, col) => { x.fillStyle = col; x.fillRect(66, 200, 56, 2.4); }, P.foil, { foil: true });
  c.font = `700 34px ${SERIF}`; c.fillStyle = P.text; sText(c, card.code, 64, 244, 0.03);
  drawGlyph(L, card, 60, 266, 126, 74, P, true);

  // colonne de droite : numéro de planche
  c.textAlign = 'right';
  c.font = `500 16px ${MONO}`; c.fillStyle = P.text2; textSp(c, 'PLANCHE', 936, 114, 3.2, 'right');
  L.draw((x, col) => { x.font = `italic 700 70px ${SERIF}`; x.fillStyle = col; x.textAlign = 'right'; sText(x, pad2(card.n), 938, 182, 0.035); }, P.foil, { foil: true });
  c.font = `500 16px ${MONO}`; c.fillStyle = P.text2; textSp(c, 'SUR 32', 936, 214, 3.2, 'right');

  // cartouche
  c.fillStyle = P.plate; rrPath(c, 70, 928, 860, 370, 18); c.fill();
  L.draw((x, col) => { x.strokeStyle = col; x.lineWidth = 1.6; rrPath(x, 70, 928, 860, 370, 18); x.stroke(); x.lineWidth = 1; rrPath(x, 78, 936, 844, 354, 13); x.stroke(); }, t === 0 ? P.soft : P.foil, { foil: F, maskAlpha: 0.8 });

  // nom
  c.textAlign = 'center';
  fitSize(c, card.name, '600', SERIF, 70, 780);
  L.draw((x, col) => { x.font = c.font; x.fillStyle = col; x.textAlign = 'center'; sText(x, card.name, 500, 1002, 0.03); }, t === 3 ? P.foil : P.text, { foil: t === 3 });
  fitSize(c, `${card.type} · ${card.sub}`, 'italic 400', SERIF, 29, 780);
  c.fillStyle = P.text2; sText(c, `${card.type} · ${card.sub}`, 500, 1044, 0.03);
  L.draw((x, col) => {
    x.strokeStyle = col; x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(150, 1070); x.lineTo(476, 1070); x.moveTo(524, 1070); x.lineTo(850, 1070); x.stroke();
    x.fillStyle = col; star4(x, 500, 1070, 9); x.fill();
  }, t === 0 ? P.soft : P.foil, { foil: F });

  // données
  const cols = [216, 500, 784];
  c.strokeStyle = P.faint; c.lineWidth = 1.5;
  for (const sx of [358, 642]) { c.beginPath(); c.moveTo(sx, 1090); c.lineTo(sx, 1192); c.stroke(); }
  const stats = [card.s[0], card.s[1], ['Découverte', card.d[0], '']];
  stats.forEach(([lab, val, unit], i) => {
    const x = cols[i];
    c.fillStyle = P.text2; c.font = `500 15px ${MONO}`; textSp(c, lab.toUpperCase(), x, 1108, 3, 'center');
    if (i === 2) {
      const txt = val;
      const isYear = /^\d+$/.test(txt);
      fitSize(c, txt, isYear ? '700' : 'italic 500', SERIF, isYear ? 44 : 34, 236);
      c.fillStyle = P.text; c.textAlign = 'center'; sText(c, txt, x, 1158, 0.034);
      if (card.d[1]) { fitSize(c, card.d[1], '400', MONO, 15, 244); c.fillStyle = P.text2; c.fillText(card.d[1], x, 1188); }
    } else {
      c.font = `500 17px ${MONO}`;
      const uw = unit ? c.measureText(unit).width + 9 : 0;
      const vs = fitSize(c, val, '700', SERIF, 44, 244 - uw);
      const vw = c.measureText(val).width;
      const x0 = x - (vw + uw) / 2;
      c.fillStyle = P.text; c.textAlign = 'left'; sText(c, val, x0, 1158, 0.036);
      if (unit) { c.font = `500 17px ${MONO}`; c.fillStyle = P.text2; c.fillText(unit, x0 + vw + 9, 1158); }
      c.textAlign = 'center';
      void vs;
    }
  });
  // lignes de catalogue / coordonnées
  c.textAlign = 'center'; c.fillStyle = P.text2;
  fitSize(c, card.l1, '500', MONO, 17, 790); c.fillText(card.l1, 500, 1238);
  fitSize(c, card.l2, '400', MONO, 16, 790); c.fillText(card.l2, 500, 1270);

  // pied : collection, rareté, pastilles
  c.font = `500 13px ${MONO}`; c.fillStyle = P.text2; textSp(c, 'CARTE DU CIEL', 72, 1338, 2.6, 'left');
  c.font = `600 13px ${MONO}`; c.fillStyle = P.tier; textSp(c, TIERS[t].name.toUpperCase(), 928, 1338, 2.6, 'right');
  for (let k = 0; k < 5; k++) {
    const px = 500 + (k - 2) * 25, py = 1333;
    if (k <= t) L.draw((x, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(px, py - 8); x.lineTo(px + 6, py); x.lineTo(px, py + 8); x.lineTo(px - 6, py); x.closePath(); x.fill(); }, P.foil, { foil: true });
    else { c.strokeStyle = P.soft; c.lineWidth = 1.3; c.beginPath(); c.moveTo(px, py - 7); c.lineTo(px + 5, py); c.lineTo(px, py + 7); c.lineTo(px - 5, py); c.closePath(); c.stroke(); }
  }
  return { color: L.col, mask: L.maskTexture() };
}

// dos commun à toutes les planches : guillochis doré
export function drawCardBack(scale) {
  const W = Math.round(CW * scale), H = Math.round(CH * scale);
  const L = new Layers(W, H, scale);
  const c = L.c;
  c.fillStyle = '#0A1022'; c.fillRect(0, 0, CW, CH);
  const g = c.createRadialGradient(500, 700, 60, 500, 700, 820);
  g.addColorStop(0, '#16213F'); g.addColorStop(1, '#070B18');
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  for (const x of [L.c, L.f, L.p]) { x.save(); rrPath(x, 40, 40, CW - 80, CH - 80, 22); x.clip(); }
  const rose = (x, col, alpha, R0, A1, n1, A2, n2, ys, count) => {
    x.strokeStyle = col; x.globalAlpha = alpha; x.lineWidth = 1;
    for (let k = 0; k < count; k++) {
      const ph = k / count * TAU;
      x.beginPath();
      for (let i = 0; i <= 900; i++) {
        const th = i / 900 * TAU;
        const r = R0 + A1 * Math.sin(n1 * th + ph) + A2 * Math.sin(n2 * th - ph * 2);
        const px = 500 + r * Math.cos(th), py = 700 + r * Math.sin(th) * ys;
        if (i) x.lineTo(px, py); else x.moveTo(px, py);
      }
      x.stroke();
    }
    x.globalAlpha = 1;
  };
  rose(L.c, '#D9B26A', 0.26, 300, 36, 8, 15, 21, 1.0, 64);
  rose(L.p, '#fff', 0.5, 300, 36, 8, 15, 21, 1.0, 64);
  rose(L.c, '#D9B26A', 0.18, 470, 30, 12, 12, 31, 1.34, 48);
  rose(L.p, '#fff', 0.4, 470, 30, 12, 12, 31, 1.34, 48);
  for (const x of [L.c, L.f, L.p]) x.restore();
  // médaillon central
  c.fillStyle = '#0A1022'; c.beginPath(); c.arc(500, 700, 196, 0, TAU); c.fill();
  L.draw((x, col) => {
    x.fillStyle = col; annulus(x, 500, 700, 178, 196); x.fill('evenodd');
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.arc(500, 700, 170, 0, TAU); x.stroke();
    x.lineWidth = 1.4; x.beginPath(); x.arc(500, 700, 120, 0, TAU); x.stroke();
    x.fillStyle = col;
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8, r = k % 2 === 0 ? 108 : 64;
      x.beginPath(); x.moveTo(500, 700);
      x.lineTo(500 + Math.cos(a - 0.12) * r * 0.28, 700 + Math.sin(a - 0.12) * r * 0.28);
      x.lineTo(500 + Math.cos(a) * r, 700 + Math.sin(a) * r);
      x.lineTo(500 + Math.cos(a + 0.12) * r * 0.28, 700 + Math.sin(a + 0.12) * r * 0.28);
      x.closePath(); x.fill();
    }
    x.beginPath(); x.arc(500, 700, 9, 0, TAU); x.fill();
    x.lineWidth = 6; rrPath(x, 24, 24, CW - 48, CH - 48, 34); x.stroke();
    x.lineWidth = 1.6; rrPath(x, 40, 40, CW - 80, CH - 80, 22); x.stroke();
    for (const [px, py] of [[62, 62], [CW - 62, 62], [62, CH - 62], [CW - 62, CH - 62]]) { star4(x, px, py, 11); x.fill(); }
  }, '#E2BD71', { foil: true });
  const cut = (x, col) => {
    x.strokeStyle = col;
    for (let i = 0; i < 120; i++) { const a = i * 3 * D2R; const len = i % 10 === 0 ? 12 : 6; x.lineWidth = i % 10 === 0 ? 2.2 : 1.2; x.beginPath(); x.moveTo(500 + Math.sin(a) * 197, 700 - Math.cos(a) * 197); x.lineTo(500 + Math.sin(a) * (197 - len), 700 - Math.cos(a) * (197 - len)); x.stroke(); }
  };
  cut(L.c, '#0A1022'); cut(L.f, '#000');
  // texte circulaire
  const arcText = (text, r, center, up) => {
    L.draw((x, col) => {
      x.font = `600 25px ${MONO}`; x.fillStyle = col; x.textAlign = 'center';
      const sp = 7; const chars = [...text];
      const ws = chars.map((k) => x.measureText(k).width + sp);
      const tot = ws.reduce((a, b) => a + b, 0);
      let a = center - (up ? 1 : -1) * tot / 2 / r;
      chars.forEach((k, i) => {
        const aa = a + (up ? 1 : -1) * ws[i] / 2 / r;
        x.save(); x.translate(500 + Math.sin(aa) * r, 700 - Math.cos(aa) * r * (up ? 1 : 1)); x.rotate(up ? aa : aa + Math.PI);
        x.fillText(k, 0, up ? 0 : 0); x.restore();
        a += (up ? 1 : -1) * ws[i] / r;
      });
    }, '#E2BD71', { foil: true });
  };
  arcText('CARTE DU CIEL', 232, 0, true);
  arcText('SÉRIE I · 32 PLANCHES', 250, Math.PI, false);
  return { color: L.col, mask: L.maskTexture() };
}

// ------------------------------- pochettes -------------------------------
export const PACK_PAL = [
  { bg0: '#1B2A57', bg1: '#070B1D', ink: '#C9D3E6', ink2: 'rgba(201,211,230,.62)', foil: '#EEF2FA', name: 'STANDARD' },
  { bg0: '#33240C', bg1: '#0B0703', ink: '#EBCB86', ink2: 'rgba(235,203,134,.62)', foil: '#FFE2A0', name: 'DORÉE' },
  { bg0: '#17131F', bg1: '#030305', ink: '#E9E4FA', ink2: 'rgba(233,228,250,.6)', foil: '#FFFFFF', name: 'SINGULARITÉ' },
];
export const PKW = 1024, PKH = 1678;
export const TEAR_V = 0.885;   // ligne de découpe (depuis le bas)

export function packBase(L, P, back) {
  const c = L.c;
  const g = c.createLinearGradient(0, 0, 0, PKH);
  g.addColorStop(0, P.bg0); g.addColorStop(1, P.bg1);
  c.fillStyle = g; c.fillRect(0, 0, PKW, PKH);
  const sealH = 0.055 * PKH;
  // soudures serties
  for (const [y0, y1] of [[0, sealH], [PKH - sealH, PKH]]) {
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, y0, PKW, y1 - y0);
    L.draw((x, col) => { x.fillStyle = col; for (let px = 0; px < PKW; px += 8) x.fillRect(px, y0, 3, y1 - y0); }, 'rgba(255,255,255,.08)', { foil: true, maskAlpha: 0.55 });
  }
  // bande à déchirer
  const ty = (1 - TEAR_V) * PKH;
  c.save();
  c.font = `500 17px ${MONO}`; c.fillStyle = P.ink2; c.textAlign = 'left';
  const word = back ? 'CARTE DU CIEL · SÉRIE I · ' : 'OUVRIR ICI  ▸  ';
  let px = 20; const y = (sealH + ty) / 2 + 6;
  while (px < PKW) { px += textSp(c, word, px, y, 3.5) + 3.5; }
  c.restore();
  L.draw((x, col) => {
    x.strokeStyle = col; x.lineWidth = 2.4; x.setLineDash([12, 9]);
    x.beginPath(); x.moveTo(26, ty); x.lineTo(PKW - 26, ty); x.stroke(); x.setLineDash([]);
    x.fillStyle = col;
    x.beginPath(); x.moveTo(0, ty - 11); x.lineTo(18, ty); x.lineTo(0, ty + 11); x.fill();
    x.beginPath(); x.moveTo(PKW, ty - 11); x.lineTo(PKW - 18, ty); x.lineTo(PKW, ty + 11); x.fill();
  }, P.foil, { foil: true });
  // cadre
  L.draw((x, col) => { x.strokeStyle = col; x.lineWidth = 2; rrPath(x, 36, ty + 26, PKW - 72, PKH - sealH - ty - 60, 18); x.stroke(); }, P.foil, { foil: true, maskAlpha: 0.9 });
  return ty;
}

export function drawPackFront(type) {
  const s = 1;
  const L = new Layers(PKW, PKH, s);
  const P = PACK_PAL[type];
  const c = L.c;
  const ty = packBase(L, P, false);
  const sealH = 0.055 * PKH, bottom = PKH - sealH;
  const cx = 512, cy = ty + (bottom - ty) * 0.47, R = 318;
  const rnd = rng(1000 + type);
  // étoiles de fond
  const dots = [];
  for (let i = 0; i < 260; i++) dots.push([40 + rnd() * 944, ty + 40 + rnd() * (PKH - ty - 160), 0.7 + rnd() * rnd() * 2.8]);
  L.draw((x, col) => { x.fillStyle = col; for (const [a, b, r] of dots) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); } }, P.ink2, { pat: true, foil: true, maskAlpha: 0.5 });
  if (type === 1) {
    L.draw((x, col) => {
      x.fillStyle = col;
      for (let k = 0; k < 72; k++) {
        const a = k * TAU / 72, w = 0.018;
        x.beginPath(); x.moveTo(cx, cy);
        x.lineTo(cx + Math.cos(a - w) * 900, cy + Math.sin(a - w) * 900); x.lineTo(cx + Math.cos(a + w) * 900, cy + Math.sin(a + w) * 900); x.closePath(); x.fill();
      }
    }, 'rgba(235,203,134,.06)', { foil: true, maskAlpha: 0.2 });
  }
  if (type === 2) {
    // emblème : trou noir, disque d'accrétion et arcs de lentille
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, R * 0.95, 0, TAU); c.fill();
    L.draw((x, col) => {
      x.strokeStyle = col;
      for (let k = 0; k < 26; k++) { x.lineWidth = 1 + (k % 4 === 0 ? 1.2 : 0); x.globalAlpha = 0.25 + 0.6 * (1 - k / 26); x.beginPath(); x.ellipse(cx, cy, 150 + k * 9, (150 + k * 9) * 0.2, -0.12, 0, TAU); x.stroke(); }
      x.globalAlpha = 1;
      for (let k = 0; k < 8; k++) { x.lineWidth = 1.2; x.globalAlpha = 0.8 - k * 0.08; x.beginPath(); x.arc(cx, cy, 128 + k * 7, Math.PI * 1.08, Math.PI * 1.92); x.stroke(); }
      x.globalAlpha = 1; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 122, 0, TAU); x.stroke();
    }, P.foil, { foil: true, pat: true });
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, 119, 0, TAU); c.fill();
  } else {
    // globe céleste gravé
    c.fillStyle = type === 1 ? 'rgba(20,14,6,.7)' : 'rgba(6,10,26,.65)'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
    L.draw((x, col) => {
      x.strokeStyle = col; x.lineWidth = 1.2;
      for (let k = 1; k < 12; k++) { const l = k * 15 * D2R; x.beginPath(); x.ellipse(cx, cy, Math.abs(Math.cos(l)) * R, R, 0, 0, TAU); x.stroke(); }
      for (let k = -5; k <= 5; k++) { const p = k * 15 * D2R; const y = cy - Math.sin(p) * R, hw = Math.cos(p) * R; x.beginPath(); x.moveTo(cx - hw, y); x.lineTo(cx + hw, y); x.stroke(); }
    }, P.ink2, { foil: true, pat: true, maskAlpha: 0.55 });
    // Orion gravée au cœur du globe
    const C = CONS.ORI; const [ra0, dec0] = conCenter(C.s); const pts = projectStars(C.s, ra0, dec0);
    let mx = 0; for (const [a, b] of pts) mx = Math.max(mx, Math.abs(a), Math.abs(b));
    const sc = R * 0.72 / mx;
    const PP = (p) => [cx + p[0] * sc, cy - p[1] * sc];
    L.draw((x, col) => {
      x.strokeStyle = col; x.lineWidth = 2;
      for (const [i, j] of C.l) { const a = PP(pts[i]), b = PP(pts[j]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
      x.fillStyle = col;
      C.s.forEach((st, i) => { const p = PP(pts[i]); const r = Math.max(3, 9 - st[2] * 1.4); star4(x, p[0], p[1], r * 2.2); x.fill(); x.beginPath(); x.arc(p[0], p[1], r * 0.8, 0, TAU); x.fill(); });
    }, P.foil, { foil: true });
  }
  // anneau gradué autour de l'emblème
  L.draw((x, col) => {
    x.fillStyle = col; annulus(x, cx, cy, R + 10, R + 30); x.fill('evenodd');
    x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, R + 44, 0, TAU); x.stroke();
  }, P.foil, { foil: true });
  const cut = (x, col) => { x.strokeStyle = col; for (let i = 0; i < 144; i++) { const a = i * 2.5 * D2R; const len = i % 6 === 0 ? 14 : 7; x.lineWidth = i % 6 === 0 ? 2.4 : 1.3; x.beginPath(); x.moveTo(cx + Math.sin(a) * (R + 31), cy - Math.cos(a) * (R + 31)); x.lineTo(cx + Math.sin(a) * (R + 31 - len), cy - Math.cos(a) * (R + 31 - len)); x.stroke(); } };
  cut(L.c, P.bg1); cut(L.f, '#000');
  // titrage
  c.textAlign = 'center';
  c.font = `500 18px ${MONO}`; c.fillStyle = P.ink2; textSp(c, 'SÉRIE I · 2026', cx, ty + 84, 7, 'center');
  L.draw((x, col) => { x.font = `600 86px ${SERIF}`; x.fillStyle = col; textSp(x, 'CARTE DU CIEL', cx, ty + 176, 9, 'center', 0.025); }, P.foil, { foil: true });
  c.font = `italic 400 36px ${SERIF}`; c.fillStyle = P.ink; sText(c, "Pochette d'observation", cx, ty + 232, 0.03);
  c.font = `500 22px ${MONO}`; c.fillStyle = P.ink; textSp(c, '5 PLANCHES CÉLESTES', cx, bottom - 228, 7, 'center');
  c.font = `italic 400 30px ${SERIF}`; c.fillStyle = P.ink2; sText(c, 'La cinquième est toujours la plus rare', cx, bottom - 180, 0.03);
  L.draw((x, col) => {
    x.font = `600 17px ${MONO}`; const w = measureSp(x, P.name, 5) + 44;
    x.strokeStyle = col; x.lineWidth = 1.6; rrPath(x, cx - w / 2, bottom - 146, w, 40, 20); x.stroke();
    x.fillStyle = col; textSp(x, P.name, cx, bottom - 120, 5, 'center');
  }, P.foil, { foil: true });
  return { color: L.col, mask: L.maskTexture() };
}

export function drawPackBack(type) {
  const L = new Layers(PKW, PKH, 1);
  const P = PACK_PAL[type];
  const c = L.c;
  const ty = packBase(L, P, true);
  const pk = PACKS[type];
  c.textAlign = 'center';
  L.draw((x, col) => { x.font = `italic 600 64px ${SERIF}`; x.fillStyle = col; x.textAlign = 'center'; sText(x, 'Carte du Ciel', 512, ty + 150, 0.03); }, P.foil, { foil: true });
  c.font = `500 18px ${MONO}`; c.fillStyle = P.ink2; textSp(c, `POCHETTE ${P.name}`, 512, ty + 196, 6, 'center');
  const block = (title, lines, y0) => {
    c.textAlign = 'left';
    c.font = `600 17px ${MONO}`; c.fillStyle = P.ink; textSp(c, title, 150, y0, 5);
    c.fillStyle = P.ink2; c.font = `italic 400 31px ${SERIF}`;
    lines.forEach((l, i) => sText(c, l, 150, y0 + 50 + i * 42, 0.03));
    c.strokeStyle = P.ink2; c.lineWidth = 1; c.beginPath(); c.moveTo(150, y0 + 22); c.lineTo(874, y0 + 22); c.stroke();
  };
  block('CONTENU', ['Cinq planches tirées parmi trente-deux.', 'La cinquième est la plus rare de la pochette.'], ty + 330);
  block('OUVERTURE', ['Glissez le long du pointillé, en haut,', 'pour déchirer la pochette.'], ty + 560);
  c.textAlign = 'left'; c.font = `600 17px ${MONO}`; c.fillStyle = P.ink; textSp(c, 'CINQUIÈME PLANCHE', 150, ty + 790, 5);
  c.strokeStyle = P.ink2; c.beginPath(); c.moveTo(150, ty + 812); c.lineTo(874, ty + 812); c.stroke();
  let row = 0;
  pk.last.forEach((p, i) => {
    if (!p) return;
    const y = ty + 862 + row * 46; row++;
    c.font = `italic 400 31px ${SERIF}`; c.fillStyle = P.ink; c.textAlign = 'left'; sText(c, TIERS[i].name, 150, y, 0.03);
    c.font = `500 20px ${MONO}`; c.textAlign = 'right'; c.fillText(`${Math.round(p * 100)} %`, 874, y);
  });
  // code-barres décoratif
  const rnd = rng(77 + type);
  let bx = 380;
  const by = PKH - 0.055 * PKH - 250;
  L.draw((x, col) => { x.fillStyle = col; bx = 380; while (bx < 644) { const w = 2 + Math.floor(rnd() * 4) * 2; x.fillRect(bx, by, w, 86); bx += w + 3 + Math.floor(rnd() * 3) * 2; } }, P.ink, {});
  c.textAlign = 'center'; c.font = `500 15px ${MONO}`; c.fillStyle = P.ink2; textSp(c, 'CDC · S1 · ' + P.name, 512, by + 112, 4, 'center');
  return { color: L.col, mask: L.maskTexture() };
}
