import { expect, test, type Page } from '@playwright/test';
import { SKILL_DEFINITIONS } from '../../src/game/economy';
import { WORLD_TWO_TERRACES } from '../../src/game/world';

// L'encodage vidéo et la capture DOM continue divisent le framerate de cette
// scène WebGL mobile. Les captures ciblées gardent les preuves visuelles.
test.use({ video: 'off', trace: 'off' });

interface IlotaDiagnostics {
  ready: boolean;
  active: boolean;
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
  observatoryBuilt: boolean;
  workers: number;
  workerLevels: number;
  workerTasks: string;
  bridges: number;
  bridgeVisualParts: number;
  bridgePlanks: number;
  bridgesBuilding: number;
  scaledBridgePlanks: number;
  bridgeGuides: number;
  chapter: number;
  completed: boolean;
  crewOpen: boolean;
  projectsOpen: boolean;
  talentOpen: boolean;
  menuOpen: boolean;
  knowledge: number;
  rebirths: number;
  skills: string;
  autoRegulation: boolean;
  powerNotifications: boolean;
  powerVfx: boolean;
  industrySurge: boolean;
  industrySurgeKind: string;
  explorationFlow: boolean;
  projects: number;
  projectHalls: number;
  warehouses: number;
  playerCargo: number;
  playerCargoStackHeight: number;
  playerCargoVisualKinds: string;
  currentIsland: number;
  currentWorld: 1 | 2;
  worldTwoTerrace: number;
  worldTwoPortalUnlocked: boolean;
  worldTwoPeakReached: boolean;
  worldTwoMoney: number;
  worldTwoFangLevel: number;
  worldTwoWolfFangLevel: number;
  worldTwoMinerals: number;
  worldTwoLockedMinerals: number;
  worldTwoMineableDark: number;
  worldTwoWolfAnimations: string;
  worldTwoEnemyAnimations: string;
  worldTravelPathVisible: boolean;
  worldTravelObjects: number;
  inputEnabled: boolean;
  managementOpen: boolean;
  blockingOverlay: boolean;
  drawCalls: number;
  triangles: number;
  interaction: string;
  assemblingBuildings: number;
  visibleIslands: number;
  emergingIsland: string;
  rebirthAnimation: boolean;
  workersOnWalkable: boolean;
  workerNavigation: Array<{
    id: string;
    x: number;
    z: number;
    phase: string;
    routeBridges: number[];
    bridgesUsed: number[];
    routeDistance: number;
    routeChoices: number;
    targetNode: string;
    targetIsland: number;
    targetDistance: number;
    hubDistance: number;
    cargo: number;
    cargoVisuals: number;
    cargoStackHeight: number;
    animation: string;
  }>;
  resourceNodes: Array<{ id: string; kind: string; island: number; amount: number; capacity: number }>;
  player: { x: number; z: number };
  facingAlignment: number;
  lastHarvest: { kind: string; remaining: number; capacity: number; scale: number } | null;
  lastWorkerHarvest: {
    workerId: string;
    nodeId: string;
    kind: string;
    gathered: number;
    remaining: number;
    island: number;
  } | null;
  assetsLoaded: number;
  fps: number;
}

const diagnostics = (page: Page): Promise<IlotaDiagnostics> => page.evaluate(() => (
  window as typeof window & { __ILOTA__: IlotaDiagnostics }
).__ILOTA__);

const waitForGame = async (page: Page): Promise<void> => {
  await page.goto('./');
  await page.waitForFunction(() => Boolean((window as typeof window & { __ILOTA__?: { ready: boolean } }).__ILOTA__?.ready));
  await page.getByRole('button', { name: /commencer|reprendre/i }).click();
  const tutorial = page.locator('#tutorial-panel');
  if (await tutorial.isVisible()) {
    await page.locator('#tutorial-continue-button').click();
    await expect(tutorial).toBeHidden();
  }
};

const richSave = () => ({
  version: 11,
  wood: 9_999,
  stone: 9_999,
  copper: 9_999,
  crystal: 9_999,
  playerCargo: { wood: 0, stone: 0, copper: 0, crystal: 0 },
  warehousesBuilt: [true, false, false, false, false],
  projectHallsBuilt: [false, false, false, false],
  campBuilt: false,
  workshopBuilt: false,
  foundryBuilt: false,
  observatoryBuilt: false,
  bridgesBuilt: [false, false, false, false],
  cachesFound: [],
  workers: [],
  completed: false,
  elapsedSeconds: 0,
  knowledge: 0,
  skills: [],
  skillRanks: {},
  autoRegulation: false,
  industrySurge: false,
  explorationFlow: false,
  powerNotifications: false,
  powerVfx: true,
  rebirths: 0,
  cycleMilestones: [],
  lifetimeDeliveries: 0,
  projectsCompleted: [],
  tutorialSeen: [],
  currentWorld: 1 as const,
  worldTwoPeakReached: false,
  worldTwoMoney: 0,
  worldTwoFangLevel: 1,
  worldTwoWolfFangLevel: 1,
  worldTwoCargo: {},
  worldTwoTerracesUnlocked: 11,
  worldTwoWolves: [],
  worldTwoSkills: [],
  worldTwoEnemyDefeats: 0,
});

const maximizedSkillTree = () => ({
  skills: SKILL_DEFINITIONS.map((definition) => definition.id),
  skillRanks: Object.fromEntries(
    SKILL_DEFINITIONS.map((definition) => [definition.id, definition.maxRank ?? 1]),
  ),
});

const createNavigator = (page: Page) => {
  let pointerDown = false;
  const release = async (): Promise<void> => {
    if (!pointerDown) return;
    await page.mouse.up();
    pointerDown = false;
  };
  const moveTo = async (targetX: number, targetZ: number, tolerance = 0.85): Promise<void> => {
    const joystick = await page.locator('#joystick').boundingBox();
    if (!joystick) throw new Error('Joystick introuvable');
    const centerX = joystick.x + joystick.width / 2;
    const centerY = joystick.y + joystick.height / 2;
    const radius = joystick.width * 0.31;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    pointerDown = true;
    for (let step = 0; step < 180; step += 1) {
      const player = await page.evaluate(() => (
        window as typeof window & { __ILOTA__: IlotaDiagnostics }
      ).__ILOTA__.player);
      const dx = targetX - player.x;
      const dz = targetZ - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= tolerance) {
        await release();
        return;
      }
      const screenX = 0.828 * dx - 0.561 * dz;
      const screenY = -0.561 * dx - 0.828 * dz;
      const screenLength = Math.max(0.001, Math.hypot(screenX, screenY));
      const steeringRadius = radius * Math.min(1, Math.max(0.14, distance / 3.5));
      await page.mouse.move(
        centerX + (screenX / screenLength) * steeringRadius,
        centerY - (screenY / screenLength) * steeringRadius,
      );
      // Laisser plusieurs images WebGL s'écouler entre deux corrections sans
      // rendre l'ascension complète artificiellement trois fois plus lente.
      await new Promise((resolve) => setTimeout(resolve, 140));
    }
    await release();
    const current = (await diagnostics(page)).player;
    throw new Error(`Cible non atteinte: ${targetX}, ${targetZ}; position ${current.x}, ${current.z}`);
  };
  return { moveTo, release };
};

const openCrew = async (page: Page): Promise<void> => {
  await page.locator('#crew-button').dispatchEvent('click');
  await expect(page.locator('#crew-panel')).toBeVisible();
  await expect.poll(async () => (await diagnostics(page)).crewOpen).toBe(true);
};

const closeCrew = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /fermer la gestion/i }).click();
  await expect.poll(async () => (await diagnostics(page)).crewOpen).toBe(false);
};

const recruitUntil = async (page: Page, count: number): Promise<void> => {
  while (true) {
    const before = (await diagnostics(page)).workers;
    if (before >= count) break;
    await page.getByRole('button', { name: /appeler un renard/i }).click();
    await expect.poll(async () => (await diagnostics(page)).workers).toBe(before + 1);
  }
  await expect(page.locator('.worker-card')).toHaveCount(count);
};

const upgradeWorker = async (page: Page, name: string): Promise<void> => {
  const card = page.locator('.worker-card').filter({ hasText: name });
  await card.getByRole('button', { name: new RegExp(`Sélectionner ${name}`, 'i') }).click();
  await page.locator('#worker-detail').getByRole('button', { name: new RegExp(`Améliorer ${name}`, 'i') }).click();
};

const assignWorker = async (page: Page, name: string, task: string): Promise<void> => {
  const card = page.locator('.worker-card').filter({ hasText: name });
  await card.getByRole('button', { name: new RegExp(`Sélectionner ${name}`, 'i') }).click();
  const taskKind: Record<string, string> = {
    bois: 'wood',
    pierre: 'stone',
    cuivre: 'copper',
    cristal: 'crystal',
  };
  const kind = taskKind[task];
  if (!kind) throw new Error(`Métier inconnu : ${task}`);
  await page.locator(`.job-${kind}`).click();
};

