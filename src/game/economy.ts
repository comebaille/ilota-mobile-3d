export const RESOURCE_KINDS = ['wood', 'stone', 'copper', 'crystal'] as const;
export const LEGACY_WORLD_TWO_RESOURCE_KINDS = ['coal', 'iron', 'silver', 'gold'] as const;
export const WORLD_TWO_MINERAL_IDS = [
  'stone',
  'slate',
  'coal',
  'tin',
  'copper',
  'iron',
  'zinc',
  'nickel',
  'cobalt',
  'silver',
  'quartz',
  'amethyst',
  'garnet',
  'topaz',
  'emerald',
  'sapphire',
  'ruby',
  'platinum',
  'obsidian',
  'opal',
  'jade',
  'onyx',
  'moonstone',
  'star_iron',
  'mithril',
  'adamantite',
  'void_crystal',
  'solarite',
  'diamond',
  'celestium',
] as const;
// Alias conservé pour les appels de gameplay existants pendant la migration.
export const WORLD_TWO_RESOURCE_KINDS = WORLD_TWO_MINERAL_IDS;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type LegacyWorldTwoResourceKind = (typeof LEGACY_WORLD_TWO_RESOURCE_KINDS)[number];
export type WorldTwoMineralId = (typeof WORLD_TWO_MINERAL_IDS)[number];
export type WorldTwoResourceKind = WorldTwoMineralId;
export type WorkerLevel = 1 | 2 | 3;
export type StructureKind = 'camp' | 'workshop' | 'foundry' | 'observatory';
export type SkillBranch = 'intelligence' | 'industry' | 'exploration';
export type SkillFamily = SkillBranch | 'core' | 'hybrid';
export type WorldTwoSkillId =
  | 'prospector_eye'
  | 'precise_bite'
  | 'echo_pouch'
  | 'pack_instinct'
  | 'mountain_tools'
  | 'loaded_saddles'
  | 'guard_circle'
  | 'pack_endurance'
  | 'coordinated_hunt'
  | 'mountain_barter'
  | 'fang_craft'
  | 'summit_bounty'
  | 'golden_current'
  | 'deep_veins'
  | 'vein_mastery'
  | 'den_legacy'
  | 'zenith_convergence'
  | 'zenith_pack';
export type WorldTwoSkillBranch = 'extraction' | 'pack' | 'fortune' | 'convergence';
export type WorldTwoBuildingId =
  | 'fang_forge'
  | 'pack_lodge'
  | 'sky_exchange'
  | 'storm_watch'
  | 'zenith_core';
export type WarehouseState = [boolean, boolean, boolean, boolean, boolean];
export type ProjectHallState = [boolean, boolean, boolean, boolean];
export type ProjectId =
  | 'starter_tools'
  | 'trail_markers'
  | 'tidal_nursery'
  | 'timber_reserve'
  | 'towing_paths'
  | 'shared_warehouse'
  | 'communal_sawmill'
  | 'shore_walls'
  | 'orders_office'
  | 'copper_winches'
  | 'hauling_rails'
  | 'maintenance_yard'
  | 'crystal_beacons'
  | 'prismatic_reservoir'
  | 'unity_lighthouse';
export type SkillId =
  | 'insight_gateway'
  | 'craft_gateway'
  | 'exploration_gateway'
  | 'trail_sense'
  | 'optimal_routes'
  | 'forecasting'
  | 'coordinated_shifts'
  | 'auto_regulation'
  | 'collective_intelligence'
  | 'sharp_tools'
  | 'reinforced_carts'
  | 'living_quarries'
  | 'expanded_roster'
  | 'expanded_roster_2'
  | 'expanded_roster_3'
  | 'expanded_roster_4'
  | 'expanded_roster_5'
  | 'cargo_harness'
  | 'cargo_harness_2'
  | 'cargo_harness_3'
  | 'cargo_harness_4'
  | 'cargo_harness_5'
  | 'cargo_harness_6'
  | 'full_loads'
  | 'master_builders'
  | 'endless_engine'
  | 'tide_stride'
  | 'cache_instinct'
  | 'frugal_plans'
  | 'tidal_memory'
  | 'far_horizons'
  | 'ocean_legacy'
  | 'tidal_inheritance'
  | 'tidal_inheritance_2'
  | 'logistics_network'
  | 'adaptive_harvest'
  | 'scouting_parties'
  | 'remote_management'
  | 'adaptive_assignments'
  | 'masterful_strikes'
  | 'masterful_strikes_2'
  | 'archipelago_consciousness';

export interface Cost {
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
}

export interface LegacyWorldTwoCost {
  coal: number;
  iron: number;
  silver: number;
  gold: number;
}

export interface WorldTwoMineralDefinition {
  id: WorldTwoMineralId;
  name: string;
  hardness: number;
  saleValue: number;
  color: number;
  visualKind: LegacyWorldTwoResourceKind;
}

export type WorldTwoCargo = Partial<Record<WorldTwoMineralId, number>>;

export interface WorldTwoWorkerState {
  id: string;
  name: string;
  task: WorldTwoMineralId;
  level: WorkerLevel;
  health: number;
}

export interface WorkerState {
  id: string;
  name: string;
  task: ResourceKind;
  level: WorkerLevel;
}

export interface IslandProgress {
  version: 12;
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
  playerCargo: Cost;
  warehousesBuilt: WarehouseState;
  projectHallsBuilt: ProjectHallState;
  campBuilt: boolean;
  workshopBuilt: boolean;
  foundryBuilt: boolean;
  observatoryBuilt: boolean;
  bridgesBuilt: [boolean, boolean, boolean, boolean];
  cachesFound: string[];
  workers: WorkerState[];
  completed: boolean;
  elapsedSeconds: number;
  knowledge: number;
  skills: SkillId[];
  skillRanks: Partial<Record<SkillId, number>>;
  autoRegulation: boolean;
  industrySurge: boolean;
  explorationFlow: boolean;
  powerNotifications: boolean;
  powerVfx: boolean;
  rebirths: number;
  cycleMilestones: string[];
  lifetimeDeliveries: number;
  projectsCompleted: ProjectId[];
  tutorialSeen: string[];
  currentWorld: 1 | 2;
  worldTwoPeakReached: boolean;
  worldTwoMoney: number;
  worldTwoFangLevel: number;
  worldTwoWolfFangLevel: number;
  worldTwoCargo: WorldTwoCargo;
  worldTwoTerracesUnlocked: number;
  worldTwoWolves: WorldTwoWorkerState[];
  worldTwoSkills: WorldTwoSkillId[];
  worldTwoEnemyDefeats: number;
  worldTwoBuildings: WorldTwoBuildingId[];
  worldTwoLifetimeMoney: number;
  worldTwoMineralsSold: number;
}

interface VersionElevenProgress extends Omit<
  IslandProgress,
  'version' | 'worldTwoBuildings' | 'worldTwoLifetimeMoney' | 'worldTwoMineralsSold'
> {
  version: 11;
}

interface VersionTenProgress extends Omit<
  VersionElevenProgress,
  'version'
  | 'worldTwoMoney'
  | 'worldTwoFangLevel'
  | 'worldTwoWolfFangLevel'
  | 'worldTwoCargo'
  | 'worldTwoWolves'
> {
  version: 10;
  worldTwoResources: LegacyWorldTwoCost;
  worldTwoCargo: LegacyWorldTwoCost;
  worldTwoWolves: Array<Omit<WorldTwoWorkerState, 'task'> & { task: LegacyWorldTwoResourceKind }>;
}

interface VersionNineProgress extends Omit<
  VersionTenProgress,
  'version'
  | 'worldTwoResources'
  | 'worldTwoCargo'
  | 'worldTwoTerracesUnlocked'
  | 'worldTwoWolves'
  | 'worldTwoSkills'
  | 'worldTwoEnemyDefeats'
> {
  version: 9;
}

interface VersionEightProgress extends Omit<VersionNineProgress, 'version' | 'currentWorld' | 'worldTwoPeakReached'> {
  version: 8;
}

interface VersionSevenProgress extends Omit<VersionEightProgress, 'version' | 'projectHallsBuilt'> {
  version: 7;
}

interface VersionSixProgress extends Omit<
  VersionSevenProgress,
  'version' | 'powerNotifications' | 'powerVfx'
> {
  version: 6;
}

interface VersionFiveProgress extends Omit<
  VersionSixProgress,
  'version' | 'playerCargo' | 'warehousesBuilt' | 'industrySurge' | 'explorationFlow' | 'tutorialSeen'
> {
  version: 5;
}

interface VersionFourProgress extends Omit<VersionFiveProgress, 'version' | 'projectsCompleted'> {
  version: 4;
}

interface VersionThreeProgress extends Omit<VersionFiveProgress, 'version' | 'skillRanks' | 'projectsCompleted'> {
  version: 3;
}

interface VersionTwoProgress extends Omit<VersionFiveProgress, 'version' | 'knowledge' | 'skills' | 'skillRanks' | 'autoRegulation' | 'rebirths' | 'cycleMilestones' | 'lifetimeDeliveries' | 'projectsCompleted'> {
  version: 2;
}

interface LegacyProgress {
  version: 1;
  wood?: number;
  stone?: number;
  campBuilt?: boolean;
  woodWorker?: boolean;
  stoneWorker?: boolean;
  bridgeBuilt?: boolean;
  cacheFound?: boolean;
  completed?: boolean;
  elapsedSeconds?: number;
}

export interface ObjectiveCopy {
  chapter: number;
  eyebrow: string;
  title: string;
  detail: string;
}

export interface IslandGoalItem {
  id: string;
  label: string;
  done: boolean;
}

export interface IslandGoal {
  islandIndex: number;
  title: string;
  destination: string;
  completed: boolean;
  items: IslandGoalItem[];
}

export interface SkillDefinition {
  id: SkillId;
  branch: SkillFamily;
  tier: number;
  cost: number;
  name: string;
  detail: string;
  icon: string;
  x: number;
  y: number;
  requires?: readonly SkillId[];
  maxRank?: number;
  rankCosts?: readonly number[];
}

export interface WorldTwoSkillDefinition {
  id: WorldTwoSkillId;
  branch: WorldTwoSkillBranch;
  tier: number;
  name: string;
  detail: string;
  icon: string;
  cost: number;
  requires?: readonly WorldTwoSkillId[];
}

export interface WorldTwoBuildingDefinition {
  id: WorldTwoBuildingId;
  terraceIndex: number;
  name: string;
  detail: string;
  effect: string;
  icon: string;
  cost: number;
  requires?: readonly WorldTwoBuildingId[];
  minimumPlayerFangs?: number;
  minimumWolfFangs?: number;
  minimumWolves?: number;
  minimumEnemyDefeats?: number;
  minimumSkills?: number;
}

export interface IslandProjectDefinition {
  id: ProjectId;
  tier: 0 | 1 | 2 | 3 | 4;
  islandIndex: 0 | 1 | 2 | 3 | 4;
  name: string;
  detail: string;
  effect: string;
  icon: string;
  cost: Cost;
  knowledge: number;
  requiresStructure: StructureKind;
  requires?: readonly ProjectId[];
}

export interface AssignmentMove {
  workerId: string;
  from: ResourceKind;
  to: ResourceKind;
}

const cost = (wood = 0, stone = 0, copper = 0, crystal = 0): Cost => ({ wood, stone, copper, crystal });
const legacyWorldTwoCost = (coal = 0, iron = 0, silver = 0, gold = 0): LegacyWorldTwoCost => ({
  coal,
  iron,
  silver,
  gold,
});

// La première Marée demande déjà un vrai investissement. Les Marées suivantes
// sont ensuite modulées par getCycleMultiplier et les talents d'Exploration.
export const STRUCTURE_COSTS: Record<StructureKind, Cost> = {
  camp: cost(12, 8),
  workshop: cost(28, 22),
  foundry: cost(30, 28, 18),
  // Trois voyages de cristal avec le harnais de base suffisent. Le chantier
  // reste important sans imposer une longue boucle manuelle avant le métier.
  observatory: cost(78, 68, 48, 24),
};

export const BASE_CARGO_CAPACITY = 8;
export const CARGO_CAPACITY_PER_RANK = 4;
export const MAX_CARGO_CAPACITY = 32;

const WAREHOUSE_COSTS: readonly Cost[] = [
  cost(),
  cost(20, 14),
  cost(28, 22, 10),
  cost(36, 30, 18, 8),
  cost(46, 38, 26, 18),
];

const PROJECT_HALL_COSTS: readonly Cost[] = [
  cost(16, 12),
  cost(18, 14),
  cost(24, 22, 10),
  cost(30, 28, 18, 8),
  cost(36, 34, 24, 18),
];

export const BRIDGE_COSTS: readonly Cost[] = [
  cost(22, 18),
  cost(42, 34),
  cost(52, 46, 32),
  cost(64, 58, 44, 30),
];

export const FINAL_COST = cost(36, 34, 48, 42);

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  wood: 'bois',
  stone: 'pierre',
  copper: 'cuivre',
  crystal: 'cristal',
};

export const RESOURCE_ICONS: Record<ResourceKind, string> = {
  wood: '▰',
  stone: '◆',
  copper: '⬟',
  crystal: '✦',
};

export const WORLD_TWO_MINERALS: readonly WorldTwoMineralDefinition[] = [
  { id: 'stone', name: 'Pierre', hardness: 1, saleValue: 5, color: 0x8a8c8f, visualKind: 'iron' },
  { id: 'slate', name: 'Ardoise', hardness: 2, saleValue: 8, color: 0x434b55, visualKind: 'coal' },
  { id: 'coal', name: 'Charbon', hardness: 3, saleValue: 12, color: 0x27292d, visualKind: 'coal' },
  { id: 'tin', name: 'Étain', hardness: 4, saleValue: 18, color: 0x9aa9b3, visualKind: 'silver' },
  { id: 'copper', name: 'Cuivre', hardness: 5, saleValue: 26, color: 0xb87333, visualKind: 'gold' },
  { id: 'iron', name: 'Fer', hardness: 6, saleValue: 38, color: 0x68737a, visualKind: 'iron' },
  { id: 'zinc', name: 'Zinc', hardness: 7, saleValue: 54, color: 0x8da7a6, visualKind: 'silver' },
  { id: 'nickel', name: 'Nickel', hardness: 8, saleValue: 75, color: 0xb5b0a1, visualKind: 'silver' },
  { id: 'cobalt', name: 'Cobalt', hardness: 9, saleValue: 105, color: 0x3569b3, visualKind: 'iron' },
  { id: 'silver', name: 'Argent', hardness: 10, saleValue: 145, color: 0xd9e5ed, visualKind: 'silver' },
  { id: 'quartz', name: 'Quartz', hardness: 11, saleValue: 200, color: 0xe8e4dc, visualKind: 'silver' },
  { id: 'amethyst', name: 'Améthyste', hardness: 12, saleValue: 270, color: 0x9a5bc6, visualKind: 'gold' },
  { id: 'garnet', name: 'Grenat', hardness: 13, saleValue: 360, color: 0x8d263f, visualKind: 'gold' },
  { id: 'topaz', name: 'Topaze', hardness: 14, saleValue: 480, color: 0xe9a83a, visualKind: 'gold' },
  { id: 'emerald', name: 'Émeraude', hardness: 15, saleValue: 630, color: 0x2fb56d, visualKind: 'silver' },
  { id: 'sapphire', name: 'Saphir', hardness: 16, saleValue: 820, color: 0x306adf, visualKind: 'silver' },
  { id: 'ruby', name: 'Rubis', hardness: 17, saleValue: 1_060, color: 0xd72f50, visualKind: 'gold' },
  { id: 'platinum', name: 'Platine', hardness: 18, saleValue: 1_360, color: 0xd6dde0, visualKind: 'silver' },
  { id: 'obsidian', name: 'Obsidienne', hardness: 19, saleValue: 1_740, color: 0x171629, visualKind: 'coal' },
  { id: 'opal', name: 'Opale', hardness: 20, saleValue: 2_200, color: 0x9ee8db, visualKind: 'silver' },
  { id: 'jade', name: 'Jade', hardness: 21, saleValue: 2_800, color: 0x52a878, visualKind: 'iron' },
  { id: 'onyx', name: 'Onyx', hardness: 22, saleValue: 3_550, color: 0x090a0d, visualKind: 'coal' },
  { id: 'moonstone', name: 'Pierre de lune', hardness: 23, saleValue: 4_500, color: 0xb6c8e6, visualKind: 'silver' },
  { id: 'star_iron', name: 'Fer stellaire', hardness: 24, saleValue: 5_700, color: 0x566887, visualKind: 'iron' },
  { id: 'mithril', name: 'Mithril', hardness: 25, saleValue: 7_200, color: 0x70d7e9, visualKind: 'silver' },
  { id: 'adamantite', name: 'Adamantite', hardness: 26, saleValue: 9_100, color: 0xad2f4d, visualKind: 'gold' },
  { id: 'void_crystal', name: 'Cristal du Vide', hardness: 27, saleValue: 11_500, color: 0x542271, visualKind: 'coal' },
  { id: 'solarite', name: 'Solarite', hardness: 28, saleValue: 14_500, color: 0xf9d45c, visualKind: 'gold' },
  { id: 'diamond', name: 'Diamant', hardness: 29, saleValue: 18_500, color: 0xa9f5ff, visualKind: 'silver' },
  { id: 'celestium', name: 'Célestium', hardness: 30, saleValue: 24_000, color: 0xf3ffff, visualKind: 'silver' },
];

