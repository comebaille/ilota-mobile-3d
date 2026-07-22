import { describe, expect, it } from 'vitest';
import { COSTS, Economy } from './economy';

describe('Economy', () => {
  it('récolte sans produire de valeur négative', () => {
    const economy = new Economy();
    economy.add('wood', 3);
    economy.add('stone', -8);
    expect(economy.progress.wood).toBe(3);
    expect(economy.progress.stone).toBe(0);
  });

  it('construit le camp uniquement quand le coût est disponible', () => {
    const economy = new Economy({ wood: COSTS.camp.wood, stone: COSTS.camp.stone - 1 });
    expect(economy.buildCamp()).toBe(false);
    economy.add('stone');
    expect(economy.buildCamp()).toBe(true);
    expect(economy.progress.wood).toBe(0);
    expect(economy.progress.stone).toBe(0);
  });

  it('impose le camp et les deux travailleurs avant le pont', () => {
    const economy = new Economy({ wood: 99, stone: 99 });
    expect(economy.hire('wood')).toBe(false);
    economy.buildCamp();
    economy.hire('wood');
    expect(economy.buildBridge()).toBe(false);
    economy.hire('stone');
    expect(economy.buildBridge()).toBe(true);
  });

  it('restaure une sauvegarde valide et ignore une sauvegarde cassée', () => {
    const saved = new Economy({ wood: 12, campBuilt: true }).serialize();
    expect(Economy.restore(saved).progress).toMatchObject({ wood: 12, campBuilt: true });
    expect(Economy.restore('{nope').progress.wood).toBe(0);
  });
});