const PROJECT_HALLS = [
  { x: 7, z: -3.8, name: 'Maison des Travaux des Marées' },
  { x: 6, z: -23.2, name: 'Maison des Travaux des Pins' },
  { x: 22, z: -43.2, name: 'Maison des Travaux Cuivrée' },
  { x: 5, z: -65.2, name: 'Maison des Travaux de Cristal' },
  { x: 21, z: -87.2, name: 'Maison des Travaux de la Couronne' },
] as const;

const PROJECT_IDS = [
  'starter_tools',
  'trail_markers',
  'tidal_nursery',
  'timber_reserve',
  'towing_paths',
  'shared_warehouse',
  'communal_sawmill',
  'shore_walls',
  'orders_office',
  'copper_winches',
  'hauling_rails',
  'maintenance_yard',
  'crystal_beacons',
  'prismatic_reservoir',
  'unity_lighthouse',
] as const;

const completeProjectsUntil = async (
  page: Page,
  count: number,
  moveTo: ReturnType<typeof createNavigator>['moveTo'],
): Promise<void> => {
  while ((await diagnostics(page)).projects < count) {
    const before = (await diagnostics(page)).projects;
    const hall = PROJECT_HALLS[Math.floor(before / 3)];
    const projectId = PROJECT_IDS[before];
    if (!hall || !projectId) throw new Error(`Travail ${before + 1} introuvable`);
    if (await page.locator('#projects-panel').isHidden()) {
      await moveTo(hall.x, hall.z, 0.9);
      await expect(page.locator('#context-prompt')).toContainText(hall.name);
      if (await page.locator('#action-button').getByText('BÂTIR', { exact: true }).isVisible()) {
        const hallCount = (await diagnostics(page)).projectHalls;
        await page.locator('#action-button').tap();
        await expect.poll(async () => (await diagnostics(page)).projectHalls).toBe(hallCount + 1);
      }
      await page.locator('#action-button').tap();
      await expect(page.locator('#projects-panel')).toBeVisible();
      await page.waitForTimeout(380);
    }
    // Le clic reconstruit immédiatement les trois cartes : dispatchEvent évite
    // que Playwright ne retente l’ancien nœud devenu « achevé » entre down/up.
    await page.locator(`button[data-project="${projectId}"]`).dispatchEvent('click');
    await expect.poll(async () => (await diagnostics(page)).projects).toBe(before + 1);
    if ((before + 1) % 3 === 0 || before + 1 >= count) {
      await page.getByRole('button', { name: /fermer les Grands Travaux/i }).click();
      await expect(page.locator('#projects-panel')).toBeHidden();
    }
  }
};

const openTalents = async (page: Page): Promise<void> => {
  await page.locator('#talent-button').dispatchEvent('click');
  await expect(page.getByRole('dialog', { name: 'Arbre des savoirs' })).toBeVisible();
  await expect.poll(async () => (await diagnostics(page)).talentOpen).toBe(true);
};

const buySkill = async (page: Page, name: RegExp): Promise<void> => {
  await page.getByRole('button', { name }).click();
  await expect(page.locator('#skill-inspector')).toBeVisible();
  await page.locator('#skill-buy-button').click();
};

test('la première marée explique puis assemble le dépôt physique avant toute économie', async ({ page }) => {
  // Le premier chargement valide aussi les nouveaux packs 3D et leurs
  // animations ; le tout premier décodage des packs 3D peut dépasser une
  // minute dans Chromium quand WebGL fonctionne entièrement en logiciel.
  test.setTimeout(120_000);
  await page.goto('./');
  await page.waitForFunction(() => Boolean((window as typeof window & { __ILOTA__?: { ready: boolean } }).__ILOTA__?.ready));
  await page.getByRole('button', { name: /commencer/i }).click();
  await expect(page.locator('#tutorial-panel')).toBeVisible();
  await expect(page.locator('#tutorial-title')).toHaveText('Bienvenue dans Ilota');
  await expect(page.locator('#tutorial-detail')).toContainText('Dépôt des Marées');
  await page.locator('#tutorial-continue-button').click();

  expect((await diagnostics(page)).warehouses).toBe(0);
  const { moveTo } = createNavigator(page);
  await moveTo(-7, -3.8, 0.7);
  await expect(page.locator('#context-prompt')).toContainText('Assembler Dépôt des Marées');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).warehouses).toBe(1);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings).toBeGreaterThan(0);
  await expect(page.locator('#tutorial-panel')).toBeVisible();
  await expect(page.locator('#tutorial-detail')).toContainText('tomberont une à une');
  await page.locator('#tutorial-continue-button').click();
  await expect.poll(async () => (await diagnostics(page)).inputEnabled).toBe(true);
  expect(await diagnostics(page)).toMatchObject({
    managementOpen: false,
    blockingOverlay: false,
  });

  // Le bâtiment fraîchement assemblé ne doit ni bloquer le renard ni laisser
  // les contrôles tactiles suspendus après la fermeture du tutoriel.
  await moveTo(-7, -5.8, 0.6);
  await moveTo(-7, -1.8, 0.6);
  await moveTo(-8.7, -0.15, 0.55);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBe(1);
  expect((await diagnostics(page)).wood).toBe(0);
  await page.screenshot({ path: 'test-results/ilota-visible-player-cargo.png' });

  // Le dépôt reste interactif depuis sa façade même sans volume bloquant.
  await moveTo(-7, -2, 0.65);
  await expect(page.locator('#action-button')).toContainText('DÉCHARGER');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBe(0);
  await expect.poll(async () => (await diagnostics(page)).wood).toBe(1);
});

test('le portail du World 2 exige cinq Marées et les 32 talents maximisés', async ({ page }) => {
  const tree = maximizedSkillTree();
  tree.skillRanks.cargo_harness = 5;
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    ...tree,
    rebirths: 5,
    tutorialSeen: ['welcome'],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(-7.2, 7.2, 0.7);
  await expect(page.locator('#context-prompt')).toContainText('faille temporelle scellée');
  await expect(page.locator('#context-prompt')).toContainText('31/32');
  await expect(page.locator('#action-button')).toContainText('VERROUILLÉ');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).currentWorld).toBe(1);
  expect((await diagnostics(page)).worldTwoPortalUnlocked).toBe(false);
});

test('les ponts du World 1 retrouvent leurs planches et leurs cordages procéduraux', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    bridgesBuilt: [true, true, true, true],
    tutorialSeen: ['welcome'],
  });
  await waitForGame(page);
  expect((await diagnostics(page)).bridges).toBe(4);
  const state = await diagnostics(page);
  expect(state.bridgePlanks).toBeGreaterThan(60);
  expect(state.bridgeVisualParts - state.bridgePlanks).toBe(8);
  expect(await page.evaluate(() => performance.getEntriesByType('resource')
    .some((entry) => entry.name.includes('kaykit-bridge')))).toBe(false);
  await page.screenshot({ path: 'test-results/ilota-procedural-wooden-bridges.png' });
});

test('un nouveau pont se construit réellement planche par planche', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    projectHallsBuilt: [true, false, false, false],
    projectsCompleted: ['starter_tools', 'trail_markers', 'tidal_nursery'],
    workers: [
      { id: 'worker-1', name: 'Milo', task: 'wood', level: 1 },
      { id: 'worker-2', name: 'Nila', task: 'stone', level: 1 },
    ],
    tutorialSeen: ['welcome', 'pins-logistics'],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(0, -11.25, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Pins');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(1);
  await expect.poll(async () => (await diagnostics(page)).bridgesBuilding).toBe(1);
  await expect.poll(async () => (await diagnostics(page)).scaledBridgePlanks).toBeGreaterThan(1);
  await page.screenshot({ path: 'test-results/ilota-bridge-plank-construction.png' });
  await expect.poll(async () => (await diagnostics(page)).bridgesBuilding, { timeout: 4_000 }).toBe(0);
  expect((await diagnostics(page)).scaledBridgePlanks).toBe(0);
});

