import {
  RESOURCE_KINDS,
  type Cost,
  type ResourceKind,
  type StructureKind,
} from './economy';
import type { NatureKind } from './assets';

export interface Point2 {
  x: number;
  z: number;
}

export interface IslandDefinition extends Point2 {
  id: string;
  name: string;
  radius: number;
  rotation: number;
  topColor: number;
  shoreColor: number;
}

export interface BridgeDefinition {
  id: string;
  name: string;
  fromIsland: number;
  toIsland: number;
}

export interface StructureDefinition extends Point2 {
  kind: StructureKind;
  name: string;
  radius: number;
  color: number;
}

export interface ProjectHallDefinition extends Point2 {
  islandIndex: 1 | 2 | 3 | 4;
  tier: 1 | 2 | 3 | 4;
  name: string;
  radius: number;
  color: number;
  rotation: number;
}

export interface WarehouseDefinition extends Point2 {
  islandIndex: 0 | 1 | 2 | 3 | 4;
  name: string;
  radius: number;
  rotation: number;
}

export interface BuildingPlacement extends Point2 {
  id: string;
  name: string;
  islandIndex: number;
  radius: number;
  category: 'structure' | 'warehouse' | 'project-hall';
}

export interface ResourceSpawn extends Point2 {
  kind: ResourceKind;
  capacity: number;
  scale: number;
  respawnSeconds: number;
  model?: NatureKind;
}

export interface ResourceSpawnProfile {
  islandId: string;
  weights: Record<ResourceKind, number>;
  minimums: Partial<Record<ResourceKind, number>>;
}

export interface CacheDefinition extends Point2 {
  id: string;
  reward: Cost;
}

export const ISLANDS: readonly IslandDefinition[] = [
  { id: 'marees', name: 'Îlot des Marées', x: 0, z: 0, radius: 12.8, rotation: 0, topColor: 0x7fa655, shoreColor: 0xd9c477 },
  { id: 'pins', name: 'Île des Pins', x: 0, z: -27, radius: 9.8, rotation: 0.1, topColor: 0x6d9e57, shoreColor: 0xd6bf78 },
  { id: 'cuivre', name: 'Île Cuivrée', x: 16, z: -47, radius: 10.1, rotation: 0.23, topColor: 0x879956, shoreColor: 0xccae68 },
  { id: 'cristal', name: 'Île de Cristal', x: -1, z: -69, radius: 10, rotation: -0.14, topColor: 0x769a75, shoreColor: 0xcabf8b },
  { id: 'couronne', name: 'Île Couronne', x: 15, z: -91, radius: 9.8, rotation: 0.31, topColor: 0x819f68, shoreColor: 0xd5bd76 },
];

/**
 * Les poids sont aussi les pourcentages affichés au joueur. Un poids à zéro
 * interdit totalement la ressource sur l'île lors d'une repousse.
 */
export const RESOURCE_SPAWN_PROFILES: readonly ResourceSpawnProfile[] = [
  {
    islandId: 'marees',
    weights: { wood: 55, stone: 45, copper: 0, crystal: 0 },
    minimums: { wood: 4, stone: 3 },
  },
  {
    islandId: 'pins',
    weights: { wood: 60, stone: 40, copper: 0, crystal: 0 },
    minimums: { wood: 2, stone: 2 },
  },
  {
    islandId: 'cuivre',
    weights: { wood: 15, stone: 20, copper: 65, crystal: 0 },
    minimums: { wood: 1, stone: 1, copper: 2 },
  },
  {
    islandId: 'cristal',
    weights: { wood: 10, stone: 15, copper: 25, crystal: 50 },
    minimums: { wood: 1, copper: 1, crystal: 2 },
  },
  {
    islandId: 'couronne',
    weights: { wood: 25, stone: 25, copper: 25, crystal: 25 },
    minimums: { crystal: 1 },
  },
];

export const findIslandIndexForPoint = (x: number, z: number): number => {
  const containing = ISLANDS.findIndex((island) => Math.hypot(x - island.x, z - island.z) <= island.radius);
  if (containing >= 0) return containing;
  return ISLANDS
    .map((island, index) => ({ index, distance: Math.hypot(x - island.x, z - island.z) }))
    .sort((a, b) => a.distance - b.distance)[0]?.index ?? 0;
};

export const pickResourceKindForIsland = (
  islandIndex: number,
  roll: number,
  currentCounts: Partial<Record<ResourceKind, number>> = {},
): ResourceKind => {
  const profile = RESOURCE_SPAWN_PROFILES[islandIndex] ?? RESOURCE_SPAWN_PROFILES[0]!;
  const required = RESOURCE_KINDS.find((kind) =>
    profile.weights[kind] > 0 && (currentCounts[kind] ?? 0) < (profile.minimums[kind] ?? 0));
  if (required) return required;

  const total = RESOURCE_KINDS.reduce((sum, kind) => sum + profile.weights[kind], 0);
  if (total <= 0) return 'wood';
  let cursor = Math.min(0.999999, Math.max(0, roll)) * total;
  for (const kind of RESOURCE_KINDS) {
    cursor -= profile.weights[kind];
    if (cursor < 0 && profile.weights[kind] > 0) return kind;
  }
  return RESOURCE_KINDS.find((kind) => profile.weights[kind] > 0) ?? 'wood';
};

