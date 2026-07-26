import { describe, expect, it } from 'vitest';
import {
  RESOURCE_SPAWN_PROFILES,
  findIslandIndexForPoint,
  pickResourceKindForIsland,
} from './world';

describe('profils de repousse par île', () => {
  it('publie des pourcentages complets et respecte les ressources interdites', () => {
    RESOURCE_SPAWN_PROFILES.forEach((profile) => {
      expect(Object.values(profile.weights).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    });

    const satisfied = { wood: 10, stone: 10, copper: 10, crystal: 10 };
    for (let step = 0; step < 100; step += 1) {
      const roll = step / 100;
      expect(pickResourceKindForIsland(0, roll, satisfied)).not.toMatch(/copper|crystal/);
      expect(pickResourceKindForIsland(1, roll, satisfied)).not.toMatch(/copper|crystal/);
      expect(pickResourceKindForIsland(2, roll, satisfied)).not.toBe('crystal');
    }
  });

  it('force les minimums de sécurité avant de reprendre le tirage pondéré', () => {
    expect(pickResourceKindForIsland(0, 0.99, { wood: 0, stone: 0 })).toBe('wood');
    expect(pickResourceKindForIsland(0, 0.99, { wood: 4, stone: 0 })).toBe('stone');
    expect(pickResourceKindForIsland(0, 0.1, { wood: 4, stone: 3 })).toBe('wood');
    expect(pickResourceKindForIsland(0, 0.9, { wood: 4, stone: 3 })).toBe('stone');
  });

  it('retrouve l’île d’un emplacement de ressource', () => {
    expect(findIslandIndexForPoint(0, 0)).toBe(0);
    expect(findIslandIndexForPoint(12.5, -36)).toBe(2);
    expect(findIslandIndexForPoint(14.4, -69.3)).toBe(4);
  });
});
