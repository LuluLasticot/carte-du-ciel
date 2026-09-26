import { describe, expect, it } from 'vitest';
import { type FlowState, TRANSITIONS, canGo } from '../../src/flow/machine';

const states = Object.keys(TRANSITIONS) as FlowState[];

function reachable(from: FlowState): Set<FlowState> {
  const seen = new Set<FlowState>([from]);
  const queue = [from];
  while (queue.length) for (const n of TRANSITIONS[queue.shift()!]) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  return seen;
}

describe('machine d\'états', () => {
  it('ne mène que vers des états déclarés', () => {
    for (const s of states) for (const n of TRANSITIONS[s]) expect(states).toContain(n);
  });

  it('rend chaque état atteignable depuis le chargement', () => {
    expect(reachable('loading')).toEqual(new Set(states));
  });

  it('permet toujours de revenir à une nouvelle pochette (sauf la galerie de débogage)', () => {
    for (const s of states.filter((s) => s !== 'gallery' && s !== 'loading')) expect(reachable(s).has('idle'), s).toBe(true);
  });

  it('suit le déroulé d\'une ouverture complète', () => {
    const path: FlowState[] = ['loading', 'idle', 'tearing', 'opening', 'reveal', 'walkout', 'hero', 'transition', 'summary', 'inspect', 'summary', 'transition', 'idle'];
    for (let i = 1; i < path.length; i++) expect(canGo(path[i - 1], path[i]), `${path[i - 1]} → ${path[i]}`).toBe(true);
  });

  it('refuse les raccourcis', () => {
    expect(canGo('idle', 'reveal')).toBe(false);
    expect(canGo('reveal', 'summary')).toBe(false);
    expect(canGo('walkout', 'idle')).toBe(false);
  });
});