export const BRIDGES: readonly BridgeDefinition[] = [
  { id: 'pins', name: 'Pont des Pins', fromIsland: 0, toIsland: 1 },
  { id: 'cuivre', name: 'Pont Cuivré', fromIsland: 1, toIsland: 2 },
  { id: 'cristal', name: 'Pont des Cristaux', fromIsland: 2, toIsland: 3 },
  { id: 'couronne', name: 'Pont de la Couronne', fromIsland: 3, toIsland: 4 },
];

export const STRUCTURES: readonly StructureDefinition[] = [
  { kind: 'camp', name: 'Camp des Marées', x: 0, z: 0, radius: 1.65, color: 0xf2b958 },
  { kind: 'workshop', name: 'Atelier des Pins', x: -1, z: -27, radius: 1.65, color: 0xe29449 },
  { kind: 'foundry', name: 'Fonderie Cuivrée', x: 16, z: -47, radius: 1.75, color: 0xd47743 },
  // Le Savoir est ramené au foyer : après avoir découvert le cristal, le
  // L’île de Cristal reçoit son bâtiment spécialisé : le grand Autel.
  { kind: 'observatory', name: 'Autel du Savoir', x: -4, z: -65, radius: 1.75, color: 0xb9afe9 },
];

export const WAREHOUSES: readonly WarehouseDefinition[] = [
  { islandIndex: 0, name: 'Dépôt des Marées', x: -5.2, z: 1.2, radius: 1.45, rotation: 0.22 },
  { islandIndex: 1, name: 'Dépôt des Pins', x: 4.5, z: -27.4, radius: 1.45, rotation: -0.28 },
  { islandIndex: 2, name: 'Dépôt Cuivré', x: 20.8, z: -51.5, radius: 1.45, rotation: 0.34 },
  { islandIndex: 3, name: 'Dépôt de Cristal', x: 3.8, z: -69.3, radius: 1.45, rotation: -0.18 },
  { islandIndex: 4, name: 'Dépôt de la Couronne', x: 10.4, z: -91.2, radius: 1.45, rotation: 0.3 },
];

/**
 * Une seule Maison des Travaux par île. Le bâtiment reste identique et ses
 * trois sceaux indiquent physiquement l'avancement des trois projets locaux.
 */
export const PROJECT_HALLS: readonly ProjectHallDefinition[] = [
  { islandIndex: 1, tier: 1, name: 'Maison des Travaux des Pins', x: -5.2, z: -30.1, radius: 1.35, color: 0xd89a4c, rotation: -0.35 },
  { islandIndex: 2, tier: 2, name: 'Maison des Travaux Cuivrée', x: 12.7, z: -41.7, radius: 1.35, color: 0xc97a4a, rotation: -0.2 },
  { islandIndex: 3, tier: 3, name: 'Maison des Travaux de Cristal', x: -4, z: -74.5, radius: 1.35, color: 0x9a8fc4, rotation: 0.3 },
  { islandIndex: 4, tier: 4, name: 'Maison des Travaux de la Couronne', x: 15, z: -84.5, radius: 1.35, color: 0xf2b958, rotation: 0.1 },
];

/**
 * Marge de respiration visuelle entre les emprises déclarées. Cette liste est
 * la source du test anti-collision : tout nouveau bâtiment doit y participer.
 */
export const BUILDING_MIN_GAP = 2;
export const BUILDING_EDGE_MARGIN = 0.9;
export const BUILDING_PLACEMENTS: readonly BuildingPlacement[] = [
  ...STRUCTURES.map((definition) => ({
    id: `structure:${definition.kind}`,
    name: definition.name,
    islandIndex: findIslandIndexForPoint(definition.x, definition.z),
    x: definition.x,
    z: definition.z,
    radius: definition.radius,
    category: 'structure' as const,
  })),
  ...WAREHOUSES.map((definition) => ({
    id: `warehouse:${definition.islandIndex}`,
    name: definition.name,
    islandIndex: definition.islandIndex,
    x: definition.x,
    z: definition.z,
    radius: definition.radius,
    category: 'warehouse' as const,
  })),
  ...PROJECT_HALLS.map((definition) => ({
    id: `project-hall:${definition.islandIndex}`,
    name: definition.name,
    islandIndex: definition.islandIndex,
    x: definition.x,
    z: definition.z,
    radius: definition.radius,
    category: 'project-hall' as const,
  })),
];

