import { describe, expect, it } from 'vitest';
import {
  Economy,
  chooseAutoRegulationMove,
  getBridgeCost,
  getCycleMultiplier,
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

describe('Economy v3', () => {
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
    expect(economy.progress.knowledge).toBe(10);
  });

  it('persiste les métiers et les niveaux', () => {
    const economy = richEconomy({ campBuilt: true, workshopBuilt: true });
    const worker = economy.hireWorker()!;
    economy.assignWorker(worker.id, 'stone');
    economy.upgradeWorker(worker.id);
    const restored = Economy.restore(economy.serialize());
    expect(restored.progress.workers[0]).toMatchObject({ id: worker.id, task: 'stone', level: 2 });
  });

  it('migre la petite campagne v1 vers le premier pont de la v3', () => {
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
    expect(restored.progress).toMatchObject({ version: 3, wood: 17, stone: 13, campBuilt: true, completed: false, knowledge: 2 });
    expect(restored.progress.bridgesBuilt).toEqual([true, false, false, false]);
    expect(restored.progress.workers.map((worker) => worker.task)).toEqual(['wood', 'stone']);
    expect(restored.progress.cachesFound).toContain('main-cache');
  });

  it('ignore une sauvegarde cassée', () => {
    expect(Economy.restore('{nope').progress).toMatchObject({ wood: 0, workers: [], completed: false });
  });

  it('migre une campagne v2 terminée avec ses dix points de Savoir', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 2,
      wood: 20,
      stone: 20,
      copper: 20,
      crystal: 20,
      campBuilt: true,
      workshopBuilt: true,
      foundryBuilt: true,
      observatoryBuilt: true,
      bridgesBuilt: [true, true, true, true],
      cachesFound: [],
      workers: [],
      completed: true,
      elapsedSeconds: 600,
    }));
    expect(restored.progress).toMatchObject({ version: 3, completed: true, knowledge: 10, rebirths: 0 });
    expect(restored.progress.cycleMilestones).toHaveLength(9);
  });

  it('fait respecter les prérequis de l’arbre Intelligence', () => {
    const economy = new Economy({ knowledge: 10 });
    expect(economy.unlockSkill('auto_regulation')).toBe(false);
    expect(economy.unlockSkill('trail_sense')).toBe(true);
    expect(economy.unlockSkill('optimal_routes')).toBe(true);
    expect(economy.unlockSkill('forecasting')).toBe(true);
    expect(economy.unlockSkill('auto_regulation')).toBe(true);
    expect(economy.progress.knowledge).toBe(0);
    expect(economy.setAutoRegulation(true)).toBe(true);
  });

  it('conserve les talents et le Savoir lors d’une Nouvelle Marée', () => {
    const economy = new Economy({
      completed: true,
      knowledge: 10,
      skills: ['tide_stride', 'cache_instinct', 'frugal_plans', 'tidal_memory'],
      wood: 91,
      workers: [{ id: 'worker-1', name: 'Milo', task: 'wood', level: 2 }],
    });
    const reward = economy.rebirth();
    expect(reward).toBe(3);
    expect(economy.progress).toMatchObject({ version: 3, completed: false, rebirths: 1, knowledge: 13, wood: 16, stone: 11 });
    expect(economy.progress.skills).toContain('tidal_memory');
    expect(economy.progress.workers).toEqual([]);
    expect(getCycleMultiplier(economy.progress)).toBeCloseTo(1.22);
    expect(getBridgeCost(economy.progress, 0)!.wood).toBeGreaterThan(22);
  });

  it('réaffecte automatiquement un métier excédentaire vers la pénurie', () => {
    const workers = [
      { id: 'worker-1', name: 'Milo', task: 'wood' as const, level: 2 as const },
      { id: 'worker-2', name: 'Nila', task: 'wood' as const, level: 1 as const },
      { id: 'worker-3', name: 'Sève', task: 'wood' as const, level: 1 as const },
      { id: 'worker-4', name: 'Roc', task: 'stone' as const, level: 2 as const },
      { id: 'worker-5', name: 'Pollen', task: 'stone' as const, level: 1 as const },
      { id: 'worker-6', name: 'Lune', task: 'copper' as const, level: 1 as const },
      { id: 'worker-7', name: 'Braise', task: 'crystal' as const, level: 1 as const },
      { id: 'worker-8', name: 'Azur', task: 'crystal' as const, level: 1 as const },
    ];
    const economy = new Economy({
      wood: 500,
      stone: 500,
      copper: 0,
      crystal: 500,
      campBuilt: true,
      workshopBuilt: true,
      foundryBuilt: true,
      observatoryBuilt: true,
      bridgesBuilt: [true, true, true, true],
      workers,
    });
    expect(chooseAutoRegulationMove(economy.progress)).toMatchObject({ from: 'wood', to: 'copper' });
  });
});