export const WORLD_TWO_RESOURCE_LABELS: Record<WorldTwoMineralId, string> = Object.fromEntries(
  WORLD_TWO_MINERALS.map((mineral) => [mineral.id, mineral.name.toLocaleLowerCase('fr')]),
) as Record<WorldTwoMineralId, string>;

export const WORLD_TWO_RESOURCE_ICONS: Record<WorldTwoMineralId, string> = Object.fromEntries(
  WORLD_TWO_MINERALS.map((mineral) => [mineral.id, mineral.hardness >= 25 ? '✦' : mineral.hardness >= 13 ? '◆' : '⬢']),
) as Record<WorldTwoMineralId, string>;

export const getWorldTwoMineral = (id: WorldTwoMineralId): WorldTwoMineralDefinition =>
  WORLD_TWO_MINERALS.find((mineral) => mineral.id === id) ?? WORLD_TWO_MINERALS[0]!;

export const formatWorldTwoMoney = (value: number): string =>
  `${Math.max(0, Math.floor(value)).toLocaleString('fr-FR')} $`;

export const WORLD_TWO_SKILLS: readonly WorldTwoSkillDefinition[] = [
  {
    id: 'prospector_eye', branch: 'extraction', tier: 1,
    name: 'Œil du prospecteur',
    detail: 'Les filons exploitables brillent davantage et chaque frappe manuelle extrait +1 unité.',
    icon: '◈', cost: 180,
  },
  {
    id: 'precise_bite', branch: 'extraction', tier: 2,
    name: 'Morsure précise',
    detail: 'Tes frappes manuelles extraient encore +1 unité sans accélérer l’usure du filon.',
    icon: '🦷', cost: 700, requires: ['prospector_eye'],
  },
  {
    id: 'echo_pouch', branch: 'extraction', tier: 3,
    name: 'Sac des Échos',
    detail: '+4 places de cargaison pour le voyageur.',
    icon: '+4', cost: 1_900, requires: ['precise_bite'],
  },
  {
    id: 'pack_instinct',
    branch: 'pack', tier: 1,
    name: 'Instinct de meute',
    detail: 'Les loups se déplacent et choisissent leur prochain filon 20 % plus vite.',
    icon: '🐺',
    cost: 350,
  },
  {
    id: 'mountain_tools',
    branch: 'pack', tier: 2,
    name: 'Morsure minière',
    detail: 'Chaque frappe de loup extrait une unité supplémentaire, sans modifier la dureté de ses crocs.',
    icon: '⛏',
    cost: 950,
    requires: ['pack_instinct'],
  },
  {
    id: 'loaded_saddles',
    branch: 'pack', tier: 3,
    name: 'Harnais d’altitude',
    detail: '+4 places de cargaison pour toi et pour chaque loup.',
    icon: '+4',
    cost: 1_400,
    requires: ['mountain_tools'],
  },
  {
    id: 'guard_circle',
    branch: 'pack', tier: 2,
    name: 'Cercle de garde',
    detail: 'Les loups ripostent plus vite et subissent moitié moins de dégâts.',
    icon: '◉',
    cost: 1_600,
    requires: ['pack_instinct'],
  },
  {
    id: 'pack_endurance', branch: 'pack', tier: 3,
    name: 'Souffle boréal',
    detail: 'Chaque loup gagne 2 points de vie et récupère totalement après une victoire.',
    icon: '♥', cost: 3_600, requires: ['guard_circle'],
  },
  {
    id: 'coordinated_hunt', branch: 'pack', tier: 4,
    name: 'Chasse coordonnée',
    detail: 'Les loups frappent plus fort et extraient une unité supplémentaire par morsure.',
    icon: '⚔', cost: 7_800, requires: ['loaded_saddles', 'pack_endurance'],
  },
  {
    id: 'mountain_barter', branch: 'fortune', tier: 1,
    name: 'Troc de montagne',
    detail: 'Toutes les ventes de minerais rapportent 10 % de plus.',
    icon: '$', cost: 300,
  },
  {
    id: 'fang_craft', branch: 'fortune', tier: 2,
    name: 'Artisanat des crocs',
    detail: 'Les renforcements de crocs coûtent 15 % de moins.',
    icon: '⌁', cost: 1_100, requires: ['mountain_barter'],
  },
  {
    id: 'summit_bounty', branch: 'fortune', tier: 3,
    name: 'Primes du sommet',
    detail: 'Chaque créature vaincue rapporte une prime selon son altitude.',
    icon: '★', cost: 3_100, requires: ['fang_craft'],
  },
  {
    id: 'golden_current', branch: 'fortune', tier: 4,
    name: 'Courant doré',
    detail: 'Les ventes gagnent encore 25 % et les cargaisons pleines reçoivent un bonus de 15 %.',
    icon: '◉', cost: 9_500, requires: ['summit_bounty'],
  },
  {
    id: 'deep_veins',
    branch: 'convergence', tier: 4,
    name: 'Veines profondes',
    detail: 'Tous les minerais du Zénith repoussent 30 % plus vite.',
    icon: '♻',
    cost: 3_200,
    requires: ['echo_pouch', 'loaded_saddles', 'fang_craft'],
  },
  {
    id: 'vein_mastery', branch: 'extraction', tier: 5,
    name: 'Maîtrise des veines',
    detail: 'Les filons repoussent au total 50 % plus vite et ta cargaison gagne encore 4 places.',
    icon: '♻', cost: 14_000, requires: ['deep_veins'],
  },
  {
    id: 'den_legacy', branch: 'pack', tier: 5,
    name: 'Héritage de la tanière',
    detail: '+1 place dans la meute ; les nouveaux loups naissent avec 5 points de vie.',
    icon: '🐾', cost: 16_500, requires: ['coordinated_hunt', 'deep_veins'],
  },
  {
    id: 'zenith_convergence', branch: 'convergence', tier: 6,
    name: 'Convergence du Zénith',
    detail: 'Extraction, meute et fortune fusionnent : +20 % de vitesse et +20 % sur toutes les ventes.',
    icon: '✦', cost: 42_000, requires: ['vein_mastery', 'den_legacy', 'golden_current'],
  },
  {
    id: 'zenith_pack',
    branch: 'convergence', tier: 7,
    name: 'Meute du Zénith',
    detail: '+2 places dans la meute et +1 unité par livraison.',
    icon: '✺',
    cost: 95_000,
    requires: ['zenith_convergence'],
  },
];

export const WORLD_TWO_BUILDINGS: readonly WorldTwoBuildingDefinition[] = [
  {
    id: 'fang_forge', terraceIndex: 2, name: 'Forge des Crocs', icon: '🦷', cost: 2_400,
    detail: 'Une forge de basalte où l’on taille les morsures capables d’ouvrir la haute montagne.',
    effect: 'Crocs −15 % supplémentaires · accès au premier acte supérieur.',
    minimumPlayerFangs: 6,
  },
  {
    id: 'pack_lodge', terraceIndex: 4, name: 'Pavillon de la Meute', icon: '🐺', cost: 9_000,
    detail: 'Un refuge fortifié qui rassemble les loups avant les cols dangereux.',
    effect: '+1 place de meute · tous les loups récupèrent 1 point de vie après une vente.',
    requires: ['fang_forge'], minimumWolfFangs: 10, minimumWolves: 2,
  },
  {
    id: 'sky_exchange', terraceIndex: 6, name: 'Comptoir des Nuages', icon: '$', cost: 32_000,
    detail: 'Les caravanes du ciel achètent ici les minerais rares sans introduire de nouvelle ressource.',
    effect: 'Toutes les ventes +20 %.',
    requires: ['pack_lodge'], minimumPlayerFangs: 16, minimumSkills: 6,
  },
  {
    id: 'storm_watch', terraceIndex: 8, name: 'Vigie des Tempêtes', icon: '⚡', cost: 115_000,
    detail: 'Une tour de chasse qui protège la route astrale et paie les victoires de la meute.',
    effect: 'Primes ennemies doublées · attaques ennemies 20 % plus lentes.',
    requires: ['sky_exchange'], minimumWolfFangs: 22, minimumEnemyDefeats: 8,
  },
  {
    id: 'zenith_core', terraceIndex: 10, name: 'Cœur du Zénith', icon: '✦', cost: 600_000,
    detail: 'Le monument final consacre une économie, une meute et une extraction totalement maîtrisées.',
    effect: 'Achève la campagne du World 2 et allume le phare sommital.',
    requires: ['storm_watch'], minimumPlayerFangs: 30, minimumWolfFangs: 30,
    minimumWolves: 4, minimumEnemyDefeats: 15, minimumSkills: 18,
  },
];

export const SKILL_BRANCH_LABELS: Record<SkillBranch, { name: string; icon: string; summary: string }> = {
  intelligence: { name: 'Intelligence', icon: '⌘', summary: 'Trajets, prévisions et décisions autonomes.' },
  industry: { name: 'Technique', icon: '⚒', summary: 'Outils, effectifs et production mécanique.' },
  exploration: { name: 'Exploration', icon: '➶', summary: 'Mobilité, caches et départs accélérés.' },
};