test('le portail anime l’aller vers le World 2 puis permet le retour au World 1', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    ...maximizedSkillTree(),
    rebirths: 5,
    campBuilt: true,
    warehousesBuilt: [false, false, false, false, false],
    playerCargo: { wood: 2, stone: 0, copper: 0, crystal: 0 },
    worldTwoCargo: { cobalt: 1, amethyst: 1 },
    industrySurge: true,
    explorationFlow: true,
    powerVfx: true,
    worldTwoTerracesUnlocked: 11,
    tutorialSeen: ['welcome', 'world-2'],
  });
  await waitForGame(page);
  await expect(page.locator('#crew-button')).toBeVisible();
  await expect(page.locator('#power-vfx')).toHaveClass(/industry-active/, { timeout: 10_000 });
  const { moveTo } = createNavigator(page);
  await moveTo(-7.2, 7.2, 0.7);
  await expect(page.locator('#context-prompt')).toContainText('Ascension du Zénith');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).worldTravelPathVisible).toBe(true);
  expect((await diagnostics(page)).worldTravelObjects).toBeLessThanOrEqual(7);
  await page.waitForTimeout(1_250);
  await page.screenshot({ path: 'test-results/ilota-world-2-grounded-travel.png' });
  await expect.poll(async () => (await diagnostics(page)).currentWorld).toBe(2);
  await expect.poll(async () => (await diagnostics(page)).worldTravelPathVisible).toBe(false);
  await expect(page.locator('#crew-button')).toBeHidden();
  await expect(page.locator('#power-vfx')).not.toHaveClass(/industry-active|exploration-active/);
  await expect(page.locator('#power-vfx-label')).toBeEmpty();
  expect((await diagnostics(page)).playerCargoVisualKinds.split(',')).toEqual(['cobalt', 'amethyst']);
  await expect(page.locator('#objective-eyebrow')).toHaveText('WORLD 2 · MONTAGNE DU ZÉNITH');
  await expect(page.locator('#island-goal-island')).toContainText('CAMP DES ÉCHOS');

  await moveTo(WORLD_TWO_TERRACES[0]!.x - 3.5, WORLD_TWO_TERRACES[0]!.z - 1.4, 0.72);
  await expect.poll(async () => (await diagnostics(page)).interaction).toBe('warehouse');
  await expect(page.locator('#context-prompt')).toBeVisible();
  await expect(page.locator('#context-prompt')).toContainText('Refuge des Échos');
  await expect(page.locator('#action-button')).toContainText('VENDRE');
  await moveTo(WORLD_TWO_TERRACES[0]!.x, WORLD_TWO_TERRACES[0]!.z + 6.3, 0.65);
  await expect(page.locator('#context-prompt')).toContainText('Portail de retour');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).currentWorld).toBe(1);
  expect((await diagnostics(page)).playerCargoVisualKinds).toBe('wood,wood');

  // L'animation de retour dépose déjà le renard devant le portail : on peut
  // repartir immédiatement sans imposer un détour artificiel dans le décor.
  await expect.poll(async () => (await diagnostics(page)).interaction).toBe('portal');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).currentWorld).toBe(2);
});

test.describe('traversée physique du World 2', () => {
  test('les onze terrasses et leurs rampes restent praticables jusqu’au Zénith', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
      ...richSave(),
      ...maximizedSkillTree(),
      rebirths: 5,
      currentWorld: 2,
      worldTwoTerracesUnlocked: 11,
      tutorialSeen: ['welcome', 'world-2'],
    });
    await waitForGame(page);
    await expect.poll(async () => (await diagnostics(page)).worldTwoMinerals).toBe(30);
    await expect.poll(async () => (await diagnostics(page)).worldTwoLockedMinerals).toBe(29);
    await expect.poll(async () => (await diagnostics(page)).worldTwoMineableDark).toBe(0);
    const { moveTo } = createNavigator(page);
    for (const [index, terrace] of WORLD_TWO_TERRACES.entries()) {
      const isSummit = index === WORLD_TWO_TERRACES.length - 1;
      // Le Cœur doré et son gardien occupent volontairement le centre du
      // sommet : atteindre la sortie de la dernière rampe suffit à le valider.
      await moveTo(terrace.x, isSummit ? terrace.z + 7 : terrace.z, isSummit ? 0.9 : 0.82);
      await expect.poll(async () => (await diagnostics(page)).worldTwoTerrace).toBe(index);
    }
    await expect.poll(async () => (await diagnostics(page)).worldTwoPeakReached).toBe(true);
    await expect(page.locator('#island-goal-title')).toContainText('SOMMET ÉVEILLÉ');
    await expect(page.locator('#island-goal-count')).toHaveText('11/11');
    await page.screenshot({ path: 'test-results/ilota-world-2-zenith.png' });
  });
});

test('le World 2 vend la pierre et améliore les crocs avec son argent', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    ...maximizedSkillTree(),
    rebirths: 5,
    currentWorld: 2,
    worldTwoMoney: 1_000,
    tutorialSeen: ['welcome', 'world-2'],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await expect.poll(async () => (await diagnostics(page)).worldTwoMineableDark).toBe(0);

  // Le premier filon de pierre est le seul minerai coloré au départ.
  await moveTo(162.45, 1.75, 0.7);
  await expect(page.locator('#context-prompt')).toContainText('Pierre');
  for (let index = 0; index < 8; index += 1) {
    await page.locator('#action-button').tap();
    await page.waitForTimeout(460);
  }
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBe(8);
  expect((await diagnostics(page)).playerCargoVisualKinds.split(',')).toEqual(Array(8).fill('stone'));

  await moveTo(156.3, -1.4, 0.72);
  await expect(page.locator('#action-button')).toContainText('VENDRE');
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBe(0);
  await expect.poll(async () => (await diagnostics(page)).worldTwoMoney).toBe(1_040);

  for (const terrace of WORLD_TWO_TERRACES.slice(1, 4)) {
    await moveTo(terrace.x, terrace.z, 0.82);
  }
  const shrine = WORLD_TWO_TERRACES[3]!;
  await moveTo(shrine.x - 2.55, shrine.z + 1.2, 0.75);
  await expect(page.locator('#action-button')).toContainText('MÉDITER');
  await page.keyboard.press('KeyE');
  const fangCard = page.getByRole('button', { name: /Crocs du voyageur/ });
  await expect(fangCard).toBeEnabled();
  await fangCard.click();
  await expect.poll(async () => (await diagnostics(page)).worldTwoFangLevel).toBe(2);
  await expect.poll(async () => (await diagnostics(page)).worldTwoLockedMinerals).toBe(28);
  await expect.poll(async () => (await diagnostics(page)).worldTwoMineableDark).toBe(0);
  await page.screenshot({ path: 'test-results/ilota-world-2-fang-economy.png' });
});

test('la tanière recrute avec de l’argent et lance les animations du nouveau loup', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    ...maximizedSkillTree(),
    rebirths: 5,
    currentWorld: 2,
    worldTwoMoney: 1_000,
    tutorialSeen: ['welcome', 'world-2'],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(163.55, -1.4, 0.72);
  await expect(page.locator('#action-button')).toContainText('RECRUTER');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).worldTwoWolfAnimations).toMatch(/run|act|walk/);
  await page.screenshot({ path: 'test-results/ilota-world-2-professional-wolf.png' });
});

test('le Savoir reste visible et une ancienne île ne rouvre jamais ses objectifs payés', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    version: 7,
    wood: 0,
    stone: 0,
    copper: 0,
    crystal: 0,
    knowledge: 7,
    warehousesBuilt: [true, false, false, false, false],
    playerCargo: { wood: 0, stone: 0, copper: 0, crystal: 0 },
    bridgesBuilt: [true, false, false, false],
    powerNotifications: false,
    powerVfx: true,
    tutorialSeen: ['welcome', 'warehouse-central', 'island-goals', 'bridge-guidance'],
  });
  await waitForGame(page);
  await expect(page.locator('#knowledge-count')).toHaveText('7');
  await expect(page.locator('#island-goal')).toBeHidden();
  const state = await diagnostics(page);
  // La migration marque désormais la Maison des Travaux de l'île 1 comme
  // déjà payée lorsque l'ancien pont existe, afin de ne rouvrir aucun objectif.
  expect(state.projectHalls).toBe(1);
  expect(state.knowledge).toBe(7);
});

