import { describe, expect, it } from 'vitest';
import {
  Economy,
  ISLAND_PROJECTS,
  SKILL_DEFINITIONS,
  chooseAutoRegulationMove,
  getAutoRegulationInterval,
  getAutoRegulationMoveCount,
  getBridgeCost,
  getCargoCapacity,
  getCycleMultiplier,
  getIslandGoal,
  getPlayerCargoTotal,
  getPlayerFlowMultiplier,
  getPlayerSpeed,
  getSkillRank,
  getSkillTreeCompletion,
  getStructureCost,
  getTotalWorkerLevels,
  getTidalRetentionRate,
  getWorkerCapacity,
  getWorkerDepositValue,
  getWorkerYield,
  getWarehouseCost,
  hasSkill,
  isProjectVisible,
  isProjectHallBuilt,
  isSkillVisible,
  isWorldTwoUnlocked,
  isWarehouseUnlocked,
  type IslandProgress,
} from './economy';

const richEconomy = (initial?: Partial<IslandProgress>): Economy => new Economy({
  wood: 9_999,
  stone: 9_999,
  copper: 9_999,
  crystal: 9_999,
  warehousesBuilt: [true, false, false, false, false],
  ...initial,
});

const completeProjectsUntil = (economy: Economy, targetCount: number): void => {
  ISLAND_PROJECTS.slice(0, targetCount).forEach((project) => {
    if (economy.progress.projectsCompleted.includes(project.id)) return;
    if (!isProjectHallBuilt(economy.progress, project.islandIndex)) {
      expect(economy.buildProjectHall(project.islandIndex)).toBe(true);
    }
    expect(economy.buildProject(project.id)).toBe(true);
  });
};

const maximizedSkillTree = (): Pick<IslandProgress, 'skills' | 'skillRanks'> => ({
  skills: SKILL_DEFINITIONS.map((definition) => definition.id),
  skillRanks: Object.fromEntries(
    SKILL_DEFINITIONS.map((definition) => [definition.id, definition.maxRank ?? 1]),
  ),
});