const SKILL_HEX_STEP_X = 81;
const SKILL_HEX_STEP_Y = 70.5;
const SKILL_TREE_CENTER_X = 460;
const skillPosition = (tier: number, column: number): Pick<SkillDefinition, 'tier' | 'x' | 'y'> => {
  const count = tier + 3;
  return {
    tier,
    x: SKILL_TREE_CENTER_X - ((count - 1) * SKILL_HEX_STEP_X) / 2 + column * SKILL_HEX_STEP_X,
    y: 72 + tier * SKILL_HEX_STEP_Y,
  };
};

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  { id: 'insight_gateway', branch: 'intelligence', cost: 1, name: 'Étincelle logique', detail: 'Première voie : prépare les décisions et déplacements autonomes.', icon: '⌘', ...skillPosition(0, 0) },
  { id: 'craft_gateway', branch: 'industry', cost: 1, name: 'Premier mécanisme', detail: 'Première voie : prépare les outils, harnais et équipes.', icon: '⚒', ...skillPosition(0, 1) },
  { id: 'exploration_gateway', branch: 'exploration', cost: 1, name: 'Appel du large', detail: 'Première voie : prépare la mobilité et les héritages de Marée.', icon: '➶', ...skillPosition(0, 2) },

  { id: 'trail_sense', branch: 'intelligence', cost: 2, name: 'Sens des pistes', detail: '+18 % de vitesse pour tous les travailleurs.', icon: '⌁', requires: ['insight_gateway'], ...skillPosition(1, 0) },
  { id: 'logistics_network', branch: 'hybrid', cost: 2, name: 'Réseau logistique', detail: 'Trajets et livraisons gagnent encore en rendement.', icon: '⤨', requires: ['insight_gateway', 'craft_gateway'], ...skillPosition(1, 1) },
  { id: 'sharp_tools', branch: 'industry', cost: 2, name: 'Outils affûtés', detail: 'Chaque coup manuel rapporte 2 unités au lieu de 1.', icon: '⛏', requires: ['craft_gateway', 'exploration_gateway'], ...skillPosition(1, 2) },
  { id: 'tide_stride', branch: 'exploration', cost: 2, name: 'Pas de marée', detail: '+20 % de vitesse pour ton renard.', icon: '➤', requires: ['exploration_gateway'], ...skillPosition(1, 3) },

  { id: 'optimal_routes', branch: 'intelligence', cost: 3, name: 'Routes calculées', detail: 'Chaque renard choisit le trajet réellement le plus court.', icon: '⌘', requires: ['trail_sense'], ...skillPosition(2, 0) },
  { id: 'coordinated_shifts', branch: 'intelligence', cost: 3, name: 'Relèves coordonnées', detail: 'L’auto-gestion pourra réagir plus souvent.', icon: '⇄', requires: ['trail_sense', 'logistics_network'], ...skillPosition(2, 1) },
  { id: 'reinforced_carts', branch: 'industry', cost: 3, name: 'Charrettes renforcées', detail: '+30 % de ressources à chaque livraison.', icon: '▣', requires: ['logistics_network', 'sharp_tools'], ...skillPosition(2, 2) },
  { id: 'cache_instinct', branch: 'exploration', cost: 3, name: 'Instinct des caches', detail: 'Les caches contiennent 50 % de ressources en plus.', icon: '◇', requires: ['sharp_tools', 'tide_stride'], ...skillPosition(2, 3) },
  { id: 'frugal_plans', branch: 'exploration', cost: 3, name: 'Plans économes', detail: 'Tous les investissements coûtent 12 % de moins.', icon: '⌂', requires: ['tide_stride'], ...skillPosition(2, 4) },

  { id: 'forecasting', branch: 'intelligence', cost: 4, name: 'Prévisions', detail: 'Affiche la pénurie prioritaire du prochain objectif.', icon: '◉', requires: ['optimal_routes'], ...skillPosition(3, 0) },
  { id: 'auto_regulation', branch: 'intelligence', cost: 4, name: 'Auto-régulation', detail: 'Les renards changent eux-mêmes de métier selon les vrais besoins.', icon: '◎', requires: ['optimal_routes', 'coordinated_shifts'], ...skillPosition(3, 1) },
  { id: 'living_quarries', branch: 'industry', cost: 4, name: 'Gisements vivants', detail: 'Arbres et minerais réapparaissent 35 % plus vite.', icon: '♻', requires: ['coordinated_shifts', 'reinforced_carts'], ...skillPosition(3, 2) },
  { id: 'adaptive_harvest', branch: 'hybrid', cost: 4, name: 'Récolte adaptative', detail: 'Un coup bonus sur la ressource prioritaire.', icon: '⟲', requires: ['reinforced_carts', 'cache_instinct'], ...skillPosition(3, 3) },
  { id: 'scouting_parties', branch: 'hybrid', cost: 4, name: 'Éclaireurs autonomes', detail: 'Les caches sont récupérées à l’émergence d’une île.', icon: '⚑', requires: ['cache_instinct', 'frugal_plans'], ...skillPosition(3, 4) },
  { id: 'tidal_memory', branch: 'exploration', cost: 4, name: 'Mémoire des marées', detail: 'Chaque Nouvelle Marée commence avec une réserve croissante.', icon: '≈', requires: ['frugal_plans'], ...skillPosition(3, 5) },

  { id: 'collective_intelligence', branch: 'intelligence', cost: 5, name: 'Esprit collectif', detail: 'Deux réaffectations automatiques possibles toutes les 3 secondes.', icon: '♜', requires: ['forecasting'], ...skillPosition(4, 0) },
  { id: 'adaptive_assignments', branch: 'intelligence', cost: 5, name: 'Instinct de relève', detail: 'Un renard sans filon rejoint automatiquement la ressource accessible la plus manquante.', icon: '↻', requires: ['forecasting', 'auto_regulation'], ...skillPosition(4, 1) },
  { id: 'expanded_roster', branch: 'industry', cost: 5, name: 'Terrier agrandi', detail: '+1 place permanente dans la nurserie.', icon: '+1', requires: ['auto_regulation', 'living_quarries'], ...skillPosition(4, 2) },
  { id: 'cargo_harness', branch: 'industry', cost: 5, name: 'Harnais modulaire', detail: '+4 places sur le dos du joueur et des travailleurs.', icon: '+4', requires: ['living_quarries', 'adaptive_harvest'], ...skillPosition(4, 3) },
  { id: 'full_loads', branch: 'hybrid', cost: 5, name: 'Tournées complètes', detail: 'Les travailleurs remplissent leur harnais avant de rentrer.', icon: '⇥', requires: ['adaptive_harvest', 'scouting_parties'], ...skillPosition(4, 4) },
  { id: 'far_horizons', branch: 'exploration', cost: 5, name: 'Horizon lointain', detail: 'Le renard accélère encore et les caches sont plus riches.', icon: '◒', requires: ['scouting_parties', 'tidal_memory'], ...skillPosition(4, 5) },
  { id: 'ocean_legacy', branch: 'exploration', cost: 5, name: 'Courant de Marée', detail: 'Pendant 10 s, double la vitesse des renards chargés et conserve 5 % des stocks.', icon: '≋', requires: ['tidal_memory'], ...skillPosition(4, 6) },

  { id: 'remote_management', branch: 'hybrid', cost: 6, name: 'Conseil itinérant', detail: 'Ouvre l’onglet ÉQUIPE partout : recrutement, métiers et formations à distance.', icon: '♟', requires: ['collective_intelligence'], ...skillPosition(5, 0) },
  { id: 'expanded_roster_2', branch: 'industry', cost: 7, name: 'Dortoir de mousse', detail: '+1 place permanente dans la nurserie.', icon: '+1', requires: ['collective_intelligence', 'adaptive_assignments'], ...skillPosition(5, 1) },
  { id: 'expanded_roster_3', branch: 'industry', cost: 7, name: 'Galerie commune', detail: '+1 place permanente dans la nurserie.', icon: '+1', requires: ['adaptive_assignments', 'expanded_roster'], ...skillPosition(5, 2) },
  { id: 'cargo_harness_2', branch: 'industry', cost: 7, name: 'Armature renforcée', detail: '+4 places sur le dos du joueur et des travailleurs.', icon: '+4', requires: ['expanded_roster', 'cargo_harness'], ...skillPosition(5, 3) },
  { id: 'master_builders', branch: 'industry', cost: 7, name: 'Maîtres bâtisseurs', detail: 'Les livraisons gagnent encore +35 %.', icon: '⚙', requires: ['cargo_harness', 'full_loads'], ...skillPosition(5, 4) },
  { id: 'masterful_strikes', branch: 'industry', cost: 7, name: 'Frappe double', detail: 'Les coups ouvriers passent de 1/2/3 à 2/4/6.', icon: '×2', requires: ['full_loads', 'far_horizons'], ...skillPosition(5, 5) },
  { id: 'tidal_inheritance', branch: 'exploration', cost: 7, name: 'Mémoire des courants', detail: '+5 % de stocks conservés à la prochaine Nouvelle Marée.', icon: '+5', requires: ['far_horizons', 'ocean_legacy'], ...skillPosition(5, 6) },
  { id: 'tidal_inheritance_2', branch: 'exploration', cost: 7, name: 'Réserves abyssales', detail: '+5 % de stocks conservés, cumulable jusqu’à 15 %.', icon: '+5', requires: ['ocean_legacy'], ...skillPosition(5, 7) },

  { id: 'expanded_roster_4', branch: 'industry', cost: 8, name: 'Cercle des bâtisseurs', detail: '+1 place permanente dans la nurserie.', icon: '+1', requires: ['remote_management'], ...skillPosition(6, 0) },
  { id: 'expanded_roster_5', branch: 'industry', cost: 9, name: 'Grande nurserie', detail: '+1 place permanente dans la nurserie, cinquième extension.', icon: '+1', requires: ['remote_management', 'expanded_roster_2'], ...skillPosition(6, 1) },
  { id: 'cargo_harness_4', branch: 'industry', cost: 9, name: 'Sangles jumelées', detail: '+4 places sur le dos du joueur et des travailleurs.', icon: '+4', requires: ['expanded_roster_2', 'expanded_roster_3'], ...skillPosition(6, 2) },
  { id: 'cargo_harness_5', branch: 'industry', cost: 9, name: 'Poches latérales', detail: '+4 places sur le dos du joueur et des travailleurs.', icon: '+4', requires: ['expanded_roster_3', 'cargo_harness_2'], ...skillPosition(6, 3) },
  { id: 'endless_engine', branch: 'industry', cost: 11, name: 'Surcharge tellurique', detail: 'Pendant 10 s, la ressource prioritaire récoltée compte double dans la cargaison.', icon: 'ϟ', requires: ['cargo_harness_2', 'master_builders'], ...skillPosition(6, 4) },
  { id: 'cargo_harness_3', branch: 'industry', cost: 9, name: 'Cadre de portage', detail: '+4 places sur le dos du joueur et des travailleurs.', icon: '+4', requires: ['master_builders', 'masterful_strikes'], ...skillPosition(6, 5) },
  { id: 'masterful_strikes_2', branch: 'industry', cost: 12, name: 'Frappe triple', detail: 'Les coups ouvriers passent de 2/4/6 à 3/6/9.', icon: '×3', requires: ['masterful_strikes', 'tidal_inheritance'], ...skillPosition(6, 6) },
  { id: 'cargo_harness_6', branch: 'industry', cost: 9, name: 'Harnais magistral', detail: '+4 places : capacité maximale du joueur portée à 32.', icon: '+4', requires: ['tidal_inheritance', 'tidal_inheritance_2'], ...skillPosition(6, 7) },
  { id: 'archipelago_consciousness', branch: 'hybrid', cost: 13, name: 'Conscience absolue', detail: 'Fusion finale : filons réservés intelligemment, trajets excédentaires évités et +4 postes.', icon: '✺', requires: ['tidal_inheritance_2'], ...skillPosition(6, 8) },
];

const SKILL_IDS = new Set<SkillId>(SKILL_DEFINITIONS.map((skill) => skill.id));
const EXPANDED_ROSTER_SKILLS: readonly SkillId[] = [
  'expanded_roster', 'expanded_roster_2', 'expanded_roster_3', 'expanded_roster_4', 'expanded_roster_5',
];
const CARGO_HARNESS_SKILLS: readonly SkillId[] = [
  'cargo_harness', 'cargo_harness_2', 'cargo_harness_3', 'cargo_harness_4', 'cargo_harness_5', 'cargo_harness_6',
];
const MASTERFUL_STRIKE_SKILLS: readonly SkillId[] = ['masterful_strikes', 'masterful_strikes_2'];
const TIDAL_INHERITANCE_SKILLS: readonly SkillId[] = ['tidal_inheritance', 'tidal_inheritance_2'];
const LEGACY_RANK_SERIES: readonly { base: SkillId; upgrades: readonly SkillId[] }[] = [
  { base: 'expanded_roster', upgrades: EXPANDED_ROSTER_SKILLS.slice(1) },
  { base: 'cargo_harness', upgrades: CARGO_HARNESS_SKILLS.slice(1) },
  { base: 'masterful_strikes', upgrades: MASTERFUL_STRIKE_SKILLS.slice(1) },
  { base: 'tidal_inheritance', upgrades: TIDAL_INHERITANCE_SKILLS.slice(1) },
];
const STARTER_PROJECTS = ['starter_tools', 'trail_markers', 'tidal_nursery'] as const;
const TIER_ONE_PROJECTS = ['timber_reserve', 'towing_paths', 'shared_warehouse'] as const;
const TIER_TWO_PROJECTS = ['communal_sawmill', 'shore_walls', 'orders_office'] as const;
const TIER_THREE_PROJECTS = ['copper_winches', 'hauling_rails', 'maintenance_yard'] as const;

export const ISLAND_PROJECTS: readonly IslandProjectDefinition[] = [
  {
    id: 'starter_tools', tier: 0, islandIndex: 0, requiresStructure: 'camp',
    name: 'Établi des bâtisseurs', detail: 'Les premiers outils sont rangés et entretenus au même endroit.', effect: 'Récolte manuelle +1.',
    icon: '⚒', cost: cost(18, 12), knowledge: 1,
  },
  {
    id: 'trail_markers', tier: 0, islandIndex: 0, requiresStructure: 'camp',
    name: 'Bornes des Marées', detail: 'Des repères simples dégagent les chemins autour de la place.', effect: 'Déplacements ouvriers +5 %.',
    icon: '⇢', cost: cost(14, 18), knowledge: 1,
  },
  {
    id: 'tidal_nursery', tier: 0, islandIndex: 0, requiresStructure: 'camp',
    name: 'Terrier communautaire', detail: 'Une première extension accueille un renard supplémentaire.', effect: '+1 place dans la nurserie.',
    icon: '🦊', cost: cost(22, 16), knowledge: 1,
  },
  {
    id: 'timber_reserve', tier: 1, islandIndex: 1, requiresStructure: 'workshop', requires: STARTER_PROJECTS,
    name: 'Réserve de charpente', detail: 'Un dépôt durable pour que le bois reste stratégique.', effect: '+1 place dans la nurserie.',
    icon: '▰', cost: cost(34, 20), knowledge: 1,
  },
  {
    id: 'towing_paths', tier: 1, islandIndex: 1, requiresStructure: 'workshop',
    name: 'Chemins de halage', detail: 'Les renards cessent de s’enliser entre les arbres.', effect: 'Déplacements ouvriers +8 %.',
    icon: '⌁', cost: cost(26, 30), knowledge: 1,
  },
  {
    id: 'shared_warehouse', tier: 1, islandIndex: 1, requiresStructure: 'workshop',
    name: 'Entrepôt partagé', detail: 'Les caisses sont mieux remplies avant le retour.', effect: 'Livraisons +10 %.',
    icon: '▣', cost: cost(38, 28), knowledge: 1,
  },
  {
    id: 'communal_sawmill', tier: 2, islandIndex: 2, requiresStructure: 'foundry', requires: TIER_ONE_PROJECTS,
    name: 'Scierie commune', detail: 'Les chutes sont réemployées au lieu d’être perdues.', effect: 'Récolte manuelle +1.',
    icon: '⚒', cost: cost(48, 34, 18), knowledge: 1,
  },
  {
    id: 'shore_walls', tier: 2, islandIndex: 2, requiresStructure: 'foundry', requires: TIER_ONE_PROJECTS,
    name: 'Murets de rive', detail: 'La terre fertile retient les repousses et les filons.', effect: 'Repousse 12 % plus rapide.',
    icon: '♻', cost: cost(36, 54, 22), knowledge: 1,
  },
  {
    id: 'orders_office', tier: 2, islandIndex: 2, requiresStructure: 'foundry', requires: TIER_ONE_PROJECTS,
    name: 'Bureau des plans', detail: 'Les commandes communes évitent les matériaux gaspillés.', effect: 'Tous les investissements coûtent 6 % de moins.',
    icon: '⌂', cost: cost(50, 46, 28), knowledge: 1,
  },
  {
    id: 'copper_winches', tier: 3, islandIndex: 3, requiresStructure: 'observatory', requires: TIER_TWO_PROJECTS,
    name: 'Treuils cuivrés', detail: 'Chaque gisement est travaillé avec un mécanisme dédié.', effect: 'Récolte ouvrière 18 % plus rapide.',
    icon: '⚙', cost: cost(58, 48, 42, 12), knowledge: 1,
  },
  {
    id: 'hauling_rails', tier: 3, islandIndex: 3, requiresStructure: 'observatory', requires: TIER_TWO_PROJECTS,
    name: 'Rails de débardage', detail: 'Des voies légères accélèrent les grands trajets.', effect: 'Déplacements ouvriers +12 %.',
    icon: '⇢', cost: cost(54, 60, 38, 16), knowledge: 1,
  },
  {
    id: 'maintenance_yard', tier: 3, islandIndex: 3, requiresStructure: 'observatory', requires: TIER_TWO_PROJECTS,
    name: 'Cour de maintenance', detail: 'Outils et terriers sont préparés avant chaque embauche.', effect: 'Recrutements et niveaux coûtent 15 % de moins.',
    icon: '✚', cost: cost(66, 58, 46, 20), knowledge: 1,
  },
  {
    id: 'crystal_beacons', tier: 4, islandIndex: 4, requiresStructure: 'observatory', requires: TIER_THREE_PROJECTS,
    name: 'Balises cristallines', detail: 'Le réseau lumineux stimule toutes les repousses.', effect: 'Repousse encore 18 % plus rapide.',
    icon: '✦', cost: cost(72, 68, 54, 34), knowledge: 1,
  },
  {
    id: 'prismatic_reservoir', tier: 4, islandIndex: 4, requiresStructure: 'observatory', requires: TIER_THREE_PROJECTS,
    name: 'Réservoir prismatique', detail: 'Chaque cargaison est triée et compactée au retour.', effect: 'Livraisons +15 %.',
    icon: '◇', cost: cost(78, 72, 62, 42), knowledge: 1,
  },
  {
    id: 'unity_lighthouse', tier: 4, islandIndex: 4, requiresStructure: 'observatory', requires: TIER_THREE_PROJECTS,
    name: 'Phare de l’unisson', detail: 'Le dernier chantier synchronise l’archipel entier.', effect: 'Livraisons +25 % et +3 Savoir.',
    icon: '✺', cost: cost(92, 88, 74, 58), knowledge: 3,
  },
];

const PROJECT_IDS = new Set<ProjectId>(ISLAND_PROJECTS.map((project) => project.id));
const WORKER_NAMES = [
  'Milo', 'Nila', 'Sève', 'Roc', 'Pollen', 'Lune', 'Braise', 'Azur',
  'Orme', 'Mousse', 'Silex', 'Écho', 'Ronce', 'Aube', 'Flint', 'Nacre',
  'Brume', 'Miel', 'Cèdre', 'Plume', 'Galet', 'Ambre', 'Lichen', 'Sauge',
];
const WOLF_NAMES = ['Rime', 'Toundra', 'Granit', 'Ébène', 'Névé', 'Orage', 'Quartz', 'Boréal'];

const freshProgress = (): IslandProgress => ({
  version: 12,
  wood: 0,
  stone: 0,
  copper: 0,
  crystal: 0,
  playerCargo: cost(),
  warehousesBuilt: [false, false, false, false, false],
  projectHallsBuilt: [false, false, false, false],
  campBuilt: false,
  workshopBuilt: false,
  foundryBuilt: false,
  observatoryBuilt: false,
  bridgesBuilt: [false, false, false, false],
  cachesFound: [],
  workers: [],
  completed: false,
  elapsedSeconds: 0,
  knowledge: 0,
  skills: [],
  skillRanks: {},
  autoRegulation: false,
  industrySurge: false,
  explorationFlow: false,
  powerNotifications: false,
  powerVfx: true,
  rebirths: 0,
  cycleMilestones: [],
  lifetimeDeliveries: 0,
  projectsCompleted: [],
  tutorialSeen: [],
  currentWorld: 1,
  worldTwoPeakReached: false,
  worldTwoMoney: 0,
  worldTwoFangLevel: 1,
  worldTwoWolfFangLevel: 1,
  worldTwoCargo: {},
  // Le relief complet est explorable dès l'arrivée. Les crocs, pas la brume,
  // contrôlent désormais la progression minière.
  worldTwoTerracesUnlocked: 11,
  worldTwoWolves: [],
  worldTwoSkills: [],
  worldTwoEnemyDefeats: 0,
  worldTwoBuildings: [],
  worldTwoLifetimeMoney: 0,
  worldTwoMineralsSold: 0,
});

const nonNegativeInteger = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const sanitizeCost = (value: unknown): Cost => {
  const source = value && typeof value === 'object' ? value as Partial<Record<ResourceKind, unknown>> : {};
  return {
    wood: nonNegativeInteger(source.wood),
    stone: nonNegativeInteger(source.stone),
    copper: nonNegativeInteger(source.copper),
    crystal: nonNegativeInteger(source.crystal),
  };
};