test('le HUD compact garde le monde visible et déplie les objectifs à la demande', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    version: 7,
    warehousesBuilt: [true, false, false, false, false],
    playerCargo: { wood: 0, stone: 0, copper: 0, crystal: 0 },
    powerNotifications: false,
    powerVfx: true,
    tutorialSeen: ['welcome', 'warehouse-central', 'island-goals'],
  });
  await waitForGame(page);

  const compact = await page.evaluate(() => {
    const rect = (selector: string): DOMRect => document.querySelector(selector)!.getBoundingClientRect();
    const menu = rect('#menu-button');
    const objective = rect('#objective');
    const resources = rect('.resources');
    const goal = rect('#island-goal');
    return {
      menuWidth: menu.width,
      objectiveHeight: objective.height,
      goalHeight: goal.height,
      goalRightGap: innerWidth - goal.right,
      topGap: resources.left - objective.right,
    };
  });
  expect(compact.menuWidth).toBeLessThanOrEqual(46);
  expect(compact.objectiveHeight).toBeLessThanOrEqual(46);
  expect(compact.goalHeight).toBeLessThanOrEqual(90);
  expect(compact.goalRightGap).toBeLessThanOrEqual(10);
  expect(compact.topGap).toBeGreaterThanOrEqual(12);

  const toggle = page.locator('#island-goal-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#island-goal')).toHaveClass(/expanded/);
  await expect(page.locator('#island-goal li')).toHaveCount(8);
  const itemFont = await page.locator('#island-goal li').first().evaluate((item) =>
    Number.parseFloat(getComputedStyle(item).fontSize));
  expect(itemFont).toBeGreaterThanOrEqual(9);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('l’Autel du Savoir exige les quatre grandes réserves sur l’île de Cristal', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    version: 7,
    wood: 200,
    stone: 200,
    copper: 200,
    crystal: 200,
    campBuilt: true,
    workshopBuilt: true,
    foundryBuilt: true,
    bridgesBuilt: [true, true, true, false],
    warehousesBuilt: [true, false, false, false, false],
    playerCargo: { wood: 0, stone: 0, copper: 0, crystal: 0 },
    powerNotifications: false,
    powerVfx: true,
    tutorialSeen: ['welcome', 'warehouse-central', 'island-goals', 'observatory'],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(0, -12.1, 0.65);
  await moveTo(0, -17.9, 0.65);
  await moveTo(5.68, -34.11, 0.65);
  await moveTo(10.13, -39.66, 0.65);
  // Suit les jonctions des îles et des ponts jusqu'à l'île de Cristal.
  await moveTo(15, -48.5, 0.8);
  await moveTo(12.2, -53.3, 0.8);
  await moveTo(10.26, -54.44, 0.65);
  await moveTo(4.68, -61.64, 0.65);
  // Reste sur la surface de l'île avant de rejoindre l'Autel.
  await moveTo(2, -65.5, 0.8);
  await moveTo(2, -71.5, 0.8);
  await moveTo(2, -75.8, 0.9);
  await moveTo(-1, -75.8, 1.1);
  await expect(page.locator('#context-prompt')).toContainText('Autel du Savoir');
  await expect(page.locator('#context-prompt')).toContainText('78 bois · 68 pierre · 48 cuivre · 24 cristal');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).observatoryBuilt).toBe(true);
  expect(await diagnostics(page)).toMatchObject({ wood: 122, stone: 132, copper: 152, crystal: 176 });
  await page.screenshot({ path: 'test-results/ilota-central-knowledge-altar.png' });
});

test('les harnais agrandis forment une pile compacte au-dessus du dos', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    version: 7,
    wood: 0,
    stone: 0,
    copper: 0,
    crystal: 0,
    warehousesBuilt: [true, false, false, false, false],
    playerCargo: { wood: 0, stone: 16, copper: 0, crystal: 0 },
    skills: ['cargo_harness'],
    skillRanks: { cargo_harness: 2 },
    powerNotifications: false,
    powerVfx: true,
    tutorialSeen: ['welcome', 'warehouse-central'],
  });
  await waitForGame(page);
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBe(16);
  await expect.poll(async () => (await diagnostics(page)).playerCargoStackHeight).toBeGreaterThan(1.2);
  await page.screenshot({ path: 'test-results/ilota-vertical-cargo-stack.png' });
});

test('le Conseil itinérant ouvre métiers, recrutement et formations depuis le HUD', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    foundryBuilt: true,
    observatoryBuilt: true,
    workers: [{ id: 'worker-1', name: 'Milo', task: 'wood', level: 1 }],
    skills: ['remote_management'],
  });
  await waitForGame(page);
  await expect(page.locator('#crew-button')).toBeVisible();
  await page.locator('#crew-button').click();
  await expect(page.getByRole('heading', { name: 'Dirige tes renards où que tu sois' })).toBeVisible();
  await upgradeWorker(page, 'Milo');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBe(2);
  await upgradeWorker(page, 'Milo');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBe(3);
  await assignWorker(page, 'Milo', 'cristal');
  await expect.poll(async () => (await diagnostics(page)).workerTasks).toBe('crystal');
  await recruitUntil(page, 2);
  await expect(page.locator('#crew-capacity')).toContainText('2 /');
  await page.screenshot({ path: 'test-results/ilota-remote-council.png' });
});

test('le tutoriel neuf explique la nurserie puis le panneau d’objectifs', async ({ page }) => {
  test.setTimeout(45_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    version: 6,
    warehousesBuilt: [true, false, false, false, false],
    playerCargo: { wood: 0, stone: 0, copper: 0, crystal: 0 },
    industrySurge: false,
    explorationFlow: false,
    tutorialSeen: ['welcome', 'warehouse-central'],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(0, 6.8, 1.15);
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).campBuilt).toBe(true);
  await expect(page.locator('#tutorial-title')).toHaveText('La nurserie');
  await expect(page.locator('#tutorial-detail')).toContainText('recruter');
  await page.locator('#tutorial-continue-button').click();

  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Recrute et place tes renards' })).toBeVisible();
  await recruitUntil(page, 2);
  await closeCrew(page);
  await expect(page.locator('#tutorial-panel')).toBeVisible();
  await expect(page.locator('#tutorial-title')).toHaveText('Ton objectif d’île');
  await expect(page.locator('#tutorial-detail')).toContainText('Chaque ligne devient verte');
});

test('les ressources rétrécissent à chaque coup puis disparaissent sur iPhone SE paysage', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    wood: 0,
    stone: 0,
    copper: 0,
    crystal: 0,
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(-8.7, -0.15, 0.55);

  const beforeStock = (await diagnostics(page)).wood;
  const beforeCargo = (await diagnostics(page)).playerCargo;
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBeGreaterThan(beforeCargo);
  expect((await diagnostics(page)).wood).toBe(beforeStock);
  await page.waitForTimeout(560);
  const firstHit = (await diagnostics(page)).lastHarvest;
  expect(firstHit).not.toBeNull();

  await page.keyboard.press('KeyE');
  await page.waitForTimeout(460);
  const secondHit = (await diagnostics(page)).lastHarvest;
  expect(secondHit?.remaining).toBe((firstHit?.remaining ?? 0) - 1);
  expect(secondHit?.scale ?? 99).toBeLessThan(firstHit?.scale ?? 0);

  await page.keyboard.down('KeyE');
  await page.waitForTimeout(2400);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(450);
  const depleted = (await diagnostics(page)).lastHarvest;
  expect(depleted?.remaining).toBe(0);
  expect(depleted?.scale ?? 99).toBeLessThan(0.08);
  await page.screenshot({ path: 'test-results/ilota-resource-depleted.png' });

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await diagnostics(page)).facingAlignment).toBeGreaterThan(0.92);

  const metrics = await page.evaluate(() => {
    const controls = document.getElementById('touch-controls')!.getBoundingClientRect();
    const action = document.getElementById('action-button')!.getBoundingClientRect();
    const joystick = document.getElementById('joystick')!.getBoundingClientRect();
    const chips = [...document.querySelectorAll<HTMLElement>('.resource-chip')].map((chip) => chip.getBoundingClientRect());
    const resourceBox = document.querySelector<HTMLElement>('.resources')!.getBoundingClientRect();
    const objective = document.getElementById('objective')!.getBoundingClientRect();
    const menu = document.getElementById('menu-button')!.getBoundingClientRect();
    const resourceLabels = [...document.querySelectorAll<HTMLElement>('.resource-chip small')];
    const islandGoalTitle = document.getElementById('island-goal-title')!;
    const state = (window as typeof window & { __ILOTA__: IlotaDiagnostics }).__ILOTA__;
    return {
      controlsInside: controls.width <= innerWidth && controls.height <= innerHeight,
      actionInside: action.right <= innerWidth && action.bottom <= innerHeight && action.left >= 0 && action.top >= 0,
      joystickInside: joystick.right <= innerWidth && joystick.bottom <= innerHeight && joystick.left >= 0 && joystick.top >= 0,
      chipsInside: chips.length === 5 && chips.every((chip) => chip.left >= 0 && chip.right <= innerWidth),
      topHudSeparated: menu.right + 3 <= objective.left && objective.right + 3 <= resourceBox.left,
      resourceLabelsVisible: resourceLabels.every((label) =>
        label.scrollWidth <= label.clientWidth + 1
        && label.getBoundingClientRect().right <= label.parentElement!.getBoundingClientRect().right),
      islandGoalTitleVisible: islandGoalTitle.scrollHeight <= islandGoalTitle.clientHeight + 1,
      assetsLoaded: state.assetsLoaded,
      fps: state.fps,
    };
  });
  expect(metrics.controlsInside).toBe(true);
  expect(metrics.actionInside).toBe(true);
  expect(metrics.joystickInside).toBe(true);
  expect(metrics.chipsInside).toBe(true);
  expect(metrics.topHudSeparated).toBe(true);
  expect(metrics.resourceLabelsVisible).toBe(true);
  expect(metrics.islandGoalTitleVisible).toBe(true);
  expect(metrics.assetsLoaded).toBeGreaterThanOrEqual(20);
  expect((await diagnostics(page)).visibleIslands).toBe(1);
  // Le rendu WebGL logiciel de Playwright n'est pas un benchmark GPU mobile :
  // on contrôle ici que la boucle reste vivante pendant la récolte, sans
  // réintroduire l'ancien plancher artificiel lié au clamp à 50 ms.
  expect(metrics.fps).toBeGreaterThanOrEqual(9);
  expect(errors).toEqual([]);
});

