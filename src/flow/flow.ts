// ---------------------------------------------------------------------------
// Déroulé : pochette → déchirure → révélations → séquence finale → récapitulatif
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { NOTE, PENTA, Snd } from '../audio/audio';
import { CARD_H, CARD_W, Card, texScale } from '../cards/card';
import { TEAR_V } from '../cards/textures';
import { $ } from '../core/dom';
import { pointer } from '../core/input';
import { Clock, E, REDUCED, RND, TAU, clamp, damp, lerp, nextFrame, pad2, pickW, to, tween, wait, yieldToBrowser } from '../core/util';
import { CARDS, CONS, DIST_ROLL, PACKS, TIERS } from '../data/catalog';
import { PACK_H, PACK_W, Pack } from '../pack/pack';
import { CAM_Z, IS_TOUCH, addTrauma, buildConstellation, cam, camPush, conLineMat, conStarMat, mainScene, post, renderer, setPackLayout, sky, skyQuatFor, view } from '../render/engine';
import { burst, burstColor, flare, heroRays, packRays, parts } from '../render/fx';
import { store } from '../store/storage';
import { UI } from '../ui/ui';
import { type FlowState, canGo, IllegalTransition } from './machine';
import { rollPack } from '../data/roll';
import { renderFaces } from '../cards/faces';
import { addCard, collection, countPack, ownedCount, requestPersistence } from '../store/collection';

export const pack = new Pack();
mainScene.add(pack.group);
export let packType = clamp(store.get('cdc.pack', 0) | 0, 0, 2);
export let cards = [];
export let state: FlowState = 'loading';
/** Change d'état en vérifiant la table de transitions (erreur en développement, avertissement en production). */
export function go(next: FlowState) {
  if (!canGo(state, next)) {
    const err = new IllegalTransition(state, next);
    if (import.meta.env.DEV) throw err;
    console.warn(err.message);
  }
  state = next;
}
/** Note une interaction du joueur (retarde l'animation d'aide). */
export function touch() { lastInteract = Clock.t; }
export let busy = false;
export let revealIdx = 0;
export let inspected = -1;
export let heroCard = null;
export let lastTray = null;
export let skipping = false;
export let stackZ = 0; // recul de la pile pendant les révélations
export let lastInteract = 0;
export let ghost = { t: 99, run: -1 };
export const FORCE = (() => { const h = (location.hash || '').toLowerCase(); return h.includes('mythique') ? 4 : h.includes('legendaire') ? 3 : h.includes('epique') ? 2 : -1; })();
export interface Place { x: number; y: number; z: number; sc: number; rz?: number }
export interface Layout {
  packS: number; packY: number;
  trayS: number; trayY: number; slotW: number;
  focusS: number; focusY: number;
  heroS: number; heroY: number;
  sum: Place[]; insp: Place;
}
export const LAY = {} as Layout;

export function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* refusé */ } }
export function owned() { return ownedCount(collection); }

