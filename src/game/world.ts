import {
  RESOURCE_KINDS,
  type Cost,
  type ResourceKind,
  type StructureKind,
  type WorldTwoMineralId,
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
  rotation: number;
}

export interface ProjectHallDefinition extends Point2 {
  islandIndex: 0 | 1 | 2 | 3 | 4;
  tier: 0 | 1 | 2 | 3 | 4;
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

export interface WorldTwoTerraceDefinition extends Point2 {
  id: string;
  name: string;
  radius: number;
  elevation: number;
  topColor: number;
  sideColor: number;
}

export interface WorldTwoRampDefinition {
  from: number;
  to: number;
  width: number;
}

export interface WorldTwoResourceSpawn {
  terraceIndex: number;
  kind: WorldTwoMineralId;
  dx: number;
  dz: number;
  capacity: number;
  scale: number;
  respawnSeconds: number;
  rarity: string;
}

export const ISLANDS: readonly IslandDefinition[] = [
  { id: 'marees', name: 'Îlot des Marées', x: 0, z: 0, radius: 12.8, rotation: 0, topColor: 0x7fa655, shoreColor: 0xd9c477 },
  { id: 'pins', name: 'Île des Pins', x: 0, z: -27, radius: 9.8, rotation: 0.1, topColor: 0x6d9e57, shoreColor: 0xd6bf78 },
  { id: 'cuivre', name: 'Île Cuivrée', x: 16, z: -47, radius: 10.1, rotation: 0.23, topColor: 0x879956, shoreColor: 0xccae68 },
  { id: 'cristal', name: 'Île de Cristal', x: -1, z: -69, radius: 10, rotation: -0.14, topColor: 0x769a75, shoreColor: 0xcabf8b },
  { id: 'couronne', name: 'Île Couronne', x: 15, z: -91, radius: 9.8, rotation: 0.31, topColor: 0x819f68, shoreColor: 0xd5bd76 },
];

export const WORLD_TWO_TERRACES: readonly WorldTwoTerraceDefinition[] = [
  { id: 'echo-base', name: 'Camp des Échos', x: 160, z: 0, radius: 9, elevation: 0, topColor: 0x4d5652, sideColor: 0x30383a },
  { id: 'coal-throat', name: 'Gorge du Charbon', x: 160, z: -15, radius: 7.2, elevation: 1.5, topColor: 0x474b49, sideColor: 0x292e31 },
  { id: 'iron-bastion', name: 'Bastion de Fer', x: 171, z: -27, radius: 7, elevation: 3.1, topColor: 0x535b5e, sideColor: 0x30363b },
  { id: 'wolf-pass', name: 'Passe des Loups', x: 159, z: -39, radius: 7.1, elevation: 4.8, topColor: 0x4e595b, sideColor: 0x2c3338 },
  { id: 'wind-ledges', name: 'Corniches du Vent', x: 147, z: -51, radius: 6.8, elevation: 6.5, topColor: 0x566062, sideColor: 0x30353a },
  { id: 'silver-gallery', name: 'Galerie d’Argent', x: 159, z: -63, radius: 7.1, elevation: 8.2, topColor: 0x62696c, sideColor: 0x383d43 },
  { id: 'sentinel-pass', name: 'Passe des Sentinelles', x: 172, z: -75, radius: 6.7, elevation: 10, topColor: 0x5b6267, sideColor: 0x343942 },
  { id: 'cloud-basin', name: 'Vasque des Nuages', x: 160, z: -87, radius: 7, elevation: 11.8, topColor: 0x697176, sideColor: 0x3d424b },
  { id: 'gold-scree', name: 'Éboulis Doré', x: 148, z: -99, radius: 6.6, elevation: 13.6, topColor: 0x716c60, sideColor: 0x464137 },
  { id: 'astral-ridge', name: 'Crête Astrale', x: 159, z: -111, radius: 6.9, elevation: 15.5, topColor: 0x696675, sideColor: 0x403d4d },
  { id: 'zenith', name: 'Sommet du Zénith', x: 160, z: -126, radius: 8.4, elevation: 17.5, topColor: 0x79758b, sideColor: 0x484456 },
];

export const WORLD_TWO_RAMPS: readonly WorldTwoRampDefinition[] = WORLD_TWO_TERRACES
  .slice(0, -1)
  .map((_, index) => ({ from: index, to: index + 1, width: index >= 7 ? 3.6 : 4.2 }));

export const WORLD_TWO_RESOURCES: readonly WorldTwoResourceSpawn[] = [
  { terraceIndex: 0, kind: 'stone', dx: -3.5, dz: 3.4, capacity: 16, scale: 0.9, respawnSeconds: 10, rarity: 'Pierre de contrefort' },
  { terraceIndex: 1, kind: 'slate', dx: -3.5, dz: -1.4, capacity: 15, scale: 0.94, respawnSeconds: 11, rarity: 'Ardoise sombre' },
  { terraceIndex: 1, kind: 'coal', dx: 3.5, dz: -1.3, capacity: 14, scale: 0.98, respawnSeconds: 12, rarity: 'Charbon noir' },
  { terraceIndex: 1, kind: 'tin', dx: 0, dz: 3.5, capacity: 14, scale: 0.96, respawnSeconds: 13, rarity: 'Étain brut' },
  { terraceIndex: 2, kind: 'copper', dx: -3.5, dz: -1.4, capacity: 13, scale: 1, respawnSeconds: 14, rarity: 'Cuivre rouge' },
  { terraceIndex: 2, kind: 'iron', dx: 3.5, dz: -1.3, capacity: 13, scale: 1.04, respawnSeconds: 15, rarity: 'Fer de gorge' },
  { terraceIndex: 2, kind: 'zinc', dx: 0, dz: 3.5, capacity: 13, scale: 1, respawnSeconds: 16, rarity: 'Zinc mat' },
  { terraceIndex: 3, kind: 'nickel', dx: -3.5, dz: -1.4, capacity: 12, scale: 1.02, respawnSeconds: 17, rarity: 'Nickel alpin' },
  { terraceIndex: 3, kind: 'cobalt', dx: 3.5, dz: -1.3, capacity: 12, scale: 1.04, respawnSeconds: 18, rarity: 'Cobalt profond' },
  { terraceIndex: 3, kind: 'silver', dx: 0, dz: 3.4, capacity: 12, scale: 1.02, respawnSeconds: 19, rarity: 'Argent brut' },
  { terraceIndex: 4, kind: 'quartz', dx: -3.3, dz: -1.2, capacity: 11, scale: 1.06, respawnSeconds: 20, rarity: 'Quartz du vent' },
  { terraceIndex: 4, kind: 'amethyst', dx: 3.3, dz: -1.1, capacity: 11, scale: 1.08, respawnSeconds: 21, rarity: 'Améthyste vive' },
  { terraceIndex: 4, kind: 'garnet', dx: 0, dz: 3.3, capacity: 11, scale: 1.06, respawnSeconds: 22, rarity: 'Grenat du vent' },
  { terraceIndex: 5, kind: 'topaz', dx: -3.4, dz: -1.2, capacity: 10, scale: 1.08, respawnSeconds: 23, rarity: 'Topaze solaire' },
  { terraceIndex: 5, kind: 'emerald', dx: 3.4, dz: -1.1, capacity: 10, scale: 1.1, respawnSeconds: 24, rarity: 'Émeraude alpine' },
  { terraceIndex: 5, kind: 'sapphire', dx: 0, dz: 3.4, capacity: 10, scale: 1.08, respawnSeconds: 25, rarity: 'Saphir de galerie' },
  { terraceIndex: 6, kind: 'ruby', dx: -3.2, dz: -1.1, capacity: 9, scale: 1.1, respawnSeconds: 26, rarity: 'Rubis ardent' },
  { terraceIndex: 6, kind: 'platinum', dx: 3.2, dz: -1, capacity: 9, scale: 1.12, respawnSeconds: 27, rarity: 'Platine blanc' },
  { terraceIndex: 6, kind: 'obsidian', dx: 0, dz: 3.2, capacity: 9, scale: 1.1, respawnSeconds: 28, rarity: 'Obsidienne volcanique' },
  { terraceIndex: 7, kind: 'opal', dx: -3.3, dz: -1.1, capacity: 9, scale: 1.12, respawnSeconds: 29, rarity: 'Opale spectrale' },
  { terraceIndex: 7, kind: 'jade', dx: 3.3, dz: -1, capacity: 8, scale: 1.14, respawnSeconds: 30, rarity: 'Jade des sentinelles' },
  { terraceIndex: 7, kind: 'onyx', dx: 0, dz: 3.2, capacity: 8, scale: 1.12, respawnSeconds: 31, rarity: 'Onyx des nuages' },
  { terraceIndex: 8, kind: 'moonstone', dx: -3.1, dz: -1, capacity: 8, scale: 1.14, respawnSeconds: 32, rarity: 'Pierre de lune' },
  { terraceIndex: 8, kind: 'star_iron', dx: 3.1, dz: -0.9, capacity: 8, scale: 1.16, respawnSeconds: 33, rarity: 'Fer stellaire' },
  { terraceIndex: 8, kind: 'mithril', dx: 0, dz: 3.1, capacity: 8, scale: 1.14, respawnSeconds: 34, rarity: 'Mithril pur' },
  { terraceIndex: 9, kind: 'adamantite', dx: -3.3, dz: -1, capacity: 7, scale: 1.16, respawnSeconds: 35, rarity: 'Adamantite rouge' },
  { terraceIndex: 9, kind: 'void_crystal', dx: 3.3, dz: -0.9, capacity: 7, scale: 1.18, respawnSeconds: 36, rarity: 'Cristal du Vide' },
  { terraceIndex: 9, kind: 'solarite', dx: 0, dz: 3.1, capacity: 7, scale: 1.2, respawnSeconds: 37, rarity: 'Solarite' },
  { terraceIndex: 10, kind: 'diamond', dx: -3.4, dz: 0, capacity: 6, scale: 1.24, respawnSeconds: 39, rarity: 'Diamant du Zénith' },
  { terraceIndex: 10, kind: 'celestium', dx: 3.4, dz: 0, capacity: 8, scale: 1.42, respawnSeconds: 44, rarity: 'Cœur de Célestium' },
];

const distanceToWorldTwoSegment = (
  x: number,
  z: number,
  from: WorldTwoTerraceDefinition,
  to: WorldTwoTerraceDefinition,
): { distance: number; ratio: number } => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  const ratio = Math.max(0, Math.min(1, ((x - from.x) * dx + (z - from.z) * dz) / Math.max(0.001, lengthSquared)));
  const nearestX = from.x + dx * ratio;
  const nearestZ = from.z + dz * ratio;
  return { distance: Math.hypot(x - nearestX, z - nearestZ), ratio };
};

