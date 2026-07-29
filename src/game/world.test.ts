import { describe, expect, it } from 'vitest';
import {
  BUILDING_EDGE_MARGIN,
  BUILDING_MIN_GAP,
  BUILDING_PLACEMENTS,
  ISLANDS,
  RESOURCE_SPAWN_PROFILES,
  WORLD_TWO_RAMPS,
  WORLD_TWO_RESOURCES,
  WORLD_TWO_TERRACES,
  findIslandIndexForPoint,
  findWorldTwoTerraceIndex,
  getWorldTwoSurfaceAt,
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
      .toMatchObject({ islandIndex: 3, x: -1, z: -72.4 });
  });

  it('dessine trois pôles équilibrés autour de la place de chaque île spécialisée', () => {
    [1, 2, 3].forEach((islandIndex) => {
      const island = ISLANDS[islandIndex]!;
      const buildings = BUILDING_PLACEMENTS.filter((building) => building.islandIndex === islandIndex);
      expect(buildings).toHaveLength(3);
      const centroid = buildings.reduce(
        (point, building) => ({ x: point.x + building.x / 3, z: point.z + building.z / 3 }),
        { x: 0, z: 0 },
      );
      expect(Math.hypot(centroid.x - island.x, centroid.z - island.z)).toBeLessThan(0.35);
    });
  });
});

describe('World 2 · montagne du Zénith', () => {
  it('forme onze terrasses strictement ascendantes reliées par dix pentes', () => {
    expect(WORLD_TWO_TERRACES).toHaveLength(11);
    expect(WORLD_TWO_RAMPS).toHaveLength(10);
    WORLD_TWO_TERRACES.slice(1).forEach((terrace, index) => {
      expect(terrace.elevation).toBeGreaterThan(WORLD_TWO_TERRACES[index]!.elevation);
      expect(WORLD_TWO_RAMPS[index]).toMatchObject({ from: index, to: index + 1 });
    });
  });

  it('rend praticables le centre de chaque terrasse et le milieu de chaque pente', () => {
    WORLD_TWO_TERRACES.forEach((terrace, index) => {
      expect(findWorldTwoTerraceIndex(terrace.x, terrace.z)).toBe(index);
      expect(getWorldTwoSurfaceAt(terrace.x, terrace.z)).toBeCloseTo(terrace.elevation);
    });
    WORLD_TWO_RAMPS.forEach((ramp) => {
      const from = WORLD_TWO_TERRACES[ramp.from]!;
      const to = WORLD_TWO_TERRACES[ramp.to]!;
      const middleX = (from.x + to.x) / 2;
      const middleZ = (from.z + to.z) / 2;
      const surface = getWorldTwoSurfaceAt(middleX, middleZ);
      expect(surface).not.toBeNull();
      expect(surface!).toBeGreaterThanOrEqual(from.elevation);
      expect(surface!).toBeLessThanOrEqual(to.elevation);
    });
  });

  it('réserve les cristaux et les filons les plus rares aux hauteurs', () => {
    const lowResources = WORLD_TWO_RESOURCES.filter((spawn) => spawn.terraceIndex <= 2);
    const highResources = WORLD_TWO_RESOURCES.filter((spawn) => spawn.terraceIndex >= 8);
    expect(lowResources.some((spawn) => spawn.kind === 'crystal')).toBe(false);
    expect(highResources.some((spawn) => spawn.kind === 'crystal')).toBe(true);
    expect(highResources.some((spawn) => spawn.rarity === 'Cœur du Zénith')).toBe(true);
  });
});