test('recrute, réaffecte et améliore plusieurs travailleurs dans le panneau tactile', async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    bridgesBuilt: [true, false, false, false],
  });
  await waitForGame(page);
  await openCrew(page);
  await recruitUntil(page, 3);
  await expect(page.locator('#worker-detail')).toContainText('Sève');
  await expect(page.locator('.job-wood')).toContainText('55 · 60 %');
  await expect(page.locator('.job-copper')).toContainText('MÉTIER VERROUILLÉ');
  await assignWorker(page, 'Milo', 'pierre');
  await closeCrew(page);
  const { moveTo } = createNavigator(page);
  await moveTo(0, -12.1, 0.6);
  await moveTo(0, -17.9, 0.7);
  await moveTo(0, -31.8, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Atelier des Pins');
  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Former au niveau 2' })).toBeVisible();
  await upgradeWorker(page, 'Milo');
  await expect(page.locator('.worker-detail-burst')).toHaveCount(1);
  await page.waitForTimeout(900);
  await expect(page.locator('.worker-detail-burst')).toHaveCount(0);
  await expect(page.locator('#worker-detail')).toContainText('Milo');
  await expect(page.locator('#worker-detail')).toContainText('NIV 2');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBe(4);
  await expect.poll(async () => (await diagnostics(page)).workerTasks.split(',')[0]).toBe('stone');
  await expect(page.locator('#worker-detail')).toContainText('pierre');

  const panelMetrics = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.crew-sheet')!.getBoundingClientRect();
    const assignment = document.querySelector<HTMLButtonElement>('.worker-select')!.getBoundingClientRect();
    const close = document.getElementById('crew-close-button')!.getBoundingClientRect();
    const touchTargets = [...document.querySelectorAll<HTMLButtonElement>(
      '.job-dock:not(:disabled), .worker-select, .upgrade-button:not(:disabled), #recruit-button:not(:disabled)',
    )].map((button) => button.getBoundingClientRect()).filter((target) => target.width > 0 && target.height > 0);
    return {
      panelInside: panel.left >= 0 && panel.top >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
      assignmentTarget: assignment.width >= 24 && assignment.height >= 36,
      closeTarget: close.width >= 44 && close.height >= 44,
      allTouchTargets: touchTargets.length > 0 && touchTargets.every((target) => target.width >= 44 && target.height >= 44),
    };
  });
  expect(panelMetrics).toEqual({
    panelInside: true,
    assignmentTarget: true,
    closeTarget: true,
    allTouchTargets: true,
  });
  await page.screenshot({ path: 'test-results/ilota-crew-management.png' });
  await closeCrew(page);
});

test('la nurserie garde 16 renards lisibles et ouvre une vraie fiche de niveau', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  const names = ['Milo', 'Nila', 'Sève', 'Roc', 'Pollen', 'Lune', 'Braise', 'Azur', 'Orme', 'Mousse', 'Silex', 'Écho', 'Ronce', 'Aube', 'Flint', 'Nacre'];
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    foundryBuilt: true,
    observatoryBuilt: true,
    bridgesBuilt: [true, true, true, true],
    skills: ['archipelago_consciousness', 'expanded_roster'],
    skillRanks: { archipelago_consciousness: 1, expanded_roster: 5 },
    workers: names.map((name, index) => ({
      id: `worker-${index + 1}`,
      name,
      task: ['wood', 'stone', 'copper', 'crystal'][index % 4],
      level: index % 3 === 0 ? 2 : 1,
    })),
  });
  await waitForGame(page);
  await openCrew(page);
  await expect(page.locator('.worker-card')).toHaveCount(16);
  await expect(page.locator('.worker-card .worker-identity small')).toHaveCount(16);
  await expect(page.locator('.worker-card .worker-identity small').filter({ hasText: 'NIV' })).toHaveCount(16);

  const lastFox = page.locator('.worker-card').filter({ hasText: 'Nacre' });
  await page.locator('#worker-list').evaluate((roster) => { roster.scrollTop = roster.scrollHeight; });
  await expect(lastFox).toBeVisible();
  await lastFox.getByRole('button', { name: /sélectionner Nacre/i }).click();
  await expect(page.locator('#worker-detail')).toContainText('Nacre');
  await expect(page.locator('#worker-detail')).toContainText('NIV 2');
  await expect(page.locator('#worker-detail')).toContainText('COUP +2 · SAC 8');
  await expect(page.locator('#worker-detail')).toContainText('1,25 s/frappe');
  await expect(page.locator('#worker-detail')).toContainText('NIV 3 · +3/COUP · SAC 12 · 0,90 S');
  await expect(page.locator('#worker-detail').getByRole('button')).toBeDisabled();
  await expect(page.locator('#worker-detail')).toContainText('FONDERIE REQUISE');
  await page.screenshot({ path: 'test-results/ilota-nursery-16-foxes.png' });
});

test('une Maison identique présente et assemble les trois Travaux de chaque île', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    bridgesBuilt: [false, false, false, false],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(PROJECT_HALLS[0].x, PROJECT_HALLS[0].z, 0.9);
  await expect(page.locator('#context-prompt')).toContainText(PROJECT_HALLS[0].name);
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).projectHalls).toBe(1);
  await expect(page.locator('#context-prompt')).toContainText('0/3');
  await page.locator('#action-button').tap();
  await expect(page.locator('#projects-panel')).toBeVisible();
  await expect.poll(async () => (await diagnostics(page)).projects).toBe(0);
  await page.waitForTimeout(380);
  await expect(page.locator('.project-card')).toHaveCount(3);
  const projectMetrics = await page.locator('.project-card').evaluateAll((cards) => cards.map((card) => {
    const copy = card.querySelector<HTMLElement>('.project-copy')!;
    return {
      width: card.getBoundingClientRect().width,
      nameFont: Number.parseFloat(getComputedStyle(card.querySelector('strong')!).fontSize),
      detailFont: Number.parseFloat(getComputedStyle(card.querySelector('small')!).fontSize),
      copyFits: copy.scrollHeight <= copy.clientHeight + 1,
    };
  }));
  projectMetrics.forEach((metric) => {
    expect(metric.width).toBeGreaterThanOrEqual(160);
    expect(metric.nameFont).toBeGreaterThanOrEqual(10);
    expect(metric.detailFont).toBeGreaterThanOrEqual(8);
    expect(metric.copyFits).toBe(true);
  });
  await page.screenshot({ path: 'test-results/ilota-readable-three-works.png' });
  await completeProjectsUntil(page, 3, moveTo);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings).toBeGreaterThan(0);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings, { timeout: 4_000 }).toBe(0);
  await expect(page.locator('#projects-panel')).toBeHidden();
  await expect(page.locator('#island-goal')).toContainText('5/8');
  await expect(page.locator('#island-goal')).toContainText('Réunir 2 renards');
  await page.screenshot({ path: 'test-results/ilota-grand-works.png' });
});

test('affiche l’invitation à tourner le téléphone en portrait', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./');
  await expect(page.locator('.rotate-screen')).toBeVisible();
  await expect(page.getByText('Tourne ton téléphone')).toBeVisible();
});

test('le menu reprend la partie et grise la Nouvelle Marée tant que l’acte continue', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await waitForGame(page);
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu de la Marée' })).toBeVisible();
  await expect(page.locator('#menu-tide-button')).toBeDisabled();
  await expect(page.locator('#menu-tide-help')).toContainText('Termine et éveille le Cœur');
  await expect.poll(async () => (await diagnostics(page)).menuOpen).toBe(true);
  await page.screenshot({ path: 'test-results/ilota-menu.png' });
  await page.getByRole('button', { name: 'REPRENDRE' }).click();
  await expect.poll(async () => (await diagnostics(page)).menuOpen).toBe(false);
});

test('reprend une sauvegarde v1 au début du deuxième chapitre', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ilota-save-v1', JSON.stringify({
    version: 1,
    wood: 22,
    stone: 17,
    campBuilt: true,
    woodWorker: true,
    stoneWorker: true,
    bridgeBuilt: true,
    cacheFound: true,
    completed: true,
    elapsedSeconds: 62,
  })));
  await waitForGame(page);
  const state = await diagnostics(page);
  expect(state).toMatchObject({ workers: 2, bridges: 1, chapter: 2, completed: false });
  await expect(page.getByText('Construis l’atelier des Pins')).toBeVisible();
});