export const findWorldTwoTerraceIndex = (x: number, z: number): number =>
  WORLD_TWO_TERRACES.reduce((best, terrace, index) => {
    const distance = Math.hypot(x - terrace.x, z - terrace.z);
    return distance <= terrace.radius && terrace.elevation >= (WORLD_TWO_TERRACES[best]?.elevation ?? -Infinity)
      ? index
      : best;
  }, -1);

export const getWorldTwoSurfaceAt = (x: number, z: number): number | null => {
  const terraceIndex = findWorldTwoTerraceIndex(x, z);
  if (terraceIndex >= 0) return WORLD_TWO_TERRACES[terraceIndex]!.elevation;
  for (const ramp of WORLD_TWO_RAMPS) {
    const from = WORLD_TWO_TERRACES[ramp.from];
    const to = WORLD_TWO_TERRACES[ramp.to];
    if (!from || !to) continue;
    const segment = distanceToWorldTwoSegment(x, z, from, to);
    if (segment.distance <= ramp.width / 2) {
      return from.elevation + (to.elevation - from.elevation) * segment.ratio;
    }
  }
  return null;
};

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
  { kind: 'camp', name: 'Camp des Marées', x: 0, z: 6.8, radius: 1.65, color: 0xf2b958, rotation: Math.PI },
  // Sur chaque île, bâtiment principal, dépôt et Maison dessinent un triangle
  // lisible dont les façades regardent la place centrale.
  { kind: 'workshop', name: 'Atelier des Pins', x: 0, z: -33.8, radius: 1.65, color: 0xe29449, rotation: 0 },
  { kind: 'foundry', name: 'Fonderie Cuivrée', x: 16, z: -53.8, radius: 1.75, color: 0xd47743, rotation: 0 },
  { kind: 'observatory', name: 'Autel du Savoir', x: -1, z: -75.8, radius: 1.75, color: 0xb9afe9, rotation: 0 },
];

