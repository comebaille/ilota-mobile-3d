import { expect, test, type Page } from '@playwright/test';

test.use({ video: 'off', trace: 'off' });

type Profile = 'iphone' | 'tablet' | 'pc';

interface ProfileDiagnostics {
  ready: boolean;
  active: boolean;
  gameProfile: Profile;
  pixelRatio: number;
  maximumFps: number;
  shadowsEnabled: boolean;
  player: { x: number; z: number };
}

const openWithProfile = async (page: Page, profile: Profile): Promise<void> => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: 'ilota-device-profile-v1',
    value: profile,
  });
  await page.goto('./');
  await page.waitForFunction(() => Boolean((window as typeof window & {
    __ILOTA__?: ProfileDiagnostics;
  }).__ILOTA__?.ready));
};

const state = (page: Page): Promise<ProfileDiagnostics> => page.evaluate(() => (
  window as typeof window & { __ILOTA__: ProfileDiagnostics }
).__ILOTA__);

const start = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /commencer|reprendre/i }).click();
  const tutorial = page.locator('#tutorial-panel');
  if (await tutorial.isVisible()) await page.locator('#tutorial-continue-button').click();
};

test('le lancement présente clairement les trois formats', async ({ page }) => {
  await openWithProfile(page, 'iphone');
  await expect(page.locator('.profile-picker')).toBeVisible();
  await expect(page.locator('.profile-option')).toHaveCount(3);
  await expect(page.locator('[data-game-profile="iphone"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-game-profile="tablet"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-profile', 'tablet');
  await expect(page.getByRole('button', { name: /commencer.*tablette/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/profile-selector.png' });
});

test('le profil tablette allège le rendu et garde les objectifs lisibles', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await openWithProfile(page, 'tablet');
  await start(page);
  const diagnostics = await state(page);
  expect(diagnostics.gameProfile).toBe('tablet');
  expect(diagnostics.maximumFps).toBe(30);
  expect(diagnostics.pixelRatio).toBeLessThanOrEqual(0.78);
  expect(diagnostics.shadowsEnabled).toBe(false);

  const goal = page.locator('#island-goal');
  await expect(goal).toBeVisible();
  const width = await goal.evaluate((element) => element.getBoundingClientRect().width);
  expect(width).toBeGreaterThanOrEqual(280);
  const wordBreak = await goal.evaluate((element) => getComputedStyle(element).wordBreak);
  expect(wordBreak).toBe('normal');
  await page.screenshot({ path: 'test-results/profile-tablet-light.png' });
});

test('le profil PC active le HUD bureau et les commandes AZERTY', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWithProfile(page, 'pc');
  await start(page);
  const before = await state(page);
  expect(before.gameProfile).toBe('pc');
  expect(before.pixelRatio).toBeGreaterThanOrEqual(1.5);
  expect(before.shadowsEnabled).toBe(true);
  await expect(page.locator('#touch-controls')).toBeHidden();
  await expect(page.locator('.pc-controls-hint')).toBeVisible();

  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyZ');
  const after = await state(page);
  expect(Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z)).toBeGreaterThan(0.15);
});
