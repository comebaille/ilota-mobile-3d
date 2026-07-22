import * as THREE from 'three';
import { AssetLibrary, findAnimation, type NatureKind } from './assets';
import { COSTS, Economy, formatCost, type Cost, type ResourceKind, type WorkerKind } from './economy';
import { InputController } from './input';
import { GameUI } from '../ui/GameUI';

interface ResourceNode {
  kind: ResourceKind;
  root: THREE.Group;
  amount: number;
  readonly capacity: number;
  readonly baseScale: number;
  respawn: number;
  pulse: number;
}

interface WorkerEntity {
  kind: WorkerKind;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  routeStart: THREE.Vector3;
  routeEnd: THREE.Vector3;
  offset: number;
  lastDelivery: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

type Interaction =
  | { type: 'resource'; node: ResourceNode }
  | { type: 'camp' }
  | { type: 'woodWorker' }
  | { type: 'stoneWorker' }
  | { type: 'bridge' }
  | { type: 'cache' }
  | { type: 'beacon' };

interface Diagnostics {
  ready: boolean;
  active: boolean;
  assetsLoaded: number;
  wood: number;
  stone: number;
  campBuilt: boolean;
  workers: number;
  bridgeBuilt: boolean;
  cacheFound: boolean;
  completed: boolean;
  player: { x: number; z: number };
  facingAlignment: number;
  fps: number;
}

const SAVE_KEY = 'ilota-save-v1';
const MAIN_RADIUS = 10.8;
const SECOND_CENTER_Z = -20;
const SECOND_RADIUS = 6.7;
const PLAYER_SPEED = 5.2;

const PALETTE = {
  sea: 0x164f56,
  deepSea: 0x0e3842,
  grass: 0x7fa655,
  grassLight: 0xa9c769,
  earth: 0x7a6543,
  sand: 0xd9c477,
  wood: 0x9d6337,
  woodDark: 0x5c3a2b,
  stone: 0x829092,
  cream: 0xfff1c2,
  gold: 0xf2b958,
};

const vec = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);

