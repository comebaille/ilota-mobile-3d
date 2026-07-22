import { BRIDGES, ISLANDS, type BridgeDefinition, type IslandDefinition, type Point2 } from './world';

export interface BridgeGeometry {
  index: number;
  fromIsland: number;
  toIsland: number;
  start: Point2;
  end: Point2;
  length: number;
}

export interface PlannedRoute {
  points: Point2[];
  islandPath: number[];
  bridgeIndices: number[];
  distance: number;
}

interface StartCandidate {
  island: number;
  prefix: Point2[];
  bridgeIndex?: number;
}

const distance = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.z - b.z);

const distanceToSegment = (point: Point2, start: Point2, end: Point2): number => {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 0.0001) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return distance(point, { x: start.x + dx * t, z: start.z + dz * t });
};

export const getBridgeGeometry = (
  definition: BridgeDefinition,
  index: number,
  islands: readonly IslandDefinition[] = ISLANDS,
): BridgeGeometry | null => {
  const from = islands[definition.fromIsland];
  const to = islands[definition.toIsland];
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const magnitude = Math.max(0.001, Math.hypot(dx, dz));
  const ux = dx / magnitude;
  const uz = dz / magnitude;
  const start = { x: from.x + ux * (from.radius - 0.7), z: from.z + uz * (from.radius - 0.7) };
  const end = { x: to.x - ux * (to.radius - 0.7), z: to.z - uz * (to.radius - 0.7) };
  return { index, fromIsland: definition.fromIsland, toIsland: definition.toIsland, start, end, length: distance(start, end) };
};

export const BRIDGE_GEOMETRIES: readonly BridgeGeometry[] = BRIDGES
  .map((bridge, index) => getBridgeGeometry(bridge, index))
  .filter((bridge): bridge is BridgeGeometry => Boolean(bridge));

export const findIslandAt = (point: Point2, islands: readonly IslandDefinition[] = ISLANDS): number => {
  const inside = islands.findIndex((island) => distance(point, island) <= island.radius + 0.08);
  return inside;
};

const builtGeometries = (
  builtBridges: readonly boolean[],
  bridges: readonly BridgeGeometry[],
): BridgeGeometry[] => bridges.filter((bridge) => builtBridges[bridge.index]);

const findStartCandidates = (
  start: Point2,
  builtBridges: readonly boolean[],
  islands: readonly IslandDefinition[],
  bridges: readonly BridgeGeometry[],
): StartCandidate[] => {
  const island = findIslandAt(start, islands);
  if (island >= 0) return [{ island, prefix: [] }];

  const nearby = builtGeometries(builtBridges, bridges)
    .filter((bridge) => distanceToSegment(start, bridge.start, bridge.end) <= 2.25)
    .sort((a, b) => distanceToSegment(start, a.start, a.end) - distanceToSegment(start, b.start, b.end))[0];
  if (!nearby) return [];
  return [
    { island: nearby.fromIsland, prefix: [nearby.start], bridgeIndex: nearby.index },
    { island: nearby.toIsland, prefix: [nearby.end], bridgeIndex: nearby.index },
  ];
};

