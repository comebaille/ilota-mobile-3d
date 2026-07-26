import { expect, test, type Page } from '@playwright/test';

interface IlotaDiagnostics {
  ready: boolean;
  active: boolean;
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
  workers: number;
  workerLevels: number;
  workerTasks: string;
  bridges: number;
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
  projects: number;
  currentIsland: number;
  assemblingBuildings: number;
  visibleIslands: number;
  emergingIsland: string;
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
    cargo: number;
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
};

const richSave = () => ({
  version: 5,
  wood: 9_999,
  stone: 9_999,
  copper: 9_999,
  crystal: 9_999,
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
  rebirths: 0,
  cycleMilestones: [],
  lifetimeDeliveries: 0,
  projectsCompleted: [],
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
    for (let step = 0; step < 240; step += 1) {
      const { player } = await diagnostics(page);
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
      await page.mouse.move(
        centerX + (screenX / screenLength) * radius,
        centerY - (screenY / screenLength) * radius,
      );
      await page.waitForTimeout(50);
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

const PROJECT_SITES = [
  { x: -0.2, z: -17.2, name: 'Réserve de charpente' },
  { x: 2.3, z: -21.1, name: 'Chemins de halage' },
  { x: 0.8, z: -24.1, name: 'Entrepôt partagé' },
  { x: 12.2, z: -32.2, name: 'Scierie commune' },
  { x: 16, z: -36, name: 'Murets de rive' },
  { x: 12.8, z: -39.9, name: 'Bureau des plans' },
  { x: -1, z: -48.3, name: 'Treuils cuivrés' },
  { x: -4.3, z: -52.2, name: 'Rails de débardage' },
  { x: -0.3, z: -55.5, name: 'Cour de maintenance' },
  { x: 11, z: -63.8, name: 'Balises cristallines' },
  { x: 8.2, z: -68.6, name: 'Réservoir prismatique' },
  { x: 13.8, z: -68.6, name: 'Phare de l’unisson' },
] as const;

const completeProjectsUntil = async (
  page: Page,
  count: number,
  moveTo: ReturnType<typeof createNavigator>['moveTo'],
): Promise<void> => {
  while ((await diagnostics(page)).projects < count) {
    const before = (await diagnostics(page)).projects;
    const site = PROJECT_SITES[before];
    if (!site) throw new Error(`Site de projet ${before + 1} introuvable`);
    await moveTo(site.x, site.z, 0.8);
    await expect(page.locator('#context-prompt')).toContainText(site.name);
    await page.locator('#action-button').tap();
    await expect.poll(async () => (await diagnostics(page)).projects).toBe(before + 1);
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

test('les ressources rétrécissent à chaque coup puis disparaissent sur iPhone SE paysage', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await waitForGame(page);

  const before = (await diagnostics(page)).wood;
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).wood).toBeGreaterThan(before);
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
    const state = (window as typeof window & { __ILOTA__: IlotaDiagnostics }).__ILOTA__;
    return {
      controlsInside: controls.width <= innerWidth && controls.height <= innerHeight,
      actionInside: action.right <= innerWidth && action.bottom <= innerHeight && action.left >= 0 && action.top >= 0,
      joystickInside: joystick.right <= innerWidth && joystick.bottom <= innerHeight && joystick.left >= 0 && joystick.top >= 0,
      chipsInside: chips.length === 4 && chips.every((chip) => chip.left >= 0 && chip.right <= innerWidth),
      assetsLoaded: state.assetsLoaded,
      fps: state.fps,
    };
  });
  expect(metrics).toMatchObject({ controlsInside: true, actionInside: true, joystickInside: true, chipsInside: true, assetsLoaded: 10 });
  expect((await diagnostics(page)).visibleIslands).toBe(1);
  expect(metrics.fps).toBeGreaterThanOrEqual(18);
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
  await expect(page.locator('.worker-card').filter({ hasText: 'Sève' }).locator('.recruit-burst')).toContainText('NOUVEAU');
  await expect(page.locator('.job-wood')).toContainText('55 · 60 %');
  await expect(page.locator('.job-copper')).toContainText('MÉTIER VERROUILLÉ');
  await assignWorker(page, 'Milo', 'pierre');
  await closeCrew(page);
  const { moveTo } = createNavigator(page);
  await moveTo(0, -10.1, 0.6);
  await moveTo(0, -14.3, 0.7);
  await moveTo(-1.7, -21.2, 1.2);
  await expect(page.locator('#context-prompt')).toContainText('Atelier des Pins');
  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Former au niveau 2' })).toBeVisible();
  await upgradeWorker(page, 'Milo');
  await expect(page.locator('.worker-card').filter({ hasText: 'Milo' }).locator('.level-up-burst')).toContainText('LEVEL UP');
  await expect(page.locator('#worker-detail')).toContainText('Milo');
  await expect(page.locator('#worker-detail')).toContainText('NIV 2');
  await expect(page.locator('#worker-detail-burst, .worker-detail-burst')).toContainText('LEVEL UP');
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
  await expect(page.locator('#worker-detail').getByRole('button')).toBeDisabled();
  await expect(page.locator('#worker-detail')).toContainText('FONDERIE POUR CONTINUER');
  await page.screenshot({ path: 'test-results/ilota-nursery-16-foxes.png' });
});