// --------------------------- mise en page (unités du monde) ---------------------------
setPackLayout(function () {
  const H = view.visH, W = view.visW, px = view.px2w, P = view.portrait;
  const top = (P ? 72 : 66) * px, bot = (P ? 156 : 138) * px;
  LAY.packS = Math.min((H - top - bot) * 0.94 / PACK_H, W * 0.8 / PACK_W, 0.68 * H / PACK_H);
  LAY.packY = ((H / 2 - top) + (-H / 2 + bot)) / 2;
  const slotW = Math.min(W * 0.92 / 5, (P ? 0.1 : 0.125) * H / CARD_H * CARD_W * 1.12);
  LAY.trayS = slotW / 1.12 / CARD_W;
  const trayH = CARD_H * LAY.trayS;
  LAY.trayY = -H / 2 + (P ? 74 : 58) * px + trayH / 2;
  LAY.slotW = slotW;
  const fTop = H / 2 - (P ? 108 : 104) * px, fBot = LAY.trayY + trayH / 2 + 20 * px;
  LAY.focusS = Math.min((fTop - fBot) * 0.97 / CARD_H, W * 0.84 / CARD_W);
  LAY.focusY = (fTop + fBot) / 2;
  const hTop = H / 2 - 74 * px, hBot = -H / 2 + (Math.max(0.07 * view.h, 54) + (P ? 118 : 108)) * px;
  LAY.heroS = Math.min((hTop - hBot) * 0.96 / CARD_H, W * 0.84 / CARD_W);
  LAY.heroY = (hTop + hBot) / 2;
  // récapitulatif
  const order = [0, 2, 4, 3, 1];
  LAY.sum = new Array(5);
  if (!P) {
    const sTop = H / 2 - 92 * px, sBot = -H / 2 + 118 * px;
    const s = Math.min((sTop - sBot) * 0.8 / (CARD_H * 1.16), W * 0.93 / (CARD_W * 5.16 * 1.1));
    const w = CARD_W * s, g = w * 0.1, wh = w * 1.16, cy = (sTop + sBot) / 2;
    const xs = [-(wh / 2 + 2 * g + 1.5 * w), -(wh / 2 + g + w / 2), 0, wh / 2 + g + w / 2, wh / 2 + 2 * g + 1.5 * w];
    order.forEach((ci, k) => {
      const d = Math.abs(k - 2);
      LAY.sum[ci] = { x: xs[k], y: cy - d * d * 0.035 * CARD_H * s, z: k === 2 ? 0.35 : -d * 0.05, sc: k === 2 ? s * 1.16 : s, rz: (2 - k) * 0.035 };
    });
  } else {
    const sTop = H / 2 - 80 * px, sBot = -H / 2 + 132 * px;
    const sr = Math.min(W * 0.93 / (4 * CARD_W * 1.07), 0.19 * H / CARD_H);
    const rowH = CARD_H * sr;
    const sh = Math.min((sTop - sBot - rowH - 22 * px) / CARD_H, 0.64 * W / CARD_W);
    const yh = sTop - CARD_H * sh / 2;
    const yr = yh - CARD_H * sh / 2 - 22 * px - rowH / 2;
    LAY.sum[4] = { x: 0, y: yh, z: 0.3, sc: sh, rz: 0 };
    [0, 1, 2, 3].forEach((ci, k) => { LAY.sum[ci] = { x: (k - 1.5) * CARD_W * sr * 1.07, y: yr, z: 0, sc: sr, rz: 0 }; });
  }
  // examen
  if (!P) {
    const s = Math.min(0.74 * H / CARD_H, 0.4 * W / CARD_W);
    LAY.insp = { x: -Math.min(180 * px, W * 0.16), y: 0, z: 1.2, sc: s };
  } else {
    // la planche est rapprochée (z 1.2) : on compense la perspective pour qu'elle tienne entre l'en-tête et la fiche
    const k = CAM_Z / (CAM_Z - 1.2);
    const aTop = H / 2 - 80 * px, aBot = -H / 2 + (0.44 * view.h + 22) * px;
    const s = Math.min((aTop - aBot) / (k * CARD_H), 0.74 * W / (k * CARD_W));
    LAY.insp = { x: 0, y: (aTop + aBot) / 2 / k, z: 1.2, sc: s };
  }
  settleLayout();
});
// planches non examinées : elles glissent hors champ pendant l'examen
export function inspOther(j) {
  const b = LAY.sum[j];
  return { ...b, y: -view.visH / 2 - CARD_H * b.sc - 0.3, z: b.z - 1, sc: b.sc * 0.85 };
}
export function trayPos(i) { return { x: (i - 2) * LAY.slotW, y: LAY.trayY, z: 0.2, sc: LAY.trayS }; }
export function settleLayout() {
  if (busy) return;
  if (state === 'idle' || state === 'tearing' || state === 'loading') { pack.s.y = LAY.packY; pack.s.sc = LAY.packS; }
  if (state === 'reveal') {
    pack.stack.position.set(0, LAY.focusY, stackZ); pack.stack.scale.setScalar(LAY.focusS);
    cards.forEach((c, i) => {
      if (i < revealIdx - 1) Object.assign(c.s, trayPos(i));
      else if (i === revealIdx - 1) { c.s.x = 0; c.s.y = LAY.focusY; c.s.sc = LAY.focusS; }
    });
  }
  if (state === 'hero' && heroCard) { heroCard.s.y = LAY.heroY; heroCard.s.sc = LAY.heroS; }
  if (state === 'summary') cards.forEach((c, i) => Object.assign(c.s, LAY.sum[i]));
  if (state === 'inspect' && inspected >= 0) cards.forEach((c, i) => Object.assign(c.s, i === inspected ? LAY.insp : inspOther(i)));
}

// --------------------------- tirage d'une pochette ---------------------------
export async function fillPack() {
  cards.forEach((c) => c.dispose());
  cards = [];
  const data = rollPack(packType, { random: RND, first: collection.packs === 0, force: FORCE });
  // faces dessinées dans un Worker quand c'est possible (le fil principal reste libre)
  const faces = await renderFaces(data, texScale());
  for (let i = 0; i < 5; i++) {
    const c = new Card(data[i], faces?.[i]);
    c.s = { x: 0, y: -0.16, z: (4 - i) * 0.014 - 0.028, rx: 0, ry: Math.PI, rz: 0, sc: 0.92 };
    pack.stack.add(c.group);
    c.update(0);
    renderer.initTexture(c.texC); renderer.initTexture(c.texM);
    cards.push(c);
    if (!faces) await yieldToBrowser();
  }
  try { await renderer.compileAsync(mainScene, cam); } catch (e) { /* compilation au premier rendu */ }
}

