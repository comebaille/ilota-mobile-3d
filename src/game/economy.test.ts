import { describe, expect, it } from 'vitest';
import {
  Economy,
  ISLAND_PROJECTS,
  SKILL_DEFINITIONS,
  WORLD_TWO_MINERALS,
  WORLD_TWO_SKILLS,
  WORLD_TWO_BUILDINGS,
  canMineWorldTwoMineral,
  chooseAutoRegulationMove,
  getAutoRegulationInterval,
  getAutoRegulationMoveCount,
  getBridgeCost,
  getCargoCapacity,
  getCycleMultiplier,
  getObjective,
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
  getWorkerCargoCapacity,
  getWorkerDepositValue,
  getWorkerYield,
  getWarehouseCost,
  getWorldTwoCargoCapacity,
  getWorldTwoCargoTotal,
  getWorldTwoPackCapacity,
  getWorldTwoPlayerYield,
  getWorldTwoSaleMultiplier,
  getWorldTwoWolfCapacity,
  getWorldTwoWolfYield,
  getWorldTwoFangUpgradeCost,
  hasSkill,
  hasWorldTwoSkill,
  hasWorldTwoBuilding,
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

describe('Economy v12', () => {
  it('préserve le chapitre 2 des anciennes sauvegardes ayant déjà franchi le pont des Pins', () => {
    const restored = Economy.restore(JSON.stringify({
      version: 1,
      campBuilt: true,
      bridgeBuilt: true,
      woodWorker: true,
      stoneWorker: true,
    }));
    expect(restored.progress.bridgesBuilt[0]).toBe(true);
    expect(restored.progress.projectsCompleted).toEqual(expect.arrayContaining([
      'starter_tools',
      'trail_markers',
      'tidal_nursery',
    ]));
    expect(isProjectHallBuilt(restored.progress, 0)).toBe(true);
    expect(getObjective(restored.progress).title).toBe('Construis l’atelier des Pins');
  });

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
    expect([1, 2, 3].map((level) => getWorkerCargoCapacity(level as 1 | 2 | 3, economy.progress)))
      .toEqual([12, 16, 20]);
    expect(getWorkerYield(1, economy.progress)).toBe(1);
    expect(getWorkerYield(2, economy.progress)).toBe(2);
    expect(getWorkerYield(3, economy.progress)).toBe(3);
  });

  it('donne dès le départ des tournées utiles de 4/8/12 aux ouvriers', () => {
    const progress = new Economy().progress;
    expect(getWorkerCargoCapacity(1, progress)).toBe(4);
    expect(getWorkerCargoCapacity(2, progress)).toBe(8);
    expect(getWorkerCargoCapacity(3, progress)).toBe(12);
  });

  it('fait évoluer les coups ouvriers de 1/2/3 à 2/4/6 puis 3/6/9', () => {
    const economy = new Economy({
      knowledge: 19,
      skills: ['full_loads', 'far_horizons', 'tidal_inheritance'],
    });
    expect(economy.unlockSkill('masterful_strikes')).toBe(true);
    expect(economy.progress.knowledge).toBe(12);
    expect([1, 2, 3].map((level) => getWorkerYield(level as 1 | 2 | 3, economy.progress)))
      .toEqual([2, 4, 6]);

    expect(economy.unlockSkill('masterful_strikes_2')).toBe(true);
    expect(economy.progress.knowledge).toBe(0);
    expect([1, 2, 3].map((level) => getWorkerYield(level as 1 | 2 | 3, economy.progress)))
      .toEqual([3, 6, 9]);
    expect(economy.unlockSkill('masterful_strikes_2')).toBe(false);
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
    expect(restored.progress).toMatchObject({ version: 12, wood: 17, stone: 13, campBuilt: true, completed: false, knowledge: 2 });
    expect(restored.progress.warehousesBuilt).toEqual([true, false, false, false, false]);
    expect(restored.progress.projectsCompleted).toEqual([
      'starter_tools',
      'trail_markers',
      'tidal_nursery',
    ]);
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
    expect(restored.progress).toMatchObject({ version: 12, completed: true, knowledge: 10, rebirths: 0 });
    expect(restored.progress.cycleMilestones).toHaveLength(10);
  });

  it('migre une sauvegarde v4 en validant seulement les Travaux désormais placés avant son pont', () => {
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
      version: 12,
      wood: 73,
      stone: 51,
      campBuilt: true,
      workshopBuilt: true,
      projectsCompleted: ['starter_tools', 'trail_markers', 'tidal_nursery'],
    });
    expect(restored.progress.skills).toEqual(expect.arrayContaining(['insight_gateway', 'trail_sense']));
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
      version: 12,
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
      version: 12,
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
    almost.progress.skills = almost.progress.skills.filter((skill) => skill !== 'cargo_harness_6');
    delete almost.progress.skillRanks.cargo_harness_6;
    expect(getSkillTreeCompletion(almost.progress)).toMatchObject({ completed: 41, total: 42, complete: false });
    expect(isWorldTwoUnlocked(almost.progress)).toBe(false);

    const fourTides = new Economy({ rebirths: 4, ...maximizedSkillTree() });
    expect(isWorldTwoUnlocked(fourTides.progress)).toBe(false);

    const unlocked = new Economy({ rebirths: 5, currentWorld: 2, ...maximizedSkillTree() });
    expect(getSkillTreeCompletion(unlocked.progress)).toMatchObject({ completed: 42, total: 42, complete: true });
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
      version: 12,
      rebirths: 6,
      currentWorld: 1,
      worldTwoPeakReached: true,
    });
  });

  it('fait respecter les prérequis de l’arbre Intelligence', () => {
    const economy = new Economy({ knowledge: 30 });
    expect(economy.unlockSkill('auto_regulation')).toBe(false);
    expect(economy.unlockSkill('insight_gateway')).toBe(true);
    expect(economy.unlockSkill('craft_gateway')).toBe(true);
    expect(economy.unlockSkill('trail_sense')).toBe(true);
    expect(economy.unlockSkill('logistics_network')).toBe(true);
    expect(economy.unlockSkill('optimal_routes')).toBe(true);
    expect(economy.unlockSkill('coordinated_shifts')).toBe(true);
    expect(economy.unlockSkill('auto_regulation')).toBe(true);
    expect(economy.progress.knowledge).toBe(14);
    expect(economy.setAutoRegulation(true)).toBe(true);
  });

  it('révèle les descendants d’un parent mais exige les deux parents pour acheter au centre', () => {
    const economy = new Economy({ knowledge: 100 });
    const visible = (id: string): boolean => {
      const definition = SKILL_DEFINITIONS.find((candidate) => candidate.id === id);
      return Boolean(definition && isSkillVisible(economy.progress, definition));
    };

    expect(SKILL_DEFINITIONS.filter((definition) => isSkillVisible(economy.progress, definition)).map((definition) => definition.id))
      .toEqual(['insight_gateway', 'craft_gateway', 'exploration_gateway']);
    expect(visible('trail_sense')).toBe(false);
    economy.unlockSkill('insight_gateway');
    expect(visible('trail_sense')).toBe(true);
    expect(visible('logistics_network')).toBe(true);
    expect(economy.unlockSkill('logistics_network')).toBe(false);
    expect(visible('sharp_tools')).toBe(false);
    economy.unlockSkill('craft_gateway');
    expect(['trail_sense', 'logistics_network', 'sharp_tools'].every(visible)).toBe(true);
    expect(visible('tide_stride')).toBe(false);
    expect(economy.unlockSkill('logistics_network')).toBe(true);
    expect(visible('optimal_routes')).toBe(false);
    economy.unlockSkill('trail_sense');
    expect(visible('optimal_routes')).toBe(true);
  });

  it('forme une pyramide jointive de 3 à 9 hexagones avec les parents adjacents', () => {
    const rows = Array.from({ length: 7 }, (_, tier) => (
      SKILL_DEFINITIONS.filter((definition) => definition.tier === tier)
        .sort((left, right) => left.x - right.x)
    ));
    expect(rows.map((row) => row.length)).toEqual([3, 4, 5, 6, 7, 8, 9]);

    rows.forEach((row, tier) => {
      row.slice(1).forEach((skill, index) => expect(skill.x - row[index]!.x).toBeCloseTo(81));
      if (tier === 0) return;
      const parents = rows[tier - 1]!;
      row.forEach((skill, column) => {
        const expectedParents = [parents[column - 1]?.id, parents[column]?.id].filter(Boolean);
        expect(skill.requires).toEqual(expectedParents);
        expect(skill.y - parents[0]!.y).toBeCloseTo(70.5);
      });
    });
  });

  it('décompose les cinq places de nurserie en cinq hexagones distincts', () => {
    const economy = new Economy({
      knowledge: 100,
      campBuilt: true,
      skills: ['remote_management', 'adaptive_assignments', 'expanded_roster'],
    });
    for (const skill of ['expanded_roster_2', 'expanded_roster_3', 'expanded_roster_4', 'expanded_roster_5'] as const) {
      expect(economy.unlockSkill(skill)).toBe(true);
    }
    expect(getWorkerCapacity(economy.progress)).toBe(8);
    expect(['expanded_roster', 'expanded_roster_2', 'expanded_roster_3', 'expanded_roster_4', 'expanded_roster_5']
      .every((skill) => economy.progress.skills.includes(skill as Parameters<Economy['unlockSkill']>[0]))).toBe(true);
  });

  it('fait progresser les six hexagones de harnais de 8 à 32', () => {
    const ids = ['cargo_harness', 'cargo_harness_2', 'cargo_harness_3', 'cargo_harness_4', 'cargo_harness_5', 'cargo_harness_6'] as const;
    ids.forEach((_, index) => {
      const economy = new Economy({ skills: ids.slice(0, index + 1) });
      expect(getCargoCapacity(economy.progress)).toBe(8 + (index + 1) * 4);
    });
  });

  it('connecte vraiment les voies pour les savoirs hybrides', () => {
    const economy = new Economy({ knowledge: 100 });
    economy.unlockSkill('insight_gateway');
    expect(economy.unlockSkill('logistics_network')).toBe(false);
    economy.unlockSkill('craft_gateway');
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
    expect(restored.progress.version).toBe(12);
    expect(restored.progress.skills).toEqual(expect.arrayContaining([
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

  it('termine la pyramide par la Conscience absolue', () => {
    const finalSkill = SKILL_DEFINITIONS.find((definition) => definition.id === 'archipelago_consciousness')!;
    const beforeParent = new Economy({ skills: ['tidal_inheritance'] });
    expect(isSkillVisible(beforeParent.progress, finalSkill)).toBe(false);

    const economy = new Economy({
      campBuilt: true,
      knowledge: 13,
      skills: ['tidal_inheritance_2'],
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
    expect(economy.progress).toMatchObject({ wood: 16, stone: 11, copper: 6, crystal: 4 });
  });

  it('ne double la vitesse du joueur sous Courant de Marée que lorsqu’il porte une cargaison', () => {
    const economy = new Economy({ skills: ['ocean_legacy'] });
    expect(getPlayerFlowMultiplier(economy.progress, true)).toBe(1);
    economy.carryForPlayer('wood', 1);
    expect(getPlayerFlowMultiplier(economy.progress, false)).toBe(1);
    expect(getPlayerFlowMultiplier(economy.progress, true)).toBe(2);
  });

  it('fait progresser les deux hexagones d’héritage de Marée de 5 à 15 %', () => {
    const economy = new Economy({ knowledge: 14, skills: ['far_horizons', 'ocean_legacy'] });
    expect(getTidalRetentionRate(economy.progress)).toBeCloseTo(0.05);
    expect(economy.unlockSkill('tidal_inheritance')).toBe(true);
    expect(getTidalRetentionRate(economy.progress)).toBeCloseTo(0.1);
    expect(economy.unlockSkill('tidal_inheritance_2')).toBe(true);
    expect(getTidalRetentionRate(economy.progress)).toBeCloseTo(0.15);
    expect(economy.unlockSkill('tidal_inheritance_2')).toBe(false);
    economy.progress.completed = true;
    Object.assign(economy.progress, { wood: 100, stone: 80, copper: 60, crystal: 40 });
    economy.rebirth();
    expect(economy.progress).toMatchObject({ wood: 16, stone: 12, copper: 9, crystal: 6 });
  });

  it('garde le Conseil itinérant dans sa chaîne de parents adjacents', () => {
    const definition = SKILL_DEFINITIONS.find((skill) => skill.id === 'remote_management')!;
    const incomplete = new Economy({
      knowledge: 100,
      skills: ['forecasting'],
    });
    expect(isSkillVisible(incomplete.progress, definition)).toBe(false);
    const ready = new Economy({
      knowledge: 6,
      skills: ['collective_intelligence'],
    });
    expect(isSkillVisible(ready.progress, definition)).toBe(true);
    expect(ready.unlockSkill('remote_management')).toBe(true);
    expect(ready.progress.knowledge).toBe(0);
    expect(hasSkill(ready.progress, 'collective_intelligence')).toBe(true);
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
    expect(economy.progress).toMatchObject({ version: 12, completed: false, rebirths: 1, knowledge: 13, wood: 16, stone: 11 });
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

  it('vend les minerais du monde 2 en argent sans toucher aux stocks du monde 1', () => {
    const economy = new Economy({ wood: 12, stone: 7 });
    expect(getWorldTwoCargoCapacity(economy.progress)).toBe(8);
    expect(economy.carryWorldTwoForPlayer('coal', 6)).toBe(6);
    expect(economy.carryWorldTwoForPlayer('iron', 5)).toBe(2);
    expect(getWorldTwoCargoTotal(economy.progress)).toBe(8);
    expect(economy.progress).toMatchObject({ wood: 12, stone: 7 });
    expect(economy.progress.worldTwoMoney).toBe(0);

    expect(economy.depositWorldTwoCargo('coal', 4)).toBe(4);
    expect(economy.progress.worldTwoMoney).toBe(48);
    expect(economy.progress.worldTwoCargo).toEqual({ coal: 2, iron: 2 });
    expect(economy.progress).toMatchObject({ wood: 12, stone: 7 });
  });

  it('ouvre toute la montagne immédiatement et déplace la progression vers les crocs', () => {
    const economy = new Economy({ worldTwoMoney: 500 });
    expect(economy.progress.worldTwoTerracesUnlocked).toBe(11);
    expect(economy.unlockWorldTwoTerrace(1)).toBe(true);
    expect(economy.progress.worldTwoTerracesUnlocked).toBe(11);
    expect(canMineWorldTwoMineral(economy.progress, 'stone')).toBe(true);
    expect(canMineWorldTwoMineral(economy.progress, 'slate')).toBe(false);
    expect(getWorldTwoFangUpgradeCost(economy.progress, 'player')).toBe(50);
    expect(economy.upgradeWorldTwoFangs('player')).toBe(true);
    expect(canMineWorldTwoMineral(economy.progress, 'slate')).toBe(true);
    expect(canMineWorldTwoMineral(economy.progress, 'coal')).toBe(false);
  });

  it('publie trente minerais ordonnés jusqu’au diamant et au Célestium', () => {
    expect(WORLD_TWO_MINERALS).toHaveLength(30);
    expect(WORLD_TWO_MINERALS.map((mineral) => mineral.hardness)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    expect(WORLD_TWO_MINERALS.find((mineral) => mineral.id === 'diamond')).toMatchObject({
      hardness: 29,
      name: 'Diamant',
    });
    expect(WORLD_TWO_MINERALS.every((mineral, index) =>
      index === 0 || mineral.saleValue > WORLD_TWO_MINERALS[index - 1]!.saleValue)).toBe(true);
  });

  it('recrute une vraie meute avec de l’argent et applique les talents du Zénith dans leur ordre', () => {
    const economy = new Economy({ worldTwoMoney: 50_000 });
    const firstWolf = economy.hireWorldTwoWolf();
    expect(firstWolf).toMatchObject({ id: 'wolf-1', task: 'stone', level: 1, health: 3 });
    expect(economy.unlockWorldTwoSkill('mountain_tools')).toBe(false);
    expect(economy.unlockWorldTwoSkill('pack_instinct')).toBe(true);
    expect(economy.unlockWorldTwoSkill('mountain_tools')).toBe(true);
    expect(economy.unlockWorldTwoSkill('loaded_saddles')).toBe(true);
    expect(hasWorldTwoSkill(economy.progress, 'loaded_saddles')).toBe(true);
    expect(getWorldTwoCargoCapacity(economy.progress)).toBe(12);
    expect(economy.damageWorldTwoWolf(firstWolf!.id, 2)).toBe(false);
    expect(economy.damageWorldTwoWolf(firstWolf!.id, 1)).toBe(true);
    expect(economy.progress.worldTwoWolves).toEqual([]);
  });

  it('déploie trois voies complètes puis leur convergence avec des effets mesurables', () => {
    const economy = new Economy({ worldTwoMoney: 2_000_000 });
    WORLD_TWO_SKILLS.forEach((skill) => {
      expect(economy.unlockWorldTwoSkill(skill.id), skill.name).toBe(true);
    });
    expect(economy.progress.worldTwoSkills).toHaveLength(18);
    expect(getWorldTwoPlayerYield(economy.progress)).toBe(3);
    expect(getWorldTwoWolfYield(economy.progress)).toBe(3);
    expect(getWorldTwoCargoCapacity(economy.progress)).toBe(20);
    expect(getWorldTwoWolfCapacity(economy.progress)).toBe(16);
    expect(getWorldTwoPackCapacity(economy.progress)).toBe(5);
    expect(getWorldTwoSaleMultiplier(economy.progress, true)).toBeCloseTo(1.7);
  });

  it('fait des cinq bâtiments une campagne ordonnée et réserve la victoire au Cœur', () => {
    const economy = new Economy({
      worldTwoMoney: 5_000_000,
      worldTwoFangLevel: 30,
      worldTwoWolfFangLevel: 30,
      worldTwoEnemyDefeats: 15,
    });
    WORLD_TWO_SKILLS.forEach((skill) => expect(economy.unlockWorldTwoSkill(skill.id)).toBe(true));
    for (let index = 0; index < 4; index += 1) expect(economy.hireWorldTwoWolf()).not.toBeNull();
    expect(economy.buildWorldTwoBuilding('pack_lodge')).toBe(false);
    WORLD_TWO_BUILDINGS.forEach((building) => {
      expect(economy.buildWorldTwoBuilding(building.id), building.name).toBe(true);
      expect(hasWorldTwoBuilding(economy.progress, building.id)).toBe(true);
    });
    expect(economy.progress.worldTwoPeakReached).toBe(true);
    expect(economy.progress.worldTwoBuildings).toHaveLength(5);
  });

  it('équilibre le dernier acte sans réintroduire les ressources du World 1', () => {
    const mastered = new Economy({
      worldTwoFangLevel: 30,
      worldTwoWolfFangLevel: 30,
      worldTwoSkills: WORLD_TWO_SKILLS.map((skill) => skill.id),
      worldTwoBuildings: WORLD_TWO_BUILDINGS.slice(0, 4).map((building) => building.id),
    });
    const tripValue = Math.round(
      WORLD_TWO_MINERALS.at(-1)!.saleValue
      * getWorldTwoCargoCapacity(mastered.progress)
      * getWorldTwoSaleMultiplier(mastered.progress, true),
    );
    expect(tripValue).toBeGreaterThan(600_000);
    expect(Math.ceil(WORLD_TWO_BUILDINGS.at(-1)!.cost / tripValue)).toBeLessThanOrEqual(1);
    mastered.addWorldTwo('celestium', getWorldTwoCargoCapacity(mastered.progress), true);
    expect(mastered.progress.worldTwoMoney).toBe(tripValue);
    expect(mastered.progress).toMatchObject({ wood: 0, stone: 0, copper: 0, crystal: 0 });
  });

  it('migre une victoire v11 vers la campagne v12 sans retirer son accomplissement', () => {
    const legacy = { ...new Economy({ worldTwoPeakReached: true, worldTwoMoney: 42_000 }).progress, version: 11 };
    delete (legacy as Partial<IslandProgress>).worldTwoBuildings;
    delete (legacy as Partial<IslandProgress>).worldTwoLifetimeMoney;
    delete (legacy as Partial<IslandProgress>).worldTwoMineralsSold;
    const restored = Economy.restore(JSON.stringify(legacy));
    expect(restored.progress.version).toBe(12);
    expect(restored.progress.worldTwoBuildings).toEqual(WORLD_TWO_BUILDINGS.map((building) => building.id));
    expect(restored.progress.worldTwoLifetimeMoney).toBe(42_000);
  });

  it('convertit une sauvegarde v10 en argent et conserve son avance minière', () => {
    const legacy = {
      ...new Economy({ rebirths: 5, ...maximizedSkillTree() }).progress,
      version: 10,
      worldTwoResources: { coal: 10, iron: 2, silver: 0, gold: 0 },
      worldTwoCargo: { coal: 0, iron: 0, silver: 1, gold: 0 },
      worldTwoWolves: [],
    } as Record<string, unknown>;
    delete legacy.worldTwoMoney;
    delete legacy.worldTwoFangLevel;
    delete legacy.worldTwoWolfFangLevel;
    const restored = Economy.restore(JSON.stringify(legacy));
    expect(restored.progress).toMatchObject({
      version: 12,
      worldTwoMoney: 341,
      worldTwoFangLevel: 10,
      worldTwoWolfFangLevel: 10,
      worldTwoTerracesUnlocked: 11,
      worldTwoCargo: {},
    });
  });
});