const sanitizeLegacyWorldTwoCost = (value: unknown): LegacyWorldTwoCost => {
  const source = value && typeof value === 'object'
    ? value as Partial<Record<LegacyWorldTwoResourceKind, unknown>>
    : {};
  return {
    coal: nonNegativeInteger(source.coal),
    iron: nonNegativeInteger(source.iron),
    silver: nonNegativeInteger(source.silver),
    gold: nonNegativeInteger(source.gold),
  };
};

const getLegacyWorldTwoValue = (value: unknown): number => {
  const legacy = sanitizeLegacyWorldTwoCost(value);
  return legacy.coal * 12 + legacy.iron * 38 + legacy.silver * 145 + legacy.gold * 480;
};

const getLegacyFangLevel = (...values: unknown[]): number => {
  const combined = values.reduce<LegacyWorldTwoCost>((total, value) => {
    const legacy = sanitizeLegacyWorldTwoCost(value);
    return {
      coal: total.coal + legacy.coal,
      iron: total.iron + legacy.iron,
      silver: total.silver + legacy.silver,
      gold: total.gold + legacy.gold,
    };
  }, legacyWorldTwoCost());
  if (combined.gold > 0) return 14;
  if (combined.silver > 0) return 10;
  if (combined.iron > 0) return 6;
  if (combined.coal > 0) return 3;
  return 1;
};

const sanitizeWorldTwoCargo = (value: unknown): WorldTwoCargo => {
  if (!value || typeof value !== 'object') return {};
  const source = value as Partial<Record<WorldTwoMineralId, unknown>>;
  const cargo: WorldTwoCargo = {};
  WORLD_TWO_MINERAL_IDS.forEach((id) => {
    const amount = nonNegativeInteger(source[id]);
    if (amount > 0) cargo[id] = amount;
  });
  return cargo;
};

const sanitizeWorldTwoSkills = (value: unknown): WorldTwoSkillId[] => {
  if (!Array.isArray(value)) return [];
  const known = new Set<WorldTwoSkillId>(WORLD_TWO_SKILLS.map((skill) => skill.id));
  return [...new Set(value.filter((id): id is WorldTwoSkillId =>
    typeof id === 'string' && known.has(id as WorldTwoSkillId)))];
};

const sanitizeWorldTwoBuildings = (value: unknown): WorldTwoBuildingId[] => {
  if (!Array.isArray(value)) return [];
  const known = new Set<WorldTwoBuildingId>(WORLD_TWO_BUILDINGS.map((building) => building.id));
  return WORLD_TWO_BUILDINGS
    .filter((building) => value.some((id) => id === building.id) && known.has(building.id))
    .map((building) => building.id);
};

const sanitizeWorldTwoWolves = (value: unknown): WorldTwoWorkerState[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const source = entry as Partial<WorldTwoWorkerState>;
    const task = WORLD_TWO_MINERAL_IDS.includes(source.task as WorldTwoMineralId)
      ? source.task as WorldTwoMineralId
      : 'stone';
    const level = Math.max(1, Math.min(3, nonNegativeInteger(source.level))) as WorkerLevel;
    return [{
      id: typeof source.id === 'string' ? source.id.slice(0, 48) : `wolf-${index + 1}`,
      name: typeof source.name === 'string' ? source.name.slice(0, 24) : WOLF_NAMES[index] ?? `Loup ${index + 1}`,
      task,
      level,
      health: Math.max(1, Math.min(6, nonNegativeInteger(source.health) || 3)),
    }];
  });
};

const sanitizeWarehouses = (value: unknown): WarehouseState => {
  const source = Array.isArray(value) ? value : [];
  return [
    Boolean(source[0]),
    Boolean(source[1]),
    Boolean(source[2]),
    Boolean(source[3]),
    Boolean(source[4]),
  ];
};

const sanitizeProjectHalls = (value: unknown): ProjectHallState => {
  const source = Array.isArray(value) ? value : [];
  return [
    Boolean(source[0]),
    Boolean(source[1]),
    Boolean(source[2]),
    Boolean(source[3]),
  ];
};

const sanitizeStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim())).map((entry) => entry.trim().slice(0, 64)))]
    : [];

const isResourceKind = (value: unknown): value is ResourceKind =>
  typeof value === 'string' && RESOURCE_KINDS.includes(value as ResourceKind);

const isSkillId = (value: unknown): value is SkillId => typeof value === 'string' && SKILL_IDS.has(value as SkillId);
const isProjectId = (value: unknown): value is ProjectId => typeof value === 'string' && PROJECT_IDS.has(value as ProjectId);

const sanitizeWorkers = (value: unknown): WorkerState[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const workers: WorkerState[] = [];
  value.slice(0, WORKER_NAMES.length).forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return;
    const source = candidate as Partial<WorkerState>;
    const fallbackId = `worker-${index + 1}`;
    const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : fallbackId;
    if (seen.has(id)) return;
    seen.add(id);
    const parsedLevel = Math.min(3, Math.max(1, nonNegativeInteger(source.level))) as WorkerLevel;
    workers.push({
      id,
      name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 18) : WORKER_NAMES[index] ?? `Renard ${index + 1}`,
      task: isResourceKind(source.task) ? source.task : index % 2 ? 'stone' : 'wood',
      level: parsedLevel,
    });
  });
  return workers;
};

const sanitizeSkills = (value: unknown): SkillId[] => {
  if (!Array.isArray(value)) return [];
  const requested = new Set(value.filter(isSkillId));
  const definitions = new Map(SKILL_DEFINITIONS.map((definition) => [definition.id, definition]));
  const expanded = new Set<SkillId>();
  const includeWithPrerequisites = (id: SkillId, visiting = new Set<SkillId>()): void => {
    if (expanded.has(id) || visiting.has(id)) return;
    visiting.add(id);
    definitions.get(id)?.requires?.forEach((required) => includeWithPrerequisites(required, visiting));
    visiting.delete(id);
    expanded.add(id);
  };
  requested.forEach((id) => includeWithPrerequisites(id));

  SKILL_DEFINITIONS.forEach((definition) => {
    if (expanded.has(definition.id)) requested.add(definition.id);
  });
  return SKILL_DEFINITIONS.filter((definition) => requested.has(definition.id)).map((definition) => definition.id);
};

const expandLegacyRankedSkills = (
  skills: readonly SkillId[],
  ranks: Partial<Record<SkillId, unknown>> | undefined,
): SkillId[] => {
  const expanded = [...skills];
  LEGACY_RANK_SERIES.forEach(({ base, upgrades }) => {
    const legacyRank = nonNegativeInteger(ranks?.[base] ?? (skills.includes(base) ? 1 : 0));
    upgrades.slice(0, Math.max(0, legacyRank - 1)).forEach((id) => expanded.push(id));
  });
  return expanded;
};

const sanitizeSkillRanks = (value: unknown, skills: readonly SkillId[]): Partial<Record<SkillId, number>> => {
  const source = value && typeof value === 'object' ? value as Partial<Record<SkillId, unknown>> : {};
  const ranks: Partial<Record<SkillId, number>> = {};
  skills.forEach((id) => {
    const definition = SKILL_DEFINITIONS.find((candidate) => candidate.id === id);
    const maximum = definition?.maxRank ?? 1;
    ranks[id] = Math.min(maximum, Math.max(1, nonNegativeInteger(source[id] ?? 1)));
  });
  return ranks;
};

const sanitizeProjects = (value: unknown): ProjectId[] => {
  if (!Array.isArray(value)) return [];
  const requested = new Set(value.filter(isProjectId));
  const definitions = new Map(ISLAND_PROJECTS.map((definition) => [definition.id, definition]));
  const includeWithPrerequisites = (id: ProjectId): void => {
    definitions.get(id)?.requires?.forEach((required) => {
      if (requested.has(required)) return;
      requested.add(required);
      includeWithPrerequisites(required);
    });
  };
  [...requested].forEach(includeWithPrerequisites);
  return ISLAND_PROJECTS.filter((definition) => requested.has(definition.id)).map((definition) => definition.id);
};

export const getSkillDefinition = (id: SkillId): SkillDefinition | undefined =>
  SKILL_DEFINITIONS.find((definition) => definition.id === id);

export const getSkillRank = (progress: IslandProgress, id: SkillId): number =>
  Math.max(0, nonNegativeInteger(progress.skillRanks[id] ?? (progress.skills.includes(id) ? 1 : 0)));

const getSkillSeriesRank = (progress: IslandProgress, ids: readonly SkillId[]): number =>
  ids.reduce((total, id) => total + (hasSkill(progress, id) ? 1 : 0), 0);

export const getExpandedRosterRank = (progress: IslandProgress): number =>
  getSkillSeriesRank(progress, EXPANDED_ROSTER_SKILLS);

export const getCargoHarnessRank = (progress: IslandProgress): number =>
  getSkillSeriesRank(progress, CARGO_HARNESS_SKILLS);

export const getMasterfulStrikesRank = (progress: IslandProgress): number =>
  getSkillSeriesRank(progress, MASTERFUL_STRIKE_SKILLS);

export const getTidalInheritanceRank = (progress: IslandProgress): number =>
  getSkillSeriesRank(progress, TIDAL_INHERITANCE_SKILLS);

export const hasSkill = (progress: IslandProgress, id: SkillId): boolean => getSkillRank(progress, id) > 0;

export const getSkillCost = (progress: IslandProgress, definition: SkillDefinition): number => {
  const rank = getSkillRank(progress, definition.id);
  return definition.rankCosts?.[rank] ?? definition.cost;
};

export const getSkillTreeCompletion = (progress: IslandProgress): { completed: number; total: number; complete: boolean } => {
  const completed = SKILL_DEFINITIONS.filter((definition) =>
    getSkillRank(progress, definition.id) >= (definition.maxRank ?? 1)).length;
  return { completed, total: SKILL_DEFINITIONS.length, complete: completed === SKILL_DEFINITIONS.length };
};

export const isWorldTwoUnlocked = (progress: IslandProgress): boolean =>
  progress.rebirths >= 5 && getSkillTreeCompletion(progress).complete;

export const hasWorldTwoSkill = (progress: IslandProgress, id: WorldTwoSkillId): boolean =>
  progress.worldTwoSkills.includes(id);

export const worldTwoSkillPrerequisitesMet = (
  progress: IslandProgress,
  definition: WorldTwoSkillDefinition,
): boolean => (definition.requires ?? []).every((required) => hasWorldTwoSkill(progress, required));

export const hasWorldTwoBuilding = (progress: IslandProgress, id: WorldTwoBuildingId): boolean =>
  progress.worldTwoBuildings.includes(id);

export const getWorldTwoBuilding = (id: WorldTwoBuildingId): WorldTwoBuildingDefinition | undefined =>
  WORLD_TWO_BUILDINGS.find((building) => building.id === id);

export const getWorldTwoBuildingRequirements = (
  progress: IslandProgress,
  definition: WorldTwoBuildingDefinition,
): string[] => {
  const missing: string[] = [];
  (definition.requires ?? []).forEach((id) => {
    if (!hasWorldTwoBuilding(progress, id)) missing.push(getWorldTwoBuilding(id)?.name ?? id);
  });
  if (progress.worldTwoFangLevel < (definition.minimumPlayerFangs ?? 0)) {
    missing.push(`crocs voyageur ${progress.worldTwoFangLevel}/${definition.minimumPlayerFangs}`);
  }
  if (progress.worldTwoWolfFangLevel < (definition.minimumWolfFangs ?? 0)) {
    missing.push(`crocs meute ${progress.worldTwoWolfFangLevel}/${definition.minimumWolfFangs}`);
  }
  if (progress.worldTwoWolves.length < (definition.minimumWolves ?? 0)) {
    missing.push(`meute ${progress.worldTwoWolves.length}/${definition.minimumWolves}`);
  }
  if (progress.worldTwoEnemyDefeats < (definition.minimumEnemyDefeats ?? 0)) {
    missing.push(`victoires ${progress.worldTwoEnemyDefeats}/${definition.minimumEnemyDefeats}`);
  }
  if (progress.worldTwoSkills.length < (definition.minimumSkills ?? 0)) {
    missing.push(`savoirs ${progress.worldTwoSkills.length}/${definition.minimumSkills}`);
  }
  return missing;
};

export const worldTwoBuildingRequirementsMet = (
  progress: IslandProgress,
  definition: WorldTwoBuildingDefinition,
): boolean => getWorldTwoBuildingRequirements(progress, definition).length === 0;

export const getWorldTwoSaleMultiplier = (progress: IslandProgress, fullCargo = false): number => {
  let multiplier = 1;
  if (hasWorldTwoSkill(progress, 'mountain_barter')) multiplier += 0.1;
  if (hasWorldTwoSkill(progress, 'golden_current')) multiplier += 0.25;
  if (hasWorldTwoSkill(progress, 'zenith_convergence')) multiplier += 0.2;
  if (hasWorldTwoBuilding(progress, 'sky_exchange')) multiplier += 0.2;
  if (fullCargo && hasWorldTwoSkill(progress, 'golden_current')) multiplier += 0.15;
  return multiplier;
};

export const getWorldTwoPlayerYield = (progress: IslandProgress): number =>
  1 + (hasWorldTwoSkill(progress, 'prospector_eye') ? 1 : 0)
  + (hasWorldTwoSkill(progress, 'precise_bite') ? 1 : 0);

export const getWorldTwoPlayerSpeed = (progress: IslandProgress): number =>
  4.65 * (hasWorldTwoSkill(progress, 'zenith_convergence') ? 1.2 : 1);

export const getWorldTwoRespawnMultiplier = (progress: IslandProgress): number =>
  hasWorldTwoSkill(progress, 'vein_mastery') ? 0.5 : hasWorldTwoSkill(progress, 'deep_veins') ? 0.7 : 1;

export const getWorldTwoWolfYield = (progress: IslandProgress): number =>
  1 + (hasWorldTwoSkill(progress, 'mountain_tools') ? 1 : 0)
  + (hasWorldTwoSkill(progress, 'coordinated_hunt') ? 1 : 0);

export const getWorldTwoWolfMaximumHealth = (progress: IslandProgress): number =>
  hasWorldTwoSkill(progress, 'pack_endurance') || hasWorldTwoSkill(progress, 'den_legacy') ? 5 : 3;

export const getWorldTwoCargoTotal = (progress: IslandProgress): number =>
  WORLD_TWO_MINERAL_IDS.reduce((total, kind) => total + (progress.worldTwoCargo[kind] ?? 0), 0);

export const getWorldTwoCargoValue = (progress: IslandProgress): number =>
  Math.round(WORLD_TWO_MINERAL_IDS.reduce(
    (total, kind) => total + (progress.worldTwoCargo[kind] ?? 0) * getWorldTwoMineral(kind).saleValue,
    0,
  ) * getWorldTwoSaleMultiplier(progress, getWorldTwoCargoTotal(progress) >= getWorldTwoCargoCapacity(progress)));

export const getWorldTwoCargoCapacity = (progress: IslandProgress): number =>
  8
  + (hasWorldTwoSkill(progress, 'echo_pouch') ? 4 : 0)
  + (hasWorldTwoSkill(progress, 'loaded_saddles') ? 4 : 0)
  + (hasWorldTwoSkill(progress, 'vein_mastery') ? 4 : 0);

export const getWorldTwoWolfCapacity = (progress: IslandProgress): number =>
  8
  + (hasWorldTwoSkill(progress, 'loaded_saddles') ? 4 : 0)
  + (hasWorldTwoSkill(progress, 'vein_mastery') ? 4 : 0);

export const getWorldTwoPackCapacity = (progress: IslandProgress): number =>
  2
  + (hasWorldTwoBuilding(progress, 'pack_lodge') ? 1 : 0)
  + (hasWorldTwoSkill(progress, 'den_legacy') ? 1 : 0)
  + (hasWorldTwoSkill(progress, 'zenith_pack') ? 2 : 0);

export const canMineWorldTwoMineral = (
  progress: IslandProgress,
  id: WorldTwoMineralId,
  actor: 'player' | 'wolf' = 'player',
): boolean => (actor === 'player' ? progress.worldTwoFangLevel : progress.worldTwoWolfFangLevel)
  >= getWorldTwoMineral(id).hardness;