// --------------------------- repos : la pochette attend ---------------------------
export async function enterIdle(dropIn) {
  go('idle');
  UI.setTier(3);
  UI.setOdds(packType);
  pack.idle = 1;
  pack.s.sc = LAY.packS;
  if (dropIn) {
    busy = true;
    pack.s.y = LAY.packY + view.visH * 1.05; pack.s.rz = -0.12; pack.s.rx = 0.2;
    Snd.whoosh(0.7, 1800, 300, 0.18);
    to(pack.s, { y: LAY.packY, rz: 0, rx: 0 }, { dur: 0.95, ease: E.bo(1.15) });
    await wait(0.6);
    busy = false;
  } else {
    pack.s.y = LAY.packY;
  }
  UI.show(UI.packs, true);
  UI.hint(IS_TOUCH ? 'Glissez le doigt le long du pointillé' : 'Glissez le long du pointillé pour déchirer');
  lastInteract = Clock.t - 1;
}

export async function setPackType(type) {
  if (state !== 'idle' || pack.started || busy || type === packType) return;
  busy = true;
  packType = type;
  store.set('cdc.pack', type);
  UI.setOdds(type);
  Snd.ensure(); Snd.whoosh(0.5, 500, 2600, 0.14);
  const r0 = pack.s.ry;
  let swapped = false;
  await tween({ dur: 0.75, ease: E.p3io, update: (e) => {
    pack.s.ry = r0 + TAU * e;
    if (!swapped && e > 0.25) { swapped = true; pack.setType(type); }
  } });
  pack.s.ry = r0;
  await fillPack();
  busy = false;
}

// --------------------------- déchirure ---------------------------
export const _v = new THREE.Vector3();
export let hapticAcc = 0;
export function tearFrame(dt) {
  const du = pack.step(dt);
  const speed = du / Math.max(dt, 1e-3);
  if (pack.started && !pack.done) {
    Snd.tearUpdate(speed, (pack.front_ - 0.5) * 1.4);
    pack.common.uLeak.value = damp(pack.common.uLeak.value, Math.min(1, pack.progress * 1.6), 6, dt);
    pack.tilt.z.t = pack.dir * 0.05 * Math.min(1, pack.progress * 2);
    pack.tilt.y.t = pack.dir * 0.1 * Math.sin(pack.progress * Math.PI);
    if (du > 0) {
      const p = pack.frontWorld(_v);
      const n = Math.min(14, 1 + Math.floor(du * 420));
      const lc = TIERS[cards[4].tier].rgb;
      for (let i = 0; i < n; i++) {
        const gold = packType === 1;
        const c = Math.random() < 0.35 ? [lc[0] * 3, lc[1] * 3, lc[2] * 3] : gold ? [2.4, 1.7, 0.8] : [2.2, 2.3, 2.6];
        parts.emit({ x: p.x, y: p.y, z: p.z + 0.1, vx: (Math.random() - 0.5) * 1.4 - pack.dir * 0.6, vy: 0.6 + Math.random() * 2.2, vz: Math.random() * 1.2,
          c, life: 0.5 + Math.random() * 0.7, drag: 2.2, grav: 3.5, s0: 0.035 + Math.random() * 0.05, s1: 0 });
      }
      hapticAcc += du;
      if (hapticAcc > 0.07) { hapticAcc = 0; haptic(6); }
    }
    if (pack.progress >= 0.9) completeTear();
  }
}
export function completeTear() {
  if (pack.done) return;
  go('opening');
  countPack();
  if (collection.packs === 1) requestPersistence();
  pack.target = pack.dir > 0 ? 1 : 0;
  pack.step(0.05);
  Snd.tearStop();
  Snd.rip();
  haptic([12, 30, 20]);
  const vx = pointer.down ? pointer.vx : pack.dir * 4;
  const vy = pointer.down ? pointer.vy : 2;
  pack.fling(vx * 0.6, vy * 0.6);
  UI.hint(null); UI.show(UI.packs, false);
  openSequence();
}
export async function autoTear() {
  if (state !== 'idle' || busy || pack.started) return;
  Snd.ensure();
  pack.startTear(1); go('tearing');
  Snd.tearStart();
  UI.show(UI.packs, false); UI.hint(null);
  await tween({ dur: 1.05, ease: E.p2io, update: (e) => pack.pull(e * 1.02, Math.sin(e * 5) * 0.012) });
}