test('les ouvriers restent sur les îles et empruntent les ponts, même après réaffectation', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    foundryBuilt: true,
    observatoryBuilt: true,
    bridgesBuilt: [true, true, true, true],
    workers: [{ id: 'worker-1', name: 'Milo', task: 'wood', level: 2 }],
  });
  await waitForGame(page);
  await openCrew(page);
  const card = page.locator('.worker-card').filter({ hasText: 'Milo' });
  await card.getByRole('button', { name: /sélectionner Milo/i }).click();
  const before = (await diagnostics(page)).workerNavigation[0]!;
  await page.locator('.job-crystal').click();
  await expect.poll(async () => (await diagnostics(page)).workerTasks).toBe('crystal');
  const after = (await diagnostics(page)).workerNavigation[0]!;
  // Le renard continue à marcher pendant l’interaction tactile (~0,8 s),
  // mais un saut inter-îles mesurerait au minimum une dizaine d’unités.
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(3.8);
  expect(after.routeBridges).toEqual(expect.arrayContaining([0, 1, 2]));
  await closeCrew(page);
  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(350);
    expect((await diagnostics(page)).workersOnWalkable).toBe(true);
  }
  expect((await diagnostics(page)).workerNavigation[0]!.bridgesUsed).toEqual(expect.arrayContaining([0, 1, 2]));
});

test('un renard niveau 1 frappe par unité mais remplit une tournée utile de quatre', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    stone: 0,
    campBuilt: true,
    workers: [{ id: 'worker-1', name: 'Milo', task: 'stone', level: 1 }],
  });
  await waitForGame(page);
  await expect.poll(async () => (await diagnostics(page)).workerNavigation[0]?.phase, { timeout: 15_000 })
    .toBe('gathering');
  expect((await diagnostics(page)).workerNavigation[0]!.targetDistance).toBeGreaterThan(0.65);
  expect((await diagnostics(page)).workerNavigation[0]!.animation).toBe('act');
  await expect.poll(async () => (await diagnostics(page)).lastWorkerHarvest, { timeout: 15_000 })
    .not.toBeNull();
  const mined = (await diagnostics(page)).lastWorkerHarvest!;
  const node = (await diagnostics(page)).resourceNodes.find((candidate) => candidate.id === mined.nodeId)!;
  expect(mined.gathered).toBe(1);
  expect(node.amount).toBe(node.capacity - 1);
  await expect.poll(async () => {
    const worker = (await diagnostics(page)).workerNavigation[0]!;
    return worker.cargo > 0 ? `${worker.cargo}:${worker.cargoVisuals}` : '';
  }).toBe('1:1');
  expect((await diagnostics(page)).stone).toBe(0);

  await expect.poll(async () => {
    const state = await diagnostics(page);
    return Math.max(state.workerNavigation[0]?.cargo ?? 0, state.stone);
  }, { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
  await expect.poll(async () => (await diagnostics(page)).stone, { timeout: 30_000 }).toBeGreaterThanOrEqual(4);
});

test('les Tournées complètes enchaînent les filons avant le retour au dépôt', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    stone: 0,
    campBuilt: true,
    foundryBuilt: true,
    workers: [{ id: 'worker-1', name: 'Milo', task: 'stone', level: 3 }],
    skills: ['full_loads'],
    skillRanks: { full_loads: 1 },
  });
  await waitForGame(page);
  await expect.poll(async () => {
    const state = await diagnostics(page);
    return Math.max(state.workerNavigation[0]?.cargo ?? 0, state.stone);
  }, { timeout: 45_000 }).toBeGreaterThanOrEqual(12);
});

test('l’Instinct de relève empêche un renard de rester statique sans filon accessible', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    foundryBuilt: true,
    bridgesBuilt: [false, false, false, false],
    workers: [{ id: 'worker-1', name: 'Milo', task: 'copper', level: 2 }],
    skills: ['adaptive_assignments'],
  });
  await waitForGame(page);
  await expect.poll(async () => (await diagnostics(page)).workerTasks, { timeout: 8_000 })
    .not.toBe('copper');
  await expect.poll(async () => (await diagnostics(page)).workerNavigation[0]?.targetNode)
    .not.toBe('');
  expect(['wood', 'stone']).toContain((await diagnostics(page)).workerTasks);
});

test('un renard niveau 3 frappe par lots de trois sans one-shot le filon', async ({ page }) => {
  test.setTimeout(35_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    foundryBuilt: true,
    workers: [{ id: 'worker-1', name: 'Milo', task: 'stone', level: 3 }],
    skills: ['trail_sense', 'master_builders'],
  });
  await waitForGame(page);
  await expect.poll(async () => (await diagnostics(page)).lastWorkerHarvest, { timeout: 15_000 })
    .not.toBeNull();
  const mined = (await diagnostics(page)).lastWorkerHarvest!;
  const workedNode = (await diagnostics(page)).resourceNodes.find((node) => node.id === mined.nodeId)!;
  expect(mined).toMatchObject({ workerId: 'worker-1', kind: 'stone', island: 0 });
  expect(mined.gathered).toBe(3);
  expect(mined.remaining).toBe(workedNode.capacity - 3);
  expect(workedNode.amount).toBe(workedNode.capacity - 3);
  expect((await diagnostics(page)).workersOnWalkable).toBe(true);
});

test('la Frappe de maîtrise affiche neuf et augmente réellement chaque coup', async ({ page }) => {
  test.setTimeout(35_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    foundryBuilt: true,
    workers: [{ id: 'worker-1', name: 'Milo', task: 'stone', level: 3 }],
    skills: ['master_builders', 'cargo_harness', 'masterful_strikes'],
    skillRanks: { master_builders: 1, cargo_harness: 1, masterful_strikes: 2 },
  });
  await waitForGame(page);
  await expect.poll(async () => (await diagnostics(page)).lastWorkerHarvest, { timeout: 15_000 })
    .not.toBeNull();
  const mined = (await diagnostics(page)).lastWorkerHarvest!;
  expect(mined).toMatchObject({ workerId: 'worker-1', kind: 'stone', island: 0 });
  expect(mined.gathered).toBeGreaterThan(3);
  expect(mined.gathered).toBeLessThanOrEqual(9);
  await openCrew(page);
  await expect(page.locator('#worker-detail')).toContainText('+9');
});

test('achète les deux rangs de Frappe de maîtrise pour 12 puis 20 Savoir', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    observatoryBuilt: true,
    knowledge: 32,
    skills: ['master_builders', 'cargo_harness'],
    skillRanks: { master_builders: 1, cargo_harness: 1 },
  });
  await waitForGame(page);
  await openTalents(page);

  await page.getByRole('button', { name: /voir Frappe de maîtrise rang 1, prix 12/i }).click();
  await expect(page.locator('#skill-inspector-detail')).toContainText('2/4/6');
  await page.locator('#skill-buy-button').click();
  await expect.poll(async () => (await diagnostics(page)).knowledge).toBe(20);

  await page.getByRole('button', { name: /voir Frappe de maîtrise rang 2, prix 20/i }).click();
  await expect(page.locator('#skill-inspector-detail')).toContainText('3/6/9');
  await page.locator('#skill-buy-button').click();
  await expect.poll(async () => (await diagnostics(page)).knowledge).toBe(0);
  await expect(page.getByRole('button', { name: /Frappe de maîtrise, rang 2 sur 2, acquis/i }))
    .toBeVisible();
});

