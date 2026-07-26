import * as THREE from 'three';
import { AssetLibrary, findAnimation, type NatureKind } from './assets';
import {
  Economy,
  RESOURCE_ICONS,
  RESOURCE_KINDS,
  RESOURCE_LABELS,
  formatBridgeRequirement,
  formatCost,
  getAutoRegulationInterval,
  getAutoRegulationMoveCount,
  getBridgeCost,
  getCacheReward,
  getChapter,
  getCompletedProjectCount,
  getFinalCost,
  getIslandGoal,
  getManualYield,
  getPlayerSpeed,
  getPlayerCargoTotal,
  getPriorityShortage,
  getProjectCost,
  getProjectDefinition,
  getRecruitCost,
  getRespawnMultiplier,
  getRebirthReward,
  getSkillRank,
  getStructureCost,
  getTotalWorkerLevels,
  getUpgradeCost,
  getWarehouseCost,
  getWorkerCapacity,
  getWorkerGatherSeconds,
  getWorkerTravelSpeed,
  getWorkerYield,
  hasProject,
  hasSkill,
  isProjectVisible,
  isWarehouseUnlocked,
  PLAYER_CARGO_CAPACITY,
  type Cost,
  type ProjectId,
  type ResourceKind,
  type SkillId,
  type StructureKind,
  type WorkerLevel,
  type WorkerState,
} from './economy';
import { InputController } from './input';
import {
  chooseUninformedResourceIndex,
  isPointOnWalkableNetwork,
  planRoute,
  type PlannedRoute,
} from './pathfinding';
import {
  BRIDGES,
  CACHES,
  findIslandIndexForPoint,
  ISLANDS,
  pickResourceKindForIsland,
  PROJECT_SITES,
  RESOURCE_SPAWNS,
  STRUCTURES,
  WAREHOUSES,
  type BridgeDefinition,
  type CacheDefinition,
  type IslandDefinition,
  type ProjectSiteDefinition,
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
  cargo: number;
  cargoKind: ResourceKind;
  routeChoices: number;
  arrivalTimer: number;
  levelUpTimer: number;
}

interface BridgeEntity {
  index: number;
  definition: BridgeDefinition;
  root: THREE.Group;
  pad: THREE.Group;
  guide: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
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
}

interface ProjectEntity {
  definition: ProjectSiteDefinition;
  pad: THREE.Group;
  building: THREE.Group;
  status: THREE.Sprite;
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
  | { type: 'project'; entity: ProjectEntity }
  | { type: 'bridge'; entity: BridgeEntity }
  | { type: 'cache'; entity: CacheEntity }
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
  workers: number;
  workerLevels: number;
  workerTasks: string;
  bridgeBuilt: boolean;
  bridges: number;
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
  projects: number;
  warehouses: number;
  playerCargo: number;
  currentIsland: number;
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
    cargo: number;
    cargoVisuals: number;
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
const HIDDEN_ISLAND_Y = -8.5;
const WORKER_FEEL = {
  arrivalSeconds: 0.95,
  levelUpSeconds: 1.15,
  depositPauseSeconds: 0.55,
  depositUnitSeconds: 0.105,
} as const;

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
  private victoryShown = false;
  private readonly playerCargoRack = new THREE.Group();
  private playerDeposit: { warehouse: WarehouseEntity; timer: number } | null = null;
  private tideResetAnimation: TideResetAnimation | null = null;
  private industrySurgeCooldown = 2.5;
  private industrySurgeRemaining = 0;
  private industrySurgeKind: ResourceKind = 'wood';
  private industryVfxCooldown = 0;
  private explorationFlowCooldown = 4;
  private explorationFlowRemaining = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: AssetLibrary,
    private readonly economy: Economy,
    private readonly ui: GameUI,
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    this.input = new InputController(ui.joystick, ui.joystickKnob, ui.actionButton);
    this.setupScene();
    this.createWorld();
    this.playerMixer = this.createPlayer();
    this.restoreVisualProgress();
    this.bindManagement();
    this.resize();
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
      workers: progress.workers.length,
      workerLevels: getTotalWorkerLevels(progress),
      workerTasks: progress.workers.map((worker) => worker.task).join(','),
      bridgeBuilt: progress.bridgesBuilt[0],
      bridges: progress.bridgesBuilt.filter(Boolean).length,
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
      projects: getCompletedProjectCount(progress),
      warehouses: progress.warehousesBuilt.filter(Boolean).length,
      playerCargo: getPlayerCargoTotal(progress),
      currentIsland: 0,
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
    this.managementOpen = open;
    this.input.release();
    this.input.enabled = this.active && !open;
    if (open) {
      this.interaction = null;
      this.ui.clearContext();
    }
    if (
      !open
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
        : skill === 'awakening'
          ? 'Le Savoir s’éveille · trois voies viennent d’apparaître.'
          : 'Nouveau savoir acquis · la constellation s’étend.';
    this.ui.toast(message);
    this.changed();
  }

