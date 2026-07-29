import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { SKILL_DEFINITIONS } from '../src/game/economy.ts';

const url = process.env.ILOTA_PERF_URL ?? 'http://127.0.0.1:4173/';
let previewProcess;
const serverReady = async () => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(750) });
    return response.ok;
  } catch {
    return false;
  }
};
if (!(await serverReady())) {
  if (process.env.ILOTA_PERF_URL) {
    throw new Error(`Aucun build Ilota accessible sur ${url}`);
  }
  previewProcess = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'preview', '--', '--port', '4173'],
    { stdio: 'ignore' },
  );
  for (let attempt = 0; attempt < 80 && !(await serverReady()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  if (!(await serverReady())) throw new Error('Le serveur de mesure n’a pas démarré.');
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 667, height: 375 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const skills = SKILL_DEFINITIONS.map((definition) => definition.id);
const skillRanks = Object.fromEntries(
  SKILL_DEFINITIONS.map((definition) => [definition.id, definition.maxRank ?? 1]),
);
const save = {
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
  observatoryBuilt: true,
  bridgesBuilt: [false, false, false, false],
  cachesFound: [],
  workers: [],
  completed: false,
  elapsedSeconds: 0,
  knowledge: 0,
  skills,
  skillRanks,
  autoRegulation: false,
  industrySurge: false,
  explorationFlow: false,
  powerNotifications: false,
  powerVfx: false,
  rebirths: 5,
  cycleMilestones: [],
  lifetimeDeliveries: 0,
  projectsCompleted: [],
  tutorialSeen: ['welcome', 'world-2'],
  currentWorld: 1,
  worldTwoPeakReached: false,
  worldTwoMoney: 0,
  worldTwoFangLevel: 1,
  worldTwoWolfFangLevel: 1,
  worldTwoCargo: {},
  worldTwoTerracesUnlocked: 11,
  worldTwoWolves: [],
  worldTwoSkills: [],
  worldTwoEnemyDefeats: 0,
};

try {
  await page.addInitScript((value) => {
    localStorage.setItem('ilota-save-v1', JSON.stringify(value));
  }, save);
  await page.goto(url);
  await page.waitForFunction(() => globalThis.__ILOTA__?.ready);
  await page.getByRole('button', { name: /commencer|reprendre/i }).click();

  const joystick = await page.locator('#joystick').boundingBox();
  if (!joystick) throw new Error('Joystick introuvable');
  const centerX = joystick.x + joystick.width / 2;
  const centerY = joystick.y + joystick.height / 2;
  const radius = joystick.width * 0.31;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  for (let step = 0; step < 180; step += 1) {
    const player = await page.evaluate(() => globalThis.__ILOTA__.player);
    const dx = -7.2 - player.x;
    const dz = 7.2 - player.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.7) break;
    const screenX = 0.828 * dx - 0.561 * dz;
    const screenY = -0.561 * dx - 0.828 * dz;
    const screenLength = Math.max(0.001, Math.hypot(screenX, screenY));
    await page.mouse.move(
      centerX + (screenX / screenLength) * radius,
      centerY - (screenY / screenLength) * radius,
    );
    await new Promise((resolve) => setTimeout(resolve, 140));
  }
  await page.mouse.up();
  await page.waitForFunction(() => globalThis.__ILOTA__.interaction === 'portal');

  await page.evaluate(() => {
    globalThis.__transitionPerf = {
      active: true,
      last: 0,
      frames: [],
      fps: [],
      drawCalls: [],
      triangles: [],
    };
    const sample = (timestamp) => {
      const perf = globalThis.__transitionPerf;
      if (!perf?.active) return;
      const state = globalThis.__ILOTA__;
      if (state?.worldTravelPathVisible) {
        if (perf.last > 0) perf.frames.push(timestamp - perf.last);
        perf.last = timestamp;
        perf.fps.push(state.fps);
        perf.drawCalls.push(state.drawCalls);
        perf.triangles.push(state.triangles);
      } else {
        perf.last = 0;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.locator('#action-button').tap();
  await page.waitForFunction(() => globalThis.__ILOTA__.worldTravelPathVisible);
  await page.waitForFunction(
    () => globalThis.__ILOTA__.currentWorld === 2 && !globalThis.__ILOTA__.worldTravelPathVisible,
    null,
    { timeout: 30_000 },
  );
  const result = await page.evaluate(() => {
    globalThis.__transitionPerf.active = false;
    const values = [...globalThis.__transitionPerf.frames].sort((a, b) => a - b);
    const percentile = (ratio) => (
      values[Math.min(values.length - 1, Math.floor(values.length * ratio))] ?? 0
    );
    return {
      samples: values.length,
      median_ms: Number(percentile(0.5).toFixed(1)),
      p95_ms: Number(percentile(0.95).toFixed(1)),
      p99_ms: Number(percentile(0.99).toFixed(1)),
      max_ms: Number((values.at(-1) ?? 0).toFixed(1)),
      min_diagnostic_fps: Number(Math.min(...globalThis.__transitionPerf.fps).toFixed(1)),
      max_draw_calls: Math.max(...globalThis.__transitionPerf.drawCalls),
      max_triangles: Math.max(...globalThis.__transitionPerf.triangles),
      world_travel_objects: globalThis.__ILOTA__.worldTravelObjects,
    };
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  previewProcess?.kill('SIGTERM');
}