const rotationTowardIslandCenter = (islandIndex: number, x: number, z: number): number => {
  const island = ISLANDS[islandIndex]!;
  return Math.atan2(island.x - x, island.z - z);
};

export const WAREHOUSES: readonly WarehouseDefinition[] = [
  { islandIndex: 0, name: 'Dépôt des Marées', x: -7, z: -3.8, radius: 1.45, rotation: rotationTowardIslandCenter(0, -7, -3.8) },
  { islandIndex: 1, name: 'Dépôt des Pins', x: -6, z: -23.2, radius: 1.45, rotation: rotationTowardIslandCenter(1, -6, -23.2) },
  { islandIndex: 2, name: 'Dépôt Cuivré', x: 9.5, z: -43.8, radius: 1.45, rotation: rotationTowardIslandCenter(2, 9.5, -43.8) },
  { islandIndex: 3, name: 'Dépôt de Cristal', x: -7, z: -65.2, radius: 1.45, rotation: rotationTowardIslandCenter(3, -7, -65.2) },
  { islandIndex: 4, name: 'Dépôt de la Couronne', x: 8.5, z: -87.8, radius: 1.45, rotation: rotationTowardIslandCenter(4, 8.5, -87.8) },
];

/**
 * Une seule Maison des Travaux par île. Le bâtiment reste identique et ses
 * trois sceaux indiquent physiquement l'avancement des trois projets locaux.
 */
