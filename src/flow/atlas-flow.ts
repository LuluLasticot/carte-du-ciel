// ---------------------------------------------------------------------------
// Enchaînements de l'Atlas : pochette ⇄ Atlas, examen d'une planche, adresses.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { FOV_ATLAS, atlas, hideAtlas, refreshAtlas, setAtlasControl, showAtlas, slewTo } from '../atlas/atlas';
import { SOLAR_BODY } from '../atlas/objects';
import { bodyPosition } from '../astro/ephemeris';
import { Snd } from '../audio/audio';
import { Card, texScale } from '../cards/card';
import { renderFaces } from '../cards/faces';
import { $ } from '../core/dom';
import { type Route, currentRoute, navigate, routeTitle } from '../core/router';
import { E, pad2, to, tween, wait } from '../core/util';
import { CARDS, CONS, TIERS } from '../data/catalog';
import { CRAFT_COST, craft, grantConstellationRewards } from '../data/economy';
import { mainScene, post, sky, view } from '../render/engine';
import { burst, flare } from '../render/fx';
import { collection, commit, ownedCount } from '../store/collection';
import { UI } from '../ui/ui';
import { LAY, busy, cards, enterIdle, go, pack, packReady, preparePack, setBusy, state } from './flow';

let focusCard: Card | null = null;
let focusN = 0;
let albumOpen = false;
let renderAlbum: () => void = () => {};
/** Le module de l'Album s'enregistre ici (évite une dépendance circulaire). */
export function setAlbumRenderer(fn: () => void) { renderAlbum = fn; }
export function getFocusCard() { return focusCard; }
export function isAlbumOpen() { return albumOpen; }

const el = {
  atlas: $('atlas'), album: $('album'), stats: $('atlasStats'), note: $('atlasNote'), dust: $('dustVal'),
  tabSky: $('tabSky'), tabAlbum: $('tabAlbum'),
};

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function refreshAtlasUI() {
  const owned = ownedCount(collection);
  const done = collection.rewarded.length;
  el.stats.textContent = `${owned} planche${owned > 1 ? 's' : ''} sur 32 · ${done} constellation${done > 1 ? 's' : ''} complète${done > 1 ? 's' : ''}`;
  el.note.textContent = `Système solaire : positions calculées pour le ${DATE_FMT.format(atlas.date)}`;
  el.dust.textContent = String(collection.dust);
  UI.setCount(owned);
  refreshAtlas();
  if (albumOpen) renderAlbum();
}

// --------------------------- pochette ⇄ Atlas ---------------------------
export async function openAtlas(push = true) {
  if (!(state === 'idle' || state === 'summary' || state === 'loading') || busy) return;
  const from = state;
  setBusy(true);
  go('atlas');
  UI.hint(null); UI.show(UI.packs, false); UI.show(UI.sum, false); UI.show(UI.cinfo, false);
  Snd.ensure(); Snd.whoosh(0.9, 300, 1800, 0.16);
  if (from === 'idle') to(pack.s, { y: pack.s.y - view.visH * 1.15, rz: 0.15 }, { dur: 0.7, ease: E.p3i });
  if (from === 'summary') cards.forEach((c, i) => to(c.s, { y: c.s.y - view.visH * 1.2, rz: (i - 2) * 0.2, rx: 0.4 }, { dur: 0.6, delay: i * 0.04, ease: E.p3i }));
  sky.driftOn = 0;
  to(sky, { grid: 1.15, fov: FOV_ATLAS }, { dur: from === 'loading' ? 0.01 : 1.2, ease: E.p3io });
  showAtlas();
  refreshAtlasUI();
  UI.show(el.atlas, true);
  if (push) navigate({ name: 'atlas' }, routeTitle({ name: 'atlas' }));
  if (from !== 'loading') await wait(0.75);
  pack.group.visible = false;
  for (const c of cards) c.group.visible = false;
  setAtlasControl(true);
  setBusy(false);
}

export async function closeAtlas(push = true) {
  if (state !== 'atlas' || busy) return;
  setBusy(true);
  go('transition');
  setAtlasControl(false);
  showAlbum(false);
  UI.show(el.atlas, false);
  hideAtlas();
  Snd.whoosh(0.8, 1600, 300, 0.14);
  to(sky, { grid: 0.55, fov: 46 }, { dur: 1.0, ease: E.p3io });
  sky.driftOn = 1;
  if (push) navigate({ name: 'pack' }, routeTitle({ name: 'pack' }));
  if (!packReady) await preparePack();
  pack.group.visible = true;
  setBusy(false);
  await enterIdle(true);
}

// --------------------------- Album ---------------------------
export function showAlbum(on: boolean) {
  albumOpen = on;
  el.tabSky.setAttribute('aria-selected', String(!on));
  el.tabAlbum.setAttribute('aria-selected', String(on));
  if (on) renderAlbum();
  UI.show(el.album, on);
  el.atlas.classList.toggle('album-open', on);
  $('atlasLabels').classList.toggle('on', !on && state === 'atlas');
  setAtlasControl(!on && state === 'atlas');
}

