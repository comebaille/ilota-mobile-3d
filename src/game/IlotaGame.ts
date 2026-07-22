import * as THREE from 'three';
import { AssetLibrary, findAnimation } from './assets';
import {
  BRIDGE_COSTS,
  Economy,
  FINAL_COST,
  RESOURCE_ICONS,
  RESOURCE_KINDS,
  RESOURCE_LABELS,
  STRUCTURE_COSTS,
  formatBridgeRequirement,
  formatCost,
  getChapter,
  getRecruitCost,
  getTotalWorkerLevels,
  getUpgradeCost,
  getWorkerCapacity,
  getWorkerCycleSeconds,
  getWorkerYield,
  type Cost,
  type ResourceKind,
  type StructureKind,
  type WorkerLevel,
  type WorkerState,
} from './economy';
import { InputController } from './input';
import {
  BRIDGES,
  CACHES,
  ISLANDS,
  RESOURCE_SPAWNS,
  STRUCTURES,
  type BridgeDefinition,
  type CacheDefinition,
  type IslandDefinition,
  type StructureDefinition,
} from './world';
import { GameUI } from '../ui/GameUI';

interface ResourceNode {
  kind: ResourceKind;
  root: THREE.Group;
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
  task: ResourceKind;
  level: WorkerLevel;
  routeStart: THREE.Vector3;
  routeEnd: THREE.Vector3;
  offset: number;
  lastDelivery: number;
}

interface BridgeEntity {
  index: number;
  definition: BridgeDefinition;
  root: THREE.Group;
  pad: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
}

interface StructureEntity {
  definition: StructureDefinition;
  pad: THREE.Group;
  building: THREE.Group;
}

interface CacheEntity {
  definition: CacheDefinition;
  root: THREE.Group;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

type Interaction =
  | { type: 'resource'; node: ResourceNode }
  | { type: 'structure'; entity: StructureEntity }
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
  chapter: number;
  cacheFound: boolean;
  completed: boolean;
  crewOpen: boolean;
  player: { x: number; z: number };
  facingAlignment: number;
  lastHarvest: { kind: ResourceKind; remaining: number; capacity: number; scale: number } | null;
  fps: number;
}