test('les Grands Travaux sont douze chantiers physiques assemblés sur les îles', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workshopBuilt: true,
    bridgesBuilt: [true, false, false, false],
  });
  await waitForGame(page);
  const { moveTo } = createNavigator(page);
  await moveTo(0, -10.1, 0.6);
  await moveTo(0, -14.3, 0.7);
  await completeProjectsUntil(page, 3, moveTo);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings).toBeGreaterThan(0);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings, { timeout: 4_000 }).toBe(0);
  await expect(page.locator('#projects-panel')).toBeHidden();
  await expect(page.locator('#island-goal')).toContainText('3/5');
  await expect(page.locator('#island-goal')).toContainText('Bâtir les 3 chantiers des Pins');
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
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(3.2);
  expect(after.routeBridges).toEqual(expect.arrayContaining([0, 1, 2]));
  await closeCrew(page);
  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(350);
    expect((await diagnostics(page)).workersOnWalkable).toBe(true);
  }
  expect((await diagnostics(page)).workerNavigation[0]!.bridgesUsed).toEqual(expect.arrayContaining([0, 1, 2]));
});

test('un renard niveau 1 prélève exactement deux unités sur la roche ciblée', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), {
    ...richSave(),
    campBuilt: true,
    workers: [{ id: 'worker-1', name: 'Milo', task: 'stone', level: 1 }],
  });
  await waitForGame(page);
  await expect.poll(async () => (await diagnostics(page)).lastWorkerHarvest, { timeout: 15_000 })
    .not.toBeNull();
  const mined = (await diagnostics(page)).lastWorkerHarvest!;
  const node = (await diagnostics(page)).resourceNodes.find((candidate) => candidate.id === mined.nodeId)!;
  expect(mined.gathered).toBe(2);
  expect(node.amount).toBe(node.capacity - 2);
});

