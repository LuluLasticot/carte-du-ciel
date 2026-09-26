import { describe, expect, it } from 'vitest';
import {
  CONSTELLATION_PLATES, CRAFT_COST, DAILY_BONUS, constellationStatus, convertDuplicates, craft, dayKey, duplicatesValue,
  grantConstellationRewards, grantDaily,
} from '../../src/data/economy';
import { type CollectionState, emptyCollection } from '../../src/store/collection';

const state = (cards: Record<number, number>, extra: Partial<CollectionState> = {}): CollectionState => ({ ...emptyCollection(), cards, ...extra });

describe('poussière d\'étoiles', () => {
  it('estime et convertit les doublons selon leur rareté', () => {
    const s = state({ 1: 3, 13: 2, 31: 1 });     // 2 communes et 1 rare en trop
    expect(duplicatesValue(s)).toEqual({ copies: 3, dust: 2 * 5 + 15 });
    const r = convertDuplicates(s);
    expect(r.gained).toBe(25);
    expect(r.state.cards).toEqual({ 1: 1, 13: 1, 31: 1 });
    expect(r.state.dust).toBe(25);
  });

  it('crée une planche manquante si la poussière suffit', () => {
    expect(craft(state({}, { dust: CRAFT_COST[0] - 1 }), 2)).toEqual({ ok: false, error: 'Il manque 1 poussières d\'étoiles.' });
    const r = craft(state({}, { dust: 100 }), 2);
    expect(r.ok && r.state.cards[2]).toBe(1);
    expect(r.ok && r.state.dust).toBe(60);
    expect(craft(state({ 2: 1 }, { dust: 999 }), 2).ok).toBe(false);
  });

  it('récompense une constellation complétée une seule fois', () => {
    const orion = CONSTELLATION_PLATES.ORI;
    expect(orion.sort()).toEqual([16, 17, 27]);
    const before = state({ 16: 1, 17: 1 });
    const after = state({ 16: 1, 17: 1, 27: 1 });
    const first = grantConstellationRewards(before, after);
    expect(first.rewards).toEqual([{ kind: 'constellation', dust: 120, key: 'ORI', label: 'Constellation complète : Orion' }]);
    expect(first.state.rewarded).toContain('ORI');
    const again = grantConstellationRewards(first.state, { ...first.state, cards: { ...first.state.cards, 27: 2 } });
    expect(again.rewards).toEqual([]);
  });

  it('suit l\'avancement de chaque constellation', () => {
    const lyre = constellationStatus(state({ 8: 1 })).find((c) => c.key === 'LYR')!;
    expect(lyre).toMatchObject({ name: 'Lyre', owned: 1, complete: false });
    expect(lyre.plates.length).toBe(2);
  });

  it('verse la prime du jour une seule fois par jour', () => {
    const d1 = new Date(2026, 8, 26, 9), d2 = new Date(2026, 8, 26, 23), d3 = new Date(2026, 8, 27, 0, 5);
    const a = grantDaily(state({}), d1);
    expect(a.reward?.dust).toBe(DAILY_BONUS);
    expect(a.state.lastDaily).toBe(dayKey(d1));
    expect(grantDaily(a.state, d2).reward).toBeNull();
    expect(grantDaily(a.state, d3).reward?.dust).toBe(DAILY_BONUS);
  });
});
