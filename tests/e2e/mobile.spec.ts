import { expect, test } from '@playwright/test';

test('charge les assets et permet une première récolte sur iPhone SE paysage', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');
  await page.waitForFunction(() => Boolean((window as typeof window & { __ILOTA__?: { ready: boolean } }).__ILOTA__?.ready));
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: /commencer|reprendre/i })).toBeVisible();
  await page.getByRole('button', { name: /commencer|reprendre/i }).click();
  await expect(page.locator('#action-button')).toBeVisible();

  const before = await page.evaluate(() => (window as typeof window & { __ILOTA__: { wood: number } }).__ILOTA__.wood);
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { wood: number } }).__ILOTA__.wood)).toBeGreaterThan(before);
  await page.screenshot({ path: 'test-results/ilota-iphone-se.png' });

  const metrics = await page.evaluate(() => {
    const controls = document.getElementById('touch-controls')!.getBoundingClientRect();
    const action = document.getElementById('action-button')!.getBoundingClientRect();
    const joystick = document.getElementById('joystick')!.getBoundingClientRect();
    const state = (window as typeof window & { __ILOTA__: { assetsLoaded: number; fps: number } }).__ILOTA__;
    return {
      controlsInside: controls.width <= innerWidth && controls.height <= innerHeight,
      actionInside: action.right <= innerWidth && action.bottom <= innerHeight && action.left >= 0 && action.top >= 0,
      joystickInside: joystick.right <= innerWidth && joystick.bottom <= innerHeight && joystick.left >= 0 && joystick.top >= 0,
      assetsLoaded: state.assetsLoaded,
      fps: state.fps,
    };
  });

  expect(metrics.controlsInside).toBe(true);
  expect(metrics.actionInside).toBe(true);
  expect(metrics.joystickInside).toBe(true);
  expect(metrics.assetsLoaded).toBe(6);
  expect(metrics.fps).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test('affiche l’invitation à tourner le téléphone en portrait', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./');
  await expect(page.locator('.rotate-screen')).toBeVisible();
  await expect(page.getByText('Tourne ton téléphone')).toBeVisible();
});

test('parcourt le détour, bâtit le camp et atteint la seconde île', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    localStorage.setItem('ilota-save-v1', JSON.stringify({
      version: 1,
      wood: 99,
      stone: 99,
      campBuilt: false,
      woodWorker: false,
      stoneWorker: false,
      bridgeBuilt: false,
      cacheFound: false,
      completed: false,
      elapsedSeconds: 0,
    }));
  });
  await page.goto('./?journey=1');
  await page.waitForFunction(() => Boolean((window as typeof window & { __ILOTA__?: { ready: boolean } }).__ILOTA__?.ready));
  await page.getByRole('button', { name: /reprendre/i }).click();

  const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const activeKeys = new Set<string>();
  const setMovement = async (nextKeys: Set<string>): Promise<void> => {
    for (const key of movementKeys) {
      if (activeKeys.has(key) && !nextKeys.has(key)) {
        await page.keyboard.up(key);
        activeKeys.delete(key);
      } else if (!activeKeys.has(key) && nextKeys.has(key)) {
        await page.keyboard.down(key);
        activeKeys.add(key);
      }
    }
  };
  const releaseMovement = async (): Promise<void> => setMovement(new Set());
  const moveTo = async (targetX: number, targetZ: number, tolerance = 1.15): Promise<void> => {
    for (let step = 0; step < 180; step += 1) {
      const position = await page.evaluate(() => (window as typeof window & { __ILOTA__: { player: { x: number; z: number } } }).__ILOTA__.player);
      const dx = targetX - position.x;
      const dz = targetZ - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= tolerance) {
        await releaseMovement();
        return;
      }
      const screenX = 0.828 * dx - 0.561 * dz;
      const screenY = -0.561 * dx - 0.828 * dz;
      const nextKeys = new Set<string>();
      if (screenX > distance * 0.18) nextKeys.add('ArrowRight');
      if (screenX < -distance * 0.18) nextKeys.add('ArrowLeft');
      if (screenY > distance * 0.18) nextKeys.add('ArrowUp');
      if (screenY < -distance * 0.18) nextKeys.add('ArrowDown');
      await setMovement(nextKeys);
      await page.waitForTimeout(55);
    }
    await releaseMovement();
    throw new Error(`Cible non atteinte: ${targetX}, ${targetZ}`);
  };

  await moveTo(7.2, 4.5, 0.65);
  await page.waitForTimeout(120);
  await expect(page.locator('#context-prompt')).toContainText('Cache oubliée');
  await page.locator('#action-button').tap();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { cacheFound: boolean } }).__ILOTA__.cacheFound)).toBe(true);

  await moveTo(0, 0, 1.5);
  await page.waitForTimeout(120);
  await expect(page.locator('#context-prompt')).toContainText('Bâtir le camp');
  await page.locator('#action-button').tap();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { campBuilt: boolean } }).__ILOTA__.campBuilt)).toBe(true);

  await moveTo(-3.1, -2.4, 0.8);
  await page.waitForTimeout(120);
  await expect(page.locator('#context-prompt')).toContainText('Recruter le bûcheron');
  await page.locator('#action-button').tap();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { workers: number } }).__ILOTA__.workers)).toBe(1);

  await moveTo(3.1, -2.4, 0.8);
  await page.waitForTimeout(120);
  await expect(page.locator('#context-prompt')).toContainText('Recruter le mineur');
  await page.locator('#action-button').tap();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { workers: number } }).__ILOTA__.workers)).toBe(2);

  await moveTo(0, -9.3, 0.8);
  await page.waitForTimeout(120);
  await expect(page.locator('#context-prompt')).toContainText('Construire le pont');
  await page.locator('#action-button').tap();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { bridgeBuilt: boolean } }).__ILOTA__.bridgeBuilt)).toBe(true);

  await moveTo(0, -20, 0.8);
  await page.waitForTimeout(120);
  await expect(page.locator('#context-prompt')).toContainText('Rallumer la balise');
  await page.locator('#action-button').tap();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __ILOTA__: { completed: boolean } }).__ILOTA__.completed)).toBe(true);
  await expect(page.getByRole('heading', { name: 'L’île s’agrandit !' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ilota-victory.png' });
});