// --------------------------- ouverture ---------------------------
export async function openSequence() {
  busy = true;
  const t = cards[4].tier;
  const col = TIERS[t].rgb;
  pack.common.uLeakCol.value.setRGB(col[0], col[1], col[2]);
  to(pack.common.uLeak, { value: 2.6 }, { dur: 0.22, ease: E.p2o });
  const top = new THREE.Vector3(0, (TEAR_V - 0.5) * PACK_H, 0.2);
  pack.inner.localToWorld(top);
  packRays.mesh.position.set(top.x, top.y, 0.4);
  packRays.mesh.scale.setScalar(LAY.packS);
  packRays.mat.uniforms.uCol.value.setRGB(col[0], col[1], col[2]);
  to(packRays, { int: 1.5 }, { dur: 0.3, ease: E.p2o });
  post.flashCol.setRGB(col[0], col[1], col[2]);
  post.flash = 0.16; to(post, { flash: 0 }, { dur: 0.6, ease: E.p2o });
  addTrauma(0.32);
  Snd.boom(0.55, 120, 40, 0.9);
  Snd.shimmer(5, 0.05, 0.05, 3);
  for (let i = 0; i < (REDUCED ? 60 : 200); i++) {
    const u = Math.random();
    const p = new THREE.Vector3((u - 0.5) * PACK_W * 0.9, (TEAR_V - 0.5) * PACK_H, 0.1);
    pack.inner.localToWorld(p);
    parts.emit({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 4.5, vz: (Math.random() - 0.3) * 1.5,
      c: burstColor(t, 1.5 + Math.random() * 2.5), life: 0.8 + Math.random() * 1.2, drag: 1.6, grav: 1.4, s0: 0.05 + Math.random() * 0.07, s1: 0 });
  }
  await wait(0.18);
  // les planches sortent de la pochette
  Snd.whoosh(0.9, 250, 2200, 0.22);
  const st = pack.stack;
  cards.forEach((c, i) => {
    tween({ dur: 0.95, delay: i * 0.03, ease: E.p3o, update: (e) => { c.s.rz = (i - 2) * 0.04 * Math.sin(e * Math.PI); c.s.x = (i - 2) * 0.045 * Math.sin(e * Math.PI); } });
  });
  to(pack, { idle: 0 }, { dur: 0.8, ease: E.sio });
  for (const k of ['x', 'y', 'z']) { pack.tilt[k].t = 0; }
  to(pack.s, { y: pack.s.y - 1.7 * LAY.packS }, { dur: 0.95, ease: E.p3io });
  await to(st.position, { y: st.position.y + 2.7 }, { dur: 0.95, ease: E.p3o });
  to(pack.common.uLeak, { value: 0 }, { dur: 0.6 });
  to(packRays, { int: 0 }, { dur: 0.7 });
  // la pochette glisse le long de son propre axe, puis bascule : pas d'interpénétration
  for (const k of ['x', 'y', 'z']) { pack.tilt[k].t = pack.tilt[k].v; pack.tilt[k].vel = 0; }
  pack.idle = 0;
  mainScene.attach(st);
  pack.group.updateWorldMatrix(true, true);
  const down = new THREE.Vector3(0, -1, 0).transformDirection(pack.inner.matrixWorld);
  const ps0 = { x: pack.s.x, y: pack.s.y, z: pack.s.z };
  const fall = view.visH * 1.3;
  tween({ dur: 0.85, ease: E.p2i, update: (e) => { pack.s.x = ps0.x + down.x * fall * e; pack.s.y = ps0.y + down.y * fall * e; pack.s.z = ps0.z + down.z * fall * e; } });
  to(pack.s, { rz: 0.2 * -pack.dir, rx: 0.3 }, { dur: 0.6, delay: 0.38, ease: E.p2i });
  Snd.whoosh(0.8, 1400, 200, 0.12);
  await wait(0.3);
  const q0 = st.quaternion.clone();
  const sc0 = st.scale.x;
  const p0 = st.position.clone();
  await tween({ dur: 0.9, ease: E.p3io, update: (e) => {
    st.position.set(lerp(p0.x, 0, e), lerp(p0.y, LAY.focusY, e), lerp(p0.z, 0, e));
    st.scale.setScalar(lerp(sc0, LAY.focusS, e));
    st.quaternion.slerpQuaternions(q0, new THREE.Quaternion(), e);
    for (const c of cards) { c.s.sc = lerp(0.92, 1, e); c.s.y = lerp(-0.16, 0, e); }
  } });
  pack.group.visible = false;
  busy = false;
  enterReveal();
}