// --------------------------- examen d'une planche ---------------------------
function fillMystery(n: number) {
  const d = CARDS[n - 1], T = TIERS[d.tier];
  UI.setTier(d.tier);
  $('inspT').textContent = `${T.name} · ${T.finish} · Planche ${pad2(n)}`;
  $('inspN').textContent = 'À découvrir';
  $('inspTy').textContent = `${d.type} · ${d.sub}`;
  $('inspD').textContent = 'Cette planche n’est pas encore dans votre collection. Ouvrez des pochettes pour la trouver, ou créez-la avec de la poussière d’étoiles.';
  $('inspDl').innerHTML = `<dt>Rareté</dt><dd>${T.name} · ${T.finish}</dd>` + (d.con ? `<dt>Constellation</dt><dd>${CONS[d.con].name}</dd>` : '<dt>Région</dt><dd>Système solaire</dd>');
}

function fillActions(n: number) {
  const act = $('inspAct');
  act.innerHTML = '';
  const d = CARDS[n - 1];
  if (SOLAR_BODY[n]) {
    const p = bodyPosition(SOLAR_BODY[n], atlas.date);
    const h = Math.floor(p.ra), m = Math.round((p.ra - h) * 60);
    const dl = $('inspDl') as HTMLElement;
    dl.insertAdjacentHTML('beforeend', `<dt>Aujourd’hui</dt><dd>α ${h} h ${pad2(m % 60)} min · δ ${p.dec >= 0 ? '+' : '−'}${Math.abs(p.dec).toFixed(0)}°</dd>`);
  }
  if (collection.cards[n]) return;
  const cost = CRAFT_COST[d.tier];
  const p = document.createElement('p');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn sm';
  b.textContent = `Créer cette planche · ${cost} ✦`;
  if (collection.dust < cost) {
    b.disabled = true;
    p.textContent = `Il vous manque ${cost - collection.dust} poussières d’étoiles. Convertissez vos doublons dans l’Album.`;
  } else {
    p.textContent = `Vous avez ${collection.dust} poussières d’étoiles.`;
    b.addEventListener('click', () => void craftPlate(n));
  }
  act.append(b, p);
}

async function makeCard(n: number) {
  const data = CARDS[n - 1];
  const faces = await renderFaces([data], texScale());
  const c = new Card(data, faces?.[0]);
  mainScene.add(c.group);
  return c;
}

/** Ouvre une planche depuis l'Atlas ; « shared » : lien direct, on montre la planche même si elle n'est pas possédée. */
export async function focusPlate(n: number, opts: { push?: boolean; shared?: boolean; reveal?: boolean } = {}) {
  if (!(state === 'atlas' || state === 'loading') || busy || !CARDS[n - 1]) return;
  setBusy(true);
  go('atlasPlate');
  setAtlasControl(false);
  showAlbum(false);
  UI.show(el.atlas, false);
  $('atlasLabels').classList.remove('on');
  focusN = n;
  const owned = !!collection.cards[n];
  const front = owned || !!opts.shared;
  const data = CARDS[n - 1];
  if (opts.push !== false) navigate({ name: 'plate', n }, routeTitle({ name: 'plate', n }, front ? data.name : undefined));
  Snd.ensure(); Snd.whoosh(1.0, 300, 1600, 0.2);
  const cardP = makeCard(n);
  await slewTo(n, 24, 1.1);
  const c = await cardP;
  focusCard = c;
  const col = TIERS[data.tier].rgb;
  // la planche naît de l'étoile
  flare.mat.uniforms.uCol.value.setRGB(col[0] * 0.6 + 0.4, col[1] * 0.6 + 0.4, col[2] * 0.6 + 0.4);
  flare.mesh!.position.set(0, 0, 0.5); flare.size = 0.6; flare.int = 0;
  to(flare, { int: 1.4, size: 3.2 }, { dur: 0.25, ease: E.p2o }).then(() => to(flare, { int: 0, size: 5 }, { dur: 0.6, ease: E.p2o }));
  c.backMat.uniforms.uGlowCol.value.setRGB(...col);
  c.s = { x: 0, y: 0, z: 0.5, rx: 0, ry: front && !opts.reveal ? 0 : Math.PI, rz: 0, sc: LAY.insp.sc * 0.04 };
  c.glow = 1.4; c.idle = 0;
  to(c, { glow: 0.1 }, { dur: 1.2, ease: E.p2o });
  await to(c.s, { ...LAY.insp, rz: 0 }, { dur: 0.75, ease: E.bo(1.1) });
  if (opts.reveal) {
    Snd.flip(data.tier);
    await tween({ dur: 0.8, ease: E.p3io, update: (e) => { c.s.ry = Math.PI * (1 - e) + (data.tier >= 2 ? Math.PI * 2 * (1 - e) : 0); } });
    Snd.reveal(data.tier);
    post.flashCol.setRGB(...col); post.flash = 0.25; to(post, { flash: 0 }, { dur: 0.6 });
    const p = c.group.getWorldPosition(new THREE.Vector3());
    burst(p.x, p.y, p.z + 0.3, data.tier, 140, 3.8, { grav: 0.6, life: 1.3 });
    c.sweep = -1.2; to(c, { sweep: 2.6 }, { dur: 0.9, ease: E.p2io });
  }
  if (front) UI.inspectFill(c); else fillMystery(n);
  fillActions(n);
  if (opts.shared && !owned) $('inspAct').insertAdjacentHTML('afterbegin', '<p>Cette planche n’est pas encore dans votre collection.</p>');
  UI.show(UI.insp, true);
  c.autoTilt = 0.3;
  setBusy(false);
}