export const getWorldTwoFangUpgradeCost = (
  progress: IslandProgress,
  actor: 'player' | 'wolf',
): number | null => {
  const current = actor === 'player' ? progress.worldTwoFangLevel : progress.worldTwoWolfFangLevel;
  if (current >= WORLD_TWO_MINERALS.length) return null;
  const nextMineral = WORLD_TWO_MINERALS[current]!;
  const multiplier = actor === 'player' ? 6 : 8;
  const discount = (hasWorldTwoSkill(progress, 'fang_craft') ? 0.85 : 1)
    * (hasWorldTwoBuilding(progress, 'fang_forge') ? 0.85 : 1);
  return Math.max(50, Math.ceil((nextMineral.saleValue * multiplier * discount) / 10) * 10);
};

export const formatWorldTwoCost = (value: number): string => formatWorldTwoMoney(value);

export const getWorldTwoRecruitCost = (progress: IslandProgress): number => {
  const count = progress.worldTwoWolves.length;
  return [250, 650, 1_450, 3_200][count] ?? 5_000 + count * 1_500;
};

export const skillPrerequisitesMet = (progress: IslandProgress, definition: SkillDefinition): boolean =>
  (definition.requires ?? []).every((required) => hasSkill(progress, required));

export const isSkillVisible = (progress: IslandProgress, definition: SkillDefinition): boolean =>
  !definition.requires?.length
  || hasSkill(progress, definition.id)
  || definition.requires.some((required) => hasSkill(progress, required));

export const getProjectDefinition = (id: ProjectId): IslandProjectDefinition | undefined =>
  ISLAND_PROJECTS.find((definition) => definition.id === id);

export const hasProject = (progress: IslandProgress, id: ProjectId): boolean =>
  progress.projectsCompleted.includes(id);

const projectStructureBuilt = (progress: IslandProgress, kind: StructureKind): boolean => {
  switch (kind) {
    case 'camp': return progress.campBuilt;
    case 'workshop': return progress.workshopBuilt;
    case 'foundry': return progress.foundryBuilt;
    case 'observatory': return progress.observatoryBuilt;
  }
};

export const isProjectHallBuilt = (progress: IslandProgress, islandIndex: 0 | 1 | 2 | 3 | 4): boolean =>
  islandIndex === 0
    ? progress.cycleMilestones.includes('project-hall:0')
    : Boolean(progress.projectHallsBuilt[islandIndex - 1]);

export const isProjectHallReady = (progress: IslandProgress, islandIndex: 0 | 1 | 2 | 3 | 4): boolean => {
  const requirement = ISLAND_PROJECTS.find((project) => project.islandIndex === islandIndex)?.requiresStructure;
  return Boolean(
    requirement
    && projectStructureBuilt(progress, requirement)
    && (islandIndex === 0 || progress.bridgesBuilt[islandIndex - 1]),
  );
};

export const projectPrerequisitesMet = (progress: IslandProgress, definition: IslandProjectDefinition): boolean =>
  projectStructureBuilt(progress, definition.requiresStructure)
  && (definition.islandIndex === 0 || Boolean(progress.bridgesBuilt[definition.islandIndex - 1]))
  && isProjectHallBuilt(progress, definition.islandIndex)
  && (definition.requires ?? []).every((required) => hasProject(progress, required));

export const isProjectVisible = (progress: IslandProgress, definition: IslandProjectDefinition): boolean =>
  hasProject(progress, definition.id) || projectPrerequisitesMet(progress, definition);

export const getCompletedProjectCount = (progress: IslandProgress): number => progress.projectsCompleted.length;

export const getCycleMultiplier = (progress: IslandProgress): number => 1 + Math.min(8, progress.rebirths) * 0.22;

const scaleCost = (progress: IslandProgress, value: Cost): Cost => {
  const multiplier = getCycleMultiplier(progress)
    * (hasSkill(progress, 'frugal_plans') ? 0.88 : 1)
    * (hasProject(progress, 'orders_office') ? 0.94 : 1)
    * (hasSkill(progress, 'archipelago_consciousness') ? 0.8 : 1);
  return {
    wood: value.wood ? Math.max(1, Math.ceil(value.wood * multiplier)) : 0,
    stone: value.stone ? Math.max(1, Math.ceil(value.stone * multiplier)) : 0,
    copper: value.copper ? Math.max(1, Math.ceil(value.copper * multiplier)) : 0,
    crystal: value.crystal ? Math.max(1, Math.ceil(value.crystal * multiplier)) : 0,
  };
};

const discountCost = (value: Cost, multiplier: number): Cost => ({
  wood: value.wood ? Math.max(1, Math.ceil(value.wood * multiplier)) : 0,
  stone: value.stone ? Math.max(1, Math.ceil(value.stone * multiplier)) : 0,
  copper: value.copper ? Math.max(1, Math.ceil(value.copper * multiplier)) : 0,
  crystal: value.crystal ? Math.max(1, Math.ceil(value.crystal * multiplier)) : 0,
});

export const getStructureCost = (progress: IslandProgress, kind: StructureKind): Cost => scaleCost(progress, STRUCTURE_COSTS[kind]);
export const isWarehouseUnlocked = (progress: IslandProgress, islandIndex: number): boolean =>
  islandIndex >= 0 && islandIndex < 5 && progress.rebirths >= islandIndex;
export const getWarehouseCost = (progress: IslandProgress, islandIndex: number): Cost | null => {
  const value = WAREHOUSE_COSTS[islandIndex];
  return value ? scaleCost(progress, value) : null;
};
export const getPlayerCargoTotal = (progress: IslandProgress): number =>
  RESOURCE_KINDS.reduce((total, kind) => total + progress.playerCargo[kind], 0);
export const getCargoCapacity = (progress: IslandProgress): number =>
  Math.min(
    MAX_CARGO_CAPACITY,
    BASE_CARGO_CAPACITY + getCargoHarnessRank(progress) * CARGO_CAPACITY_PER_RANK,
  );
export const getBridgeCost = (progress: IslandProgress, index: number): Cost | null => {
  const value = BRIDGE_COSTS[index];
  return value ? scaleCost(progress, value) : null;
};
export const getFinalCost = (progress: IslandProgress): Cost => scaleCost(progress, FINAL_COST);
export const getProjectCost = (progress: IslandProgress, definition: IslandProjectDefinition): Cost =>
  scaleCost(progress, definition.cost);
export const getProjectHallCost = (progress: IslandProgress, islandIndex: 0 | 1 | 2 | 3 | 4): Cost =>
  scaleCost(progress, PROJECT_HALL_COSTS[islandIndex] ?? cost());

export const getWorkerCapacity = (progress: IslandProgress): number => {
  if (!progress.campBuilt) return 0;
  const buildingCapacity = progress.observatoryBuilt ? 9
    : progress.foundryBuilt ? 7
      : progress.workshopBuilt ? 5
        : 3;
  return buildingCapacity
    + getExpandedRosterRank(progress)
    + (hasProject(progress, 'tidal_nursery') ? 1 : 0)
    + (hasProject(progress, 'timber_reserve') ? 1 : 0)
    + (hasSkill(progress, 'archipelago_consciousness') ? 4 : 0);
};

export const getWorkerLevelCap = (progress: IslandProgress): WorkerLevel => {
  if (progress.foundryBuilt) return 3;
  if (progress.workshopBuilt) return 2;
  return 1;
};

export const getUnlockedWorkerTasks = (progress: IslandProgress): ResourceKind[] => {
  if (!progress.campBuilt) return [];
  const tasks: ResourceKind[] = ['wood', 'stone'];
  if (progress.foundryBuilt) tasks.push('copper');
  if (progress.observatoryBuilt) tasks.push('crystal');
  return tasks;
};

export const getRecruitCost = (progress: IslandProgress): Cost => {
  const count = progress.workers.length;
  const value = scaleCost(progress, cost(
    6 + count * 3,
    4 + Math.floor((count + 1) / 2) * 3,
    count >= 5 ? (count - 4) * 3 : 0,
    count >= 8 ? 3 : 0,
  ));
  return hasProject(progress, 'maintenance_yard') ? discountCost(value, 0.85) : value;
};

export const getUpgradeCost = (worker: WorkerState, progress?: IslandProgress): Cost => {
  const base = worker.level === 1 ? cost(11, 9) : worker.level === 2 ? cost(20, 17, 9) : cost();
  if (!progress) return base;
  const value = scaleCost(progress, base);
  return hasProject(progress, 'maintenance_yard') ? discountCost(value, 0.85) : value;
};

export const getWorkerYield = (level: WorkerLevel, progress?: IslandProgress): number => {
  const perHit = level * (progress ? 1 + getMasterfulStrikesRank(progress) : 1);
  if (!progress) return perHit;
  return Math.min(getWorkerCargoCapacity(level, progress), perHit);
};

/**
 * Le niveau d’un ouvrier améliore son propre harnais, indépendamment du dos
 * du joueur. Un débutant ramène déjà une vraie tournée de quatre unités ; les
 * Harnais modulaires ajoutent ensuite quatre places à tout le monde.
 */
export const getWorkerCargoCapacity = (level: WorkerLevel, progress: IslandProgress): number =>
  Math.min(
    MAX_CARGO_CAPACITY,
    level * 4 + getCargoHarnessRank(progress) * CARGO_CAPACITY_PER_RANK,
  );

export const getWorkerDepositValue = (progress: IslandProgress): number => {
  const multiplier = (hasSkill(progress, 'reinforced_carts') ? 1.3 : 1)
    * (hasSkill(progress, 'master_builders') ? 1.35 : 1)
    * (hasSkill(progress, 'logistics_network') ? 1.15 : 1)
    * (hasProject(progress, 'shared_warehouse') ? 1.1 : 1)
    * (hasProject(progress, 'prismatic_reservoir') ? 1.15 : 1)
    * (hasProject(progress, 'unity_lighthouse') ? 1.25 : 1)
    * (hasSkill(progress, 'archipelago_consciousness') ? 1.5 : 1);
  return Math.max(1, Math.round(multiplier));
};

// Conservé comme estimation d'interface ; la simulation utilise la vraie
// distance parcourue et un temps de récolte séparé.
export const getWorkerCycleSeconds = (level: WorkerLevel): number => level === 1 ? 8.2 : level === 2 ? 6.4 : 4.9;
export const getWorkerTravelSpeed = (level: WorkerLevel, progress: IslandProgress): number =>
  (2.35 + (level - 1) * 0.28)
  * (hasSkill(progress, 'trail_sense') ? 1.18 : 1)
  * (hasProject(progress, 'trail_markers') ? 1.05 : 1)
  * (hasSkill(progress, 'logistics_network') ? 1.18 : 1)
  * (hasProject(progress, 'towing_paths') ? 1.08 : 1)
  * (hasProject(progress, 'hauling_rails') ? 1.12 : 1)
  * (hasSkill(progress, 'archipelago_consciousness') ? 1.2 : 1);
export const getWorkerGatherSeconds = (level: WorkerLevel, progress?: IslandProgress): number =>
  (level === 1 ? 1.65 : level === 2 ? 1.25 : 0.9)
  * (progress && hasProject(progress, 'copper_winches') ? 0.82 : 1);
export const getPlayerSpeed = (progress: IslandProgress): number =>
  5.25
  * (hasSkill(progress, 'tide_stride') ? 1.2 : 1)
  * (hasSkill(progress, 'far_horizons') ? 1.15 : 1)
  * (hasSkill(progress, 'archipelago_consciousness') ? 1.2 : 1);
export const getPlayerFlowMultiplier = (progress: IslandProgress, flowActive: boolean): number =>
  flowActive && getPlayerCargoTotal(progress) > 0 ? 2 : 1;
export const getTidalRetentionRate = (progress: IslandProgress): number =>
  hasSkill(progress, 'ocean_legacy')
    ? 0.05 + getTidalInheritanceRank(progress) * 0.05
    : 0;
export const getManualYield = (progress: IslandProgress, kind?: ResourceKind): number =>
  (hasSkill(progress, 'sharp_tools') ? 2 : 1)
  + (hasProject(progress, 'starter_tools') ? 1 : 0)
  + (hasProject(progress, 'communal_sawmill') ? 1 : 0)
  + (kind && hasSkill(progress, 'adaptive_harvest') && getPriorityShortage(progress) === kind ? 1 : 0);
export const getRespawnMultiplier = (progress: IslandProgress): number =>
  (hasSkill(progress, 'living_quarries') ? 0.65 : 1)
  * (hasProject(progress, 'shore_walls') ? 0.88 : 1)
  * (hasProject(progress, 'crystal_beacons') ? 0.82 : 1);

export const getCacheReward = (progress: IslandProgress, reward: Cost): Cost => {
  const multiplier = (hasSkill(progress, 'cache_instinct') ? 1.5 : 1) * (hasSkill(progress, 'far_horizons') ? 1.25 : 1);
  return {
    wood: Math.ceil(reward.wood * multiplier),
    stone: Math.ceil(reward.stone * multiplier),
    copper: Math.ceil(reward.copper * multiplier),
    crystal: Math.ceil(reward.crystal * multiplier),
  };
};

export const getAutoRegulationInterval = (progress: IslandProgress): number =>
  hasSkill(progress, 'archipelago_consciousness') ? 1.5
    : hasSkill(progress, 'collective_intelligence') ? 3
      : hasSkill(progress, 'coordinated_shifts') ? 5 : 8;

export const getAutoRegulationMoveCount = (progress: IslandProgress): number =>
  hasSkill(progress, 'archipelago_consciousness') ? 4 : hasSkill(progress, 'collective_intelligence') ? 2 : 1;

export const getTotalWorkerLevels = (progress: IslandProgress): number =>
  progress.workers.reduce((total, worker) => total + worker.level, 0);

export const getChapter = (progress: IslandProgress): number => {
  if (progress.bridgesBuilt[3]) return 5;
  if (progress.bridgesBuilt[2]) return 4;
  if (progress.bridgesBuilt[1]) return 3;
  if (progress.bridgesBuilt[0]) return 2;
  return 1;
};

export const formatCost = (value: Cost): string => RESOURCE_KINDS
  .filter((kind) => value[kind] > 0)
  .map((kind) => `${value[kind]} ${RESOURCE_LABELS[kind]}`)
  .join(' · ') || 'gratuit';

export const formatBridgeRequirement = (progress: IslandProgress, index: number): string => {
  switch (index) {
    case 0:
      return progress.workers.length < 2 ? '2 travailleurs requis' : '1 bûcheron et 1 mineur requis';
    case 1:
      return progress.workers.length < 4 ? '4 travailleurs requis'
        : !progress.workers.some((worker) => worker.level >= 2) ? 'un travailleur niveau 2 requis'
          : getCompletedProjectCount(progress) < 3 ? '3 Grands Travaux des Pins requis' : '';
    case 2:
      return progress.workers.length < 5 ? '5 travailleurs requis'
        : !progress.workers.some((worker) => worker.task === 'copper') ? 'un cuivrier assigné requis'
          : getCompletedProjectCount(progress) < 6 ? '6 Grands Travaux cumulés requis' : '';
    case 3:
      return progress.workers.length < 7 ? '7 travailleurs requis'
        : !progress.workers.some((worker) => worker.task === 'crystal') || getTotalWorkerLevels(progress) < 10
          ? 'un cristallier et 10 niveaux cumulés requis'
          : getCompletedProjectCount(progress) < 9 ? '9 Grands Travaux cumulés requis' : '';
    default:
      return '';
  }
};

const canPay = (progress: IslandProgress, value: Cost): boolean =>
  RESOURCE_KINDS.every((kind) => progress[kind] >= value[kind]);

/**
 * Source unique pour le panneau d'objectifs et les pads de pont. Les critères
 * restent donc toujours identiques à ceux réellement vérifiés par Economy.
 */