describe('Economy v9', () => {
  it('rend l’Autel du Savoir atteignable en trois voyages de cristal de base', () => {
    const cost = getStructureCost(new Economy().progress, 'observatory');
    expect(cost).toEqual({ wood: 78, stone: 68, copper: 48, crystal: 24 });
    expect(cost.crystal).toBe(8 * 3);
  });

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
    completeProjectsUntil(economy, 3);
    expect(economy.buildBridge(0)).toBe(true);
    expect(economy.buildStructure('workshop')).toBe(true);
    expect(getWorkerCapacity(economy.progress)).toBe(6);
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

  it('sépare la capacité du harnais du rendement progressif par coup', () => {
    const economy = new Economy({ skills: ['cargo_harness'], skillRanks: { cargo_harness: 2 } });
    expect(getCargoCapacity(economy.progress)).toBe(16);
    expect(getWorkerYield(1, economy.progress)).toBe(1);
    expect(getWorkerYield(2, economy.progress)).toBe(2);
    expect(getWorkerYield(3, economy.progress)).toBe(3);
  });

  it('fait évoluer les coups ouvriers de 1/2/3 à 2/4/6 puis 3/6/9', () => {
    const economy = new Economy({
      knowledge: 32,
      skills: ['master_builders', 'cargo_harness'],
      skillRanks: { master_builders: 1, cargo_harness: 1 },
    });
    expect(economy.unlockSkill('masterful_strikes')).toBe(true);
    expect(economy.progress.knowledge).toBe(20);
    expect([1, 2, 3].map((level) => getWorkerYield(level as 1 | 2 | 3, economy.progress)))
      .toEqual([2, 4, 6]);

    expect(economy.unlockSkill('masterful_strikes')).toBe(true);
    expect(economy.progress.knowledge).toBe(0);
    expect([1, 2, 3].map((level) => getWorkerYield(level as 1 | 2 | 3, economy.progress)))
      .toEqual([3, 6, 9]);
    expect(economy.unlockSkill('masterful_strikes')).toBe(false);
  });

  it('construit chaque Maison des Travaux seulement après le bâtiment principal', () => {
    const economy = richEconomy({ bridgesBuilt: [true, false, false, false] });
    expect(economy.buildProjectHall(1)).toBe(false);
    economy.progress.workshopBuilt = true;
    expect(economy.buildProjectHall(1)).toBe(true);
    expect(economy.progress.projectHallsBuilt).toEqual([true, false, false, false]);
  });

  it('parcourt les cinq chapitres jusqu’au Cœur', () => {
    const economy = richEconomy();
    economy.buildStructure('camp');
    economy.hireWorker();
    economy.hireWorker();
    completeProjectsUntil(economy, 3);
    expect(economy.buildBridge(0)).toBe(true);

    expect(economy.buildStructure('workshop')).toBe(true);
    economy.hireWorker();
    economy.hireWorker();
    economy.upgradeWorker('worker-1');
    expect(economy.buildBridge(1)).toBe(false);
    completeProjectsUntil(economy, 6);
    expect(economy.buildBridge(1)).toBe(true);

    expect(economy.buildStructure('foundry')).toBe(true);
    economy.hireWorker();
    economy.assignWorker('worker-5', 'copper');
    expect(economy.buildBridge(2)).toBe(false);
    completeProjectsUntil(economy, 9);
    expect(economy.buildBridge(2)).toBe(true);

    expect(economy.buildStructure('observatory')).toBe(true);
    economy.hireWorker();
    economy.hireWorker();
    economy.assignWorker('worker-7', 'crystal');
    economy.upgradeWorker('worker-2');
    economy.upgradeWorker('worker-3');
    expect(getTotalWorkerLevels(economy.progress)).toBeGreaterThanOrEqual(10);
    expect(economy.buildBridge(3)).toBe(false);
    completeProjectsUntil(economy, 12);
    expect(economy.buildBridge(3)).toBe(true);

    economy.hireWorker();
    economy.upgradeWorker('worker-4');
    expect(getTotalWorkerLevels(economy.progress)).toBeGreaterThanOrEqual(12);
    expect(Economy.finalRequirementsMet(economy.progress)).toBe(true);
    expect(economy.complete()).toBe(false);
    completeProjectsUntil(economy, 15);
    expect(economy.complete()).toBe(true);
    expect(economy.progress.completed).toBe(true);
    expect(economy.progress.knowledge).toBe(32);
    expect(economy.progress.projectsCompleted).toHaveLength(15);
  });

  it('persiste les métiers et les niveaux', () => {
    const economy = richEconomy({ campBuilt: true, workshopBuilt: true });
    const worker = economy.hireWorker()!;
    economy.assignWorker(worker.id, 'stone');
    economy.upgradeWorker(worker.id);
    const restored = Economy.restore(economy.serialize());
    expect(restored.progress.workers[0]).toMatchObject({ id: worker.id, task: 'stone', level: 2 });
  });

  it('migre la petite campagne v1 vers le premier pont de la v9', () => {
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
    expect(restored.progress).toMatchObject({ version: 9, wood: 17, stone: 13, campBuilt: true, completed: false, knowledge: 2 });
    expect(restored.progress.warehousesBuilt).toEqual([true, false, false, false, false]);
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
    expect(restored.progress).toMatchObject({ version: 9, completed: true, knowledge: 10, rebirths: 0 });
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
      version: 9,
      wood: 73,
      stone: 51,
      campBuilt: true,
      workshopBuilt: true,
      projectsCompleted: [],
    });
    expect(restored.progress.skills).toEqual(expect.arrayContaining(['awakening', 'insight_gateway', 'trail_sense']));
  });

  it('migre la v6 en coupant le spam sans supprimer les effets visuels', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 6,
      knowledge: 9,
      skills: ['auto_regulation'],
      autoRegulation: true,
      bridgesBuilt: [true, false, false, false],
      projectsCompleted: [],
      warehousesBuilt: [true, false, false, false, false],
      playerCargo: { wood: 0, stone: 0, copper: 0, crystal: 0 },
      tutorialSeen: [],
    }));
    expect(restored.progress).toMatchObject({
      version: 9,
      knowledge: 9,
      autoRegulation: true,
      powerNotifications: false,
      powerVfx: true,
    });
  });

  it('migre une sauvegarde v8 vers le World 1 sans perdre la campagne', () => {
    const legacy = {
      ...new Economy({
        rebirths: 5,
        knowledge: 21,
        completed: true,
        ...maximizedSkillTree(),
      }).progress,
      version: 8,
    } as Record<string, unknown>;
    delete legacy.currentWorld;
    delete legacy.worldTwoPeakReached;
    const restored = Economy.restore(JSON.stringify(legacy));
    expect(restored.progress).toMatchObject({
      version: 9,
      rebirths: 5,
      knowledge: 21,
      completed: true,
      currentWorld: 1,
      worldTwoPeakReached: false,
    });
    expect(getSkillTreeCompletion(restored.progress).complete).toBe(true);
  });

  it('ouvre le World 2 seulement après cinq Marées et chaque talent au rang maximal', () => {
    const almost = new Economy({ rebirths: 5, ...maximizedSkillTree() });
    almost.progress.skillRanks.cargo_harness = 5;
    expect(getSkillTreeCompletion(almost.progress)).toMatchObject({ completed: 31, total: 32, complete: false });
    expect(isWorldTwoUnlocked(almost.progress)).toBe(false);

    const fourTides = new Economy({ rebirths: 4, ...maximizedSkillTree() });
    expect(isWorldTwoUnlocked(fourTides.progress)).toBe(false);

    const unlocked = new Economy({ rebirths: 5, currentWorld: 2, ...maximizedSkillTree() });
    expect(getSkillTreeCompletion(unlocked.progress)).toMatchObject({ completed: 32, total: 32, complete: true });
    expect(isWorldTwoUnlocked(unlocked.progress)).toBe(true);
    expect(unlocked.progress.currentWorld).toBe(2);
  });

  it('renvoie au World 1 après une Nouvelle Marée tout en mémorisant le sommet', () => {
    const economy = new Economy({
      completed: true,
      rebirths: 5,
      currentWorld: 2,
      worldTwoPeakReached: true,
      ...maximizedSkillTree(),
    });
    economy.rebirth();
    expect(economy.progress).toMatchObject({
      version: 9,
      rebirths: 6,
      currentWorld: 1,
      worldTwoPeakReached: true,
    });
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

  it('fait progresser les harnais de 8 à 32 et exige deux voies pour les tournées complètes', () => {
    const economy = new Economy({ knowledge: 200 });
    expect(getCargoCapacity(economy.progress)).toBe(8);
    ['awakening', 'craft_gateway', 'sharp_tools', 'reinforced_carts', 'living_quarries']
      .forEach((skill) => expect(economy.unlockSkill(skill as Parameters<Economy['unlockSkill']>[0])).toBe(true));
    expect(economy.unlockSkill('full_loads')).toBe(false);
    ['insight_gateway', 'trail_sense', 'optimal_routes']
      .forEach((skill) => expect(economy.unlockSkill(skill as Parameters<Economy['unlockSkill']>[0])).toBe(true));
    expect(economy.unlockSkill('full_loads')).toBe(true);
    for (let rank = 1; rank <= 6; rank += 1) {
      expect(economy.unlockSkill('cargo_harness')).toBe(true);
      expect(getCargoCapacity(economy.progress)).toBe(8 + rank * 4);
    }
    expect(economy.unlockSkill('cargo_harness')).toBe(false);
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

  it('révèle cinq paliers de Grands Travaux et garde les ressources historiques utiles', () => {
    const economy = richEconomy({
      campBuilt: true,
      workshopBuilt: true,
      bridgesBuilt: [true, false, false, false],
    });
    const starterTier = ISLAND_PROJECTS.filter((project) => project.tier === 0);
    const firstTier = ISLAND_PROJECTS.filter((project) => project.tier === 1);
    const secondTier = ISLAND_PROJECTS.filter((project) => project.tier === 2);
    const capacityBefore = getWorkerCapacity(economy.progress);
    expect(economy.buildProjectHall(0)).toBe(true);
    expect(starterTier.every((project) => isProjectVisible(economy.progress, project))).toBe(true);
    completeProjectsUntil(economy, 3);
    expect(economy.progress.projectsCompleted).toHaveLength(3);
    expect(economy.progress.knowledge).toBe(4);
    expect(getWorkerCapacity(economy.progress)).toBe(capacityBefore + 1);

    expect(economy.buildProjectHall(1)).toBe(true);
    expect(firstTier.every((project) => isProjectVisible(economy.progress, project))).toBe(true);
    expect(secondTier.some((project) => isProjectVisible(economy.progress, project))).toBe(false);
    expect(economy.bridgeRequirementsMet(1)).toBe(false);
    completeProjectsUntil(economy, 6);

    economy.progress.foundryBuilt = true;
    economy.progress.bridgesBuilt[1] = true;
    expect(economy.buildProjectHall(2)).toBe(true);
    expect(secondTier.every((project) => isProjectVisible(economy.progress, project))).toBe(true);
    expect(ISLAND_PROJECTS.slice(0, 9).every((project) =>
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
    completeProjectsUntil(economy, 6);
    const after = getIslandGoal(economy.progress, 1);
    expect(after.items.every((item) => item.done)).toBe(true);
    expect(after.completed).toBe(true);
  });

  it('garde une île définitivement terminée après paiement de son pont', () => {
    const economy = new Economy({
      wood: 0,
      stone: 0,
      campBuilt: true,
      bridgesBuilt: [true, false, false, false],
      workers: [],
    });
    const oldIsland = getIslandGoal(economy.progress, 0);
    expect(oldIsland.completed).toBe(true);
    expect(oldIsland.items.every((item) => item.done)).toBe(true);
    expect(oldIsland.items.find((item) => item.id === 'reserves')?.done).toBe(true);
  });

  it('migre les anciens talents v3 dans le nouveau graphe sans les perdre', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 3,
      knowledge: 2,
      skills: ['trail_sense', 'optimal_routes', 'forecasting', 'auto_regulation'],
      autoRegulation: true,
    }));
    expect(restored.progress.version).toBe(9);
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

    const engine = new Economy({ skills: ['endless_engine'] });
    expect(engine.setIndustrySurge(true)).toBe(true);
    expect(engine.progress.industrySurge).toBe(true);
    expect(getWorkerYield(3, engine.progress)).toBeLessThanOrEqual(8);

    const legacy = new Economy({
      completed: true,
      skills: ['ocean_legacy'],
      wood: 100,
      stone: 80,
      copper: 60,
      crystal: 40,
    });
    legacy.rebirth();
    expect(legacy.progress).toMatchObject({ wood: 16, stone: 11, copper: 3, crystal: 2 });
    expect(legacy.setExplorationFlow(true)).toBe(true);
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
    const depositBefore = getWorkerDepositValue(economy.progress);
    const speedBefore = getPlayerSpeed(economy.progress);
    const bridgeBefore = getBridgeCost(economy.progress, 0)!.wood;

    expect(economy.unlockSkill('archipelago_consciousness')).toBe(true);
    expect(economy.progress.knowledge).toBe(0);
    expect(economy.progress.autoRegulation).toBe(true);
    expect(getWorkerCapacity(economy.progress)).toBe(capacityBefore + 4);
    expect(getWorkerYield(1, economy.progress)).toBe(yieldBefore);
    expect(getWorkerDepositValue(economy.progress)).toBeGreaterThan(depositBefore);
    expect(getPlayerSpeed(economy.progress)).toBeCloseTo(speedBefore * 1.2);
    expect(getBridgeCost(economy.progress, 0)!.wood).toBeLessThan(bridgeBefore);
    expect(getAutoRegulationInterval(economy.progress)).toBe(1.5);
    expect(getAutoRegulationMoveCount(economy.progress)).toBe(4);

    economy.progress.completed = true;
    economy.rebirth();
    expect(economy.progress).toMatchObject({ wood: 16, stone: 11, copper: 3, crystal: 2 });
  });

  it('ne double la vitesse du joueur sous Courant de Marée que lorsqu’il porte une cargaison', () => {
    const economy = new Economy({ skills: ['ocean_legacy'] });
    expect(getPlayerFlowMultiplier(economy.progress, true)).toBe(1);
    economy.carryForPlayer('wood', 1);
    expect(getPlayerFlowMultiplier(economy.progress, false)).toBe(1);
    expect(getPlayerFlowMultiplier(economy.progress, true)).toBe(2);
  });

  it('fait progresser l’héritage de Marée de 5 à 20 % sans dépasser le plafond', () => {
    const economy = new Economy({ knowledge: 100, skills: ['ocean_legacy'] });
    expect(getTidalRetentionRate(economy.progress)).toBeCloseTo(0.05);
    for (const expected of [0.1, 0.15, 0.2]) {
      expect(economy.unlockSkill('tidal_inheritance')).toBe(true);
      expect(getTidalRetentionRate(economy.progress)).toBeCloseTo(expected);
    }
    expect(economy.unlockSkill('tidal_inheritance')).toBe(false);
    economy.progress.completed = true;
    Object.assign(economy.progress, { wood: 100, stone: 80, copper: 60, crystal: 40 });
    economy.rebirth();
    expect(economy.progress).toMatchObject({ wood: 20, stone: 16, copper: 12, crystal: 8 });
  });

  it('garde le Conseil itinérant séparé des sommets et exige un palier dans les trois voies', () => {
    const definition = SKILL_DEFINITIONS.find((skill) => skill.id === 'remote_management')!;
    const incomplete = new Economy({
      knowledge: 100,
      skills: ['coordinated_shifts', 'expanded_roster'],
    });
    expect(isSkillVisible(incomplete.progress, definition)).toBe(false);
    const ready = new Economy({
      knowledge: 24,
      skills: ['coordinated_shifts', 'expanded_roster', 'tidal_memory'],
    });
    expect(isSkillVisible(ready.progress, definition)).toBe(true);
    expect(ready.unlockSkill('remote_management')).toBe(true);
    expect(ready.progress.knowledge).toBe(0);
    expect(hasSkill(ready.progress, 'collective_intelligence')).toBe(false);
    expect(hasSkill(ready.progress, 'endless_engine')).toBe(false);
    expect(hasSkill(ready.progress, 'ocean_legacy')).toBe(false);
  });

  it('conserve les talents et le Savoir lors d’une Nouvelle Marée', () => {
    const economy = new Economy({
      completed: true,
      knowledge: 10,
      skills: ['tide_stride', 'cache_instinct', 'frugal_plans', 'tidal_memory'],
      powerNotifications: true,
      powerVfx: false,
      wood: 91,
      workers: [{ id: 'worker-1', name: 'Milo', task: 'wood', level: 2 }],
    });
    const reward = economy.rebirth();
    expect(reward).toBe(3);
    expect(economy.progress).toMatchObject({ version: 9, completed: false, rebirths: 1, knowledge: 13, wood: 16, stone: 11 });
    expect(economy.progress.skills).toContain('tidal_memory');
    expect(economy.progress).toMatchObject({ powerNotifications: true, powerVfx: false });
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

  it('stocke la récolte manuelle sur le dos avant de la déposer', () => {
    const economy = new Economy();
    expect(economy.carryForPlayer('stone', 5)).toBe(5);
    expect(economy.progress.stone).toBe(0);
    expect(getPlayerCargoTotal(economy.progress)).toBe(5);
    expect(economy.depositPlayerCargo('stone', 1)).toBe(1);
    expect(economy.progress.stone).toBe(1);
    expect(getPlayerCargoTotal(economy.progress)).toBe(4);
    expect(economy.unloadPlayerCargo('stone', 2)).toBe(2);
    expect(economy.progress.stone).toBe(1);
    expect(getPlayerCargoTotal(economy.progress)).toBe(2);
    expect(economy.carryForPlayer('wood', 99)).toBe(6);
    expect(getPlayerCargoTotal(economy.progress)).toBe(8);
  });

  it('débloque un dépôt local supplémentaire à chaque Nouvelle Marée', () => {
    const economy = richEconomy();
    expect(isWarehouseUnlocked(economy.progress, 1)).toBe(false);
    expect(economy.buildWarehouse(1)).toBe(false);
    economy.progress.bridgesBuilt[0] = true;
    economy.progress.rebirths = 1;
    expect(isWarehouseUnlocked(economy.progress, 1)).toBe(true);
    expect(getWarehouseCost(economy.progress, 1)).not.toBeNull();
    expect(economy.buildWarehouse(1)).toBe(true);
    expect(economy.progress.warehousesBuilt).toEqual([true, true, false, false, false]);
    expect(economy.buildWarehouse(2)).toBe(false);
  });
});