  private toggleAutoRegulation(enabled: boolean): void {
    if (!this.economy.setAutoRegulation(enabled)) return;
    this.autoRegulationCooldown = 0.4;
    this.ui.toast(enabled ? 'Auto-régulation active · l’équipe surveille les pénuries.' : 'Auto-régulation désactivée.');
    this.changed();
  }

  private toggleIndustrySurge(enabled: boolean): void {
    if (!this.economy.setIndustrySurge(enabled)) return;
    this.industrySurgeCooldown = enabled ? 0.35 : 2.5;
    if (!enabled) this.industrySurgeRemaining = 0;
    this.ui.toast(enabled
      ? 'Surcharge tellurique armée · elle réagira à la prochaine pénurie.'
      : 'Surcharge tellurique désactivée.');
    this.changed();
  }

  private toggleExplorationFlow(enabled: boolean): void {
    if (!this.economy.setExplorationFlow(enabled)) return;
    this.explorationFlowCooldown = enabled ? 0.35 : 4;
    if (!enabled) this.explorationFlowRemaining = 0;
    this.ui.toast(enabled
      ? 'Courant de Marée armé · les cargaisons appelleront le prochain élan.'
      : 'Courant de Marée désactivé.');
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
    const entity = this.projects.find((candidate) => candidate.definition.id === project);
    if (entity) {
      entity.building.visible = true;
      this.startBuildingAssembly(entity.building);
    }
    this.spawnParticles(
      entity?.building.getWorldPosition(new THREE.Vector3()).setY(1.1) ?? this.player.position.clone().setY(1.1),
      project === 'unity_lighthouse' ? 'crystal' : project === 'copper_winches' ? 'copper' : 'wood',
      project === 'unity_lighthouse' ? 32 : 18,
    );
    this.ui.toast(`${definition.name} achevé · ${definition.effect}`);
    this.changed();
  }