// --------------------------- révélations 1 à 4 ---------------------------
export function enterReveal() {
  go('reveal');
  revealIdx = 0;
  stackZ = 0;
  // les planches de la pile ne flottent plus séparément (elles s'interpénétraient) : c'est la pile entière qui oscille
  cards.forEach((c) => { c.idle = 0; });
  UI.hint('Touchez pour révéler');
}
export function markOwned(card) {
  const n = card.data.n;
  const isNew = addCard(n);
  UI.setCount(owned());
  return isNew;
}
export function sendToTray(c, i) {
  const p = trayPos(i);
  const x0 = c.s.x, y0 = c.s.y, z0 = c.s.z, sc0 = c.s.sc, ry0 = c.s.ry, rz0 = c.s.rz, rx0 = c.s.rx;
  const cx = lerp(x0, p.x, 0.35) + (p.x - x0) * 0.1, cy = lerp(y0, p.y, 0.3) + 0.25;
  c.idle = 0; c.autoTilt = 0;
  c.tx.t = 0; c.ty.t = 0;
  Snd.whoosh(0.45, 1600, 500, 0.1, p.x / view.visW);
  // trajectoire toujours devant la planche suivante (bosse en z) pour ne jamais la traverser
  return tween({ dur: 0.56, ease: E.p3io, update: (e) => {
    const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, d = e * e;
    c.s.x = a * x0 + b * cx + d * p.x;
    c.s.y = a * y0 + b * cy + d * p.y;
    c.s.z = lerp(z0, p.z, e * e * e * e) + Math.sin(e * Math.PI) * 0.9; c.s.sc = lerp(sc0, p.sc, e);
    c.s.ry = lerp(ry0, 0, e); c.s.rz = lerp(rz0, (i - 2) * -0.03, e); c.s.rx = lerp(rx0, 0, e);
  } });
}
export async function revealNext() {
  if (state !== 'reveal' || busy) return;
  busy = true;
  lastInteract = Clock.t;
  if (revealIdx > 0) lastTray = sendToTray(cards[revealIdx - 1], revealIdx - 1);
  if (revealIdx === 4) { busy = false; walkout(); return; }
  const c = cards[revealIdx];
  mainScene.attach(c.group);
  c.syncFromWorld();
  c.idle = 0;
  UI.show(UI.cinfo, false);
  // la pile recule, la planche se décolle bien à plat AVANT de pivoter : aucune intersection
  stackZ = -0.35;
  to(pack.stack.position, { z: stackZ }, { dur: 0.35, ease: E.p2o });
  if (revealIdx > 0) await wait(0.1);
  await to(c.s, { z: c.s.z + 0.45, rx: 0.05 }, { dur: 0.14, ease: E.p2o });
  Snd.flip(c.tier);
  const sc0 = c.s.sc, z0 = c.s.z;
  const hw = CARD_W / 2 * sc0;
  const spin = c.tier >= 2 ? TAU : 0;
  tween({ dur: 0.66, ease: E.p3io, update: (e) => {
    const ry = lerp(Math.PI + spin, 0, e);
    const sn = Math.sin(ry);
    c.s.ry = ry;
    // la planche avance d'autant que sa demi-largeur pivote vers l'arrière
    c.s.z = lerp(z0, 1.0, E.p2o(e)) + (hw + 0.2) * sn * sn;
    c.s.rx = lerp(0.05, 0, e);
    c.s.rz = Math.sin(e * Math.PI) * 0.06;
    c.s.sc = sc0 * (1 + Math.sin(e * Math.PI) * 0.03);
  } });
  await wait(0.5);
  const isNew = markOwned(c);
  UI.cardInfo(c.data, revealIdx, isNew);
  Snd.reveal(c.tier);
  camPush(0.025 + c.tier * 0.012, 0.9);
  c.sweep = -1.2; to(c, { sweep: 2.6 }, { dur: 0.9, ease: E.p2io });
  if (c.tier >= 1) {
    const p = c.group.getWorldPosition(new THREE.Vector3());
    burst(p.x, p.y, p.z + 0.3, c.tier, c.tier === 1 ? 50 : 120, c.tier === 1 ? 2.6 : 3.8, { grav: 0.6, life: 1.2 });
    post.flashCol.setRGB(...TIERS[c.tier].rgb); post.flash = c.tier === 1 ? 0.12 : 0.28; to(post, { flash: 0 }, { dur: 0.5 });
  }
  if (c.tier >= 2) addTrauma(0.15);
  c.idle = 1; c.autoTilt = 0.55;
  await wait(0.16);
  revealIdx++;
  UI.hint(revealIdx < 4 ? 'Touchez pour la suivante' : 'Touchez pour la dernière');
  busy = false;
}

