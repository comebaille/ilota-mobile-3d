import { describe, expect, it } from 'vitest';
import {
  Economy,
  ISLAND_PROJECTS,
  SKILL_DEFINITIONS,
  chooseAutoRegulationMove,
  getAutoRegulationInterval,
  getAutoRegulationMoveCount,
  getBridgeCost,
  getCycleMultiplier,
  getIslandGoal,
  getPlayerSpeed,
  getSkillRank,
  getTotalWorkerLevels,
  getWorkerCapacity,
  getWorkerYield,
  isProjectVisible,
  isSkillVisible,
  type IslandProgress,
} from './economy';

const richEconomy = (initial?: Partial<IslandProgress>): Economy => new Economy({
  wood: 9_999,
  stone: 9_999,
  copper: 9_999,
  crystal: 9_999,
  ...initial,
});

const completeProjectsUntil = (economy: Economy, targetCount: number): void => {
  ISLAND_PROJECTS.slice(0, targetCount).forEach((project) => {
    if (economy.progress.projectsCompleted.includes(project.id)) return;
    expect(economy.buildProject(project.id)).toBe(true);
  });
};

describe('Economy v5', () => {
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
    expect(economy.buildBridge(1)).toBe(false);
    completeProjectsUntil(economy, 3);
    expect(economy.buildBridge(1)).toBe(true);

    expect(economy.buildStructure('foundry')).toBe(true);
    economy.hireWorker();
    economy.assignWorker('worker-5', 'copper');
    expect(economy.buildBridge(2)).toBe(false);
    completeProjectsUntil(economy, 6);
    expect(economy.buildBridge(2)).toBe(true);

    expect(economy.buildStructure('observatory')).toBe(true);
    economy.hireWorker();
    economy.hireWorker();
    economy.assignWorker('worker-7', 'crystal');
    economy.upgradeWorker('worker-2');
    economy.upgradeWorker('worker-3');
    expect(getTotalWorkerLevels(economy.progress)).toBeGreaterThanOrEqual(10);
    expect(economy.buildBridge(3)).toBe(false);
    completeProjectsUntil(economy, 9);
    expect(economy.buildBridge(3)).toBe(true);

    economy.hireWorker();
    economy.upgradeWorker('worker-4');
    expect(getTotalWorkerLevels(economy.progress)).toBeGreaterThanOrEqual(12);
    expect(Economy.finalRequirementsMet(economy.progress)).toBe(true);
    expect(economy.complete()).toBe(false);
    completeProjectsUntil(economy, 12);
    expect(economy.complete()).toBe(true);
    expect(economy.progress.completed).toBe(true);
    expect(economy.progress.knowledge).toBe(24);
    expect(economy.progress.projectsCompleted).toHaveLength(12);
  });

  it('persiste les métiers et les niveaux', () => {
    const economy = richEconomy({ campBuilt: true, workshopBuilt: true });
    const worker = economy.hireWorker()!;
    economy.assignWorker(worker.id, 'stone');
    economy.upgradeWorker(worker.id);
    const restored = Economy.restore(economy.serialize());
    expect(restored.progress.workers[0]).toMatchObject({ id: worker.id, task: 'stone', level: 2 });
  });

  it('migre la petite campagne v1 vers le premier pont de la v5', () => {
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
    expect(restored.progress).toMatchObject({ version: 5, wood: 17, stone: 13, campBuilt: true, completed: false, knowledge: 2 });
    expect(restored.progress.projectsCompleted).toEqual([]);
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
    expect(restored.progress).toMatchObject({ version: 5, completed: true, knowledge: 10, rebirths: 0 });
    expect(restored.progress.cycleMilestones).toHaveLength(9);
  });

  it('migre une sauvegarde v4 sans inventer de Grands Travaux', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 4,
      wood: 73,
      stone: 51,
      campBuilt: true,
      workshopBuilt: true,
      bridgesBuilt: [true, false, false, false],
      workers: [{ id: 'worker-1', name: 'Milo', task: 'wood', level: 2 }],
      skills: ['trail_sense'],
      skillRanks: { trail_sense: 1 },
    }));
    expect(restored.progress).toMatchObject({
      version: 5,
      wood: 73,
      stone: 51,
      campBuilt: true,
      workshopBuilt: true,
      projectsCompleted: [],
    });
    expect(restored.progress.skills).toEqual(expect.arrayContaining(['awakening', 'insight_gateway', 'trail_sense']));
  });

  it('fait respecter les prérequis de l’arbre Intelligence', () => {
    const economy = new Economy({ knowledge: 30 });
    expect(economy.unlockSkill('auto_regulation')).toBe(false);
    expect(economy.unlockSkill('awakening')).toBe(true);
    expect(economy.unlockSkill('insight_gateway')).toBe(true);
    expect(economy.unlockSkill('trail_sense')).toBe(true);
    expect(economy.unlockSkill('optimal_routes')).toBe(true);
    expect(economy.unlockSkill('forecasting')).toBe(true);
    expect(economy.unlockSkill('coordinated_shifts')).toBe(true);
    expect(economy.unlockSkill('auto_regulation')).toBe(true);
    expect(economy.progress.knowledge).toBe(8);
    expect(economy.setAutoRegulation(true)).toBe(true);
  });

  it('garde chaque futur hexagone invisible jusqu’à tous ses prérequis', () => {
    const economy = new Economy({ knowledge: 100 });
    const visible = (id: string): boolean => {
      const definition = SKILL_DEFINITIONS.find((candidate) => candidate.id === id);
      return Boolean(definition && isSkillVisible(economy.progress, definition));
    };

    expect(SKILL_DEFINITIONS.filter((definition) => isSkillVisible(economy.progress, definition)).map((definition) => definition.id))
      .toEqual(['awakening']);
    expect(visible('trail_sense')).toBe(false);
    economy.unlockSkill('awakening');
    expect(['insight_gateway', 'craft_gateway', 'exploration_gateway'].every(visible)).toBe(true);
    expect(visible('trail_sense')).toBe(false);
    economy.unlockSkill('insight_gateway');
    expect(visible('trail_sense')).toBe(true);
    expect(visible('optimal_routes')).toBe(false);
    economy.unlockSkill('trail_sense');
    expect(visible('optimal_routes')).toBe(true);
    economy.unlockSkill('optimal_routes');
    expect(visible('logistics_network')).toBe(false);
    economy.unlockSkill('craft_gateway');
    economy.unlockSkill('sharp_tools');
    economy.unlockSkill('reinforced_carts');
    expect(visible('logistics_network')).toBe(true);
  });

  it('augmente le nombre de postes sur cinq rangs au coût croissant', () => {
    const economy = new Economy({ knowledge: 100, campBuilt: true });
    ['awakening', 'craft_gateway', 'sharp_tools', 'reinforced_carts', 'living_quarries', 'expanded_roster', 'expanded_roster']
      .forEach((skill) => expect(economy.unlockSkill(skill as Parameters<Economy['unlockSkill']>[0])).toBe(true));
    expect(getSkillRank(economy.progress, 'expanded_roster')).toBe(2);
    expect(getWorkerCapacity(economy.progress)).toBe(5);
    expect(economy.progress.knowledge).toBe(82);
  });

  it('connecte vraiment les voies pour les savoirs hybrides', () => {
    const economy = new Economy({ knowledge: 100 });
    ['awakening', 'insight_gateway', 'trail_sense', 'optimal_routes']
      .forEach((skill) => economy.unlockSkill(skill as Parameters<Economy['unlockSkill']>[0]));
    expect(economy.unlockSkill('logistics_network')).toBe(false);
    ['craft_gateway', 'sharp_tools', 'reinforced_carts']
      .forEach((skill) => economy.unlockSkill(skill as Parameters<Economy['unlockSkill']>[0]));
    expect(economy.unlockSkill('logistics_network')).toBe(true);
  });

  it('révèle quatre paliers de Grands Travaux et garde les ressources historiques utiles', () => {
    const economy = richEconomy({
      campBuilt: true,
      workshopBuilt: true,
      bridgesBuilt: [true, false, false, false],
    });
    const firstTier = ISLAND_PROJECTS.filter((project) => project.tier === 1);
    const secondTier = ISLAND_PROJECTS.filter((project) => project.tier === 2);
    expect(firstTier.every((project) => isProjectVisible(economy.progress, project))).toBe(true);
    expect(secondTier.some((project) => isProjectVisible(economy.progress, project))).toBe(false);

    const capacityBefore = getWorkerCapacity(economy.progress);
    completeProjectsUntil(economy, 3);
    expect(economy.progress.projectsCompleted).toHaveLength(3);
    expect(economy.progress.knowledge).toBe(3);
    expect(getWorkerCapacity(economy.progress)).toBe(capacityBefore + 1);
    expect(economy.bridgeRequirementsMet(1)).toBe(false);

    economy.progress.foundryBuilt = true;
    economy.progress.bridgesBuilt[1] = true;
    expect(secondTier.every((project) => isProjectVisible(economy.progress, project))).toBe(true);
    expect(ISLAND_PROJECTS.slice(0, 6).every((project) =>
      project.cost.wood > 0 && project.cost.stone > 0)).toBe(true);
  });

  it('calcule une fiche de sortie lisible depuis les vraies règles du pont', () => {
    const economy = richEconomy({
      campBuilt: true,
      workshopBuilt: true,
      bridgesBuilt: [true, false, false, false],
      workers: [
        { id: 'worker-1', name: 'Milo', task: 'wood', level: 2 },
        { id: 'worker-2', name: 'Nila', task: 'stone', level: 1 },
        { id: 'worker-3', name: 'Sève', task: 'wood', level: 1 },
        { id: 'worker-4', name: 'Roc', task: 'stone', level: 1 },
      ],
    });
    const before = getIslandGoal(economy.progress, 1);
    expect(before.completed).toBe(false);
    expect(before.items.find((item) => item.id === 'projects')?.done).toBe(false);
    completeProjectsUntil(economy, 3);
    const after = getIslandGoal(economy.progress, 1);
    expect(after.items.every((item) => item.done)).toBe(true);
    expect(after.completed).toBe(true);
  });

  it('migre les anciens talents v3 dans le nouveau graphe sans les perdre', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 3,
      knowledge: 2,
      skills: ['trail_sense', 'optimal_routes', 'forecasting', 'auto_regulation'],
      autoRegulation: true,
    }));
    expect(restored.progress.version).toBe(5);
    expect(restored.progress.skills).toEqual(expect.arrayContaining([
      'awakening',
      'insight_gateway',
      'trail_sense',
      'optimal_routes',
      'forecasting',
      'coordinated_shifts',
      'auto_regulation',
    ]));
    expect(restored.progress.autoRegulation).toBe(true);
  });

  it('donne à chaque sommet une mécanique qui change la méta', () => {
    const collective = new Economy({ skills: ['collective_intelligence'] });
    expect(getAutoRegulationInterval(collective.progress)).toBe(3);
    expect(getAutoRegulationMoveCount(collective.progress)).toBe(2);

    const builders = new Economy({ skills: ['master_builders'] });
    const engine = new Economy({ skills: ['endless_engine'] });
    expect(getWorkerYield(1, engine.progress)).toBe(getWorkerYield(1, builders.progress) * 2);

    const legacy = new Economy({
      completed: true,
      skills: ['ocean_legacy'],
      wood: 100,
      stone: 80,
      copper: 60,
      crystal: 40,
    });
    legacy.rebirth();
    expect(legacy.progress).toMatchObject({ wood: 35, stone: 28, copper: 21, crystal: 14 });
  });

  it('fusionne les trois sommets dans un pouvoir final cher et radical', () => {
    const finalSkill = SKILL_DEFINITIONS.find((definition) => definition.id === 'archipelago_consciousness')!;
    const twoSummits = new Economy({ skills: ['collective_intelligence', 'endless_engine'] });
    expect(isSkillVisible(twoSummits.progress, finalSkill)).toBe(false);

    const economy = new Economy({
      campBuilt: true,
      knowledge: 30,
      skills: ['collective_intelligence', 'endless_engine', 'ocean_legacy'],
      wood: 100,
      stone: 80,
      copper: 60,
      crystal: 40,
    });
    expect(isSkillVisible(economy.progress, finalSkill)).toBe(true);
    const capacityBefore = getWorkerCapacity(economy.progress);
    const yieldBefore = getWorkerYield(1, economy.progress);
    const speedBefore = getPlayerSpeed(economy.progress);
    const bridgeBefore = getBridgeCost(economy.progress, 0)!.wood;

    expect(economy.unlockSkill('archipelago_consciousness')).toBe(true);
    expect(economy.progress.knowledge).toBe(0);
    expect(economy.progress.autoRegulation).toBe(true);
    expect(getWorkerCapacity(economy.progress)).toBe(capacityBefore + 4);
    expect(getWorkerYield(1, economy.progress)).toBeGreaterThan(yieldBefore);
    expect(getPlayerSpeed(economy.progress)).toBeCloseTo(speedBefore * 1.2);
    expect(getBridgeCost(economy.progress, 0)!.wood).toBeLessThan(bridgeBefore);
    expect(getAutoRegulationInterval(economy.progress)).toBe(1.5);
    expect(getAutoRegulationMoveCount(economy.progress)).toBe(4);

    economy.progress.completed = true;
    economy.rebirth();
    expect(economy.progress).toMatchObject({ wood: 55, stone: 44, copper: 33, crystal: 22 });
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
    expect(economy.progress).toMatchObject({ version: 5, completed: false, rebirths: 1, knowledge: 13, wood: 16, stone: 11 });
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
