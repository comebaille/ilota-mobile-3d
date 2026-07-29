import * as THREE from 'three';
import {
  AssetLibrary,
  findAnimation,
  type NatureKind,
  type WorldTwoEnemyKind,
} from './assets';
import {
  Economy,
  ISLAND_PROJECTS,
  RESOURCE_ICONS,
  RESOURCE_KINDS,
  RESOURCE_LABELS,
  WORLD_TWO_RESOURCE_ICONS,
  WORLD_TWO_RESOURCE_KINDS,
  WORLD_TWO_RESOURCE_LABELS,
  WORLD_TWO_MINERALS,
  WORLD_TWO_SKILLS,
  canMineWorldTwoMineral,
  formatBridgeRequirement,
  formatCost,
  formatWorldTwoCost,
  formatWorldTwoMoney,
  getAutoRegulationInterval,
  getAutoRegulationMoveCount,
  getBridgeCost,
  getCargoCapacity,
  getCacheReward,
  getChapter,
  getCompletedProjectCount,
  getFinalCost,
  getIslandGoal,
  getManualYield,
  getPlayerSpeed,
  getPlayerFlowMultiplier,
  getPlayerCargoTotal,
  getPriorityShortage,
  getProjectCost,
  getProjectDefinition,
  getProjectHallCost,
  getRecruitCost,
  getRespawnMultiplier,
  getRebirthReward,
  getSkillRank,
  getSkillTreeCompletion,
  getStructureCost,
  getTotalWorkerLevels,
  getTidalRetentionRate,
  getUpgradeCost,
  getUnlockedWorkerTasks,
  getWarehouseCost,
  getWorkerCapacity,
  getWorkerCargoCapacity,
  getWorkerGatherSeconds,
  getWorkerDepositValue,
  getWorkerTravelSpeed,
  getWorkerYield,
  getWorldTwoCargoCapacity,
  getWorldTwoCargoTotal,
  getWorldTwoCargoValue,
  getWorldTwoFangUpgradeCost,
  getWorldTwoMineral,
  getWorldTwoRecruitCost,
  getWorldTwoWolfCapacity,
  hasProject,
  hasSkill,
  hasWorldTwoSkill,
  isProjectVisible,
  isProjectHallBuilt,
  isProjectHallReady,
  isWarehouseUnlocked,
  isWorldTwoUnlocked,
  type Cost,
  type ProjectId,
  type ResourceKind,
  type SkillId,
  type StructureKind,
  type WorkerLevel,
  type WorkerState,
  type WorldTwoResourceKind,
  type WorldTwoMineralId,
  type WorldTwoSkillId,
  type WorldTwoWorkerState,
} from './economy';
import { InputController } from './input';
import { FeedbackController } from './feedback';
import { getCargoPiecePosition } from './cargo';
import {
  chooseUninformedResourceIndex,
  isPointOnWalkableNetwork,
  planRoute,
  WORLD_ONE_BRIDGE_WALKABLE_HALF_WIDTH,
  type PlannedRoute,
} from './pathfinding';
import {
  BRIDGES,
  CACHES,
  findIslandIndexForPoint,
  ISLANDS,
  pickResourceKindForIsland,
  PROJECT_HALLS,
  RESOURCE_SPAWNS,
  STRUCTURES,
  WAREHOUSES,
  WORLD_TWO_RAMPS,
  WORLD_TWO_RESOURCES,
  WORLD_TWO_TERRACES,
  findWorldTwoTerraceIndex,
  getWorldTwoSurfaceAt,
  type BridgeDefinition,
  type CacheDefinition,
  type IslandDefinition,
  type ProjectHallDefinition,
  type StructureDefinition,
  type WarehouseDefinition,
} from './world';
import { GameUI } from '../ui/GameUI';

interface ResourceNode {
  readonly id: string;
  kind: ResourceKind;
  root: THREE.Group;
  readonly islandIndex: number;
  visualCycle: number;
  amount: number;
  readonly capacity: number;
  readonly baseScale: number;
  readonly respawnSeconds: number;
  currentScale: number;
  respawn: number;
  pulse: number;
  readonly world: 1 | 2;
  readonly rarity: string;
  readonly worldTwoKind?: WorldTwoResourceKind;
}

interface WorldTwoDenEntity {
  root: THREE.Group;
  label: THREE.Sprite;
}

interface WorldTwoShrineEntity {
  root: THREE.Group;
  label: THREE.Sprite;
}

interface WorldTwoWolfEntity {
  id: string;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: string;
  phase: 'seeking' | 'moving' | 'gathering' | 'returning' | 'depositing' | 'combat';
  target: ResourceNode | null;
  enemy: WorldTwoEnemyEntity | null;
  route: THREE.Vector3[];
  routeIndex: number;
  timer: number;
  cargoRack: THREE.Group;
  cargo: number;
  cargoKind: WorldTwoResourceKind;
}

interface WorldTwoEnemyEntity {
  id: string;
  terraceIndex: number;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: string;
  kind: WorldTwoEnemyKind;
  health: number;
  maximumHealth: number;
  attackTimer: number;
  respawnTimer: number;
  deathTimer: number;
}

interface WorldTravelAnimation {
  destination: 1 | 2;
  elapsed: number;
  startedAt: number;
  duration: number;
  source: THREE.Vector3;
  target: THREE.Vector3;
  cameraStart: THREE.Vector3;
  switched: boolean;
  progress: number;
}

interface WorkerEntity {
  id: string;
  root: THREE.Group;
  marker: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: string;
  cargoRack: THREE.Group;
  task: ResourceKind;
  level: WorkerLevel;
  phase: 'toResource' | 'gathering' | 'toHub' | 'depositing';
  phaseTimer: number;
  route: THREE.Vector3[];
  routeIndex: number;
  routeDistance: number;
  routeBridgeIndices: number[];
  bridgesUsed: Set<number>;
  target: ResourceNode | null;
  hub: THREE.Vector3;
  depositTarget: THREE.Vector3;
  cargo: number;
  cargoKind: ResourceKind;
  routeChoices: number;
  arrivalTimer: number;
  levelUpTimer: number;
  idleSwitchCooldown: number;
}

interface BridgeEntity {
  index: number;
  definition: BridgeDefinition;
  root: THREE.Group;
  pad: THREE.Group;
  guide: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
  visualWidth: number;
}

interface StructureEntity {
  definition: StructureDefinition;
  pad: THREE.Group;
  building: THREE.Group;
  status: THREE.Sprite;
}

interface WarehouseEntity {
  definition: WarehouseDefinition;
  pad: THREE.Group;
  building: THREE.Group;
  status: THREE.Sprite;
  world: 1 | 2;
}

interface ProjectEntity {
  definition: ProjectHallDefinition;
  pad: THREE.Group;
  building: THREE.Group;
  status: THREE.Sprite;
  seals: THREE.Group[];
}

interface CacheEntity {
  definition: CacheDefinition;
  root: THREE.Group;
}

interface IslandEntity {
  index: number;
  definition: IslandDefinition;
  root: THREE.Group;
}

interface IslandEmergence {
  entity: IslandEntity;
  elapsed: number;
  duration: number;
}

interface WorldPortalEntity {
  root: THREE.Group;
  label: THREE.Sprite;
  destination: 1 | 2;
}

interface EmergenceRipple {
  mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  elapsed: number;
  duration: number;
  delay: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

interface CargoDrop {
  mesh: THREE.Object3D;
  start: THREE.Vector3;
  target: THREE.Vector3;
  elapsed: number;
  duration: number;
  onLand?: () => void;
}

interface TideResetAnimation {
  elapsed: number;
  reward: number;
  rebirthApplied: boolean;
  playerEmerged: boolean;
  cameraStart: THREE.Vector3;
}

type Interaction =
  | { type: 'resource'; node: ResourceNode }
  | { type: 'structure'; entity: StructureEntity }
  | { type: 'warehouse'; entity: WarehouseEntity }
  | { type: 'projects'; entity: ProjectEntity }
  | { type: 'bridge'; entity: BridgeEntity }
  | { type: 'cache'; entity: CacheEntity }
  | { type: 'portal'; entity: WorldPortalEntity }
  | { type: 'worldTwoDen'; entity: WorldTwoDenEntity }
  | { type: 'worldTwoShrine'; entity: WorldTwoShrineEntity }
  | { type: 'heart' };

interface Diagnostics {
  ready: boolean;
  active: boolean;
  assetsLoaded: number;
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
  campBuilt: boolean;
  observatoryBuilt: boolean;
  workers: number;
  workerLevels: number;
  workerTasks: string;
  bridgeBuilt: boolean;
  bridges: number;
  bridgeVisualParts: number;
  bridgeVisualWidth: number;
  bridgeWalkableWidth: number;
  bridgeGuides: number;
  chapter: number;
  cacheFound: boolean;
  completed: boolean;
  crewOpen: boolean;
  projectsOpen: boolean;
  talentOpen: boolean;
  menuOpen: boolean;
  knowledge: number;
  rebirths: number;
  skills: string;
  autoRegulation: boolean;
  powerNotifications: boolean;
  powerVfx: boolean;
  projects: number;
  projectHalls: number;
  warehouses: number;
  playerCargo: number;
  playerCargoStackHeight: number;
  playerCargoVisualKinds: string;
  currentIsland: number;
  currentWorld: 1 | 2;
  worldTwoTerrace: number;
  worldTwoPortalUnlocked: boolean;
  worldTwoPeakReached: boolean;
  worldTwoMoney: number;
  worldTwoFangLevel: number;
  worldTwoWolfFangLevel: number;
  worldTwoMinerals: number;
  worldTwoLockedMinerals: number;
  worldTwoMineableDark: number;
  worldTwoWolfAnimations: string;
  worldTwoEnemyAnimations: string;
  worldTravelPathVisible: boolean;
  worldTravelObjects: number;
  inputEnabled: boolean;
  managementOpen: boolean;
  blockingOverlay: boolean;
  drawCalls: number;
  triangles: number;
  interaction: Interaction['type'] | '';
  assemblingBuildings: number;
  visibleIslands: number;
  emergingIsland: string;
  workersOnWalkable: boolean;
  workerNavigation: Array<{
    id: string;
    x: number;
    z: number;
    phase: WorkerEntity['phase'];
    routeBridges: number[];
    bridgesUsed: number[];
    routeDistance: number;
    routeChoices: number;
    targetNode: string;
    targetIsland: number;
    targetDistance: number;
    hubDistance: number;
    cargo: number;
    cargoVisuals: number;
    cargoStackHeight: number;
    animation: string;
  }>;
  resourceNodes: Array<{
    id: string;
    kind: ResourceKind;
    island: number;
    amount: number;
    capacity: number;
  }>;
  player: { x: number; z: number };
  facingAlignment: number;
  lastHarvest: { kind: ResourceKind; remaining: number; capacity: number; scale: number } | null;
  lastWorkerHarvest: {
    workerId: string;
    nodeId: string;
    kind: ResourceKind;
    gathered: number;
    remaining: number;
    island: number;
  } | null;
  industrySurge: boolean;
  industrySurgeKind: ResourceKind | '';
  explorationFlow: boolean;
  rebirthAnimation: boolean;
  fps: number;
}

const SAVE_KEY = 'ilota-save-v1';
const SAVE_BACKUP_KEY = 'ilota-save-backup-v1';
const HIDDEN_ISLAND_Y = -8.5;
// Le centre du renard peut emprunter 4,4 m. Le tablier garde donc un mètre
// visuel de sécurité de chaque côté afin que son corps ne flotte jamais hors
// du pont lorsqu'il longe un bord.
const WORLD_ONE_BRIDGE_MIN_VISUAL_WIDTH = WORLD_ONE_BRIDGE_WALKABLE_HALF_WIDTH * 2 + 2;
const WORKER_FEEL = {
  arrivalSeconds: 0.95,
  levelUpSeconds: 1.15,
  depositPauseSeconds: 0.55,
  depositUnitSeconds: 0.105,
} as const;

const getWorldTwoCargoVisualKind = (id: WorldTwoMineralId): ResourceKind => {
  switch (getWorldTwoMineral(id).visualKind) {
    case 'coal': return 'stone';
    case 'iron': return 'copper';
    case 'silver':
    case 'gold':
      return 'crystal';
  }
};

/**
 * Angles de level design réservés aux filons, en degrés autour du centre de
 * chaque terrasse (0 = sud, 90 = est). Ils maintiennent les couloirs des deux
 * rampes libres tout au long du zigzag de la montagne.
 */
const WORLD_TWO_RESOURCE_ANGLES: readonly (readonly number[])[] = [
  [45],
  [210, 270, 315],
  [45, 100, 155],
  [110, 165, 350],
  [210, 270, 320],
  [30, 205, 255],
  [45, 100, 155],
  [120, 180, 300],
  [210, 270, 320],
  [55, 105, 250],
  [90, 270],
];

const PALETTE = {
  sea: 0x164f56,
  deepSea: 0x0e3842,
  earth: 0x7a6543,
  wood: 0x9d6337,
  woodDark: 0x5c3a2b,
  stone: 0x829092,
  cream: 0xfff1c2,
  gold: 0xf2b958,
  copper: 0xc56f42,
  crystal: 0xbab4ed,
};

const RESOURCE_COLORS: Record<ResourceKind, number> = {
  wood: PALETTE.gold,
  stone: 0xd9e1dc,
  copper: PALETTE.copper,
  crystal: PALETTE.crystal,
};

const STRUCTURE_COPY: Record<StructureKind, { built: string; toast: string }> = {
  camp: { built: 'Bâtir le camp des Marées', toast: 'Nurserie construite · recrutement et métiers disponibles !' },
  workshop: { built: 'Construire l’atelier des Pins', toast: 'Atelier terminé · formations niveau 2 disponibles !' },
  foundry: { built: 'Construire la fonderie Cuivrée', toast: 'Fonderie allumée · formations niveau 3 disponibles !' },
  observatory: { built: 'Construire l’Autel du Savoir', toast: 'Autel éveillé · l’arbre des savoirs est maintenant accessible !' },
};

const vec = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);

const structureBuilt = (progress: Economy['progress'], kind: StructureKind): boolean => {
  switch (kind) {
    case 'camp': return progress.campBuilt;
    case 'workshop': return progress.workshopBuilt;
    case 'foundry': return progress.foundryBuilt;
    case 'observatory': return progress.observatoryBuilt;
  }
};

