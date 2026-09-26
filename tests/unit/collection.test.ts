import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  addCard, collection, countPack, estimatePacks, exportFileName, loadCollection, migrateLegacy, normalize, parseExport,
  replaceCollection, serialize,
} from '../../src/store/collection';

describe('collection : format et validation', () => {
  it('reprend l\'ancien format du prototype en estimant les pochettes ouvertes', () => {
    expect(migrateLegacy({ 1: 2, 7: 1, 31: 1, 12: 1 })).toEqual({ cards: { 1: 2, 7: 1, 12: 1, 31: 1 }, packs: 1 });
    expect(migrateLegacy({})).toBeNull();
    expect(migrateLegacy({ 99: 1 })).toBeNull();
    expect(migrateLegacy('n\'importe quoi')).toBeNull();
  });

  it('refuse les planches inconnues et les quantités invalides', () => {
    expect(normalize({ cards: { 0: 1 }, packs: 1 })).toBeNull();
    expect(normalize({ cards: { 33: 1 }, packs: 1 })).toBeNull();
    expect(normalize({ cards: { 3: 1.5 }, packs: 1 })).toBeNull();
    expect(normalize({ cards: { 3: -1 }, packs: 1 })).toBeNull();
    expect(normalize({ cards: [1, 2], packs: 1 })).toBeNull();
  });

  it('garde un nombre de pochettes cohérent avec les planches possédées', () => {
    expect(estimatePacks({ 1: 5, 2: 5 })).toBe(2);
    expect(normalize({ cards: { 1: 5, 2: 6 }, packs: 1 })!.packs).toBe(3);
  });

  it('exporte puis réimporte une collection à l\'identique', () => {
    const state = { cards: { 1: 3, 14: 1, 31: 2 }, packs: 4 };
    const text = serialize(state, new Date('2026-09-26T10:00:00Z'));
    expect(JSON.parse(text)).toMatchObject({ format: 'carte-du-ciel/collection', version: 1, exportedAt: '2026-09-26T10:00:00.000Z' });
    expect(parseExport(text)).toEqual({ ok: true, state });
  });

  it('explique pourquoi un fichier est refusé', () => {
    const bad = (t: string) => { const r = parseExport(t); return 'error' in r ? r.error : ''; };
    expect(bad('pas du json')).toMatch(/JSON/);
    expect(bad('{"format":"autre"}')).toMatch(/pas une sauvegarde/);
    expect(bad('{"format":"carte-du-ciel/collection","version":9,"cards":{}}')).toMatch(/plus récente/);
    expect(bad('{"format":"carte-du-ciel/collection","version":1,"cards":{"40":1}}')).toMatch(/inconnues/);
  });

  it('nomme le fichier d\'export avec la date', () => {
    expect(exportFileName(new Date('2026-09-26T23:00:00Z'))).toBe('carte-du-ciel-collection-2026-09-26.json');
  });
});

describe('collection : persistance IndexedDB', () => {
  it('enregistre les planches et les pochettes, puis les relit', async () => {
    await loadCollection();
    expect(collection).toEqual({ cards: {}, packs: 0 });
    countPack();
    expect(addCard(5)).toBe(true);
    expect(addCard(5)).toBe(false);
    addCard(31);
    await replaceCollection({ ...collection });
    collection.cards = {}; collection.packs = 0;
    await loadCollection();
    expect(collection).toEqual({ cards: { 5: 2, 31: 1 }, packs: 1 });
  });
});
