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
  player: { x: number; z: number };
  facingAlignment: number;
  lastHarvest: { kind: string; remaining: number; capacity: number; scale: number } | null;
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
  version: 2,
  wood: 999,
  stone: 999,
  copper: 999,
  crystal: 999,
  campBuilt: false,
  workshopBuilt: false,
  foundryBuilt: false,
  observatoryBuilt: false,
  bridgesBuilt: [false, false, false, false],
  cachesFound: [],
  workers: [],
  completed: false,
  elapsedSeconds: 0,
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
  await page.getByRole('button', { name: /gérer l’équipe/i }).click();
  await expect(page.getByRole('dialog', { name: 'Tes travailleurs' })).toBeVisible();
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
    await page.getByRole('button', { name: /recruter un renard/i }).click();
    await expect.poll(async () => (await diagnostics(page)).workers).toBe(before + 1);
  }
  await expect(page.locator('.worker-card')).toHaveCount(count);
};

const upgradeWorker = async (page: Page, name: string): Promise<void> => {
  const card = page.locator('.worker-card').filter({ hasText: name });
  await card.getByRole('button', { name: /améliorer niveau/i }).click();
};

const assignWorker = async (page: Page, name: string, task: string): Promise<void> => {
  const card = page.locator('.worker-card').filter({ hasText: name });
  await card.getByRole('button', { name: new RegExp(`Assigner ${name}.*${task}`, 'i') }).click();
};

test('les ressources rétrécissent à chaque coup puis disparaissent sur iPhone SE paysage', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await waitForGame(page);

  const before = (await diagnostics(page)).wood;
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await diagnostics(page)).wood).toBeGreaterThan(before);
  await page.waitForTimeout(320);
  const firstHit = (await diagnostics(page)).lastHarvest;
  expect(firstHit).not.toBeNull();

  await page.keyboard.press('KeyE');
  await page.waitForTimeout(360);
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
  expect(metrics).toMatchObject({ controlsInside: true, actionInside: true, joystickInside: true, chipsInside: true, assetsLoaded: 6 });
  expect(metrics.fps).toBeGreaterThanOrEqual(18);
  expect(errors).toEqual([]);
});

test('recrute, réaffecte et améliore plusieurs travailleurs dans le panneau tactile', async ({ page }) => {
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
  await assignWorker(page, 'Milo', 'pierre');
  await upgradeWorker(page, 'Milo');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBe(4);
  await expect.poll(async () => (await diagnostics(page)).workerTasks.split(',')[0]).toBe('stone');

  const panelMetrics = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.crew-sheet')!.getBoundingClientRect();
    const assignment = document.querySelector<HTMLButtonElement>('.assignment-button')!.getBoundingClientRect();
    const close = document.getElementById('crew-close-button')!.getBoundingClientRect();
    return {
      panelInside: panel.left >= 0 && panel.top >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
      assignmentTarget: assignment.width >= 24 && assignment.height >= 36,
      closeTarget: close.width >= 44 && close.height >= 44,
    };
  });
  expect(panelMetrics).toEqual({ panelInside: true, assignmentTarget: true, closeTarget: true });
  await page.screenshot({ path: 'test-results/ilota-crew-management.png' });
  await closeCrew(page);
});

test('affiche l’invitation à tourner le téléphone en portrait', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./');
  await expect(page.locator('.rotate-screen')).toBeVisible();
  await expect(page.getByText('Tourne ton téléphone')).toBeVisible();
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

test('parcourt les cinq chapitres et éveille le Cœur de l’Archipel', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript((save) => localStorage.setItem('ilota-save-v1', JSON.stringify(save)), richSave());
  await waitForGame(page);
  const { moveTo } = createNavigator(page);

  await moveTo(0, 0, 1.4);
  await expect(page.locator('#context-prompt')).toContainText('camp des Marées');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).campBuilt).toBe(true);

  await openCrew(page);
  await recruitUntil(page, 2);
  await closeCrew(page);
  await moveTo(0, -9.25, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Pins');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(1);

  await moveTo(0, -10.1, 0.5);
  await moveTo(0, -14.3, 0.65);
  await moveTo(-1.7, -21.2, 1.15);
  await expect(page.locator('#context-prompt')).toContainText('atelier des Pins');
  await page.locator('#action-button').tap();
  await expect(page.getByRole('button', { name: /gérer l’équipe/i })).toBeVisible();
  await openCrew(page);
  await recruitUntil(page, 4);
  await upgradeWorker(page, 'Milo');
  await closeCrew(page);

  await moveTo(3.75, -25.5, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont Cuivré');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(2);

  await moveTo(4.29, -26.15, 0.5);
  await moveTo(7.96, -30.55, 0.65);
  await moveTo(12.4, -36.1, 1.2);
  await expect(page.locator('#context-prompt')).toContainText('fonderie Cuivrée');
  await page.locator('#action-button').tap();
  await openCrew(page);
  await recruitUntil(page, 5);
  await assignWorker(page, 'Pollen', 'cuivre');
  await closeCrew(page);

  await moveTo(8.48, -40.78, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont des Cristaux');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(3);

  await moveTo(7.92, -41.42, 0.5);
  await moveTo(3.45, -46.73, 0.65);
  await moveTo(-1.1, -52.1, 1.2);
  await expect(page.locator('#context-prompt')).toContainText('observatoire de Cristal');
  await page.locator('#action-button').tap();
  await openCrew(page);
  await recruitUntil(page, 7);
  await assignWorker(page, 'Braise', 'cristal');
  await upgradeWorker(page, 'Milo');
  await upgradeWorker(page, 'Nila');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBeGreaterThanOrEqual(10);
  await closeCrew(page);

  await moveTo(2.78, -56.72, 0.75);
  await expect(page.locator('#context-prompt')).toContainText('Pont de la Couronne');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).bridges).toBe(4);

  await openCrew(page);
  await recruitUntil(page, 8);
  await upgradeWorker(page, 'Sève');
  await expect.poll(async () => (await diagnostics(page)).workerLevels).toBeGreaterThanOrEqual(12);
  await closeCrew(page);

  await moveTo(3.31, -57.39, 0.5);
  await moveTo(7.06, -62.08, 0.65);
  await moveTo(11, -67, 1.35);
  await expect(page.locator('#context-prompt')).toContainText('Éveiller le Cœur');
  await page.locator('#action-button').tap();
  await expect.poll(async () => (await diagnostics(page)).completed).toBe(true);
  await expect(page.getByRole('heading', { name: 'L’archipel s’éveille !' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ilota-archipelago-victory.png' });
});