export const PROJECT_HALLS: readonly ProjectHallDefinition[] = [
  { islandIndex: 0, tier: 0, name: 'Maison des Travaux des Marées', x: 7, z: -3.8, radius: 1.35, color: 0xe2ad57, rotation: rotationTowardIslandCenter(0, 7, -3.8) },
  { islandIndex: 1, tier: 1, name: 'Maison des Travaux des Pins', x: 6, z: -23.2, radius: 1.35, color: 0xd89a4c, rotation: rotationTowardIslandCenter(1, 6, -23.2) },
  { islandIndex: 2, tier: 2, name: 'Maison des Travaux Cuivrée', x: 22, z: -43.2, radius: 1.35, color: 0xc97a4a, rotation: rotationTowardIslandCenter(2, 22, -43.2) },
  { islandIndex: 3, tier: 3, name: 'Maison des Travaux de Cristal', x: 5, z: -65.2, radius: 1.35, color: 0x9a8fc4, rotation: rotationTowardIslandCenter(3, 5, -65.2) },
  { islandIndex: 4, tier: 4, name: 'Maison des Travaux de la Couronne', x: 21, z: -87.2, radius: 1.35, color: 0xf2b958, rotation: rotationTowardIslandCenter(4, 21, -87.2) },
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
  { kind: 'wood', model: 'treeA', x: 4, z: 9, capacity: 5, scale: 0.78, respawnSeconds: 10 },
  { kind: 'wood', model: 'treeB', x: -3, z: 10, capacity: 7, scale: 0.9, respawnSeconds: 13 },
  { kind: 'wood', model: 'treeA', x: -10, z: 0, capacity: 4, scale: 0.7, respawnSeconds: 9 },
  { kind: 'wood', model: 'treeB', x: -7, z: -7, capacity: 8, scale: 0.98, respawnSeconds: 14 },
  { kind: 'wood', model: 'treeA', x: 6.5, z: 7, capacity: 6, scale: 0.84, respawnSeconds: 11 },
  { kind: 'wood', model: 'treeB', x: -2, z: -9.5, capacity: 5, scale: 0.8, respawnSeconds: 10 },
  { kind: 'stone', model: 'rock', x: 10, z: 4, capacity: 5, scale: 0.82, respawnSeconds: 11 },
  { kind: 'stone', model: 'rock', x: 10, z: -4.5, capacity: 7, scale: 0.98, respawnSeconds: 14 },
  { kind: 'stone', model: 'rock', x: 6, z: -8, capacity: 4, scale: 0.72, respawnSeconds: 9 },
  { kind: 'stone', model: 'rock', x: -5, z: -9.5, capacity: 6, scale: 0.88, respawnSeconds: 12 },
  { kind: 'stone', model: 'rock', x: 2.5, z: 10, capacity: 5, scale: 0.8, respawnSeconds: 10 },

  { kind: 'wood', model: 'treeA', x: -3, z: -20, capacity: 7, scale: 0.92, respawnSeconds: 12 },
  { kind: 'wood', model: 'treeB', x: 5.2, z: -20.2, capacity: 9, scale: 1.04, respawnSeconds: 15 },
  { kind: 'wood', model: 'treeA', x: -6.6, z: -32.2, capacity: 6, scale: 0.84, respawnSeconds: 11 },
  { kind: 'wood', model: 'treeB', x: 6.8, z: -31.3, capacity: 8, scale: 0.96, respawnSeconds: 14 },
  { kind: 'stone', model: 'rock', x: 8, z: -26.7, capacity: 6, scale: 0.88, respawnSeconds: 12 },
  { kind: 'stone', model: 'rock', x: -7.8, z: -27, capacity: 5, scale: 0.8, respawnSeconds: 11 },

  { kind: 'copper', x: 12, z: -47, capacity: 6, scale: 0.82, respawnSeconds: 13 },
  { kind: 'copper', x: 19, z: -39.7, capacity: 8, scale: 0.98, respawnSeconds: 16 },
  { kind: 'copper', x: 24, z: -49, capacity: 9, scale: 1.08, respawnSeconds: 18 },
  { kind: 'copper', x: 20, z: -55.5, capacity: 7, scale: 0.9, respawnSeconds: 15 },
  { kind: 'stone', model: 'rock', x: 23, z: -53.3, capacity: 7, scale: 0.92, respawnSeconds: 14 },
  { kind: 'wood', model: 'treeA', x: 9.5, z: -51, capacity: 7, scale: 0.9, respawnSeconds: 13 },

  { kind: 'crystal', x: -4, z: -61.5, capacity: 5, scale: 0.8, respawnSeconds: 14 },
  { kind: 'crystal', x: 5.8, z: -62.5, capacity: 7, scale: 0.98, respawnSeconds: 17 },
  { kind: 'crystal', x: 7, z: -72, capacity: 8, scale: 1.08, respawnSeconds: 19 },
  { kind: 'crystal', x: -7, z: -75, capacity: 6, scale: 0.9, respawnSeconds: 16 },
  { kind: 'copper', x: -4, z: -78, capacity: 7, scale: 0.88, respawnSeconds: 15 },
  { kind: 'wood', model: 'treeB', x: 7.5, z: -68, capacity: 8, scale: 0.92, respawnSeconds: 14 },

  { kind: 'wood', model: 'treeA', x: 13, z: -84, capacity: 9, scale: 1.02, respawnSeconds: 15 },
  { kind: 'stone', model: 'rock', x: 17, z: -84, capacity: 9, scale: 1.05, respawnSeconds: 16 },
  { kind: 'copper', x: 9, z: -96.5, capacity: 9, scale: 1.02, respawnSeconds: 17 },
  { kind: 'crystal', x: 21, z: -96.5, capacity: 9, scale: 1.08, respawnSeconds: 19 },
];
