// Réglages du joueur, gardés dans le navigateur.
import type { QualityChoice } from '../render/quality';
import { store } from './storage';

export interface Settings {
  quality: QualityChoice;
  /** inclinaison des planches avec le gyroscope (téléphones) */
  motion: boolean;
}

const KEY = 'cdc.settings';
const DEFAULTS: Settings = { quality: 'auto', motion: true };

export const settings: Settings = { ...DEFAULTS, ...store.get<Partial<Settings>>(KEY, {}) };

export function saveSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  store.set(KEY, settings);
}