test('un renard vide réellement son filon puis choisit une autre cible naïve', async ({ page }) => {
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
  const depletedNode = (await diagnostics(page)).resourceNodes.find((node) => node.id === mined.nodeId)!;
  expect(mined).toMatchObject({ workerId: 'worker-1', kind: 'stone', remaining: 0, island: 0 });
  expect(mined.gathered).toBe(depletedNode.capacity);
  expect(depletedNode.amount).toBe(0);

  await expect.poll(async () => {
    const worker = (await diagnostics(page)).workerNavigation[0]!;
    return worker.routeChoices > 1 && worker.targetNode !== mined.nodeId;
  }, { timeout: 15_000 }).toBe(true);
  expect((await diagnostics(page)).workersOnWalkable).toBe(true);
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
  await page.getByRole('button', { name: /activer l’auto-régulation/i }).click();
  await expect.poll(async () => (await diagnostics(page)).autoRegulation).toBe(true);
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
  await expect(page.locator('.skill-zoom-controls')).toHaveCount(0);
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
  await page.waitForFunction(() => (window as typeof window & { __ILOTA__?: { rebirths: number } }).__ILOTA__?.rebirths === 1);
  const state = await diagnostics(page);
  expect(state).toMatchObject({ rebirths: 1, completed: false, knowledge: 3 });
  expect(state.skills).toContain('auto_regulation');
  await expect(page.getByRole('button', { name: /commencer|reprendre/i })).toBeVisible();
});

test('parcourt les cinq chapitres et éveille le Cœur de l’Archipel', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), richSave());
  await waitForGame(page);
  const { moveTo } = createNavigator(page);

  await moveTo(0, 0, 1.4);
  await expect(page.locator('#context-prompt')).toContainText('camp des Marées');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).campBuilt).toBe(true);
  await expect.poll(async () => (await diagnostics(page)).assemblingBuildings).toBeGreaterThan(0);

  await page.locator('#action-button').tap();
  await expect(page.getByRole('heading', { name: 'Recrute et place tes renards' })).toBeVisible();
  await recruitUntil(page, 2);
  await closeCrew(page);
  await moveTo(0, -9.25, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Pins');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(1);
  await expect.poll(async () => (await diagnostics(page)).emergingIsland).toBe('pins');
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(2);

  await moveTo(0, -10.1, 0.5);
  await moveTo(0, -14.3, 0.65);
  await moveTo(-1.7, -21.2, 1.15);
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
  await completeProjectsUntil(page, 3, moveTo);

  await moveTo(3.75, -25.5, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont Cuivré');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(2);
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(3);

  await moveTo(4.29, -26.15, 0.5);
  await moveTo(7.96, -30.55, 0.65);
  await moveTo(12.4, -36.1, 1.2);
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
  await completeProjectsUntil(page, 6, moveTo);

  await moveTo(8.48, -40.78, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Cristaux');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(3);
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(4);

  await moveTo(7.92, -41.42, 0.5);
  await moveTo(3.45, -46.73, 0.65);
  await moveTo(-1.1, -52.1, 1.2);
  await expect(page.locator('#context-prompt')).toContainText('Autel du Savoir');
  await page.locator('#action-button').tap();
  await page.locator('#action-button').tap();
  await expect(page.getByRole('dialog', { name: 'Arbre des savoirs' })).toBeVisible();
  await page.getByRole('button', { name: /fermer l’arbre des savoirs/i }).click();
  await openCrew(page);
  await recruitUntil(page, 7);
  await assignWorker(page, 'Braise', 'cristal');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBeGreaterThanOrEqual(10);
  await closeCrew(page);
  await completeProjectsUntil(page, 9, moveTo);

  await moveTo(2.78, -56.72, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont de la Couronne');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(4);
  await expect.poll(async () => (await diagnostics(page)).visibleIslands, { timeout: 5_000 }).toBe(5);

  await openCrew(page);
  await recruitUntil(page, 8);
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBeGreaterThanOrEqual(12);
  await closeCrew(page);
  await completeProjectsUntil(page, 12, moveTo);
  await expect.poll(async () => (await diagnostics(page)).projects).toBe(12);

  await moveTo(3.31, -57.39, 0.5);
  await moveTo(7.06, -62.08, 0.65);
  await moveTo(11, -67, 1.35);
  await expect(page.locator('#context-prompt')).toContainText('Éveiller le Cœur');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).completed).toBe(true);
  await expect(page.getByRole('heading', { name: 'L’archipel s’éveille !' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ilota-archipelago-victory.png' });
});