const SAVE_KEY = 'ilota-save-v1';
const PLAYER_SPEED = 5.25;

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
  camp: { built: 'Bâtir le camp des Marées', toast: 'Camp construit · trois postes de travailleurs ouverts !' },
  workshop: { built: 'Construire l’atelier des Pins', toast: 'Atelier terminé · cinq postes et niveau 2 débloqués !' },
  foundry: { built: 'Construire la fonderie Cuivrée', toast: 'Fonderie allumée · cuivre, sept postes et niveau 3 débloqués !' },
  observatory: { built: 'Construire l’observatoire de Cristal', toast: 'Observatoire dressé · cristal et neuf postes débloqués !' },
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
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
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
  private readonly workers: WorkerEntity[] = [];
  private readonly bridges: BridgeEntity[] = [];
  private readonly structures = new Map<StructureKind, StructureEntity>();
  private readonly caches: CacheEntity[] = [];
  private readonly particles: Particle[] = [];
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
  private harvestCooldown = 0;
  private worldTime = 0;
  private saveCooldown = 0;
  private lastFrameTime = performance.now();
  private fpsAverage = 60;
  private victoryShown = false;

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
    this.bindCrewManagement();
    this.resize();
    window.addEventListener('resize', this.resize);

    const progress = economy.progress;
    this.diagnostics = {
      ready: true,
      active: false,
      assetsLoaded: 6,
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
      chapter: getChapter(progress),
      cacheFound: progress.cachesFound.includes('main-cache'),
      completed: progress.completed,
      crewOpen: false,
      player: { x: this.player.position.x, z: this.player.position.z },
      facingAlignment: 1,
      lastHarvest: null,
      fps: 60,
    };
    this.ui.update(progress);
    this.animate();
  }

  start(): void {
    this.active = true;
    this.input.enabled = !this.managementOpen;
    this.victoryShown = false;
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

  private bindCrewManagement(): void {
    this.ui.bindCrewHandlers({
      onOpenChange: (open) => {
        this.managementOpen = open;
        this.input.release();
        this.input.enabled = this.active && !open;
        if (open) {
          this.interaction = null;
          this.ui.clearContext();
        }
      },
      onRecruit: () => this.recruitWorker(),
      onAssign: (workerId, task) => this.assignWorker(workerId, task),
      onUpgrade: (workerId) => this.upgradeWorker(workerId),
    });
  }

  private recruitWorker(): void {
    const recruitCost = getRecruitCost(this.economy.progress);
    const worker = this.economy.hireWorker();
    if (!worker) {
      if (this.economy.progress.workers.length >= getWorkerCapacity(this.economy.progress)) {
        this.ui.toast('Capacité atteinte · construis la prochaine structure.');
      } else this.showMissing(recruitCost);
      return;
    }
    this.spawnWorker(worker);
    this.ui.toast(`${worker.name} rejoint l’équipe et récolte : ${RESOURCE_LABELS[worker.task]}.`);
    this.changed();
  }

  private assignWorker(workerId: string, task: ResourceKind): void {
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
    const upgradeCost = getUpgradeCost(before);
    if (!this.economy.upgradeWorker(workerId)) {
      this.showMissing(upgradeCost);
      return;
    }
    const state = this.economy.progress.workers.find((worker) => worker.id === workerId);
    const entity = this.workers.find((worker) => worker.id === workerId);
    if (state && entity) this.syncWorker(entity, state, false);
    if (state) this.ui.toast(`${state.name} passe niveau ${state.level} · rendement amélioré !`);
    this.changed();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x8cc7c6);
    this.scene.fog = new THREE.Fog(0x8cc7c6, 34, 86);
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
    ISLANDS.forEach((island) => this.createIsland(island));
    BRIDGES.forEach((bridge, index) => this.createBridge(bridge, index));
    STRUCTURES.forEach((definition) => this.createStructure(definition));
    this.createHeart();
    this.createResources();
    this.createCaches();
    this.decorateArchipelago();
  }

  private createWater(): void {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(230, 230),
      new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.34, metalness: 0.08 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -2.08, -32);
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

  private createIsland(definition: IslandDefinition): void {
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
    this.scene.add(island);

    const shore = new THREE.Mesh(
      new THREE.CylinderGeometry(definition.radius + 0.18, definition.radius + 0.48, 0.3, 36),
      new THREE.MeshStandardMaterial({ color: definition.shoreColor, roughness: 1, flatShading: true }),
    );
    shore.position.set(definition.x, -0.2, definition.z);
    shore.receiveShadow = true;
    this.scene.add(shore);
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
    this.scene.add(pad);
    this.bridges.push({ index, definition, root, pad, start, end });
  }

  private createStructure(definition: StructureDefinition): void {
    const pad = new THREE.Group();
    pad.position.set(definition.x, 0.05, definition.z);
    pad.add(this.createBuildPad(definition.radius, definition.color));
    this.scene.add(pad);

    const building = this.createStructureBuilding(definition.kind);
    building.position.set(definition.x, 0, definition.z);
    building.visible = false;
    this.scene.add(building);
    this.structures.set(definition.kind, { definition, pad, building });
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
    if (kind === 'camp') return this.createCampBuilding();
    const group = new THREE.Group();
    const platformColor = kind === 'workshop' ? 0xb7874f : kind === 'foundry' ? 0x8a6654 : 0x7a7890;
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 2, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: platformColor, roughness: 0.9, flatShading: true }),
    );
    platform.position.y = 0.15;
    platform.receiveShadow = true;
    group.add(platform);

    if (kind === 'workshop') {
      const hut = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 1.4, 1.9),
        new THREE.MeshStandardMaterial({ color: 0xd8aa68, roughness: 0.94, flatShading: true }),
      );
      hut.position.y = 1;
      hut.castShadow = true;
      group.add(hut);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(1.85, 1.1, 4),
        new THREE.MeshStandardMaterial({ color: 0x70452f, roughness: 0.95, flatShading: true }),
      );
      roof.position.y = 2.2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.28), new THREE.MeshStandardMaterial({ color: PALETTE.woodDark }));
      beam.position.set(0, 0.72, 1.1);
      group.add(beam);
    } else if (kind === 'foundry') {
      const furnace = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.45, 1.9, 10),
        new THREE.MeshStandardMaterial({ color: 0x6f625b, roughness: 0.92, flatShading: true }),
      );
      furnace.position.y = 1.1;
      furnace.castShadow = true;
      group.add(furnace);
      const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.52, 2.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x514a47, roughness: 1, flatShading: true }),
      );
      chimney.position.set(0.55, 2.55, -0.25);
      chimney.castShadow = true;
      group.add(chimney);
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 16),
        new THREE.MeshBasicMaterial({ color: 0xff9a4f, side: THREE.DoubleSide }),
      );
      glow.position.set(0, 0.9, 1.17);
      group.add(glow);
    } else {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.25, 2.8, 10),
        new THREE.MeshStandardMaterial({ color: 0xb9b4a8, roughness: 0.86, flatShading: true }),
      );
      tower.position.y = 1.55;
      tower.castShadow = true;
      group.add(tower);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x8882a8, metalness: 0.24, roughness: 0.5, flatShading: true }),
      );
      dome.position.y = 3;
      dome.castShadow = true;
      group.add(dome);
      const lens = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38),
        new THREE.MeshStandardMaterial({ color: PALETTE.crystal, emissive: 0x59558b, emissiveIntensity: 1.5, roughness: 0.25 }),
      );
      lens.position.set(0, 3.35, 0);
      lens.userData.observatoryLens = true;
      group.add(lens);
    }
    return group;
  }

  private createCampBuilding(): THREE.Group {
    const group = new THREE.Group();
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05, 2.2, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0xb7874f, roughness: 0.9, flatShading: true }),
    );
    platform.position.y = 0.14;
    platform.receiveShadow = true;
    group.add(platform);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 1.65, 2.3),
      new THREE.MeshStandardMaterial({ color: 0xe2bc76, roughness: 0.96, flatShading: true }),
    );
    walls.position.y = 1.1;
    walls.castShadow = true;
    group.add(walls);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.25, 1.3, 4),
      new THREE.MeshStandardMaterial({ color: 0x7f4934, roughness: 0.93, flatShading: true }),
    );
    roof.position.y = 2.55;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.1, 0.13), new THREE.MeshStandardMaterial({ color: PALETTE.woodDark }));
    door.position.set(0, 0.87, 1.2);
    group.add(door);
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
    this.scene.add(this.heart);
  }

  private createResources(): void {
    RESOURCE_SPAWNS.forEach((spawn) => {
      const root = new THREE.Group();
      const asset = spawn.kind === 'wood' || spawn.kind === 'stone'
        ? this.assets.createNature(spawn.model ?? (spawn.kind === 'wood' ? 'treeA' : 'rock'))
        : this.createMineralCluster(spawn.kind);
      root.add(asset);
      root.position.set(spawn.x, 0, spawn.z);
      root.scale.setScalar(spawn.scale);
      root.rotation.y = (spawn.x * 1.73 + spawn.z * 0.91) % (Math.PI * 2);
      this.scene.add(root);
      this.resources.push({
        kind: spawn.kind,
        root,
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
      this.scene.add(root);
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
        this.scene.add(model);
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
      post.position.set(first.x + Math.cos(angle) * 10.2, 0.38, first.z + Math.sin(angle) * 10.2);
      post.rotation.z = Math.cos(angle) * 0.08;
      post.castShadow = true;
      this.scene.add(post);
    }
  }

  private createPlayer(): THREE.AnimationMixer {
    const { root, clips } = this.assets.createFox(1.35);
    this.playerModel = root;
    this.player.add(root);
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
    return mixer;
  }

  private restoreVisualProgress(): void {
    this.refreshWorldLocks();
    this.economy.progress.workers.forEach((worker) => this.spawnWorker(worker));
    if (this.economy.progress.completed) this.activateHeart(false);
  }

  private refreshWorldLocks(): void {
    const progress = this.economy.progress;
    this.structures.forEach((entity, kind) => {
      const built = structureBuilt(progress, kind);
      const accessible = kind === 'camp'
        || (kind === 'workshop' && progress.bridgesBuilt[0])
        || (kind === 'foundry' && progress.bridgesBuilt[1])
        || (kind === 'observatory' && progress.bridgesBuilt[2]);
      entity.building.visible = built;
      entity.pad.visible = accessible && !built;
    });
    this.bridges.forEach((entity) => {
      const built = progress.bridgesBuilt[entity.index];
      const accessible = entity.index === 0 ? progress.campBuilt
        : entity.index === 1 ? progress.workshopBuilt
          : entity.index === 2 ? progress.foundryBuilt
            : progress.observatoryBuilt;
      entity.root.visible = Boolean(built);
      entity.pad.visible = accessible && !built;
    });
    this.caches.forEach((entity) => {
      entity.root.visible = !progress.cachesFound.includes(entity.definition.id);
    });
  }

  private spawnWorker(state: WorkerState): void {
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
    this.scene.add(root);
    const mixer = new THREE.AnimationMixer(model);
    const walk = findAnimation(clips, /walk|gallop/i) ?? clips[0];
    if (walk) mixer.clipAction(walk).play();
    const index = this.workers.length;
    const entity: WorkerEntity = {
      id: state.id,
      root,
      marker,
      mixer,
      task: state.task,
      level: state.level,
      routeStart: vec(0, 0),
      routeEnd: vec(0, 0),
      offset: index * 1.37,
      lastDelivery: 0,
    };
    this.workers.push(entity);
    this.syncWorker(entity, state, true);
  }

  private syncWorker(entity: WorkerEntity, state: WorkerState, relocate: boolean): void {
    entity.task = state.task;
    entity.level = state.level;
    entity.marker.material.color.setHex(RESOURCE_COLORS[state.task]);
    entity.marker.scale.setScalar(0.9 + state.level * 0.12);
    entity.root.scale.setScalar(0.9 + state.level * 0.055);
    const matchingResources = this.resources.filter((node) => node.kind === state.task);
    const workerIndex = Math.max(0, this.economy.progress.workers.findIndex((worker) => worker.id === state.id));
    const target = matchingResources[workerIndex % Math.max(1, matchingResources.length)];
    const hub = state.task === 'copper'
      ? STRUCTURES.find((item) => item.kind === 'foundry')
      : state.task === 'crystal'
        ? STRUCTURES.find((item) => item.kind === 'observatory')
        : target && target.root.position.z < -11
          ? STRUCTURES.find((item) => item.kind === 'workshop')
          : STRUCTURES.find((item) => item.kind === 'camp');
    const lateral = ((workerIndex % 3) - 1) * 0.55;
    entity.routeStart.set((hub?.x ?? 0) + lateral, 0, (hub?.z ?? 0) + 1 + (workerIndex % 2) * 0.45);
    entity.routeEnd.copy(target?.root.position ?? vec(0, 4)).add(new THREE.Vector3(lateral * 0.25, 0, 0.4));
    entity.lastDelivery = Math.floor((this.worldTime + entity.offset) / getWorkerCycleSeconds(state.level));
    if (relocate) entity.root.position.copy(entity.routeStart);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const rawDelta = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;
    this.fpsAverage += ((1 / rawDelta) - this.fpsAverage) * 0.05;
    this.worldTime += rawDelta;
    this.updateAmbient(rawDelta);
    if (this.active) this.updateGame(rawDelta);
    this.playerMixer.update(rawDelta);
    this.workers.forEach((worker) => worker.mixer.update(rawDelta));
    this.updateParticles(rawDelta);
    this.updateCamera(rawDelta);
    this.updateDiagnostics();
    this.renderer.render(this.scene, this.camera);
  };

  private updateGame(delta: number): void {
    this.economy.tick(delta);
    this.input.updateKeyboard();
    if (!this.managementOpen) {
      this.updatePlayer(delta);
      this.interaction = this.findInteraction();
      this.updateInteractionUI(this.interaction);
      this.handleAction(delta);
    }
    this.updateResources(delta);
    this.updateWorkers();

    this.saveCooldown -= delta;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = 4;
      this.save();
    }
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
    const candidate = this.player.position.clone().addScaledVector(direction, PLAYER_SPEED * magnitude * delta);
    if (this.isWalkable(candidate)) this.player.position.copy(candidate);
    const desiredRotation = Math.atan2(direction.x, direction.z);
    let difference = desiredRotation - this.player.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    this.player.rotation.y += difference * (1 - Math.exp(-12 * delta));
    this.playPlayerAction('walk');
  }

  private isWalkable(position: THREE.Vector3): boolean {
    const onIsland = ISLANDS.some((island) => Math.hypot(position.x - island.x, position.z - island.z) <= island.radius - 0.42);
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
        node.respawn -= delta;
        node.currentScale = THREE.MathUtils.damp(node.currentScale, 0, 10, delta);
        node.root.scale.setScalar(node.currentScale);
        if (node.currentScale < 0.025) node.root.visible = false;
        if (node.respawn <= 0) {
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

  private updateWorkers(): void {
    this.workers.forEach((entity) => {
      const state = this.economy.progress.workers.find((worker) => worker.id === entity.id);
      if (!state) return;
      if (state.task !== entity.task || state.level !== entity.level) this.syncWorker(entity, state, state.task !== entity.task);
      const cycleDuration = getWorkerCycleSeconds(state.level);
      const shifted = this.worldTime + entity.offset;
      const cycle = Math.floor(shifted / cycleDuration);
      const phase = (shifted % cycleDuration) / cycleDuration;
      const outward = phase < 0.38;
      const gathering = phase >= 0.38 && phase < 0.58;
      const returning = phase >= 0.58 && phase < 0.92;
      const t = outward ? phase / 0.38 : gathering ? 1 : returning ? 1 - (phase - 0.58) / 0.34 : 0;
      const smooth = t * t * (3 - 2 * t);
      entity.root.position.lerpVectors(entity.routeStart, entity.routeEnd, smooth);
      const target = outward || gathering ? entity.routeEnd : entity.routeStart;
      const dx = target.x - entity.root.position.x;
      const dz = target.z - entity.root.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.01) entity.root.rotation.y = Math.atan2(dx, dz);
      entity.root.rotation.z = gathering ? Math.sin(this.worldTime * 11) * 0.06 : entity.root.rotation.z * 0.85;

      if (cycle > entity.lastDelivery) {
        entity.lastDelivery = cycle;
        const amount = getWorkerYield(state.level);
        this.economy.add(state.task, amount);
        this.ui.update(this.economy.progress);
        this.spawnParticles(entity.routeStart.clone().setY(0.8), state.task, 4 + state.level * 2);
        this.save();
      }
    });
  }

  private findInteraction(): Interaction | null {
    const position = this.player.position;
    const near = (target: THREE.Vector3, distance: number): boolean => position.distanceToSquared(target) <= distance * distance;
    for (const entity of this.structures.values()) {
      if (entity.pad.visible && near(entity.pad.position, entity.definition.radius + 1.15)) return { type: 'structure', entity };
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
      this.ui.setContext(`${label} · ${interaction.node.amount}/${interaction.node.capacity}`, 'RÉCOLTER', RESOURCE_ICONS[interaction.node.kind]);
      return;
    }
    if (interaction.type === 'structure') {
      const { kind } = interaction.entity.definition;
      this.setCostContext(STRUCTURE_COPY[kind].built, STRUCTURE_COSTS[kind], 'BÂTIR', kind === 'camp' ? '⌂' : kind === 'observatory' ? '✦' : '▣');
      return;
    }
    if (interaction.type === 'bridge') {
      const { index, definition } = interaction.entity;
      const cost = BRIDGE_COSTS[index];
      if (!cost) return;
      const requirementMet = this.economy.bridgeRequirementsMet(index);
      const suffix = requirementMet ? '' : ` · ${formatBridgeRequirement(this.economy.progress, index)}`;
      this.ui.setContext(`${definition.name} · ${formatCost(cost)}${suffix}`, 'OUVRIR', '═', requirementMet && this.economy.canAfford(cost));
      return;
    }
    if (interaction.type === 'cache') {
      this.ui.setContext(`Cache d’exploration · +${formatCost(interaction.entity.definition.reward)}`, 'OUVRIR', '✦');
      return;
    }
    const ready = Economy.finalRequirementsMet(this.economy.progress);
    this.ui.setContext(
      ready ? `Éveiller le Cœur · ${formatCost(FINAL_COST)}` : 'Cœur scellé · 8 travailleurs · 4 métiers · 12 niveaux',
      'ÉVEILLER',
      '✦',
      ready && this.economy.canAfford(FINAL_COST),
    );
  }

  private setCostContext(title: string, cost: Cost, label: string, icon: string): void {
    this.ui.setContext(`${title} · ${formatCost(cost)}`, label, icon, this.economy.canAfford(cost));
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

    if (this.interaction.type === 'structure') {
      const { kind } = this.interaction.entity.definition;
      if (this.economy.buildStructure(kind)) {
        this.interaction.entity.building.visible = true;
        this.interaction.entity.building.scale.setScalar(0.08);
        this.interaction.entity.building.userData.growing = true;
        this.ui.toast(STRUCTURE_COPY[kind].toast);
        this.spawnParticles(this.interaction.entity.building.position.clone().setY(1.2), kind === 'foundry' ? 'copper' : kind === 'observatory' ? 'crystal' : 'wood', 20);
        this.changed();
      } else this.showMissing(STRUCTURE_COSTS[kind]);
      return;
    }
    if (this.interaction.type === 'bridge') {
      const { index, root, definition } = this.interaction.entity;
      const bridgeCost = BRIDGE_COSTS[index];
      if (!bridgeCost) return;
      if (this.economy.buildBridge(index)) {
        root.visible = true;
        root.scale.y = 0.05;
        root.userData.growingBridge = true;
        this.ui.toast(`${definition.name} terminé · une nouvelle île est accessible !`);
        this.spawnParticles(this.interaction.entity.start.clone().lerp(this.interaction.entity.end, 0.5).setY(0.7), index >= 2 ? 'crystal' : 'stone', 26);
        this.changed();
      } else if (!this.economy.bridgeRequirementsMet(index)) {
        this.ui.toast(formatBridgeRequirement(this.economy.progress, index));
      } else this.showMissing(bridgeCost);
      return;
    }
    if (this.interaction.type === 'cache') {
      const { definition, root } = this.interaction.entity;
      if (this.economy.findCache(definition.id, definition.reward)) {
        root.visible = false;
        this.ui.toast(`Cache découverte · +${formatCost(definition.reward)}`);
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
      } else this.showMissing(FINAL_COST);
    }
  }

  private harvest(node: ResourceNode): void {
    if (node.amount <= 0) return;
    node.amount -= 1;
    node.pulse = 0.22;
    this.lastHarvestedNode = node;
    this.economy.add(node.kind, 1);
    const height = node.kind === 'wood' ? 1.4 : node.kind === 'crystal' ? 1 : 0.7;
    this.spawnParticles(node.root.position.clone().setY(height), node.kind, 7);
    if (node.amount <= 0) {
      node.respawn = node.respawnSeconds;
      this.ui.toast(node.kind === 'wood' ? 'Arbre épuisé · il repousse bientôt' : `${RESOURCE_LABELS[node.kind]} épuisé · le filon se reforme`);
    }
    this.ui.update(this.economy.progress);
    this.save();
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
        object.position.y = 3.35 + Math.sin(this.worldTime * 1.9) * 0.08;
        object.rotation.y += delta * 0.65;
      }
      if (object.userData.growing) {
        const next = THREE.MathUtils.damp(object.scale.x, 1, 7, delta);
        object.scale.setScalar(next);
        if (next > 0.995) object.userData.growing = false;
      }
      if (object.userData.growingBridge) {
        object.scale.y = THREE.MathUtils.damp(object.scale.y, 1, 7, delta);
        if (object.scale.y > 0.995) object.userData.growingBridge = false;
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

  private updateCamera(delta: number): void {
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
    this.diagnostics.chapter = getChapter(progress);
    this.diagnostics.cacheFound = progress.cachesFound.includes('main-cache');
    this.diagnostics.completed = progress.completed;
    this.diagnostics.crewOpen = this.managementOpen;
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