  private recruitWorker(): void {
    if (this.ui.activeCrewMode !== 'nursery') {
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
    this.changed();
  }

  private assignWorker(workerId: string, task: ResourceKind): void {
    if (this.ui.activeCrewMode !== 'nursery') {
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
    if (this.ui.activeCrewMode !== requiredMode) {
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
    }
    this.changed();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x8cc7c6);
    this.scene.fog = new THREE.Fog(0x8cc7c6, 42, 128);
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

  private createWorld(): void {
    this.createWater();
    ISLANDS.forEach((island, index) => this.createIsland(island, index));
    BRIDGES.forEach((bridge, index) => this.createBridge(bridge, index));
    WAREHOUSES.forEach((definition) => this.createWarehouse(definition));
    STRUCTURES.forEach((definition) => this.createStructure(definition));
    PROJECT_SITES.forEach((definition) => this.createProjectSite(definition));
    this.createHeart();
    this.createResources();
    this.createCaches();
    this.decorateArchipelago();
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
    const count = Math.max(6, Math.ceil(length / 0.5));
    const root = new THREE.Group();
    const plankMaterial = new THREE.MeshStandardMaterial({ color: 0xa16a3d, roughness: 0.9, flatShading: true });
    const yaw = Math.atan2(bridgeVector.x, bridgeVector.z);
    for (let plankIndex = 0; plankIndex <= count; plankIndex += 1) {
      const ratio = plankIndex / count;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.2, 0.48), plankMaterial);
      plank.position.lerpVectors(start, end, ratio).setY(0.03 + Math.sin(plankIndex * 0.8) * 0.035);
      plank.rotation.y = yaw + Math.sin(plankIndex * 1.23) * 0.025;
      plank.castShadow = true;
      plank.receiveShadow = true;
      plank.userData.bridgePlank = ratio;
      root.add(plank);
    }

    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
    [-1.62, 1.62].forEach((side) => {
      const ropeStart = start.clone().addScaledVector(perpendicular, side).setY(0.36);
      const ropeEnd = end.clone().addScaledVector(perpendicular, side).setY(0.36);
      const ropeDirection = ropeEnd.clone().sub(ropeStart);
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, ropeDirection.length(), 7),
        new THREE.MeshStandardMaterial({ color: 0x5d4028, roughness: 1 }),
      );
      rope.position.lerpVectors(ropeStart, ropeEnd, 0.5);
      rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ropeDirection.normalize());
      root.add(rope);
    });
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
    this.bridges.push({ index, definition, root, pad, guide, start, end });
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
    this.warehouses.push({ definition, pad, building, status });
  }

  private createStructure(definition: StructureDefinition): void {
    const pad = new THREE.Group();
    pad.position.set(definition.x, 0.05, definition.z);
    pad.add(this.createBuildPad(definition.radius, definition.color));
    this.addToIsland(pad, definition.x, definition.z);

    const building = this.createStructureBuilding(definition.kind);
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

  private createProjectSite(definition: ProjectSiteDefinition): void {
    const project = getProjectDefinition(definition.id);
    if (!project) return;
    const pad = new THREE.Group();
    pad.position.set(definition.x, 0.05, definition.z);
    pad.add(this.createBuildPad(definition.radius, definition.color));
    this.addToIsland(pad, definition.x, definition.z);

    const building = new THREE.Group();
    building.position.set(definition.x, 0, definition.z);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.08, 1.18, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x806548, roughness: 0.94, flatShading: true }),
    );
    platform.position.y = 0.1;
    platform.receiveShadow = true;
    building.add(platform);
    const model = this.assets.createBuilding(
      definition.model,
      definition.id === 'unity_lighthouse' ? 2.95 : definition.id === 'communal_sawmill' ? 2.4 : 2.15,
    );
    model.position.y = 0.2;
    model.rotation.y = definition.rotation;
    building.add(model);
    const emblem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22),
      new THREE.MeshStandardMaterial({
        color: definition.color,
        emissive: definition.color,
        emissiveIntensity: 0.55,
        roughness: 0.32,
      }),
    );
    emblem.position.y = definition.id === 'unity_lighthouse' ? 3.28 : 2.55;
    emblem.userData.structureGlow = true;
    building.add(emblem);
    building.visible = false;
    this.addToIsland(building, definition.x, definition.z);

    const status = this.createWorldLabel(
      `${project.icon} CHANTIER ${project.tier} · ${project.name.toUpperCase()}`,
      definition.color,
      4.6,
    );
    status.position.set(definition.x, definition.id === 'unity_lighthouse' ? 3.85 : 3.05, definition.z);
    status.visible = false;
    this.addToIsland(status, definition.x, definition.z);
    this.projects.push({ definition, pad, building, status });
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

  private createStructureBuilding(kind: StructureKind): THREE.Group {
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
    model.rotation.y = kind === 'camp' ? -0.38 : kind === 'workshop' ? 0.3 : kind === 'foundry' ? -0.22 : 0.5;
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
      });
    });
  }

  private createResourceVisual(kind: ResourceKind, visualCycle: number, preferredModel?: NatureKind): THREE.Object3D {
    if (kind === 'wood') return this.assets.createNature(preferredModel ?? (visualCycle % 2 === 0 ? 'treeA' : 'treeB'));
    if (kind === 'stone') return this.assets.createNature('rock');
    return this.createMineralCluster(kind);
  }

  private rerollResourceNode(node: ResourceNode): void {
    const counts: Partial<Record<ResourceKind, number>> = {};
    this.resources.forEach((candidate) => {
      if (candidate === node || candidate.islandIndex !== node.islandIndex) return;
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
    this.playerCargoRack.position.set(0, 0.78, -0.18);
    this.playerCargoRack.name = 'cargaison:joueur';
    this.player.add(this.playerCargoRack);
    this.player.position.set(0, 0, 4.25);
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
      const built = Boolean(progress.warehousesBuilt[islandIndex]);
      const accessible = islandIndex === 0 || Boolean(progress.bridgesBuilt[islandIndex - 1]);
      const unlocked = isWarehouseUnlocked(progress, islandIndex);
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
      const project = getProjectDefinition(entity.definition.id);
      if (!project) return;
      const built = hasProject(progress, entity.definition.id);
      const visible = isProjectVisible(progress, project);
      entity.building.visible = built;
      entity.pad.visible = visible && !built;
      entity.status.visible = visible;
      this.setWorldLabel(
        entity.status,
        built
          ? `✓ ${project.name.toUpperCase()}`
          : `${project.icon} CHANTIER ${project.tier} · ${project.name.toUpperCase()}`,
        entity.definition.color,
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
    cargoRack.position.set(0, 0.63, -0.12);
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
      cargo: 0,
      cargoKind: state.task,
      routeChoices: 0,
      arrivalTimer: withArrival ? WORKER_FEEL.arrivalSeconds : 0,
      levelUpTimer: 0,
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
      .filter((entity) => this.economy.progress.warehousesBuilt[entity.definition.islandIndex])
      .map((entity) => ({
        entity,
        point: vec(entity.definition.x, entity.definition.z + 1.15),
      }));
  }

  private nearestWarehouseRoute(start: THREE.Vector3): { point: THREE.Vector3; route: PlannedRoute } | null {
    return this.builtWarehouseHubs()
      .map(({ point }) => ({ point, route: this.planFrom(start, point) }))
      .filter((candidate): candidate is { point: THREE.Vector3; route: PlannedRoute } => Boolean(candidate.route))
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
      return total + (state ? getWorkerYield(state.level, this.economy.progress) : 0);
    }, 0);
  }

  private planWorkerCycle(entity: WorkerEntity, state: WorkerState): void {
    const start = entity.root.position;
    const matchingResources = this.resources.filter((node) =>
      node.kind === state.task
      && node.amount - this.reservedAmount(node, entity.id) > 0
      && node.root.visible);
    const reachable = matchingResources
      .map((node) => {
        const outbound = this.planFrom(start, node.root.position);
        const warehouse = this.nearestWarehouseRoute(node.root.position);
        return {
          node,
          outbound,
          returning: warehouse?.route ?? null,
          hub: warehouse?.point ?? null,
        };
      })
      .filter((candidate): candidate is {
        node: ResourceNode;
        outbound: PlannedRoute;
        returning: PlannedRoute;
        hub: THREE.Vector3;
      } => Boolean(candidate.outbound && candidate.returning && candidate.hub));
    if (!reachable.length) {
      entity.route = [];
      entity.routeBridgeIndices = [];
      entity.target = null;
      entity.phase = 'depositing';
      entity.phaseTimer = 0.28;
      this.playWorkerAction(entity, 'idle');
      return;
    }

    entity.routeChoices += 1;
    const uninformedIndex = chooseUninformedResourceIndex(entity.id, entity.routeChoices, reachable.length);
    let selected = reachable[Math.max(0, uninformedIndex)] ?? reachable[0]!;

    if (hasSkill(this.economy.progress, 'optimal_routes')) {
      selected = [...reachable].sort((a, b) =>
        a.outbound.distance + a.returning.distance - b.outbound.distance - b.returning.distance)[0] ?? selected;
    }

    entity.target = selected.node;
    entity.hub.copy(selected.hub);
    this.applyWorkerRoute(entity, selected.outbound, 'toResource');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const rawDelta = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;
    this.fpsAverage += ((1 / rawDelta) - this.fpsAverage) * 0.05;
    this.worldTime += rawDelta;
    this.updateAmbient(rawDelta);
    if (this.tideResetAnimation) this.updateTideResetAnimation(rawDelta);
    if (this.active) this.updateGame(rawDelta);
    this.playerMixer.update(rawDelta);
    this.workers.forEach((worker) => worker.mixer.update(rawDelta));
    this.updateParticles(rawDelta);
    this.updateCargoDrops(rawDelta);
    this.updateCamera(rawDelta);
    this.updateDiagnostics();
    this.renderer.render(this.scene, this.camera);
  };

  private updateGame(delta: number): void {
    this.economy.tick(delta);
    this.input.updateKeyboard();
    this.ui.updateIslandGoal(findIslandIndexForPoint(this.player.position.x, this.player.position.z));
    this.updateBridgeGuides();
    if (!this.managementOpen) {
      if (!this.playerDeposit) this.updatePlayer(delta);
      else this.playPlayerAction('idle');
      this.interaction = this.findInteraction();
      this.updateInteractionUI(this.interaction);
      if (!this.playerDeposit) this.handleAction(delta);
    }
    this.updateActivePowers(delta);
    this.updateResources(delta);
    this.updateWorkers(delta);
    this.updatePlayerDeposit(delta);
    this.updateAutoRegulation(delta);

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
    const flowMultiplier = this.explorationFlowRemaining > 0 ? 2 : 1;
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
    const onIsland = ISLANDS.some((island, index) => {
      const accessible = (index === 0 || this.economy.progress.bridgesBuilt[index - 1])
        && this.islandEmergence?.entity.index !== index;
      return accessible && Math.hypot(position.x - island.x, position.z - island.z) <= island.radius - 0.42;
    });
    if (onIsland) return true;
    return this.bridges.some((bridge) => this.economy.progress.bridgesBuilt[bridge.index]
      && this.distanceToSegmentSquared(position, bridge.start, bridge.end) <= 2.2 * 2.2);
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
      if (node.amount <= 0) {
        const surgeMultiplier = this.industrySurgeRemaining > 0 && node.kind === this.industrySurgeKind ? 2 : 1;
        node.respawn -= delta * surgeMultiplier;
        node.currentScale = THREE.MathUtils.damp(node.currentScale, 0, 10, delta);
        node.root.scale.setScalar(node.currentScale);
        if (node.currentScale < 0.025) node.root.visible = false;
        if (node.respawn <= 0) {
          this.rerollResourceNode(node);
          node.amount = node.capacity;
          node.currentScale = Math.max(0.04, node.baseScale * 0.08);
          node.root.scale.setScalar(node.currentScale);
          node.root.visible = true;
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
        this.planWorkerCycle(entity, state);
      }

      const travelSpeed = getWorkerTravelSpeed(state.level, this.economy.progress)
        * (this.explorationFlowRemaining > 0 && entity.cargo > 0 ? 2 : 1);
      if (entity.phase === 'toResource') {
        this.playWorkerAction(entity, 'walk');
        if (this.advanceWorker(entity, travelSpeed, delta)) {
          entity.phase = 'gathering';
          entity.phaseTimer = getWorkerGatherSeconds(state.level, this.economy.progress);
          this.playWorkerAction(entity, 'act', 0.08);
        }
      } else if (entity.phase === 'gathering') {
        this.playWorkerAction(entity, 'act', 0.08);
        entity.phaseTimer -= delta;
        if (entity.phaseTimer <= 0) {
          const target = entity.target;
          if (!target || target.amount <= 0 || target.kind !== state.task) {
            entity.target = null;
            entity.cargo = 0;
            this.planWorkerCycle(entity, state);
            return;
          }
          const requested = getWorkerYield(state.level, this.economy.progress);
          entity.cargo = this.consumeResourceNode(target, requested, entity.id);
          entity.cargoKind = target.kind;
          this.syncWorkerCargoVisuals(entity);
          if (entity.cargo <= 0) {
            entity.target = null;
            this.planWorkerCycle(entity, state);
            return;
          }
          const height = target.kind === 'wood' ? 1.4 : target.kind === 'crystal' ? 1 : 0.7;
          this.spawnParticles(target.root.position.clone().setY(height), target.kind, 5 + state.level * 2);
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
            const origin = entity.cargoRack.getWorldPosition(new THREE.Vector3()).setY(0.78);
            const target = entity.hub.clone().setY(0.42);
            entity.cargo -= 1;
            this.spawnCargoDrop(origin, target, entity.cargoKind, () => {
              this.economy.add(entity.cargoKind, 1);
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

  private updateActivePowers(delta: number): void {
    const progress = this.economy.progress;

    if (!progress.industrySurge || !hasSkill(progress, 'endless_engine')) {
      this.industrySurgeRemaining = 0;
      this.industrySurgeCooldown = 2.5;
    } else if (this.industrySurgeRemaining > 0) {
      this.industrySurgeRemaining = Math.max(0, this.industrySurgeRemaining - delta);
      if (this.industrySurgeRemaining <= 0) this.industrySurgeCooldown = 16;
    } else {
      this.industrySurgeCooldown -= delta;
      if (this.industrySurgeCooldown <= 0) {
        this.industrySurgeKind = getPriorityShortage(progress);
        this.industrySurgeRemaining = 10;
        this.ui.toast(`Surcharge tellurique · la repousse de ${RESOURCE_LABELS[this.industrySurgeKind]} est doublée !`);
      }
    }

    if (!progress.explorationFlow || !hasSkill(progress, 'ocean_legacy')) {
      this.explorationFlowRemaining = 0;
      this.explorationFlowCooldown = 4;
    } else if (this.explorationFlowRemaining > 0) {
      this.explorationFlowRemaining = Math.max(0, this.explorationFlowRemaining - delta);
      if (this.explorationFlowRemaining <= 0) this.explorationFlowCooldown = 18;
    } else {
      const transportActive = getPlayerCargoTotal(progress) > 0
        || this.workers.some((worker) => worker.cargo > 0 || worker.phase === 'toHub');
      if (transportActive) this.explorationFlowCooldown -= delta;
      if (transportActive && this.explorationFlowCooldown <= 0) {
        this.explorationFlowRemaining = 10;
        this.ui.toast('Courant de Marée · les cargaisons filent deux fois plus vite !');
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
    this.ui.toast(`Auto-régulation · ${names.join(' et ')} rééquilibrent l’équipe.`);
    this.changed();
  }

  private findInteraction(): Interaction | null {
    const position = this.player.position;
    const near = (target: THREE.Vector3, distance: number): boolean => position.distanceToSquared(target) <= distance * distance;
    for (const entity of this.warehouses) {
      const built = Boolean(this.economy.progress.warehousesBuilt[entity.definition.islandIndex]);
      const target = built ? entity.building : entity.pad;
      if (target.visible && near(target.position, entity.definition.radius + 1.15)) return { type: 'warehouse', entity };
    }
    for (const [kind, entity] of this.structures) {
      const built = structureBuilt(this.economy.progress, kind);
      const target = built ? entity.building : entity.pad;
      if (target.visible && near(target.position, entity.definition.radius + 1.15)) return { type: 'structure', entity };
    }
    for (const entity of this.projects) {
      const built = hasProject(this.economy.progress, entity.definition.id);
      if (built) continue;
      const target = built ? entity.building : entity.pad;
      if (target.visible && near(target.position, entity.definition.radius + 1.05)) return { type: 'project', entity };
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
      if (!node.root.visible || node.amount <= 0) return;
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
      const label = interaction.node.kind === 'wood' ? 'Arbre' : interaction.node.kind === 'stone' ? 'Rocher' : interaction.node.kind === 'copper' ? 'Filon de cuivre' : 'Cristal ancien';
      const carried = getPlayerCargoTotal(this.economy.progress);
      this.ui.setContext(
        `${label} · ${interaction.node.amount}/${interaction.node.capacity}`,
        carried >= PLAYER_CARGO_CAPACITY ? 'DOS PLEIN' : 'RÉCOLTER',
        RESOURCE_ICONS[interaction.node.kind],
        carried < PLAYER_CARGO_CAPACITY,
        `Cargaison ${carried}/${PLAYER_CARGO_CAPACITY} · décharge-la dans un dépôt.`,
      );
      return;
    }
    if (interaction.type === 'warehouse') {
      const { islandIndex, name } = interaction.entity.definition;
      const built = Boolean(this.economy.progress.warehousesBuilt[islandIndex]);
      if (built) {
        const carried = getPlayerCargoTotal(this.economy.progress);
        this.ui.setContext(
          `${name} · stock logistique`,
          carried > 0 ? 'DÉCHARGER' : 'DÉPÔT VIDE',
          '▣',
          carried > 0,
          carried > 0
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
          'Les pièces s’assembleront ici.',
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
    if (interaction.type === 'project') {
      const definition = getProjectDefinition(interaction.entity.definition.id);
      if (!definition) return;
      const built = hasProject(this.economy.progress, definition.id);
      const projectCost = getProjectCost(this.economy.progress, definition);
      this.ui.setContext(
        built ? `${definition.name} · achevé` : `${definition.name} · Grand Travail`,
        built ? 'ACHEVÉ' : 'BÂTIR',
        built ? '✓' : definition.icon,
        !built && this.economy.canAfford(projectCost),
        built ? definition.effect : `${definition.effect} · ${formatCost(projectCost)} · +${definition.knowledge} Savoir`,
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

    if (this.interaction.type === 'warehouse') {
      const entity = this.interaction.entity;
      const islandIndex = entity.definition.islandIndex;
      if (this.economy.progress.warehousesBuilt[islandIndex]) {
        if (getPlayerCargoTotal(this.economy.progress) <= 0) {
          this.ui.toast('Ton dos est vide · rapporte une cargaison récoltée.');
          return;
        }
        this.playerDeposit = { warehouse: entity, timer: 0.04 };
        this.input.release();
        this.ui.toast('Déchargement · chaque unité rejoint maintenant le stock.');
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
            'Touche un hexagone pour lire son pouvoir. L’achat ne se fait jamais au premier toucher : il faut ensuite le confirmer dans la grande fiche.',
            '✦',
          );
        }
      } else this.showMissing(getStructureCost(this.economy.progress, kind));
      return;
    }
    if (this.interaction.type === 'project') {
      const id = this.interaction.entity.definition.id;
      if (hasProject(this.economy.progress, id)) {
        const definition = getProjectDefinition(id);
        if (definition) this.ui.toast(`${definition.name} · ${definition.effect}`);
        return;
      }
      this.buildProject(id);
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
          if (typeof child.userData.bridgePlank === 'number') child.scale.setScalar(0.03);
        });
        this.revealIsland(definition.toIsland);
        this.ui.toast(`${definition.name} terminé · nouvelle île · +1 Savoir`);
        this.spawnParticles(this.interaction.entity.start.clone().lerp(this.interaction.entity.end, 0.5).setY(0.7), index >= 2 ? 'crystal' : 'stone', 26);
        this.changed();
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
    const free = PLAYER_CARGO_CAPACITY - getPlayerCargoTotal(this.economy.progress);
    if (free <= 0) {
      this.ui.toast('Dos plein · retourne à un dépôt pour décharger.');
      return;
    }
    const requested = Math.min(free, getManualYield(this.economy.progress, node.kind));
    const gathered = this.consumeResourceNode(node, requested);
    const carried = this.economy.carryForPlayer(node.kind, gathered);
    if (carried <= 0) return;
    this.syncPlayerCargoVisuals();
    const height = node.kind === 'wood' ? 1.4 : node.kind === 'crystal' ? 1 : 0.7;
    this.spawnParticles(node.root.position.clone().setY(height), node.kind, 7);
    if (node.amount <= 0) {
      node.respawn = node.respawnSeconds * getRespawnMultiplier(this.economy.progress);
      this.ui.toast(node.kind === 'wood' ? 'Arbre épuisé · il repousse bientôt' : `${RESOURCE_LABELS[node.kind]} épuisé · le filon se reforme`);
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
    if (node.amount <= 0) node.respawn = node.respawnSeconds * getRespawnMultiplier(this.economy.progress);
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
    const material = new THREE.MeshStandardMaterial({
      color: RESOURCE_COLORS[kind],
      roughness: kind === 'crystal' ? 0.28 : 0.72,
      metalness: kind === 'copper' ? 0.28 : 0.04,
      emissive: kind === 'crystal' ? 0x444070 : 0x000000,
      emissiveIntensity: kind === 'crystal' ? 0.55 : 0,
      flatShading: true,
    });
    let piece: THREE.Mesh;
    if (kind === 'wood') {
      piece = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.34, 7), material);
      piece.rotation.z = Math.PI / 2;
    } else if (kind === 'stone') {
      piece = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), material);
    } else if (kind === 'copper') {
      piece = new THREE.Mesh(new THREE.DodecahedronGeometry(0.115, 0), material);
      piece.scale.y = 0.82;
    } else {
      piece = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), material);
      piece.scale.y = 1.35;
    }
    piece.rotation.y = index * 1.17;
    piece.castShadow = true;
    piece.userData.cargoPiece = true;
    piece.userData.cargoKind = kind;
    return piece;
  }

  private clearCargoRack(rack: THREE.Group): void {
    [...rack.children].forEach((child) => {
      rack.remove(child);
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    });
  }

  private populateCargoRack(rack: THREE.Group, kinds: readonly ResourceKind[]): void {
    this.clearCargoRack(rack);
    kinds.slice(0, PLAYER_CARGO_CAPACITY).forEach((kind, index) => {
      const piece = this.createCargoPiece(kind, index);
      const column = index % 4;
      const row = Math.floor(index / 4);
      piece.position.set(
        (column - 1.5) * 0.145,
        row * 0.115,
        ((index + row) % 2 ? -1 : 1) * 0.075,
      );
      piece.rotation.x += (column - 1.5) * 0.08;
      rack.add(piece);
    });
  }

  private syncPlayerCargoVisuals(): void {
    const kinds: ResourceKind[] = [];
    RESOURCE_KINDS.forEach((kind) => {
      for (let index = 0; index < this.economy.progress.playerCargo[kind]; index += 1) kinds.push(kind);
    });
    this.populateCargoRack(this.playerCargoRack, kinds);
    this.ui.updateCargo(getPlayerCargoTotal(this.economy.progress), PLAYER_CARGO_CAPACITY);
  }

  private syncWorkerCargoVisuals(entity: WorkerEntity): void {
    this.populateCargoRack(
      entity.cargoRack,
      Array.from({ length: Math.min(PLAYER_CARGO_CAPACITY, entity.cargo) }, () => entity.cargoKind),
    );
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
      drop.mesh.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      drop.onLand?.();
      this.cargoDrops.splice(index, 1);
    }
  }

  private updatePlayerDeposit(delta: number): void {
    const deposit = this.playerDeposit;
    if (!deposit) return;
    deposit.timer -= delta;
    if (deposit.timer > 0) return;
    const kind = RESOURCE_KINDS.find((candidate) => this.economy.progress.playerCargo[candidate] > 0);
    if (!kind) {
      this.playerDeposit = null;
      this.economy.recordDelivery();
      this.ui.toast('Cargaison rangée · le stock est maintenant disponible.');
      this.ui.update(this.economy.progress);
      this.save();
      return;
    }
    const origin = this.playerCargoRack.getWorldPosition(new THREE.Vector3()).setY(0.92);
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
    const color = RESOURCE_COLORS[kind];
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
    this.scene.traverse((object) => {
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
          child.scale.setScalar(Math.max(0.03, eased));
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
      localStorage.setItem(SAVE_KEY, this.economy.serialize());
    } catch {
      // Le jeu reste jouable lorsque le stockage privé est indisponible.
    }
  }

  private updateDiagnostics(): void {
    const progress = this.economy.progress;
    this.diagnostics.active = this.active && !this.victoryShown;
    RESOURCE_KINDS.forEach((kind) => { this.diagnostics[kind] = progress[kind]; });
    this.diagnostics.campBuilt = progress.campBuilt;
    this.diagnostics.workers = progress.workers.length;
    this.diagnostics.workerLevels = getTotalWorkerLevels(progress);
    this.diagnostics.workerTasks = progress.workers.map((worker) => worker.task).join(',');
    this.diagnostics.bridgeBuilt = progress.bridgesBuilt[0];
    this.diagnostics.bridges = progress.bridgesBuilt.filter(Boolean).length;
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
    this.diagnostics.projects = getCompletedProjectCount(progress);
    this.diagnostics.warehouses = progress.warehousesBuilt.filter(Boolean).length;
    this.diagnostics.playerCargo = getPlayerCargoTotal(progress);
    this.diagnostics.currentIsland = findIslandIndexForPoint(this.player.position.x, this.player.position.z);
    this.diagnostics.assemblingBuildings = [
      ...this.structures.values(),
      ...this.warehouses,
      ...this.projects,
    ].filter((entity) => Boolean(entity.building.userData.assembling)).length;
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
      cargo: worker.cargo,
      cargoVisuals: worker.cargoRack.children.length,
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

export const restoreEconomy = (): Economy => Economy.restore(localStorage.getItem(SAVE_KEY));
