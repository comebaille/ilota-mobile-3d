export const RESOURCE_KINDS = ['wood', 'stone', 'copper', 'crystal'] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type WorkerLevel = 1 | 2 | 3;
export type StructureKind = 'camp' | 'workshop' | 'foundry' | 'observatory';
export type SkillBranch = 'intelligence' | 'industry' | 'exploration';
export type SkillFamily = SkillBranch | 'core' | 'hybrid';
export type WarehouseState = [boolean, boolean, boolean, boolean, boolean];
export type ProjectId =
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
  | 'awakening'
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
  | 'cargo_harness'
  | 'full_loads'
  | 'master_builders'
  | 'endless_engine'
  | 'tide_stride'
  | 'cache_instinct'
  | 'frugal_plans'
  | 'tidal_memory'
  | 'far_horizons'
  | 'ocean_legacy'
  | 'logistics_network'
  | 'adaptive_harvest'
  | 'scouting_parties'
  | 'archipelago_consciousness';

export interface Cost {
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
}

export interface WorkerState {
  id: string;
  name: string;
  task: ResourceKind;
  level: WorkerLevel;
}

export interface IslandProgress {
  version: 7;
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
  playerCargo: Cost;
  warehousesBuilt: WarehouseState;
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
}

interface VersionSixProgress extends Omit<
  IslandProgress,
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

