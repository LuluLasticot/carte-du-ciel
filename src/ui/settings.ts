// Panneau « Réglages » : collection (export / import), qualité graphique, gyroscope, installation.
import { $ } from '../core/dom';
import { pad2 } from '../core/util';
import { motion } from '../core/motion';
import { applyQuality, quality } from '../render/engine';
import { LEVELS, type QualityChoice, type QualityLevel } from '../render/quality';
import {
  collection, copiesCount, exportFileName, ownedCount, parseExport, replaceCollection, serialize, type CollectionState,
} from '../store/collection';
import { saveSettings, settings } from '../store/settings';
import { UI } from './ui';

export const LEVEL_NAMES: Record<QualityLevel, string> = { low: 'Économie', medium: 'Standard', high: 'Maximale' };

const el = {
  panel: $('settings'), open: $('setBtn'), close: $('setClose'),
  plates: $('stPlates'), copies: $('stCopies'), packs: $('stPacks'),
  exportBtn: $('exportBtn'), importBtn: $('importBtn'), file: $('importFile') as HTMLInputElement,
  confirm: $('importConfirm'), confirmMsg: $('importMsg'), yes: $('importYes'), no: $('importNo'), colNote: $('colNote'),
  qualSeg: $('qualSeg'), qualNote: $('qualNote'),
  motionGrp: $('motionGrp'), motionChk: $('motionChk') as HTMLInputElement,
  installGrp: $('installGrp'), installBtn: $('installBtn'), installNote: $('installNote'),
};
const DEFAULT_NOTE = el.colNote.textContent;
let pendingImport: CollectionState | null = null;
let installEvent: any = null;

export function settingsOpen() { return el.panel.classList.contains('on'); }

export function openSettings() {
  refresh();
  UI.show(el.panel, true);
  el.open.setAttribute('aria-expanded', 'true');
  el.close.focus({ preventScroll: true });
}
export function closeSettings() {
  if (!settingsOpen()) return;
  UI.show(el.panel, false);
  el.open.setAttribute('aria-expanded', 'false');
  cancelImport();
  el.open.focus({ preventScroll: true });
}

function note(text: string, kind: '' | 'ok' | 'err' = '') {
  el.colNote.textContent = text;
  el.colNote.className = 'note' + (kind ? ' ' + kind : '');
}

function refresh() {
  el.plates.textContent = pad2(ownedCount(collection));
  el.copies.textContent = String(copiesCount(collection));
  el.packs.textContent = String(collection.packs);
  for (const b of el.qualSeg.querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.q === settings.quality));
  const lowered = LEVELS.indexOf(quality.level) < LEVELS.indexOf(quality.detected);
  el.qualNote.textContent = settings.quality === 'auto'
    ? `Réglée automatiquement sur ${LEVEL_NAMES[quality.level]}${lowered ? `, abaissée depuis ${LEVEL_NAMES[quality.detected]} pour garder la fluidité` : ''}.`
    : `Pour cet appareil, le réglage automatique choisirait ${LEVEL_NAMES[quality.detected]}.`;
  el.motionGrp.hidden = !motion.supported;
  el.motionChk.checked = settings.motion;
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  el.installBtn.hidden = !installEvent;
  el.installNote.textContent = installEvent
    ? 'Ajoutez Carte du Ciel à vos applications pour l’ouvrir en plein écran, même hors ligne.'
    : ios && !standalone ? 'Sur iPhone et iPad : touchez Partager, puis « Sur l’écran d’accueil ».' : '';
  el.installGrp.hidden = standalone || (!installEvent && !(ios && !standalone));
}

function cancelImport() {
  pendingImport = null;
  el.confirm.hidden = true;
  el.file.value = '';
}

function exportCollection() {
  const blob = new Blob([serialize(collection)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = exportFileName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  note(`Fichier ${a.download} enregistré dans vos téléchargements.`, 'ok');
}

async function readImport(file: File) {
  const res = parseExport(await file.text());
  if ('error' in res) { cancelImport(); note(res.error, 'err'); return; }
  pendingImport = res.state;
  const cur = ownedCount(collection), next = ownedCount(res.state);
  el.confirmMsg.textContent = `Remplacer votre collection (${cur} planche${cur > 1 ? 's' : ''}, ${collection.packs} pochette${collection.packs > 1 ? 's' : ''}) par celle du fichier (${next} planche${next > 1 ? 's' : ''}, ${res.state.packs} pochette${res.state.packs > 1 ? 's' : ''}) ?`;
  el.confirm.hidden = false;
  note(DEFAULT_NOTE);
  el.yes.focus();
}

async function confirmImport() {
  if (!pendingImport) return;
  await replaceCollection(pendingImport);
  cancelImport();
  UI.setCount(ownedCount(collection));
  refresh();
  note('Collection importée.', 'ok');
}

function chooseQuality(q: QualityChoice) {
  saveSettings({ quality: q });
  applyQuality(q === 'auto' ? quality.detected : q);
  refresh();
}

export function initSettings() {
  el.open.addEventListener('click', () => (settingsOpen() ? closeSettings() : openSettings()));
  el.close.addEventListener('click', closeSettings);
  el.exportBtn.addEventListener('click', exportCollection);
  el.importBtn.addEventListener('click', () => el.file.click());
  el.file.addEventListener('change', () => { const f = el.file.files?.[0]; if (f) void readImport(f); });
  el.yes.addEventListener('click', () => void confirmImport());
  el.no.addEventListener('click', () => { cancelImport(); note(DEFAULT_NOTE); el.importBtn.focus(); });
  el.qualSeg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b?.dataset.q) chooseQuality(b.dataset.q as QualityChoice);
  });
  el.motionChk.addEventListener('change', () => {
    saveSettings({ motion: el.motionChk.checked });
    if (el.motionChk.checked) void motion.enable(); else motion.disable();
  });
  el.installBtn.addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch (e) { /* ignoré */ }
    installEvent = null;
    refresh();
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; if (settingsOpen()) refresh(); });
  window.addEventListener('appinstalled', () => { installEvent = null; if (settingsOpen()) refresh(); });
  // un clic hors du panneau le ferme (sans déclencher d'action dans la scène)
  document.addEventListener('pointerdown', (e) => {
    if (settingsOpen() && !el.panel.contains(e.target as Node) && !el.open.contains(e.target as Node)) {
      e.stopPropagation(); e.preventDefault(); closeSettings();
    }
  }, true);
}
