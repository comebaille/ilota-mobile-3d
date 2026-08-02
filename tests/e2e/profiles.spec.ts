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

const expectProfilePickerInsideCard = async (page: Page): Promise<void> => {
  const layout = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.title-card')!.getBoundingClientRect();
    return Array.from(document.querySelectorAll<HTMLElement>('.profile-option')).map((option) => {
      const bounds = option.getBoundingClientRect();
      return {
        label: option.querySelector('strong')?.textContent ?? '',
        left: bounds.left,
        right: bounds.right,
        cardLeft: card.left,
        cardRight: card.right,
        horizontalOverflow: option.scrollWidth - option.clientWidth,
        verticalOverflow: option.scrollHeight - option.clientHeight,
      };
    });
  });
  layout.forEach((option) => {
    expect(option.left, `${option.label} dépasse à gauche`).toBeGreaterThanOrEqual(option.cardLeft - 1);
    expect(option.right, `${option.label} dépasse à droite`).toBeLessThanOrEqual(option.cardRight + 1);
    expect(option.horizontalOverflow, `${option.label} coupe son texte horizontalement`).toBeLessThanOrEqual(1);
    expect(option.verticalOverflow, `${option.label} coupe son texte verticalement`).toBeLessThanOrEqual(1);
  });
};

const expectVisibleTextFits = async (page: Page, selector: string): Promise<void> => {
  const overflows = await page.locator(selector).evaluateAll((elements) => elements
    .filter((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden';
    })
    .map((element) => ({
      text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ?? '',
      overflow: (element as HTMLElement).scrollWidth - (element as HTMLElement).clientWidth,
    }))
    .filter((entry) => entry.text && entry.overflow > 2));
  expect(overflows, `Textes coupés dans ${selector}`).toEqual([]);
};

test('le lancement présente clairement les trois formats', async ({ page }) => {
  await openWithProfile(page, 'iphone');
  await expect(page.locator('.profile-picker')).toBeVisible();
  await expect(page.locator('.profile-option')).toHaveCount(3);
  await expect(page.locator('[data-game-profile="iphone"]')).toHaveAttribute('aria-pressed', 'true');
  await expectProfilePickerInsideCard(page);
  await page.locator('[data-game-profile="tablet"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-profile', 'tablet');
  await expect(page.getByRole('button', { name: /commencer.*tablette/i })).toBeVisible();
  await expectProfilePickerInsideCard(page);
  await page.screenshot({ path: 'test-results/profile-selector.png' });
  await page.locator('[data-game-profile="iphone"]').click();
  await start(page);
  const goal = page.locator('#island-goal');
  await page.locator('#island-goal-toggle').click();
  await expect(goal).toHaveClass(/expanded/);
  await expectVisibleTextFits(page, '#island-goal strong, #island-goal small, #island-goal li');
  await expectVisibleTextFits(page, '.resource-chip span, .resource-chip small, .objective strong');
  await page.screenshot({ path: 'test-results/profile-iphone-current.png' });
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
  await page.locator('#island-goal-toggle').click();
  await expect(goal).toHaveClass(/expanded/);
  await expectVisibleTextFits(page, '#island-goal strong, #island-goal small, #island-goal li');
  await page.screenshot({ path: 'test-results/profile-tablet-light.png' });
});

test('le profil PC active le HUD bureau et les commandes AZERTY', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWithProfile(page, 'pc');
  await expectProfilePickerInsideCard(page);
  await start(page);
  const before = await state(page);
  expect(before.gameProfile).toBe('pc');
  expect(before.pixelRatio).toBeGreaterThanOrEqual(1.5);
  expect(before.shadowsEnabled).toBe(true);
  await expect(page.locator('#touch-controls')).toBeHidden();
  await expect(page.locator('.pc-controls-hint')).toBeVisible();
  const goal = page.locator('#island-goal');
  await page.locator('#island-goal-toggle').click();
  await expect(goal).toHaveClass(/expanded/);
  await expectVisibleTextFits(page, '#island-goal strong, #island-goal small, #island-goal li');
  await expectVisibleTextFits(page, '.resource-chip strong, .resource-chip small, .objective strong');
  await page.screenshot({ path: 'test-results/profile-pc-high.png' });

  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyZ');
  const after = await state(page);
  expect(Math.hypot(after.player.x - before.player.x, after.player.z - before.player.z)).toBeGreaterThan(0.15);
});
