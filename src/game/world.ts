import type { Cost, ResourceKind, StructureKind } from './economy';
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

export interface ResourceSpawn extends Point2 {
  kind: ResourceKind;
  capacity: number;
  scale: number;
  respawnSeconds: number;
  model?: NatureKind;
}

export interface CacheDefinition extends Point2 {
  id: string;
  reward: Cost;
}

export const ISLANDS: readonly IslandDefinition[] = [
  { id: 'marees', name: 'Îlot des Marées', x: 0, z: 0, radius: 10.8, rotation: 0, topColor: 0x7fa655, shoreColor: 0xd9c477 },
  { id: 'pins', name: 'Île des Pins', x: 0, z: -21, radius: 7.4, rotation: 0.1, topColor: 0x6d9e57, shoreColor: 0xd6bf78 },
  { id: 'cuivre', name: 'Île Cuivrée', x: 12.5, z: -36, radius: 7.8, rotation: 0.23, topColor: 0x879956, shoreColor: 0xccae68 },
  { id: 'cristal', name: 'Île de Cristal', x: -1, z: -52, radius: 7.6, rotation: -0.14, topColor: 0x769a75, shoreColor: 0xcabf8b },
  { id: 'couronne', name: 'Île Couronne', x: 11, z: -67, radius: 7, rotation: 0.31, topColor: 0x819f68, shoreColor: 0xd5bd76 },
];

export const BRIDGES: readonly BridgeDefinition[] = [
  { id: 'pins', name: 'Pont des Pins', fromIsland: 0, toIsland: 1 },
  { id: 'cuivre', name: 'Pont Cuivré', fromIsland: 1, toIsland: 2 },
  { id: 'cristal', name: 'Pont des Cristaux', fromIsland: 2, toIsland: 3 },
  { id: 'couronne', name: 'Pont de la Couronne', fromIsland: 3, toIsland: 4 },
];

export const STRUCTURES: readonly StructureDefinition[] = [
  { kind: 'camp', name: 'Camp des Marées', x: 0, z: 0, radius: 1.65, color: 0xf2b958 },
  { kind: 'workshop', name: 'Atelier des Pins', x: -1.7, z: -21.2, radius: 1.45, color: 0xe29449 },
  { kind: 'foundry', name: 'Fonderie Cuivrée', x: 12.4, z: -36.1, radius: 1.55, color: 0xd47743 },
  { kind: 'observatory', name: 'Observatoire de Cristal', x: -1.1, z: -52.1, radius: 1.55, color: 0xb9afe9 },
];

export const CACHES: readonly CacheDefinition[] = [
  { id: 'main-cache', x: 7.2, z: 4.5, reward: { wood: 4, stone: 4, copper: 0, crystal: 0 } },
  { id: 'pins-cache', x: -4.6, z: -22.8, reward: { wood: 8, stone: 6, copper: 0, crystal: 0 } },
  { id: 'copper-cache', x: 16.6, z: -34.1, reward: { wood: 4, stone: 4, copper: 7, crystal: 0 } },
  { id: 'crystal-cache', x: -4.9, z: -54.7, reward: { wood: 0, stone: 0, copper: 5, crystal: 6 } },
];

