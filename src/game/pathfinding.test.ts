import { describe, expect, it } from 'vitest';
import {
  BRIDGE_GEOMETRIES,
  chooseUninformedResourceIndex,
  isPointOnWalkableNetwork,
  planRoute,
} from './pathfinding';

describe('navigation des travailleurs', () => {
  it('refuse de traverser l’eau lorsque le pont manque', () => {
    const route = planRoute({ x: 0, z: 2 }, { x: 0, z: -27 }, [false, false, false, false]);
    expect(route).toBeNull();
  });

  it('passe par les deux extrémités de chaque pont construit', () => {
    const route = planRoute({ x: 0, z: 2 }, { x: -1, z: -69 }, [true, true, true, false]);
    expect(route).not.toBeNull();
    expect(route!.bridgeIndices).toEqual([0, 1, 2]);
    BRIDGE_GEOMETRIES.slice(0, 3).forEach((bridge) => {
      expect(route!.points).toContainEqual(bridge.start);
      expect(route!.points).toContainEqual(bridge.end);
    });
    expect(route!.points.every((point) => isPointOnWalkableNetwork(point, [true, true, true, false]))).toBe(true);
  });

  it('réoriente un renard déjà sur un pont sans le téléporter', () => {
    const bridge = BRIDGE_GEOMETRIES[0]!;
    const midpoint = { x: (bridge.start.x + bridge.end.x) / 2, z: (bridge.start.z + bridge.end.z) / 2 };
    const route = planRoute(midpoint, { x: 5, z: 2 }, [true, false, false, false]);
    expect(route).not.toBeNull();
    expect(route!.bridgeIndices).toContain(0);
    expect(route!.points[0]).toEqual(bridge.start);
    expect(Math.hypot(route!.points[0]!.x - midpoint.x, route!.points[0]!.z - midpoint.z)).toBeLessThan(6);
  });

  it('choisit des filons variés sans utiliser leur distance avant le talent', () => {
    const choices = Array.from({ length: 18 }, (_, cycle) =>
      chooseUninformedResourceIndex('worker-1', cycle, 7));
    expect(choices.every((choice) => choice >= 0 && choice < 7)).toBe(true);
    expect(new Set(choices).size).toBeGreaterThan(3);
    expect(chooseUninformedResourceIndex('worker-1', 4, 7)).toBe(
      chooseUninformedResourceIndex('worker-1', 4, 7),
    );
    expect(chooseUninformedResourceIndex('worker-1', 4, 0)).toBe(-1);
  });
});