test('fait naître le graphe hexagonal puis atteint l’auto-régulation profonde', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    knowledge: 30,
    observatoryBuilt: true,
  });
  await waitForGame(page);
  await openTalents(page);
  await expect(page.locator('#power-messages-button')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#power-vfx-button')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#power-messages-button').click();
  await expect.poll(async () => (await diagnostics(page)).powerNotifications).toBe(true);
  await page.locator('#power-messages-button').click();
  await expect.poll(async () => (await diagnostics(page)).powerNotifications).toBe(false);
  await page.locator('#power-vfx-button').click();
  await expect.poll(async () => (await diagnostics(page)).powerVfx).toBe(false);
  await expect(page.locator('.skill-hex')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /routes calculées/i })).toHaveCount(0);
  await page.getByRole('button', { name: /voir démarrer/i }).click();
  await expect(page.locator('#skill-inspector-detail')).toContainText('révèle les trois premières voies');
  await expect.poll(async () => (await diagnostics(page)).knowledge).toBe(30);
  await expect(page.locator('.skill-hex')).toHaveCount(1);
  await page.locator('#skill-buy-button').click();
  await expect(page.locator('.skill-hex')).toHaveCount(4);
  await expect(page.getByRole('button', { name: /voir étincelle logique/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /voir premier mécanisme/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /voir appel du large/i })).toBeVisible();
  await buySkill(page, /voir étincelle logique/i);
  await expect(page.getByRole('button', { name: /routes calculées/i })).toHaveCount(0);
  await buySkill(page, /voir sens des pistes/i);
  await expect(page.getByRole('button', { name: /voir routes calculées/i })).toBeVisible();
  await buySkill(page, /voir routes calculées/i);
  await expect(page.getByRole('button', { name: /réseau logistique/i })).toHaveCount(0);
  await buySkill(page, /voir prévisions/i);
  await buySkill(page, /voir relèves coordonnées/i);
  await buySkill(page, /voir auto-régulation/i);
  await expect.poll(async () => (await diagnostics(page)).knowledge).toBe(8);
  await expect.poll(async () => (await diagnostics(page)).skills).toContain('auto_regulation');
  await page.waitForTimeout(2_200);
  await page.getByRole('button', { name: /activer l’auto-régulation/i }).click();
  await expect.poll(async () => (await diagnostics(page)).autoRegulation).toBe(true);
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
  await expect(page.getByRole('button', { name: /auto-régulation active/i })).toHaveAttribute('aria-pressed', 'true');
  const widthBeforePinch = await page.locator('.skill-map-stage').evaluate((stage) => stage.getBoundingClientRect().width);
  await page.locator('#skill-branches').evaluate((target) => {
    const rect = target.getBoundingClientRect();
    const send = (type: string, pointerId: number, x: number, y: number) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: 'touch',
      clientX: rect.left + x,
      clientY: rect.top + y,
    }));
    send('pointerdown', 11, 80, 90);
    send('pointerdown', 12, 145, 90);
    send('pointermove', 12, 230, 90);
    send('pointerup', 12, 230, 90);
    send('pointerup', 11, 80, 90);
  });
  await expect.poll(async () => page.locator('.skill-map-stage').evaluate((stage) => stage.getBoundingClientRect().width))
    .toBeGreaterThan(widthBeforePinch + 100);
  await expect(page.locator('#skill-branches')).toHaveCSS('touch-action', 'none');
  await page.locator('#skill-branches').evaluate((target) => {
    const rect = target.getBoundingClientRect();
    target.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 21,
      pointerType: 'touch',
      clientX: rect.left + 90,
      clientY: rect.top + 90,
    }));
  });
  const beforeClose = (await diagnostics(page)).player;
  await page.getByRole('button', { name: /fermer l’arbre des savoirs/i }).click();
  await expect.poll(async () => (await diagnostics(page)).talentOpen).toBe(false);
  await expect.poll(async () => (await diagnostics(page)).inputEnabled).toBe(true);
  expect(await diagnostics(page)).toMatchObject({
    managementOpen: false,
    blockingOverlay: false,
  });
  const { moveTo } = createNavigator(page);
  await moveTo(beforeClose.x + 1.5, beforeClose.z, 0.25);
  await expect.poll(async () => (await diagnostics(page)).player.x).toBeGreaterThan(beforeClose.x + 1);
  await expect(page.locator('.skill-zoom-controls')).toHaveCount(0);
  await openTalents(page);
  await page.screenshot({ path: 'test-results/ilota-skill-tree.png' });
});

test('les trois sommets seuls révèlent la Conscience absolue', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    knowledge: 30,
    observatoryBuilt: true,
    skills: ['collective_intelligence', 'endless_engine', 'ocean_legacy'],
  });
  await waitForGame(page);
  await openTalents(page);
  const finalSkill = page.getByRole('button', { name: /voir Conscience absolue/i });
  await expect(finalSkill).toBeVisible();
  await expect(finalSkill).toContainText('30 SAVOIR');
  await finalSkill.click();
  await expect(page.locator('#skill-inspector-name')).toHaveText('Conscience absolue');
  await expect.poll(async () => (await diagnostics(page)).skills).not.toContain('archipelago_consciousness');
  await page.screenshot({ path: 'test-results/ilota-skill-tree-convergence.png' });
  await page.locator('#skill-buy-button').click();
  await expect.poll(async () => (await diagnostics(page)).skills).toContain('archipelago_consciousness');
  await expect.poll(async () => (await diagnostics(page)).autoRegulation).toBe(true);
  await expect(page.getByRole('button', { name: /auto-régulation active/i })).toHaveAttribute('aria-pressed', 'true');
});

test('les sommets Technique et Exploration déclenchent chacun leur pouvoir lisible', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    observatoryBuilt: true,
    skills: ['endless_engine', 'ocean_legacy'],
  });
  await waitForGame(page);
  await openTalents(page);
  await page.getByRole('button', { name: /technique · activer la surcharge/i }).click();
  await expect(page.getByRole('button', { name: /technique · surcharge armée/i }))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /fermer l’arbre des savoirs/i }).click();
  await expect.poll(async () => (await diagnostics(page)).industrySurge).toBe(true);
  await expect(page.locator('#power-vfx')).toHaveClass(/industry-active/, { timeout: 6_000 });
  await expect(page.locator('#power-vfx-label')).toContainText('SURCHARGE');
  expect(await page.locator('.power-edge').evaluateAll((edges) =>
    edges.map((edge) => Math.sign(new DOMMatrix(getComputedStyle(edge).transform).a)))).toEqual([1, -1]);
  await expect(page.locator('.power-edge').first()).toHaveCSS('background-image', /lightning\.png/);
  await page.screenshot({ path: 'test-results/ilota-industry-surge.png' });

  const { moveTo } = createNavigator(page);
  await moveTo(-8.7, -0.15, 0.55);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).playerCargo).toBe(6);
  await expect.poll(async () => (await diagnostics(page)).explorationFlow).toBe(false);

  await openTalents(page);
  await page.getByRole('button', { name: /exploration · activer le courant/i }).click();
  await expect(page.getByRole('button', { name: /exploration · courant armé/i })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /fermer l’arbre des savoirs/i }).click();
  await expect.poll(async () => {
    const state = await diagnostics(page);
    return state.industrySurge && state.explorationFlow;
  }, { timeout: 8_000 }).toBe(false);
  // Le delta moteur reste plafonné à 100 ms sur un runner lent ;
  // l'alternance reste basée sur la simulation.
  await expect.poll(async () => (await diagnostics(page)).explorationFlow, { timeout: 45_000 }).toBe(true);
  expect((await diagnostics(page)).industrySurge).toBe(false);
  await expect(page.locator('#power-vfx')).toHaveClass(/exploration-active/, { timeout: 6_000 });
  await expect(page.locator('#power-vfx-label')).toContainText('COURANT DE MARÉE');
  expect(await page.locator('.power-edge').evaluateAll((edges) =>
    edges.map((edge) => Math.sign(new DOMMatrix(getComputedStyle(edge).transform).a)))).toEqual([1, -1]);
  await expect(page.locator('.power-edge').first()).toHaveCSS('background-image', /tide\.png/);
});

test('la Conscience absolue réserve les filons et évite les départs inutiles en groupe', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    foundryBuilt: true,
    bridgesBuilt: [true, true, true, true],
    skills: ['archipelago_consciousness'],
    workers: [
      { id: 'worker-1', name: 'Milo', task: 'stone', level: 3 },
      { id: 'worker-2', name: 'Nila', task: 'stone', level: 3 },
      { id: 'worker-3', name: 'Sève', task: 'stone', level: 3 },
    ],
  });
  await waitForGame(page);
  await expect.poll(async () => {
    const targets = (await diagnostics(page)).workerNavigation.map((worker) => worker.targetNode).filter(Boolean);
    return targets.length === 3 ? new Set(targets).size : 0;
  }).toBe(3);
});

test('achète plusieurs rangs de postes dont le prix augmente', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    observatoryBuilt: true,
    knowledge: 100,
  });
  await waitForGame(page);
  await openTalents(page);
  await buySkill(page, /voir démarrer/i);
  await buySkill(page, /voir premier mécanisme/i);
  await buySkill(page, /voir outils affûtés/i);
  await buySkill(page, /voir charrettes renforcées/i);
  await buySkill(page, /voir gisements vivants/i);
  await buySkill(page, /voir cercle des bâtisseurs.*rang 1/i);
  await buySkill(page, /voir cercle des bâtisseurs.*rang 2/i);
  await expect.poll(async () => (await diagnostics(page)).knowledge).toBe(82);
  await page.getByRole('button', { name: /fermer l’arbre des savoirs/i }).click();
  await openCrew(page);
  await expect(page.locator('#crew-capacity')).toContainText('0 / 11 renards');
});

test('l’auto-régulation envoie réellement un renard vers la ressource en pénurie', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    wood: 500,
    stone: 500,
    copper: 0,
    crystal: 500,
    campBuilt: true,
    workshopBuilt: true,
    foundryBuilt: true,
    observatoryBuilt: true,
    bridgesBuilt: [true, true, true, true],
    workers: [
      { id: 'worker-1', name: 'Milo', task: 'wood', level: 2 },
      { id: 'worker-2', name: 'Nila', task: 'wood', level: 1 },
      { id: 'worker-3', name: 'Sève', task: 'wood', level: 1 },
      { id: 'worker-4', name: 'Roc', task: 'stone', level: 2 },
      { id: 'worker-5', name: 'Pollen', task: 'stone', level: 2 },
      { id: 'worker-6', name: 'Lune', task: 'copper', level: 1 },
      { id: 'worker-7', name: 'Braise', task: 'crystal', level: 2 },
      { id: 'worker-8', name: 'Azur', task: 'crystal', level: 1 },
    ],
    skills: ['trail_sense', 'optimal_routes', 'forecasting', 'auto_regulation'],
    autoRegulation: true,
    projectsCompleted: [...PROJECT_IDS],
  });
  await waitForGame(page);
  expect((await diagnostics(page)).workerTasks.split(',').filter((task) => task === 'copper')).toHaveLength(1);
  await expect.poll(async () => (await diagnostics(page)).workerTasks.split(',').filter((task) => task === 'copper').length, { timeout: 8_000 }).toBe(2);
  expect((await diagnostics(page)).workersOnWalkable).toBe(true);
});

