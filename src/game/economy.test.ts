import { describe, expect, it } from 'vitest';
import {
  Economy,
  getTotalWorkerLevels,
  getWorkerCapacity,
  type IslandProgress,
} from './economy';

const richEconomy = (initial?: Partial<IslandProgress>): Economy => new Economy({
  wood: 999,
  stone: 999,
  copper: 999,
  crystal: 999,
  ...initial,
});

describe('Economy v2', () => {
  it('récolte quatre ressources sans produire de valeur négative', () => {
    const economy = new Economy();
    economy.add('wood', 3);
    economy.add('stone', -8);
    economy.add('copper', 2);
    economy.add('crystal', 1);
    expect(economy.progress).toMatchObject({ wood: 3, stone: 0, copper: 2, crystal: 1 });
  });

  it('augmente la capacité avec les structures successives', () => {
    const economy = richEconomy();
    expect(getWorkerCapacity(economy.progress)).toBe(0);
    expect(economy.buildStructure('camp')).toBe(true);
    expect(getWorkerCapacity(economy.progress)).toBe(3);
    economy.hireWorker();
    economy.hireWorker();
    expect(economy.buildBridge(0)).toBe(true);
    expect(economy.buildStructure('workshop')).toBe(true);
    expect(getWorkerCapacity(economy.progress)).toBe(5);
  });

  it('réaffecte un travailleur sans le remplacer', () => {
    const economy = richEconomy({ campBuilt: true });
    const worker = economy.hireWorker();
    expect(worker).not.toBeNull();
    expect(economy.assignWorker(worker!.id, 'stone')).toBe(true);
    expect(economy.progress.workers).toHaveLength(1);
    expect(economy.progress.workers[0]?.task).toBe('stone');
    expect(economy.assignWorker(worker!.id, 'copper')).toBe(false);
  });

  it('bloque les niveaux derrière l’atelier puis la fonderie', () => {
    const economy = richEconomy({ campBuilt: true });
    const worker = economy.hireWorker()!;
    expect(economy.upgradeWorker(worker.id)).toBe(false);
    economy.progress.workshopBuilt = true;
    expect(economy.upgradeWorker(worker.id)).toBe(true);
    expect(worker.level).toBe(2);
    expect(economy.upgradeWorker(worker.id)).toBe(false);
    economy.progress.foundryBuilt = true;
    expect(economy.upgradeWorker(worker.id)).toBe(true);
    expect(worker.level).toBe(3);
  });

  it('parcourt les cinq chapitres jusqu’au Cœur', () => {
    const economy = richEconomy();
    economy.buildStructure('camp');
    economy.hireWorker();
    economy.hireWorker();
    expect(economy.buildBridge(0)).toBe(true);

    expect(economy.buildStructure('workshop')).toBe(true);
    economy.hireWorker();
    economy.hireWorker();
    economy.upgradeWorker('worker-1');
    expect(economy.buildBridge(1)).toBe(true);

    expect(economy.buildStructure('foundry')).toBe(true);
    economy.hireWorker();
    economy.assignWorker('worker-5', 'copper');
    expect(economy.buildBridge(2)).toBe(true);

    expect(economy.buildStructure('observatory')).toBe(true);
    economy.hireWorker();
    economy.hireWorker();
    economy.assignWorker('worker-7', 'crystal');
    economy.upgradeWorker('worker-2');
    economy.upgradeWorker('worker-3');
    expect(getTotalWorkerLevels(economy.progress)).toBeGreaterThanOrEqual(10);
    expect(economy.buildBridge(3)).toBe(true);

    economy.hireWorker();
    economy.upgradeWorker('worker-4');
    expect(getTotalWorkerLevels(economy.progress)).toBeGreaterThanOrEqual(12);
    expect(Economy.finalRequirementsMet(economy.progress)).toBe(true);
    expect(economy.complete()).toBe(true);
    expect(economy.progress.completed).toBe(true);
  });

  it('persiste les métiers et les niveaux', () => {
    const economy = richEconomy({ campBuilt: true, workshopBuilt: true });
    const worker = economy.hireWorker()!;
    economy.assignWorker(worker.id, 'stone');
    economy.upgradeWorker(worker.id);
    const restored = Economy.restore(economy.serialize());
    expect(restored.progress.workers[0]).toMatchObject({ id: worker.id, task: 'stone', level: 2 });
  });

  it('migre la petite campagne v1 vers le premier pont de la v2', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 1,
      wood: 17,
      stone: 13,
      campBuilt: true,
      woodWorker: true,
      stoneWorker: true,
      bridgeBuilt: true,
      cacheFound: true,
      completed: true,
      elapsedSeconds: 42,
    }));
    expect(restored.progress).toMatchObject({ version: 2, wood: 17, stone: 13, campBuilt: true, completed: false });
    expect(restored.progress.bridgesBuilt).toEqual([true, false, false, false]);
    expect(restored.progress.workers.map((worker) => worker.task)).toEqual(['wood', 'stone']);
    expect(restored.progress.cachesFound).toContain('main-cache');
  });

  it('ignore une sauvegarde cassée', () => {
    expect(Economy.restore('{nope').progress).toMatchObject({ wood: 0, workers: [], completed: false });
  });
});