export const RESOURCE_SPAWNS: readonly ResourceSpawn[] = [
  { kind: 'wood', model: 'treeA', x: 0, z: 6.2, capacity: 5, scale: 0.78, respawnSeconds: 10 },
  { kind: 'wood', model: 'treeB', x: -5.8, z: 4.5, capacity: 7, scale: 0.9, respawnSeconds: 13 },
  { kind: 'wood', model: 'treeA', x: -7.6, z: 0.6, capacity: 4, scale: 0.7, respawnSeconds: 9 },
  { kind: 'wood', model: 'treeB', x: -5.6, z: -5.2, capacity: 8, scale: 0.98, respawnSeconds: 14 },
  { kind: 'wood', model: 'treeA', x: 5.1, z: 6.1, capacity: 6, scale: 0.84, respawnSeconds: 11 },
  { kind: 'wood', model: 'treeB', x: -1.6, z: -7.2, capacity: 5, scale: 0.8, respawnSeconds: 10 },
  { kind: 'stone', model: 'rock', x: 6.2, z: 2.5, capacity: 5, scale: 0.82, respawnSeconds: 11 },
  { kind: 'stone', model: 'rock', x: 7.2, z: -2.5, capacity: 7, scale: 0.98, respawnSeconds: 14 },
  { kind: 'stone', model: 'rock', x: 4.6, z: -6.2, capacity: 4, scale: 0.72, respawnSeconds: 9 },
  { kind: 'stone', model: 'rock', x: -8, z: -4.2, capacity: 6, scale: 0.88, respawnSeconds: 12 },
  { kind: 'stone', model: 'rock', x: 1.9, z: 7.8, capacity: 5, scale: 0.8, respawnSeconds: 10 },

  { kind: 'wood', model: 'treeA', x: -4.8, z: -18.2, capacity: 7, scale: 0.92, respawnSeconds: 12 },
  { kind: 'wood', model: 'treeB', x: 4.4, z: -18.7, capacity: 9, scale: 1.04, respawnSeconds: 15 },
  { kind: 'wood', model: 'treeA', x: -3.2, z: -25.5, capacity: 6, scale: 0.84, respawnSeconds: 11 },
  { kind: 'wood', model: 'treeB', x: 3.8, z: -24.6, capacity: 8, scale: 0.96, respawnSeconds: 14 },
  { kind: 'stone', model: 'rock', x: 5.2, z: -21.4, capacity: 6, scale: 0.88, respawnSeconds: 12 },
  { kind: 'stone', model: 'rock', x: -5.4, z: -19.4, capacity: 5, scale: 0.8, respawnSeconds: 11 },

  { kind: 'copper', x: 8.6, z: -33.7, capacity: 6, scale: 0.82, respawnSeconds: 13 },
  { kind: 'copper', x: 15.5, z: -31.8, capacity: 8, scale: 0.98, respawnSeconds: 16 },
  { kind: 'copper', x: 18.1, z: -37.8, capacity: 9, scale: 1.08, respawnSeconds: 18 },
  { kind: 'copper', x: 10.6, z: -41.3, capacity: 7, scale: 0.9, respawnSeconds: 15 },
  { kind: 'stone', model: 'rock', x: 16.2, z: -40.2, capacity: 7, scale: 0.92, respawnSeconds: 14 },
  { kind: 'wood', model: 'treeA', x: 8.5, z: -38.4, capacity: 7, scale: 0.9, respawnSeconds: 13 },

  { kind: 'crystal', x: -5.3, z: -48.9, capacity: 5, scale: 0.8, respawnSeconds: 14 },
  { kind: 'crystal', x: 2.6, z: -48.2, capacity: 7, scale: 0.98, respawnSeconds: 17 },
  { kind: 'crystal', x: 4.3, z: -54.5, capacity: 8, scale: 1.08, respawnSeconds: 19 },
  { kind: 'crystal', x: -4.1, z: -57.2, capacity: 6, scale: 0.9, respawnSeconds: 16 },
  { kind: 'copper', x: 1.1, z: -57.7, capacity: 7, scale: 0.88, respawnSeconds: 15 },
  { kind: 'wood', model: 'treeB', x: 2.7, z: -52.2, capacity: 8, scale: 0.92, respawnSeconds: 14 },

  { kind: 'wood', model: 'treeA', x: 7.4, z: -64.3, capacity: 9, scale: 1.02, respawnSeconds: 15 },
  { kind: 'stone', model: 'rock', x: 14.8, z: -64.2, capacity: 9, scale: 1.05, respawnSeconds: 16 },
  { kind: 'copper', x: 8.5, z: -70.1, capacity: 9, scale: 1.02, respawnSeconds: 17 },
  { kind: 'crystal', x: 14.4, z: -69.3, capacity: 9, scale: 1.08, respawnSeconds: 19 },
];