// --------------------------- séquence finale (la planche la plus rare) ---------------------------
export function skipWalkout() { if (state === 'walkout' && !skipping) { skipping = true; Clock.scale = 3.2; UI.show(UI.woSkip, false); for (const el of [UI.woC, UI.woT, UI.woD]) UI.out(el); UI.woRet.classList.remove('on', 'lock'); } }
let walkoutRun = 0, woLate = false;
export async function walkout() {
  woLate = false;
  go('walkout'); busy = true; skipping = false;
  const c = cards[4], d = c.data, t = c.tier, col = TIERS[t].rgb;
  const C = CONS[d.con];
  UI.setTier(t);
  UI.hint(null); UI.show(UI.cinfo, false);
  const woToken = ++walkoutRun;
  setTimeout(() => { if (state === 'walkout' && !skipping && woToken === walkoutRun && !woLate) UI.show(UI.woSkip, true); }, 1400);
  (lastTray || Promise.resolve()).then(() => cards.slice(0, 4).forEach((k, i) => to(k.s, { y: LAY.trayY - 2.2 * LAY.trayS * CARD_H - 0.6 }, { dur: 0.5, delay: i * 0.03, ease: E.p3i })));
  mainScene.attach(c.group); c.syncFromWorld();
  c.idle = 0;
  Snd.droneStart();
  to(post, { bars: view.portrait ? 0.06 : 0.085, vig: 0.85 }, { dur: 0.7, ease: E.p3io });
  // 0 — la planche devient une étoile
  c.backMat.uniforms.uGlowCol.value.setRGB(...col);
  to(c, { glow: 1.2 }, { dur: 0.3 });
  await to(c.s, { y: c.s.y + 0.2, z: 1.2 }, { dur: 0.32, ease: E.p2o });
  flare.mat.uniforms.uCol.value.setRGB(col[0] * 0.6 + 0.4, col[1] * 0.6 + 0.4, col[2] * 0.6 + 0.4);
  flare.mesh.position.set(c.s.x, c.s.y, c.s.z + 0.3);
  flare.size = 0.4;
  to(flare, { int: 1.6, size: 3.2 }, { dur: 0.5, ease: E.p3i });
  Snd.whoosh(0.6, 2600, 300, 0.2);
  await to(c.s, { sc: c.s.sc * 0.02, z: -4 }, { dur: 0.5, ease: E.p3i });
  c.group.visible = false;
  to(flare, { size: 1.3, int: 1.3 }, { dur: 0.6, ease: E.p3o });
  // 1 — le ciel pivote vers la constellation
  buildConstellation(d.con);
  const q0 = sky.q.clone(), q1 = skyQuatFor(d.ra, d.dec, 0);
  const fp0 = flare.mesh.position.clone();
  Snd.whoosh(1.3, 300, 1600, 0.22);
  to(sky, { grid: 1.3 }, { dur: 1.2 });
  await tween({ dur: 1.35, ease: E.sio, update: (e) => {
    sky.q.slerpQuaternions(q0, q1, e);
    flare.mesh.position.set(lerp(fp0.x, 0, E.p3o(e)), lerp(fp0.y, 0, E.p3o(e)), lerp(fp0.z, 0.5, e));
  } });
  sky.driftOn = 0;
  // étoiles puis tracés
  const nS = C.s.length, nL = C.l.length;
  conStarMat.uniforms.uAlpha.value = 1; conLineMat.uniforms.uAlpha.value = 0.85;
  conStarMat.uniforms.uCol.value.setRGB(...col); conLineMat.uniforms.uCol.value.setRGB(col[0] * 0.5 + 0.5, col[1] * 0.5 + 0.5, col[2] * 0.5 + 0.5);
  conStarMat.uniforms.uT.value = 0; conLineMat.uniforms.uDraw.value = 0;
  for (let i = 0; i < nS; i++) setTimeout(() => { if (!skipping) Snd.bell(PENTA[i % PENTA.length] * (i >= PENTA.length ? 2 : 1), 0.05, 0.9, 0, (Math.random() - 0.5)); }, i * 60);
  to(conStarMat.uniforms.uT, { value: nS * 0.06 + 0.3 }, { dur: nS * 0.06 + 0.3, ease: E.lin });
  UI.woCName.textContent = C.name;
  if (!skipping) { UI.show(UI.woC, true); Snd.bell(NOTE.D5, 0.12, 2.4); }
  await wait(0.35);
  await to(conLineMat.uniforms.uDraw, { value: nL }, { dur: Math.min(1.1, 0.25 + nL * 0.07), ease: E.p2io });
  await wait(0.45);
  // 2 — le réticule accroche l'objet
  UI.out(UI.woC);
  to(conLineMat.uniforms.uAlpha, { value: 0.3 }, { dur: 0.5 });
  to(conStarMat.uniforms.uAlpha, { value: 0.55 }, { dur: 0.5 });
  const [ra, de] = d.l2.split('·').map((x) => x.trim());
  $('woRetA').textContent = ra || ''; $('woRetB').textContent = de || '';
  UI.woRet.classList.remove('out', 'lock');
  if (!skipping) { UI.show(UI.woRet, true); Snd.servo(); }
  await wait(0.38);
  addTrauma(0.08);
  UI.woCoord.textContent = d.l1;
  UI.woType.textContent = d.type;
  if (!skipping) { UI.woRet.classList.add('lock'); UI.show(UI.woT, true); Snd.boom(0.35, 80, 40, 0.8); }
  await wait(1.25);
  // 3 — la distance défile
  UI.out(UI.woT);
  const [dist, unit] = DIST_ROLL[d.n] || [d.s[0][1], d.s[0][2]];
  const cols = UI.setDigits(dist);
  UI.woUnit.textContent = unit;
  if (!skipping) UI.show(UI.woD, true);
  await nextFrame(); await nextFrame();
  UI.rollDigits(cols, 0.95);
  const tickT = setInterval(() => { if (!skipping) Snd.tick(0.07); }, 55);
  setTimeout(() => clearInterval(tickT), 900);
  cols.forEach((k, i) => setTimeout(() => { if (!skipping) Snd.tick(0.22); }, (0.95 + i * 0.09) * 1000));
  await wait(1.55);
  // 4 — tension : on plonge vers l'étoile
  UI.out(UI.woD);
  UI.woRet.classList.remove('on', 'lock'); UI.woRet.classList.add('out');
  UI.show(UI.woSkip, false); woLate = true;
  Snd.riser(1.3 / Clock.scale, 0.3); Snd.droneSwell(3000, 1.2 / Clock.scale);
  const fov0 = sky.fov;
  to(conLineMat.uniforms.uAlpha, { value: 0 }, { dur: 0.6 });
  to(conStarMat.uniforms.uAlpha, { value: 0 }, { dur: 0.6 });
  if (!REDUCED) to(post, { zoomBlur: 0.75 }, { dur: 1.2, ease: E.p2i });
  const mythic = t === 4;
  if (mythic) {
    post.lens.set(0.5, 0.5, 0.0, 0);
    tween({ dur: 1.2, ease: E.p2i, update: (e) => { post.lens.z = 0.085 * e; post.lens.w = 1.1 * e; } });
    to(flare, { int: 0.25, size: 3 }, { dur: 1.1, ease: E.p2i });
    to(sky, { bright: 0.45 }, { dur: 1.1 });
  } else {
    to(flare, { int: 2.6, size: 5.5 }, { dur: 1.2, ease: E.p3i });
  }
  const conv = setInterval(() => {
    if (state !== 'walkout') return;
    for (let i = 0; i < (REDUCED ? 3 : 10); i++) {
      const a = Math.random() * TAU, r = 3.5 + Math.random() * 3;
      parts.emit({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0.4, vx: -Math.cos(a) * 2 + Math.sin(a) * (mythic ? 2.5 : 0.8), vy: -Math.sin(a) * 2 - Math.cos(a) * (mythic ? 2.5 : 0.8), vz: 0,
        c: burstColor(t, 1.4 + Math.random() * 1.6), life: 1.1, drag: 0.2, attract: mythic ? 14 : 9, spin: mythic ? 5 : 1.5, s0: 0.05, s1: 0.02 });
    }
  }, 30);
  await tween({ dur: 1.2, ease: E.p2i, update: (e) => { sky.fov = Math.exp(lerp(Math.log(fov0), Math.log(REDUCED ? 30 : 8), e)); } });
  clearInterval(conv);
  // 5 — silence
  Snd.droneStop(0.06);
  if (skipping) { Clock.scale = 1; skipping = false; }
  await wait(0.24);
  // 6 — impact : la planche surgit
  UI.show(UI.woSkip, false); // le minuteur d'affichage a pu se déclencher pendant l'accélération
  sky.fov = fov0; sky.bright = 1; post.zoomBlur = 0; post.lens.w = 0;
  conLineMat.uniforms.uAlpha.value = 0; conStarMat.uniforms.uAlpha.value = 0;
  flare.int = 0;
  post.flashCol.setRGB(col[0] * 0.5 + 0.5, col[1] * 0.5 + 0.5, col[2] * 0.5 + 0.5);
  post.flash = mythic ? 5 : 3.2;
  to(post, { flash: 0 }, { dur: 0.9, ease: E.p3o });
  post.shock.set(0.5, 0.5, 0.0, 1.0);
  tween({ dur: 1.0, ease: E.p2o, update: (e) => { post.shock.z = e * 1.3; post.shock.w = (1 - e) * 1.2; } });
  post.ca = mythic ? 0.035 : 0.02; to(post, { ca: 0 }, { dur: 0.9, ease: E.p2o });
  addTrauma(mythic ? 0.8 : 0.62);
  camPush(0.07, 1.6);
  haptic([30, 40, 70]);
  Snd.impact(t);
  burst(0, LAY.heroY, 0.6, t, t >= 3 ? 520 : 360, t >= 3 ? 7.5 : 6, { grav: 0.5, life: 2.2, drag: 1.2, size: 0.1 });
  heroRays.mesh.position.set(0, LAY.heroY, -0.6);
  heroRays.mesh.scale.setScalar(Math.max(1, LAY.heroS * 1.1));
  heroRays.mat.uniforms.uCol.value.setRGB(...col);
  heroRays.mat.uniforms.uPrism.value = mythic ? 0.55 : t === 2 ? 0.3 : 0;
  heroRays.int = 1.8; to(heroRays, { int: t >= 3 ? 0.5 : 0.36 }, { dur: 1.8, ease: E.p2o });
  c.group.visible = true;
  c.s.x = 0; c.s.y = LAY.heroY; c.s.z = 0.6; c.s.rx = 0; c.s.rz = 0;
  c.s.sc = LAY.heroS * 1.35;
  c.glow = 1.6;
  const spins = mythic ? 2 : 1;
  tween({ dur: 1.05, ease: E.xo, update: (e) => { c.s.ry = lerp(Math.PI + TAU * spins, 0, e); c.s.sc = lerp(LAY.heroS * 1.35, LAY.heroS, e); c.s.z = lerp(0.6, 0.2, e); } });
  to(c, { glow: 0.12 }, { dur: 1.4, ease: E.p2o });
  to(post, { bars: 0, vig: 0.62 }, { dur: 1.2, delay: 0.5, ease: E.p3io });
  heroCard = c;
  await wait(0.75);
  const isNew = markOwned(c);
  c.sweep = -1.2; to(c, { sweep: 2.8 }, { dur: 1.1, ease: E.p2io });
  // 7 — la planche héroïne
  const T = TIERS[t];
  UI.heroT.textContent = `${T.name} · ${T.finish}${isNew ? ' · Nouvelle' : ''}`;
  UI.heroN.textContent = d.name;
  UI.heroS.textContent = `Planche ${pad2(d.n)} / 32 · ${d.type}`;
  UI.show(UI.hero, true);
  c.idle = 1; c.autoTilt = 0.85;
  go('hero');
  busy = false;
  setTimeout(() => { if (state === 'hero') UI.hint('Touchez pour continuer'); }, 1400);
}