export class IlotaGame {
  readonly input: InputController;
  readonly diagnostics: Diagnostics;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly player = new THREE.Group();
  private playerModel: THREE.Object3D | null = null;
  private readonly playerMixer: THREE.AnimationMixer;
  private readonly playerActions = new Map<string, THREE.AnimationAction>();
  private readonly lastMoveDirection = new THREE.Vector3(0, 0, 1);
  private readonly facingDirection = new THREE.Vector3(0, 0, 1);
  private currentPlayerAction = '';
  private readonly resources: ResourceNode[] = [];
  private readonly workers: WorkerEntity[] = [];
  private readonly particles: Particle[] = [];
  private readonly bridge = new THREE.Group();
  private readonly camp = new THREE.Group();
  private readonly campPad = new THREE.Group();
  private readonly woodWorkerPad = new THREE.Group();
  private readonly stoneWorkerPad = new THREE.Group();
  private readonly bridgePad = new THREE.Group();
  private readonly cache = new THREE.Group();
  private readonly beaconLight = new THREE.PointLight(PALETTE.gold, 0, 11, 2);
  private readonly beaconCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: 0x7b4d10, emissiveIntensity: 1.8, roughness: 0.25 }),
  );
  private readonly clock = new THREE.Clock();
  private active = false;
  private interaction: Interaction | null = null;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));

    this.input = new InputController(ui.joystick, ui.joystickKnob, ui.actionButton);
    this.setupScene();
    this.createWorld();
    this.playerMixer = this.createPlayer();
    this.restoreVisualProgress();
    this.resize();
    window.addEventListener('resize', this.resize);

    this.diagnostics = {
      ready: true,
      active: false,
      assetsLoaded: 6,
      wood: economy.progress.wood,
      stone: economy.progress.stone,
      campBuilt: economy.progress.campBuilt,
      workers: Number(economy.progress.woodWorker) + Number(economy.progress.stoneWorker),
      bridgeBuilt: economy.progress.bridgeBuilt,
      cacheFound: economy.progress.cacheFound,
      completed: economy.progress.completed,
      player: { x: this.player.position.x, z: this.player.position.z },
      facingAlignment: 1,
      fps: 60,
    };
    this.ui.update(economy.progress);
    this.animate();
  }

  start(): void {
    this.active = true;
    this.input.enabled = true;
    this.victoryShown = false;
    this.clock.getDelta();
  }

  continueAfterVictory(): void {
    this.ui.hideVictory();
    this.active = true;
    this.input.enabled = true;
  }

  resetProgress(): void {
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x8cc7c6);
    this.scene.fog = new THREE.Fog(0x8cc7c6, 30, 72);
    const hemisphere = new THREE.HemisphereLight(0xd9f3f1, 0x725f42, 2.2);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffe7b1, 3.4);
    sun.position.set(-15, 23, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
  }

  private createWorld(): void {
    this.createWater();
    this.createIsland(0, 0, MAIN_RADIUS, 0);
    this.createIsland(0, SECOND_CENTER_Z, SECOND_RADIUS, 0.1);
    this.createBridge();
    this.createPadsAndBuildings();
    this.createBeacon();
    this.createResources();
    this.decorateIsland();
  }

  private createWater(): void {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150, 1, 1),
      new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.34, metalness: 0.08 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.08;
    water.receiveShadow = true;
    water.name = 'mer';
    this.scene.add(water);

    for (let index = 0; index < 12; index += 1) {
      const ripple = new THREE.Mesh(
        new THREE.TorusGeometry(1.2 + (index % 3) * 0.38, 0.035, 5, 32),
        new THREE.MeshBasicMaterial({ color: 0xbfe0d8, transparent: true, opacity: 0.25 }),
      );
      const side = index % 2 ? -1 : 1;
      ripple.position.set(side * (13 + (index % 4) * 5), -1.96, 9 - index * 3.4);
      ripple.rotation.x = Math.PI / 2;
      ripple.userData.phase = index * 0.61;
      ripple.userData.ripple = true;
      this.scene.add(ripple);
    }
  }

  private createIsland(x: number, z: number, radius: number, rotation: number): void {
    const sideMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.earth, roughness: 0.96, flatShading: true });
    const topMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.92, flatShading: true });
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.08, 2.1, 36, 1),
      [sideMaterial, topMaterial, sideMaterial],
    );
    island.position.set(x, -1.05, z);
    island.rotation.y = rotation;
    island.receiveShadow = true;
    island.castShadow = true;
    this.scene.add(island);

    const shore = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.18, radius + 0.48, 0.3, 36),
      new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1, flatShading: true }),
    );
    shore.position.set(x, -0.2, z);
    shore.receiveShadow = true;
    this.scene.add(shore);
  }

  private createBridge(): void {
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4028, roughness: 1 });
    const plankMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.88, flatShading: true });
    for (let index = 0; index < 9; index += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.2, 0.5), plankMaterial);
      plank.position.set(Math.sin(index * 1.6) * 0.09, Math.sin(index * 0.7) * 0.06, -10.5 - index * 0.48);
      plank.rotation.y = Math.sin(index * 1.23) * 0.025;
      plank.castShadow = true;
      plank.receiveShadow = true;
      this.bridge.add(plank);
    }
    [-1.68, 1.68].forEach((x) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.4, 7), ropeMaterial);
      rope.rotation.x = Math.PI / 2;
      rope.position.set(x, 0.35, -12.42);
      this.bridge.add(rope);
    });
    this.bridge.visible = false;
    this.scene.add(this.bridge);
  }

  private createPadsAndBuildings(): void {
    this.campPad.position.set(0, 0.05, 0);
    this.campPad.add(this.createBuildPad(1.65, PALETTE.gold));
    this.scene.add(this.campPad);

    this.woodWorkerPad.position.set(-3.1, 0.04, -2.4);
    this.woodWorkerPad.add(this.createBuildPad(1.05, 0xe29449));
    this.scene.add(this.woodWorkerPad);

    this.stoneWorkerPad.position.set(3.1, 0.04, -2.4);
    this.stoneWorkerPad.add(this.createBuildPad(1.05, 0x9faeaa));
    this.scene.add(this.stoneWorkerPad);

    this.bridgePad.position.set(0, 0.04, -9.3);
    this.bridgePad.add(this.createBuildPad(1.25, 0x69a6a1));
    this.scene.add(this.bridgePad);

    this.camp.add(this.createCampBuilding());
    this.camp.visible = false;
    this.scene.add(this.camp);

    this.cache.position.set(7.2, 0.05, 4.5);
    this.cache.add(this.createCache());
    this.scene.add(this.cache);
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
    walls.receiveShadow = true;
    group.add(walls);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.25, 1.3, 4),
      new THREE.MeshStandardMaterial({ color: 0x7f4934, roughness: 0.93, flatShading: true }),
    );
    roof.position.y = 2.55;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 1.1, 0.13),
      new THREE.MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 1 }),
    );
    door.position.set(0, 0.87, 1.2);
    group.add(door);

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.7),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, side: THREE.DoubleSide, roughness: 0.75 }),
    );
    banner.position.set(0, 1.65, 1.27);
    group.add(banner);
    return group;
  }

  private createCache(): THREE.Group {
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

  private createBeacon(): void {
    const beacon = new THREE.Group();
    beacon.position.set(0, 0, SECOND_CENTER_Z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.65, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.92, flatShading: true }),
    );
    base.position.y = 0.28;
    base.castShadow = true;
    beacon.add(base);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 1, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xc0b88e, roughness: 0.9, flatShading: true }),
    );
    tower.position.y = 2.2;
    tower.castShadow = true;
    beacon.add(tower);
    this.beaconCore.position.y = 4.45;
    this.beaconCore.castShadow = true;
    beacon.add(this.beaconCore);
    this.beaconLight.position.y = 4.4;
    beacon.add(this.beaconLight);
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.12, 8, 32),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.35, roughness: 0.4 }),
    );
    crown.position.y = 4.45;
    crown.rotation.x = Math.PI / 2;
    crown.userData.beaconRing = true;
    beacon.add(crown);
    this.scene.add(beacon);
  }

  private createResources(): void {
    const treePositions: Array<[number, number, NatureKind]> = [
      [0, 6.2, 'treeA'], [-5.8, 4.5, 'treeB'], [-7.6, 0.6, 'treeA'], [-5.6, -5.2, 'treeB'], [5.1, 6.1, 'treeA'], [-1.6, -7.2, 'treeB'],
    ];
    treePositions.forEach(([x, z, model], index) => this.addResource('wood', model, x, z, 5, 0.78 + (index % 2) * 0.08));

    const rockPositions: Array<[number, number]> = [[6.2, 2.5], [7.2, -2.5], [4.6, -6.2], [-8, -4.2], [1.9, 7.8]];
    rockPositions.forEach(([x, z], index) => this.addResource('stone', 'rock', x, z, 4, 0.78 + (index % 3) * 0.08));
  }

  private addResource(kind: ResourceKind, model: NatureKind, x: number, z: number, capacity: number, scale: number): void {
    const root = new THREE.Group();
    const asset = this.assets.createNature(model);
    asset.scale.setScalar(scale);
    root.add(asset);
    root.position.set(x, 0, z);
    this.scene.add(root);
    this.resources.push({ kind, root, amount: capacity, capacity, baseScale: 1, respawn: 0, pulse: 0 });
  }

  private decorateIsland(): void {
    const decoration: Array<[NatureKind, number, number, number]> = [
      ['bush', -3.5, 6.9, 0.7], ['grass', -2.1, 5.8, 0.8], ['grass', 3.5, 7.2, 0.72],
      ['bush', 8.3, 1, 0.75], ['grass', 7.9, -5.1, 0.88], ['bush', -8.2, 3.2, 0.8],
      ['grass', -3.3, -8.3, 0.75], ['bush', 5.8, -7.5, 0.7],
      ['treeA', -4.1, SECOND_CENTER_Z - 1.8, 0.74], ['treeB', 4.2, SECOND_CENTER_Z + 1, 0.7],
      ['rock', -3.8, SECOND_CENTER_Z + 2.7, 0.7], ['bush', 2.4, SECOND_CENTER_Z - 3.8, 0.72],
      ['grass', -1.8, SECOND_CENTER_Z + 4.2, 0.8], ['grass', 3.3, SECOND_CENTER_Z + 3.5, 0.8],
    ];
    decoration.forEach(([kind, x, z, scale], index) => {
      const model = this.assets.createNature(kind);
      model.position.set(x, 0, z);
      model.rotation.y = index * 1.79;
      model.scale.setScalar(scale);
      this.scene.add(model);
    });

    for (let index = 0; index < 9; index += 1) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 0.75, 6),
        new THREE.MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 1 }),
      );
      const angle = (index / 9) * Math.PI * 2;
      post.position.set(Math.cos(angle) * 10.2, 0.38, Math.sin(angle) * 10.2);
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
    const progress = this.economy.progress;
    this.camp.visible = progress.campBuilt;
    this.campPad.visible = !progress.campBuilt;
    this.woodWorkerPad.visible = progress.campBuilt && !progress.woodWorker;
    this.stoneWorkerPad.visible = progress.campBuilt && !progress.stoneWorker;
    this.bridgePad.visible = progress.woodWorker && progress.stoneWorker && !progress.bridgeBuilt;
    this.bridge.visible = progress.bridgeBuilt;
    this.cache.visible = !progress.cacheFound;
    if (progress.woodWorker) this.spawnWorker('wood');
    if (progress.stoneWorker) this.spawnWorker('stone');
    if (progress.completed) this.activateBeacon(false);
  }

  private spawnWorker(kind: WorkerKind): void {
    if (this.workers.some((worker) => worker.kind === kind)) return;
    const { root: model, clips } = this.assets.createFox(0.82);
    const root = new THREE.Group();
    root.add(model);
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.055, 6, 18),
      new THREE.MeshStandardMaterial({ color: kind === 'wood' ? 0xe29449 : 0xa8b9b5, roughness: 0.6 }),
    );
    marker.position.y = 0.72;
    marker.rotation.x = Math.PI / 2;
    root.add(marker);
    this.scene.add(root);

    const mixer = new THREE.AnimationMixer(model);
    const walk = findAnimation(clips, /walk|gallop/i) ?? clips[0];
    if (walk) mixer.clipAction(walk).play();
    const offset = kind === 'wood' ? 0 : 3.7;
    const worker: WorkerEntity = {
      kind,
      root,
      mixer,
      routeStart: vec(kind === 'wood' ? -1.1 : 1.1, 0.8),
      routeEnd: kind === 'wood' ? vec(-5.8, 4.1) : vec(6.1, 2.1),
      offset,
      lastDelivery: Math.floor((this.worldTime + offset) / 8),
    };
    root.position.copy(worker.routeStart);
    this.workers.push(worker);
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
    this.updatePlayer(delta);
    this.updateResources(delta);
    this.updateWorkers();
    this.interaction = this.findInteraction();
    this.updateInteractionUI(this.interaction);
    this.handleAction(delta);

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
    const onMain = Math.hypot(position.x, position.z) <= MAIN_RADIUS - 0.42;
    const onSecond = Math.hypot(position.x, position.z - SECOND_CENTER_Z) <= SECOND_RADIUS - 0.42;
    const onBridge = this.economy.progress.bridgeBuilt && Math.abs(position.x) <= 1.45 && position.z <= -9.5 && position.z >= -15.2;
    return onMain || onSecond || onBridge;
  }

  private updateResources(delta: number): void {
    this.resources.forEach((node) => {
      if (node.amount <= 0) {
        node.respawn -= delta;
        if (node.respawn <= 0) {
          node.amount = node.capacity;
          node.root.visible = true;
          node.root.scale.setScalar(node.baseScale);
        }
        return;
      }
      node.pulse = Math.max(0, node.pulse - delta);
      const bounce = node.pulse > 0 ? 1 + Math.sin(node.pulse * 34) * 0.08 : 1;
      node.root.scale.setScalar(node.baseScale * bounce);
    });
  }

  private updateWorkers(): void {
    const cycleDuration = 8;
    this.workers.forEach((worker) => {
      const shifted = this.worldTime + worker.offset;
      const cycle = Math.floor(shifted / cycleDuration);
      const phase = (shifted % cycleDuration) / cycleDuration;
      const outward = phase < 0.38;
      const gathering = phase >= 0.38 && phase < 0.58;
      const returning = phase >= 0.58 && phase < 0.92;
      const t = outward ? phase / 0.38 : gathering ? 1 : returning ? 1 - (phase - 0.58) / 0.34 : 0;
      const smooth = t * t * (3 - 2 * t);
      worker.root.position.lerpVectors(worker.routeStart, worker.routeEnd, smooth);
      const target = outward || gathering ? worker.routeEnd : worker.routeStart;
      const dx = target.x - worker.root.position.x;
      const dz = target.z - worker.root.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.01) worker.root.rotation.y = Math.atan2(dx, dz);
      if (gathering) worker.root.rotation.z = Math.sin(this.worldTime * 11) * 0.06;
      else worker.root.rotation.z *= 0.85;

      if (cycle > worker.lastDelivery) {
        worker.lastDelivery = cycle;
        this.economy.add(worker.kind, 2);
        this.ui.update(this.economy.progress);
        this.spawnParticles(worker.routeStart.clone().setY(0.8), worker.kind, 5);
        this.save();
      }
    });
  }

  private findInteraction(): Interaction | null {
    const position = this.player.position;
    const near = (target: THREE.Vector3, distance: number): boolean => position.distanceToSquared(target) <= distance * distance;
    const progress = this.economy.progress;

    if (!progress.campBuilt && near(this.campPad.position, 2.65)) return { type: 'camp' };
    if (progress.campBuilt && !progress.woodWorker && near(this.woodWorkerPad.position, 2.1)) return { type: 'woodWorker' };
    if (progress.campBuilt && !progress.stoneWorker && near(this.stoneWorkerPad.position, 2.1)) return { type: 'stoneWorker' };
    if (progress.woodWorker && progress.stoneWorker && !progress.bridgeBuilt && near(this.bridgePad.position, 2.25)) return { type: 'bridge' };
    if (!progress.cacheFound && near(this.cache.position, 2)) return { type: 'cache' };
    if (progress.bridgeBuilt && !progress.completed && near(vec(0, SECOND_CENTER_Z), 2.25)) return { type: 'beacon' };

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
    switch (interaction.type) {
      case 'resource':
        this.ui.setContext(
          interaction.node.kind === 'wood' ? `Arbre · ${interaction.node.amount} bois` : `Rocher · ${interaction.node.amount} pierres`,
          'RÉCOLTER',
          interaction.node.kind === 'wood' ? '⌁' : '◆',
        );
        break;
      case 'camp':
        this.setCostContext('Bâtir le camp', COSTS.camp, 'BÂTIR', '⌂');
        break;
      case 'woodWorker':
        this.setCostContext('Recruter le bûcheron', COSTS.woodWorker, 'RECRUTER', '♟');
        break;
      case 'stoneWorker':
        this.setCostContext('Recruter le mineur', COSTS.stoneWorker, 'RECRUTER', '♟');
        break;
      case 'bridge':
        this.setCostContext('Construire le pont', COSTS.bridge, 'OUVRIR', '═');
        break;
      case 'cache':
        this.ui.setContext('Cache oubliée · +3 bois et pierre', 'OUVRIR', '✦');
        break;
      case 'beacon':
        this.ui.setContext('Rallumer la balise', 'ALLUMER', '✦');
        break;
    }
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

    switch (this.interaction.type) {
      case 'camp':
        if (this.economy.buildCamp()) {
          this.camp.visible = true;
          this.camp.scale.setScalar(0.1);
          this.campPad.visible = false;
          this.woodWorkerPad.visible = true;
          this.stoneWorkerPad.visible = true;
          this.ui.toast('Camp construit ! Deux postes sont disponibles.');
          this.spawnParticles(vec(0, 0).setY(1.1), 'wood', 18);
          this.changed();
        } else this.showMissing(COSTS.camp);
        break;
      case 'woodWorker':
        if (this.economy.hire('wood')) {
          this.woodWorkerPad.visible = false;
          this.spawnWorker('wood');
          this.ui.toast('Bûcheron recruté · +2 bois par trajet');
          this.checkWorkerMilestone();
          this.changed();
        } else this.showMissing(COSTS.woodWorker);
        break;
      case 'stoneWorker':
        if (this.economy.hire('stone')) {
          this.stoneWorkerPad.visible = false;
          this.spawnWorker('stone');
          this.ui.toast('Mineur recruté · +2 pierres par trajet');
          this.checkWorkerMilestone();
          this.changed();
        } else this.showMissing(COSTS.stoneWorker);
        break;
      case 'bridge':
        if (this.economy.buildBridge()) {
          this.bridge.visible = true;
          this.bridge.scale.y = 0.05;
          this.bridgePad.visible = false;
          this.ui.toast('Le pont de la marée est ouvert !');
          this.spawnParticles(vec(0, -12.5).setY(0.7), 'stone', 24);
          this.changed();
        } else this.showMissing(COSTS.bridge);
        break;
      case 'cache':
        if (this.economy.findCache()) {
          this.cache.visible = false;
          this.ui.toast('Cache découverte · +3 bois · +3 pierres');
          this.spawnParticles(this.cache.position.clone().setY(0.8), 'wood', 12);
          this.changed();
        }
        break;
      case 'beacon':
        if (this.economy.complete()) {
          this.activateBeacon(true);
          this.ui.update(this.economy.progress);
          this.save();
          this.active = false;
          this.input.enabled = false;
          this.victoryShown = true;
          window.setTimeout(() => this.ui.showVictory(this.economy.progress), 700);
        }
        break;
      default:
        break;
    }
  }

  private harvest(node: ResourceNode): void {
    if (node.amount <= 0) return;
    node.amount -= 1;
    node.pulse = 0.22;
    this.economy.add(node.kind, 1);
    const origin = node.root.position.clone().setY(node.kind === 'wood' ? 1.4 : 0.65);
    this.spawnParticles(origin, node.kind, 7);
    if (node.amount <= 0) {
      node.root.visible = false;
      node.respawn = 7;
      this.ui.toast(node.kind === 'wood' ? 'Arbre récolté · repousse bientôt' : 'Filon vidé · se reforme bientôt');
    }
    this.ui.update(this.economy.progress);
    this.save();
  }

  private checkWorkerMilestone(): void {
    if (this.economy.progress.woodWorker && this.economy.progress.stoneWorker) this.bridgePad.visible = true;
  }

  private showMissing(cost: Cost): void {
    const missing = this.economy.missing(cost);
    const parts = [missing.wood ? `${missing.wood} bois` : '', missing.stone ? `${missing.stone} pierre${missing.stone > 1 ? 's' : ''}` : ''].filter(Boolean);
    this.ui.toast(`Il manque ${parts.join(' et ')}`);
  }

  private changed(): void {
    this.ui.update(this.economy.progress);
    this.save();
  }

  private activateBeacon(withBurst: boolean): void {
    this.beaconLight.intensity = 22;
    const material = this.beaconCore.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 4.2;
    if (withBurst) this.spawnParticles(vec(0, SECOND_CENTER_Z).setY(4.5), 'wood', 34);
  }

  private spawnParticles(origin: THREE.Vector3, kind: ResourceKind, count: number): void {
    const color = kind === 'wood' ? PALETTE.gold : 0xd9e1dc;
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
      if (object.userData.beaconRing) object.rotation.z += delta * (this.economy.progress.completed ? 1.4 : 0.22);
    });
    this.beaconCore.rotation.y += delta * (this.economy.progress.completed ? 1.8 : 0.35);
    this.beaconCore.position.y = 4.45 + Math.sin(this.worldTime * 1.6) * 0.11;
    if (this.camp.visible && this.camp.scale.x < 0.99) {
      const next = 1 - Math.exp(-delta * 7);
      this.camp.scale.lerp(new THREE.Vector3(1, 1, 1), next);
    }
    if (this.bridge.visible && this.bridge.scale.y < 0.99) this.bridge.scale.y = THREE.MathUtils.damp(this.bridge.scale.y, 1, 7, delta);
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
    const target = this.player.position.clone().add(new THREE.Vector3(0, 0.8, -1.4));
    this.camera.lookAt(target);
  }

  private save(): void {
    try {
      localStorage.setItem(SAVE_KEY, this.economy.serialize());
    } catch {
      // Une partie reste jouable lorsque le stockage privé est indisponible.
    }
  }

  private updateDiagnostics(): void {
    const progress = this.economy.progress;
    this.diagnostics.active = this.active;
    this.diagnostics.wood = progress.wood;
    this.diagnostics.stone = progress.stone;
    this.diagnostics.campBuilt = progress.campBuilt;
    this.diagnostics.workers = Number(progress.woodWorker) + Number(progress.stoneWorker);
    this.diagnostics.bridgeBuilt = progress.bridgeBuilt;
    this.diagnostics.cacheFound = progress.cacheFound;
    this.diagnostics.completed = progress.completed;
    this.diagnostics.player.x = Number(this.player.position.x.toFixed(2));
    this.diagnostics.player.z = Number(this.player.position.z.toFixed(2));
    if (this.playerModel) {
      this.playerModel.getWorldDirection(this.facingDirection);
      this.diagnostics.facingAlignment = Number(this.facingDirection.dot(this.lastMoveDirection).toFixed(3));
    }
    this.diagnostics.fps = Math.round(this.fpsAverage);
    if (this.victoryShown) this.diagnostics.active = false;
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
