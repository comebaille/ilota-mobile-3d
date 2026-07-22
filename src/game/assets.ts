import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type NatureKind = 'treeA' | 'treeB' | 'rock' | 'bush' | 'grass';

const NATURE_PATHS: Record<NatureKind, string> = {
  treeA: 'assets/third-party/nature/Tree1.glb',
  treeB: 'assets/third-party/nature/Tree3.glb',
  rock: 'assets/third-party/nature/Rock1.glb',
  bush: 'assets/third-party/nature/Bush2.glb',
  grass: 'assets/third-party/nature/Grass2.glb',
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
  private fox: GLTF | null = null;

  async load(onProgress?: (progress: number, label: string) => void): Promise<void> {
    const entries: Array<[string, string]> = [
      ['renards', 'assets/third-party/fox/Fox.glb'],
      ...Object.entries(NATURE_PATHS),
    ];
    let done = 0;

    await Promise.all(entries.map(async ([key, path]) => {
      const url = `${import.meta.env.BASE_URL}${path}`;
      const gltf = await this.loader.loadAsync(url);
      if (key === 'renards') {
        this.fox = gltf;
        prepareMeshes(gltf.scene, false);
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
    root.rotation.y = Math.PI;
    return { root, clips: this.fox.animations };
  }
}

export const findAnimation = (clips: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | undefined =>
  clips.find((clip) => pattern.test(clip.name));