// --------------------------- récapitulatif ---------------------------
export async function toSummary() {
  if (state !== 'hero' || busy) return;
  busy = true; go('transition');
  UI.show(UI.hero, false); UI.hint(null);
  to(heroRays, { int: 0 }, { dur: 0.8 });
  to(conStarMat.uniforms.uAlpha, { value: 0 }, { dur: 1 });
  to(conLineMat.uniforms.uAlpha, { value: 0 }, { dur: 1 });
  Snd.whoosh(0.7, 400, 1800, 0.14);
  cards.forEach((c, i) => {
    c.autoTilt = 0; c.tx.t = 0; c.ty.t = 0;
    to(c.s, { ...LAY.sum[i], ry: 0, rx: 0 }, { dur: 0.85, delay: i === 4 ? 0 : 0.08 + i * 0.05, ease: E.p3io });
    c.idle = 0.45;
  });
  await wait(1.0);
  go('summary'); busy = false;
  sky.driftOn = 1;
  UI.show(UI.sum, true);
}
export function pickCard(nx, ny) {
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(nx, ny), cam);
  const hits = rc.intersectObjects(cards.map((c) => c.front), false);
  if (!hits.length) return -1;
  return cards.findIndex((c) => c.front === hits[0].object);
}
export async function inspect(i) {
  if (state !== 'summary' || busy) return;
  busy = true; go('inspect'); inspected = i;
  const c = cards[i];
  Snd.whoosh(0.4, 600, 2400, 0.12);
  cards.forEach((k, j) => { if (j !== i) { to(k, { dim: 0.9 }, { dur: 0.4 }); to(k.s, inspOther(j), { dur: 0.5, delay: j * 0.03, ease: E.p3i }); } });
  to(c.s, { ...LAY.insp, rz: 0 }, { dur: 0.6, ease: E.p3io });
  c.autoTilt = 0.3;
  UI.inspectFill(c);
  UI.show(UI.sum, false);
  UI.show(UI.insp, true);
  if (!view.portrait) UI.hint(IS_TOUCH ? 'Faites pivoter la planche du doigt' : 'Faites glisser pour incliner la planche');
  await wait(0.6);
  busy = false;
}
export async function closeInspect() {
  if (state !== 'inspect' || busy) return;
  busy = true;
  const i = inspected;
  UI.show(UI.insp, false); UI.hint(null);
  cards.forEach((k, j) => { to(k, { dim: 0 }, { dur: 0.4 }); to(k.s, { ...LAY.sum[j] }, j === i ? { dur: 0.55, ease: E.p3io } : { dur: 0.6, delay: 0.05 + j * 0.035, ease: E.p3o }); k.tx.t = 0; k.ty.t = 0; });
  cards[i].autoTilt = 0;
  await wait(0.55);
  inspected = -1; go('summary'); busy = false;
  UI.show(UI.sum, true);
}
export async function newPack() {
  if (state !== 'summary' || busy) return;
  busy = true; go('transition');
  UI.show(UI.sum, false);
  Snd.ensure(); Snd.whoosh(0.7, 1800, 300, 0.16);
  cards.forEach((c, i) => to(c.s, { y: c.s.y - view.visH * 1.2, rz: (Math.random() - 0.5) * 0.8, rx: 0.4 }, { dur: 0.6, delay: i * 0.04, ease: E.p3i }));
  await wait(0.8);
  heroCard = null;
  pack.reset(packType);
  pack.inner.add(pack.stack);
  pack.stack.position.set(0, 0, 0); pack.stack.rotation.set(0, 0, 0); pack.stack.scale.setScalar(1);
  pack.s.ry = 0;
  pack.group.visible = true;
  await fillPack();
  busy = false;
  enterIdle(true);
}