test('une Nouvelle Marée garde les talents et recommence la campagne', async ({ page }) => {
  await page.addInitScript((save) => {
    if (sessionStorage.getItem('ilota-rebirth-seeded')) return;
    localStorage.setItem('ilota-save-v1', JSON.stringify(save));
    sessionStorage.setItem('ilota-rebirth-seeded', '1');
  }, {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    foundryBuilt: true,
    observatoryBuilt: true,
    bridgesBuilt: [true, true, true, true],
    completed: true,
    skills: ['trail_sense', 'optimal_routes', 'forecasting', 'auto_regulation'],
  });
  await waitForGame(page);
  await expect(page.getByRole('heading', { name: 'L’archipel s’éveille !' })).toBeVisible();
  const rebirth = page.getByRole('button', { name: /lancer une nouvelle marée/i });
  await rebirth.click();
  await page.getByRole('button', { name: /confirmer la nouvelle marée/i }).click();
  await expect(page.locator('#tide-transition')).toBeVisible();
  await expect.poll(async () => (await diagnostics(page)).rebirthAnimation).toBe(true);
  await page.waitForTimeout(1_350);
  await expect(page.locator('#tide-transition-stage')).toContainText(/ponts|Couronne/i);
  await page.screenshot({ path: 'test-results/ilota-tide-rebirth-cinematic.png' });
  await page.waitForFunction(() => (window as typeof window & { __ILOTA__?: { rebirths: number } }).__ILOTA__?.rebirths === 1);
  const state = await diagnostics(page);
  expect(state).toMatchObject({ rebirths: 1, completed: false, knowledge: 3 });
  expect(state.skills).toContain('auto_regulation');
  await expect(page.getByRole('button', { name: /commencer|reprendre/i })).toBeVisible();
});

test('parcourt les cinq chapitres et éveille le Cœur de l’Archipel', async ({ page }) => {
  test.setTimeout(420_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    // Le scénario QA conserve un déplacement accéléré afin de valider les
    // cinq îles sans transformer la durée du test en durée de partie réelle.
    skills: ['archipelago_consciousness'],
    tutorialSeen: [
      'welcome',
      'warehouse-central',
      'nursery',
      'island-goals',
      'bridge-guidance',
      'pins-logistics',
      'workshop',
      'foundry',
      'observatory',
    ],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);

  await moveTo(0, 6.8, 1.4);
  await expect(page.locator('#context-prompt')).toContainText('camp des Marées');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).campBuilt).toBe(true);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings).toBeGreaterThan(0);

  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Recrute et place tes renards' })).toBeVisible();
  await recruitUntil(page, 2);
  await closeCrew(page);
  await completeProjectsUntil(page, 3, moveTo);
  await expect.poll(async () => (await diagnostics(page)).bridgeGuides).toBe(1);
  await moveTo(0, -11.25, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Pins');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(1);
  await expect.poll(async () => (await diagnostics(page)).emergingIsland).toBe('pins');
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(2);

  await moveTo(0, -12.1, 0.5);
  await moveTo(0, -17.9, 0.65);
  await moveTo(0, -33.8, 1.15);
  await expect(page.locator('#context-prompt')).toContainText('atelier des Pins');
  await page.locator('#action-button').tap();
  await openCrew(page);
  await recruitUntil(page, 4);
  await closeCrew(page);
  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Former au niveau 2' })).toBeVisible();
  await upgradeWorker(page, 'Milo');
  await upgradeWorker(page, 'Nila');
  await closeCrew(page);
  await moveTo(3, -35.5, 0.65);
  await moveTo(4, -26, 0.65);
  await completeProjectsUntil(page, 6, moveTo);

  await moveTo(5.15, -33.44, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont Cuivré');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(2);
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(3);

  await moveTo(5.68, -34.11, 0.5);
  await moveTo(10.13, -39.66, 0.65);
  await moveTo(16, -53.8, 1.2);
  await expect(page.locator('#context-prompt')).toContainText('fonderie Cuivrée');
  await page.locator('#action-button').tap();
  await openCrew(page);
  await recruitUntil(page, 5);
  await assignWorker(page, 'Pollen', 'cuivre');
  await closeCrew(page);
  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Former au niveau 3' })).toBeVisible();
  await upgradeWorker(page, 'Milo');
  await upgradeWorker(page, 'Nila');
  await closeCrew(page);
  await completeProjectsUntil(page, 9, moveTo);

  await moveTo(24, -46, 0.65);
  await moveTo(21, -51, 0.65);
  await moveTo(16, -56.5, 0.65);
  await moveTo(10.78, -53.76, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Cristaux');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(3);
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(4);

  // Le cristal découvert, le joueur bâtit désormais le grand Autel sur cette
  // île spécialisée au lieu de retraverser tout l’archipel.
  await moveTo(4.68, -61.64, 0.65);
  await moveTo(2, -65.5, 0.65);
  await moveTo(2, -71.5, 0.65);
  await moveTo(-1, -75.8, 1.2);
  await expect(page.locator('#context-prompt')).toContainText('Autel du Savoir');
  const preAltar = await diagnostics(page);
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).observatoryBuilt).toBe(true);
  const postAltar = await diagnostics(page);
  // Les ouvriers poursuivent leurs livraisons pendant l'assemblage : ce
  // scénario complet contrôle donc une baisse nette de chaque réserve. Le test
  // isolé de l'Autel, sans production concurrente, contrôle les quatre débits
  // exacts (78 / 68 / 48 / 24).
  for (const [kind, cost] of [
    ['wood', 78],
    ['stone', 68],
    ['copper', 48],
    ['crystal', 24],
  ] as const) {
    const spentAfterDeliveries = preAltar[kind] - postAltar[kind];
    expect(spentAfterDeliveries).toBeGreaterThan(0);
    expect(spentAfterDeliveries).toBeLessThanOrEqual(cost);
  }
  await page.screenshot({ path: 'test-results/ilota-central-knowledge-altar.png' });
  await page.locator('#action-button').tap();
  await expect(page.getByRole('dialog', { name: 'Arbre des savoirs' })).toBeVisible();
  await page.getByRole('button', { name: /fermer l’arbre des savoirs/i }).click();

  await moveTo(0.5, -78.2, 0.65);
  await moveTo(3, -74, 0.65);
  await moveTo(2, -71.5, 0.65);
  await moveTo(2, -65.5, 0.65);
  await moveTo(4.68, -61.64, 0.65);
  await moveTo(10.26, -54.44, 0.65);
  await moveTo(12.2, -53.3, 0.65);
  await moveTo(15, -48.5, 0.65);
  await moveTo(10.13, -39.66, 0.65);
  await moveTo(5.68, -34.11, 0.65);
  await moveTo(0, -17.9, 0.65);
  await moveTo(0, -12.1, 0.65);
  await openCrew(page);
  await recruitUntil(page, 7);
  await assignWorker(page, 'Braise', 'cristal');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBeGreaterThanOrEqual(10);
  await closeCrew(page);
  await moveTo(0, -12.1, 0.65);
  await moveTo(0, -17.9, 0.65);
  await moveTo(5.68, -34.11, 0.65);
  await moveTo(10.13, -39.66, 0.65);
  await moveTo(15, -48.5, 0.65);
  await moveTo(12.2, -53.3, 0.65);
  await moveTo(10.26, -54.44, 0.65);
  await moveTo(4.68, -61.64, 0.65);
  await moveTo(2, -65.5, 0.65);
  await moveTo(5, -65.2, 0.9);
  await completeProjectsUntil(page, 12, moveTo);

  await moveTo(3.97, -75.84, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont de la Couronne');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(4);
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(5);

  await moveTo(4.47, -76.52, 0.5);
  await moveTo(9.65, -83.64, 0.65);
  await openCrew(page);
  await recruitUntil(page, 8);
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBeGreaterThanOrEqual(12);
  await closeCrew(page);
  await moveTo(11, -88, 0.65);
  await moveTo(15, -89, 0.65);
  await moveTo(20, -89, 0.65);
  await completeProjectsUntil(page, 15, moveTo);
  await expect.poll(async () => (await diagnostics(page)).projects).toBe(15);

  await moveTo(22, -91, 0.65);
  await moveTo(15, -91, 1.35);
  await expect(page.locator('#context-prompt')).toContainText('Éveiller le Cœur');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).completed).toBe(true);
  await expect(page.getByRole('heading', { name: 'L’archipel s’éveille !' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ilota-archipelago-victory.png' });
});