const shortestIslandPath = (
  startIsland: number,
  targetIsland: number,
  builtBridges: readonly boolean[],
  islands: readonly IslandDefinition[],
  bridges: readonly BridgeGeometry[],
): { islands: number[]; edges: BridgeGeometry[] } | null => {
  if (startIsland === targetIsland) return { islands: [startIsland], edges: [] };
  const distances = new Map<number, number>(islands.map((_, index) => [index, Number.POSITIVE_INFINITY]));
  const previous = new Map<number, { island: number; bridge: BridgeGeometry }>();
  const unvisited = new Set(islands.map((_, index) => index));
  distances.set(startIsland, 0);

  while (unvisited.size) {
    const current = [...unvisited].sort((a, b) => (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity))[0];
    if (current === undefined || !Number.isFinite(distances.get(current))) break;
    unvisited.delete(current);
    if (current === targetIsland) break;
    builtGeometries(builtBridges, bridges).forEach((bridge) => {
      const neighbor = bridge.fromIsland === current ? bridge.toIsland : bridge.toIsland === current ? bridge.fromIsland : -1;
      if (neighbor < 0 || !unvisited.has(neighbor)) return;
      const currentIsland = islands[current];
      const neighborIsland = islands[neighbor];
      if (!currentIsland || !neighborIsland) return;
      const entry = bridge.fromIsland === current ? bridge.start : bridge.end;
      const exit = bridge.fromIsland === current ? bridge.end : bridge.start;
      const weight = distance(currentIsland, entry) + bridge.length + distance(exit, neighborIsland);
      const candidate = (distances.get(current) ?? Infinity) + weight;
      if (candidate < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, candidate);
        previous.set(neighbor, { island: current, bridge });
      }
    });
  }

  if (!previous.has(targetIsland)) return null;
  const reversedIslands = [targetIsland];
  const reversedEdges: BridgeGeometry[] = [];
  let cursor = targetIsland;
  while (cursor !== startIsland) {
    const step = previous.get(cursor);
    if (!step) return null;
    reversedEdges.push(step.bridge);
    cursor = step.island;
    reversedIslands.push(cursor);
  }
  return { islands: reversedIslands.reverse(), edges: reversedEdges.reverse() };
};

const pushDistinct = (points: Point2[], point: Point2): void => {
  const last = points[points.length - 1];
  if (!last || distance(last, point) > 0.025) points.push({ x: point.x, z: point.z });
};

const routeDistance = (start: Point2, points: readonly Point2[]): number => {
  let total = 0;
  let cursor = start;
  points.forEach((point) => {
    total += distance(cursor, point);
    cursor = point;
  });
  return total;
};

export const planRoute = (
  start: Point2,
  target: Point2,
  builtBridges: readonly boolean[],
  islands: readonly IslandDefinition[] = ISLANDS,
  bridges: readonly BridgeGeometry[] = BRIDGE_GEOMETRIES,
): PlannedRoute | null => {
  const targetIsland = findIslandAt(target, islands);
  if (targetIsland < 0) return null;
  const candidates = findStartCandidates(start, builtBridges, islands, bridges);
  const routes: PlannedRoute[] = [];

  candidates.forEach((candidate) => {
    const islandRoute = shortestIslandPath(candidate.island, targetIsland, builtBridges, islands, bridges);
    if (!islandRoute) return;
    const points: Point2[] = [];
    candidate.prefix.forEach((point) => pushDistinct(points, point));
    islandRoute.edges.forEach((bridge, edgeIndex) => {
      const fromIsland = islandRoute.islands[edgeIndex];
      const forward = bridge.fromIsland === fromIsland;
      pushDistinct(points, forward ? bridge.start : bridge.end);
      pushDistinct(points, forward ? bridge.end : bridge.start);
    });
    pushDistinct(points, target);
    const bridgeIndices = islandRoute.edges.map((bridge) => bridge.index);
    if (candidate.bridgeIndex !== undefined && !bridgeIndices.includes(candidate.bridgeIndex)) bridgeIndices.unshift(candidate.bridgeIndex);
    routes.push({ points, islandPath: islandRoute.islands, bridgeIndices, distance: routeDistance(start, points) });
  });

  return routes.sort((a, b) => a.distance - b.distance)[0] ?? null;
};

export const isPointOnWalkableNetwork = (
  point: Point2,
  builtBridges: readonly boolean[],
  islands: readonly IslandDefinition[] = ISLANDS,
  bridges: readonly BridgeGeometry[] = BRIDGE_GEOMETRIES,
): boolean => findIslandAt(point, islands) >= 0
  || builtGeometries(builtBridges, bridges).some((bridge) => distanceToSegment(point, bridge.start, bridge.end) <= 2.2);