export interface IslandProjectDefinition {
  id: ProjectId;
  tier: 1 | 2 | 3 | 4;
  islandIndex: 1 | 2 | 3 | 4;
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

// La première Marée demande déjà un vrai investissement. Les Marées suivantes
// sont ensuite modulées par getCycleMultiplier et les talents d'Exploration.
export const STRUCTURE_COSTS: Record<StructureKind, Cost> = {
  camp: cost(12, 8),
  workshop: cost(28, 22),
  foundry: cost(30, 28, 18),
  // Investissement de fin d'acte : le retour au foyer doit mobiliser
  // massivement les quatre chaînes de production.
  observatory: cost(120, 110, 90, 70),
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

export const SKILL_BRANCH_LABELS: Record<SkillBranch, { name: string; icon: string; summary: string }> = {
  intelligence: { name: 'Intelligence', icon: '⌘', summary: 'Trajets, prévisions et décisions autonomes.' },
  industry: { name: 'Technique', icon: '⚒', summary: 'Outils, effectifs et production mécanique.' },
  exploration: { name: 'Exploration', icon: '➶', summary: 'Mobilité, caches et départs accélérés.' },
};

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  { id: 'awakening', branch: 'core', tier: 0, cost: 0, name: 'Démarrer', detail: 'Zéro Savoir : révèle les trois premières voies.', icon: '✦', x: 580, y: 68 },
  { id: 'insight_gateway', branch: 'intelligence', tier: 1, cost: 1, name: 'Étincelle logique', detail: 'Ouvre la voie Intelligence.', icon: '⌘', x: 175, y: 190, requires: ['awakening'] },
  { id: 'craft_gateway', branch: 'industry', tier: 1, cost: 1, name: 'Premier mécanisme', detail: 'Ouvre la voie Technique.', icon: '⚒', x: 580, y: 190, requires: ['awakening'] },
  { id: 'exploration_gateway', branch: 'exploration', tier: 1, cost: 1, name: 'Appel du large', detail: 'Ouvre la voie Exploration.', icon: '➶', x: 985, y: 190, requires: ['awakening'] },

  { id: 'trail_sense', branch: 'intelligence', tier: 2, cost: 2, name: 'Sens des pistes', detail: '+18 % de vitesse pour tous les travailleurs.', icon: '⌁', x: 145, y: 325, requires: ['insight_gateway'] },
  { id: 'sharp_tools', branch: 'industry', tier: 2, cost: 2, name: 'Outils affûtés', detail: 'Chaque coup manuel rapporte 2 unités au lieu de 1.', icon: '⛏', x: 535, y: 325, requires: ['craft_gateway'] },
  { id: 'tide_stride', branch: 'exploration', tier: 2, cost: 2, name: 'Pas de marée', detail: '+20 % de vitesse pour ton renard.', icon: '➤', x: 955, y: 325, requires: ['exploration_gateway'] },

  { id: 'optimal_routes', branch: 'intelligence', tier: 3, cost: 3, name: 'Routes calculées', detail: 'Chaque renard choisit le trajet réellement le plus court.', icon: '⌘', x: 130, y: 465, requires: ['trail_sense'] },
  { id: 'reinforced_carts', branch: 'industry', tier: 3, cost: 3, name: 'Charrettes renforcées', detail: '+30 % de ressources à chaque livraison.', icon: '▣', x: 555, y: 465, requires: ['sharp_tools'] },
  { id: 'cache_instinct', branch: 'exploration', tier: 3, cost: 3, name: 'Instinct des caches', detail: 'Les caches contiennent 50 % de ressources en plus.', icon: '◇', x: 975, y: 465, requires: ['tide_stride'] },
  { id: 'logistics_network', branch: 'hybrid', tier: 4, cost: 6, name: 'Réseau logistique', detail: 'Intelligence + Technique : trajets et livraisons gagnent encore en rendement.', icon: '⤨', x: 345, y: 515, requires: ['optimal_routes', 'reinforced_carts'] },

  { id: 'forecasting', branch: 'intelligence', tier: 4, cost: 4, name: 'Prévisions', detail: 'Affiche la pénurie prioritaire du prochain objectif.', icon: '◉', x: 145, y: 610, requires: ['optimal_routes'] },
  { id: 'living_quarries', branch: 'industry', tier: 4, cost: 4, name: 'Gisements vivants', detail: 'Arbres et minerais réapparaissent 35 % plus vite.', icon: '♻', x: 570, y: 610, requires: ['reinforced_carts'] },
  { id: 'frugal_plans', branch: 'exploration', tier: 4, cost: 4, name: 'Plans économes', detail: 'Tous les investissements coûtent 12 % de moins.', icon: '⌂', x: 960, y: 610, requires: ['cache_instinct'] },
  { id: 'adaptive_harvest', branch: 'hybrid', tier: 5, cost: 6, name: 'Récolte adaptative', detail: 'Technique + Exploration : un coup bonus sur la ressource prioritaire.', icon: '⟲', x: 775, y: 675, requires: ['living_quarries', 'cache_instinct'] },

  { id: 'coordinated_shifts', branch: 'intelligence', tier: 5, cost: 5, name: 'Relèves coordonnées', detail: 'L’auto-gestion pourra réagir plus souvent.', icon: '⇄', x: 165, y: 755, requires: ['forecasting'] },
  { id: 'expanded_roster', branch: 'industry', tier: 5, cost: 3, rankCosts: [3, 5, 8, 12, 17], maxRank: 5, name: 'Cercle des bâtisseurs', detail: '+1 poste par rang. Le prix augmente à chaque renard supplémentaire.', icon: '+1', x: 585, y: 755, requires: ['living_quarries'] },
  { id: 'cargo_harness', branch: 'industry', tier: 5, cost: 2, rankCosts: [2, 4, 6, 9, 13, 18], maxRank: 6, name: 'Harnais modulaires', detail: '+4 places de cargaison par rang pour toi et chaque travailleur (8 → 32).', icon: '+4', x: 735, y: 790, requires: ['living_quarries'] },
  { id: 'tidal_memory', branch: 'exploration', tier: 5, cost: 5, name: 'Mémoire des marées', detail: 'Chaque Nouvelle Marée commence avec une réserve croissante.', icon: '≈', x: 925, y: 755, requires: ['frugal_plans'] },
  { id: 'scouting_parties', branch: 'hybrid', tier: 6, cost: 7, name: 'Éclaireurs autonomes', detail: 'Intelligence + Exploration : les caches sont récupérées à l’émergence d’une île.', icon: '⚑', x: 365, y: 815, requires: ['forecasting', 'frugal_plans'] },

  { id: 'auto_regulation', branch: 'intelligence', tier: 6, cost: 7, name: 'Auto-régulation', detail: 'Les renards changent eux-mêmes de métier selon les vrais besoins.', icon: '◎', x: 205, y: 900, requires: ['coordinated_shifts'] },
  { id: 'full_loads', branch: 'hybrid', tier: 6, cost: 8, name: 'Tournées complètes', detail: 'Intelligence + Technique : les travailleurs enchaînent les gisements jusqu’à remplir leur harnais avant de rentrer.', icon: '⇥', x: 420, y: 925, requires: ['optimal_routes', 'reinforced_carts'] },
  { id: 'master_builders', branch: 'industry', tier: 6, cost: 7, name: 'Maîtres bâtisseurs', detail: 'Les livraisons gagnent encore +35 %.', icon: '⚙', x: 575, y: 900, requires: ['expanded_roster'] },
  { id: 'far_horizons', branch: 'exploration', tier: 6, cost: 7, name: 'Horizon lointain', detail: 'Le renard accélère encore et les caches sont plus riches.', icon: '◒', x: 855, y: 900, requires: ['tidal_memory'] },

  { id: 'collective_intelligence', branch: 'intelligence', tier: 7, cost: 10, name: 'Esprit collectif', detail: 'Sommet Intelligence : deux réaffectations possibles toutes les 3 secondes.', icon: '♜', x: 300, y: 1040, requires: ['auto_regulation', 'logistics_network'] },
  { id: 'endless_engine', branch: 'industry', tier: 7, cost: 10, name: 'Surcharge tellurique', detail: 'Sommet Technique : active des phases électriques qui accélèrent de 100 % la repousse de la ressource prioritaire.', icon: 'ϟ', x: 505, y: 1040, requires: ['master_builders', 'adaptive_harvest'] },
  { id: 'ocean_legacy', branch: 'exploration', tier: 7, cost: 10, name: 'Courant de Marée', detail: 'Sommet Exploration : active des élans qui doublent la vitesse des cargaisons et conserve 35 % des stocks à la prochaine Marée.', icon: '≋', x: 760, y: 1040, requires: ['far_horizons', 'scouting_parties'] },
  { id: 'archipelago_consciousness', branch: 'hybrid', tier: 8, cost: 30, name: 'Conscience absolue', detail: 'Fusion des trois voies : réserve intelligemment chaque filon, évite les trajets excédentaires, ajoute 4 postes et synchronise les trois pouvoirs.', icon: '✺', x: 580, y: 1180, requires: ['collective_intelligence', 'endless_engine', 'ocean_legacy'] },
];

const SKILL_IDS = new Set<SkillId>(SKILL_DEFINITIONS.map((skill) => skill.id));
const TIER_ONE_PROJECTS = ['timber_reserve', 'towing_paths', 'shared_warehouse'] as const;
const TIER_TWO_PROJECTS = ['communal_sawmill', 'shore_walls', 'orders_office'] as const;
const TIER_THREE_PROJECTS = ['copper_winches', 'hauling_rails', 'maintenance_yard'] as const;

export const ISLAND_PROJECTS: readonly IslandProjectDefinition[] = [
  {
    id: 'timber_reserve', tier: 1, islandIndex: 1, requiresStructure: 'workshop',
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

const freshProgress = (): IslandProgress => ({
  version: 7,
  wood: 0,
  stone: 0,
  copper: 0,
  crystal: 0,
  playerCargo: cost(),
  warehousesBuilt: [false, false, false, false, false],
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

export const hasSkill = (progress: IslandProgress, id: SkillId): boolean => getSkillRank(progress, id) > 0;

export const getSkillCost = (progress: IslandProgress, definition: SkillDefinition): number => {
  const rank = getSkillRank(progress, definition.id);
  return definition.rankCosts?.[rank] ?? definition.cost;
};

export const skillPrerequisitesMet = (progress: IslandProgress, definition: SkillDefinition): boolean =>
  (definition.requires ?? []).every((required) => hasSkill(progress, required));

export const isSkillVisible = (progress: IslandProgress, definition: SkillDefinition): boolean =>
  definition.id === 'awakening'
  || hasSkill(progress, definition.id)
  || Boolean(definition.requires?.length && definition.requires.every((required) => hasSkill(progress, required)));

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

export const projectPrerequisitesMet = (progress: IslandProgress, definition: IslandProjectDefinition): boolean =>
  projectStructureBuilt(progress, definition.requiresStructure)
  && Boolean(progress.bridgesBuilt[definition.islandIndex - 1])
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
    BASE_CARGO_CAPACITY + getSkillRank(progress, 'cargo_harness') * CARGO_CAPACITY_PER_RANK,
  );
export const getBridgeCost = (progress: IslandProgress, index: number): Cost | null => {
  const value = BRIDGE_COSTS[index];
  return value ? scaleCost(progress, value) : null;
};
export const getFinalCost = (progress: IslandProgress): Cost => scaleCost(progress, FINAL_COST);
export const getProjectCost = (progress: IslandProgress, definition: IslandProjectDefinition): Cost =>
  scaleCost(progress, definition.cost);

export const getWorkerCapacity = (progress: IslandProgress): number => {
  if (!progress.campBuilt) return 0;
  const buildingCapacity = progress.observatoryBuilt ? 9
    : progress.foundryBuilt ? 7
      : progress.workshopBuilt ? 5
        : 3;
  return buildingCapacity
    + getSkillRank(progress, 'expanded_roster')
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
  const base = level === 1 ? 2 : level === 2 ? 4 : 7;
  if (!progress) return base;
  const multiplier = (hasSkill(progress, 'reinforced_carts') ? 1.3 : 1)
    * (hasSkill(progress, 'master_builders') ? 1.35 : 1)
    * (hasSkill(progress, 'logistics_network') ? 1.15 : 1)
    * (hasProject(progress, 'shared_warehouse') ? 1.1 : 1)
    * (hasProject(progress, 'prismatic_reservoir') ? 1.15 : 1)
    * (hasProject(progress, 'unity_lighthouse') ? 1.25 : 1)
    * (hasSkill(progress, 'archipelago_consciousness') ? 1.5 : 1);
  return Math.min(getCargoCapacity(progress), Math.ceil(base * multiplier));
};

// Conservé comme estimation d'interface ; la simulation utilise la vraie
// distance parcourue et un temps de récolte séparé.
export const getWorkerCycleSeconds = (level: WorkerLevel): number => level === 1 ? 8.2 : level === 2 ? 6.4 : 4.9;
export const getWorkerTravelSpeed = (level: WorkerLevel, progress: IslandProgress): number =>
  (2.35 + (level - 1) * 0.28)
  * (hasSkill(progress, 'trail_sense') ? 1.18 : 1)
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
export const getManualYield = (progress: IslandProgress, kind?: ResourceKind): number =>
  (hasSkill(progress, 'sharp_tools') ? 2 : 1)
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
        { id: 'workers', label: 'Réunir 4 renards', done: progress.workers.length >= 4 },
        { id: 'level', label: 'Former 1 renard niveau 2', done: progress.workers.some((worker) => worker.level >= 2) },
        { id: 'projects', label: 'Achever les 3 Travaux à la Maison des Pins', done: completedProjects >= 3 },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    case 2:
      destination = 'Île de Cristal';
      items = [
        { id: 'foundry', label: 'Construire la Fonderie Cuivrée', done: progress.foundryBuilt },
        { id: 'workers', label: 'Réunir 5 renards', done: progress.workers.length >= 5 },
        { id: 'copper-job', label: 'Assigner 1 cuivrier', done: hasTask('copper') },
        { id: 'projects', label: 'Achever 6 Grands Travaux', done: completedProjects >= 6 },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    case 3:
      destination = 'Île Couronne';
      items = [
        { id: 'altar', label: 'Bâtir l’Autel du Savoir sur l’île de Cristal', done: progress.observatoryBuilt },
        { id: 'workers', label: 'Réunir 7 renards', done: progress.workers.length >= 7 },
        { id: 'crystal-job', label: 'Assigner 1 cristallier', done: hasTask('crystal') },
        { id: 'levels', label: 'Atteindre 10 niveaux cumulés', done: totalLevels >= 10 },
        { id: 'projects', label: 'Achever 9 Grands Travaux', done: completedProjects >= 9 },
        { id: 'reserves', label: `Réserver ${formatCost(bridgeCost ?? cost())}`, done: reservesReady },
      ];
      break;
    default:
      items = [
        { id: 'workers', label: 'Réunir 8 renards', done: progress.workers.length >= 8 },
        { id: 'jobs', label: 'Maintenir les 4 métiers', done: RESOURCE_KINDS.every(hasTask) },
        { id: 'levels', label: 'Atteindre 12 niveaux cumulés', done: totalLevels >= 12 },
        { id: 'projects', label: 'Achever les 12 Grands Travaux', done: completedProjects >= ISLAND_PROJECTS.length },
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
  if (progress.workers.length < 2) return getRecruitCost(progress);
  if (!progress.bridgesBuilt[0]) return getBridgeCost(progress, 0) ?? cost();
  if (!progress.workshopBuilt) return getStructureCost(progress, 'workshop');
  if (progress.workers.length < 4) return getRecruitCost(progress);
  if (!progress.workers.some((worker) => worker.level >= 2)) return getUpgradeCost(progress.workers[0] ?? { id: '', name: '', task: 'wood', level: 1 }, progress);
  if (getCompletedProjectCount(progress) < 3) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (!progress.bridgesBuilt[1]) return getBridgeCost(progress, 1) ?? cost();
  if (!progress.foundryBuilt) return getStructureCost(progress, 'foundry');
  if (progress.workers.length < 5) return getRecruitCost(progress);
  if (getCompletedProjectCount(progress) < 6) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (!progress.bridgesBuilt[2]) return getBridgeCost(progress, 2) ?? cost();
  if (!progress.observatoryBuilt) return getStructureCost(progress, 'observatory');
  if (progress.workers.length < 7) return getRecruitCost(progress);
  if (getCompletedProjectCount(progress) < 9) {
    const nextProject = getNextProject(progress);
    if (nextProject) return getProjectCost(progress, nextProject);
  }
  if (!progress.bridgesBuilt[3]) return getBridgeCost(progress, 3) ?? cost();
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
  if (progress.workers.length < 2) return { chapter, eyebrow, title: 'Forme ta première équipe', detail: 'Entre dans la nurserie centrale : recrute 2 renards et assigne bois + pierre.' };
  if (!progress.bridgesBuilt[0]) return { chapter, eyebrow, title: 'Ouvre le pont des Pins', detail: `Coût : ${formatCost(getBridgeCost(progress, 0) ?? cost())}` };
  if (!progress.workshopBuilt) return { chapter, eyebrow, title: 'Construis l’atelier des Pins', detail: `Coût : ${formatCost(getStructureCost(progress, 'workshop'))}` };
  if (progress.workers.length < 4) return { chapter, eyebrow, title: 'Agrandis l’équipe à 4', detail: 'L’atelier porte la capacité à 5 travailleurs.' };
  if (!progress.workers.some((worker) => worker.level >= 2)) return { chapter, eyebrow, title: 'Forme un travailleur', detail: 'Entre dans l’Atelier des Pins et passe un renard au niveau 2.' };
  if (getCompletedProjectCount(progress) < 3) return { chapter, eyebrow, title: 'Développe l’île des Pins', detail: `${getCompletedProjectCount(progress)}/3 Grands Travaux avant le pont Cuivré.` };
  if (!progress.bridgesBuilt[1]) return { chapter, eyebrow, title: 'Relie l’île Cuivrée', detail: `Coût : ${formatCost(getBridgeCost(progress, 1) ?? cost())}` };
  if (!progress.foundryBuilt) return { chapter, eyebrow, title: 'Récolte le cuivre et bâtis la fonderie', detail: `Coût : ${formatCost(getStructureCost(progress, 'foundry'))}` };
  if (!progress.workers.some((worker) => worker.task === 'copper')) return { chapter, eyebrow, title: 'Assigne un cuivrier', detail: 'Retourne à la nurserie ; la fonderie autorise désormais le métier cuivre.' };
  if (progress.workers.length < 5) return { chapter, eyebrow, title: 'Dirige au moins 5 travailleurs', detail: 'Diversifie la production avant la prochaine traversée.' };
  if (getCompletedProjectCount(progress) < 6) return { chapter, eyebrow, title: 'Industrialise l’île Cuivrée', detail: `${getCompletedProjectCount(progress)}/6 Grands Travaux avant les Cristaux.` };
  if (!progress.bridgesBuilt[2]) return { chapter, eyebrow, title: 'Ouvre la voie des Cristaux', detail: `Coût : ${formatCost(getBridgeCost(progress, 2) ?? cost())}` };
  if (!progress.observatoryBuilt) return {
    chapter,
    eyebrow,
    title: 'Bâtis l’Autel sur l’île de Cristal',
    detail: `Le site spécialisé t’attend sur la quatrième île · grand coût : ${formatCost(getStructureCost(progress, 'observatory'))}`,
  };
  if (!progress.workers.some((worker) => worker.task === 'crystal')) return { chapter, eyebrow, title: 'Forme un cristallier', detail: 'Retourne à la nurserie et assigne le métier cristal.' };
  if (progress.workers.length < 7 || getTotalWorkerLevels(progress) < 10) return { chapter, eyebrow, title: 'Prépare l’expédition finale', detail: '7 travailleurs et 10 niveaux cumulés requis.' };
  if (getCompletedProjectCount(progress) < 9) return { chapter, eyebrow, title: 'Équipe l’île de Cristal', detail: `${getCompletedProjectCount(progress)}/9 Grands Travaux avant la Couronne.` };
  if (!progress.bridgesBuilt[3]) return { chapter, eyebrow, title: 'Bâtis le pont de la Couronne', detail: `Coût : ${formatCost(getBridgeCost(progress, 3) ?? cost())}` };
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
    const rankIds = initial?.skillRanks && typeof initial.skillRanks === 'object' ? Object.keys(initial.skillRanks) : [];
    const skills = sanitizeSkills([...(initial?.skills ?? []), ...rankIds]);
    const skillRanks = sanitizeSkillRanks(initial?.skillRanks, skills);
    this.progress = {
      ...fresh,
      ...initial,
      version: 7,
      wood: nonNegativeInteger(initial?.wood),
      stone: nonNegativeInteger(initial?.stone),
      copper: nonNegativeInteger(initial?.copper),
      crystal: nonNegativeInteger(initial?.crystal),
      playerCargo: sanitizeCost(initial?.playerCargo),
      warehousesBuilt: sourceWarehouses,
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
    };
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
          && workers.some((worker) => worker.task === 'stone');
      case 1:
        return this.progress.workshopBuilt && workers.length >= 4
          && workers.some((worker) => worker.level >= 2)
          && getCompletedProjectCount(this.progress) >= 3;
      case 2:
        return this.progress.foundryBuilt && workers.length >= 5
          && workers.some((worker) => worker.task === 'copper')
          && getCompletedProjectCount(this.progress) >= 6;
      case 3:
        return this.progress.observatoryBuilt && workers.length >= 7
          && workers.some((worker) => worker.task === 'crystal')
          && getTotalWorkerLevels(this.progress) >= 10
          && getCompletedProjectCount(this.progress) >= 9;
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
      const retainedRatio = skills.includes('archipelago_consciousness') ? 0.55 : 0.35;
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
      const value = JSON.parse(raw) as Partial<IslandProgress> | VersionSixProgress | VersionFiveProgress | VersionFourProgress | VersionThreeProgress | VersionTwoProgress | LegacyProgress;
      if (value.version === 7) return new Economy(value as Partial<IslandProgress>);
      if (value.version === 6) {
        const previous = value as VersionSixProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return new Economy({
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
        return new Economy({
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
        return new Economy({
          ...migrated,
          projectsCompleted: [],
          warehousesBuilt: legacyWarehouses(previous),
          tutorialSeen: [...LEGACY_TUTORIALS],
        });
      }
      if (value.version === 3) {
        const previous = value as VersionThreeProgress;
        const { version: _previousVersion, ...migrated } = previous;
        return new Economy({
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
        return new Economy({
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
        return new Economy({
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
