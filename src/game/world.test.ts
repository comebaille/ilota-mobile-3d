import { describe, expect, it } from 'vitest';
import {
  BUILDING_EDGE_MARGIN,
  BUILDING_MIN_GAP,
  BUILDING_PLACEMENTS,
  ISLANDS,
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
    expect(findIslandIndexForPoint(16, -47)).toBe(2);
    expect(findIslandIndexForPoint(15, -91)).toBe(4);
  });
});

describe('implantation des bâtiments', () => {
  it('garde chaque bâtiment dans son île avec une marge visible', () => {
    BUILDING_PLACEMENTS.forEach((building) => {
      const island = ISLANDS[building.islandIndex];
      expect(island, `${building.name} doit appartenir à une île`).toBeDefined();
      const distanceFromCenter = Math.hypot(building.x - island!.x, building.z - island!.z);
      expect(
        island!.radius - distanceFromCenter - building.radius,
        `${building.name} est trop près de la rive`,
      ).toBeGreaterThanOrEqual(BUILDING_EDGE_MARGIN);
    });
  });

  it('laisse au moins deux unités libres entre toutes les emprises bâties', () => {
    BUILDING_PLACEMENTS.forEach((building, index) => {
      BUILDING_PLACEMENTS.slice(index + 1)
        .filter((other) => other.islandIndex === building.islandIndex)
        .forEach((other) => {
          const distance = Math.hypot(building.x - other.x, building.z - other.z);
          const gap = distance - building.radius - other.radius;
          expect(
            gap,
            `${building.name} et ${other.name} sont trop proches`,
          ).toBeGreaterThanOrEqual(BUILDING_MIN_GAP);
        });
    });
  });

  it('place l’Autel du Savoir comme bâtiment spécialisé de l’île de Cristal', () => {
    expect(BUILDING_PLACEMENTS.find((building) => building.id === 'structure:observatory'))
      .toMatchObject({ islandIndex: 3, x: -4, z: -65 });
  });
});