export class IlotaGame {
  readonly input: InputController;
  readonly diagnostics: Diagnostics;
  private readonly scene = new THREE.Scene();
  private readonly worldTwoRoot = new THREE.Group();
  private readonly worldTravelCauseway = new THREE.Group();
  private worldTravelCurve: THREE.CatmullRomCurve3 | null = null;
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sun = new THREE.DirectionalLight(0xffe7b1, 3.4);
  private readonly player = new THREE.Group();
  private playerModel: THREE.Object3D | null = null;
  private readonly playerMixer: THREE.AnimationMixer;
  private readonly playerActions = new Map<string, THREE.AnimationAction>();
  private readonly lastMoveDirection = new THREE.Vector3(0, 0, 1);
  private readonly facingDirection = new THREE.Vector3(0, 0, 1);
  private currentPlayerAction = '';
  private readonly resources: ResourceNode[] = [];
  private readonly islands: IslandEntity[] = [];
  private readonly workers: WorkerEntity[] = [];
  private readonly bridges: BridgeEntity[] = [];
  private readonly structures = new Map<StructureKind, StructureEntity>();
  private readonly warehouses: WarehouseEntity[] = [];
  private readonly projects: ProjectEntity[] = [];
  private readonly worldPortals: WorldPortalEntity[] = [];
  private readonly worldTwoWolves: WorldTwoWolfEntity[] = [];
  private readonly worldTwoEnemies: WorldTwoEnemyEntity[] = [];
  private worldTwoDen: WorldTwoDenEntity | null = null;
  private worldTwoShrine: WorldTwoShrineEntity | null = null;
  private readonly caches: CacheEntity[] = [];
  private readonly particles: Particle[] = [];
  private readonly cargoDrops: CargoDrop[] = [];
  private readonly emergenceRipples: EmergenceRipple[] = [];
  private readonly heart = new THREE.Group();
  private readonly heartLight = new THREE.PointLight(PALETTE.gold, 0, 15, 2);
  private readonly heartCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.7, 1),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: 0x7b4d10, emissiveIntensity: 1.2, roughness: 0.25 }),
  );
  private active = false;
  private managementOpen = false;
  private interaction: Interaction | null = null;
  private lastHarvestedNode: ResourceNode | null = null;
  private lastWorkerHarvest: Diagnostics['lastWorkerHarvest'] = null;
  private harvestCooldown = 0;
  private worldTime = 0;
  private saveCooldown = 0;
  private autoRegulationCooldown = 3;
  private islandEmergence: IslandEmergence | null = null;
  private lastFrameTime = performance.now();
  private fpsAverage = 60;
  private overlayRenderCooldown = 0;
  private victoryShown = false;
  private readonly playerCargoRack = new THREE.Group();
  private readonly cargoGeometries = new Map<ResourceKind, THREE.BufferGeometry>();
  private readonly cargoMaterials = new Map<ResourceKind, THREE.MeshStandardMaterial>();
  private readonly worldTwoCargoTemplates = new Map<WorldTwoMineralId, THREE.Group>();
  private playerDeposit: { warehouse: WarehouseEntity; timer: number } | null = null;
  private tideResetAnimation: TideResetAnimation | null = null;
  private industrySurgeCooldown = 2.5;
  private industrySurgeRemaining = 0;
  private industrySurgeKind: ResourceKind = 'wood';
  private industryVfxCooldown = 0;
  private explorationFlowCooldown = 4;
  private explorationFlowRemaining = 0;
  private worldTravelAnimation: WorldTravelAnimation | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: AssetLibrary,
    private readonly economy: Economy,
    private readonly ui: GameUI,
    private readonly feedback: FeedbackController,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    this.input = new InputController(ui.joystick, ui.joystickKnob, ui.actionButton);
    this.setupScene();
    this.createWorld();
    this.playerMixer = this.createPlayer();
    this.restoreVisualProgress();
    this.bindManagement();
    this.resize();
    this.prewarmWorldRendering();
    window.addEventListener('resize', this.resize);

    const progress = economy.progress;
    this.diagnostics = {
      ready: true,
      active: false,
      assetsLoaded: assets.loadedCount,
      wood: progress.wood,
      stone: progress.stone,
      copper: progress.copper,
      crystal: progress.crystal,
      campBuilt: progress.campBuilt,
      observatoryBuilt: progress.observatoryBuilt,
      workers: progress.workers.length,
      workerLevels: getTotalWorkerLevels(progress),
      workerTasks: progress.workers.map((worker) => worker.task).join(','),
      bridgeBuilt: progress.bridgesBuilt[0],
      bridges: progress.bridgesBuilt.filter(Boolean).length,
      bridgeVisualParts: this.bridges
        .filter((bridge) => progress.bridgesBuilt[bridge.index])
        .reduce((total, bridge) => total + bridge.root.children.length, 0),
      bridgeVisualWidth: progress.bridgesBuilt.some(Boolean)
        ? Math.min(...this.bridges
          .filter((bridge) => progress.bridgesBuilt[bridge.index])
          .map((bridge) => bridge.visualWidth))
        : 0,
      bridgeWalkableWidth: WORLD_ONE_BRIDGE_WALKABLE_HALF_WIDTH * 2,
      bridgeGuides: 0,
      chapter: getChapter(progress),
      cacheFound: progress.cachesFound.includes('main-cache'),
      completed: progress.completed,
      crewOpen: false,
      projectsOpen: false,
      talentOpen: false,
      menuOpen: false,
      knowledge: progress.knowledge,
      rebirths: progress.rebirths,
      skills: progress.skills.join(','),
      autoRegulation: progress.autoRegulation,
      powerNotifications: progress.powerNotifications,
      powerVfx: progress.powerVfx,
      projects: getCompletedProjectCount(progress),
      projectHalls: progress.projectHallsBuilt.filter(Boolean).length + (isProjectHallBuilt(progress, 0) ? 1 : 0),
      warehouses: progress.warehousesBuilt.filter(Boolean).length,
      playerCargo: getPlayerCargoTotal(progress),
      playerCargoStackHeight: 0,
      playerCargoVisualKinds: '',
      currentIsland: 0,
      currentWorld: progress.currentWorld,
      worldTwoTerrace: progress.currentWorld === 2 ? 0 : -1,
      worldTwoPortalUnlocked: isWorldTwoUnlocked(progress),
      worldTwoPeakReached: progress.worldTwoPeakReached,
      worldTwoMoney: progress.worldTwoMoney,
      worldTwoFangLevel: progress.worldTwoFangLevel,
      worldTwoWolfFangLevel: progress.worldTwoWolfFangLevel,
      worldTwoMinerals: WORLD_TWO_MINERALS.length,
      worldTwoLockedMinerals: WORLD_TWO_MINERALS.length - progress.worldTwoFangLevel,
      worldTwoMineableDark: 0,
      worldTwoWolfAnimations: '',
      worldTwoEnemyAnimations: '',
      worldTravelPathVisible: false,
      worldTravelObjects: this.worldTravelCauseway.children.length,
      inputEnabled: false,
      managementOpen: false,
      blockingOverlay: false,
      drawCalls: 0,
      triangles: 0,
      interaction: '',
      assemblingBuildings: 0,
      visibleIslands: progress.bridgesBuilt.filter(Boolean).length + 1,
      emergingIsland: '',
      workersOnWalkable: true,
      workerNavigation: [],
      resourceNodes: [],
      player: { x: this.player.position.x, z: this.player.position.z },
      facingAlignment: 1,
      lastHarvest: null,
      lastWorkerHarvest: null,
      industrySurge: false,
      industrySurgeKind: '',
      explorationFlow: false,
      rebirthAnimation: false,
      fps: 60,
    };
    this.ui.update(progress);
    this.animate();
  }

  start(): void {
    if (this.economy.progress.completed) {
      this.active = false;
      this.victoryShown = true;
      this.input.enabled = false;
      this.ui.showVictory(this.economy.progress);
      return;
    }
    this.active = true;
    this.input.enabled = !this.managementOpen;
    this.victoryShown = false;
    this.maybeShowTutorial(
      'welcome',
      'Bienvenue dans Ilota',
      'Commence par assembler le Dépôt des Marées. Les ressources portées sur ton dos ne rejoignent le stock qu’après leur déchargement.',
      '▣',
    );
  }

  continueAfterVictory(): void {
    this.ui.hideVictory();
    this.active = true;
    this.input.enabled = !this.managementOpen;
  }

  resetProgress(): void {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_BACKUP_KEY);
    window.location.reload();
  }

  beginNewTide(): void {
    if (!this.economy.progress.completed || this.tideResetAnimation) return;
    this.ui.hideVictory();
    this.ui.hideMenu();
    this.managementOpen = false;
    this.active = false;
    this.input.release();
    this.input.enabled = false;
    this.tideResetAnimation = {
      elapsed: 0,
      reward: getRebirthReward(this.economy.progress),
      rebirthApplied: false,
      playerEmerged: false,
      cameraStart: this.camera.position.clone(),
    };
    this.ui.showTideTransition(this.economy.progress.rebirths + 2, getRebirthReward(this.economy.progress));
  }

  private bindManagement(): void {
    const onOpenChange = (open: boolean): void => this.setManagementOpen(open);
    this.ui.bindCrewHandlers({
      onOpenChange,
      onRecruit: () => this.recruitWorker(),
      onAssign: (workerId, task) => this.assignWorker(workerId, task),
      onUpgrade: (workerId) => this.upgradeWorker(workerId),
    });
    this.ui.bindTalentHandlers({
      onOpenChange,
      onUnlock: (skill) => this.unlockSkill(skill),
      onAutoToggle: (enabled) => this.toggleAutoRegulation(enabled),
      onIndustryToggle: (enabled) => this.toggleIndustrySurge(enabled),
      onExplorationToggle: (enabled) => this.toggleExplorationFlow(enabled),
      onPowerNotificationsToggle: (enabled) => this.togglePowerNotifications(enabled),
      onPowerVfxToggle: (enabled) => this.togglePowerVfx(enabled),
      onWorldTwoUnlock: (skill) => this.unlockWorldTwoSkill(skill),
      onWorldTwoFangUpgrade: (actor) => this.upgradeWorldTwoFangs(actor),
    });
    this.ui.bindProjectHandlers({
      onOpenChange,
      onBuild: (project) => this.buildProject(project),
    });
    this.ui.bindMenuHandlers({
      onOpenChange,
      onNewTide: () => this.beginNewTide(),
      onReset: () => this.resetProgress(),
    });
  }

  private setManagementOpen(open: boolean): void {
    this.managementOpen = open || this.ui.hasBlockingOverlay;
    this.input.release();
    this.input.enabled = this.active
      && !this.managementOpen
      && !this.worldTravelAnimation
      && !this.tideResetAnimation;
    if (this.managementOpen) {
      this.interaction = null;
      this.ui.clearContext();
    }
    if (
      !this.managementOpen
      && this.active
      && this.economy.progress.campBuilt
      && this.economy.progress.workers.length >= 2
      && !this.economy.progress.bridgesBuilt[0]
      && !this.economy.progress.tutorialSeen.includes('island-goals')
    ) {
      window.setTimeout(() => this.maybeShowTutorial(
        'island-goals',
        'Ton objectif d’île',
        'Le panneau à droite résume les conditions du prochain pont. Chaque ligne devient verte une fois validée ; quand tout est prêt, des flèches dorées apparaissent jusqu’au chantier.',
        '⚑',
      ), 0);
    }
  }

  private reconcileInputState(): void {
    const blockingOverlay = this.ui.hasBlockingOverlay;
    this.managementOpen = blockingOverlay;
    const shouldEnable = this.active
      && !this.victoryShown
      && !blockingOverlay
      && !this.worldTravelAnimation
      && !this.tideResetAnimation;
    if (this.input.enabled === shouldEnable) return;
    if (!shouldEnable) this.input.release();
    this.input.enabled = shouldEnable;
  }

  private maybeShowTutorial(id: string, title: string, detail: string, icon: string): void {
    if (!this.economy.markTutorial(id)) return;
    this.save();
    this.setManagementOpen(true);
    this.ui.showTutorial(title, detail, icon, () => this.setManagementOpen(false));
  }

  private unlockSkill(skill: SkillId): void {
    if (!this.economy.unlockSkill(skill)) {
      this.ui.toast('Talent verrouillé ou Savoir insuffisant.');
      return;
    }
    if (
      skill === 'optimal_routes'
      || skill === 'trail_sense'
      || skill === 'logistics_network'
      || skill === 'archipelago_consciousness'
    ) {
      this.workers.forEach((entity) => {
        const state = this.economy.progress.workers.find((worker) => worker.id === entity.id);
        if (state) this.syncWorker(entity, state, true);
      });
    }
    const message = skill === 'archipelago_consciousness'
      ? 'CONSCIENCE ABSOLUE · les trois voies ne font plus qu’une.'
      : skill === 'auto_regulation'
      ? 'Auto-régulation débloquée · tu peux maintenant l’activer.'
        : skill === 'expanded_roster'
          ? `Cercle des bâtisseurs rang ${getSkillRank(this.economy.progress, skill)} · +1 poste permanent.`
          : skill === 'cargo_harness'
            ? `Harnais modulaires rang ${getSkillRank(this.economy.progress, skill)} · capacité ${getCargoCapacity(this.economy.progress)}.`
            : skill === 'full_loads'
              ? 'Tournées complètes · les renards attendent désormais d’avoir le dos plein.'
              : skill === 'remote_management'
                ? 'Conseil itinérant · l’onglet ÉQUIPE est maintenant accessible partout.'
                : skill === 'tidal_inheritance'
                  ? `Héritage des courants rang ${getSkillRank(this.economy.progress, skill)} · ${Math.round(getTidalRetentionRate(this.economy.progress) * 100)} % conservés.`
        : skill === 'awakening'
          ? 'Le Savoir s’éveille · trois voies viennent d’apparaître.'
          : 'Nouveau savoir acquis · la constellation s’étend.';
    this.ui.toast(message);
    this.feedback.play('skill');
    this.changed();
  }

  private unlockWorldTwoSkill(skill: WorldTwoSkillId): void {
    const definition = WORLD_TWO_SKILLS.find((candidate) => candidate.id === skill);
    if (!definition || !this.economy.unlockWorldTwoSkill(skill)) {
      if (definition) {
        this.ui.toast(`Savoir verrouillé · il manque ${formatWorldTwoCost(this.economy.missingWorldTwo(definition.cost))}.`);
      }
      return;
    }
    this.feedback.play('skill');
    this.ui.toast(`${definition.name} acquis · ${definition.detail}`);
    this.syncPlayerCargoVisuals();
    this.worldTwoWolves.forEach((wolf) => this.syncWorldTwoWolfCargo(wolf));
    this.changed();
  }

  private upgradeWorldTwoFangs(actor: 'player' | 'wolf'): void {
    const cost = getWorldTwoFangUpgradeCost(this.economy.progress, actor);
    if (cost === null) {
      this.ui.toast('Crocs au niveau maximum · aucun filon ne leur résiste.');
      return;
    }
    if (!this.economy.upgradeWorldTwoFangs(actor)) {
      this.ui.toast(`Il manque ${formatWorldTwoMoney(this.economy.missingWorldTwo(cost))}.`);
      return;
    }
    const level = actor === 'player'
      ? this.economy.progress.worldTwoFangLevel
      : this.economy.progress.worldTwoWolfFangLevel;
    const unlocked = WORLD_TWO_MINERALS[level - 1];
    this.refreshWorldTwoLocks();
    this.feedback.play('skill');
    this.ui.toast(
      actor === 'player'
        ? `Crocs renforcés · ${unlocked?.name ?? 'nouveau minerai'} peut maintenant être miné.`
        : `Crocs de meute renforcés · les loups ciblent maintenant ${unlocked?.name ?? 'des filons plus durs'}.`,
    );
    this.changed();
  }

  private toggleAutoRegulation(enabled: boolean): void {
    if (!this.economy.setAutoRegulation(enabled)) return;
    this.autoRegulationCooldown = 0.4;
    if (this.economy.progress.powerNotifications) {
      this.ui.toast(enabled ? 'Auto-régulation active · l’équipe surveille les pénuries.' : 'Auto-régulation désactivée.');
    }
    if (enabled) this.feedback.play('power');
    this.changed();
  }

  private toggleIndustrySurge(enabled: boolean): void {
    if (!this.economy.setIndustrySurge(enabled)) return;
    this.industrySurgeCooldown = enabled ? 0.35 : 2.5;
    if (!enabled) this.industrySurgeRemaining = 0;
    if (this.economy.progress.powerNotifications) {
      this.ui.toast(enabled
        ? 'Surcharge tellurique armée · elle réagira à la prochaine pénurie.'
        : 'Surcharge tellurique désactivée.');
    }
    if (enabled) this.feedback.play('power');
    this.changed();
  }

  private toggleExplorationFlow(enabled: boolean): void {
    if (!this.economy.setExplorationFlow(enabled)) return;
    this.explorationFlowCooldown = enabled ? 4.5 : 4;
    if (!enabled) this.explorationFlowRemaining = 0;
    if (this.economy.progress.powerNotifications) {
      this.ui.toast(enabled
        ? 'Courant de Marée armé · les cargaisons appelleront le prochain élan.'
        : 'Courant de Marée désactivé.');
    }
    if (enabled) this.feedback.play('power');
    this.changed();
  }

  private togglePowerNotifications(enabled: boolean): void {
    this.economy.setPowerNotifications(enabled);
    this.changed();
  }

  private togglePowerVfx(enabled: boolean): void {
    this.economy.setPowerVfx(enabled);
    if (!enabled) this.ui.setPowerEffects(false, this.industrySurgeKind, 0, false, 0);
    this.changed();
  }

  private buildProject(project: ProjectId): void {
    const definition = getProjectDefinition(project);
    if (!definition) return;
    const projectCost = getProjectCost(this.economy.progress, definition);
    if (!this.economy.buildProject(project)) {
      this.showMissing(projectCost);
      return;
    }
    const entity = this.projects.find((candidate) =>
      candidate.definition.islandIndex === definition.islandIndex);
    if (entity) {
      const localProjects = ISLAND_PROJECTS.filter((candidate) =>
        candidate.islandIndex === definition.islandIndex);
      const sealIndex = localProjects.findIndex((candidate) => candidate.id === project);
      const seal = entity.seals[sealIndex];
      if (seal) {
        seal.visible = true;
        this.startBuildingAssembly(seal);
      }
    }
    this.spawnParticles(
      entity?.building.getWorldPosition(new THREE.Vector3()).setY(1.1) ?? this.player.position.clone().setY(1.1),
      project === 'unity_lighthouse' ? 'crystal' : project === 'copper_winches' ? 'copper' : 'wood',
      project === 'unity_lighthouse' ? 32 : 18,
    );
    this.ui.toast(`${definition.name} achevé · ${definition.effect}`);
    this.feedback.play('build');
    this.changed();
  }

  private recruitWorker(): void {
    if (this.ui.activeCrewMode !== 'nursery' && this.ui.activeCrewMode !== 'remote') {
      this.ui.toast('Le recrutement se fait uniquement dans la nurserie centrale.');
      return;
    }
    const recruitCost = getRecruitCost(this.economy.progress);
    const worker = this.economy.hireWorker();
    if (!worker) {
      if (this.economy.progress.workers.length >= getWorkerCapacity(this.economy.progress)) {
        this.ui.toast('Capacité atteinte · construis la prochaine structure.');
      } else this.showMissing(recruitCost);
      return;
    }
    this.spawnWorker(worker, true);
    this.ui.celebrateRecruit(worker.id);
    const entity = this.workers.find((candidate) => candidate.id === worker.id);
    if (entity) this.spawnParticles(entity.root.position.clone().setY(0.75), worker.task, 12);
    this.ui.toast(`${worker.name} rejoint l’équipe et récolte : ${RESOURCE_LABELS[worker.task]}.`);
    this.feedback.play('recruit');
    this.changed();
  }

  private assignWorker(workerId: string, task: ResourceKind): void {
    if (this.ui.activeCrewMode !== 'nursery' && this.ui.activeCrewMode !== 'remote') {
      this.ui.toast('Les métiers se gèrent depuis la nurserie centrale.');
      return;
    }
    if (!this.economy.assignWorker(workerId, task)) return;
    const state = this.economy.progress.workers.find((worker) => worker.id === workerId);
    const entity = this.workers.find((worker) => worker.id === workerId);
    if (state && entity) this.syncWorker(entity, state, true);
    if (state) this.ui.toast(`${state.name} est maintenant assigné à : ${RESOURCE_LABELS[task]}.`);
    this.changed();
  }

  private upgradeWorker(workerId: string): void {
    const before = this.economy.progress.workers.find((worker) => worker.id === workerId);
    if (!before) return;
    const requiredMode = before.level === 1 ? 'workshop' : 'foundry';
    const remoteTraining = this.ui.activeCrewMode === 'remote'
      && hasSkill(this.economy.progress, 'remote_management');
    if (this.ui.activeCrewMode !== requiredMode && !remoteTraining) {
      this.ui.toast(before.level === 1
        ? 'Va dans l’Atelier des Pins pour atteindre le niveau 2.'
        : 'Va dans la Fonderie Cuivrée pour atteindre le niveau 3.');
      return;
    }
    const upgradeCost = getUpgradeCost(before, this.economy.progress);
    if (!this.economy.upgradeWorker(workerId)) {
      this.showMissing(upgradeCost);
      return;
    }
    const state = this.economy.progress.workers.find((worker) => worker.id === workerId);
    const entity = this.workers.find((worker) => worker.id === workerId);
    if (state && entity) {
      entity.levelUpTimer = WORKER_FEEL.levelUpSeconds;
      this.syncWorker(entity, state, false);
      this.spawnParticles(entity.root.position.clone().setY(0.9), state.task, 10 + state.level * 3);
    }
    if (state) {
      this.ui.celebrateLevelUp(state.id, state.level);
      this.ui.toast(`${state.name} passe niveau ${state.level} · rendement amélioré !`);
      this.feedback.play('level');
    }
    this.changed();
  }

  private setupScene(): void {
    this.applyWorldPalette(this.economy.progress.currentWorld);
    this.scene.add(new THREE.HemisphereLight(0xd9f3f1, 0x725f42, 2.25));

    this.sun.position.set(-15, 23, 15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 72;
    this.sun.shadow.camera.left = -24;
    this.sun.shadow.camera.right = 24;
    this.sun.shadow.camera.top = 24;
    this.sun.shadow.camera.bottom = -24;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun, this.sun.target);
  }

  private prewarmWorldRendering(): void {
    const worldTwoVisible = this.worldTwoRoot.visible;
    const causewayVisible = this.worldTravelCauseway.visible;
    this.worldTwoRoot.visible = true;
    this.worldTravelCauseway.visible = true;
    // Les shaders du sentier et de la montagne sont préparés sous l'écran de
    // chargement : aucun premier rendu coûteux ne doit couper la cinématique.
    this.renderer.compile(this.scene, this.camera);
    this.worldTwoRoot.visible = worldTwoVisible;
    this.worldTravelCauseway.visible = causewayVisible;
  }

  private applyWorldPalette(world: 1 | 2): void {
    const color = world === 2 ? 0x859ba5 : 0x8cc7c6;
    this.scene.background = new THREE.Color(color);
    this.scene.fog = new THREE.Fog(color, world === 2 ? 38 : 42, world === 2 ? 102 : 128);
    this.worldTwoRoot.visible = world === 2;
  }

  private createWorld(): void {
    this.createWater();
    ISLANDS.forEach((island, index) => this.createIsland(island, index));
    BRIDGES.forEach((bridge, index) => this.createBridge(bridge, index));
    WAREHOUSES.forEach((definition) => this.createWarehouse(definition));
    STRUCTURES.forEach((definition) => this.createStructure(definition));
    PROJECT_HALLS.forEach((definition) => this.createProjectHall(definition));
    this.createHeart();
    this.createResources();
    this.createCaches();
    this.decorateArchipelago();
    this.createWorldTwo();
  }

  private createWorldTwo(): void {
    this.worldTwoRoot.name = 'world-2:root';
    this.scene.add(this.worldTwoRoot);
    const mountainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(92, 178),
      new THREE.MeshStandardMaterial({
        color: 0x242d32,
        roughness: 1,
        metalness: 0.02,
      }),
    );
    mountainFloor.rotation.x = -Math.PI / 2;
    mountainFloor.position.set(160, -4.3, -63);
    mountainFloor.receiveShadow = true;
    mountainFloor.name = 'world-2:fond-de-vallée';
    this.worldTwoRoot.add(mountainFloor);

    WORLD_TWO_TERRACES.forEach((terrace, index) => {
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(terrace.radius, terrace.radius * 1.2, 3.1 + index * 0.12, 20, 1),
        [
          new THREE.MeshStandardMaterial({ color: terrace.sideColor, roughness: 1, flatShading: true }),
          new THREE.MeshStandardMaterial({ color: terrace.topColor, roughness: 0.98, flatShading: true }),
          new THREE.MeshStandardMaterial({ color: terrace.sideColor, roughness: 1, flatShading: true }),
        ],
      );
      platform.position.set(terrace.x, terrace.elevation - 1.56, terrace.z);
      platform.rotation.y = index * 0.37;
      platform.castShadow = true;
      platform.receiveShadow = true;
      platform.name = `world-2:${terrace.id}`;
      platform.userData.worldTwoTerrace = index;
      this.worldTwoRoot.add(platform);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(terrace.radius - 0.18, 0.16, 5, 30),
        new THREE.MeshStandardMaterial({
          color: index >= 8 ? 0xd3bd77 : index >= 5 ? 0xa8b5bd : 0x778288,
          emissive: index >= 8 ? 0x4b3510 : 0x131b22,
          emissiveIntensity: index >= 8 ? 0.6 : 0.24,
          roughness: 0.72,
        }),
      );
      rim.position.set(terrace.x, terrace.elevation + 0.05, terrace.z);
      rim.rotation.x = Math.PI / 2;
      rim.userData.worldTwoTerrace = index;
      this.worldTwoRoot.add(rim);

      const label = this.createWorldLabel(
        `${index + 1}/11 · ${terrace.name.toUpperCase()}`,
        index >= 8 ? 0xf0d37f : 0xb8c9d0,
        4.15,
      );
      label.position.set(terrace.x, terrace.elevation + 3.45, terrace.z + 0.8);
      label.userData.worldTwoTerrace = index;
      this.worldTwoRoot.add(label);

      const wallCount = Math.max(12, Math.round(terrace.radius * 1.6));
      const openings = [
        index > 0 ? { neighbor: WORLD_TWO_TERRACES[index - 1], ramp: WORLD_TWO_RAMPS[index - 1] } : null,
        index < WORLD_TWO_TERRACES.length - 1
          ? { neighbor: WORLD_TWO_TERRACES[index + 1], ramp: WORLD_TWO_RAMPS[index] }
          : null,
      ].filter((opening): opening is {
        neighbor: (typeof WORLD_TWO_TERRACES)[number];
        ramp: (typeof WORLD_TWO_RAMPS)[number];
      } => Boolean(opening?.neighbor && opening.ramp));
      for (let wallIndex = 0; wallIndex < wallCount; wallIndex += 1) {
        const angle = wallIndex / wallCount * Math.PI * 2 + index * 0.17;
        const blocksRamp = openings.some(({ neighbor, ramp }) => {
          const openingAngle = Math.atan2(neighbor.x - terrace.x, neighbor.z - terrace.z);
          const angularDistance = Math.abs(Math.atan2(
            Math.sin(angle - openingAngle),
            Math.cos(angle - openingAngle),
          ));
          const openingHalfAngle = Math.atan2(ramp.width * 0.6 + 0.48, terrace.radius);
          return angularDistance < openingHalfAngle;
        });
        if (blocksRamp) continue;

        const wallModel = this.assets.createWorldTwoAsset(wallIndex % 4 === 0 ? 'cliffDetail' : 'cliffTop');
        const wall = new THREE.Group();
        wall.add(wallModel);
        wall.scale.set(0.46 * 2.05, 0.26, 0.46);
        wall.position.set(
          terrace.x + Math.sin(angle) * (terrace.radius + 0.03),
          terrace.elevation,
          terrace.z + Math.cos(angle) * (terrace.radius + 0.03),
        );
        wall.rotation.y = angle + Math.PI;
        wall.name = `world-2:muret:${index + 1}:${wallIndex + 1}`;
        wall.userData.worldTwoTerrace = index;
        wall.userData.worldTwoBoundary = true;
        this.worldTwoRoot.add(wall);
      }
    });

    WORLD_TWO_RAMPS.forEach((ramp, index) => {
      const from = WORLD_TWO_TERRACES[ramp.from];
      const to = WORLD_TWO_TERRACES[ramp.to];
      if (!from || !to) return;
      const direction = vec(to.x - from.x, to.z - from.z).normalize();
      // Les extrémités pénètrent franchement dans les deux terrasses. Le
      // tablier les dépasse encore de 0,9 m : aucun vide ni « pas » ne reste.
      const start = vec(from.x, from.z).addScaledVector(direction, from.radius - 0.9);
      const end = vec(to.x, to.z).addScaledVector(direction, -(to.radius - 0.9));
      const length = Math.max(3.5, start.distanceTo(end));
      const rise = to.elevation - from.elevation;
      const rampRoot = new THREE.Group();
      rampRoot.position.lerpVectors(start, end, 0.5).setY((from.elevation + to.elevation) / 2 + 0.08);
      rampRoot.rotation.order = 'YXZ';
      rampRoot.rotation.y = Math.atan2(direction.x, direction.z);
      rampRoot.rotation.x = -Math.atan2(rise, Math.max(0.1, length));
      rampRoot.name = `world-2:rampe-roche-${index + 1}`;
      rampRoot.userData.worldTwoRamp = index;

      const support = new THREE.Mesh(
        new THREE.BoxGeometry(ramp.width, 0.44, length + 1.8),
        new THREE.MeshStandardMaterial({ color: index >= 7 ? 0x5c5867 : 0x41494d, roughness: 1 }),
      );
      support.position.y = -0.24;
      support.castShadow = true;
      support.receiveShadow = true;
      rampRoot.add(support);

      const rockDeckModel = this.assets.createWorldTwoAsset('corridor');
      rockDeckModel.scale.set(ramp.width / 8, 0.13, (length + 1.8) / 8.24);
      const rockDeck = new THREE.Group();
      rockDeck.add(rockDeckModel);
      rockDeck.position.y = 0.015;
      rockDeck.name = `world-2:tablier-roche-${index + 1}`;
      rampRoot.add(rockDeck);
      this.worldTwoRoot.add(rampRoot);
    });

    this.createWorldPortal(new THREE.Vector3(-7.2, 0, 7.2), 2, 'WORLD 2 · PORTAIL DU ZÉNITH', false);
    const base = WORLD_TWO_TERRACES[0]!;
    this.createWorldPortal(new THREE.Vector3(base.x, base.elevation, base.z + 6.15), 1, 'RETOUR · WORLD 1', true);
    this.createWorldTwoDepot();
    this.createWorldTwoDen();
    this.createWorldTwoShrine();
    this.createWorldTwoResources();
    this.decorateWorldTwo();
    this.createWorldTwoEnemies();
    this.restoreWorldTwoWolves();
    this.refreshWorldTwoLocks();
    this.createWorldTravelCauseway();
  }

  private createWorldTravelCauseway(): void {
    const points = [
      new THREE.Vector3(-4.8, 0.08, 7.2),
      new THREE.Vector3(8, 0.3, 12),
      new THREE.Vector3(24, 1.2, 10),
      new THREE.Vector3(42, 2.1, 2),
      new THREE.Vector3(62, 2.6, -7),
      new THREE.Vector3(82, 2, -13),
      new THREE.Vector3(103, 1.6, -7),
      new THREE.Vector3(123, 1.1, 1),
      new THREE.Vector3(141, 0.6, 10),
      new THREE.Vector3(154, 0.2, 17),
      new THREE.Vector3(160, 0.1, 16),
      new THREE.Vector3(160, 0.05, 1.3),
    ];
    this.worldTravelCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
    this.worldTravelCauseway.name = 'transition:sentier-terrestre';
    this.worldTravelCauseway.visible = false;
    const pathGeometry = new THREE.BoxGeometry(1, 1, 1);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0x6a4b32,
      roughness: 1,
      flatShading: true,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x34383a,
      roughness: 1,
      flatShading: true,
    });
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const segmentCount = 44;
    const deckInstances = new THREE.InstancedMesh(pathGeometry, earthMaterial, segmentCount);
    const rockInstances = new THREE.InstancedMesh(
      rockGeometry,
      edgeMaterial,
      Math.ceil(segmentCount / 2) * 2,
    );
    const transform = new THREE.Object3D();
    let rockInstanceIndex = 0;
    for (let index = 0; index < segmentCount; index += 1) {
      const start = this.worldTravelCurve.getPoint(index / segmentCount);
      const end = this.worldTravelCurve.getPoint((index + 1) / segmentCount);
      const middle = start.clone().lerp(end, 0.5);
      const direction = end.clone().sub(start);
      const length = Math.max(0.2, Math.hypot(direction.x, direction.z));
      transform.position.copy(middle).add(new THREE.Vector3(0, -0.22, 0));
      transform.rotation.set(0, Math.atan2(direction.x, direction.z), 0);
      transform.scale.set(5.8, 0.44, length + 0.34);
      transform.updateMatrix();
      deckInstances.setMatrixAt(index, transform.matrix);

      if (index % 2 !== 0) continue;
      const normal = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      for (const side of [-1, 1] as const) {
        const progress = index / segmentCount;
        const height = 1.4 + progress * 2.4 + (index % 5) * 0.3;
        transform.position.copy(middle)
          .addScaledVector(normal, side * (4.65 + (index % 3) * 0.3))
          .add(new THREE.Vector3(0, height * 0.38 - 0.1, 0));
        transform.rotation.set(index * 0.17, index * 0.41, side * 0.08);
        transform.scale.set(0.95 + (index % 4) * 0.16, height, 1.1 + ((index + 2) % 4) * 0.15);
        transform.updateMatrix();
        rockInstances.setMatrixAt(rockInstanceIndex, transform.matrix);
        rockInstanceIndex += 1;
      }
    }
    deckInstances.name = 'transition:sol-instance';
    deckInstances.receiveShadow = true;
    deckInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    deckInstances.instanceMatrix.needsUpdate = true;
    deckInstances.computeBoundingSphere();
    rockInstances.name = 'transition:parois-instances';
    rockInstances.receiveShadow = true;
    rockInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rockInstances.instanceMatrix.needsUpdate = true;
    rockInstances.computeBoundingSphere();
    this.worldTravelCauseway.add(deckInstances, rockInstances);

    for (let index = 1; index <= 5; index += 1) {
      const point = this.worldTravelCurve.getPoint(index / 6);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf0c873,
          emissive: 0x7f4916,
          emissiveIntensity: 1.8,
          roughness: 0.35,
        }),
      );
      marker.position.copy(point).add(new THREE.Vector3(0, 1.05, 0));
      marker.userData.temporalRing = index % 2 ? 0.35 : -0.35;
      this.worldTravelCauseway.add(marker);
    }
    this.scene.add(this.worldTravelCauseway);
  }

  private createWorldPortal(position: THREE.Vector3, destination: 1 | 2, text: string, worldTwo: boolean): void {
    const root = new THREE.Group();
    root.position.copy(position);
    root.rotation.y = worldTwo ? Math.PI : 0;

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.34, 0.28, 14),
      new THREE.MeshStandardMaterial({
        color: worldTwo ? 0x424a50 : 0x7b624b,
        roughness: 0.95,
        flatShading: true,
      }),
    );
    plinth.position.y = 0.14;
    plinth.receiveShadow = true;
    root.add(plinth);

    [-1, 1].forEach((side) => {
      const rock = this.assets.createWorldTwoAsset(side < 0 ? 'cliffDetail' : 'cliffTop', 2.15);
      rock.position.set(side * 1.72, 0.24, 0.24);
      rock.rotation.y = side * 0.48 + Math.PI;
      rock.scale.x *= 0.72;
      rock.scale.z *= 0.74;
      root.add(rock);
    });

    const portalFrame = this.assets.createWorldTwoAsset('portal', 4.25);
    portalFrame.position.y = 0.24;
    portalFrame.scale.x *= 1.08;
    portalFrame.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        material.emissive.setHex(worldTwo ? 0x164f64 : 0x392267);
        material.emissiveIntensity = 0.75;
      });
    });
    root.add(portalFrame);

    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(2.28, 2.82, 1, 1),
      this.assets.createPortalSpiralMaterial(worldTwo ? 0x65e8ff : 0xb890ff),
    );
    veil.position.set(0, 2.02, 0.08);
    veil.userData.portalVeil = true;
    root.add(veil);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.055, 6, 40),
      new THREE.MeshBasicMaterial({
        color: worldTwo ? 0x72f2ff : 0xc4a1ff,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.position.set(0, 2.02, 0.14);
    halo.scale.y = 1.18;
    halo.userData.temporalRing = worldTwo ? -0.45 : 0.45;
    root.add(halo);

    const glow = new THREE.PointLight(worldTwo ? 0x60ddea : 0xa77cff, 10, 9, 2);
    glow.position.set(0, 2, 0.75);
    root.add(glow);
    root.name = destination === 2 ? 'portail:world-2' : 'portail:world-1';
    const parent = worldTwo ? this.worldTwoRoot : this.scene;
    parent.add(root);

    const label = this.createWorldLabel(text, worldTwo ? 0x79d5cf : 0xbab4ed, 4.2);
    label.position.copy(position).add(new THREE.Vector3(0, 4.85, 0));
    parent.add(label);
    this.worldPortals.push({ root, label, destination });
  }

  private createWorldTwoDepot(): void {
    const base = WORLD_TWO_TERRACES[0]!;
    const definition: WarehouseDefinition = {
      islandIndex: 0,
      name: 'Refuge des Échos',
      x: base.x - 5.7,
      z: base.z - 1.4,
      radius: 1.45,
      rotation: Math.atan2(5.7, 1.4),
    };
    const building = new THREE.Group();
    building.position.set(definition.x, base.elevation, definition.z);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.9, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0x3e464a, roughness: 1, flatShading: true }),
    );
    platform.position.y = 0.14;
    building.add(platform);
    const model = this.assets.createWorldTwoAsset('den');
    model.scale.setScalar(0.38);
    model.rotation.y = definition.rotation;
    model.position.y = 0.26;
    building.add(model);
    building.userData.worldTwoDepot = true;
    building.userData.worldTwoTerrace = 0;
    this.worldTwoRoot.add(building);
    const pad = new THREE.Group();
    pad.visible = false;
    const status = this.createWorldLabel('✓ REFUGE DES ÉCHOS · VENTE DES MINERAIS', 0x9fd8e5, 3.8);
    status.position.set(definition.x, base.elevation + 3.75, definition.z);
    status.userData.worldTwoDepot = true;
    status.userData.worldTwoTerrace = 0;
    this.worldTwoRoot.add(status);
    this.warehouses.push({ definition, pad, building, status, world: 2 });
  }

  private createWorldTwoDen(): void {
    const base = WORLD_TWO_TERRACES[0]!;
    const root = new THREE.Group();
    root.position.set(base.x + 5.7, base.elevation, base.z - 1.4);
    root.rotation.y = Math.atan2(-5.7, 1.4);
    root.userData.worldTwoTerrace = 0;

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.92, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0x40484c, roughness: 1, flatShading: true }),
    );
    platform.position.y = 0.15;
    root.add(platform);
    const den = this.assets.createWorldTwoAsset('gateRock', 3.55);
    den.position.y = 0.28;
    root.add(den);
    const fire = new THREE.PointLight(0xf2a85d, 7, 7, 2);
    fire.position.set(0, 1.1, 0.8);
    root.add(fire);
    this.worldTwoRoot.add(root);

    const label = this.createWorldLabel('TANIÈRE DE LA MEUTE · RECRUTEMENT', 0xf2c27c, 3.8);
    label.position.set(root.position.x, base.elevation + 3.9, root.position.z);
    label.userData.worldTwoTerrace = 0;
    this.worldTwoRoot.add(label);
    this.worldTwoDen = { root, label };
  }

  private createWorldTwoShrine(): void {
    const terraceIndex = 3;
    const terrace = WORLD_TWO_TERRACES[terraceIndex]!;
    const root = new THREE.Group();
    root.position.set(terrace.x - 4.65, terrace.elevation, terrace.z + 1.2);
    root.rotation.y = Math.atan2(terrace.x - root.position.x, terrace.z - root.position.z);
    root.userData.worldTwoTerrace = terraceIndex;
    const shrine = this.assets.createWorldTwoAsset('corridor');
    shrine.scale.setScalar(0.34);
    root.add(shrine);
    const monolith = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 1),
      new THREE.MeshStandardMaterial({
        color: 0x86b9c7,
        emissive: 0x234e66,
        emissiveIntensity: 1.6,
        metalness: 0.18,
        roughness: 0.24,
      }),
    );
    monolith.position.y = 1.45;
    monolith.userData.temporalRing = 0.28;
    root.add(monolith);
    this.worldTwoRoot.add(root);
    const label = this.createWorldLabel('SANCTUAIRE DE MEUTE · SAVOIRS DU ZÉNITH', 0x9fd8e5, 4.2);
    label.position.set(root.position.x, terrace.elevation + 3.8, root.position.z);
    label.userData.worldTwoTerrace = terraceIndex;
    this.worldTwoRoot.add(label);
    this.worldTwoShrine = { root, label };
  }

  private createWorldTwoResources(): void {
    WORLD_TWO_RESOURCES.forEach((spawn, index) => {
      const terrace = WORLD_TWO_TERRACES[spawn.terraceIndex];
      if (!terrace) return;
      const terraceSlot = WORLD_TWO_RESOURCES
        .slice(0, index)
        .filter((candidate) => candidate.terraceIndex === spawn.terraceIndex)
        .length;
      const designedAngle = WORLD_TWO_RESOURCE_ANGLES[spawn.terraceIndex]?.[terraceSlot];
      const angle = designedAngle === undefined
        ? Math.atan2(spawn.dx, spawn.dz)
        : THREE.MathUtils.degToRad(designedAngle);
      const distanceFromCenter = Math.hypot(spawn.dx, spawn.dz);
      const root = new THREE.Group();
      const mineral = getWorldTwoMineral(spawn.kind);
      const visual = this.assets.createWorldTwoAsset(
        mineral.visualKind,
        mineral.visualKind === 'coal' ? 1.2 : mineral.visualKind === 'gold' ? 1.32 : 1.25,
      );
      visual.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const mineralMaterials = sourceMaterials.map((source) => {
          const material = source.clone();
          if (material instanceof THREE.MeshStandardMaterial) {
            material.color.setHex(mineral.color);
            material.roughness = mineral.visualKind === 'coal' ? 0.94 : 0.68;
            material.metalness = mineral.hardness <= 3 ? 0.05 : Math.min(0.5, mineral.hardness / 75);
            material.userData.worldTwoMineralColor = mineral.color;
          }
          return material;
        });
        object.material = Array.isArray(object.material) ? mineralMaterials : mineralMaterials[0]!;
      });
      root.add(visual);
      const mineableHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.065, 6, 28),
        new THREE.MeshBasicMaterial({
          color: mineral.color,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        }),
      );
      mineableHalo.rotation.x = Math.PI / 2;
      mineableHalo.position.y = 0.09;
      mineableHalo.userData.mineableMineralHalo = true;
      root.add(mineableHalo);
      root.position.set(
        terrace.x + Math.sin(angle) * distanceFromCenter,
        terrace.elevation,
        terrace.z + Math.cos(angle) * distanceFromCenter,
      );
      root.scale.setScalar(spawn.scale);
      root.rotation.y = (index * 1.37) % (Math.PI * 2);
      root.userData.worldTwoTerrace = spawn.terraceIndex;
      this.worldTwoRoot.add(root);
      const node: ResourceNode = {
        id: `world-2-resource-${index + 1}`,
        kind: getWorldTwoCargoVisualKind(spawn.kind),
        root,
        islandIndex: 5 + spawn.terraceIndex,
        visualCycle: index + 100,
        amount: spawn.capacity,
        capacity: spawn.capacity,
        baseScale: spawn.scale,
        respawnSeconds: spawn.respawnSeconds,
        currentScale: spawn.scale,
        respawn: 0,
        pulse: 0,
        world: 2,
        rarity: spawn.rarity,
        worldTwoKind: spawn.kind,
      };
      this.resources.push(node);
      this.applyWorldTwoMineralAppearance(node);
    });
  }

  private decorateWorldTwo(): void {
    const mountainMaterial = new THREE.MeshStandardMaterial({
      color: 0x46545a,
      roughness: 1,
      flatShading: true,
    });
    const mountainInstances = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 7),
      mountainMaterial,
      45,
    );
    const transform = new THREE.Object3D();
    let mountainInstance = 0;
    for (let side = -1; side <= 1; side += 2) {
      for (let index = 0; index < 18; index += 1) {
        const z = 10 - index * 8.4;
        const progress = index / 17;
        const height = 10 + progress * 17 + (index % 4) * 2.3;
        const radius = 8 + (index % 3) * 2.4;
        transform.position.set(
          160 + side * (23 + (index % 3) * 3.2),
          -4 + height / 2 + progress * 5,
          z,
        );
        transform.rotation.set(0, index * 0.73, 0);
        transform.scale.set(radius, height, radius);
        transform.updateMatrix();
        mountainInstances.setMatrixAt(mountainInstance, transform.matrix);
        mountainInstance += 1;
      }
    }

    for (let index = 0; index < 9; index += 1) {
      const radius = 9 + (index % 2) * 2;
      const height = 17 + index * 0.7;
      transform.position.set(142 + index * 4.5, 5.5 + index * 0.35, -143 - (index % 3) * 2);
      transform.rotation.set(0, index * 0.56, 0);
      transform.scale.set(radius, height, radius);
      transform.updateMatrix();
      mountainInstances.setMatrixAt(mountainInstance, transform.matrix);
      mountainInstance += 1;
    }
    mountainInstances.name = 'world-2:enceinte-montagne-instances';
    mountainInstances.castShadow = true;
    mountainInstances.receiveShadow = true;
    mountainInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mountainInstances.instanceMatrix.needsUpdate = true;
    mountainInstances.computeBoundingSphere();
    this.worldTwoRoot.add(mountainInstances);

    const summit = WORLD_TWO_TERRACES[WORLD_TWO_TERRACES.length - 1]!;
    const beacon = this.assets.createWorldTwoAsset('gateRock', 5.25);
    // Le monument final se tient à l'opposé de la rampe d'arrivée : le joueur
    // peut entrer au sommet sans traverser le décor, puis le voit face à lui.
    beacon.position.set(summit.x, summit.elevation, summit.z - 5.55);
    beacon.rotation.y = 0;
    beacon.userData.worldTwoTerrace = WORLD_TWO_TERRACES.length - 1;
    this.worldTwoRoot.add(beacon);
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.75, 1),
      new THREE.MeshStandardMaterial({
        color: 0xe4dcff,
        emissive: 0x6d5db4,
        emissiveIntensity: 1.8,
        metalness: 0.22,
        roughness: 0.18,
      }),
    );
    crown.position.set(summit.x, summit.elevation + 5.75, summit.z - 5.55);
    crown.userData.temporalRing = 0.35;
    crown.userData.worldTwoTerrace = WORLD_TWO_TERRACES.length - 1;
    this.worldTwoRoot.add(crown);
  }

  private createWorldTwoEnemies(): void {
    const encounters: Array<{ terraceIndex: number; kind: WorldTwoEnemyKind; height: number; angle: number }> = [
      { terraceIndex: 2, kind: 'enemyDemon', height: 1.85, angle: 100 },
      { terraceIndex: 4, kind: 'enemyWraith', height: 1.72, angle: 270 },
      { terraceIndex: 6, kind: 'enemyYeti', height: 2.05, angle: 100 },
      { terraceIndex: 8, kind: 'enemyDemon', height: 2.08, angle: 270 },
      { terraceIndex: 10, kind: 'enemyYeti', height: 2.32, angle: 145 },
    ];
    encounters.forEach(({ terraceIndex, kind, height, angle }, index) => {
      const terrace = WORLD_TWO_TERRACES[terraceIndex];
      if (!terrace) return;
      const { root: model, clips } = this.assets.createWorldTwoEnemy(kind, height);
      const root = new THREE.Group();
      const enemyAngle = THREE.MathUtils.degToRad(angle);
      const enemyRadius = terrace.radius - 1.35;
      root.position.set(
        terrace.x + Math.sin(enemyAngle) * enemyRadius,
        terrace.elevation,
        terrace.z + Math.cos(enemyAngle) * enemyRadius,
      );
      root.add(model);
      root.userData.worldTwoTerrace = terraceIndex;
      root.userData.enemy = true;
      this.worldTwoRoot.add(root);
      const mixer = new THREE.AnimationMixer(model);
      const actions = new Map<string, THREE.AnimationAction>();
      const definitions: Array<[string, THREE.AnimationClip | undefined]> = [
        ['idle', findAnimation(clips, kind === 'enemyWraith' ? /flying_idle/i : /^idle$/i) ?? clips[0]],
        ['move', findAnimation(clips, kind === 'enemyWraith' ? /fast_flying/i : /^run$|^walk$/i) ?? clips[0]],
        ['act', findAnimation(clips, kind === 'enemyWraith' ? /headbutt|punch/i : /punch|weapon/i) ?? clips[0]],
        ['hit', findAnimation(clips, /hitreact/i) ?? clips[0]],
        ['death', findAnimation(clips, /^death$/i) ?? clips[0]],
      ];
      definitions.forEach(([name, clip]) => {
        if (!clip) return;
        const action = mixer.clipAction(clip);
        if (name === 'death') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        actions.set(name, action);
      });
      const maximumHealth = 6 + index * 3;
      const entity: WorldTwoEnemyEntity = {
        id: `mountain-enemy-${index + 1}`,
        terraceIndex,
        root,
        mixer,
        actions,
        currentAction: '',
        kind,
        health: maximumHealth,
        maximumHealth,
        attackTimer: 0.7,
        respawnTimer: 0,
        deathTimer: 0,
      };
      this.worldTwoEnemies.push(entity);
      this.playWorldTwoEnemyAction(entity, 'idle', 0);
    });
  }

  private restoreWorldTwoWolves(): void {
    this.economy.progress.worldTwoWolves.forEach((state, index) => this.spawnWorldTwoWolf(state, index > 0));
  }

  private spawnWorldTwoWolf(state: WorldTwoWorkerState, stagger = false): void {
    const existing = this.worldTwoWolves.find((candidate) => candidate.id === state.id);
    if (existing) return;
    const { root: model, clips } = this.assets.createWolf(1.7);
    const coatColors = [0xffffff, 0xe4d2c1, 0xcbd7e5, 0xd5cfca];
    const coatColor = new THREE.Color(coatColors[this.worldTwoWolves.length % coatColors.length]);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const tintedMaterials = sourceMaterials.map((sourceMaterial) => {
        const material = sourceMaterial.clone();
        if ('color' in material && material.color instanceof THREE.Color) {
          material.color.multiply(coatColor);
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? tintedMaterials : tintedMaterials[0]!;
    });
    const root = new THREE.Group();
    const denPosition = this.worldTwoDen?.root.position ?? new THREE.Vector3(WORLD_TWO_TERRACES[0]!.x + 4.7, 0, 0);
    root.position.copy(denPosition).add(new THREE.Vector3(-0.9 + this.worldTwoWolves.length * 0.62, 0, 1.35));
    root.add(model);
    const cargoRack = new THREE.Group();
    cargoRack.position.set(0, 1.13, -0.08);
    root.add(cargoRack);
    root.userData.worldTwoTerrace = 0;
    root.userData.wolf = state.id;
    this.worldTwoRoot.add(root);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map<string, THREE.AnimationAction>();
    const definitions: Array<[string, THREE.AnimationClip | undefined]> = [
      ['idle', findAnimation(clips, /^idle$/i) ?? findAnimation(clips, /idle/i) ?? clips[0]],
      ['walk', findAnimation(clips, /^walk$/i) ?? clips[0]],
      ['run', findAnimation(clips, /^gallop$/i) ?? findAnimation(clips, /walk/i) ?? clips[0]],
      ['act', findAnimation(clips, /^attack$/i) ?? findAnimation(clips, /eat/i) ?? clips[0]],
      ['hit', findAnimation(clips, /hitreact/i) ?? clips[0]],
      ['death', findAnimation(clips, /^death$/i) ?? clips[0]],
    ];
    definitions.forEach(([name, clip]) => {
      if (!clip) return;
      const action = mixer.clipAction(clip);
      if (name === 'death') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions.set(name, action);
    });
    const entity: WorldTwoWolfEntity = {
      id: state.id,
      root,
      mixer,
      actions,
      currentAction: '',
      phase: 'seeking',
      target: null,
      enemy: null,
      route: [],
      routeIndex: 0,
      timer: stagger ? 0.6 + this.worldTwoWolves.length * 0.3 : 0,
      cargoRack,
      cargo: 0,
      cargoKind: state.task,
    };
    this.worldTwoWolves.push(entity);
    this.playWorldTwoWolfAction(entity, 'idle', 0);
  }

  private playWorldTwoWolfAction(
    entity: WorldTwoWolfEntity,
    name: 'idle' | 'walk' | 'run' | 'act' | 'hit' | 'death',
    fade = 0.12,
  ): void {
    const action = entity.actions.get(name);
    if (!action || entity.currentAction === name) return;
    const previous = entity.actions.get(entity.currentAction);
    action.reset().fadeIn(fade).play();
    previous?.fadeOut(fade);
    entity.currentAction = name;
  }

  private playWorldTwoEnemyAction(
    entity: WorldTwoEnemyEntity,
    name: 'idle' | 'move' | 'act' | 'hit' | 'death',
    fade = 0.1,
  ): void {
    const action = entity.actions.get(name);
    if (!action || entity.currentAction === name) return;
    const previous = entity.actions.get(entity.currentAction);
    action.reset().fadeIn(fade).play();
    if (name === 'death') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    previous?.fadeOut(fade);
    entity.currentAction = name;
  }

  private createWater(): void {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(280, 280),
      new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.34, metalness: 0.08 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -2.08, -46);
    water.receiveShadow = true;
    water.name = 'mer';
    this.scene.add(water);

    for (let index = 0; index < 28; index += 1) {
      const ripple = new THREE.Mesh(
        new THREE.TorusGeometry(1 + (index % 4) * 0.34, 0.035, 5, 28),
        new THREE.MeshBasicMaterial({ color: 0xbfe0d8, transparent: true, opacity: 0.22 }),
      );
      const column = index % 4;
      ripple.position.set(-25 + column * 16 + (index % 2) * 3, -1.96, 11 - Math.floor(index / 4) * 14);
      ripple.rotation.x = Math.PI / 2;
      ripple.userData.phase = index * 0.61;
      ripple.userData.ripple = true;
      this.scene.add(ripple);
    }
  }

  private createIsland(definition: IslandDefinition, index: number): void {
    const root = new THREE.Group();
    root.name = `île:${definition.id}`;
    root.position.y = index === 0 || this.economy.progress.bridgesBuilt[index - 1] ? 0 : HIDDEN_ISLAND_Y;
    const sideMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.earth, roughness: 0.96, flatShading: true });
    const topMaterial = new THREE.MeshStandardMaterial({ color: definition.topColor, roughness: 0.92, flatShading: true });
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(definition.radius, definition.radius * 1.08, 2.1, 36, 1),
      [sideMaterial, topMaterial, sideMaterial],
    );
    island.position.set(definition.x, -1.05, definition.z);
    island.rotation.y = definition.rotation;
    island.receiveShadow = true;
    island.castShadow = true;
    island.name = definition.name;
    root.add(island);

    const shore = new THREE.Mesh(
      new THREE.CylinderGeometry(definition.radius + 0.18, definition.radius + 0.48, 0.3, 36),
      new THREE.MeshStandardMaterial({ color: definition.shoreColor, roughness: 1, flatShading: true }),
    );
    shore.position.set(definition.x, -0.2, definition.z);
    shore.receiveShadow = true;
    root.add(shore);
    this.scene.add(root);
    this.islands.push({ index, definition, root });
  }

  private findIslandEntity(x: number, z: number): IslandEntity | undefined {
    return [...this.islands]
      .sort((a, b) => {
        const aDistance = Math.hypot(x - a.definition.x, z - a.definition.z) / a.definition.radius;
        const bDistance = Math.hypot(x - b.definition.x, z - b.definition.z) / b.definition.radius;
        return aDistance - bDistance;
      })[0];
  }

  private addToIsland(object: THREE.Object3D, x: number, z: number): void {
    const island = this.findIslandEntity(x, z);
    if (island) island.root.add(object);
    else this.scene.add(object);
  }

  private createBridge(definition: BridgeDefinition, index: number): void {
    const from = ISLANDS[definition.fromIsland];
    const to = ISLANDS[definition.toIsland];
    if (!from || !to) return;
    const direction = vec(to.x - from.x, to.z - from.z).normalize();
    const start = vec(from.x, from.z).addScaledVector(direction, from.radius - 0.7);
    const end = vec(to.x, to.z).addScaledVector(direction, -(to.radius - 0.7));
    const bridgeVector = end.clone().sub(start);
    const length = bridgeVector.length();
    const root = new THREE.Group();
    const yaw = Math.atan2(bridgeVector.x, bridgeVector.z);
    // KayKit fournit déjà un pont entier. Le répéter créait une succession
    // d’arches complètes ; une seule instance est ici ajustée au passage.
    const bridgeModel = this.assets.createWorldTwoAsset('bridge', 0.82);
    // Ce modèle est conçu autour d’un tablier à Y=0 et de piles sous l’eau.
    // La normalisation générique est donc annulée uniquement pour ce pont.
    bridgeModel.position.set(0, 0, 0);
    const bridge = new THREE.Group();
    bridge.add(bridgeModel);
    bridge.updateMatrixWorld(true);
    const naturalSize = new THREE.Box3().setFromObject(bridge).getSize(new THREE.Vector3());
    const bridgeLengthScale = (length + 1.15) / Math.max(0.001, naturalSize.z);
    const visualWidth = Math.max(
      WORLD_ONE_BRIDGE_MIN_VISUAL_WIDTH,
      naturalSize.x * bridgeLengthScale,
    );
    bridge.scale.set(
      visualWidth / Math.max(0.001, naturalSize.x),
      bridgeLengthScale,
      bridgeLengthScale,
    );
    bridge.position.lerpVectors(start, end, 0.5).setY(0.015);
    bridge.rotation.y = yaw;
    bridge.userData.bridgePlank = 0;
    bridge.userData.bridgeBaseScale = bridge.scale.clone();
    bridge.name = `pont-asset-complet:${definition.id}`;
    root.add(bridge);
    root.visible = false;
    this.scene.add(root);

    const padPosition = vec(from.x, from.z).addScaledVector(direction, from.radius - 1.55);
    const pad = new THREE.Group();
    pad.position.copy(padPosition).setY(0.04);
    pad.add(this.createBuildPad(1.15, index === 2 ? PALETTE.copper : index === 3 ? PALETTE.crystal : 0x69a6a1));
    pad.visible = false;
    this.addToIsland(pad, padPosition.x, padPosition.z);
    const guide = new THREE.Group();
    const guideStart = vec(from.x, from.z).addScaledVector(direction, 2.6);
    const guideEnd = padPosition.clone().addScaledVector(direction, -0.9);
    const guideVector = guideEnd.clone().sub(guideStart);
    for (let arrowIndex = 0; arrowIndex < 5; arrowIndex += 1) {
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.72, 3),
        new THREE.MeshStandardMaterial({
          color: 0xffd56f,
          emissive: 0x9a5f16,
          emissiveIntensity: 1.25,
          roughness: 0.42,
        }),
      );
      arrow.position.lerpVectors(guideStart, guideEnd, (arrowIndex + 1) / 6).setY(0.48);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), guideVector.clone().normalize());
      arrow.userData.bridgeGuide = true;
      arrow.userData.guidePhase = arrowIndex * 0.7;
      arrow.castShadow = true;
      guide.add(arrow);
    }
    guide.visible = false;
    this.addToIsland(guide, from.x, from.z);
    this.bridges.push({ index, definition, root, pad, guide, start, end, visualWidth });
  }

  private createWarehouse(definition: WarehouseDefinition): void {
    const pad = new THREE.Group();
    pad.position.set(definition.x, 0.05, definition.z);
    pad.add(this.createBuildPad(definition.radius, 0xd4a65f));
    this.addToIsland(pad, definition.x, definition.z);

    const building = new THREE.Group();
    building.position.set(definition.x, 0, definition.z);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.82, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0x8f6944, roughness: 0.92, flatShading: true }),
    );
    platform.position.y = 0.14;
    platform.receiveShadow = true;
    building.add(platform);
    const model = this.assets.createBuilding('storage', 3.15);
    model.position.y = 0.28;
    model.rotation.y = definition.rotation;
    model.name = 'modèle:dépôt';
    building.add(model);
    const chute = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.2, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x64442d, roughness: 0.88 }),
    );
    chute.position.set(0, 0.48, 1.25);
    chute.rotation.x = -0.16;
    building.add(chute);
    building.visible = false;
    this.addToIsland(building, definition.x, definition.z);

    const status = this.createWorldLabel('DÉPÔT · KIT DE DÉPART', 0xd4a65f, 4.4);
    status.position.set(definition.x, 4.15, definition.z);
    this.addToIsland(status, definition.x, definition.z);
    this.warehouses.push({ definition, pad, building, status, world: 1 });
  }

  private createStructure(definition: StructureDefinition): void {
    const pad = new THREE.Group();
    pad.position.set(definition.x, 0.05, definition.z);
    pad.add(this.createBuildPad(definition.radius, definition.color));
    this.addToIsland(pad, definition.x, definition.z);

    const building = this.createStructureBuilding(definition.kind, definition.rotation);
    building.position.set(definition.x, 0, definition.z);
    building.visible = false;
    const status = this.createWorldLabel(
      definition.kind === 'camp'
        ? 'RENARDS 0 / 3'
        : definition.kind === 'workshop'
          ? 'FORMATION · NIV 2'
          : definition.kind === 'foundry'
            ? 'FORMATION · NIV 3'
            : 'ARBRE DES SAVOIRS',
      definition.color,
    );
    status.position.set(0, definition.kind === 'observatory' ? 7.15 : definition.kind === 'camp' ? 5.15 : 5.35, 0);
    building.add(status);
    this.addToIsland(building, definition.x, definition.z);
    this.structures.set(definition.kind, { definition, pad, building, status });
  }

  private createProjectHall(definition: ProjectHallDefinition): void {
    const pad = new THREE.Group();
    pad.position.set(definition.x, 0.05, definition.z);
    pad.add(this.createBuildPad(definition.radius, definition.color));
    pad.visible = false;
    this.addToIsland(pad, definition.x, definition.z);

    const building = new THREE.Group();
    building.position.set(definition.x, 0, definition.z);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.54, 0.24, 10),
      new THREE.MeshStandardMaterial({ color: 0x806548, roughness: 0.94, flatShading: true }),
    );
    platform.position.y = 0.12;
    platform.receiveShadow = true;
    building.add(platform);
    // Une silhouette unique et immédiatement reconnaissable sur les quatre îles.
    const model = this.assets.createBuilding('timberReserve', 2.55);
    model.position.y = 0.24;
    model.rotation.y = definition.rotation;
    building.add(model);
    const seals: THREE.Group[] = [];
    for (let index = 0; index < 3; index += 1) {
      const seal = new THREE.Group();
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0x684a35, roughness: 0.88, flatShading: true }),
      );
      pedestal.position.y = 0.09;
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2),
        new THREE.MeshStandardMaterial({
          color: definition.color,
          emissive: definition.color,
          emissiveIntensity: 0.7,
          roughness: 0.3,
        }),
      );
      gem.position.y = 0.34;
      gem.userData.structureGlow = true;
      seal.position.set((index - 1) * 0.52, 0.25, 1.28);
      seal.add(pedestal, gem);
      seal.visible = false;
      building.add(seal);
      seals.push(seal);
    }
    building.visible = false;
    this.addToIsland(building, definition.x, definition.z);

    const status = this.createWorldLabel(
      `⌂ MAISON DES TRAVAUX · 0/3`,
      definition.color,
      4.6,
    );
    status.position.set(definition.x, 3.45, definition.z);
    status.visible = false;
    this.addToIsland(status, definition.x, definition.z);
    this.projects.push({ definition, pad, building, status, seals });
  }

  private createWorldLabel(text: string, accent: number, width = 4.8): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 896;
    canvas.height = 210;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, width / 4.25, 1);
    sprite.renderOrder = 40;
    sprite.userData.labelCanvas = canvas;
    sprite.userData.labelAccent = accent;
    this.setWorldLabel(sprite, text, accent);
    return sprite;
  }

  private setWorldLabel(sprite: THREE.Sprite, text: string, accent = Number(sprite.userData.labelAccent) || PALETTE.gold): void {
    if (sprite.userData.labelText === text && Number(sprite.userData.labelAccent) === accent) return;
    const canvas = sprite.userData.labelCanvas as HTMLCanvasElement | undefined;
    const material = sprite.material as THREE.SpriteMaterial;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !material.map) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(17, 49, 41, 0.94)';
    context.beginPath();
    context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 42);
    context.fill();
    context.strokeStyle = `#${accent.toString(16).padStart(6, '0')}`;
    context.lineWidth = 9;
    context.stroke();
    const words = text.split(/\s+/);
    let lines = [text];
    context.font = '900 46px system-ui, sans-serif';
    if (context.measureText(text).width > canvas.width - 76 && words.length > 2) {
      let bestSplit = 1;
      let bestDifference = Infinity;
      for (let index = 1; index < words.length; index += 1) {
        const left = words.slice(0, index).join(' ');
        const right = words.slice(index).join(' ');
        const difference = Math.abs(context.measureText(left).width - context.measureText(right).width);
        if (difference < bestDifference) {
          bestDifference = difference;
          bestSplit = index;
        }
      }
      lines = [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
    }
    let fontSize = lines.length > 1 ? 40 : 47;
    context.font = `900 ${fontSize}px system-ui, sans-serif`;
    while (fontSize > 28 && lines.some((line) => context.measureText(line).width > canvas.width - 76)) {
      fontSize -= 2;
      context.font = `900 ${fontSize}px system-ui, sans-serif`;
    }
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff7db';
    if (lines.length === 1) {
      context.fillText(lines[0]!, canvas.width / 2, canvas.height / 2 + 2);
      sprite.scale.y = sprite.scale.x / 4.25;
    } else {
      const lineGap = fontSize * 1.08;
      context.fillText(lines[0]!, canvas.width / 2, canvas.height / 2 - lineGap * 0.45);
      context.fillText(lines[1]!, canvas.width / 2, canvas.height / 2 + lineGap * 0.55);
      sprite.scale.y = sprite.scale.x / 3.45;
    }
    sprite.userData.labelText = text;
    sprite.userData.labelAccent = accent;
    material.map.needsUpdate = true;
  }

  private startBuildingAssembly(building: THREE.Group): void {
    const parts: THREE.Mesh[] = [];
    building.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (
        object.userData.structureGlow
        || object.userData.observatoryLens
        || object.userData.observatoryOrbit
      ) return;
      if (!object.userData.assemblyBasePosition) {
        object.userData.assemblyBasePosition = object.position.clone();
        object.userData.assemblyBaseScale = object.scale.clone();
      }
      parts.push(object);
    });
    parts.forEach((part, index) => {
      const basePosition = part.userData.assemblyBasePosition as THREE.Vector3;
      const baseScale = part.userData.assemblyBaseScale as THREE.Vector3;
      const angle = index * 2.399963;
      const distance = 0.72 + (index % 4) * 0.18;
      const offset = new THREE.Vector3(
        Math.cos(angle) * distance,
        0.65 + (index % 5) * 0.18,
        Math.sin(angle) * distance,
      );
      part.userData.assemblyOffset = offset;
      part.position.copy(basePosition).add(offset);
      part.scale.copy(baseScale).multiplyScalar(0.025);
    });
    building.userData.assemblyParts = parts;
    building.userData.assemblyElapsed = 0;
    building.userData.assembling = true;
  }

  private createBuildPad(radius: number, color: number): THREE.Group {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.11, 28),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.62, roughness: 0.7 }),
    );
    disc.receiveShadow = true;
    group.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.82, 0.055, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff4ca, transparent: true, opacity: 0.72 }),
    );
    ring.position.y = 0.09;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius * 0.2),
      new THREE.MeshStandardMaterial({ color: 0xfff1b6, emissive: color, emissiveIntensity: 0.32, roughness: 0.4 }),
    );
    marker.position.y = 0.75;
    marker.userData.floatMarker = true;
    group.add(marker);
    return group;
  }

  private createStructureBuilding(kind: StructureKind, rotation = 0): THREE.Group {
    const group = new THREE.Group();
    const platformColor = kind === 'camp' ? 0xb7874f : kind === 'workshop' ? 0x9b7447 : kind === 'foundry' ? 0x765d54 : 0x74758e;
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(kind === 'camp' ? 2.25 : 2.28, kind === 'camp' ? 2.4 : 2.44, 0.34, 12),
      new THREE.MeshStandardMaterial({ color: platformColor, roughness: 0.9, flatShading: true }),
    );
    platform.position.y = 0.15;
    platform.receiveShadow = true;
    group.add(platform);

    const targetHeight: Record<StructureKind, number> = {
      camp: 4.25,
      workshop: 4.15,
      foundry: 4.3,
      observatory: 5.35,
    };
    const model = this.assets.createBuilding(kind, targetHeight[kind]);
    model.position.y = 0.3;
    model.rotation.y = rotation;
    model.name = `modèle:${kind}`;
    group.add(model);

    if (kind === 'camp') {
      const ember = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.13, 0),
        new THREE.MeshStandardMaterial({ color: 0xffc068, emissive: 0xa74318, emissiveIntensity: 2.4 }),
      );
      ember.position.set(0.95, 0.38, 0.75);
      ember.userData.structureGlow = true;
      group.add(ember);
    } else if (kind === 'foundry') {
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 18),
        new THREE.MeshBasicMaterial({ color: 0xff9a4f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      );
      glow.position.set(0.1, 0.72, 1.42);
      glow.userData.structureGlow = true;
      group.add(glow);
    } else if (kind === 'observatory') {
      const lens = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.46),
        new THREE.MeshStandardMaterial({ color: PALETTE.crystal, emissive: 0x59558b, emissiveIntensity: 1.5, roughness: 0.25 }),
      );
      lens.position.set(0, 6.25, 0);
      lens.userData.observatoryLens = true;
      lens.userData.baseY = 6.25;
      group.add(lens);
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.075, 7, 28),
        new THREE.MeshStandardMaterial({ color: 0xf0c56d, metalness: 0.42, roughness: 0.38 }),
      );
      orbit.position.y = 6.25;
      orbit.rotation.x = Math.PI / 2;
      orbit.userData.observatoryOrbit = true;
      group.add(orbit);
    }
    group.userData.structureKind = kind;
    return group;
  }

  private createHeart(): void {
    const island = ISLANDS[4];
    if (!island) return;
    this.heart.position.set(island.x, 0, island.z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.85, 0.6, 9),
      new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.9, flatShading: true }),
    );
    base.position.y = 0.3;
    base.castShadow = true;
    this.heart.add(base);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 1.05, 3.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xc5bd94, roughness: 0.88, flatShading: true }),
    );
    tower.position.y = 2.25;
    tower.castShadow = true;
    this.heart.add(tower);
    this.heartCore.position.y = 4.55;
    this.heartCore.castShadow = true;
    this.heart.add(this.heartCore);
    this.heartLight.position.y = 4.5;
    this.heart.add(this.heartLight);
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.13, 8, 32),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.35, roughness: 0.4 }),
    );
    crown.position.y = 4.55;
    crown.rotation.x = Math.PI / 2;
    crown.userData.heartRing = true;
    this.heart.add(crown);
    this.addToIsland(this.heart, island.x, island.z);
  }

  private createResources(): void {
    RESOURCE_SPAWNS.forEach((spawn, index) => {
      const root = new THREE.Group();
      const asset = this.createResourceVisual(spawn.kind, index, spawn.model);
      root.add(asset);
      root.position.set(spawn.x, 0, spawn.z);
      root.scale.setScalar(spawn.scale);
      root.rotation.y = (spawn.x * 1.73 + spawn.z * 0.91) % (Math.PI * 2);
      this.addToIsland(root, spawn.x, spawn.z);
      this.resources.push({
        id: `resource-${index + 1}`,
        kind: spawn.kind,
        root,
        islandIndex: findIslandIndexForPoint(spawn.x, spawn.z),
        visualCycle: index,
        amount: spawn.capacity,
        capacity: spawn.capacity,
        baseScale: spawn.scale,
        respawnSeconds: spawn.respawnSeconds,
        currentScale: spawn.scale,
        respawn: 0,
        pulse: 0,
        world: 1,
        rarity: spawn.kind === 'wood'
          ? 'Arbre'
          : spawn.kind === 'stone'
            ? 'Rocher'
            : spawn.kind === 'copper'
              ? 'Filon de cuivre'
              : 'Cristal ancien',
      });
    });
  }

  private createResourceVisual(kind: ResourceKind, visualCycle: number, preferredModel?: NatureKind): THREE.Object3D {
    if (kind === 'wood') return this.assets.createNature(preferredModel ?? (visualCycle % 2 === 0 ? 'treeA' : 'treeB'));
    if (kind === 'stone') return this.assets.createNature('rock');
    return this.createMineralCluster(kind);
  }

  private rerollResourceNode(node: ResourceNode): void {
    if (node.world === 2) return;
    const counts: Partial<Record<ResourceKind, number>> = {};
    this.resources.forEach((candidate) => {
      if (candidate === node || candidate.world !== node.world || candidate.islandIndex !== node.islandIndex) return;
      counts[candidate.kind] = (counts[candidate.kind] ?? 0) + 1;
    });
    const nextKind = pickResourceKindForIsland(node.islandIndex, Math.random(), counts);
    node.visualCycle += 1;
    if (nextKind === node.kind && nextKind !== 'wood') return;
    node.kind = nextKind;
    node.root.clear();
    node.root.add(this.createResourceVisual(nextKind, node.visualCycle));
  }

  private createMineralCluster(kind: 'copper' | 'crystal'): THREE.Group {
    const group = new THREE.Group();
    const rock = this.assets.createNature('rock');
    rock.scale.setScalar(0.62);
    group.add(rock);
    const material = kind === 'copper'
      ? new THREE.MeshStandardMaterial({ color: PALETTE.copper, metalness: 0.28, roughness: 0.54, flatShading: true })
      : new THREE.MeshStandardMaterial({ color: PALETTE.crystal, emissive: 0x4e4b82, emissiveIntensity: 0.75, metalness: 0.12, roughness: 0.26, flatShading: true });
    const offsets: Array<[number, number, number, number]> = [
      [-0.26, 0.62, 0.08, 0.46], [0.2, 0.82, -0.05, 0.6], [0.43, 0.48, 0.22, 0.38], [-0.42, 0.4, -0.25, 0.34],
    ];
    offsets.forEach(([x, y, z, scale], index) => {
      const crystal = new THREE.Mesh(
        kind === 'copper' ? new THREE.DodecahedronGeometry(scale, 0) : new THREE.OctahedronGeometry(scale),
        material,
      );
      crystal.position.set(x, y, z);
      crystal.scale.y = kind === 'crystal' ? 1.75 : 1.2;
      crystal.rotation.y = index * 1.3;
      crystal.rotation.z = (index - 1.5) * 0.12;
      crystal.castShadow = true;
      group.add(crystal);
    });
    return group;
  }

  private createCaches(): void {
    CACHES.forEach((definition) => {
      const root = new THREE.Group();
      root.position.set(definition.x, 0.05, definition.z);
      root.add(this.createCacheModel());
      this.addToIsland(root, definition.x, definition.z);
      this.caches.push({ definition, root });
    });
  }

  private createCacheModel(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.75, 0.8),
      new THREE.MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 0.85, flatShading: true }),
    );
    body.position.y = 0.42;
    body.castShadow = true;
    group.add(body);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.82, 0.86),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.25, roughness: 0.5 }),
    );
    band.position.y = 0.44;
    group.add(band);
    return group;
  }

  private decorateArchipelago(): void {
    ISLANDS.forEach((island, islandIndex) => {
      const decorations: Array<[number, number, 'bush' | 'grass']> = [
        [-0.46, 0.54, 'bush'], [0.43, 0.58, 'grass'], [-0.57, -0.43, 'grass'], [0.55, -0.42, 'bush'],
      ];
      decorations.forEach(([xFactor, zFactor, kind], index) => {
        const model = this.assets.createNature(kind);
        model.position.set(island.x + xFactor * island.radius, 0, island.z + zFactor * island.radius);
        model.rotation.y = islandIndex * 1.37 + index * 1.81;
        model.scale.setScalar(0.64 + ((islandIndex + index) % 3) * 0.08);
        this.addToIsland(model, model.position.x, model.position.z);
      });
    });

    const first = ISLANDS[0];
    if (!first) return;
    for (let index = 0; index < 11; index += 1) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 0.75, 6),
        new THREE.MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 1 }),
      );
      const angle = (index / 11) * Math.PI * 2;
      post.position.set(
        first.x + Math.cos(angle) * (first.radius - 0.65),
        0.38,
        first.z + Math.sin(angle) * (first.radius - 0.65),
      );
      post.rotation.z = Math.cos(angle) * 0.08;
      post.castShadow = true;
      this.addToIsland(post, post.position.x, post.position.z);
    }
  }

  private createPlayer(): THREE.AnimationMixer {
    const { root, clips } = this.assets.createFox(1.35);
    this.playerModel = root;
    this.player.add(root);
    // Le premier objet commence au-dessus de l'échine : aucune cargaison ne
    // doit traverser le modèle du renard.
    this.playerCargoRack.position.set(0, 1.04, -0.12);
    this.playerCargoRack.name = 'cargaison:joueur';
    this.player.add(this.playerCargoRack);
    const start = this.economy.progress.currentWorld === 2 ? WORLD_TWO_TERRACES[0] : null;
    this.player.position.set(start?.x ?? 0, start?.elevation ?? 0, start ? start.z + 1.2 : 4.25);
    this.scene.add(this.player);
    const mixer = new THREE.AnimationMixer(root);
    const definitions: Array<[string, THREE.AnimationClip | undefined]> = [
      ['idle', findAnimation(clips, /^Idle$/i) ?? findAnimation(clips, /idle/i)],
      ['walk', findAnimation(clips, /walk|gallop/i)],
      ['act', findAnimation(clips, /attack|eating/i)],
    ];
    definitions.forEach(([name, clip]) => {
      if (!clip) return;
      const action = mixer.clipAction(clip);
      action.enabled = true;
      this.playerActions.set(name, action);
    });
    this.playPlayerAction('idle', 0);
    this.syncPlayerCargoVisuals();
    return mixer;
  }

  private restoreVisualProgress(): void {
    this.refreshWorldLocks();
    this.economy.progress.workers.forEach((worker) => this.spawnWorker(worker));
    if (this.economy.progress.completed) this.activateHeart(false);
  }

  private refreshWorldLocks(): void {
    const progress = this.economy.progress;
    this.islands.forEach((entity) => {
      if (this.islandEmergence?.entity === entity) return;
      const accessible = entity.index === 0 || progress.bridgesBuilt[entity.index - 1];
      entity.root.position.y = accessible ? 0 : HIDDEN_ISLAND_Y;
      entity.root.visible = true;
    });
    this.warehouses.forEach((entity) => {
      const { islandIndex } = entity.definition;
      const built = entity.world === 2 || Boolean(progress.warehousesBuilt[islandIndex]);
      const accessible = entity.world === 2 || islandIndex === 0 || Boolean(progress.bridgesBuilt[islandIndex - 1]);
      const unlocked = entity.world === 2 || isWarehouseUnlocked(progress, islandIndex);
      entity.building.visible = built;
      entity.pad.visible = accessible && !built;
      entity.status.visible = accessible;
      this.setWorldLabel(
        entity.status,
        built
          ? `✓ ${entity.definition.name.toUpperCase()} · ACTIF`
          : unlocked
            ? `${entity.definition.name.toUpperCase()} · À ASSEMBLER`
            : `${entity.definition.name.toUpperCase()} · MARÉE ${islandIndex + 1} REQUISE`,
        unlocked ? 0xd4a65f : 0x80918b,
      );
    });
    this.structures.forEach((entity, kind) => {
      const built = structureBuilt(progress, kind);
      const accessible = kind === 'camp'
        ? progress.warehousesBuilt[0]
        : kind === 'workshop'
          ? progress.bridgesBuilt[0]
          : kind === 'foundry'
            ? progress.bridgesBuilt[1]
            : progress.bridgesBuilt[2];
      entity.building.visible = built;
      entity.pad.visible = accessible && !built;
      if (kind === 'camp') {
        this.setWorldLabel(
          entity.status,
          `RENARDS ${progress.workers.length} / ${getWorkerCapacity(progress)}`,
          entity.definition.color,
        );
      }
    });
    this.projects.forEach((entity) => {
      const tierProjects = ISLAND_PROJECTS.filter((project) => project.islandIndex === entity.definition.islandIndex);
      const completed = tierProjects.filter((project) => hasProject(progress, project.id)).length;
      const accessible = entity.definition.islandIndex === 0
        || Boolean(progress.bridgesBuilt[entity.definition.islandIndex - 1]);
      const hallBuilt = isProjectHallBuilt(progress, entity.definition.islandIndex);
      const readyToBuild = isProjectHallReady(progress, entity.definition.islandIndex);
      const unlocked = hallBuilt && tierProjects.some((project) => isProjectVisible(progress, project));
      entity.building.visible = accessible && hallBuilt;
      entity.pad.visible = accessible && !hallBuilt && readyToBuild;
      entity.status.visible = accessible && (hallBuilt || readyToBuild);
      entity.seals.forEach((seal, index) => { seal.visible = index < completed; });
      this.setWorldLabel(
        entity.status,
        !hallBuilt
          ? readyToBuild
            ? `⌂ MAISON DES TRAVAUX · À CONSTRUIRE`
            : `⌂ MAISON DES TRAVAUX · BÂTIMENT PRINCIPAL REQUIS`
          : completed >= 3
          ? `✓ MAISON DES TRAVAUX · 3/3`
          : unlocked
            ? `⌂ MAISON DES TRAVAUX · ${completed}/3`
            : `⌂ MAISON DES TRAVAUX · FERMÉE`,
        hallBuilt && unlocked ? entity.definition.color : readyToBuild ? 0xd4a65f : 0x80918b,
      );
    });
    this.bridges.forEach((entity) => {
      const built = progress.bridgesBuilt[entity.index];
      const accessible = entity.index === 0 ? progress.campBuilt
        : entity.index === 1 ? progress.workshopBuilt
          : entity.index === 2 ? progress.foundryBuilt
            : progress.observatoryBuilt;
      entity.root.visible = Boolean(built);
      entity.pad.visible = accessible && !built;
      entity.guide.visible = entity.pad.visible && getIslandGoal(progress, entity.definition.fromIsland).completed;
    });
    this.caches.forEach((entity) => {
      entity.root.visible = !progress.cachesFound.includes(entity.definition.id);
    });
    const completion = getSkillTreeCompletion(progress);
    const entryPortal = this.worldPortals.find((portal) => portal.destination === 2);
    if (entryPortal) {
      const unlocked = isWorldTwoUnlocked(progress);
      this.setWorldLabel(
        entryPortal.label,
        unlocked
          ? 'WORLD 2 · PORTAIL OUVERT'
          : `WORLD 2 · MARÉES ${Math.min(5, progress.rebirths)}/5 · SAVOIRS ${completion.completed}/${completion.total}`,
        unlocked ? 0x79d5cf : 0x80918b,
      );
      entryPortal.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.userData.temporalRing) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if ('emissiveIntensity' in material) {
            (material as THREE.MeshStandardMaterial).emissiveIntensity = unlocked ? 1.8 : 0.18;
          }
          material.opacity = unlocked ? 0.94 : 0.46;
          material.transparent = true;
        });
      });
    }
    this.refreshWorldTwoLocks();
  }

  private refreshWorldTwoLocks(): void {
    this.worldTwoRoot.children.forEach((object) => {
      const terraceIndex = Number(object.userData.worldTwoTerrace);
      if (!Number.isFinite(terraceIndex)) return;
      object.visible = true;
    });
    this.resources.forEach((node) => {
      if (node.world !== 2) return;
      node.root.visible = node.amount > 0;
      this.applyWorldTwoMineralAppearance(node);
    });
    this.worldTwoEnemies.forEach((enemy) => {
      enemy.root.visible = enemy.respawnTimer <= 0 && (enemy.health > 0 || enemy.deathTimer > 0);
    });
    if (this.worldTwoDen) {
      this.worldTwoDen.root.visible = true;
      this.worldTwoDen.label.visible = true;
    }
    if (this.worldTwoShrine) {
      this.worldTwoShrine.root.visible = true;
      this.worldTwoShrine.label.visible = true;
    }
  }

  private applyWorldTwoMineralAppearance(node: ResourceNode): void {
    if (node.world !== 2 || !node.worldTwoKind) return;
    const mineral = getWorldTwoMineral(node.worldTwoKind);
    const mineable = canMineWorldTwoMineral(this.economy.progress, node.worldTwoKind);
    const mineralReadableColor = new THREE.Color(mineral.color);
    const mineralHsl = { h: 0, s: 0, l: 0 };
    mineralReadableColor.getHSL(mineralHsl);
    mineralReadableColor.setHSL(
      mineralHsl.s < 0.1 ? (0.55 + mineral.hardness * 0.047) % 1 : mineralHsl.h,
      Math.max(0.22, mineralHsl.s),
      Math.max(0.52, mineralHsl.l),
    );
    node.root.userData.mineralLocked = !mineable;
    node.root.userData.mineableMineralDark = mineable
      && Math.max(mineralReadableColor.r, mineralReadableColor.g, mineralReadableColor.b) < 0.24;
    node.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.userData.mineableMineralHalo) {
        object.visible = mineable;
        const haloMaterial = object.material as THREE.MeshBasicMaterial;
        haloMaterial.color.copy(mineralReadableColor);
        return;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        const actualColor = Number(material.userData.worldTwoMineralColor ?? mineral.color);
        const readable = new THREE.Color(actualColor);
        const hsl = { h: 0, s: 0, l: 0 };
        readable.getHSL(hsl);
        readable.setHSL(
          hsl.s < 0.1 ? (0.55 + mineral.hardness * 0.047) % 1 : hsl.h,
          Math.max(0.22, hsl.s),
          Math.max(0.46, hsl.l),
        );
        material.color.copy(mineable ? readable : new THREE.Color(0x030405));
        material.emissive.copy(mineable ? readable : new THREE.Color(0x000000));
        material.emissiveIntensity = mineable ? 0.2 + Math.min(0.34, mineral.hardness / 100) : 0;
        material.metalness = mineable ? Math.min(0.5, mineral.hardness / 75) : 0.02;
        material.roughness = mineable ? (mineral.visualKind === 'coal' ? 0.94 : 0.68) : 0.98;
      });
    });
  }

  private revealIsland(index: number): void {
    const entity = this.islands[index];
    if (!entity || index === 0) return;
    entity.root.visible = true;
    entity.root.position.y = HIDDEN_ISLAND_Y;
    this.islandEmergence = { entity, elapsed: 0, duration: 2.15 };
    this.createEmergenceRipples(entity.definition);
    this.spawnParticles(
      new THREE.Vector3(entity.definition.x, -0.4, entity.definition.z),
      index >= 3 ? 'crystal' : index === 2 ? 'copper' : 'stone',
      34,
    );
  }

  private createEmergenceRipples(island: IslandDefinition): void {
    for (let index = 0; index < 4; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xd9f3ef : 0x86cbc5,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(island.radius * (0.5 + index * 0.08), 0.075, 7, 54),
        material,
      );
      mesh.position.set(island.x, -1.91, island.z);
      mesh.rotation.x = Math.PI / 2;
      mesh.scale.setScalar(0.45);
      this.scene.add(mesh);
      this.emergenceRipples.push({ mesh, elapsed: 0, duration: 2.5, delay: index * 0.22 });
    }
  }

  private updateIslandEmergence(delta: number): void {
    const emergence = this.islandEmergence;
    if (emergence) {
      emergence.elapsed += delta;
      const ratio = THREE.MathUtils.clamp(emergence.elapsed / emergence.duration, 0, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const settle = ratio > 0.82 ? Math.sin((ratio - 0.82) / 0.18 * Math.PI) * 0.18 : 0;
      emergence.entity.root.position.y = THREE.MathUtils.lerp(HIDDEN_ISLAND_Y, 0, eased) + settle;
      if (ratio >= 1) {
        emergence.entity.root.position.y = 0;
        const emerged = emergence.entity;
        this.islandEmergence = null;
        this.ui.toast(`${emerged.definition.name} vient d’émerger des flots.`);
        this.claimScoutedCache(emerged);
      }
    }

    for (let index = this.emergenceRipples.length - 1; index >= 0; index -= 1) {
      const ripple = this.emergenceRipples[index];
      if (!ripple) continue;
      ripple.elapsed += delta;
      const local = ripple.elapsed - ripple.delay;
      if (local < 0) continue;
      const ratio = THREE.MathUtils.clamp(local / ripple.duration, 0, 1);
      ripple.mesh.scale.setScalar(0.45 + ratio * 1.15);
      ripple.mesh.material.opacity = Math.sin(ratio * Math.PI) * 0.52;
      if (ratio < 1) continue;
      this.scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
      this.emergenceRipples.splice(index, 1);
    }
  }

  private claimScoutedCache(island: IslandEntity): void {
    if (!hasSkill(this.economy.progress, 'scouting_parties')) return;
    const cache = this.caches.find((candidate) => {
      if (!candidate.root.visible) return false;
      return Math.hypot(
        candidate.definition.x - island.definition.x,
        candidate.definition.z - island.definition.z,
      ) <= island.definition.radius;
    });
    if (!cache || !this.economy.findCache(cache.definition.id, cache.definition.reward)) return;
    const reward = getCacheReward(this.economy.progress, cache.definition.reward);
    cache.root.visible = false;
    this.ui.toast(`Éclaireurs · cache récupérée : +${formatCost(reward)}`);
    this.changed();
  }

  private spawnWorker(state: WorkerState, withArrival = false): void {
    if (this.workers.some((worker) => worker.id === state.id)) return;
    const { root: model, clips } = this.assets.createFox(0.82);
    const root = new THREE.Group();
    root.add(model);
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.055, 6, 18),
      new THREE.MeshStandardMaterial({ color: RESOURCE_COLORS[state.task], roughness: 0.55 }),
    );
    marker.position.y = 0.72;
    marker.rotation.x = Math.PI / 2;
    root.add(marker);
    const cargoRack = new THREE.Group();
    cargoRack.position.set(0, 0.78, -0.08);
    cargoRack.name = `cargaison:${state.id}`;
    root.add(cargoRack);
    this.scene.add(root);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map<string, THREE.AnimationAction>();
    const idle = findAnimation(clips, /^Idle$/i) ?? findAnimation(clips, /idle/i) ?? clips[0];
    const walk = findAnimation(clips, /walk|gallop/i) ?? idle;
    const act = findAnimation(clips, /attack|eating/i) ?? idle;
    ([['idle', idle], ['walk', walk], ['act', act]] as const).forEach(([name, clip]) => {
      if (!clip) return;
      const action = mixer.clipAction(clip);
      action.enabled = true;
      actions.set(name, action);
    });
    actions.get('idle')?.play();
    const index = this.workers.length;
    const lateral = ((index % 3) - 1) * 0.55;
    root.position.set(lateral, 0, 1 + (index % 2) * 0.45);
    const entity: WorkerEntity = {
      id: state.id,
      root,
      marker,
      mixer,
      actions,
      currentAction: 'idle',
      cargoRack,
      task: state.task,
      level: state.level,
      phase: 'depositing',
      phaseTimer: index * 0.16,
      route: [],
      routeIndex: 0,
      routeDistance: 0,
      routeBridgeIndices: [],
      bridgesUsed: new Set<number>(),
      target: null,
      hub: vec(0, 1),
      depositTarget: vec(0, 0),
      cargo: 0,
      cargoKind: state.task,
      routeChoices: 0,
      arrivalTimer: withArrival ? WORKER_FEEL.arrivalSeconds : 0,
      levelUpTimer: 0,
      idleSwitchCooldown: 0,
    };
    this.workers.push(entity);
    this.syncWorkerCargoVisuals(entity);
    this.syncWorker(entity, state, true);
  }

  private syncWorker(entity: WorkerEntity, state: WorkerState, reroute: boolean): void {
    const changedTask = entity.task !== state.task;
    entity.task = state.task;
    entity.level = state.level;
    if (changedTask && entity.cargo <= 0) entity.cargoKind = state.task;
    entity.marker.material.color.setHex(RESOURCE_COLORS[state.task]);
    entity.marker.scale.setScalar(0.9 + state.level * 0.12);
    entity.root.scale.setScalar(entity.arrivalTimer > 0 ? 0.04 : 0.9 + state.level * 0.055);
    if (reroute) {
      if (entity.cargo > 0) this.routeWorkerToWarehouse(entity);
      else this.planWorkerCycle(entity, state);
    }
  }

  private playWorkerAction(entity: WorkerEntity, name: 'idle' | 'walk' | 'act', fade = 0.12): void {
    if (entity.currentAction === name) return;
    const next = entity.actions.get(name) ?? entity.actions.get('idle');
    if (!next) return;
    entity.actions.get(entity.currentAction)?.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    entity.currentAction = name;
  }

  private builtWarehouseHubs(): Array<{ entity: WarehouseEntity; point: THREE.Vector3 }> {
    return this.warehouses
      .filter((entity) =>
        entity.world === 1
        && this.economy.progress.warehousesBuilt[entity.definition.islandIndex])
      .map((entity) => ({
        entity,
        point: this.getWarehouseApproachPoint(entity),
      }));
  }

  private getWarehouseApproachPoint(entity: WarehouseEntity): THREE.Vector3 {
    const island = ISLANDS[entity.definition.islandIndex] ?? ISLANDS[0]!;
    const inward = vec(island.x - entity.definition.x, island.z - entity.definition.z);
    if (inward.lengthSq() < 0.01) inward.set(0, 0, 1);
    return vec(entity.definition.x, entity.definition.z)
      .addScaledVector(inward.normalize(), entity.definition.radius + 0.72);
  }

  private nearestWarehouseRoute(start: THREE.Vector3): {
    point: THREE.Vector3;
    depositTarget: THREE.Vector3;
    route: PlannedRoute;
  } | null {
    return this.builtWarehouseHubs()
      .map(({ entity, point }) => ({
        point,
        depositTarget: vec(entity.definition.x, entity.definition.z),
        route: this.planFrom(start, point),
      }))
      .filter((candidate): candidate is {
        point: THREE.Vector3;
        depositTarget: THREE.Vector3;
        route: PlannedRoute;
      } => Boolean(candidate.route))
      .sort((a, b) => a.route.distance - b.route.distance)[0] ?? null;
  }

  private routeWorkerToWarehouse(entity: WorkerEntity): boolean {
    const destination = this.nearestWarehouseRoute(entity.root.position);
    if (!destination) {
      entity.route = [];
      entity.phase = 'depositing';
      entity.phaseTimer = 0.5;
      this.playWorkerAction(entity, 'idle');
      return false;
    }
    entity.hub.copy(destination.point);
    entity.depositTarget.copy(destination.depositTarget);
    this.applyWorkerRoute(entity, destination.route, 'toHub');
    return true;
  }

  private planFrom(start: THREE.Vector3, target: THREE.Vector3): PlannedRoute | null {
    return planRoute(
      { x: start.x, z: start.z },
      { x: target.x, z: target.z },
      this.economy.progress.bridgesBuilt,
    );
  }

  private applyWorkerRoute(entity: WorkerEntity, planned: PlannedRoute, phase: WorkerEntity['phase']): void {
    entity.route = planned.points.map((point) => vec(point.x, point.z));
    entity.routeIndex = 0;
    entity.routeDistance = planned.distance;
    entity.routeBridgeIndices = [...planned.bridgeIndices];
    planned.bridgeIndices.forEach((index) => entity.bridgesUsed.add(index));
    entity.phase = phase;
    entity.phaseTimer = 0;
  }

  private reservedAmount(node: ResourceNode, excludingWorkerId: string): number {
    if (!hasSkill(this.economy.progress, 'archipelago_consciousness')) return 0;
    return this.workers.reduce((total, worker) => {
      if (
        worker.id === excludingWorkerId
        || worker.target !== node
        || (worker.phase !== 'toResource' && worker.phase !== 'gathering')
      ) return total;
      const state = this.economy.progress.workers.find((candidate) => candidate.id === worker.id);
      if (!state) return total;
      const amount = Math.max(
        0,
        getWorkerCargoCapacity(state.level, this.economy.progress) - worker.cargo,
      );
      return total + amount;
    }, 0);
  }

  private getResourceApproachPoint(node: ResourceNode): THREE.Vector3 {
    const island = ISLANDS[node.islandIndex] ?? ISLANDS[0]!;
    const inward = vec(island.x - node.root.position.x, island.z - node.root.position.z);
    if (inward.lengthSq() < 0.01) inward.set(0, 0, 1);
    const clearance = node.kind === 'wood'
      ? 0.82 + node.baseScale * 0.72
      : 0.62 + node.baseScale * 0.5;
    return node.root.position.clone().addScaledVector(inward.normalize(), clearance).setY(0);
  }

  private tryAdaptiveWorkerAssignment(entity: WorkerEntity, state: WorkerState): boolean {
    if (
      !hasSkill(this.economy.progress, 'adaptive_assignments')
      || entity.cargo > 0
      || entity.idleSwitchCooldown > 0
    ) return false;
    const start = entity.root.position;
    const candidates = getUnlockedWorkerTasks(this.economy.progress)
      .filter((kind) => kind !== state.task)
      .filter((kind) => this.resources.some((node) => {
        if (node.kind !== kind || node.amount <= 0 || !node.root.visible) return false;
        const approach = this.getResourceApproachPoint(node);
        return Boolean(this.planFrom(start, approach) && this.nearestWarehouseRoute(approach));
      }))
      .sort((a, b) => this.economy.progress[a] - this.economy.progress[b]);
    const nextTask = candidates[0];
    if (!nextTask || !this.economy.assignWorker(entity.id, nextTask)) return false;
    entity.idleSwitchCooldown = 6;
    this.syncWorker(entity, state, false);
    if (this.economy.progress.powerNotifications) {
      this.ui.toast(`${state.name} évite l’attente · relève vers ${RESOURCE_LABELS[nextTask]}.`);
    }
    this.ui.update(this.economy.progress);
    this.save();
    return true;
  }

  private planWorkerCycle(entity: WorkerEntity, state: WorkerState): void {
    const start = entity.root.position;
    const matchingResources = this.resources.filter((node) =>
      node.world === 1
      && node.kind === state.task
      && node.amount - this.reservedAmount(node, entity.id) > 0
      && node.root.visible);
    const reachable = matchingResources
      .map((node) => {
        const approach = this.getResourceApproachPoint(node);
        const outbound = this.planFrom(start, approach);
        const warehouse = this.nearestWarehouseRoute(approach);
        return {
          node,
          approach,
          outbound,
          returning: warehouse?.route ?? null,
          hub: warehouse?.point ?? null,
          depositTarget: warehouse?.depositTarget ?? null,
        };
      })
      .filter((candidate): candidate is {
        node: ResourceNode;
        approach: THREE.Vector3;
        outbound: PlannedRoute;
        returning: PlannedRoute;
        hub: THREE.Vector3;
        depositTarget: THREE.Vector3;
      } => Boolean(candidate.outbound && candidate.returning && candidate.hub && candidate.depositTarget));
    if (!reachable.length) {
      if (entity.cargo > 0 && this.routeWorkerToWarehouse(entity)) return;
      if (this.tryAdaptiveWorkerAssignment(entity, state)) {
        this.planWorkerCycle(entity, state);
        return;
      }
      entity.route = [];
      entity.routeBridgeIndices = [];
      entity.target = null;
      entity.phase = 'depositing';
      entity.phaseTimer = 0.28;
      this.playWorkerAction(entity, 'idle');
      return;
    }

    const unreserved = hasSkill(this.economy.progress, 'archipelago_consciousness')
      ? reachable.filter((candidate) => !this.workers.some((worker) =>
        worker.id !== entity.id
        && worker.target === candidate.node
        && (worker.phase === 'toResource' || worker.phase === 'gathering')))
      : reachable;
    const selectionPool = unreserved.length > 0 ? unreserved : reachable;
    entity.routeChoices += 1;
    const uninformedIndex = chooseUninformedResourceIndex(entity.id, entity.routeChoices, selectionPool.length);
    let selected = selectionPool[Math.max(0, uninformedIndex)] ?? selectionPool[0]!;

    if (hasSkill(this.economy.progress, 'optimal_routes')) {
      selected = [...selectionPool].sort((a, b) =>
        a.outbound.distance + a.returning.distance - b.outbound.distance - b.returning.distance)[0] ?? selected;
    }

    entity.target = selected.node;
    entity.hub.copy(selected.hub);
    entity.depositTarget.copy(selected.depositTarget);
    this.applyWorkerRoute(entity, selected.outbound, 'toResource');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    if (document.hidden) {
      this.lastFrameTime = now;
      return;
    }
    // Jusqu'à 100 ms, le déplacement reste stable (un pas maximal de 0,5 m)
    // et ne ralentit plus artificiellement sur un téléphone à 10–20 FPS.
    const rawDelta = Math.min(0.1, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;
    this.fpsAverage += ((1 / rawDelta) - this.fpsAverage) * 0.05;
    this.reconcileInputState();
    const simulationDelta = this.managementOpen ? 0 : rawDelta;
    this.worldTime += simulationDelta;
    if (simulationDelta > 0) this.updateAmbient(simulationDelta);
    if (this.tideResetAnimation) this.updateTideResetAnimation(rawDelta);
    if (this.active) this.updateGame(rawDelta);
    this.playerMixer.update(simulationDelta);
    this.workers.forEach((worker) => worker.mixer.update(simulationDelta));
    if (this.economy.progress.currentWorld !== 2) {
      this.worldTwoWolves.forEach((wolf) => wolf.mixer.update(0));
      this.worldTwoEnemies.forEach((enemy) => enemy.mixer.update(0));
    }
    this.updateParticles(simulationDelta);
    this.updateCargoDrops(simulationDelta);
    if (simulationDelta > 0) this.updateCamera(simulationDelta);
    this.updateDiagnostics();
    if (!this.managementOpen) {
      this.overlayRenderCooldown = 0;
      this.renderer.render(this.scene, this.camera);
    } else {
      this.overlayRenderCooldown -= rawDelta;
      if (this.overlayRenderCooldown <= 0) {
        this.overlayRenderCooldown = 0.2;
        this.renderer.render(this.scene, this.camera);
      }
    }
  };

  private updateGame(delta: number): void {
    if (this.worldTravelAnimation) {
      this.updateWorldTravel(delta);
      return;
    }
    if (this.managementOpen) {
      this.playPlayerAction('idle');
      return;
    }
    this.economy.tick(delta);
    this.input.updateKeyboard();
    if (this.economy.progress.currentWorld === 2) {
      const terraceIndex = Math.max(0, findWorldTwoTerraceIndex(this.player.position.x, this.player.position.z));
      this.ui.updateWorldTwoGoal(terraceIndex, this.economy.progress.worldTwoPeakReached);
    } else this.ui.updateIslandGoal(findIslandIndexForPoint(this.player.position.x, this.player.position.z));
    this.updateBridgeGuides();
    if (!this.playerDeposit) this.updatePlayer(delta);
    else this.playPlayerAction('idle');
    this.interaction = this.findInteraction();
    this.updateInteractionUI(this.interaction);
    if (!this.playerDeposit) this.handleAction(delta);
    this.updateResources(delta);
    this.updatePlayerDeposit(delta);
    if (this.economy.progress.currentWorld === 1) {
      this.updateActivePowers(delta);
      this.updateWorkers(delta);
      this.updateAutoRegulation(delta);
    } else {
      this.updateWorldTwoWolves(delta);
      this.updateWorldTwoEnemies(delta);
      this.updateWorldTwoProgress(delta);
    }

    this.saveCooldown -= delta;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = 4;
      this.save();
    }
  }

  private updateBridgeGuides(): void {
    this.bridges.forEach((bridge) => {
      const shouldGuide = bridge.pad.visible
        && getIslandGoal(this.economy.progress, bridge.definition.fromIsland).completed;
      bridge.guide.visible = shouldGuide;
      if (shouldGuide) {
        const pad = bridge.pad.getWorldPosition(new THREE.Vector3());
        const direction = pad.clone().sub(this.player.position).setY(0);
        if (direction.lengthSq() > 0.04) {
          direction.normalize();
          const start = this.player.position.clone().addScaledVector(direction, 1.25).setY(0.48);
          const end = pad.clone().addScaledVector(direction, -0.9).setY(0.48);
          bridge.guide.children.forEach((arrow, arrowIndex) => {
            arrow.position.lerpVectors(start, end, (arrowIndex + 1) / (bridge.guide.children.length + 1));
            arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          });
        }
      }
      if (shouldGuide && bridge.index === 0 && !this.managementOpen) {
        this.maybeShowTutorial(
          'bridge-guidance',
          'Le pont est prêt',
          'Tous les objectifs sont validés. Suis les flèches dorées apparues dans le monde : elles te conduisent directement au chantier du pont.',
          '➤',
        );
      }
    });
  }

  private updatePlayer(delta: number): void {
    const move = this.input.move;
    const magnitude = Math.min(1, Math.hypot(move.x, move.y));
    if (magnitude < 0.05) {
      if (!(this.input.actionDown && this.interaction?.type === 'resource')) this.playPlayerAction('idle');
      return;
    }
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const direction = right.multiplyScalar(move.x).add(forward.multiplyScalar(move.y)).normalize();
    this.lastMoveDirection.copy(direction);
    const flowMultiplier = getPlayerFlowMultiplier(
      this.economy.progress,
      this.explorationFlowRemaining > 0,
    );
    const candidate = this.player.position.clone().addScaledVector(
      direction,
      getPlayerSpeed(this.economy.progress) * flowMultiplier * magnitude * delta,
    );
    if (this.isWalkable(candidate)) this.player.position.copy(candidate);
    const desiredRotation = Math.atan2(direction.x, direction.z);
    let difference = desiredRotation - this.player.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    this.player.rotation.y += difference * (1 - Math.exp(-12 * delta));
    this.playPlayerAction('walk');
  }

  private isWalkable(position: THREE.Vector3): boolean {
    let onTerrain = false;
    if (this.economy.progress.currentWorld === 2) {
      const surface = getWorldTwoSurfaceAt(position.x, position.z);
      if (surface === null) return false;
      const terraceIndex = findWorldTwoTerraceIndex(position.x, position.z);
      if (terraceIndex >= 0) {
        onTerrain = true;
      } else {
        onTerrain = WORLD_TWO_RAMPS.some((ramp) => {
          const from = WORLD_TWO_TERRACES[ramp.from];
          const to = WORLD_TWO_TERRACES[ramp.to];
          if (!from || !to) return false;
          const onRamp = this.distanceToSegmentSquared(
            position,
            new THREE.Vector3(from.x, from.elevation, from.z),
            new THREE.Vector3(to.x, to.elevation, to.z),
          ) <= (ramp.width / 2) ** 2;
          return onRamp;
        });
      }
      return onTerrain;
    }
    const onIsland = ISLANDS.some((island, index) => {
      const accessible = (index === 0 || this.economy.progress.bridgesBuilt[index - 1])
        && this.islandEmergence?.entity.index !== index;
      return accessible && Math.hypot(position.x - island.x, position.z - island.z) <= island.radius - 0.42;
    });
    onTerrain = onIsland || this.bridges.some((bridge) => this.economy.progress.bridgesBuilt[bridge.index]
      && this.distanceToSegmentSquared(position, bridge.start, bridge.end)
        <= WORLD_ONE_BRIDGE_WALKABLE_HALF_WIDTH ** 2);
    return onTerrain;
  }

  private updateWorldTwoProgress(delta: number): void {
    if (this.economy.progress.currentWorld !== 2) return;
    const surface = getWorldTwoSurfaceAt(this.player.position.x, this.player.position.z);
    if (surface !== null) {
      this.player.position.y = THREE.MathUtils.damp(this.player.position.y, surface, 12, delta);
    }
    const terraceIndex = findWorldTwoTerraceIndex(this.player.position.x, this.player.position.z);
    const summitIndex = WORLD_TWO_TERRACES.length - 1;
    if (
      terraceIndex !== summitIndex
      || this.economy.progress.worldTwoPeakReached
    ) return;
    this.economy.progress.worldTwoPeakReached = true;
    const summit = WORLD_TWO_TERRACES[summitIndex]!;
    this.spawnParticles(new THREE.Vector3(summit.x, summit.elevation + 1.1, summit.z), 'crystal', 42);
    this.feedback.play('victory');
    this.ui.toast('Sommet du Zénith atteint · World 2 maîtrisé !');
    this.ui.update(this.economy.progress);
    this.save();
  }

  private distanceToSegmentSquared(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3): number {
    const segment = end.clone().sub(start);
    const lengthSquared = segment.lengthSq();
    if (lengthSquared <= 0.001) return point.distanceToSquared(start);
    const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
    const closest = start.clone().addScaledVector(segment, t);
    return point.distanceToSquared(closest);
  }

  private updateResources(delta: number): void {
    this.resources.forEach((node) => {
      if (node.world !== this.economy.progress.currentWorld) return;
      if (node.amount <= 0) {
        node.respawn -= delta;
        node.currentScale = THREE.MathUtils.damp(node.currentScale, 0, 10, delta);
        node.root.scale.setScalar(node.currentScale);
        if (node.currentScale < 0.025) node.root.visible = false;
        if (node.respawn <= 0) {
          this.rerollResourceNode(node);
          node.amount = node.capacity;
          node.currentScale = Math.max(0.04, node.baseScale * 0.08);
          node.root.scale.setScalar(node.currentScale);
          node.root.visible = true;
          if (node.world === 2) this.applyWorldTwoMineralAppearance(node);
        }
        return;
      }
      node.pulse = Math.max(0, node.pulse - delta);
      const ratio = node.amount / node.capacity;
      const targetScale = node.baseScale * (0.28 + ratio * 0.72);
      node.currentScale = THREE.MathUtils.damp(node.currentScale, targetScale, 11, delta);
      const bounce = node.pulse > 0 ? 1 + Math.sin(node.pulse * 34) * 0.07 : 1;
      node.root.scale.setScalar(node.currentScale * bounce);
    });
  }

  private advanceWorker(entity: WorkerEntity, speed: number, delta: number): boolean {
    let remaining = speed * delta;
    while (remaining > 0 && entity.routeIndex < entity.route.length) {
      const target = entity.route[entity.routeIndex];
      if (!target) break;
      const dx = target.x - entity.root.position.x;
      const dz = target.z - entity.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= 0.025) {
        entity.root.position.copy(target);
        entity.routeIndex += 1;
        continue;
      }
      entity.root.rotation.y = Math.atan2(dx, dz);
      const step = Math.min(remaining, distance);
      entity.root.position.x += (dx / distance) * step;
      entity.root.position.z += (dz / distance) * step;
      remaining -= step;
      if (step >= distance - 0.001) {
        entity.root.position.copy(target);
        entity.routeIndex += 1;
      }
    }
    return entity.routeIndex >= entity.route.length;
  }

  private updateWorkers(delta: number): void {
    this.workers.forEach((entity) => {
      const state = this.economy.progress.workers.find((worker) => worker.id === entity.id);
      if (!state) return;
      entity.idleSwitchCooldown = Math.max(0, entity.idleSwitchCooldown - delta);
      if (state.task !== entity.task || state.level !== entity.level) this.syncWorker(entity, state, state.task !== entity.task);
      const baseScale = 0.9 + state.level * 0.055;
      if (entity.arrivalTimer > 0) {
        entity.arrivalTimer = Math.max(0, entity.arrivalTimer - delta);
        const progress = 1 - entity.arrivalTimer / WORKER_FEEL.arrivalSeconds;
        const shifted = progress - 1;
        const overshoot = 1 + 2.70158 * shifted ** 3 + 1.70158 * shifted ** 2;
        entity.root.scale.setScalar(baseScale * Math.max(0.04, overshoot));
      } else if (entity.levelUpTimer > 0) {
        entity.levelUpTimer = Math.max(0, entity.levelUpTimer - delta);
        const progress = 1 - entity.levelUpTimer / WORKER_FEEL.levelUpSeconds;
        entity.root.scale.setScalar(baseScale * (1 + Math.sin(progress * Math.PI) * 0.2));
        entity.marker.material.emissive.setHex(RESOURCE_COLORS[state.task]);
        entity.marker.material.emissiveIntensity = Math.sin(progress * Math.PI) * 1.8;
      } else {
        entity.root.scale.setScalar(baseScale);
        entity.marker.material.emissiveIntensity = 0;
      }

      if ((entity.phase === 'toResource' || entity.phase === 'gathering')
        && (!entity.target || entity.target.amount <= 0 || entity.target.kind !== state.task)) {
        entity.target = null;
        const capacity = getWorkerCargoCapacity(state.level, this.economy.progress);
        if (
          entity.cargo > 0
          && (!hasSkill(this.economy.progress, 'full_loads') || entity.cargo >= capacity)
        ) {
          if (!this.routeWorkerToWarehouse(entity)) {
            entity.phase = 'depositing';
            entity.phaseTimer = 0.28;
          }
        } else this.planWorkerCycle(entity, state);
      }

      const travelSpeed = getWorkerTravelSpeed(state.level, this.economy.progress)
        * (this.explorationFlowRemaining > 0 && entity.cargo > 0 ? 2 : 1);
      if (entity.phase === 'toResource') {
        this.playWorkerAction(entity, 'walk');
        if (this.advanceWorker(entity, travelSpeed, delta)) {
          entity.phase = 'gathering';
          entity.phaseTimer = getWorkerGatherSeconds(state.level, this.economy.progress);
          if (entity.target) {
            entity.root.rotation.y = Math.atan2(
              entity.target.root.position.x - entity.root.position.x,
              entity.target.root.position.z - entity.root.position.z,
            );
          }
          this.playWorkerAction(entity, 'act', 0.08);
        }
      } else if (entity.phase === 'gathering') {
        this.playWorkerAction(entity, 'act', 0.08);
        if (entity.target) {
          entity.root.rotation.y = Math.atan2(
            entity.target.root.position.x - entity.root.position.x,
            entity.target.root.position.z - entity.root.position.z,
          );
        }
        entity.phaseTimer -= delta;
        if (entity.phaseTimer <= 0) {
          const target = entity.target;
          if (!target || target.amount <= 0 || target.kind !== state.task) {
            entity.target = null;
            if (entity.cargo > 0 && !this.routeWorkerToWarehouse(entity)) {
              entity.phase = 'depositing';
              entity.phaseTimer = 0.28;
            } else if (entity.cargo <= 0) this.planWorkerCycle(entity, state);
            return;
          }
          const capacity = getWorkerCargoCapacity(state.level, this.economy.progress);
          const free = capacity - entity.cargo;
          const cargoMultiplier = this.industrySurgeRemaining > 0 && target.kind === this.industrySurgeKind ? 2 : 1;
          const requested = Math.min(
            Math.ceil(free / cargoMultiplier),
            getWorkerYield(state.level, this.economy.progress),
          );
          const gathered = this.consumeResourceNode(target, requested, entity.id);
          entity.cargo += Math.min(free, gathered * cargoMultiplier);
          entity.cargoKind = target.kind;
          this.syncWorkerCargoVisuals(entity);
          if (entity.cargo <= 0) {
            entity.target = null;
            this.planWorkerCycle(entity, state);
            return;
          }
          const height = target.kind === 'wood' ? 1.4 : target.kind === 'crystal' ? 1 : 0.7;
          this.spawnParticles(target.root.position.clone().setY(height), target.kind, 5 + state.level * 2);
          // Sans talent, un renard finit le filon qu’il a commencé jusqu’à
          // remplir son propre harnais. Tournées complètes lui permet en plus
          // d’enchaîner un autre filon si le premier s’épuise trop tôt.
          if (entity.cargo < capacity && target.amount > 0) {
            entity.phaseTimer = getWorkerGatherSeconds(state.level, this.economy.progress);
            return;
          }
          if (hasSkill(this.economy.progress, 'full_loads') && entity.cargo < capacity) {
            entity.target = null;
            this.planWorkerCycle(entity, state);
            return;
          }
          const returning = this.planFrom(entity.root.position, entity.hub);
          if (returning) this.applyWorkerRoute(entity, returning, 'toHub');
          else {
            entity.phase = 'depositing';
            entity.phaseTimer = 0.28;
          }
        }
      } else if (entity.phase === 'toHub') {
        this.playWorkerAction(entity, 'walk');
        if (this.advanceWorker(entity, travelSpeed, delta)) {
          entity.phase = 'depositing';
          entity.phaseTimer = entity.cargo > 0 ? 0.04 : WORKER_FEEL.depositPauseSeconds;
          this.playWorkerAction(entity, 'idle', 0.08);
        }
      } else {
        this.playWorkerAction(entity, 'idle');
        entity.phaseTimer -= delta;
        if (entity.cargo > 0 && entity.root.position.distanceToSquared(entity.hub) <= 1.8 * 1.8) {
          if (entity.phaseTimer <= 0) {
            const origin = this.getCargoStackTop(entity.cargoRack);
            const target = entity.depositTarget.clone().setY(0.52);
            entity.cargo -= 1;
            this.spawnCargoDrop(origin, target, entity.cargoKind, () => {
              this.economy.add(entity.cargoKind, getWorkerDepositValue(this.economy.progress));
              this.ui.update(this.economy.progress);
              this.save();
            });
            this.syncWorkerCargoVisuals(entity);
            if (entity.cargo <= 0) {
              this.economy.recordDelivery();
              this.spawnParticles(target.clone().setY(0.7), entity.cargoKind, 4 + state.level * 2);
              this.save();
              entity.phaseTimer = WORKER_FEEL.depositPauseSeconds;
            } else entity.phaseTimer = WORKER_FEEL.depositUnitSeconds;
          }
        } else if (entity.phaseTimer <= 0) {
          if (entity.cargo > 0) {
            if (!this.routeWorkerToWarehouse(entity)) entity.phaseTimer = 0.28;
          } else this.planWorkerCycle(entity, state);
        }
      }
      entity.root.rotation.z = entity.phase === 'gathering'
        ? Math.sin(this.worldTime * 11 + entity.root.id) * 0.06
        : THREE.MathUtils.damp(entity.root.rotation.z, 0, 9, delta);
    });
  }

  private makeWorldTwoRoute(
    start: THREE.Vector3,
    target: THREE.Vector3,
    targetTerraceIndex: number,
    clearance = 0,
  ): THREE.Vector3[] {
    const unlockedMaximum = WORLD_TWO_TERRACES.length - 1;
    const targetIndex = Math.max(0, Math.min(unlockedMaximum, targetTerraceIndex));
    let startIndex = findWorldTwoTerraceIndex(start.x, start.z);
    if (startIndex < 0) {
      startIndex = WORLD_TWO_TERRACES
        .slice(0, unlockedMaximum + 1)
        .map((terrace, index) => ({ index, distance: Math.hypot(start.x - terrace.x, start.z - terrace.z) }))
        .sort((a, b) => a.distance - b.distance)[0]?.index ?? 0;
    }
    const route: THREE.Vector3[] = [];
    const direction = targetIndex >= startIndex ? 1 : -1;
    for (let index = startIndex; index !== targetIndex; index += direction) {
      const next = WORLD_TWO_TERRACES[index + direction];
      if (next) route.push(new THREE.Vector3(next.x, next.elevation, next.z));
    }
    const final = target.clone();
    if (clearance > 0) {
      const terrace = WORLD_TWO_TERRACES[targetIndex]!;
      const away = target.clone().sub(new THREE.Vector3(terrace.x, terrace.elevation, terrace.z)).setY(0);
      if (away.lengthSq() < 0.01) away.set(0, 0, 1);
      final.addScaledVector(away.normalize(), -clearance);
    }
    final.y = WORLD_TWO_TERRACES[targetIndex]?.elevation ?? final.y;
    route.push(final);
    return route;
  }

  private advanceWorldTwoWolf(entity: WorldTwoWolfEntity, speed: number, delta: number): boolean {
    let remaining = speed * delta;
    while (remaining > 0 && entity.routeIndex < entity.route.length) {
      const target = entity.route[entity.routeIndex];
      if (!target) break;
      const dx = target.x - entity.root.position.x;
      const dz = target.z - entity.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= 0.035) {
        entity.root.position.copy(target);
        entity.routeIndex += 1;
        continue;
      }
      entity.root.rotation.y = Math.atan2(dx, dz);
      const step = Math.min(remaining, distance);
      entity.root.position.x += dx / distance * step;
      entity.root.position.z += dz / distance * step;
      const surface = getWorldTwoSurfaceAt(entity.root.position.x, entity.root.position.z);
      if (surface !== null) entity.root.position.y = THREE.MathUtils.damp(entity.root.position.y, surface, 14, delta);
      remaining -= step;
      if (step >= distance - 0.001) {
        entity.root.position.copy(target);
        entity.routeIndex += 1;
      }
    }
    return entity.routeIndex >= entity.route.length;
  }

  private syncWorldTwoWolfCargo(entity: WorldTwoWolfEntity): void {
    this.populateWorldTwoCargoRack(
      entity.cargoRack,
      Array.from({ length: entity.cargo }, () => entity.cargoKind),
      getWorldTwoWolfCapacity(this.economy.progress),
    );
  }

  private updateWorldTwoWolves(delta: number): void {
    const progress = this.economy.progress;
    for (let index = this.worldTwoWolves.length - 1; index >= 0; index -= 1) {
      const entity = this.worldTwoWolves[index];
      if (!entity) continue;
      const state = progress.worldTwoWolves.find((candidate) => candidate.id === entity.id);
      if (!state) {
        entity.root.visible = false;
        this.scene.remove(entity.root);
        this.worldTwoWolves.splice(index, 1);
        continue;
      }
      entity.mixer.update(delta);
      entity.timer -= delta;
      const nearbyEnemy = this.worldTwoEnemies
        .filter((enemy) => enemy.root.visible && enemy.health > 0)
        .sort((a, b) =>
          entity.root.position.distanceToSquared(a.root.position)
          - entity.root.position.distanceToSquared(b.root.position))[0];
      if (
        nearbyEnemy
        && entity.root.position.distanceToSquared(nearbyEnemy.root.position) <= 7.5 * 7.5
        && entity.phase !== 'returning'
        && entity.phase !== 'depositing'
      ) {
        entity.enemy = nearbyEnemy;
        entity.phase = 'combat';
      }

      if (entity.phase === 'combat') {
        const enemy = entity.enemy;
        if (!enemy || !enemy.root.visible || enemy.health <= 0) {
          entity.enemy = null;
          entity.phase = 'seeking';
          continue;
        }
        const distance = entity.root.position.distanceTo(enemy.root.position);
        entity.root.rotation.y = Math.atan2(
          enemy.root.position.x - entity.root.position.x,
          enemy.root.position.z - entity.root.position.z,
        );
        if (distance > 1.45) {
          this.playWorldTwoWolfAction(entity, 'run');
          const direction = enemy.root.position.clone().sub(entity.root.position).setY(0).normalize();
          entity.root.position.addScaledVector(direction, delta * 1.8);
        } else {
          this.playWorldTwoWolfAction(entity, 'act', 0.06);
          if (entity.timer <= 0) {
            entity.timer = hasWorldTwoSkill(progress, 'guard_circle') ? 0.62 : 0.92;
            enemy.health -= 1 + (state.level >= 3 ? 1 : 0);
            this.playWorldTwoEnemyAction(enemy, 'hit', 0.03);
            this.spawnParticles(enemy.root.position.clone().setY(enemy.root.position.y + 0.8), 'copper', 5);
            if (enemy.health <= 0) {
              enemy.deathTimer = 1.35;
              enemy.respawnTimer = 0;
              this.playWorldTwoEnemyAction(enemy, 'death', 0.04);
              this.economy.recordWorldTwoEnemyDefeat();
              this.ui.toast(`${state.name} protège la meute · créature vaincue !`);
              entity.enemy = null;
              entity.phase = 'seeking';
              this.ui.update(progress);
              this.save();
            }
          }
        }
        continue;
      }

      if (entity.phase === 'seeking') {
        this.playWorldTwoWolfAction(entity, 'idle');
        if (entity.timer > 0) continue;
        const capacity = getWorldTwoWolfCapacity(progress);
        if (entity.cargo >= capacity) {
          const depot = this.warehouses.find((warehouse) => warehouse.world === 2);
          if (!depot) continue;
          entity.route = this.makeWorldTwoRoute(
            entity.root.position,
            depot.building.position.clone().add(new THREE.Vector3(1.8, 0, 0)),
            0,
          );
          entity.routeIndex = 0;
          entity.phase = 'returning';
          continue;
        }
        const candidates = this.resources
          .filter((node) =>
            node.world === 2
            && Boolean(node.worldTwoKind)
            && canMineWorldTwoMineral(progress, node.worldTwoKind!, 'wolf')
            && node.amount > 0
            && node.root.visible)
          .sort((a, b) => {
            const valueDifference = getWorldTwoMineral(b.worldTwoKind!).saleValue
              - getWorldTwoMineral(a.worldTwoKind!).saleValue;
            if (valueDifference !== 0) return valueDifference;
            return entity.root.position.distanceToSquared(a.root.position)
              - entity.root.position.distanceToSquared(b.root.position);
          });
        const target = candidates[0];
        if (!target) {
          entity.timer = 1.2;
          continue;
        }
        state.task = target.worldTwoKind ?? 'stone';
        entity.target = target;
        entity.route = this.makeWorldTwoRoute(
          entity.root.position,
          target.root.position,
          target.islandIndex - 5,
          1.15,
        );
        entity.routeIndex = 0;
        entity.phase = 'moving';
        continue;
      }

      if (entity.phase === 'moving') {
        this.playWorldTwoWolfAction(entity, 'run');
        const speed = 2.2 * (hasWorldTwoSkill(progress, 'pack_instinct') ? 1.2 : 1);
        if (this.advanceWorldTwoWolf(entity, speed, delta)) {
          entity.phase = 'gathering';
          entity.timer = 0.72;
        }
        continue;
      }

      if (entity.phase === 'gathering') {
        const target = entity.target;
        if (!target || target.amount <= 0 || !target.root.visible) {
          entity.target = null;
          entity.phase = 'seeking';
          continue;
        }
        this.playWorldTwoWolfAction(entity, 'act', 0.06);
        entity.root.rotation.y = Math.atan2(
          target.root.position.x - entity.root.position.x,
          target.root.position.z - entity.root.position.z,
        );
        if (entity.timer > 0) continue;
        const capacity = getWorldTwoWolfCapacity(progress);
        const free = capacity - entity.cargo;
        const strike = state.level + (hasWorldTwoSkill(progress, 'mountain_tools') ? 1 : 0);
        const gathered = this.consumeResourceNode(target, Math.min(free, strike), entity.id);
        entity.cargo += gathered;
        entity.cargoKind = target.worldTwoKind ?? state.task;
        this.syncWorldTwoWolfCargo(entity);
        this.spawnWorldTwoParticles(
          target.root.position.clone().setY(target.root.position.y + 0.8),
          entity.cargoKind,
          4 + state.level,
        );
        entity.timer = 0.78;
        if (entity.cargo >= capacity) {
          entity.phase = 'seeking';
        } else if (target.amount <= 0) {
          entity.target = null;
          entity.phase = 'seeking';
        }
        continue;
      }

      if (entity.phase === 'returning') {
        this.playWorldTwoWolfAction(entity, 'run');
        const speed = 2.35 * (hasWorldTwoSkill(progress, 'pack_instinct') ? 1.2 : 1);
        if (this.advanceWorldTwoWolf(entity, speed, delta)) {
          entity.phase = 'depositing';
          entity.timer = 0.3;
        }
        continue;
      }

      this.playWorldTwoWolfAction(entity, 'idle');
      if (entity.timer > 0) continue;
      if (entity.cargo > 0) {
        const delivered = entity.cargo + (hasWorldTwoSkill(progress, 'zenith_pack') ? 1 : 0);
        this.economy.addWorldTwo(entity.cargoKind, delivered);
        entity.cargo = 0;
        this.syncWorldTwoWolfCargo(entity);
        this.spawnWorldTwoParticles(
          entity.root.position.clone().setY(entity.root.position.y + 0.7),
          entity.cargoKind,
          7,
        );
        this.ui.update(progress);
        this.save();
      }
      entity.phase = 'seeking';
      entity.timer = 0.5;
    }
  }

  private updateWorldTwoEnemies(delta: number): void {
    const progress = this.economy.progress;
    this.worldTwoEnemies.forEach((enemy, index) => {
      enemy.mixer.update(delta);
      if (enemy.deathTimer > 0) {
        enemy.deathTimer -= delta;
        if (enemy.deathTimer <= 0) {
          enemy.root.visible = false;
          enemy.respawnTimer = 28;
        }
        return;
      }
      if (enemy.respawnTimer > 0) {
        enemy.respawnTimer -= delta;
        if (enemy.respawnTimer <= 0) {
          enemy.health = enemy.maximumHealth;
          enemy.root.visible = true;
          enemy.currentAction = '';
          this.playWorldTwoEnemyAction(enemy, 'idle', 0);
        }
        return;
      }
      if (!enemy.root.visible || enemy.health <= 0) return;
      enemy.attackTimer -= delta;
      const target = this.worldTwoWolves
        .filter((wolf) => progress.worldTwoWolves.some((state) => state.id === wolf.id))
        .sort((a, b) =>
          enemy.root.position.distanceToSquared(a.root.position)
          - enemy.root.position.distanceToSquared(b.root.position))[0];
      if (!target || enemy.root.position.distanceToSquared(target.root.position) > 9 * 9) {
        this.playWorldTwoEnemyAction(enemy, 'idle');
        enemy.root.rotation.y += Math.sin(this.worldTime * 0.6 + index) * delta * 0.12;
        return;
      }
      const distance = enemy.root.position.distanceTo(target.root.position);
      enemy.root.rotation.y = Math.atan2(
        target.root.position.x - enemy.root.position.x,
        target.root.position.z - enemy.root.position.z,
      );
      if (distance > 1.55) {
        this.playWorldTwoEnemyAction(enemy, 'move');
        const direction = target.root.position.clone().sub(enemy.root.position).setY(0).normalize();
        const candidate = enemy.root.position.clone().addScaledVector(direction, delta * 1.28);
        const surface = getWorldTwoSurfaceAt(candidate.x, candidate.z);
        const candidateTerrace = findWorldTwoTerraceIndex(candidate.x, candidate.z);
        if (surface !== null && candidateTerrace === enemy.terraceIndex) {
          enemy.root.position.x = candidate.x;
          enemy.root.position.z = candidate.z;
          enemy.root.position.y = THREE.MathUtils.damp(enemy.root.position.y, surface, 12, delta);
        } else {
          this.playWorldTwoEnemyAction(enemy, 'idle');
        }
        return;
      }
      this.playWorldTwoEnemyAction(enemy, 'act', 0.05);
      if (enemy.attackTimer > 0) return;
      enemy.attackTimer = hasWorldTwoSkill(progress, 'guard_circle') ? 2.2 : 1.15;
      const defeated = this.economy.damageWorldTwoWolf(target.id, 1);
      if (!defeated) this.playWorldTwoWolfAction(target, 'hit', 0.03);
      this.spawnParticles(target.root.position.clone().setY(target.root.position.y + 0.75), 'stone', 6);
      if (defeated) {
        target.root.visible = false;
        this.ui.toast(`${target.id.replace('wolf-', 'Loup ')} est tombé sous l’attaque · recrute un remplaçant à la tanière.`);
        this.feedback.play('power');
        this.ui.update(progress);
        this.save();
      }
    });
  }

  private updateActivePowers(delta: number): void {
    const progress = this.economy.progress;

    if (!progress.industrySurge || !hasSkill(progress, 'endless_engine')) {
      this.industrySurgeRemaining = 0;
      this.industrySurgeCooldown = 2.5;
    } else if (this.industrySurgeRemaining > 0) {
      this.industrySurgeRemaining = Math.max(0, this.industrySurgeRemaining - delta);
      if (this.industrySurgeRemaining <= 0) {
        this.industrySurgeCooldown = 16;
        this.explorationFlowCooldown = Math.max(this.explorationFlowCooldown, 2.5);
      }
    } else if (this.explorationFlowRemaining <= 0) {
      this.industrySurgeCooldown -= delta;
      if (this.industrySurgeCooldown <= 0) {
        this.industrySurgeKind = getPriorityShortage(progress);
        this.industrySurgeRemaining = 10;
        if (progress.powerNotifications) {
          this.ui.toast(`Surcharge tellurique · chaque ${RESOURCE_LABELS[this.industrySurgeKind]} récolté compte double !`);
        }
      }
    }

    if (!progress.explorationFlow || !hasSkill(progress, 'ocean_legacy')) {
      this.explorationFlowRemaining = 0;
      this.explorationFlowCooldown = 4;
    } else if (this.explorationFlowRemaining > 0) {
      this.explorationFlowRemaining = Math.max(0, this.explorationFlowRemaining - delta);
      if (this.explorationFlowRemaining <= 0) {
        this.explorationFlowCooldown = 18;
        this.industrySurgeCooldown = Math.max(this.industrySurgeCooldown, 2.5);
      }
    } else if (this.industrySurgeRemaining <= 0) {
      const transportActive = getPlayerCargoTotal(progress) > 0
        || this.workers.some((worker) => worker.cargo > 0 || worker.phase === 'toHub');
      if (transportActive) this.explorationFlowCooldown -= delta;
      if (transportActive && this.explorationFlowCooldown <= 0) {
        this.explorationFlowRemaining = 10;
        if (progress.powerNotifications) {
          this.ui.toast('Courant de Marée · les cargaisons filent deux fois plus vite !');
        }
      }
    }

    this.industryVfxCooldown -= delta;
    if (this.industrySurgeRemaining > 0 && this.industryVfxCooldown <= 0) {
      this.industryVfxCooldown = 0.28;
      const candidates = this.resources.filter((node) => node.kind === this.industrySurgeKind && node.root.visible);
      const node = candidates[Math.floor(this.worldTime * 3) % Math.max(1, candidates.length)];
      if (node) this.spawnParticles(node.root.position.clone().setY(1.15), this.industrySurgeKind, 3);
    }

    this.ui.setPowerEffects(
      this.industrySurgeRemaining > 0,
      this.industrySurgeKind,
      this.industrySurgeRemaining,
      this.explorationFlowRemaining > 0,
      this.explorationFlowRemaining,
    );
  }

  private updateAutoRegulation(delta: number): void {
    if (!this.economy.progress.autoRegulation || !hasSkill(this.economy.progress, 'auto_regulation')) return;
    this.autoRegulationCooldown -= delta;
    if (this.autoRegulationCooldown > 0) return;
    this.autoRegulationCooldown = getAutoRegulationInterval(this.economy.progress);
    const moves = Array.from({ length: getAutoRegulationMoveCount(this.economy.progress) })
      .map(() => this.economy.autoRegulate())
      .filter((move): move is NonNullable<typeof move> => Boolean(move));
    if (!moves.length) return;
    moves.forEach((move) => {
      const state = this.economy.progress.workers.find((worker) => worker.id === move.workerId);
      const entity = this.workers.find((worker) => worker.id === move.workerId);
      if (state && entity) this.syncWorker(entity, state, true);
    });
    const names = moves.map((move) => this.economy.progress.workers.find((worker) => worker.id === move.workerId)?.name).filter(Boolean);
    if (this.economy.progress.powerNotifications) {
      this.ui.toast(`Auto-régulation · ${names.join(' et ')} rééquilibrent l’équipe.`);
    }
    this.changed();
  }

  private findInteraction(): Interaction | null {
    const position = this.player.position;
    const near = (target: THREE.Vector3, distance: number): boolean => position.distanceToSquared(target) <= distance * distance;
    for (const entity of this.worldPortals) {
      if (
        (this.economy.progress.currentWorld === 1 && entity.destination !== 2)
        || (this.economy.progress.currentWorld === 2 && entity.destination !== 1)
      ) continue;
      if (near(entity.root.position, 2.8)) return { type: 'portal', entity };
    }
    if (this.economy.progress.currentWorld === 2) {
      if (this.worldTwoDen?.root.visible && near(this.worldTwoDen.root.position, 2.55)) {
        return { type: 'worldTwoDen', entity: this.worldTwoDen };
      }
      if (this.worldTwoShrine?.root.visible && near(this.worldTwoShrine.root.position, 2.45)) {
        return { type: 'worldTwoShrine', entity: this.worldTwoShrine };
      }
    }
    for (const entity of this.warehouses) {
      if (entity.world !== this.economy.progress.currentWorld) continue;
      const built = entity.world === 2 || Boolean(this.economy.progress.warehousesBuilt[entity.definition.islandIndex]);
      const target = built ? entity.building : entity.pad;
      if (target.visible && near(target.position, entity.definition.radius + 1.15)) return { type: 'warehouse', entity };
    }
    for (const [kind, entity] of this.structures) {
      const built = structureBuilt(this.economy.progress, kind);
      const target = built ? entity.building : entity.pad;
      if (target.visible && near(target.position, entity.definition.radius + 1.15)) return { type: 'structure', entity };
    }
    for (const entity of this.projects) {
      const hallBuilt = isProjectHallBuilt(this.economy.progress, entity.definition.islandIndex);
      const target = hallBuilt ? entity.building : entity.pad;
      if (
        target.visible
        && near(target.position, entity.definition.radius + 1.15)
      ) return { type: 'projects', entity };
    }
    for (const entity of this.bridges) {
      if (entity.pad.visible && near(entity.pad.position, 2.15)) return { type: 'bridge', entity };
    }
    for (const entity of this.caches) {
      if (entity.root.visible && near(entity.root.position, 2)) return { type: 'cache', entity };
    }
    if (this.economy.progress.bridgesBuilt[3] && !this.economy.progress.completed && near(this.heart.position, 2.5)) return { type: 'heart' };

    let nearest: ResourceNode | null = null;
    let nearestDistance = 2.35 * 2.35;
    this.resources.forEach((node) => {
      if (node.world !== this.economy.progress.currentWorld || !node.root.visible || node.amount <= 0) return;
      const distance = position.distanceToSquared(node.root.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = node;
      }
    });
    return nearest ? { type: 'resource', node: nearest } : null;
  }

  private updateInteractionUI(interaction: Interaction | null): void {
    if (!interaction) {
      this.ui.clearContext();
      return;
    }
    if (interaction.type === 'resource') {
      const label = interaction.node.rarity;
      const worldTwoKind = interaction.node.worldTwoKind;
      const carried = worldTwoKind
        ? getWorldTwoCargoTotal(this.economy.progress)
        : getPlayerCargoTotal(this.economy.progress);
      const capacity = worldTwoKind
        ? getWorldTwoCargoCapacity(this.economy.progress)
        : getCargoCapacity(this.economy.progress);
      if (worldTwoKind && !canMineWorldTwoMineral(this.economy.progress, worldTwoKind)) {
        const mineral = getWorldTwoMineral(worldTwoKind);
        this.ui.setContext(
          `${mineral.name} noir · dureté ${mineral.hardness}`,
          'CROCS TROP TENDRES',
          '⬢',
          false,
          `Crocs ${this.economy.progress.worldTwoFangLevel}/${mineral.hardness} · améliore-les au Sanctuaire de meute.`,
        );
        return;
      }
      this.ui.setContext(
        `${label} · ${interaction.node.amount}/${interaction.node.capacity}`,
        carried >= capacity ? 'DOS PLEIN' : 'RÉCOLTER',
        worldTwoKind ? WORLD_TWO_RESOURCE_ICONS[worldTwoKind] : RESOURCE_ICONS[interaction.node.kind],
        carried < capacity,
        worldTwoKind
          ? `Cargaison ${carried}/${capacity} · valeur ${formatWorldTwoMoney(getWorldTwoCargoValue(this.economy.progress))}.`
          : `Cargaison ${carried}/${capacity} · décharge-la dans un dépôt.`,
      );
      return;
    }
    if (interaction.type === 'worldTwoDen') {
      const cost = getWorldTwoRecruitCost(this.economy.progress);
      const count = this.economy.progress.worldTwoWolves.length;
      const capacity = getWorldTwoWolfCapacity(this.economy.progress);
      this.ui.setContext(
        `Tanière de la meute · ${count}/${capacity} loups`,
        count >= capacity ? 'MEUTE PLEINE' : 'RECRUTER',
        '🐺',
        count < capacity && this.economy.canAffordWorldTwo(cost),
        count < capacity ? formatWorldTwoCost(cost) : 'Le savoir Meute du Zénith augmente la capacité.',
      );
      return;
    }
    if (interaction.type === 'worldTwoShrine') {
      this.ui.setContext(
        `Sanctuaire de meute · ${this.economy.progress.worldTwoSkills.length}/${WORLD_TWO_SKILLS.length} savoirs`,
        'MÉDITER',
        '✺',
        true,
        'Ouvre l’arbre professionnel propre au World 2.',
      );
      return;
    }
    if (interaction.type === 'portal') {
      if (interaction.entity.destination === 1) {
        this.ui.setContext(
          'Portail de retour · World 1',
          'TRAVERSER',
          '◉',
          true,
          'Retourne sur l’Îlot des Marées sans perdre ta cargaison.',
        );
        return;
      }
      const completion = getSkillTreeCompletion(this.economy.progress);
      const unlocked = isWorldTwoUnlocked(this.economy.progress);
      this.ui.setContext(
        unlocked ? 'World 2 · Ascension du Zénith' : 'World 2 · faille temporelle scellée',
        unlocked ? 'TRAVERSER' : 'VERROUILLÉ',
        '◉',
        unlocked,
        `Marées ${Math.min(5, this.economy.progress.rebirths)}/5 · arbre maximisé ${completion.completed}/${completion.total}.`,
      );
      return;
    }
    if (interaction.type === 'warehouse') {
      const { islandIndex, name } = interaction.entity.definition;
      const built = interaction.entity.world === 2 || Boolean(this.economy.progress.warehousesBuilt[islandIndex]);
      if (built) {
        const worldTwoDepot = interaction.entity.world === 2;
        const carried = interaction.entity.world === 2
          ? getWorldTwoCargoTotal(this.economy.progress)
          : getPlayerCargoTotal(this.economy.progress);
        this.ui.setContext(
          worldTwoDepot ? `${name} · comptoir de vente` : `${name} · stock logistique`,
          carried > 0 ? (worldTwoDepot ? 'VENDRE' : 'DÉCHARGER') : 'DÉPÔT VIDE',
          worldTwoDepot ? '◉' : '▣',
          carried > 0,
          worldTwoDepot && carried > 0
            ? `${carried} minerai${carried > 1 ? 's' : ''} · valeur ${formatWorldTwoMoney(getWorldTwoCargoValue(this.economy.progress))}.`
            : carried > 0
            ? carried === 1
              ? '1 unité tombera dans le dépôt avant d’entrer dans le stock.'
              : `${carried} unités tomberont une par une dans le dépôt.`
            : 'Les travailleurs choisissent le dépôt construit le plus proche.',
        );
      } else if (!isWarehouseUnlocked(this.economy.progress, islandIndex)) {
        this.ui.setContext(
          `${name} · verrouillé`,
          `MARÉE ${islandIndex + 1}`,
          '≈',
          false,
          `${islandIndex} Nouvelle${islandIndex > 1 ? 's' : ''} Marée${islandIndex > 1 ? 's' : ''} requise${islandIndex > 1 ? 's' : ''}.`,
        );
      } else {
        const warehouseCost = getWarehouseCost(this.economy.progress, islandIndex);
        if (!warehouseCost) return;
        this.setCostContext(
          `Assembler ${name}`,
          warehouseCost,
          'BÂTIR',
          '▣',
          islandIndex === 0 ? 'Kit de départ gratuit · ton premier stock.' : 'Raccourcit tous les retours de cette île.',
        );
      }
      return;
    }
    if (interaction.type === 'structure') {
      const { kind } = interaction.entity.definition;
      if (!structureBuilt(this.economy.progress, kind)) {
        this.setCostContext(
          STRUCTURE_COPY[kind].built,
          getStructureCost(this.economy.progress, kind),
          'BÂTIR',
          kind === 'camp' ? '⌂' : kind === 'observatory' ? '✦' : '▣',
          kind === 'observatory'
            ? 'Grand chantier de l’île de Cristal · les quatre ressources sont indispensables.'
            : 'Les pièces s’assembleront ici.',
        );
        return;
      }
      if (kind === 'camp') {
        this.ui.setContext(
          `Nurserie centrale · ${this.economy.progress.workers.length}/${getWorkerCapacity(this.economy.progress)} renards`,
          'ENTRER',
          '🦊',
          true,
          'Recruter, voir les niveaux et assigner les métiers.',
        );
      } else if (kind === 'workshop') {
        this.ui.setContext('Atelier des Pins · formation niveau 2', 'ENTRER', '⚒', true, 'Sélectionne et forme chaque renard niveau 1.');
      } else if (kind === 'foundry') {
        this.ui.setContext('Fonderie Cuivrée · formation niveau 3', 'ENTRER', '⚙', true, 'Les renards niveau 2 peuvent devenir maîtres.');
      } else {
        this.ui.setContext('Autel du Savoir · arbre physique', 'MÉDITER', '✦', true, `${this.economy.progress.knowledge} Savoir disponible · lire avant d’acheter.`);
      }
      return;
    }
    if (interaction.type === 'projects') {
      const { islandIndex, name } = interaction.entity.definition;
      const projects = ISLAND_PROJECTS.filter((project) => project.islandIndex === islandIndex);
      const completed = projects.filter((project) => hasProject(this.economy.progress, project.id)).length;
      const hallBuilt = isProjectHallBuilt(this.economy.progress, islandIndex);
      const hallReady = isProjectHallReady(this.economy.progress, islandIndex);
      const unlocked = projects.some((project) => isProjectVisible(this.economy.progress, project));
      const requirement = projects[0]?.requiresStructure;
      if (!hallBuilt) {
        const hallCost = getProjectHallCost(this.economy.progress, islandIndex);
        this.ui.setContext(
          `${name} · fondations`,
          hallReady ? 'BÂTIR' : 'VERROUILLÉ',
          '⌂',
          hallReady && this.economy.canAfford(hallCost),
          hallReady
            ? `${formatCost(hallCost)} · à construire après le bâtiment principal.`
            : requirement
              ? `${STRUCTURE_COPY[requirement].built} avant cette Maison.`
              : 'Le bâtiment principal de l’île est requis.',
        );
        return;
      }
      this.ui.setContext(
        `${name} · ${completed}/3`,
        unlocked ? 'CONSULTER' : 'FERMÉ',
        completed >= 3 ? '✓' : '⌂',
        unlocked,
        unlocked
          ? 'Entre pour choisir, lire puis financer l’un des trois Travaux de cette île.'
          : requirement
            ? `${STRUCTURE_COPY[requirement].built} pour ouvrir cette Maison.`
            : 'Le prochain palier de Travaux est encore verrouillé.',
      );
      return;
    }
    if (interaction.type === 'bridge') {
      const { index, definition } = interaction.entity;
      const cost = getBridgeCost(this.economy.progress, index);
      if (!cost) return;
      const requirementMet = this.economy.bridgeRequirementsMet(index);
      const goal = getIslandGoal(this.economy.progress, definition.fromIsland);
      const done = goal.items.filter((item) => item.done).length;
      const nextMissing = goal.items.find((item) => !item.done)?.label;
      this.ui.setContext(
        `${definition.name} · objectifs ${done}/${goal.items.length}`,
        'OUVRIR',
        '═',
        requirementMet && this.economy.canAfford(cost),
        requirementMet
          ? `Passage prêt · ${formatCost(cost)}`
          : `${nextMissing ?? formatBridgeRequirement(this.economy.progress, index)} · coût ${formatCost(cost)}`,
      );
      return;
    }
    if (interaction.type === 'cache') {
      this.ui.setContext(`Cache d’exploration · +${formatCost(interaction.entity.definition.reward)}`, 'OUVRIR', '✦');
      return;
    }
    const projectsReady = getCompletedProjectCount(this.economy.progress) >= 12;
    const ready = Economy.finalRequirementsMet(this.economy.progress) && projectsReady;
    const finalCost = getFinalCost(this.economy.progress);
    this.ui.setContext(
      ready ? 'Éveiller le Cœur de l’Archipel' : 'Cœur scellé · objectif final incomplet',
      'ÉVEILLER',
      '✦',
      ready && this.economy.canAfford(finalCost),
      ready ? `Offrande · ${formatCost(finalCost)}` : `${getCompletedProjectCount(this.economy.progress)}/12 travaux · 8 renards · 4 métiers · 12 niveaux`,
    );
  }

  private setCostContext(title: string, cost: Cost, label: string, icon: string, detail = ''): void {
    this.ui.setContext(title, label, icon, this.economy.canAfford(cost), `${formatCost(cost)}${detail ? ` · ${detail}` : ''}`);
  }

  private handleAction(delta: number): void {
    this.harvestCooldown = Math.max(0, this.harvestCooldown - delta);
    const justPressed = this.input.consumeActionPress();
    if (!this.interaction) return;
    if (this.interaction.type === 'resource') {
      if ((justPressed || this.input.actionDown) && this.harvestCooldown <= 0) {
        this.harvestCooldown = 0.42;
        this.harvest(this.interaction.node);
      }
      if (this.input.actionDown) this.playPlayerAction('act', 0.06);
      return;
    }
    if (!justPressed) return;

    if (this.interaction.type === 'portal') {
      const destination = this.interaction.entity.destination;
      if (destination === 2 && !isWorldTwoUnlocked(this.economy.progress)) {
        const completion = getSkillTreeCompletion(this.economy.progress);
        this.ui.toast(`World 2 verrouillé · Marées ${Math.min(5, this.economy.progress.rebirths)}/5 · Savoirs ${completion.completed}/${completion.total}.`);
        return;
      }
      this.travelToWorld(destination);
      return;
    }

    if (this.interaction.type === 'worldTwoDen') {
      const worker = this.economy.hireWorldTwoWolf();
      if (worker) {
        this.spawnWorldTwoWolf(worker, true);
        this.feedback.play('build');
        this.ui.toast(`${worker.name} rejoint la meute et part chercher du ${WORLD_TWO_RESOURCE_LABELS[worker.task]}.`);
        this.changed();
      } else if (this.economy.progress.worldTwoWolves.length >= getWorldTwoWolfCapacity(this.economy.progress)) {
        this.ui.toast('Meute pleine · le dernier savoir du Zénith ajoute deux places.');
      } else {
        this.ui.toast(`Il manque ${formatWorldTwoCost(this.economy.missingWorldTwo(getWorldTwoRecruitCost(this.economy.progress)))}.`);
      }
      return;
    }

    if (this.interaction.type === 'worldTwoShrine') {
      this.ui.showWorldTwoSkills();
      return;
    }

    if (this.interaction.type === 'warehouse') {
      const entity = this.interaction.entity;
      const islandIndex = entity.definition.islandIndex;
      if (entity.world === 2 || this.economy.progress.warehousesBuilt[islandIndex]) {
        const cargoTotal = entity.world === 2
          ? getWorldTwoCargoTotal(this.economy.progress)
          : getPlayerCargoTotal(this.economy.progress);
        if (cargoTotal <= 0) {
          this.ui.toast('Ton dos est vide · rapporte une cargaison récoltée.');
          return;
        }
        this.playerDeposit = { warehouse: entity, timer: 0.04 };
        this.feedback.play('deposit');
        this.input.release();
        this.ui.toast(entity.world === 2
          ? `Vente en cours · valeur totale ${formatWorldTwoMoney(getWorldTwoCargoValue(this.economy.progress))}.`
          : 'Déchargement · chaque unité rejoint maintenant le stock.');
        return;
      }
      const warehouseCost = getWarehouseCost(this.economy.progress, islandIndex);
      if (!isWarehouseUnlocked(this.economy.progress, islandIndex)) {
        this.ui.toast(`Dépôt verrouillé · atteins la Marée ${islandIndex + 1}.`);
      } else if (this.economy.buildWarehouse(islandIndex)) {
        entity.building.visible = true;
        this.startBuildingAssembly(entity.building);
        this.spawnParticles(entity.building.position.clone().setY(1), 'wood', 22);
        this.ui.toast(`${entity.definition.name} assemblé · les cargaisons ont une vraie destination.`);
        this.feedback.play('build');
        this.changed();
        if (islandIndex === 0) {
          this.maybeShowTutorial(
            'warehouse-central',
            'Ton dépôt central',
            'Tout ce que tu récoltes reste visible sur ton dos. Reviens ici et touche DÉCHARGER : les unités tomberont une à une et seulement alors le stock augmentera.',
            '▣',
          );
        } else {
          this.maybeShowTutorial(
            `warehouse-${islandIndex}`,
            'Un trajet raccourci',
            `Le dépôt de ${entity.definition.name.replace('Dépôt ', '')} devient la destination locale. Les renards de cette île n’ont plus besoin de revenir jusqu’au centre.`,
            '⇢',
          );
        }
      } else if (warehouseCost) this.showMissing(warehouseCost);
      return;
    }

    if (this.interaction.type === 'structure') {
      const { kind } = this.interaction.entity.definition;
      if (structureBuilt(this.economy.progress, kind)) {
        if (kind === 'camp') this.ui.showCrew('nursery');
        else if (kind === 'workshop') this.ui.showCrew('workshop');
        else if (kind === 'foundry') this.ui.showCrew('foundry');
        else this.ui.showTalents();
        return;
      }
      if (this.economy.buildStructure(kind)) {
        this.interaction.entity.building.visible = true;
        this.startBuildingAssembly(this.interaction.entity.building);
        this.ui.toast(`${STRUCTURE_COPY[kind].toast} · +1 Savoir`);
        this.feedback.play('build');
        const buildOrigin = this.interaction.entity.building.getWorldPosition(new THREE.Vector3());
        this.spawnParticles(buildOrigin.setY(1.2), kind === 'foundry' ? 'copper' : kind === 'observatory' ? 'crystal' : 'wood', 20);
        this.changed();
        if (kind === 'camp') {
          this.maybeShowTutorial(
            'nursery',
            'La nurserie',
            'Entre dans ce bâtiment pour recruter tes renards, voir leur niveau et changer leur métier. Les améliorations se feront plus tard dans des bâtiments spécialisés.',
            '🦊',
          );
        } else if (kind === 'workshop') {
          this.maybeShowTutorial(
            'workshop',
            'Formation niveau 2',
            'L’Atelier des Pins est le seul endroit où un renard niveau 1 peut passer niveau 2. Choisis-le dans la liste, puis confirme sa formation.',
            '⚒',
          );
        } else if (kind === 'foundry') {
          this.maybeShowTutorial(
            'foundry',
            'Maîtrise niveau 3',
            'La Fonderie Cuivrée forme uniquement les renards déjà niveau 2. Elle déverrouille aussi le métier du cuivre dans la nurserie.',
            '⚙',
          );
        } else {
          this.maybeShowTutorial(
            'observatory',
            'L’Autel du Savoir',
            'Tu as réuni les quatre ressources sur l’île de Cristal. Touche un hexagone pour lire son pouvoir : il faut ensuite confirmer tout achat dans la grande fiche.',
            '✦',
          );
        }
      } else this.showMissing(getStructureCost(this.economy.progress, kind));
      return;
    }
    if (this.interaction.type === 'projects') {
      const entity = this.interaction.entity;
      const { islandIndex } = entity.definition;
      if (!isProjectHallBuilt(this.economy.progress, islandIndex)) {
        const hallCost = getProjectHallCost(this.economy.progress, islandIndex);
        if (this.economy.buildProjectHall(islandIndex)) {
          entity.building.visible = true;
          entity.pad.visible = false;
          this.startBuildingAssembly(entity.building);
          this.spawnParticles(entity.building.position.clone().setY(1.1), islandIndex >= 3 ? 'crystal' : islandIndex === 2 ? 'copper' : 'wood', 22);
          this.ui.toast(`${entity.definition.name} construite · ses trois Travaux sont maintenant consultables.`);
          this.feedback.play('build');
          this.changed();
        } else if (!isProjectHallReady(this.economy.progress, islandIndex)) {
          this.ui.toast('Construis d’abord le bâtiment principal de cette île.');
        } else this.showMissing(hallCost);
        return;
      }
      const projects = ISLAND_PROJECTS.filter((project) => project.islandIndex === islandIndex);
      if (projects.some((project) => isProjectVisible(this.economy.progress, project))) {
        this.ui.showProjects(islandIndex);
      } else {
        const requirement = projects[0]?.requiresStructure;
        this.ui.toast(requirement
          ? `${STRUCTURE_COPY[requirement].built} avant de consulter les Travaux.`
          : 'Cette Maison des Travaux est encore fermée.');
      }
      return;
    }
    if (this.interaction.type === 'bridge') {
      const { index, root, definition } = this.interaction.entity;
      const bridgeCost = getBridgeCost(this.economy.progress, index);
      if (!bridgeCost) return;
      if (this.economy.buildBridge(index)) {
        root.visible = true;
        root.userData.growingBridge = true;
        root.userData.bridgeBuildElapsed = 0;
        root.children.forEach((child) => {
          if (typeof child.userData.bridgePlank !== 'number') return;
          const baseScale = child.userData.bridgeBaseScale as THREE.Vector3 | undefined;
          if (baseScale) child.scale.copy(baseScale).multiplyScalar(0.03);
          else child.scale.setScalar(0.03);
        });
        this.revealIsland(definition.toIsland);
        this.ui.toast(`${definition.name} terminé · nouvelle île · +1 Savoir`);
        this.spawnParticles(this.interaction.entity.start.clone().lerp(this.interaction.entity.end, 0.5).setY(0.7), index >= 2 ? 'crystal' : 'stone', 26);
        this.changed();
        this.feedback.play('build');
        if (index === 0) {
          this.maybeShowTutorial(
            'pins-logistics',
            'Le prochain dépôt est verrouillé',
            'Pendant cette première Marée, les renards des îles lointaines reviendront au dépôt central. Termine l’acte et relance une Marée pour construire le dépôt des Pins.',
            '≈',
          );
        }
      } else if (!this.economy.bridgeRequirementsMet(index)) {
        this.ui.toast(formatBridgeRequirement(this.economy.progress, index));
      } else this.showMissing(bridgeCost);
      return;
    }
    if (this.interaction.type === 'cache') {
      const { definition, root } = this.interaction.entity;
      const reward = getCacheReward(this.economy.progress, definition.reward);
      if (this.economy.findCache(definition.id, definition.reward)) {
        root.visible = false;
        this.ui.toast(`Cache découverte · +${formatCost(reward)}`);
        this.spawnParticles(root.position.clone().setY(0.8), definition.reward.crystal ? 'crystal' : definition.reward.copper ? 'copper' : 'wood', 14);
        this.changed();
      }
      return;
    }
    if (this.interaction.type === 'heart') {
      if (this.economy.complete()) {
        this.feedback.play('victory');
        this.activateHeart(true);
        this.ui.update(this.economy.progress);
        this.save();
        this.active = false;
        this.input.release();
        this.input.enabled = false;
        this.victoryShown = true;
        window.setTimeout(() => this.ui.showVictory(this.economy.progress), 700);
      } else if (!Economy.finalRequirementsMet(this.economy.progress)) {
        this.ui.toast('Il faut 8 travailleurs, les 4 métiers et 12 niveaux cumulés.');
      } else this.showMissing(getFinalCost(this.economy.progress));
    }
  }

  private harvest(node: ResourceNode): void {
    if (node.amount <= 0) return;
    if (
      node.worldTwoKind
      && !canMineWorldTwoMineral(this.economy.progress, node.worldTwoKind)
    ) {
      const mineral = getWorldTwoMineral(node.worldTwoKind);
      this.ui.toast(`${mineral.name} trop dur · crocs ${this.economy.progress.worldTwoFangLevel}/${mineral.hardness}.`);
      return;
    }
    const isWorldTwoResource = Boolean(node.worldTwoKind);
    const free = isWorldTwoResource
      ? getWorldTwoCargoCapacity(this.economy.progress) - getWorldTwoCargoTotal(this.economy.progress)
      : getCargoCapacity(this.economy.progress) - getPlayerCargoTotal(this.economy.progress);
    if (free <= 0) {
      this.ui.toast('Dos plein · retourne à un dépôt pour décharger.');
      return;
    }
    const cargoMultiplier = !isWorldTwoResource && this.industrySurgeRemaining > 0 && node.kind === this.industrySurgeKind ? 2 : 1;
    const requested = Math.min(
      Math.ceil(free / cargoMultiplier),
      isWorldTwoResource
        ? 1 + (hasWorldTwoSkill(this.economy.progress, 'mountain_tools') ? 1 : 0)
        : getManualYield(this.economy.progress, node.kind),
    );
    const gathered = this.consumeResourceNode(node, requested);
    const carried = node.worldTwoKind
      ? this.economy.carryWorldTwoForPlayer(node.worldTwoKind, gathered)
      : this.economy.carryForPlayer(node.kind, gathered * cargoMultiplier);
    if (carried <= 0) return;
    this.feedback.play('harvest');
    this.syncPlayerCargoVisuals();
    const height = node.worldTwoKind
      ? node.root.position.y + 0.78
      : node.kind === 'wood' ? 1.4 : node.kind === 'crystal' ? 1 : 0.7;
    if (node.worldTwoKind) {
      this.spawnWorldTwoParticles(node.root.position.clone().setY(height), node.worldTwoKind, 7);
    } else this.spawnParticles(node.root.position.clone().setY(height), node.kind, 7);
    if (node.amount <= 0) {
      node.respawn = node.respawnSeconds * (
        node.worldTwoKind
          ? hasWorldTwoSkill(this.economy.progress, 'deep_veins') ? 0.7 : 1
          : getRespawnMultiplier(this.economy.progress)
      );
      this.ui.toast(node.worldTwoKind
        ? `${WORLD_TWO_RESOURCE_LABELS[node.worldTwoKind]} épuisé · le filon se reforme`
        : node.kind === 'wood'
          ? 'Arbre épuisé · il repousse bientôt'
          : `${RESOURCE_LABELS[node.kind]} épuisé · le filon se reforme`);
    }
    this.ui.update(this.economy.progress);
    this.save();
  }

  private consumeResourceNode(node: ResourceNode, requested: number, workerId?: string): number {
    if (node.amount <= 0 || requested <= 0) return 0;
    const gathered = Math.min(node.amount, Math.max(1, Math.floor(requested)));
    node.amount -= gathered;
    node.pulse = 0.22;
    this.lastHarvestedNode = node;
    if (node.amount <= 0) {
      node.respawn = node.respawnSeconds * (
        node.worldTwoKind
          ? hasWorldTwoSkill(this.economy.progress, 'deep_veins') ? 0.7 : 1
          : getRespawnMultiplier(this.economy.progress)
      );
    }
    if (workerId) {
      this.lastWorkerHarvest = {
        workerId,
        nodeId: node.id,
        kind: node.kind,
        gathered,
        remaining: node.amount,
        island: node.islandIndex,
      };
    }
    return gathered;
  }

  private createCargoPiece(kind: ResourceKind, index = 0): THREE.Object3D {
    let material = this.cargoMaterials.get(kind);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: RESOURCE_COLORS[kind],
        roughness: kind === 'crystal' ? 0.28 : 0.72,
        metalness: kind === 'copper' ? 0.28 : 0.04,
        emissive: kind === 'crystal' ? 0x444070 : 0x000000,
        emissiveIntensity: kind === 'crystal' ? 0.55 : 0,
        flatShading: true,
      });
      this.cargoMaterials.set(kind, material);
    }
    let geometry = this.cargoGeometries.get(kind);
    if (!geometry) {
      geometry = kind === 'wood'
        ? new THREE.CylinderGeometry(0.09, 0.1, 0.42, 7)
        : kind === 'stone'
          ? new THREE.DodecahedronGeometry(0.17, 0)
          : kind === 'copper'
            ? new THREE.DodecahedronGeometry(0.165, 0)
            : new THREE.OctahedronGeometry(0.16);
      this.cargoGeometries.set(kind, geometry);
    }
    const piece = new THREE.Mesh(geometry, material);
    if (kind === 'wood') {
      piece.rotation.z = Math.PI / 2;
    } else if (kind === 'copper') {
      piece.scale.y = 0.82;
    } else if (kind === 'crystal') {
      piece.scale.y = 1.3;
    }
    piece.rotation.y = kind === 'wood' ? 0 : index * 1.17;
    piece.castShadow = true;
    piece.userData.cargoPiece = true;
    piece.userData.cargoKind = kind;
    return piece;
  }

  private createWorldTwoCargoPiece(kind: WorldTwoMineralId, index = 0): THREE.Group {
    let template = this.worldTwoCargoTemplates.get(kind);
    if (!template) {
      const mineral = getWorldTwoMineral(kind);
      const model = this.assets.createWorldTwoAsset(mineral.visualKind, 0.25);
      const mineralColor = new THREE.Color(mineral.color);
      const luminance = mineralColor.r * 0.2126 + mineralColor.g * 0.7152 + mineralColor.b * 0.0722;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const materials = sourceMaterials.map((source) => {
          const material = source.clone();
          if (material instanceof THREE.MeshStandardMaterial) {
            material.color.copy(mineralColor);
            material.roughness = mineral.visualKind === 'coal' ? 0.82 : 0.5;
            material.metalness = mineral.visualKind === 'coal'
              ? 0.08
              : THREE.MathUtils.clamp(0.22 + mineral.hardness / 90, 0.22, 0.58);
            material.emissive.copy(mineralColor);
            material.emissiveIntensity = luminance < 0.18 ? 0.38 : 0.12;
          }
          return material;
        });
        object.material = Array.isArray(object.material) ? materials : materials[0]!;
      });
      template = new THREE.Group();
      template.name = `cargaison-world-2:${kind}`;
      template.userData.worldTwoCargoPiece = true;
      template.userData.worldTwoCargoKind = kind;
      // Le modèle reste enfant du support : sa normalisation verticale n’est
      // pas écrasée lorsque la pièce est placée sur le dos.
      template.add(model);
      this.worldTwoCargoTemplates.set(kind, template);
    }
    const piece = template.clone(true);
    piece.name = `cargaison-world-2:${kind}:${index + 1}`;
    piece.userData.worldTwoCargoPiece = true;
    piece.userData.worldTwoCargoKind = kind;
    piece.rotation.y = index * 1.047;
    return piece;
  }

  private clearCargoRack(rack: THREE.Group): void {
    rack.clear();
  }

  private populateCargoRack(
    rack: THREE.Group,
    kinds: readonly ResourceKind[],
    capacity = getCargoCapacity(this.economy.progress),
  ): void {
    this.clearCargoRack(rack);
    kinds.slice(0, capacity).forEach((kind, index) => {
      const piece = this.createCargoPiece(kind, index);
      // Deux colonnes compactes : la première couche repose bien au-dessus du
      // dos et les grandes capacités restent lisibles sans former une tour.
      const position = getCargoPiecePosition(index);
      const sway = Math.sign(position.x);
      piece.position.set(position.x, position.y, position.z);
      if (kind !== 'wood') {
        piece.rotation.x += sway * 0.045;
        piece.rotation.y += index % 2 === 0 ? 0 : Math.PI / 2;
      }
      rack.add(piece);
    });
  }

  private populateWorldTwoCargoRack(
    rack: THREE.Group,
    kinds: readonly WorldTwoMineralId[],
    capacity = getWorldTwoCargoCapacity(this.economy.progress),
  ): void {
    this.clearCargoRack(rack);
    kinds.slice(0, capacity).forEach((kind, index) => {
      const piece = this.createWorldTwoCargoPiece(kind, index);
      const position = getCargoPiecePosition(index);
      piece.position.set(position.x, position.y, position.z);
      piece.rotation.x = (index % 2 === 0 ? -1 : 1) * 0.04;
      rack.add(piece);
    });
  }

  private syncPlayerCargoVisuals(): void {
    if (this.economy.progress.currentWorld === 2) {
      const kinds: WorldTwoMineralId[] = [];
      WORLD_TWO_RESOURCE_KINDS.forEach((kind) => {
        for (let index = 0; index < (this.economy.progress.worldTwoCargo[kind] ?? 0); index += 1) {
          kinds.push(kind);
        }
      });
      const capacity = getWorldTwoCargoCapacity(this.economy.progress);
      this.populateWorldTwoCargoRack(this.playerCargoRack, kinds, capacity);
      this.ui.updateCargo(getWorldTwoCargoTotal(this.economy.progress), capacity);
      return;
    }
    const kinds: ResourceKind[] = [];
    RESOURCE_KINDS.forEach((kind) => {
      for (let index = 0; index < this.economy.progress.playerCargo[kind]; index += 1) kinds.push(kind);
    });
    this.populateCargoRack(this.playerCargoRack, kinds);
    this.ui.updateCargo(getPlayerCargoTotal(this.economy.progress), getCargoCapacity(this.economy.progress));
  }

  private syncWorkerCargoVisuals(entity: WorkerEntity): void {
    const state = this.economy.progress.workers.find((worker) => worker.id === entity.id);
    const capacity = state
      ? getWorkerCargoCapacity(state.level, this.economy.progress)
      : getCargoCapacity(this.economy.progress);
    this.populateCargoRack(
      entity.cargoRack,
      Array.from({ length: Math.min(capacity, entity.cargo) }, () => entity.cargoKind),
      capacity,
    );
  }

  private getCargoStackTop(rack: THREE.Group): THREE.Vector3 {
    const topPiece = rack.children[rack.children.length - 1];
    return topPiece
      ? topPiece.getWorldPosition(new THREE.Vector3())
      : rack.getWorldPosition(new THREE.Vector3());
  }

  private spawnCargoDrop(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    kind: ResourceKind,
    onLand?: () => void,
  ): void {
    const mesh = this.createCargoPiece(kind, this.cargoDrops.length);
    mesh.position.copy(origin);
    mesh.scale.setScalar(1.35);
    this.scene.add(mesh);
    this.cargoDrops.push({
      mesh,
      start: origin.clone(),
      target: target.clone(),
      elapsed: 0,
      duration: 0.42,
      onLand,
    });
  }

  private spawnWorldTwoCargoDrop(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    kind: WorldTwoMineralId,
    onLand?: () => void,
  ): void {
    const mesh = this.createWorldTwoCargoPiece(kind, this.cargoDrops.length);
    mesh.position.copy(origin);
    mesh.scale.setScalar(1.35);
    this.scene.add(mesh);
    this.cargoDrops.push({
      mesh,
      start: origin.clone(),
      target: target.clone(),
      elapsed: 0,
      duration: 0.42,
      onLand,
    });
  }

  private updateCargoDrops(delta: number): void {
    for (let index = this.cargoDrops.length - 1; index >= 0; index -= 1) {
      const drop = this.cargoDrops[index];
      if (!drop) continue;
      drop.elapsed += delta;
      const ratio = THREE.MathUtils.clamp(drop.elapsed / drop.duration, 0, 1);
      const eased = 1 - Math.pow(1 - ratio, 2);
      drop.mesh.position.lerpVectors(drop.start, drop.target, eased);
      drop.mesh.position.y += Math.sin(ratio * Math.PI) * 0.52;
      drop.mesh.rotation.x += delta * 9;
      drop.mesh.rotation.y += delta * 7;
      drop.mesh.scale.setScalar(1.35 * Math.max(0.08, 1 - ratio * 0.68));
      if (ratio < 1) continue;
      this.scene.remove(drop.mesh);
      // Les cargaisons clonées partagent les géométries et matériaux mis en
      // cache. Les détruire ici faisait disparaître les pièces suivantes.
      drop.onLand?.();
      this.cargoDrops.splice(index, 1);
    }
  }

  private updatePlayerDeposit(delta: number): void {
    const deposit = this.playerDeposit;
    if (!deposit) return;
    deposit.timer -= delta;
    if (deposit.timer > 0) return;
    if (deposit.warehouse.world === 2) {
      const worldTwoKind = WORLD_TWO_RESOURCE_KINDS.find(
        (candidate) => (this.economy.progress.worldTwoCargo[candidate] ?? 0) > 0,
      );
      if (!worldTwoKind) {
        this.playerDeposit = null;
        this.ui.toast(`Vente terminée · fortune ${formatWorldTwoMoney(this.economy.progress.worldTwoMoney)}.`);
        this.ui.update(this.economy.progress);
        this.save();
        return;
      }
      const origin = this.getCargoStackTop(this.playerCargoRack);
      const target = vec(deposit.warehouse.definition.x, deposit.warehouse.definition.z + 1.05).setY(0.42);
      if (this.economy.unloadWorldTwoCargo(worldTwoKind, 1) > 0) {
        this.spawnWorldTwoCargoDrop(origin, target, worldTwoKind, () => {
          this.economy.addWorldTwo(worldTwoKind, 1);
          this.ui.update(this.economy.progress);
          this.save();
        });
        this.syncPlayerCargoVisuals();
        this.ui.update(this.economy.progress);
      }
      deposit.timer = WORKER_FEEL.depositUnitSeconds;
      return;
    }
    const kind = RESOURCE_KINDS.find((candidate) => this.economy.progress.playerCargo[candidate] > 0);
    if (!kind) {
      this.playerDeposit = null;
      this.economy.recordDelivery();
      this.ui.toast('Cargaison rangée · le stock est maintenant disponible.');
      this.ui.update(this.economy.progress);
      this.save();
      return;
    }
    const origin = this.getCargoStackTop(this.playerCargoRack);
    const target = vec(deposit.warehouse.definition.x, deposit.warehouse.definition.z + 1.05).setY(0.42);
    if (this.economy.unloadPlayerCargo(kind, 1) > 0) {
      this.spawnCargoDrop(origin, target, kind, () => {
        this.economy.add(kind, 1);
        this.ui.update(this.economy.progress);
        this.save();
      });
      this.syncPlayerCargoVisuals();
      this.ui.update(this.economy.progress);
    }
    deposit.timer = WORKER_FEEL.depositUnitSeconds;
  }

  private showMissing(cost: Cost): void {
    const missing = this.economy.missing(cost);
    const text = formatCost(missing);
    if (text !== 'gratuit') this.ui.toast(`Il manque ${text}`);
  }

  private travelToWorld(destination: 1 | 2): void {
    if (
      this.worldTravelAnimation
      || this.economy.progress.currentWorld === destination
      || !this.worldTravelCurve
    ) return;
    this.playerDeposit = null;
    this.input.release();
    this.input.enabled = false;
    const base = WORLD_TWO_TERRACES[0]!;
    const target = destination === 2
      ? new THREE.Vector3(base.x, base.elevation, base.z + 1.3)
      : new THREE.Vector3(-4.8, 0, 7.2);
    this.worldTravelAnimation = {
      destination,
      elapsed: 0,
      startedAt: performance.now(),
      duration: 4.6,
      source: this.player.position.clone(),
      target,
      cameraStart: this.camera.position.clone(),
      switched: false,
      progress: destination === 2 ? 0 : 1,
    };
    this.worldTravelCauseway.visible = true;
    this.playPlayerAction('walk', 0.08);
    document.documentElement.classList.add('world-travel');
    this.ui.toast(destination === 2
      ? 'Traversée temporelle · le sentier s’ouvre dans la montagne…'
      : 'Traversée temporelle · le chemin redescend vers l’archipel…');
    this.interaction = null;
    this.ui.clearContext();
  }

  private updateWorldTravel(delta: number): void {
    const travel = this.worldTravelAnimation;
    if (!travel) return;
    travel.elapsed = Math.max(travel.elapsed + delta, (performance.now() - travel.startedAt) / 1000);
    const ratio = THREE.MathUtils.clamp(travel.elapsed / travel.duration, 0, 1);
    const eased = ratio < 0.5
      ? 4 * ratio ** 3
      : 1 - Math.pow(-2 * ratio + 2, 3) / 2;
    const curve = this.worldTravelCurve;
    if (!curve) return;
    const curveProgress = travel.destination === 2 ? eased : 1 - eased;
    travel.progress = curveProgress;
    const pathPosition = curve.getPoint(curveProgress);
    const departureBlend = THREE.MathUtils.smootherstep(
      THREE.MathUtils.clamp(ratio / 0.1, 0, 1),
      0,
      1,
    );
    const previous = this.player.position.clone();
    this.player.position.copy(travel.source.clone().lerp(pathPosition, departureBlend));
    const movement = this.player.position.clone().sub(previous).setY(0);
    if (movement.lengthSq() > 0.001) this.player.rotation.y = Math.atan2(movement.x, movement.z);
    this.player.rotation.z = 0;

    const switchThreshold = travel.destination === 2 ? 0.9 : 0.1;
    if (!travel.switched && ratio >= switchThreshold) {
      travel.switched = true;
      this.economy.progress.currentWorld = travel.destination;
      if (travel.destination === 2) {
        this.industrySurgeRemaining = 0;
        this.explorationFlowRemaining = 0;
        this.ui.setPowerEffects(false, this.industrySurgeKind, 0, false, 0);
      }
      this.applyWorldPalette(travel.destination);
      this.syncPlayerCargoVisuals();
      this.ui.update(this.economy.progress);
    }
    if (ratio < 1) return;

    this.player.position.copy(travel.target);
    this.player.rotation.z = 0;
    this.worldTravelCauseway.visible = false;
    this.worldTravelAnimation = null;
    document.documentElement.classList.remove('world-travel');
    this.input.enabled = !this.managementOpen;
    this.playPlayerAction('idle', 0.08);
    this.spawnParticles(this.player.position.clone().setY(this.player.position.y + 1), 'crystal', 32);
    if (travel.destination === 2) {
      this.ui.toast('World 2 · la montagne du Zénith est vivante.');
      this.maybeShowTutorial(
        'world-2',
        'World 2 · Montagne du Zénith',
        'Toute la montagne est ouverte. Les filons noirs sont trop durs pour tes crocs : vends la pierre au Refuge, renforce tes crocs au Sanctuaire, puis recrute une meute capable de défendre ses cargaisons.',
        '▲',
      );
    } else {
      this.ui.toast('Retour sur l’Îlot des Marées · le World 1 reprend maintenant.');
    }
    this.refreshWorldTwoLocks();
    this.ui.update(this.economy.progress);
    this.save();
  }

  private changed(): void {
    this.refreshWorldLocks();
    this.ui.update(this.economy.progress);
    this.save();
  }

  private activateHeart(withBurst: boolean): void {
    this.heartLight.intensity = 24;
    const material = this.heartCore.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 4.5;
    if (withBurst) this.spawnParticles(this.heart.position.clone().setY(4.6), 'crystal', 42);
  }

  private spawnParticles(origin: THREE.Vector3, kind: ResourceKind, count: number): void {
    this.spawnColoredParticles(origin, RESOURCE_COLORS[kind], count);
  }

  private spawnWorldTwoParticles(
    origin: THREE.Vector3,
    kind: WorldTwoMineralId,
    count: number,
  ): void {
    this.spawnColoredParticles(origin, getWorldTwoMineral(kind).color, count);
  }

  private spawnColoredParticles(origin: THREE.Vector3, color: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const geometry = index % 2 ? new THREE.TetrahedronGeometry(0.09) : new THREE.BoxGeometry(0.11, 0.11, 0.11);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
      mesh.position.copy(origin);
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.8 + Math.random() * 2.1;
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, 1.2 + Math.random() * 2.2, Math.sin(angle) * speed);
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life: 0.65 + Math.random() * 0.45 });
    }
  }

  private updateParticles(delta: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (!particle) continue;
      particle.life -= delta;
      particle.velocity.y -= delta * 5;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.x += delta * 7;
      particle.mesh.rotation.y += delta * 5;
      particle.mesh.scale.setScalar(Math.max(0.01, Math.min(1, particle.life * 2)));
      if (particle.life > 0) continue;
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
      this.particles.splice(index, 1);
    }
  }

  private updateAmbient(delta: number): void {
    this.updateIslandEmergence(delta);
    this.scene.traverseVisible((object) => {
      if (object.userData.floatMarker) {
        object.position.y = 0.75 + Math.sin(this.worldTime * 2.8 + object.id) * 0.12;
        object.rotation.y += delta * 0.8;
      }
      if (object.userData.ripple) {
        const phase = Number(object.userData.phase) || 0;
        const scale = 0.92 + Math.sin(this.worldTime * 0.7 + phase) * 0.08;
        object.scale.setScalar(scale);
      }
      if (object.userData.heartRing) object.rotation.z += delta * (this.economy.progress.completed ? 1.5 : 0.25);
      if (object.userData.temporalRing) {
        const direction = Number(object.userData.temporalRing) || 1;
        object.rotation.z += delta * 0.9 * direction;
        object.rotation.y += delta * 0.32 * direction;
      }
      if (object.userData.portalVeil) {
        const pulse = 0.94 + Math.sin(this.worldTime * 3.2 + object.id) * 0.08;
        object.scale.setScalar(pulse);
      }
      if (object.userData.observatoryLens) {
        const baseY = Number(object.userData.baseY) || 6.25;
        object.position.y = baseY + Math.sin(this.worldTime * 1.9) * 0.08;
        object.rotation.y += delta * 0.65;
      }
      if (object.userData.observatoryOrbit) {
        object.rotation.z += delta * 0.8;
        object.rotation.y = Math.sin(this.worldTime * 0.75) * 0.35;
      }
      if (object.userData.structureGlow) {
        const pulse = 1 + Math.sin(this.worldTime * 5.2 + object.id) * 0.09;
        object.scale.setScalar(pulse);
      }
      if (object.userData.bridgeGuide) {
        const phase = Number(object.userData.guidePhase) || 0;
        const pulse = 0.9 + (Math.sin(this.worldTime * 4.5 - phase) + 1) * 0.16;
        object.scale.setScalar(pulse);
        object.position.y = 0.48 + Math.sin(this.worldTime * 3.4 - phase) * 0.12;
      }
      if (object.userData.assembling) {
        const elapsed = (Number(object.userData.assemblyElapsed) || 0) + delta;
        object.userData.assemblyElapsed = elapsed;
        const progress = THREE.MathUtils.clamp(elapsed / 1.85, 0, 1);
        const parts = (object.userData.assemblyParts ?? []) as THREE.Mesh[];
        const divisor = Math.max(1, parts.length - 1);
        parts.forEach((part, index) => {
          const delay = (index / divisor) * 0.62;
          const local = THREE.MathUtils.clamp((progress - delay) / 0.38, 0, 1);
          const eased = 1 - Math.pow(1 - local, 3);
          const pop = eased + Math.sin(eased * Math.PI) * 0.09;
          const basePosition = part.userData.assemblyBasePosition as THREE.Vector3;
          const baseScale = part.userData.assemblyBaseScale as THREE.Vector3;
          const offset = part.userData.assemblyOffset as THREE.Vector3;
          part.position.copy(basePosition).addScaledVector(offset, 1 - eased);
          part.scale.copy(baseScale).multiplyScalar(Math.max(0.025, pop));
        });
        if (progress >= 1) {
          parts.forEach((part) => {
            part.position.copy(part.userData.assemblyBasePosition as THREE.Vector3);
            part.scale.copy(part.userData.assemblyBaseScale as THREE.Vector3);
          });
          object.userData.assembling = false;
        }
      }
      if (object.userData.growingBridge) {
        const elapsed = (Number(object.userData.bridgeBuildElapsed) || 0) + delta;
        object.userData.bridgeBuildElapsed = elapsed;
        const progress = THREE.MathUtils.clamp(elapsed / 1.35, 0, 1);
        object.children.forEach((child) => {
          if (typeof child.userData.bridgePlank !== 'number') return;
          const local = THREE.MathUtils.clamp((progress - child.userData.bridgePlank * 0.68) / 0.32, 0, 1);
          const eased = 1 - Math.pow(1 - local, 3);
          const baseScale = child.userData.bridgeBaseScale as THREE.Vector3 | undefined;
          if (baseScale) child.scale.copy(baseScale).multiplyScalar(Math.max(0.03, eased));
          else child.scale.setScalar(Math.max(0.03, eased));
        });
        if (progress >= 1) object.userData.growingBridge = false;
      }
    });
    this.heartCore.rotation.y += delta * (this.economy.progress.completed ? 1.9 : 0.35);
    this.heartCore.position.y = 4.55 + Math.sin(this.worldTime * 1.6) * 0.11;
  }

  private playPlayerAction(name: string, fade = 0.14): void {
    if (this.currentPlayerAction === name) return;
    const next = this.playerActions.get(name) ?? this.playerActions.get('idle');
    if (!next) return;
    const current = this.playerActions.get(this.currentPlayerAction);
    current?.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    this.currentPlayerAction = name;
  }

  private updateTideResetAnimation(delta: number): void {
    const animation = this.tideResetAnimation;
    if (!animation) return;
    animation.elapsed += delta;
    const elapsed = animation.elapsed;

    for (let islandIndex = 4; islandIndex >= 1; islandIndex -= 1) {
      const order = 4 - islandIndex;
      const start = 0.55 + order * 0.62;
      const ratio = THREE.MathUtils.clamp((elapsed - start) / 0.9, 0, 1);
      const island = this.islands[islandIndex];
      if (island) island.root.position.y = THREE.MathUtils.lerp(0, HIDDEN_ISLAND_Y, ratio * ratio);
      const bridge = this.bridges[islandIndex - 1];
      if (!bridge) continue;
      bridge.root.children.forEach((child, childIndex) => {
        if (!child.userData.tideBasePosition) {
          child.userData.tideBasePosition = child.position.clone();
          child.userData.tideBaseRotation = child.rotation.clone();
        }
        const local = THREE.MathUtils.clamp((ratio - (childIndex % 9) * 0.035) / 0.68, 0, 1);
        const base = child.userData.tideBasePosition as THREE.Vector3;
        const baseRotation = child.userData.tideBaseRotation as THREE.Euler;
        child.position.copy(base);
        child.position.y = base.y - local * (2.8 + (childIndex % 4) * 0.45);
        child.rotation.copy(baseRotation);
        child.rotation.x += local * (0.7 + (childIndex % 3) * 0.24);
        child.rotation.z += local * ((childIndex % 2 ? 1 : -1) * 0.58);
      });
    }

    if (elapsed > 2.55) {
      const fade = THREE.MathUtils.clamp((elapsed - 2.55) / 0.7, 0, 1);
      this.workers.forEach((worker, index) => {
        worker.root.position.y = -fade * (1.2 + (index % 3) * 0.2);
        worker.root.scale.setScalar(Math.max(0.02, (0.95 + worker.level * 0.055) * (1 - fade)));
        if (fade >= 1) worker.root.visible = false;
      });
    }

    if (elapsed >= 3.55 && !animation.playerEmerged) {
      animation.playerEmerged = true;
      this.player.visible = true;
      this.player.position.set(0, 0, 0.8);
      this.player.scale.setScalar(0.04);
      this.player.rotation.y = 0;
      this.syncPlayerCargoVisuals();
      this.playPlayerAction('walk', 0.08);
    }
    if (animation.playerEmerged) {
      const emerge = THREE.MathUtils.clamp((elapsed - 3.55) / 1.3, 0, 1);
      const shifted = emerge - 1;
      const overshoot = 1 + 2.70158 * shifted ** 3 + 1.70158 * shifted ** 2;
      this.player.scale.setScalar(Math.max(0.04, overshoot));
      this.player.position.z = THREE.MathUtils.lerp(0.8, 3.6, emerge);
      if (emerge >= 1) this.playPlayerAction('idle');
    } else if (elapsed > 2.9) {
      this.player.visible = false;
    }

    const stage = elapsed < 1.2
      ? 'La Couronne disparaît…'
      : elapsed < 2.8
        ? 'Les ponts cèdent. La Marée reprend l’archipel.'
        : elapsed < 4.7
          ? 'Une seule île demeure.'
          : `Marée ${this.economy.progress.rebirths + 2} · +${animation.reward} Savoir`;
    this.ui.updateTideTransition(stage, Math.min(1, elapsed / 5.6));

    if (elapsed >= 4.85 && !animation.rebirthApplied) {
      animation.rebirthApplied = true;
      this.economy.rebirth();
      this.syncPlayerCargoVisuals();
      this.save();
    }
    if (elapsed >= 5.65) window.location.reload();
  }

  private updateCamera(delta: number): void {
    if (this.tideResetAnimation) {
      const elapsed = this.tideResetAnimation.elapsed;
      const overview = new THREE.Vector3(36, 48, -42);
      const returnCamera = new THREE.Vector3(10.5, 12.5, 15.5);
      const outward = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(elapsed / 0.8, 0, 1), 0, 1);
      const homeward = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((elapsed - 2.85) / 1.45, 0, 1), 0, 1);
      const firstLeg = this.tideResetAnimation.cameraStart.clone().lerp(overview, outward);
      this.camera.position.copy(firstLeg.lerp(returnCamera, homeward));
      const overviewTarget = new THREE.Vector3(6, -1, -48);
      const homeTarget = new THREE.Vector3(0, 0.7, 0);
      this.camera.lookAt(overviewTarget.lerp(homeTarget, homeward));
      return;
    }
    if (this.worldTravelAnimation && this.worldTravelCurve) {
      const travel = this.worldTravelAnimation;
      const direction = travel.destination === 2 ? 1 : -1;
      const cameraProgress = THREE.MathUtils.clamp(travel.progress - direction * 0.045, 0, 1);
      const lookProgress = THREE.MathUtils.clamp(travel.progress + direction * 0.035, 0, 1);
      const desired = this.worldTravelCurve.getPoint(cameraProgress)
        .add(new THREE.Vector3(0, 7.2, 0));
      const lookTarget = this.worldTravelCurve.getPoint(lookProgress)
        .add(new THREE.Vector3(0, 0.9, 0));
      this.camera.position.lerp(desired, 1 - Math.exp(-5.4 * delta));
      this.camera.lookAt(lookTarget);
      this.sun.position.copy(this.player.position).add(new THREE.Vector3(-12, 20, 12));
      this.sun.target.position.copy(this.player.position);
      this.sun.target.updateMatrixWorld();
      return;
    }
    const offset = new THREE.Vector3(10.5, 12.5, 15.5);
    const desired = this.player.position.clone().add(offset);
    const smoothing = 1 - Math.exp(-4.2 * delta);
    this.camera.position.lerp(desired, smoothing);
    this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 0.8, -1.4)));
    this.sun.position.copy(this.player.position).add(new THREE.Vector3(-15, 23, 15));
    this.sun.target.position.copy(this.player.position);
    this.sun.target.updateMatrixWorld();
  }

  private save(): void {
    try {
      const next = this.economy.serialize();
      const previous = localStorage.getItem(SAVE_KEY);
      if (previous && previous !== next) localStorage.setItem(SAVE_BACKUP_KEY, previous);
      localStorage.setItem(SAVE_KEY, next);
    } catch {
      // Le jeu reste jouable lorsque le stockage privé est indisponible.
    }
  }

  private updateDiagnostics(): void {
    const progress = this.economy.progress;
    this.diagnostics.active = this.active && !this.victoryShown;
    RESOURCE_KINDS.forEach((kind) => { this.diagnostics[kind] = progress[kind]; });
    this.diagnostics.campBuilt = progress.campBuilt;
    this.diagnostics.observatoryBuilt = progress.observatoryBuilt;
    this.diagnostics.workers = progress.workers.length;
    this.diagnostics.workerLevels = getTotalWorkerLevels(progress);
    this.diagnostics.workerTasks = progress.workers.map((worker) => worker.task).join(',');
    this.diagnostics.bridgeBuilt = progress.bridgesBuilt[0];
    this.diagnostics.bridges = progress.bridgesBuilt.filter(Boolean).length;
    this.diagnostics.bridgeVisualParts = this.bridges
      .filter((bridge) => progress.bridgesBuilt[bridge.index])
      .reduce((total, bridge) => total + bridge.root.children.length, 0);
    this.diagnostics.bridgeVisualWidth = progress.bridgesBuilt.some(Boolean)
      ? Math.min(...this.bridges
        .filter((bridge) => progress.bridgesBuilt[bridge.index])
        .map((bridge) => bridge.visualWidth))
      : 0;
    this.diagnostics.bridgeWalkableWidth = WORLD_ONE_BRIDGE_WALKABLE_HALF_WIDTH * 2;
    this.diagnostics.bridgeGuides = this.bridges.filter((bridge) => bridge.guide.visible).length;
    this.diagnostics.chapter = getChapter(progress);
    this.diagnostics.cacheFound = progress.cachesFound.includes('main-cache');
    this.diagnostics.completed = progress.completed;
    this.diagnostics.crewOpen = this.ui.isCrewOpen;
    this.diagnostics.projectsOpen = this.ui.isProjectsOpen;
    this.diagnostics.talentOpen = this.ui.isTalentOpen;
    this.diagnostics.menuOpen = this.ui.isMenuOpen;
    this.diagnostics.knowledge = progress.knowledge;
    this.diagnostics.rebirths = progress.rebirths;
    this.diagnostics.skills = progress.skills.join(',');
    this.diagnostics.autoRegulation = progress.autoRegulation;
    this.diagnostics.powerNotifications = progress.powerNotifications;
    this.diagnostics.powerVfx = progress.powerVfx;
    this.diagnostics.projects = getCompletedProjectCount(progress);
    this.diagnostics.projectHalls = this.economy.progress.projectHallsBuilt.filter(Boolean).length
      + (isProjectHallBuilt(this.economy.progress, 0) ? 1 : 0);
    this.diagnostics.warehouses = progress.warehousesBuilt.filter(Boolean).length;
    this.diagnostics.playerCargo = progress.currentWorld === 2
      ? getWorldTwoCargoTotal(progress)
      : getPlayerCargoTotal(progress);
    this.diagnostics.playerCargoStackHeight = this.playerCargoRack.children.length > 1
      ? Number((
        this.playerCargoRack.children[this.playerCargoRack.children.length - 1]!.position.y
        - this.playerCargoRack.children[0]!.position.y
      ).toFixed(2))
      : 0;
    this.diagnostics.playerCargoVisualKinds = this.playerCargoRack.children
      .map((piece) => String(piece.userData.worldTwoCargoKind ?? piece.userData.cargoKind ?? ''))
      .filter(Boolean)
      .join(',');
    this.diagnostics.currentIsland = findIslandIndexForPoint(this.player.position.x, this.player.position.z);
    this.diagnostics.currentWorld = progress.currentWorld;
    this.diagnostics.worldTwoTerrace = progress.currentWorld === 2
      ? findWorldTwoTerraceIndex(this.player.position.x, this.player.position.z)
      : -1;
    this.diagnostics.worldTwoPortalUnlocked = isWorldTwoUnlocked(progress);
    this.diagnostics.worldTwoPeakReached = progress.worldTwoPeakReached;
    this.diagnostics.worldTwoMoney = progress.worldTwoMoney;
    this.diagnostics.worldTwoFangLevel = progress.worldTwoFangLevel;
    this.diagnostics.worldTwoWolfFangLevel = progress.worldTwoWolfFangLevel;
    this.diagnostics.worldTwoMinerals = WORLD_TWO_MINERALS.length;
    this.diagnostics.worldTwoLockedMinerals = this.resources.filter(
      (node) => node.world === 2 && Boolean(node.root.userData.mineralLocked),
    ).length;
    this.diagnostics.worldTwoMineableDark = this.resources.filter(
      (node) => node.world === 2 && Boolean(node.root.userData.mineableMineralDark),
    ).length;
    this.diagnostics.worldTwoWolfAnimations = this.worldTwoWolves
      .map((wolf) => wolf.currentAction)
      .filter(Boolean)
      .join(',');
    this.diagnostics.worldTwoEnemyAnimations = this.worldTwoEnemies
      .map((enemy) => enemy.currentAction)
      .filter(Boolean)
      .join(',');
    this.diagnostics.worldTravelPathVisible = this.worldTravelCauseway.visible;
    this.diagnostics.worldTravelObjects = this.worldTravelCauseway.children.length;
    this.diagnostics.inputEnabled = this.input.enabled;
    this.diagnostics.managementOpen = this.managementOpen;
    this.diagnostics.blockingOverlay = this.ui.hasBlockingOverlay;
    this.diagnostics.drawCalls = this.renderer.info.render.calls;
    this.diagnostics.triangles = this.renderer.info.render.triangles;
    this.diagnostics.interaction = this.interaction?.type ?? '';
    this.diagnostics.assemblingBuildings = [
      ...this.structures.values(),
      ...this.warehouses,
      ...this.projects,
    ].filter((entity) => Boolean(entity.building.userData.assembling)).length
      + this.projects.reduce((total, entity) =>
        total + entity.seals.filter((seal) => Boolean(seal.userData.assembling)).length, 0);
    this.diagnostics.visibleIslands = this.islands.filter((island) => island.root.position.y > -0.2).length;
    this.diagnostics.emergingIsland = this.islandEmergence?.entity.definition.id ?? '';
    this.diagnostics.workersOnWalkable = this.workers.every((worker) => isPointOnWalkableNetwork(
      { x: worker.root.position.x, z: worker.root.position.z },
      progress.bridgesBuilt,
    ));
    this.diagnostics.workerNavigation = this.workers.map((worker) => ({
      id: worker.id,
      x: Number(worker.root.position.x.toFixed(2)),
      z: Number(worker.root.position.z.toFixed(2)),
      phase: worker.phase,
      routeBridges: [...worker.routeBridgeIndices],
      bridgesUsed: [...worker.bridgesUsed].sort((a, b) => a - b),
      routeDistance: Number(worker.routeDistance.toFixed(2)),
      routeChoices: worker.routeChoices,
      targetNode: worker.target?.id ?? '',
      targetIsland: worker.target?.islandIndex ?? -1,
      targetDistance: worker.target
        ? Number(worker.root.position.distanceTo(worker.target.root.position).toFixed(2))
        : -1,
      hubDistance: Number(worker.root.position.distanceTo(worker.hub).toFixed(2)),
      cargo: worker.cargo,
      cargoVisuals: worker.cargoRack.children.length,
      cargoStackHeight: worker.cargoRack.children.length > 1
        ? Number((
          worker.cargoRack.children[worker.cargoRack.children.length - 1]!.position.y
          - worker.cargoRack.children[0]!.position.y
        ).toFixed(2))
        : 0,
      animation: worker.currentAction,
    }));
    this.diagnostics.resourceNodes = this.resources.map((node) => ({
      id: node.id,
      kind: node.kind,
      island: node.islandIndex,
      amount: node.amount,
      capacity: node.capacity,
    }));
    this.diagnostics.player.x = Number(this.player.position.x.toFixed(2));
    this.diagnostics.player.z = Number(this.player.position.z.toFixed(2));
    if (this.playerModel) {
      this.playerModel.getWorldDirection(this.facingDirection);
      this.diagnostics.facingAlignment = Number(this.facingDirection.dot(this.lastMoveDirection).toFixed(3));
    }
    this.diagnostics.lastHarvest = this.lastHarvestedNode ? {
      kind: this.lastHarvestedNode.kind,
      remaining: this.lastHarvestedNode.amount,
      capacity: this.lastHarvestedNode.capacity,
      scale: Number(this.lastHarvestedNode.currentScale.toFixed(3)),
    } : null;
    this.diagnostics.lastWorkerHarvest = this.lastWorkerHarvest;
    this.diagnostics.industrySurge = this.industrySurgeRemaining > 0;
    this.diagnostics.industrySurgeKind = this.industrySurgeRemaining > 0 ? this.industrySurgeKind : '';
    this.diagnostics.explorationFlow = this.explorationFlowRemaining > 0;
    this.diagnostics.rebirthAnimation = Boolean(this.tideResetAnimation);
    this.diagnostics.fps = Math.round(this.fpsAverage);
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}

export const restoreEconomy = (): Economy => {
  const validSave = (key: string): string | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      return null;
    }
  };
  return Economy.restore(validSave(SAVE_KEY) ?? validSave(SAVE_BACKUP_KEY));
};