export const getIslandGoal = (progress: IslandProgress, islandIndex: number): IslandGoal => {
  const completedProjects = getCompletedProjectCount(progress);
  const totalLevels = getTotalWorkerLevels(progress);
  const hasTask = (task: ResourceKind): boolean => progress.workers.some((worker) => worker.task === task);
  const bridgeCost = islandIndex < 4 ? getBridgeCost(progress, islandIndex) : getFinalCost(progress);
  const passageAlreadyCompleted = islandIndex < 4
    ? Boolean(progress.bridgesBuilt[islandIndex])
    : progress.completed;
  // Une réserve payée pour un pont ne doit jamais redevenir « manquante » :
  // le paiement du passage est la preuve persistante que l'objectif est clos.
  const reservesReady = passageAlreadyCompleted || (bridgeCost ? canPay(progress, bridgeCost) : false);
  let destination = 'Cœur de l’Archipel';
  let items: IslandGoalItem[] = [];

  switch (islandIndex) {
    case 0:
      destination = 'Île des Pins';
      items = [
        { id: 'warehouse', label: 'Assembler le Dépôt des Marées', done: progress.warehousesBuilt[0] },
        { id: 'camp', label: 'Construire le Camp des Marées', done: progress.campBuilt },
        { id: 'project-hall', label: 'Construire la Maison des Travaux des Marées', done: isProjectHallBuilt(progress, 0) },
        { id: 'projects', label: 'Achever les 3 Travaux des Marées', done: completedProjects >= 3 },
        { id: 'workers', label: 'Réunir 2 renards', done: progress.workers.length >= 2 },
        { id: 'wood-job', label: 'Assigner 1 bûcheron', done: hasTask('wood') },
        { id: 'stone-job', label: 'Assigner 1 mineur', done: hasTask('stone') },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    case 1:
      destination = 'Île Cuivrée';
      items = [
        { id: 'workshop', label: 'Construire l’Atelier des Pins', done: progress.workshopBuilt },
        { id: 'project-hall', label: 'Construire la Maison des Travaux des Pins', done: isProjectHallBuilt(progress, 1) },
        { id: 'workers', label: 'Réunir 4 renards', done: progress.workers.length >= 4 },
        { id: 'level', label: 'Former 1 renard niveau 2', done: progress.workers.some((worker) => worker.level >= 2) },
        { id: 'projects', label: 'Achever les 3 Travaux à la Maison des Pins', done: completedProjects >= 6 },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    case 2:
      destination = 'Île de Cristal';
      items = [
        { id: 'foundry', label: 'Construire la Fonderie Cuivrée', done: progress.foundryBuilt },
        { id: 'project-hall', label: 'Construire la Maison des Travaux Cuivrée', done: isProjectHallBuilt(progress, 2) },
        { id: 'workers', label: 'Réunir 5 renards', done: progress.workers.length >= 5 },
        { id: 'copper-job', label: 'Assigner 1 cuivrier', done: hasTask('copper') },
        { id: 'projects', label: 'Achever 9 Grands Travaux', done: completedProjects >= 9 },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    case 3:
      destination = 'Île Couronne';
      items = [
        { id: 'altar', label: 'Bâtir l’Autel du Savoir sur l’île de Cristal', done: progress.observatoryBuilt },
        { id: 'project-hall', label: 'Construire la Maison des Travaux de Cristal', done: isProjectHallBuilt(progress, 3) },
        { id: 'workers', label: 'Réunir 7 renards', done: progress.workers.length >= 7 },
        { id: 'crystal-job', label: 'Assigner 1 cristallier', done: hasTask('crystal') },
        { id: 'levels', label: 'Atteindre 10 niveaux cumulés', done: totalLevels >= 10 },
        { id: 'projects', label: 'Achever 12 Grands Travaux', done: completedProjects >= 12 },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    default:
      items = [
        { id: 'project-hall', label: 'Construire la Maison des Travaux de la Couronne', done: isProjectHallBuilt(progress, 4) },
        { id: 'workers', label: 'Réunir 8 renards', done: progress.workers.length >= 8 },
        { id: 'jobs', label: 'Maintenir les 4 métiers', done: RESOURCE_KINDS.every(hasTask) },
        { id: 'levels', label: 'Atteindre 12 niveaux cumulés', done: totalLevels >= 12 },
        { id: 'projects', label: 'Achever les 15 Grands Travaux', done: completedProjects >= ISLAND_PROJECTS.length },
        { id: 'offering', label: `Préparer ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
        { id: 'heart', label: 'Éveiller le Cœur', done: progress.completed },
      ];
  }

  if (passageAlreadyCompleted) {
    items = items.map((item) => ({ ...item, done: true }));
  }

  return {
    islandIndex,
    title: islandIndex < 4 ? `OBJECTIF · CAP SUR ${destination.toUpperCase()}` : 'OBJECTIF FINAL · LE CŒUR',
    destination,
    completed: passageAlreadyCompleted || items.every((item) => item.done),
    items,
  };
};

export const getNextProject = (progress: IslandProgress): IslandProjectDefinition | null =>
  ISLAND_PROJECTS.find((definition) => !hasProject(progress, definition.id) && projectPrerequisitesMet(progress, definition)) ?? null;

export const getNextStrategicCost = (progress: IslandProgress): Cost => {
  if (!progress.warehousesBuilt[0]) return getWarehouseCost(progress, 0) ?? cost();
  if (!progress.campBuilt) return getStructureCost(progress, 'camp');
  if (!isProjectHallBuilt(progress, 0)) return getProjectHallCost(progress, 0);
  if (getCompletedProjectCount(progress) < 3) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (progress.workers.length < 2) return getRecruitCost(progress);
  if (!progress.bridgesBuilt[0]) return getBridgeCost(progress, 0) ?? cost();
  if (!progress.workshopBuilt) return getStructureCost(progress, 'workshop');
  if (!isProjectHallBuilt(progress, 1)) return getProjectHallCost(progress, 1);
  if (progress.workers.length < 4) return getRecruitCost(progress);
  if (!progress.workers.some((worker) => worker.level >= 2)) return getUpgradeCost(progress.workers[0] ?? { id: '', name: '', task: 'wood', level: 1 }, progress);
  if (getCompletedProjectCount(progress) < 6) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (!progress.bridgesBuilt[1]) return getBridgeCost(progress, 1) ?? cost();
  if (!progress.foundryBuilt) return getStructureCost(progress, 'foundry');
  if (!isProjectHallBuilt(progress, 2)) return getProjectHallCost(progress, 2);
  if (progress.workers.length < 5) return getRecruitCost(progress);
  if (getCompletedProjectCount(progress) < 9) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (!progress.bridgesBuilt[2]) return getBridgeCost(progress, 2) ?? cost();
  if (!progress.observatoryBuilt) return getStructureCost(progress, 'observatory');
  if (!isProjectHallBuilt(progress, 3)) return getProjectHallCost(progress, 3);
  if (progress.workers.length < 7) return getRecruitCost(progress);
  if (getCompletedProjectCount(progress) < 12) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (!progress.bridgesBuilt[3]) return getBridgeCost(progress, 3) ?? cost();
  if (!isProjectHallBuilt(progress, 4)) return getProjectHallCost(progress, 4);
  if (progress.workers.length < 8) return getRecruitCost(progress);
  if (getCompletedProjectCount(progress) < ISLAND_PROJECTS.length) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  return getFinalCost(progress);
};

export const getPriorityShortage = (progress: IslandProgress): ResourceKind => {
  const target = getNextStrategicCost(progress);
  const unlocked = getUnlockedWorkerTasks(progress);
  return [...(unlocked.length ? unlocked : ['wood', 'stone'] as ResourceKind[])].sort((a, b) => {
    const score = (kind: ResourceKind): number => {
      const required = target[kind];
      const missingRatio = required > 0 ? Math.max(0, required - progress[kind]) / required : 0;
      return missingRatio * 3 + 1 / (progress[kind] + 4);
    };
    return score(b) - score(a);
  })[0] ?? 'wood';
};

export const chooseAutoRegulationMove = (progress: IslandProgress): AssignmentMove | null => {
  const tasks = getUnlockedWorkerTasks(progress);
  if (tasks.length < 2 || progress.workers.length < 2) return null;
  const targetCost = getNextStrategicCost(progress);
  const counts = new Map(tasks.map((task) => [task, progress.workers.filter((worker) => worker.task === task).length]));
  const production = new Map(tasks.map((task) => [task, progress.workers
    .filter((worker) => worker.task === task)
    .reduce((sum, worker) => sum + getWorkerYield(worker.level, progress), 0)]));
  const maxStock = Math.max(1, ...tasks.map((task) => progress[task]));
  const score = (task: ResourceKind): number => {
    const required = targetCost[task];
    const missing = Math.max(0, required - progress[task]);
    const objectivePressure = required > 0 ? missing / required : 0;
    const scarcity = (maxStock - progress[task]) / maxStock;
    const uncovered = (counts.get(task) ?? 0) === 0 ? 2.2 : 0;
    return uncovered + objectivePressure * 2.8 + scarcity * 0.32 - (production.get(task) ?? 0) * 0.025;
  };
  const ordered = [...tasks].sort((a, b) => score(b) - score(a));
  const target = ordered[0];
  if (!target) return null;
  const donorTasks = [...tasks]
    .filter((task) => task !== target && (counts.get(task) ?? 0) > 1)
    .sort((a, b) => score(a) - score(b));
  const donor = donorTasks[0];
  if (!donor || (counts.get(target) ?? 0) > 0 && score(target) - score(donor) < 0.22) return null;
  const worker = progress.workers
    .filter((candidate) => candidate.task === donor)
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))[0];
  return worker ? { workerId: worker.id, from: donor, to: target } : null;
};

export const getRebirthReward = (progress: IslandProgress): number => 3 + Math.min(3, progress.rebirths);

export const getObjective = (progress: IslandProgress): ObjectiveCopy => {
  const chapter = getChapter(progress);
  const eyebrow = `MARÉE ${progress.rebirths + 1} · CHAPITRE ${chapter}/5`;
  if (!progress.warehousesBuilt[0]) return {
    chapter,
    eyebrow,
    title: 'Assemble le Dépôt des Marées',
    detail: 'Le kit est gratuit : toutes les cargaisons y seront déchargées.',
  };
  if (getPlayerCargoTotal(progress) > 0 && !progress.campBuilt) return {
    chapter,
    eyebrow,
    title: 'Décharge ta cargaison',
    detail: `${getPlayerCargoTotal(progress)}/${getCargoCapacity(progress)} unités sont visibles sur ton dos.`,
  };
  if (!progress.campBuilt) return { chapter, eyebrow, title: 'Bâtis le camp des Marées', detail: `Coût : ${formatCost(getStructureCost(progress, 'camp'))}` };
  if (!isProjectHallBuilt(progress, 0)) return { chapter, eyebrow, title: 'Construis la Maison des Travaux des Marées', detail: `Après le Camp · coût : ${formatCost(getProjectHallCost(progress, 0))}` };
  if (getCompletedProjectCount(progress) < 3) return { chapter, eyebrow, title: 'Aménage l’Îlot des Marées', detail: `${getCompletedProjectCount(progress)}/3 premiers Travaux avant le pont des Pins.` };
  if (progress.workers.length < 2) return { chapter, eyebrow, title: 'Forme ta première équipe', detail: 'Entre dans la nurserie centrale : recrute 2 renards et assigne bois + pierre.' };
  if (!progress.bridgesBuilt[0]) return { chapter, eyebrow, title: 'Ouvre le pont des Pins', detail: `Coût : ${formatCost(getBridgeCost(progress, 0) ?? cost())}` };
  if (!progress.workshopBuilt) return { chapter, eyebrow, title: 'Construis l’atelier des Pins', detail: `Coût : ${formatCost(getStructureCost(progress, 'workshop'))}` };
  if (!isProjectHallBuilt(progress, 1)) return { chapter, eyebrow, title: 'Construis la Maison des Travaux des Pins', detail: `Après l’Atelier · coût : ${formatCost(getProjectHallCost(progress, 1))}` };
  if (progress.workers.length < 4) return { chapter, eyebrow, title: 'Agrandis l’équipe à 4', detail: 'L’atelier porte la capacité à 5 travailleurs.' };
  if (!progress.workers.some((worker) => worker.level >= 2)) return { chapter, eyebrow, title: 'Forme un travailleur', detail: 'Entre dans l’Atelier des Pins et passe un renard au niveau 2.' };
  if (getCompletedProjectCount(progress) < 6) return { chapter, eyebrow, title: 'Développe l’île des Pins', detail: `${getCompletedProjectCount(progress)}/6 Grands Travaux avant le pont Cuivré.` };
  if (!progress.bridgesBuilt[1]) return { chapter, eyebrow, title: 'Relie l’île Cuivrée', detail: `Coût : ${formatCost(getBridgeCost(progress, 1) ?? cost())}` };
  if (!progress.foundryBuilt) return { chapter, eyebrow, title: 'Récolte le cuivre et bâtis la fonderie', detail: `Coût : ${formatCost(getStructureCost(progress, 'foundry'))}` };
  if (!isProjectHallBuilt(progress, 2)) return { chapter, eyebrow, title: 'Construis la Maison des Travaux Cuivrée', detail: `Après la Fonderie · coût : ${formatCost(getProjectHallCost(progress, 2))}` };
  if (!progress.workers.some((worker) => worker.task === 'copper')) return { chapter, eyebrow, title: 'Assigne un cuivrier', detail: 'Retourne à la nurserie ; la fonderie autorise désormais le métier cuivre.' };
  if (progress.workers.length < 5) return { chapter, eyebrow, title: 'Dirige au moins 5 travailleurs', detail: 'Diversifie la production avant la prochaine traversée.' };
  if (getCompletedProjectCount(progress) < 9) return { chapter, eyebrow, title: 'Industrialise l’île Cuivrée', detail: `${getCompletedProjectCount(progress)}/9 Grands Travaux avant les Cristaux.` };
  if (!progress.bridgesBuilt[2]) return { chapter, eyebrow, title: 'Ouvre la voie des Cristaux', detail: `Coût : ${formatCost(getBridgeCost(progress, 2) ?? cost())}` };
  if (!progress.observatoryBuilt) return {
    chapter,
    eyebrow,
    title: 'Bâtis l’Autel sur l’île de Cristal',
    detail: `Le site spécialisé t’attend sur la quatrième île · grand coût : ${formatCost(getStructureCost(progress, 'observatory'))}`,
  };
  if (!isProjectHallBuilt(progress, 3)) return { chapter, eyebrow, title: 'Construis la Maison des Travaux de Cristal', detail: `Après l’Autel · coût : ${formatCost(getProjectHallCost(progress, 3))}` };
  if (!progress.workers.some((worker) => worker.task === 'crystal')) return { chapter, eyebrow, title: 'Forme un cristallier', detail: 'Retourne à la nurserie et assigne le métier cristal.' };
  if (progress.workers.length < 7 || getTotalWorkerLevels(progress) < 10) return { chapter, eyebrow, title: 'Prépare l’expédition finale', detail: '7 travailleurs et 10 niveaux cumulés requis.' };
  if (getCompletedProjectCount(progress) < 12) return { chapter, eyebrow, title: 'Équipe l’île de Cristal', detail: `${getCompletedProjectCount(progress)}/12 Grands Travaux avant la Couronne.` };
  if (!progress.bridgesBuilt[3]) return { chapter, eyebrow, title: 'Bâtis le pont de la Couronne', detail: `Coût : ${formatCost(getBridgeCost(progress, 3) ?? cost())}` };
  if (!isProjectHallBuilt(progress, 4)) return { chapter, eyebrow, title: 'Construis la Maison des Travaux de la Couronne', detail: `Dernier atelier · coût : ${formatCost(getProjectHallCost(progress, 4))}` };
  if (!Economy.finalRequirementsMet(progress)) return { chapter, eyebrow, title: 'Rassemble les quatre métiers', detail: '8 travailleurs, chaque ressource et 12 niveaux cumulés.' };
  if (getCompletedProjectCount(progress) < ISLAND_PROJECTS.length) return { chapter, eyebrow, title: 'Achève le réseau de la Couronne', detail: `${getCompletedProjectCount(progress)}/${ISLAND_PROJECTS.length} Grands Travaux avant le Cœur.` };
  if (!progress.completed) return { chapter, eyebrow, title: 'Éveille le Cœur de l’Archipel', detail: `Offrande : ${formatCost(getFinalCost(progress))}` };
  return { chapter, eyebrow, title: 'Une Nouvelle Marée t’attend', detail: 'Garde tes talents et recommence avec de nouveaux choix.' };
};

const inferMilestones = (value: Partial<VersionTwoProgress>): string[] => {
  const milestones: string[] = [];
  (['camp', 'workshop', 'foundry', 'observatory'] as StructureKind[]).forEach((kind) => {
    if (value[`${kind}Built` as keyof VersionTwoProgress]) milestones.push(`structure:${kind}`);
  });
  value.bridgesBuilt?.forEach((built, index) => { if (built) milestones.push(`bridge:${index}`); });
  if (value.completed) milestones.push('heart');
  return milestones;
};

const LEGACY_TUTORIALS = [
  'welcome',
  'warehouse-central',
  'nursery',
  'island-goals',
  'bridge-guidance',
  'pins-logistics',
  'workshop',
  'foundry',
  'observatory',
] as const;

const legacyWarehouses = (value: {
  wood?: number;
  stone?: number;
  copper?: number;
  crystal?: number;
  campBuilt?: boolean;
  workers?: WorkerState[];
  bridgesBuilt?: readonly boolean[];
}): WarehouseState => [
  Boolean(
    value.campBuilt
    || value.workers?.length
    || value.bridgesBuilt?.some(Boolean)
    || nonNegativeInteger(value.wood)
    || nonNegativeInteger(value.stone)
    || nonNegativeInteger(value.copper)
    || nonNegativeInteger(value.crystal)
  ),
  false,
  false,
  false,
  false,
];

export class Economy {
  readonly progress: IslandProgress;

  constructor(initial?: Partial<IslandProgress>) {
    const fresh = freshProgress();
    const sourceBridges = Array.isArray(initial?.bridgesBuilt) ? initial.bridgesBuilt : fresh.bridgesBuilt;
    const sourceWarehouses = sanitizeWarehouses(initial?.warehousesBuilt);
    const sourceProjectHalls = sanitizeProjectHalls(initial?.projectHallsBuilt);
    const rankIds = initial?.skillRanks && typeof initial.skillRanks === 'object' ? Object.keys(initial.skillRanks) : [];
    const knownSkills = [...(initial?.skills ?? []), ...rankIds].filter(isSkillId);
    const skills = sanitizeSkills(expandLegacyRankedSkills(knownSkills, initial?.skillRanks));
    const skillRanks = sanitizeSkillRanks(initial?.skillRanks, skills);
    this.progress = {
      ...fresh,
      ...initial,
      version: 12,
      wood: nonNegativeInteger(initial?.wood),
      stone: nonNegativeInteger(initial?.stone),
      copper: nonNegativeInteger(initial?.copper),
      crystal: nonNegativeInteger(initial?.crystal),
      playerCargo: sanitizeCost(initial?.playerCargo),
      warehousesBuilt: sourceWarehouses,
      projectHallsBuilt: sourceProjectHalls,
      campBuilt: Boolean(initial?.campBuilt),
      workshopBuilt: Boolean(initial?.workshopBuilt),
      foundryBuilt: Boolean(initial?.foundryBuilt),
      observatoryBuilt: Boolean(initial?.observatoryBuilt),
      bridgesBuilt: [Boolean(sourceBridges[0]), Boolean(sourceBridges[1]), Boolean(sourceBridges[2]), Boolean(sourceBridges[3])],
      cachesFound: Array.isArray(initial?.cachesFound) ? [...new Set(initial.cachesFound.filter((id): id is string => typeof id === 'string'))] : [],
      workers: sanitizeWorkers(initial?.workers),
      completed: Boolean(initial?.completed),
      elapsedSeconds: Math.max(0, Number(initial?.elapsedSeconds) || 0),
      knowledge: nonNegativeInteger(initial?.knowledge),
      skills,
      skillRanks,
      autoRegulation: skills.includes('auto_regulation') && Boolean(initial?.autoRegulation),
      industrySurge: skills.includes('endless_engine') && Boolean(initial?.industrySurge),
      explorationFlow: skills.includes('ocean_legacy') && Boolean(initial?.explorationFlow),
      powerNotifications: Boolean(initial?.powerNotifications),
      powerVfx: initial?.powerVfx !== false,
      rebirths: nonNegativeInteger(initial?.rebirths),
      cycleMilestones: Array.isArray(initial?.cycleMilestones) ? [...new Set(initial.cycleMilestones.filter((id): id is string => typeof id === 'string'))] : [],
      lifetimeDeliveries: nonNegativeInteger(initial?.lifetimeDeliveries),
      projectsCompleted: sanitizeProjects(initial?.projectsCompleted),
      tutorialSeen: sanitizeStringList(initial?.tutorialSeen),
      currentWorld: initial?.currentWorld === 2 ? 2 : 1,
      worldTwoPeakReached: Boolean(initial?.worldTwoPeakReached),
      worldTwoMoney: nonNegativeInteger(initial?.worldTwoMoney),
      worldTwoFangLevel: Math.max(1, Math.min(30, nonNegativeInteger(initial?.worldTwoFangLevel) || 1)),
      worldTwoWolfFangLevel: Math.max(1, Math.min(30, nonNegativeInteger(initial?.worldTwoWolfFangLevel) || 1)),
      worldTwoCargo: sanitizeWorldTwoCargo(initial?.worldTwoCargo),
      worldTwoTerracesUnlocked: 11,
      worldTwoWolves: sanitizeWorldTwoWolves(initial?.worldTwoWolves),
      worldTwoSkills: sanitizeWorldTwoSkills(initial?.worldTwoSkills),
      worldTwoEnemyDefeats: nonNegativeInteger(initial?.worldTwoEnemyDefeats),
      worldTwoBuildings: sanitizeWorldTwoBuildings(initial?.worldTwoBuildings),
      worldTwoLifetimeMoney: nonNegativeInteger(initial?.worldTwoLifetimeMoney),
      worldTwoMineralsSold: nonNegativeInteger(initial?.worldTwoMineralsSold),
    };
    if (this.progress.currentWorld === 2 && !isWorldTwoUnlocked(this.progress)) this.progress.currentWorld = 1;
  }

  add(kind: ResourceKind, amount = 1): void {
    this.progress[kind] += nonNegativeInteger(amount);
  }

  carryForPlayer(kind: ResourceKind, amount = 1): number {
    const free = Math.max(0, getCargoCapacity(this.progress) - getPlayerCargoTotal(this.progress));
    const carried = Math.min(free, nonNegativeInteger(amount));
    this.progress.playerCargo[kind] += carried;
    return carried;
  }

  depositPlayerCargo(kind: ResourceKind, amount = 1): number {
    const delivered = Math.min(this.progress.playerCargo[kind], Math.max(1, nonNegativeInteger(amount)));
    if (delivered <= 0) return 0;
    this.progress.playerCargo[kind] -= delivered;
    this.add(kind, delivered);
    return delivered;
  }

  unloadPlayerCargo(kind: ResourceKind, amount = 1): number {
    const unloaded = Math.min(this.progress.playerCargo[kind], Math.max(1, nonNegativeInteger(amount)));
    if (unloaded <= 0) return 0;
    this.progress.playerCargo[kind] -= unloaded;
    return unloaded;
  }

  addWorldTwoMoney(amount: number): void {
    const credited = nonNegativeInteger(amount);
    this.progress.worldTwoMoney += credited;
    this.progress.worldTwoLifetimeMoney += credited;
  }

  addWorldTwo(kind: WorldTwoMineralId, amount = 1, fullCargo = false): void {
    const units = nonNegativeInteger(amount);
    const value = getWorldTwoMineral(kind).saleValue * units * getWorldTwoSaleMultiplier(this.progress, fullCargo);
    this.addWorldTwoMoney(Math.round(value));
    this.progress.worldTwoMineralsSold += units;
  }

  carryWorldTwoForPlayer(kind: WorldTwoMineralId, amount = 1): number {
    const free = Math.max(0, getWorldTwoCargoCapacity(this.progress) - getWorldTwoCargoTotal(this.progress));
    const carried = Math.min(free, nonNegativeInteger(amount));
    this.progress.worldTwoCargo[kind] = (this.progress.worldTwoCargo[kind] ?? 0) + carried;
    return carried;
  }

  depositWorldTwoCargo(kind: WorldTwoMineralId, amount = 1): number {
    const delivered = Math.min(this.progress.worldTwoCargo[kind] ?? 0, Math.max(1, nonNegativeInteger(amount)));
    if (delivered <= 0) return 0;
    this.progress.worldTwoCargo[kind] = (this.progress.worldTwoCargo[kind] ?? 0) - delivered;
    if ((this.progress.worldTwoCargo[kind] ?? 0) <= 0) delete this.progress.worldTwoCargo[kind];
    this.addWorldTwo(kind, delivered);
    return delivered;
  }

  unloadWorldTwoCargo(kind: WorldTwoMineralId, amount = 1): number {
    const unloaded = Math.min(this.progress.worldTwoCargo[kind] ?? 0, Math.max(1, nonNegativeInteger(amount)));
    if (unloaded <= 0) return 0;
    this.progress.worldTwoCargo[kind] = (this.progress.worldTwoCargo[kind] ?? 0) - unloaded;
    if ((this.progress.worldTwoCargo[kind] ?? 0) <= 0) delete this.progress.worldTwoCargo[kind];
    return unloaded;
  }

  canAffordWorldTwo(value: number): boolean {
    return this.progress.worldTwoMoney >= Math.max(0, nonNegativeInteger(value));
  }

  missingWorldTwo(value: number): number {
    return Math.max(0, nonNegativeInteger(value) - this.progress.worldTwoMoney);
  }

  private spendWorldTwo(value: number): boolean {
    if (!this.canAffordWorldTwo(value)) return false;
    this.progress.worldTwoMoney -= nonNegativeInteger(value);
    return true;
  }

  unlockWorldTwoTerrace(terraceIndex: number): boolean {
    this.progress.worldTwoTerracesUnlocked = 11;
    return terraceIndex >= 0 && terraceIndex < 11;
  }

  buildWorldTwoBuilding(id: WorldTwoBuildingId): boolean {
    const definition = getWorldTwoBuilding(id);
    if (
      !definition
      || hasWorldTwoBuilding(this.progress, id)
      || !worldTwoBuildingRequirementsMet(this.progress, definition)
      || !this.spendWorldTwo(definition.cost)
    ) return false;
    this.progress.worldTwoBuildings.push(id);
    if (id === 'pack_lodge') {
      this.progress.worldTwoWolves.forEach((wolf) => {
        wolf.health = Math.max(wolf.health, getWorldTwoWolfMaximumHealth(this.progress));
      });
    }
    if (id === 'zenith_core') this.progress.worldTwoPeakReached = true;
    return true;
  }

  upgradeWorldTwoFangs(actor: 'player' | 'wolf'): boolean {
    const upgradeCost = getWorldTwoFangUpgradeCost(this.progress, actor);
    if (upgradeCost === null || !this.spendWorldTwo(upgradeCost)) return false;
    if (actor === 'player') this.progress.worldTwoFangLevel += 1;
    else this.progress.worldTwoWolfFangLevel += 1;
    return true;
  }

  hireWorldTwoWolf(): WorldTwoWorkerState | null {
    if (this.progress.worldTwoWolves.length >= getWorldTwoPackCapacity(this.progress)) return null;
    if (!this.spendWorldTwo(getWorldTwoRecruitCost(this.progress))) return null;
    const index = this.progress.worldTwoWolves.length;
    const unlockedTasks = WORLD_TWO_MINERAL_IDS.slice(0, this.progress.worldTwoWolfFangLevel);
    const worker: WorldTwoWorkerState = {
      id: `wolf-${index + 1}`,
      name: WOLF_NAMES[index] ?? `Loup ${index + 1}`,
      task: unlockedTasks[index % unlockedTasks.length] ?? 'stone',
      level: 1,
      health: getWorldTwoWolfMaximumHealth(this.progress),
    };
    this.progress.worldTwoWolves.push(worker);
    return worker;
  }

  unlockWorldTwoSkill(id: WorldTwoSkillId): boolean {
    const definition = WORLD_TWO_SKILLS.find((candidate) => candidate.id === id);
    if (
      !definition
      || hasWorldTwoSkill(this.progress, id)
      || !worldTwoSkillPrerequisitesMet(this.progress, definition)
      || !this.spendWorldTwo(definition.cost)
    ) return false;
    this.progress.worldTwoSkills.push(id);
    return true;
  }

  damageWorldTwoWolf(id: string, amount: number): boolean {
    const worker = this.progress.worldTwoWolves.find((candidate) => candidate.id === id);
    if (!worker) return false;
    worker.health = Math.max(0, worker.health - Math.max(1, nonNegativeInteger(amount)));
    if (worker.health > 0) return false;
    this.progress.worldTwoWolves = this.progress.worldTwoWolves.filter((candidate) => candidate.id !== id);
    return true;
  }

  recordWorldTwoEnemyDefeat(terraceIndex = 0): number {
    this.progress.worldTwoEnemyDefeats += 1;
    if (!hasWorldTwoSkill(this.progress, 'summit_bounty')) return 0;
    const base = 80 + Math.max(0, terraceIndex) * 45;
    const bounty = Math.round(base * (hasWorldTwoBuilding(this.progress, 'storm_watch') ? 2 : 1));
    this.addWorldTwoMoney(bounty);
    return bounty;
  }

  markTutorial(id: string): boolean {
    const normalized = id.trim().slice(0, 64);
    if (!normalized || this.progress.tutorialSeen.includes(normalized)) return false;
    this.progress.tutorialSeen.push(normalized);
    return true;
  }

  canAfford(value: Cost): boolean {
    return RESOURCE_KINDS.every((kind) => this.progress[kind] >= value[kind]);
  }

  missing(value: Cost): Cost {
    return {
      wood: Math.max(0, value.wood - this.progress.wood),
      stone: Math.max(0, value.stone - this.progress.stone),
      copper: Math.max(0, value.copper - this.progress.copper),
      crystal: Math.max(0, value.crystal - this.progress.crystal),
    };
  }

  private spend(value: Cost): boolean {
    if (!this.canAfford(value)) return false;
    RESOURCE_KINDS.forEach((kind) => { this.progress[kind] -= value[kind]; });
    return true;
  }

  private awardMilestone(id: string, amount = 1): void {
    if (this.progress.cycleMilestones.includes(id)) return;
    this.progress.cycleMilestones.push(id);
    this.progress.knowledge += amount;
  }

  buildWarehouse(islandIndex: number): boolean {
    const warehouseCost = getWarehouseCost(this.progress, islandIndex);
    const accessible = islandIndex === 0 || Boolean(this.progress.bridgesBuilt[islandIndex - 1]);
    if (
      !warehouseCost
      || this.progress.warehousesBuilt[islandIndex]
      || !accessible
      || !isWarehouseUnlocked(this.progress, islandIndex)
      || !this.spend(warehouseCost)
    ) return false;
    this.progress.warehousesBuilt[islandIndex] = true;
    this.awardMilestone(`warehouse:${islandIndex}`, islandIndex === 0 ? 0 : 1);
    return true;
  }

  buildStructure(kind: StructureKind): boolean {
    const flag = `${kind}Built` as const;
    if (this.progress[flag]) return false;
    const accessible = kind === 'camp'
      ? this.progress.warehousesBuilt[0]
      : kind === 'workshop'
        ? this.progress.bridgesBuilt[0]
        : kind === 'foundry'
          ? this.progress.bridgesBuilt[1]
          : this.progress.bridgesBuilt[2];
    if (!accessible || !this.spend(getStructureCost(this.progress, kind))) return false;
    this.progress[flag] = true;
    this.awardMilestone(`structure:${kind}`);
    return true;
  }

  hireWorker(): WorkerState | null {
    if (!this.progress.campBuilt || this.progress.workers.length >= getWorkerCapacity(this.progress)) return null;
    if (!this.spend(getRecruitCost(this.progress))) return null;
    const index = this.progress.workers.length;
    const tasks = getUnlockedWorkerTasks(this.progress);
    const counts = new Map(tasks.map((task) => [task, this.progress.workers.filter((worker) => worker.task === task).length]));
    const task = [...tasks].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0] ?? 'wood';
    const worker: WorkerState = {
      id: `worker-${index + 1}`,
      name: WORKER_NAMES[index] ?? `Renard ${index + 1}`,
      task,
      level: 1,
    };
    this.progress.workers.push(worker);
    return worker;
  }

  assignWorker(id: string, task: ResourceKind): boolean {
    if (!getUnlockedWorkerTasks(this.progress).includes(task)) return false;
    const worker = this.progress.workers.find((candidate) => candidate.id === id);
    if (!worker || worker.task === task) return false;
    worker.task = task;
    return true;
  }

  upgradeWorker(id: string): boolean {
    const worker = this.progress.workers.find((candidate) => candidate.id === id);
    if (!worker || worker.level >= getWorkerLevelCap(this.progress) || worker.level >= 3) return false;
    if (!this.spend(getUpgradeCost(worker, this.progress))) return false;
    worker.level = (worker.level + 1) as WorkerLevel;
    return true;
  }

  bridgeRequirementsMet(index: number): boolean {
    const workers = this.progress.workers;
    switch (index) {
      case 0:
        return this.progress.campBuilt && workers.length >= 2
          && workers.some((worker) => worker.task === 'wood')
          && workers.some((worker) => worker.task === 'stone')
          && getCompletedProjectCount(this.progress) >= 3;
      case 1:
        return this.progress.workshopBuilt && workers.length >= 4
          && workers.some((worker) => worker.level >= 2)
          && getCompletedProjectCount(this.progress) >= 6;
      case 2:
        return this.progress.foundryBuilt && workers.length >= 5
          && workers.some((worker) => worker.task === 'copper')
          && getCompletedProjectCount(this.progress) >= 9;
      case 3:
        return this.progress.observatoryBuilt && workers.length >= 7
          && workers.some((worker) => worker.task === 'crystal')
          && getTotalWorkerLevels(this.progress) >= 10
          && getCompletedProjectCount(this.progress) >= 12;
      default:
        return false;
    }
  }

  buildBridge(index: number): boolean {
    const bridgeCost = getBridgeCost(this.progress, index);
    if (!bridgeCost || this.progress.bridgesBuilt[index] || !this.bridgeRequirementsMet(index)) return false;
    if (!this.spend(bridgeCost)) return false;
    this.progress.bridgesBuilt[index] = true;
    this.awardMilestone(`bridge:${index}`);
    return true;
  }

  static finalRequirementsMet(progress: IslandProgress): boolean {
    return progress.bridgesBuilt[3]
      && progress.workers.length >= 8
      && RESOURCE_KINDS.every((kind) => progress.workers.some((worker) => worker.task === kind))
      && getTotalWorkerLevels(progress) >= 12;
  }

  complete(): boolean {
    const finalCost = getFinalCost(this.progress);
    if (this.progress.completed
      || !Economy.finalRequirementsMet(this.progress)
      || getCompletedProjectCount(this.progress) < ISLAND_PROJECTS.length
      || !this.spend(finalCost)) return false;
    this.progress.completed = true;
    this.awardMilestone('heart', 2);
    return true;
  }

  findCache(id: string, reward: Cost): boolean {
    if (this.progress.cachesFound.includes(id)) return false;
    this.progress.cachesFound.push(id);
    const adjusted = getCacheReward(this.progress, reward);
    RESOURCE_KINDS.forEach((kind) => this.add(kind, adjusted[kind]));
    return true;
  }

  buildProjectHall(islandIndex: 0 | 1 | 2 | 3 | 4): boolean {
    if (isProjectHallBuilt(this.progress, islandIndex)) return false;
    const projects = ISLAND_PROJECTS.filter((project) => project.islandIndex === islandIndex);
    const requirement = projects[0]?.requiresStructure;
    if (
      !requirement
      || !projectStructureBuilt(this.progress, requirement)
      || (islandIndex > 0 && !this.progress.bridgesBuilt[islandIndex - 1])
      || !this.spend(getProjectHallCost(this.progress, islandIndex))
    ) return false;
    if (islandIndex > 0) this.progress.projectHallsBuilt[islandIndex - 1] = true;
    this.awardMilestone(`project-hall:${islandIndex}`);
    return true;
  }

  buildProject(id: ProjectId): boolean {
    const definition = getProjectDefinition(id);
    if (!definition
      || hasProject(this.progress, id)
      || !projectPrerequisitesMet(this.progress, definition)
      || !this.spend(getProjectCost(this.progress, definition))) return false;
    this.progress.projectsCompleted.push(id);
    this.awardMilestone(`project:${id}`, definition.knowledge);
    return true;
  }

  unlockSkill(id: SkillId): boolean {
    const definition = SKILL_DEFINITIONS.find((candidate) => candidate.id === id);
    if (!definition || !skillPrerequisitesMet(this.progress, definition)) return false;
    const rank = getSkillRank(this.progress, id);
    const maximum = definition.maxRank ?? 1;
    const skillCost = getSkillCost(this.progress, definition);
    if (rank >= maximum || this.progress.knowledge < skillCost) return false;
    this.progress.knowledge -= skillCost;
    if (!this.progress.skills.includes(id)) this.progress.skills.push(id);
    this.progress.skillRanks[id] = rank + 1;
    if (id === 'archipelago_consciousness') this.progress.autoRegulation = true;
    return true;
  }

  setAutoRegulation(enabled: boolean): boolean {
    if (!hasSkill(this.progress, 'auto_regulation')) return false;
    this.progress.autoRegulation = enabled;
    return true;
  }

  setIndustrySurge(enabled: boolean): boolean {
    if (!hasSkill(this.progress, 'endless_engine')) return false;
    this.progress.industrySurge = enabled;
    return true;
  }

  setExplorationFlow(enabled: boolean): boolean {
    if (!hasSkill(this.progress, 'ocean_legacy')) return false;
    this.progress.explorationFlow = enabled;
    return true;
  }

  setPowerNotifications(enabled: boolean): void {
    this.progress.powerNotifications = enabled;
  }

  setPowerVfx(enabled: boolean): void {
    this.progress.powerVfx = enabled;
  }

  autoRegulate(): AssignmentMove | null {
    if (!this.progress.autoRegulation || !hasSkill(this.progress, 'auto_regulation')) return null;
    const move = chooseAutoRegulationMove(this.progress);
    if (!move || !this.assignWorker(move.workerId, move.to)) return null;
    return move;
  }

  recordDelivery(): void {
    this.progress.lifetimeDeliveries += 1;
  }

  rebirth(): number {
    if (!this.progress.completed) return 0;
    const reward = getRebirthReward(this.progress);
    const knowledge = this.progress.knowledge + reward;
    const skills = [...this.progress.skills];
    const skillRanks = { ...this.progress.skillRanks };
    const autoRegulation = this.progress.autoRegulation && skills.includes('auto_regulation');
    const industrySurge = this.progress.industrySurge && skills.includes('endless_engine');
    const explorationFlow = this.progress.explorationFlow && skills.includes('ocean_legacy');
    const powerNotifications = this.progress.powerNotifications;
    const powerVfx = this.progress.powerVfx;
    const rebirths = this.progress.rebirths + 1;
    const lifetimeDeliveries = this.progress.lifetimeDeliveries;
    const tutorialSeen = [...this.progress.tutorialSeen];
    const worldTwoPeakReached = this.progress.worldTwoPeakReached;
    const worldTwoMoney = this.progress.worldTwoMoney;
    const worldTwoFangLevel = this.progress.worldTwoFangLevel;
    const worldTwoWolfFangLevel = this.progress.worldTwoWolfFangLevel;
    const worldTwoCargo = { ...this.progress.worldTwoCargo };
    const worldTwoWolves = this.progress.worldTwoWolves.map((wolf) => ({ ...wolf }));
    const worldTwoSkills = [...this.progress.worldTwoSkills];
    const worldTwoEnemyDefeats = this.progress.worldTwoEnemyDefeats;
    const worldTwoBuildings = [...this.progress.worldTwoBuildings];
    const worldTwoLifetimeMoney = this.progress.worldTwoLifetimeMoney;
    const worldTwoMineralsSold = this.progress.worldTwoMineralsSold;
    const previousStocks = {
      wood: this.progress.wood,
      stone: this.progress.stone,
      copper: this.progress.copper,
      crystal: this.progress.crystal,
    };
    const next = freshProgress();
    if (skills.includes('tidal_memory')) {
      next.wood = 12 + rebirths * 4;
      next.stone = 8 + rebirths * 3;
      next.copper = Math.max(0, rebirths - 1) * 2;
    }
    if (skills.includes('ocean_legacy')) {
      const retainedRatio = getTidalRetentionRate(this.progress);
      RESOURCE_KINDS.forEach((kind) => {
        next[kind] = Math.max(next[kind], Math.floor(previousStocks[kind] * retainedRatio));
      });
    }
    Object.assign(this.progress, next, {
      knowledge,
      skills,
      skillRanks,
      autoRegulation,
      industrySurge,
      explorationFlow,
      powerNotifications,
      powerVfx,
      rebirths,
      lifetimeDeliveries,
      tutorialSeen,
      currentWorld: 1,
      worldTwoPeakReached,
      worldTwoMoney,
      worldTwoFangLevel,
      worldTwoWolfFangLevel,
      worldTwoCargo,
      worldTwoTerracesUnlocked: 11,
      worldTwoWolves,
      worldTwoSkills,
      worldTwoEnemyDefeats,
      worldTwoBuildings,
      worldTwoLifetimeMoney,
      worldTwoMineralsSold,
    });
    return reward;
  }

  tick(delta: number): void {
    if (!this.progress.completed) this.progress.elapsedSeconds += Math.max(0, delta);
  }

  serialize(): string {
    return JSON.stringify(this.progress);
  }

  static restore(raw: string | null): Economy {
    if (!raw) return new Economy();
    try {
      const restoreCompatible = (initial: Partial<IslandProgress>): Economy => {
        const economy = new Economy(initial);
        // Avant la Maison des Marées, le premier pont n’exigeait pas ces
        // trois Travaux. Une ancienne partie déjà rendue aux Pins les reçoit
        // donc sans altérer son total historique de Savoir.
        if (economy.progress.bridgesBuilt[0]) {
          economy.progress.projectsCompleted = [
            ...STARTER_PROJECTS,
            ...economy.progress.projectsCompleted.filter((id) =>
              !STARTER_PROJECTS.includes(id as typeof STARTER_PROJECTS[number])),
          ];
          if (!economy.progress.cycleMilestones.includes('project-hall:0')) {
            economy.progress.cycleMilestones.push('project-hall:0');
          }
        }
        return economy;
      };
      const value = JSON.parse(raw) as Partial<IslandProgress> | VersionElevenProgress | VersionTenProgress | VersionNineProgress | VersionEightProgress | VersionSevenProgress | VersionSixProgress | VersionFiveProgress | VersionFourProgress | VersionThreeProgress | VersionTwoProgress | LegacyProgress;
      if (value.version === 12) return restoreCompatible(value as Partial<IslandProgress>);
      if (value.version === 11) {
        const previous = value as VersionElevenProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          worldTwoBuildings: previous.worldTwoPeakReached ? WORLD_TWO_BUILDINGS.map((building) => building.id) : [],
          worldTwoLifetimeMoney: previous.worldTwoMoney,
          worldTwoMineralsSold: 0,
        });
      }
      if (value.version === 10) {
        const previous = value as VersionTenProgress;
        const {
          version: _previousVersion,
          worldTwoResources,
          worldTwoCargo,
          worldTwoWolves,
          ...migrated
        } = previous;
        const migratedFangs = getLegacyFangLevel(worldTwoResources, worldTwoCargo);
        return restoreCompatible({
          ...migrated,
          worldTwoMoney: getLegacyWorldTwoValue(worldTwoResources) + getLegacyWorldTwoValue(worldTwoCargo),
          worldTwoFangLevel: migratedFangs,
          worldTwoWolfFangLevel: migratedFangs,
          worldTwoCargo: {},
          worldTwoTerracesUnlocked: 11,
          worldTwoWolves: (worldTwoWolves ?? []).map((wolf) => ({
            ...wolf,
            task: WORLD_TWO_MINERAL_IDS.includes(wolf.task as WorldTwoMineralId)
              ? wolf.task as WorldTwoMineralId
              : 'stone',
          })),
        });
      }
      if (value.version === 9) {
        const previous = value as VersionNineProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          worldTwoMoney: 0,
          worldTwoFangLevel: 1,
          worldTwoWolfFangLevel: 1,
          worldTwoCargo: {},
          worldTwoTerracesUnlocked: 11,
          worldTwoWolves: [],
          worldTwoSkills: [],
          worldTwoEnemyDefeats: 0,
        });
      }
      if (value.version === 8) {
        const previous = value as VersionEightProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({ ...migrated, currentWorld: 1, worldTwoPeakReached: false });
      }
      if (value.version === 7) {
        const previous = value as VersionSevenProgress;
        const { version: _previousVersion, ...migrated } = previous;
        const completed = new Set(previous.projectsCompleted ?? []);
        return restoreCompatible({
          ...migrated,
          projectHallsBuilt: ([1, 2, 3, 4] as const).map((islandIndex) =>
            ISLAND_PROJECTS.some((project) =>
              project.islandIndex === islandIndex && completed.has(project.id))) as ProjectHallState,
        });
      }
      if (value.version === 6) {
        const previous = value as VersionSixProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          // Les notifications automatiques sont volontairement silencieuses
          // après migration pour supprimer immédiatement le spam existant.
          powerNotifications: false,
          powerVfx: true,
        });
      }
      if (value.version === 5) {
        const previous = value as VersionFiveProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          warehousesBuilt: legacyWarehouses(previous),
          playerCargo: cost(),
          industrySurge: false,
          explorationFlow: false,
          tutorialSeen: [...LEGACY_TUTORIALS],
        });
      }
      if (value.version === 4) {
        const previous = value as VersionFourProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          projectsCompleted: [],
          warehousesBuilt: legacyWarehouses(previous),
          tutorialSeen: [...LEGACY_TUTORIALS],
        });
      }
      if (value.version === 3) {
        const previous = value as VersionThreeProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          skillRanks: {},
          warehousesBuilt: legacyWarehouses(previous),
          tutorialSeen: [...LEGACY_TUTORIALS],
        });
      }
      if (value.version === 2) {
        const previous = value as VersionTwoProgress;
        const milestones = inferMilestones(previous);
        const knowledge = milestones.reduce((sum, id) => sum + (id === 'heart' ? 2 : 1), 0);
        const { version: _previousVersion, ...migrated } = previous;
        return restoreCompatible({
          ...migrated,
          knowledge,
          cycleMilestones: milestones,
          warehousesBuilt: legacyWarehouses(previous),
          tutorialSeen: [...LEGACY_TUTORIALS],
        });
      }
      if (value.version === 1) {
        const legacy = value as LegacyProgress;
        const workers: WorkerState[] = [];
        if (legacy.woodWorker) workers.push({ id: 'worker-1', name: WORKER_NAMES[0]!, task: 'wood', level: 1 });
        if (legacy.stoneWorker) workers.push({ id: 'worker-2', name: WORKER_NAMES[1]!, task: 'stone', level: 1 });
        const milestones = [legacy.campBuilt ? 'structure:camp' : '', legacy.bridgeBuilt ? 'bridge:0' : ''].filter(Boolean);
        return restoreCompatible({
          wood: nonNegativeInteger(legacy.wood),
          stone: nonNegativeInteger(legacy.stone),
          campBuilt: Boolean(legacy.campBuilt),
          bridgesBuilt: [Boolean(legacy.bridgeBuilt), false, false, false],
          cachesFound: legacy.cacheFound ? ['main-cache'] : [],
          workers,
          completed: false,
          elapsedSeconds: Math.max(0, Number(legacy.elapsedSeconds) || 0),
          knowledge: milestones.length,
          cycleMilestones: milestones,
          warehousesBuilt: [true, false, false, false, false],
          tutorialSeen: [...LEGACY_TUTORIALS],
        });
      }
      return new Economy();
    } catch {
      return new Economy();
    }
  }
}