export async function unfocusPlate(push = true) {
  if (state !== 'atlasPlate' || busy) return;
  setBusy(true);
  UI.show(UI.insp, false);
  const c = focusCard!;
  c.autoTilt = 0; c.tx.t = 0; c.ty.t = 0;
  Snd.whoosh(0.6, 1800, 400, 0.12);
  to(c, { glow: 1.2 }, { dur: 0.3 });
  await to(c.s, { x: 0, y: 0, z: 0.5, sc: c.s.sc * 0.03, rz: 0.2 }, { dur: 0.45, ease: E.p3i });
  mainScene.remove(c.group); c.dispose(); focusCard = null;
  go('atlas');
  if (push) navigate({ name: 'atlas' }, routeTitle({ name: 'atlas' }));
  to(sky, { fov: FOV_ATLAS }, { dur: 0.9, ease: E.p3io });
  UI.show(el.atlas, true);
  $('atlasLabels').classList.add('on');
  refreshAtlasUI();
  setAtlasControl(true);
  setBusy(false);
}

// --------------------------- poussière d'étoiles ---------------------------
export async function craftPlate(n: number) {
  const before = collection;
  const r = craft(collection, n);
  if ('error' in r) { UI.toast('Création impossible', r.error); return; }
  const { state: next, rewards } = grantConstellationRewards(before, r.state);
  await commit(next);
  UI.toast(`Planche créée : ${CARDS[n - 1].name}`, `−${CRAFT_COST[CARDS[n - 1].tier]} poussières d'étoiles`);
  rewards.forEach((rw, i) => UI.toast(rw.label, `+${rw.dust} poussières d'étoiles`, 900 + i * 900));
  refreshAtlasUI();
  if (state === 'atlasPlate') {
    // la planche examinée était la silhouette : on la retourne sur place
    const c = focusCard!;
    UI.show(UI.insp, false);
    setBusy(true);
    const data = CARDS[n - 1], col = TIERS[data.tier].rgb;
    Snd.flip(data.tier);
    await tween({ dur: 0.8, ease: E.p3io, update: (e) => { c.s.ry = Math.PI * (1 - e); } });
    Snd.reveal(data.tier);
    post.flashCol.setRGB(...col); post.flash = 0.25; to(post, { flash: 0 }, { dur: 0.6 });
    const p = c.group.getWorldPosition(new THREE.Vector3());
    burst(p.x, p.y, p.z + 0.3, data.tier, 140, 3.8, { grav: 0.6, life: 1.3 });
    UI.inspectFill(c); fillActions(n);
    UI.show(UI.insp, true);
    navigate({ name: 'plate', n }, routeTitle({ name: 'plate', n }, data.name), true);
    setBusy(false);
  } else if (state === 'atlas') {
    showAlbum(false);
    await focusPlate(n, { reveal: true });
  }
}

// --------------------------- adresses ---------------------------
/** Démarrage sur /atlas ou /planche/N. */
export async function startFromRoute(r: Route) {
  if (r.name === 'pack') return false;
  await openAtlas(false);
  if (r.name === 'plate') await focusPlate(r.n, { push: false, shared: true });
  document.title = routeTitle(r, r.name === 'plate' ? CARDS[r.n - 1].name : undefined);
  return true;
}

/** Bouton « précédent » du navigateur. */
export async function onPopState() {
  const r = currentRoute();
  if (r.name === 'pack') {
    if (state === 'atlasPlate') await unfocusPlate(false);
    if (state === 'atlas') await closeAtlas(false);
  } else if (r.name === 'atlas') {
    if (state === 'atlasPlate') await unfocusPlate(false);
    else if (state === 'idle' || state === 'summary') await openAtlas(false);
  } else if (r.name === 'plate') {
    if (state === 'idle' || state === 'summary') await openAtlas(false);
    if (state === 'atlasPlate' && focusN !== r.n) await unfocusPlate(false);
    if (state === 'atlas') await focusPlate(r.n, { push: false, shared: true });
  }
  document.title = routeTitle(r, r.name === 'plate' ? CARDS[r.n - 1].name : undefined);
}

/** Repositionne la planche examinée après un redimensionnement. */
window.addEventListener('resize', () => { if (state === 'atlasPlate' && focusCard && !busy) Object.assign(focusCard.s, LAY.insp); });