export const CACHES: readonly CacheDefinition[] = [
  { id: 'main-cache', x: 9, z: 6, reward: { wood: 4, stone: 4, copper: 0, crystal: 0 } },
  { id: 'pins-cache', x: -7.1, z: -29.2, reward: { wood: 8, stone: 6, copper: 0, crystal: 0 } },
  { id: 'copper-cache', x: 23.1, z: -41.5, reward: { wood: 4, stone: 4, copper: 7, crystal: 0 } },
  { id: 'crystal-cache', x: -7.8, z: -72.1, reward: { wood: 0, stone: 0, copper: 5, crystal: 6 } },
];

export const RESOURCE_SPAWNS: readonly ResourceSpawn[] = [
  { kind: 'wood', model: 'treeA', x: 0, z: 8, capacity: 5, scale: 0.78, respawnSeconds: 10 },
  { kind: 'wood', model: 'treeB', x: -7.5, z: 6, capacity: 7, scale: 0.9, respawnSeconds: 13 },
  { kind: 'wood', model: 'treeA', x: -10, z: 1, capacity: 4, scale: 0.7, respawnSeconds: 9 },
  { kind: 'wood', model: 'treeB', x: -7, z: -7, capacity: 8, scale: 0.98, respawnSeconds: 14 },
  { kind: 'wood', model: 'treeA', x: 6.5, z: 7, capacity: 6, scale: 0.84, respawnSeconds: 11 },
  { kind: 'wood', model: 'treeB', x: -2, z: -9.5, capacity: 5, scale: 0.8, respawnSeconds: 10 },
  { kind: 'stone', model: 'rock', x: 8, z: 3, capacity: 5, scale: 0.82, respawnSeconds: 11 },
  { kind: 'stone', model: 'rock', x: 9, z: -3, capacity: 7, scale: 0.98, respawnSeconds: 14 },
  { kind: 'stone', model: 'rock', x: 6, z: -8, capacity: 4, scale: 0.72, respawnSeconds: 9 },
  { kind: 'stone', model: 'rock', x: -9, z: -5, capacity: 6, scale: 0.88, respawnSeconds: 12 },
  { kind: 'stone', model: 'rock', x: 2.5, z: 10, capacity: 5, scale: 0.8, respawnSeconds: 10 },

  { kind: 'wood', model: 'treeA', x: -6.8, z: -21.8, capacity: 7, scale: 0.92, respawnSeconds: 12 },
  { kind: 'wood', model: 'treeB', x: 5.2, z: -20.2, capacity: 9, scale: 1.04, respawnSeconds: 15 },
  { kind: 'wood', model: 'treeA', x: -6.6, z: -32.2, capacity: 6, scale: 0.84, respawnSeconds: 11 },
  { kind: 'wood', model: 'treeB', x: 6.8, z: -31.3, capacity: 8, scale: 0.96, respawnSeconds: 14 },
  { kind: 'stone', model: 'rock', x: 8, z: -26.7, capacity: 6, scale: 0.88, respawnSeconds: 12 },
  { kind: 'stone', model: 'rock', x: -7.8, z: -27, capacity: 5, scale: 0.8, respawnSeconds: 11 },

  { kind: 'copper', x: 9.5, z: -44.5, capacity: 6, scale: 0.82, respawnSeconds: 13 },
  { kind: 'copper', x: 19, z: -39.7, capacity: 8, scale: 0.98, respawnSeconds: 16 },
  { kind: 'copper', x: 24, z: -49, capacity: 9, scale: 1.08, respawnSeconds: 18 },
  { kind: 'copper', x: 18.5, z: -55, capacity: 7, scale: 0.9, respawnSeconds: 15 },
  { kind: 'stone', model: 'rock', x: 23, z: -53.3, capacity: 7, scale: 0.92, respawnSeconds: 14 },
  { kind: 'wood', model: 'treeA', x: 9.5, z: -51, capacity: 7, scale: 0.9, respawnSeconds: 13 },

  { kind: 'crystal', x: -8.2, z: -63.8, capacity: 5, scale: 0.8, respawnSeconds: 14 },
  { kind: 'crystal', x: 5.8, z: -62.5, capacity: 7, scale: 0.98, respawnSeconds: 17 },
  { kind: 'crystal', x: 7, z: -72, capacity: 8, scale: 1.08, respawnSeconds: 19 },
  { kind: 'crystal', x: -7, z: -75, capacity: 6, scale: 0.9, respawnSeconds: 16 },
  { kind: 'copper', x: -1, z: -78, capacity: 7, scale: 0.88, respawnSeconds: 15 },
  { kind: 'wood', model: 'treeB', x: 7.5, z: -68, capacity: 8, scale: 0.92, respawnSeconds: 14 },

  { kind: 'wood', model: 'treeA', x: 9, z: -85.5, capacity: 9, scale: 1.02, respawnSeconds: 15 },
  { kind: 'stone', model: 'rock', x: 21, z: -85.5, capacity: 9, scale: 1.05, respawnSeconds: 16 },
  { kind: 'copper', x: 9, z: -96.5, capacity: 9, scale: 1.02, respawnSeconds: 17 },
  { kind: 'crystal', x: 21, z: -96.5, capacity: 9, scale: 1.08, respawnSeconds: 19 },
];
