import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type NatureKind = 'treeA' | 'treeB' | 'rock' | 'bush' | 'grass';
export type BuildingKind =
  | 'camp'
  | 'workshop'
  | 'foundry'
  | 'observatory'
  | 'storage'
  | 'timberReserve'
  | 'towingPaths'
  | 'sharedWarehouse'
  | 'communalSawmill'
  | 'shoreWalls'
  | 'ordersOffice'
  | 'copperWinches'
  | 'haulingRails'
  | 'maintenanceYard'
  | 'crystalBeacons'
  | 'prismaticReservoir'
  | 'unityLighthouse';

const NATURE_PATHS: Record<NatureKind, string> = {
  treeA: 'assets/third-party/nature/Tree1.glb',
  treeB: 'assets/third-party/nature/Tree3.glb',
  rock: 'assets/third-party/nature/Rock1.glb',
  bush: 'assets/third-party/nature/Bush2.glb',
  grass: 'assets/third-party/nature/Grass2.glb',
};

const BUILDING_PATHS: Record<BuildingKind, string> = {
  camp: 'assets/third-party/kaykit-buildings/building_home_B_green.gltf',
  workshop: 'assets/third-party/kaykit-buildings/building_lumbermill_green.gltf',
  foundry: 'assets/third-party/kaykit-buildings/building_blacksmith_red.gltf',
  observatory: 'assets/third-party/kaykit-buildings/building_tower_B_blue.gltf',
  // building_grain est volontairement évité ici : son emprise très plate,
  // normalisée par la hauteur, produisait une gigantesque dalle « fromage ».
  storage: 'assets/third-party/kaykit-buildings/building_home_A_yellow.gltf',
  timberReserve: 'assets/third-party/kaykit-buildings/building_market_yellow.gltf',
  towingPaths: 'assets/third-party/kaykit-buildings/building_tower_base_green.gltf',
  sharedWarehouse: 'assets/third-party/kaykit-buildings/building_home_A_yellow.gltf',
  communalSawmill: 'assets/third-party/kaykit-buildings/building_lumbermill_yellow.gltf',
  shoreWalls: 'assets/third-party/kaykit-buildings/building_tower_A_green.gltf',
  ordersOffice: 'assets/third-party/kaykit-buildings/building_home_A_blue.gltf',
  copperWinches: 'assets/third-party/kaykit-buildings/building_mine_red.gltf',
  haulingRails: 'assets/third-party/kaykit-buildings/building_archeryrange_red.gltf',
  maintenanceYard: 'assets/third-party/kaykit-buildings/building_barracks_red.gltf',
  crystalBeacons: 'assets/third-party/kaykit-buildings/building_tower_A_blue.gltf',
  prismaticReservoir: 'assets/third-party/kaykit-buildings/building_well_blue.gltf',
  unityLighthouse: 'assets/third-party/kaykit-buildings/building_tower_B_yellow.gltf',
};

const prepareMeshes = (root: THREE.Object3D, receiveShadow = true): void => {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = receiveShadow;
    node.frustumCulled = true;
  });
};

export class AssetLibrary {
  private readonly loader = new GLTFLoader();
  private readonly nature = new Map<NatureKind, THREE.Object3D>();
  private readonly buildings = new Map<BuildingKind, THREE.Object3D>();
  private fox: GLTF | null = null;

  get loadedCount(): number {
    return (this.fox ? 1 : 0) + this.nature.size + this.buildings.size;
  }

  async load(onProgress?: (progress: number, label: string) => void): Promise<void> {
    const entries: Array<[string, string]> = [
      ['renards', 'assets/third-party/fox/Fox.glb'],
      ...Object.entries(NATURE_PATHS),
      ...Object.entries(BUILDING_PATHS).map(([kind, path]) => [`building:${kind}`, path] as [string, string]),
    ];
    let done = 0;

    await Promise.all(entries.map(async ([key, path]) => {
      const url = `${import.meta.env.BASE_URL}${path}`;
      const gltf = await this.loader.loadAsync(url);
      if (key === 'renards') {
        this.fox = gltf;
        prepareMeshes(gltf.scene, false);
      } else if (key.startsWith('building:')) {
        const kind = key.slice('building:'.length) as BuildingKind;
        prepareMeshes(gltf.scene);
        this.buildings.set(kind, gltf.scene);
      } else {
        const kind = key as NatureKind;
        prepareMeshes(gltf.scene);
        this.nature.set(kind, gltf.scene);
      }
      done += 1;
      onProgress?.(done / entries.length, key);
    }));
  }

  createNature(kind: NatureKind): THREE.Object3D {
    const source = this.nature.get(kind);
    if (!source) throw new Error(`Asset nature absent: ${kind}`);
    const copy = source.clone(true);
    prepareMeshes(copy);
    return copy;
  }

  createBuilding(kind: BuildingKind, height: number): THREE.Object3D {
    const source = this.buildings.get(kind);
    if (!source) throw new Error(`Asset bâtiment absent: ${kind}`);
    const root = source.clone(true);
    prepareMeshes(root);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const sourceHeight = Math.max(0.001, bounds.max.y - bounds.min.y);
    root.scale.setScalar(height / sourceHeight);
    root.updateMatrixWorld(true);
    const normalized = new THREE.Box3().setFromObject(root);
    root.position.y -= normalized.min.y;
    root.position.x -= (normalized.min.x + normalized.max.x) / 2;
    root.position.z -= (normalized.min.z + normalized.max.z) / 2;
    return root;
  }

  createFox(height = 1.3): { root: THREE.Object3D; clips: THREE.AnimationClip[] } {
    if (!this.fox) throw new Error('Asset renard absent.');
    const root = SkeletonUtils.clone(this.fox.scene);
    prepareMeshes(root, false);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const sourceHeight = Math.max(0.001, bounds.max.y - bounds.min.y);
    root.scale.setScalar(height / sourceHeight);
    root.updateMatrixWorld(true);
    const normalized = new THREE.Box3().setFromObject(root);
    root.position.y -= normalized.min.y;
    // Le renard est déjà orienté vers +Z, comme les groupes qui pilotent son déplacement.
    return { root, clips: this.fox.animations };
  }
}

export const findAnimation = (clips: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | undefined =>
  clips.find((clip) => pattern.test(clip.name));
