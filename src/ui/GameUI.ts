import {
  RESOURCE_ICONS,
  RESOURCE_KINDS,
  RESOURCE_LABELS,
  WORLD_TWO_SKILLS,
  WORLD_TWO_BUILDINGS,
  WORLD_TWO_MINERALS,
  ISLAND_PROJECTS,
  SKILL_BRANCH_LABELS,
  SKILL_DEFINITIONS,
  formatCost,
  formatWorldTwoCost,
  formatWorldTwoMoney,
  getCompletedProjectCount,
  getCargoCapacity,
  getCycleMultiplier,
  getIslandGoal,
  getObjective,
  getPriorityShortage,
  getProjectCost,
  getRecruitCost,
  getRebirthReward,
  getSkillCost,
  getSkillRank,
  getUnlockedWorkerTasks,
  getUpgradeCost,
  getWorkerCapacity,
  getWorkerCargoCapacity,
  getWorkerGatherSeconds,
  getWorkerLevelCap,
  getWorkerTravelSpeed,
  getWorkerYield,
  getWorldTwoCargoCapacity,
  getWorldTwoCargoTotal,
  getWorldTwoFangUpgradeCost,
  getWorldTwoPackCapacity,
  hasProject,
  hasSkill,
  hasWorldTwoSkill,
  hasWorldTwoBuilding,
  isProjectVisible,
  isProjectHallBuilt,
  isSkillVisible,
  projectPrerequisitesMet,
  skillPrerequisitesMet,
  worldTwoSkillPrerequisitesMet,
  type IslandProgress,
  type IslandGoal,
  type ProjectId,
  type ResourceKind,
  type SkillBranch,
  type SkillId,
  type WorldTwoSkillId,
} from '../game/economy';
import { applyGameProfile, GAME_PROFILE_CONFIGS, type GameProfile } from '../game/platform';
import {
  getSaveProfileSummaries,
  setSaveProfilePassword,
  verifySaveProfilePassword,
  renameSaveProfile,
  type SaveProfileId,
} from '../game/saveProfiles';
import { ISLANDS, RESOURCE_SPAWN_PROFILES, WORLD_TWO_TERRACES } from '../game/world';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface CrewHandlers {
  onOpenChange: (open: boolean) => void;
  onRecruit: () => void;
  onAssign: (workerId: string, task: ResourceKind) => void;
  onUpgrade: (workerId: string) => void;
}

interface TalentHandlers {
  onOpenChange: (open: boolean) => void;
  onUnlock: (skill: SkillId) => void;
  onAutoToggle: (enabled: boolean) => void;
  onIndustryToggle: (enabled: boolean) => void;
  onExplorationToggle: (enabled: boolean) => void;
  onPowerNotificationsToggle: (enabled: boolean) => void;
  onPowerVfxToggle: (enabled: boolean) => void;
  onWorldTwoUnlock: (skill: WorldTwoSkillId) => void;
  onWorldTwoFangUpgrade: (actor: 'player' | 'wolf') => void;
}

interface ProjectHandlers {
  onOpenChange: (open: boolean) => void;
  onBuild: (project: ProjectId) => void;
}

interface MenuHandlers {
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onNewTide: () => void;
  onReset: () => void;
}

interface SaveProfileHandlers {
  onOpen: () => void;
  onSwitch: (profile: SaveProfileId) => void;
}

export type AdminAction =
  | 'world-one-supplies'
  | 'world-one-knowledge'
  | 'unlock-world-two'
  | 'world-one-build-all'
  | 'world-two-fortune'
  | 'maximum-fangs'
  | 'world-two-skills'
  | 'world-two-buildings';

interface AdminHandlers {
  onOpenChange: (open: boolean) => void;
  onAction: (action: AdminAction) => void;
}

export type CrewMode = 'nursery' | 'workshop' | 'foundry' | 'remote';

const SKILL_MAP_WIDTH = 1160;
const SKILL_MAP_HEIGHT = 1500;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément #${id} introuvable.`);
  return element as T;
};

const canAfford = (progress: IslandProgress, cost: Record<ResourceKind, number>): boolean =>
  RESOURCE_KINDS.every((kind) => progress[kind] >= cost[kind]);

const ASSIGNMENT_LABELS: Record<ResourceKind, string> = {
  wood: 'au bois',
  stone: 'à la pierre',
  copper: 'au cuivre',
  crystal: 'au cristal',
};

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

export class GameUI {
  readonly startButton = byId<HTMLButtonElement>('start-button');
  readonly continueButton = byId<HTMLButtonElement>('continue-button');
  readonly resetButton = byId<HTMLButtonElement>('reset-button');
  readonly soundToggleButton = byId<HTMLButtonElement>('sound-toggle-button');
  readonly hapticsToggleButton = byId<HTMLButtonElement>('haptics-toggle-button');
  readonly rebirthButton = byId<HTMLButtonElement>('rebirth-button');
  readonly joystick = byId<HTMLElement>('joystick');
  readonly joystickKnob = byId<HTMLElement>('joystick-knob');
  readonly actionButton = byId<HTMLButtonElement>('action-button');
  readonly actionLabel = byId<HTMLElement>('action-label');
  readonly actionIcon = byId<HTMLElement>('action-icon');
  readonly profileButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-game-profile]'));
  private readonly startScreen = byId<HTMLElement>('start-screen');
  private readonly loadingScreen = byId<HTMLElement>('loading-screen');
  private readonly loadingBar = byId<HTMLElement>('loading-bar');
  private readonly loadingLabel = byId<HTMLElement>('loading-label');
  private readonly victoryScreen = byId<HTMLElement>('victory-screen');
  private readonly victoryWorkers = byId<HTMLElement>('victory-workers');
  private readonly victoryTime = byId<HTMLElement>('victory-time');
  private readonly victoryKnowledge = byId<HTMLElement>('victory-knowledge');
  private readonly victoryTide = byId<HTMLElement>('victory-tide');
  private readonly rebirthReward = byId<HTMLElement>('rebirth-reward');
  private readonly resourceCounts: Record<ResourceKind, HTMLElement> = {
    wood: byId<HTMLElement>('wood-count'),
    stone: byId<HTMLElement>('stone-count'),
    copper: byId<HTMLElement>('copper-count'),
    crystal: byId<HTMLElement>('crystal-count'),
  };
  private readonly knowledgeCount = byId<HTMLElement>('knowledge-count');
  private readonly cargoMeter = byId<HTMLElement>('cargo-meter');
  private readonly cargoCount = byId<HTMLElement>('cargo-count');
  private readonly objectiveEyebrow = byId<HTMLElement>('objective-eyebrow');
  private readonly objectiveTitle = byId<HTMLElement>('objective-title');
  private readonly objectiveDetail = byId<HTMLElement>('objective-detail');
  private readonly contextPrompt = byId<HTMLElement>('context-prompt');
  private readonly contextTitle = byId<HTMLElement>('context-title');
  private readonly contextDetail = byId<HTMLElement>('context-detail');
  private readonly islandGoal = byId<HTMLElement>('island-goal');
  private readonly islandGoalIsland = byId<HTMLElement>('island-goal-island');
  private readonly islandGoalTitle = byId<HTMLElement>('island-goal-title');
  private readonly islandGoalCount = byId<HTMLElement>('island-goal-count');
  private readonly islandGoalToggle = byId<HTMLButtonElement>('island-goal-toggle');
  private readonly islandGoalNextLabel = byId<HTMLElement>('island-goal-next-label');
  private readonly islandGoalList = byId<HTMLElement>('island-goal-list');
  private readonly toastElement = byId<HTMLElement>('toast');
  private readonly fatalError = byId<HTMLElement>('fatal-error');
  private readonly installButton = byId<HTMLButtonElement>('install-button');
  private readonly crewButton = byId<HTMLButtonElement>('crew-button');
  private readonly crewButtonCount = byId<HTMLElement>('crew-button-count');
  private readonly crewPanel = byId<HTMLElement>('crew-panel');
  private readonly crewCloseButton = byId<HTMLButtonElement>('crew-close-button');
  private readonly crewKicker = byId<HTMLElement>('crew-kicker');
  private readonly crewTitle = byId<HTMLElement>('crew-title');
  private readonly crewCapacity = byId<HTMLElement>('crew-capacity');
  private readonly crewHelp = byId<HTMLElement>('crew-help');
  private readonly crewModeStages = Array.from(document.querySelectorAll<HTMLElement>('[data-crew-stage]'));
  private readonly crewJobZone = byId<HTMLElement>('crew-job-zone');
  private readonly jobDocks = byId<HTMLElement>('job-docks');
  private readonly workerList = byId<HTMLElement>('worker-list');
  private readonly workerDetail = byId<HTMLElement>('worker-detail');
  private readonly recruitButton = byId<HTMLButtonElement>('recruit-button');
  private readonly recruitCost = byId<HTMLElement>('recruit-cost');
  private readonly crewFooter = byId<HTMLElement>('crew-footer');
  private readonly projectsButton = byId<HTMLButtonElement>('projects-button');
  private readonly projectsButtonCount = byId<HTMLElement>('projects-button-count');
  private readonly projectsPanel = byId<HTMLElement>('projects-panel');
  private readonly projectsCloseButton = byId<HTMLButtonElement>('projects-close-button');
  private readonly projectsProgress = byId<HTMLElement>('projects-progress');
  private readonly projectsHelp = byId<HTMLElement>('projects-help');
  private readonly projectsKicker = byId<HTMLElement>('projects-kicker');
  private readonly projectTiers = byId<HTMLElement>('project-tiers');
  private readonly talentButton = byId<HTMLButtonElement>('talent-button');
  private readonly talentButtonCount = byId<HTMLElement>('talent-button-count');
  private readonly talentPanel = byId<HTMLElement>('talent-panel');
  private readonly talentCloseButton = byId<HTMLButtonElement>('talent-close-button');
  private readonly talentKnowledge = byId<HTMLElement>('talent-knowledge');
  private readonly tideCount = byId<HTMLElement>('tide-count');
  private readonly forecastText = byId<HTMLElement>('forecast-text');
  private readonly skillBranches = byId<HTMLElement>('skill-branches');
  private readonly talentKicker = byId<HTMLElement>('talent-kicker');
  private readonly skillInspector = byId<HTMLElement>('skill-inspector');
  private readonly skillInspectorIcon = byId<HTMLElement>('skill-inspector-icon');
  private readonly skillInspectorBranch = byId<HTMLElement>('skill-inspector-branch');
  private readonly skillInspectorName = byId<HTMLElement>('skill-inspector-name');
  private readonly skillInspectorDetail = byId<HTMLElement>('skill-inspector-detail');
  private readonly skillInspectorStatus = byId<HTMLElement>('skill-inspector-status');
  private readonly skillBuyButton = byId<HTMLButtonElement>('skill-buy-button');
  private readonly autoRegulationButton = byId<HTMLButtonElement>('auto-regulation-button');
  private readonly industrySurgeButton = byId<HTMLButtonElement>('industry-surge-button');
  private readonly explorationFlowButton = byId<HTMLButtonElement>('exploration-flow-button');
  private readonly powerMessagesButton = byId<HTMLButtonElement>('power-messages-button');
  private readonly powerVfxButton = byId<HTMLButtonElement>('power-vfx-button');
  private readonly worldTwoSkillPanel = byId<HTMLElement>('world-two-skill-panel');
  private readonly worldTwoSkillClose = byId<HTMLButtonElement>('world-two-skill-close');
  private readonly worldTwoSkillResources = byId<HTMLElement>('world-two-skill-resources');
  private readonly worldTwoSkillGrid = byId<HTMLElement>('world-two-skill-grid');
  private readonly menuButton = byId<HTMLButtonElement>('menu-button');
  private readonly menuPanel = byId<HTMLElement>('menu-panel');
  private readonly menuCloseButton = byId<HTMLButtonElement>('menu-close-button');
  private readonly menuResumeButton = byId<HTMLButtonElement>('menu-resume-button');
  private readonly menuTideButton = byId<HTMLButtonElement>('menu-tide-button');
  private readonly menuTideHelp = byId<HTMLElement>('menu-tide-help');
  private readonly menuResetButton = byId<HTMLButtonElement>('menu-reset-button');
  private readonly menuStatus = byId<HTMLElement>('menu-status');
  private readonly menuSaveProfilesButton = byId<HTMLButtonElement>('menu-save-profiles-button');
  private readonly menuSaveProfileLabel = byId<HTMLElement>('menu-save-profile-label');
  private readonly startSaveProfilesButton = byId<HTMLButtonElement>('start-save-profiles-button');
  private readonly startSaveProfileLabel = byId<HTMLElement>('start-save-profile-label');
  private readonly saveProfilePanel = byId<HTMLElement>('save-profile-panel');
  private readonly saveProfileClose = byId<HTMLButtonElement>('save-profile-close');
  private readonly saveProfileList = byId<HTMLElement>('save-profile-list');
  private readonly saveProfileAuth = byId<HTMLFormElement>('save-profile-auth');
  private readonly saveProfileAuthAvatar = byId<HTMLElement>('save-profile-auth-avatar');
  private readonly saveProfileAuthKicker = byId<HTMLElement>('save-profile-auth-kicker');
  private readonly saveProfileAuthTitle = byId<HTMLElement>('save-profile-auth-title');
  private readonly saveProfileAuthHelp = byId<HTMLElement>('save-profile-auth-help');
  private readonly saveProfilePassword = byId<HTMLInputElement>('save-profile-password');
  private readonly saveProfilePasswordConfirm = byId<HTMLInputElement>('save-profile-password-confirm');
  private readonly saveProfilePasswordToggle = byId<HTMLButtonElement>('save-profile-password-toggle');
  private readonly saveProfileConfirmField = byId<HTMLElement>('save-profile-confirm-field');
  private readonly saveProfileAuthError = byId<HTMLElement>('save-profile-auth-error');
  private readonly saveProfileAuthCancel = byId<HTMLButtonElement>('save-profile-auth-cancel');
  private readonly saveProfileAuthSubmit = byId<HTMLButtonElement>('save-profile-auth-submit');
  private readonly adminPanel = byId<HTMLElement>('admin-panel');
  private readonly adminCloseButton = byId<HTMLButtonElement>('admin-close-button');
  private readonly adminKicker = byId<HTMLElement>('admin-kicker');
  private readonly adminTitle = byId<HTMLElement>('admin-title');
  private readonly adminWorldOne = byId<HTMLElement>('admin-world-one');
  private readonly adminWorldTwo = byId<HTMLElement>('admin-world-two');
  private readonly adminStatus = byId<HTMLElement>('admin-status');
  private readonly adminActionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-admin-action]'));
  private readonly tutorialPanel = byId<HTMLElement>('tutorial-panel');
  private readonly tutorialIcon = byId<HTMLElement>('tutorial-icon');
  private readonly tutorialTitle = byId<HTMLElement>('tutorial-title');
  private readonly tutorialDetail = byId<HTMLElement>('tutorial-detail');
  private readonly tutorialContinueButton = byId<HTMLButtonElement>('tutorial-continue-button');
  private readonly tideTransition = byId<HTMLElement>('tide-transition');
  private readonly tideTransitionKicker = byId<HTMLElement>('tide-transition-kicker');
  private readonly tideTransitionStage = byId<HTMLElement>('tide-transition-stage');
  private readonly tideTransitionProgress = byId<HTMLElement>('tide-transition-progress');
  private readonly tideTransitionReward = byId<HTMLElement>('tide-transition-reward');
  private readonly powerVfx = byId<HTMLElement>('power-vfx');
  private readonly powerVfxLabel = byId<HTMLElement>('power-vfx-label');
  private toastTimer = 0;
  private installPrompt: InstallPrompt | null = null;
  private crewHandlers: CrewHandlers | null = null;
  private talentHandlers: TalentHandlers | null = null;
  private projectHandlers: ProjectHandlers | null = null;
  private menuHandlers: MenuHandlers | null = null;
  private saveProfileHandlers: SaveProfileHandlers | null = null;
  private adminHandlers: AdminHandlers | null = null;
  private latestProgress: IslandProgress | null = null;
  private selectedSkill: SkillId | null = null;
  private selectedWorkerId: string | null = null;
  private crewMode: CrewMode = 'nursery';
  private newRecruitWorkerId: string | null = null;
  private levelUpWorker: { id: string; level: number } | null = null;
  private recruitAnimationTimer = 0;
  private levelUpAnimationTimer = 0;
  private levelUpVisualPendingKey = '';
  private crewRenderLockedUntil = 0;
  private skillZoom = 0.7;
  private readonly skillPointers = new Map<number, { x: number; y: number }>();
  private skillGesture:
    | { type: 'pan'; x: number; y: number; scrollLeft: number; scrollTop: number }
    | { type: 'pinch'; distance: number; zoom: number; midpointX: number; midpointY: number; scrollLeft: number; scrollTop: number }
    | null = null;
  private skillSuppressClick = false;
  private skillZoomFrame = 0;
  private lastTalentRenderKey = '';
  private menuResetArmed = false;
  private menuTideArmed = false;
  private menuTimer = 0;
  private lastGoalKey = '';
  private lastGoalIsland = -1;
  private islandGoalExpanded = false;
  private projectIslandIndex: 0 | 1 | 2 | 3 | 4 | null = null;
  private projectInputReadyAt = 0;
  private tutorialCloseHandler: (() => void) | null = null;
  private lastLevelUpKey = '';
  private gameProfile: GameProfile = 'iphone';
  private adminWorld: 1 | 2 = 1;
  private pendingSaveProfileAuth: { id: SaveProfileId; mode: 'create' | 'unlock' | 'protect' } | null = null;

  constructor() {
    const vfxBase = new URL(
      `${import.meta.env.BASE_URL}assets/third-party/kenney-particles/`,
      window.location.href,
    ).href.replace(/\/$/, '');
    document.documentElement.style.setProperty('--vfx-lightning', `url("${vfxBase}/lightning.png")`);
    document.documentElement.style.setProperty('--vfx-tide', `url("${vfxBase}/tide.png")`);
    document.documentElement.style.setProperty('--vfx-convergence', `url("${vfxBase}/convergence.png")`);
    this.profileButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const profile = button.dataset.gameProfile as GameProfile | undefined;
        if (profile) this.setGameProfile(profile);
      });
    });
    this.startSaveProfilesButton.addEventListener('click', () => this.showSaveProfiles());
    this.menuSaveProfilesButton.addEventListener('click', () => this.showSaveProfiles());
    this.saveProfileClose.addEventListener('click', () => this.hideSaveProfiles());
    this.saveProfilePanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.saveProfilePanel) this.hideSaveProfiles();
    });
    this.saveProfileList.addEventListener('click', (event) => {
      const button = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button[data-save-profile-switch]')
        : null;
      const id = button?.dataset.saveProfileSwitch as SaveProfileId | undefined;
      if (id && !button?.disabled) this.beginSaveProfileAccess(id);
    });
    this.saveProfileList.addEventListener('change', (event) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      const id = input?.dataset.saveProfileName as SaveProfileId | undefined;
      if (!input || !id) return;
      input.value = renameSaveProfile(id, input.value);
      this.renderSaveProfiles();
    });
    this.saveProfileAuth.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submitSaveProfileAuth();
    });
    this.saveProfileAuthCancel.addEventListener('click', () => this.hideSaveProfileAuth());
    this.saveProfilePasswordToggle.addEventListener('click', () => {
      const reveal = this.saveProfilePassword.type === 'password';
      this.saveProfilePassword.type = reveal ? 'text' : 'password';
      this.saveProfilePasswordConfirm.type = reveal ? 'text' : 'password';
      this.saveProfilePasswordToggle.setAttribute('aria-label', reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      this.saveProfilePasswordToggle.textContent = reveal ? '⊘' : '◉';
      this.saveProfilePassword.focus({ preventScroll: true });
    });
    this.renderSaveProfiles();
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event as InstallPrompt;
      this.installButton.hidden = false;
    });
    this.installButton.addEventListener('click', async () => {
      if (!this.installPrompt) return;
      await this.installPrompt.prompt();
      await this.installPrompt.userChoice;
      this.installPrompt = null;
      this.installButton.hidden = true;
    });

    this.crewButton.addEventListener('click', () => this.showCrew(
      this.latestProgress && hasSkill(this.latestProgress, 'remote_management') ? 'remote' : 'nursery',
    ));
    this.crewCloseButton.addEventListener('click', () => this.hideCrew());
    this.crewPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.crewPanel) this.hideCrew();
    });
    this.recruitButton.addEventListener('click', () => this.crewHandlers?.onRecruit());
    this.workerList.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-action]') : null;
      if (!target || target.disabled) return;
      const workerId = target.dataset.workerId;
      if (!workerId) return;
      if (target.dataset.action === 'select') {
        this.selectedWorkerId = workerId;
        if (this.latestProgress) this.renderCrew(this.latestProgress);
      }
      if (target.dataset.action === 'upgrade') this.crewHandlers?.onUpgrade(workerId);
    });
    this.workerDetail.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-action="upgrade"]') : null;
      if (!target || target.disabled || !target.dataset.workerId) return;
      this.crewHandlers?.onUpgrade(target.dataset.workerId);
    });
    this.jobDocks.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-task]') : null;
      if (!target?.dataset.task || target.disabled) return;
      const worker = this.latestProgress?.workers.find((candidate) => candidate.id === this.selectedWorkerId);
      if (!worker) {
        this.crewHelp.textContent = 'Choisis d’abord une carte de renard, puis touche ce métier.';
        this.workerList.querySelector<HTMLButtonElement>('.worker-select')?.focus({ preventScroll: true });
        return;
      }
      this.crewHandlers?.onAssign(worker.id, target.dataset.task as ResourceKind);
    });
    this.projectsButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      const nextIsland = ISLAND_PROJECTS.find((project) =>
        isProjectVisible(this.latestProgress!, project)
        && !hasProject(this.latestProgress!, project.id))?.islandIndex;
      if (nextIsland !== undefined) this.showProjects(nextIsland);
    });
    this.projectsCloseButton.addEventListener('click', () => this.hideProjects());
    this.projectsPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.projectsPanel) this.hideProjects();
    });
    this.projectTiers.addEventListener('click', (event) => {
      if (performance.now() < this.projectInputReadyAt) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-project]') : null;
      if (!target?.dataset.project || target.disabled) return;
      this.projectHandlers?.onBuild(target.dataset.project as ProjectId);
    });
    this.talentButton.addEventListener('click', () => this.showTalents());
    this.talentCloseButton.addEventListener('click', () => this.hideTalents());
    this.talentPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.talentPanel) this.hideTalents();
    });
    this.worldTwoSkillClose.addEventListener('click', () => this.hideWorldTwoSkills());
    this.worldTwoSkillPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.worldTwoSkillPanel) this.hideWorldTwoSkills();
    });
    this.worldTwoSkillGrid.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (!target || target.disabled) return;
      if (target.dataset.worldTwoFang === 'player' || target.dataset.worldTwoFang === 'wolf') {
        this.talentHandlers?.onWorldTwoFangUpgrade(target.dataset.worldTwoFang);
        return;
      }
      if (target.dataset.worldTwoSkill) {
        this.talentHandlers?.onWorldTwoUnlock(target.dataset.worldTwoSkill as WorldTwoSkillId);
      }
    });
    this.skillBranches.addEventListener('click', (event) => {
      if (this.skillSuppressClick) {
        this.skillSuppressClick = false;
        return;
      }
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-skill]') : null;
      if (!target?.dataset.skill) return;
      this.selectSkill(target.dataset.skill as SkillId);
    });
    this.skillBuyButton.addEventListener('click', () => {
      if (!this.selectedSkill || this.skillBuyButton.disabled) return;
      this.skillBuyButton.classList.remove('confirming');
      window.requestAnimationFrame(() => this.skillBuyButton.classList.add('confirming'));
      this.talentHandlers?.onUnlock(this.selectedSkill!);
    });
    this.skillBranches.addEventListener('pointerdown', (event) => this.beginSkillPointer(event));
    this.skillBranches.addEventListener('pointermove', (event) => this.moveSkillPointer(event));
    this.skillBranches.addEventListener('pointerup', (event) => this.endSkillPointer(event));
    this.skillBranches.addEventListener('pointercancel', (event) => this.endSkillPointer(event));
    this.skillBranches.addEventListener('lostpointercapture', (event) => this.endSkillPointer(event));
    window.addEventListener('pointerup', (event) => this.endSkillPointer(event), true);
    window.addEventListener('pointercancel', (event) => this.endSkillPointer(event), true);
    window.addEventListener('blur', () => this.resetSkillGesture());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetSkillGesture();
    });
    this.skillBranches.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.setSkillZoom(this.skillZoom + (event.deltaY < 0 ? 0.08 : -0.08), event.clientX, event.clientY);
    }, { passive: false });
    this.autoRegulationButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onAutoToggle(!this.latestProgress.autoRegulation);
    });
    this.industrySurgeButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onIndustryToggle(!this.latestProgress.industrySurge);
    });
    this.explorationFlowButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onExplorationToggle(!this.latestProgress.explorationFlow);
    });
    this.powerMessagesButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onPowerNotificationsToggle(!this.latestProgress.powerNotifications);
    });
    this.powerVfxButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onPowerVfxToggle(!this.latestProgress.powerVfx);
    });
    this.tutorialContinueButton.addEventListener('click', () => {
      this.tutorialPanel.hidden = true;
      const handler = this.tutorialCloseHandler;
      this.tutorialCloseHandler = null;
      handler?.();
    });
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') return;
      if (!this.tutorialPanel.hidden) this.tutorialContinueButton.click();
      else if (!this.crewPanel.hidden) this.hideCrew();
      else if (!this.projectsPanel.hidden) this.hideProjects();
      else if (!this.talentPanel.hidden) this.hideTalents();
      else if (!this.worldTwoSkillPanel.hidden) this.hideWorldTwoSkills();
      else if (!this.adminPanel.hidden) this.hideAdmin();
      else if (!this.saveProfilePanel.hidden) this.hideSaveProfiles();
      else if (!this.menuPanel.hidden) this.hideMenu();
    });

    this.menuButton.addEventListener('click', () => this.showMenu());
    this.menuCloseButton.addEventListener('click', () => this.hideMenu());
    this.menuResumeButton.addEventListener('click', () => {
      this.menuHandlers?.onResume();
      this.hideMenu();
    });
    this.menuPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.menuPanel) this.hideMenu();
    });
    this.menuTideButton.addEventListener('click', () => this.confirmMenuTide());
    this.menuResetButton.addEventListener('click', () => this.confirmMenuReset());
    this.adminCloseButton.addEventListener('click', () => this.hideAdmin());
    this.adminPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.adminPanel) this.hideAdmin();
    });
    this.adminActionButtons.forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.adminAction as AdminAction | undefined;
      if (action) this.adminHandlers?.onAction(action);
    }));
    this.islandGoalToggle.addEventListener('click', () => {
      if (this.islandGoal.classList.contains('completed')) return;
      this.islandGoalExpanded = !this.islandGoalExpanded;
      this.islandGoal.classList.toggle('expanded', this.islandGoalExpanded);
      this.islandGoalToggle.setAttribute('aria-expanded', String(this.islandGoalExpanded));
      this.islandGoalToggle.setAttribute(
        'aria-label',
        `${this.islandGoalExpanded ? 'Réduire' : 'Afficher'} toutes les étapes de cette île`,
      );
    });
  }

  get selectedGameProfile(): GameProfile {
    return this.gameProfile;
  }

  setGameProfile(profile: GameProfile, persist = true): void {
    this.gameProfile = profile;
    applyGameProfile(profile, persist);
    this.profileButtons.forEach((button) => {
      const selected = button.dataset.gameProfile === profile;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const verb = this.startButton.textContent?.startsWith('REPRENDRE') ? 'REPRENDRE' : 'COMMENCER';
    this.startButton.textContent = `${verb} · ${GAME_PROFILE_CONFIGS[profile].label.toUpperCase()}`;
  }

  setAdminIslandMode(active: boolean): void {
    document.documentElement.classList.toggle('admin-island', active);
    if (!active) return;
    this.objectiveEyebrow.textContent = 'ZONE HORS CARTE · ADMIN';
    this.objectiveTitle.textContent = 'Choisis un terminal World 1 ou World 2';
    this.objectiveDetail.textContent = 'Le portail vert au nord ramène vers l’Îlot des Marées.';
  }

  bindCrewHandlers(handlers: CrewHandlers): void {
    this.crewHandlers = handlers;
  }

  bindTalentHandlers(handlers: TalentHandlers): void {
    this.talentHandlers = handlers;
  }

  bindProjectHandlers(handlers: ProjectHandlers): void {
    this.projectHandlers = handlers;
  }

  bindMenuHandlers(handlers: MenuHandlers): void {
    this.menuHandlers = handlers;
  }

  bindSaveProfileHandlers(handlers: SaveProfileHandlers): void {
    this.saveProfileHandlers = handlers;
  }

  bindAdminHandlers(handlers: AdminHandlers): void {
    this.adminHandlers = handlers;
  }

  updateFeedbackSettings(sound: boolean, haptics: boolean): void {
    this.soundToggleButton.setAttribute('aria-pressed', String(sound));
    this.soundToggleButton.querySelector('strong')!.textContent = `SON · ${sound ? 'OUI' : 'NON'}`;
    this.hapticsToggleButton.setAttribute('aria-pressed', String(haptics));
    this.hapticsToggleButton.querySelector('strong')!.textContent = `VIBRATIONS · ${haptics ? 'OUI' : 'NON'}`;
  }

  celebrateRecruit(workerId: string): void {
    this.selectedWorkerId = workerId;
    this.newRecruitWorkerId = workerId;
    window.clearTimeout(this.recruitAnimationTimer);
    if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
    this.recruitAnimationTimer = window.setTimeout(() => {
      this.newRecruitWorkerId = null;
      if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
    }, 2200);
  }

  celebrateLevelUp(workerId: string, level: number): void {
    const key = `${workerId}:${level}`;
    if (this.lastLevelUpKey === key) return;
    this.lastLevelUpKey = key;
    this.levelUpVisualPendingKey = key;
    this.selectedWorkerId = workerId;
    this.levelUpWorker = { id: workerId, level };
    window.clearTimeout(this.levelUpAnimationTimer);
    if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
    this.crewRenderLockedUntil = performance.now() + 820;
    this.levelUpAnimationTimer = window.setTimeout(() => {
      this.levelUpWorker = null;
      if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
    }, 1550);
  }

  get isCrewOpen(): boolean {
    return !this.crewPanel.hidden;
  }

  get isTalentOpen(): boolean {
    return !this.talentPanel.hidden;
  }

  get isWorldTwoSkillOpen(): boolean {
    return !this.worldTwoSkillPanel.hidden;
  }

  get isProjectsOpen(): boolean {
    return !this.projectsPanel.hidden;
  }

  get isMenuOpen(): boolean {
    return !this.menuPanel.hidden;
  }

  get isAdminOpen(): boolean {
    return !this.adminPanel.hidden;
  }

  get hasBlockingOverlay(): boolean {
    return !this.crewPanel.hidden
      || !this.projectsPanel.hidden
      || !this.talentPanel.hidden
      || !this.worldTwoSkillPanel.hidden
      || !this.adminPanel.hidden
      || !this.saveProfilePanel.hidden
      || !this.menuPanel.hidden
      || !this.tutorialPanel.hidden;
  }

  get activeCrewMode(): CrewMode {
    return this.crewMode;
  }

  showCrew(mode: CrewMode = 'nursery'): void {
    if (!this.latestProgress?.campBuilt || this.latestProgress.currentWorld !== 1) return;
    if (mode === 'remote' && !hasSkill(this.latestProgress, 'remote_management')) return;
    if (mode === 'workshop' && !this.latestProgress.workshopBuilt) return;
    if (mode === 'foundry' && !this.latestProgress.foundryBuilt) return;
    this.crewMode = mode;
    this.crewPanel.hidden = false;
    this.renderCrew(this.latestProgress);
    this.crewHandlers?.onOpenChange(true);
    window.setTimeout(() => this.crewCloseButton.focus(), 0);
  }

  hideCrew(): void {
    if (this.crewPanel.hidden) return;
    this.crewPanel.hidden = true;
    this.crewHandlers?.onOpenChange(false);
    this.menuButton.focus({ preventScroll: true });
  }

  showProjects(islandIndex: 0 | 1 | 2 | 3 | 4): void {
    if (!this.latestProgress) return;
    if (!isProjectHallBuilt(this.latestProgress, islandIndex)) return;
    const localProjects = ISLAND_PROJECTS.filter((project) => project.islandIndex === islandIndex);
    if (!localProjects.some((project) => isProjectVisible(this.latestProgress!, project))) return;
    this.projectIslandIndex = islandIndex;
    this.projectsPanel.hidden = false;
    this.projectInputReadyAt = performance.now() + 360;
    this.projectTiers.inert = true;
    this.renderProjects(this.latestProgress);
    this.projectHandlers?.onOpenChange(true);
    window.setTimeout(() => { this.projectTiers.inert = false; }, 360);
    window.setTimeout(() => this.projectsCloseButton.focus(), 0);
  }

  hideProjects(): void {
    if (this.projectsPanel.hidden) return;
    this.projectsPanel.hidden = true;
    this.projectHandlers?.onOpenChange(false);
    this.menuButton.focus({ preventScroll: true });
  }

  showTalents(): void {
    if (!this.latestProgress?.observatoryBuilt) return;
    this.resetSkillGesture();
    this.talentPanel.hidden = false;
    this.renderTalents(this.latestProgress);
    this.talentHandlers?.onOpenChange(true);
    window.setTimeout(() => this.talentCloseButton.focus(), 0);
  }

  hideTalents(): void {
    if (this.talentPanel.hidden) return;
    this.resetSkillGesture();
    this.talentPanel.hidden = true;
    this.talentHandlers?.onOpenChange(false);
    this.menuButton.focus({ preventScroll: true });
  }

  showWorldTwoSkills(): void {
    if (
      !this.latestProgress
      || this.latestProgress.currentWorld !== 2
    ) return;
    this.worldTwoSkillPanel.hidden = false;
    this.renderWorldTwoSkills(this.latestProgress);
    this.talentHandlers?.onOpenChange(true);
    window.setTimeout(() => this.worldTwoSkillClose.focus(), 0);
  }

  hideWorldTwoSkills(): void {
    if (this.worldTwoSkillPanel.hidden) return;
    this.worldTwoSkillPanel.hidden = true;
    this.talentHandlers?.onOpenChange(false);
    this.menuButton.focus({ preventScroll: true });
  }

  private renderWorldTwoSkills(progress: IslandProgress): void {
    this.worldTwoSkillResources.replaceChildren();
    const money = element('span');
    money.textContent = `◉ ${formatWorldTwoMoney(progress.worldTwoMoney)}`;
    const playerFangs = element('span');
    playerFangs.textContent = `🦷 Crocs ${progress.worldTwoFangLevel}/30`;
    const wolfFangs = element('span');
    wolfFangs.textContent = `🐺 Meute ${progress.worldTwoWolfFangLevel}/30`;
    const buildings = element('span');
    buildings.textContent = `⌂ Chantiers ${progress.worldTwoBuildings.length}/${WORLD_TWO_BUILDINGS.length}`;
    this.worldTwoSkillResources.append(money, playerFangs, wolfFangs, buildings);

    this.worldTwoSkillGrid.replaceChildren();
    ([
      { actor: 'player' as const, name: 'Crocs du voyageur', level: progress.worldTwoFangLevel, icon: '🦷' },
      { actor: 'wolf' as const, name: 'Crocs de la meute', level: progress.worldTwoWolfFangLevel, icon: '🐺' },
    ]).forEach(({ actor, name, level, icon }) => {
      const upgradeCost = getWorldTwoFangUpgradeCost(progress, actor);
      const nextMineral = WORLD_TWO_MINERALS[level];
      const maximum = upgradeCost === null;
      const card = element('button', `world-two-skill-card${maximum ? ' owned' : ''}`);
      card.type = 'button';
      card.dataset.worldTwoFang = actor;
      card.disabled = maximum || progress.worldTwoMoney < upgradeCost;
      const cardIcon = element('b');
      cardIcon.textContent = icon;
      const cardName = element('strong');
      cardName.textContent = `${name} · ${level}/30`;
      const detail = element('small');
      detail.textContent = maximum
        ? 'Tous les minerais de la montagne peuvent être mordus.'
        : `Débloque ${nextMineral?.name ?? 'le prochain minerai'} · dureté ${nextMineral?.hardness ?? level + 1}.`;
      const price = element('em');
      price.textContent = maximum ? '✓ NIVEAU MAXIMUM' : formatWorldTwoMoney(upgradeCost);
      card.append(cardIcon, cardName, detail, price);
      this.worldTwoSkillGrid.append(card);
    });

    const branches = [
      { id: 'extraction', name: 'EXTRACTION', detail: 'Frappes, cargaison et filons' },
      { id: 'pack', name: 'MEUTE', detail: 'Loups, défense et transport' },
      { id: 'fortune', name: 'FORTUNE', detail: 'Ventes, coûts et primes' },
      { id: 'convergence', name: 'CONVERGENCE', detail: 'Maîtrise des trois voies' },
    ] as const;
    branches.forEach((branch) => {
      const heading = element('div', `world-two-skill-branch branch-${branch.id}`);
      const title = element('strong');
      title.textContent = branch.name;
      const summary = element('small');
      summary.textContent = branch.detail;
      heading.append(title, summary);
      this.worldTwoSkillGrid.append(heading);
      WORLD_TWO_SKILLS.filter((skill) => skill.branch === branch.id).forEach((skill) => {
      const owned = hasWorldTwoSkill(progress, skill.id);
      const prerequisites = worldTwoSkillPrerequisitesMet(progress, skill);
      const affordable = progress.worldTwoMoney >= skill.cost;
      const card = element('button', `world-two-skill-card branch-${skill.branch}${owned ? ' owned' : prerequisites ? '' : ' locked'}`);
      card.type = 'button';
      card.dataset.worldTwoSkill = skill.id;
      card.disabled = owned || !prerequisites || !affordable;
      const icon = element('b');
      icon.textContent = skill.icon;
      const name = element('strong');
      name.textContent = skill.name;
      const detail = element('small');
      detail.textContent = skill.detail;
      const price = element('em');
      price.textContent = owned
        ? '✓ ACQUIS'
        : prerequisites
          ? formatWorldTwoCost(skill.cost)
          : `REQUIS · ${(skill.requires ?? []).map((id) => WORLD_TWO_SKILLS.find((entry) => entry.id === id)?.name).filter(Boolean).join(' + ')}`;
      card.append(icon, name, detail, price);
      this.worldTwoSkillGrid.append(card);
      });
    });
  }

  showMenu(): void {
    if (!this.latestProgress || !this.startScreen.hidden || !this.loadingScreen.hidden) return;
    this.hideCrew();
    this.hideProjects();
    this.hideTalents();
    this.hideWorldTwoSkills();
    this.resetMenuConfirmations();
    this.renderMenu(this.latestProgress);
    this.menuPanel.hidden = false;
    this.menuHandlers?.onOpenChange(true);
    window.setTimeout(() => this.menuResumeButton.focus(), 0);
  }

  private showSaveProfiles(): void {
    this.saveProfileHandlers?.onOpen();
    this.renderSaveProfiles();
    this.saveProfilePanel.hidden = false;
    window.setTimeout(() => this.saveProfileClose.focus(), 0);
  }

  private hideSaveProfiles(): void {
    if (this.saveProfilePanel.hidden) return;
    this.hideSaveProfileAuth(false);
    this.saveProfilePanel.hidden = true;
    if (!this.menuPanel.hidden) this.menuSaveProfilesButton.focus({ preventScroll: true });
    else this.startSaveProfilesButton.focus({ preventScroll: true });
  }

  private beginSaveProfileAccess(id: SaveProfileId): void {
    const profile = getSaveProfileSummaries().find((candidate) => candidate.id === id);
    if (!profile) return;
    const mode = profile.hasPassword ? 'unlock' : profile.active ? 'protect' : 'create';
    this.pendingSaveProfileAuth = { id, mode };
    const creating = mode !== 'unlock';
    this.saveProfileAuthAvatar.textContent = id;
    this.saveProfileAuthKicker.textContent = mode === 'unlock' ? 'PROFIL VERROUILLÉ' : 'PROTECTION DU PROFIL';
    this.saveProfileAuthTitle.textContent = mode === 'unlock'
      ? `Déverrouiller ${profile.name}`
      : `Créer le mot de passe de ${profile.name}`;
    this.saveProfileAuthHelp.textContent = mode === 'unlock'
      ? 'Entre le mot de passe associé à cette sauvegarde.'
      : 'Choisis au moins 4 caractères. Ce mot de passe sera demandé pour revenir sur ce profil.';
    this.saveProfileConfirmField.hidden = !creating;
    this.saveProfilePassword.autocomplete = creating ? 'new-password' : 'current-password';
    this.saveProfilePassword.value = '';
    this.saveProfilePasswordConfirm.value = '';
    this.saveProfilePassword.type = 'password';
    this.saveProfilePasswordConfirm.type = 'password';
    this.saveProfilePasswordToggle.textContent = '◉';
    this.saveProfilePasswordToggle.setAttribute('aria-label', 'Afficher le mot de passe');
    this.saveProfileAuthError.textContent = '';
    this.saveProfileAuthSubmit.textContent = mode === 'unlock' ? 'DÉVERROUILLER' : mode === 'protect' ? 'SÉCURISER CE PROFIL' : 'CRÉER LE PROFIL';
    this.saveProfileAuthSubmit.disabled = false;
    this.saveProfileAuth.hidden = false;
    window.setTimeout(() => this.saveProfilePassword.focus(), 0);
  }

  private hideSaveProfileAuth(restoreFocus = true): void {
    const id = this.pendingSaveProfileAuth?.id;
    this.pendingSaveProfileAuth = null;
    this.saveProfileAuth.hidden = true;
    this.saveProfileAuthError.textContent = '';
    if (restoreFocus && id) {
      window.setTimeout(() => {
        this.saveProfileList.querySelector<HTMLButtonElement>(`[data-save-profile-switch="${id}"]`)?.focus({ preventScroll: true });
      }, 0);
    }
  }

  private async submitSaveProfileAuth(): Promise<void> {
    const pending = this.pendingSaveProfileAuth;
    if (!pending || this.saveProfileAuthSubmit.disabled) return;
    const password = this.saveProfilePassword.value;
    this.saveProfileAuthError.textContent = '';
    if (password.length < 4) {
      this.saveProfileAuthError.textContent = 'Utilise au moins 4 caractères.';
      this.saveProfilePassword.focus();
      return;
    }
    if (pending.mode !== 'unlock' && password !== this.saveProfilePasswordConfirm.value) {
      this.saveProfileAuthError.textContent = 'Les deux mots de passe ne correspondent pas.';
      this.saveProfilePasswordConfirm.focus();
      return;
    }
    this.saveProfileAuthSubmit.disabled = true;
    this.saveProfileAuthSubmit.textContent = pending.mode === 'unlock' ? 'VÉRIFICATION…' : 'PROTECTION…';
    try {
      if (pending.mode === 'unlock') {
        const valid = await verifySaveProfilePassword(pending.id, password);
        if (!valid) {
          this.saveProfileAuthError.textContent = 'Mot de passe incorrect.';
          this.saveProfilePassword.select();
          return;
        }
      } else {
        await setSaveProfilePassword(pending.id, password);
      }
      if (pending.mode === 'protect') {
        this.hideSaveProfileAuth(false);
        this.renderSaveProfiles();
        this.saveProfileList.querySelector<HTMLButtonElement>(`[data-save-profile-switch="${pending.id}"]`)?.focus({ preventScroll: true });
        return;
      }
      this.saveProfileHandlers?.onSwitch(pending.id);
    } catch {
      this.saveProfileAuthError.textContent = 'Impossible de sécuriser ce profil sur cet appareil.';
    } finally {
      if (this.pendingSaveProfileAuth) {
        this.saveProfileAuthSubmit.disabled = false;
        this.saveProfileAuthSubmit.textContent = pending.mode === 'unlock' ? 'DÉVERROUILLER' : pending.mode === 'protect' ? 'SÉCURISER CE PROFIL' : 'CRÉER LE PROFIL';
      }
    }
  }

  private renderSaveProfiles(): void {
    const profiles = getSaveProfileSummaries();
    const active = profiles.find((profile) => profile.active) ?? profiles[0]!;
    const activeState = active.hasSave
      ? `World ${active.currentWorld} · Marée ${active.tide} · ${active.workers} renard${active.workers > 1 ? 's' : ''}`
      : 'nouvelle aventure';
    this.startSaveProfileLabel.textContent = `${active.name} · ${activeState}`;
    this.menuSaveProfileLabel.textContent = `${active.name} · progression locale séparée`;
    this.saveProfileList.replaceChildren();
    profiles.forEach((profile) => {
      const card = element('article', `save-profile-slot${profile.active ? ' active' : ''}`);
      const identity = element('div', 'save-profile-identity');
      const badge = element('span', 'save-profile-avatar');
      badge.textContent = profile.id;
      const copy = element('div');
      const input = element('input');
      input.value = profile.name;
      input.maxLength = 18;
      input.dataset.saveProfileName = profile.id;
      input.setAttribute('aria-label', `Nom du joueur ${profile.id}`);
      const status = element('small');
      status.textContent = profile.hasSave
        ? `WORLD ${profile.currentWorld} · MARÉE ${profile.tide} · ${profile.workers} RENARD${profile.workers > 1 ? 'S' : ''}${profile.completed ? ' · ACTE TERMINÉ' : ''}`
        : 'AUCUNE SAUVEGARDE · NOUVELLE AVENTURE';
      const security = element('span', `save-profile-security${profile.hasPassword ? ' secured' : ' unsecured'}`);
      security.textContent = profile.hasPassword ? '🔒 PROTÉGÉ' : '◇ À SÉCURISER';
      copy.append(input, status);
      identity.append(badge, copy);
      const choose = element('button', 'save-profile-switch');
      choose.type = 'button';
      choose.dataset.saveProfileSwitch = profile.id;
      choose.disabled = profile.active && profile.hasPassword;
      choose.textContent = profile.active
        ? profile.hasPassword ? 'ACTIF' : 'SÉCURISER'
        : profile.hasPassword ? 'DÉVERROUILLER' : 'CRÉER';
      card.append(identity, security, choose);
      this.saveProfileList.append(card);
    });
  }

  showAdmin(world: 1 | 2): void {
    if (!this.latestProgress || !this.startScreen.hidden || !this.loadingScreen.hidden) return;
    this.hideCrew();
    this.hideProjects();
    this.hideTalents();
    this.hideWorldTwoSkills();
    this.hideMenu();
    this.adminWorld = world;
    this.adminKicker.textContent = `ÎLE ADMIN · TERMINAL WORLD ${world}`;
    this.adminTitle.textContent = `ADMIN · WORLD ${world}`;
    this.adminWorldOne.hidden = world !== 1;
    this.adminWorldTwo.hidden = world !== 2;
    this.renderAdmin(this.latestProgress);
    this.adminPanel.hidden = false;
    this.adminHandlers?.onOpenChange(true);
    const firstAction = (world === 1 ? this.adminWorldOne : this.adminWorldTwo)
      .querySelector<HTMLButtonElement>('.admin-action');
    window.setTimeout(() => firstAction?.focus(), 0);
  }

  hideAdmin(): void {
    if (this.adminPanel.hidden) return;
    this.adminPanel.hidden = true;
    this.adminHandlers?.onOpenChange(false);
    this.actionButton.focus({ preventScroll: true });
  }

  private renderAdmin(progress: IslandProgress): void {
    this.adminStatus.textContent = this.adminWorld === 1
      ? `WORLD 1 · ${progress.wood} bois · ${progress.stone} pierre · ${progress.copper} cuivre · ${progress.crystal} cristal · ${progress.knowledge} Savoir.`
      : `WORLD 2 · ${formatWorldTwoMoney(progress.worldTwoMoney)} · crocs ${progress.worldTwoFangLevel}/30 · meute ${progress.worldTwoWolfFangLevel}/30 · ${progress.worldTwoSkills.length}/${WORLD_TWO_SKILLS.length} savoirs.`;
  }

  hideMenu(): void {
    if (this.menuPanel.hidden) return;
    this.menuPanel.hidden = true;
    this.resetMenuConfirmations();
    this.menuHandlers?.onOpenChange(false);
    this.menuButton.focus({ preventScroll: true });
  }

  private renderMenu(progress: IslandProgress): void {
    const objective = getObjective(progress);
    this.menuStatus.textContent = progress.completed
      ? `Acte terminé · ${progress.workers.length} renards · ${progress.knowledge} Savoir disponible.`
      : `${objective.eyebrow} · ${objective.title}.`;
    this.menuTideButton.disabled = !progress.completed;
    this.menuTideHelp.textContent = progress.completed
      ? `Recommencer en gardant l’arbre et gagner +${getRebirthReward(progress)} Savoir.`
      : 'Termine et éveille le Cœur de l’acte actuel pour la débloquer.';
  }

  private confirmMenuTide(): void {
    if (!this.latestProgress?.completed || this.menuTideButton.disabled) return;
    if (this.menuTideArmed) {
      window.clearTimeout(this.menuTimer);
      this.menuHandlers?.onNewTide();
      return;
    }
    this.menuTideArmed = true;
    this.menuTideButton.classList.add('armed');
    this.menuTideButton.querySelector('strong')!.textContent = 'CONFIRMER LA NOUVELLE MARÉE';
    this.menuTideHelp.textContent = 'L’archipel et l’équipe repartent de zéro · les savoirs restent.';
    this.menuTimer = window.setTimeout(() => {
      this.menuTideArmed = false;
      this.renderMenu(this.latestProgress!);
      this.menuTideButton.classList.remove('armed');
      this.menuTideButton.querySelector('strong')!.textContent = 'NOUVELLE MARÉE';
    }, 4500);
  }

  private confirmMenuReset(): void {
    if (this.menuResetArmed) {
      window.clearTimeout(this.menuTimer);
      this.menuHandlers?.onReset();
      return;
    }
    this.menuResetArmed = true;
    this.menuResetButton.classList.add('armed');
    this.menuResetButton.textContent = 'CONFIRMER · TOUT EFFACER';
    this.toast('Attention : cette action efface aussi les Savoirs et les Nouvelles Marées.');
    this.menuTimer = window.setTimeout(() => this.resetMenuConfirmations(), 4500);
  }

  private resetMenuConfirmations(): void {
    window.clearTimeout(this.menuTimer);
    this.menuResetArmed = false;
    this.menuTideArmed = false;
    this.menuResetButton.classList.remove('armed');
    this.menuResetButton.textContent = 'RÉINITIALISER LA PROGRESSION';
    this.menuTideButton.classList.remove('armed');
    this.menuTideButton.querySelector('strong')!.textContent = 'NOUVELLE MARÉE';
    if (this.latestProgress) this.renderMenu(this.latestProgress);
  }

  updateCargo(amount: number, capacity: number): void {
    this.cargoCount.textContent = `${amount} / ${capacity}`;
    this.cargoMeter.classList.toggle('carrying', amount > 0);
    this.cargoMeter.classList.toggle('full', amount >= capacity);
    this.cargoMeter.setAttribute('aria-label', `Cargaison portée : ${amount} unités sur ${capacity}`);
  }

  showTutorial(title: string, detail: string, icon: string, onClose: () => void): void {
    this.tutorialTitle.textContent = title;
    this.tutorialDetail.textContent = detail;
    this.tutorialIcon.textContent = icon;
    this.tutorialCloseHandler = onClose;
    this.tutorialPanel.hidden = false;
    window.setTimeout(() => this.tutorialContinueButton.focus(), 0);
  }

  showTideTransition(tide: number, reward: number): void {
    document.documentElement.classList.add('tide-cinematic');
    this.tideTransitionKicker.textContent = `NOUVELLE MARÉE · CYCLE ${tide}`;
    this.tideTransitionStage.textContent = 'La Couronne disparaît…';
    this.tideTransitionProgress.style.width = '0%';
    this.tideTransitionReward.textContent = `+${reward} SAVOIR`;
    this.tideTransition.hidden = false;
  }

  updateTideTransition(stage: string, progress: number): void {
    this.tideTransitionStage.textContent = stage;
    this.tideTransitionProgress.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
  }

  setPowerEffects(
    industryActive: boolean,
    industryKind: ResourceKind,
    industryRemaining: number,
    explorationActive: boolean,
    explorationRemaining: number,
  ): void {
    const visualEnabled = this.latestProgress?.powerVfx !== false;
    this.powerVfx.classList.toggle('industry-active', visualEnabled && industryActive);
    this.powerVfx.classList.toggle('exploration-active', visualEnabled && explorationActive);
    this.powerVfxLabel.textContent = !visualEnabled
      ? ''
      : industryActive
      ? `ϟ SURCHARGE · ${RESOURCE_LABELS[industryKind].toUpperCase()} · ${Math.ceil(industryRemaining)} s`
      : explorationActive
        ? `≋ COURANT DE MARÉE · ${Math.ceil(explorationRemaining)} s`
        : '';
  }

  setLoading(progress: number, label: string): void {
    this.loadingBar.style.width = `${Math.max(4, progress * 100)}%`;
    this.loadingLabel.textContent = label === 'renards' ? 'Les bâtisseurs arrivent' : `Plantation : ${label}`;
  }

  finishLoading(): void {
    this.loadingBar.style.width = '100%';
    this.loadingLabel.textContent = 'Archipel prêt';
    window.setTimeout(() => { this.loadingScreen.hidden = true; }, 240);
  }

  start(): void {
    this.startScreen.hidden = true;
  }

  update(progress: IslandProgress): void {
    this.latestProgress = progress;
    if (!this.adminPanel.hidden) this.renderAdmin(progress);
    if (progress.currentWorld === 2) {
      // Les pouvoirs, panneaux et renards du premier monde restent suspendus
      // avec l’archipel : aucun état visuel ne doit survivre au portail.
      this.setPowerEffects(false, 'wood', 0, false, 0);
      if (!this.crewPanel.hidden) {
        this.crewPanel.hidden = true;
        this.crewHandlers?.onOpenChange(false);
      }
    }
    RESOURCE_KINDS.forEach((kind, index) => {
      const count = this.resourceCounts[kind];
      const chip = count.closest<HTMLElement>('.resource-chip');
      const icon = chip?.querySelector<HTMLElement>('.resource-icon');
      const label = chip?.querySelector<HTMLElement>('small');
      if (progress.currentWorld === 2) {
        if (chip) chip.hidden = index > 0;
        if (index === 0) {
          count.textContent = progress.worldTwoMoney.toLocaleString('fr-FR');
          if (icon) icon.textContent = '◉';
          if (label) label.textContent = 'argent';
        }
      } else {
        if (chip) chip.hidden = false;
        count.textContent = String(progress[kind]);
        if (icon) icon.textContent = RESOURCE_ICONS[kind];
        if (label) label.textContent = RESOURCE_LABELS[kind];
      }
      chip?.classList.toggle('world-two-resource', progress.currentWorld === 2);
    });
    const knowledgeChip = this.knowledgeCount.closest<HTMLElement>('.resource-chip');
    const knowledgeIcon = knowledgeChip?.querySelector<HTMLElement>('.resource-icon');
    const knowledgeLabel = knowledgeChip?.querySelector<HTMLElement>('small');
    if (knowledgeChip) knowledgeChip.hidden = progress.currentWorld === 2;
    this.knowledgeCount.textContent = String(progress.knowledge);
    if (knowledgeIcon) knowledgeIcon.textContent = '✧';
    if (knowledgeLabel) knowledgeLabel.textContent = 'savoir';
    this.updateCargo(
      progress.currentWorld === 2 ? getWorldTwoCargoTotal(progress) : RESOURCE_KINDS.reduce((total, kind) => total + progress.playerCargo[kind], 0),
      progress.currentWorld === 2 ? getWorldTwoCargoCapacity(progress) : getCargoCapacity(progress),
    );

    if (progress.currentWorld === 2) {
      const nextBuilding = WORLD_TWO_BUILDINGS.find((building) => !hasWorldTwoBuilding(progress, building.id));
      this.objectiveEyebrow.textContent = 'WORLD 2 · MONTAGNE DU ZÉNITH';
      this.objectiveTitle.textContent = progress.worldTwoPeakReached
        ? 'Le sommet se souvient de toi'
        : nextBuilding
          ? `Prochain chantier · ${nextBuilding.name}`
          : `Durcis tes crocs · niveau ${progress.worldTwoFangLevel}/30`;
      this.objectiveDetail.textContent = progress.worldTwoPeakReached
        ? 'Le Cœur du Zénith est éveillé. Explore librement ou emprunte le portail du Refuge des Échos.'
        : `${formatWorldTwoMoney(progress.worldTwoMoney)} · chantiers ${progress.worldTwoBuildings.length}/${WORLD_TWO_BUILDINGS.length} · meute ${progress.worldTwoWolves.length}/${getWorldTwoPackCapacity(progress)}.`;
    } else {
      const objective = getObjective(progress);
      this.objectiveEyebrow.textContent = objective.eyebrow;
      this.objectiveTitle.textContent = objective.title;
      this.objectiveDetail.textContent = objective.detail;
    }

    const capacity = getWorkerCapacity(progress);
    this.crewButton.hidden = progress.currentWorld === 2
      || !progress.campBuilt
      || !hasSkill(progress, 'remote_management');
    this.crewButtonCount.textContent = `${progress.workers.length}/${capacity}`;
    this.crewButton.setAttribute('aria-label', `Gérer l’équipe, ${progress.workers.length} travailleurs sur ${capacity}`);
    const completedProjects = getCompletedProjectCount(progress);
    this.projectsButton.hidden = true;
    this.projectsButtonCount.textContent = `${completedProjects}/${ISLAND_PROJECTS.length}`;
    this.projectsButton.setAttribute('aria-label', `Ouvrir les Grands Travaux, ${completedProjects} sur ${ISLAND_PROJECTS.length} achevés`);
    this.talentButton.hidden = true;
    this.talentButtonCount.textContent = String(progress.knowledge);
    this.talentButton.setAttribute('aria-label', `Ouvrir l’arbre de talents, ${progress.knowledge} points de Savoir disponibles`);
    if (!this.crewPanel.hidden && performance.now() >= this.crewRenderLockedUntil) this.renderCrew(progress);
    if (!this.projectsPanel.hidden) this.renderProjects(progress);
    if (!this.talentPanel.hidden) this.renderTalents(progress);
    if (!this.worldTwoSkillPanel.hidden) this.renderWorldTwoSkills(progress);
    if (!this.menuPanel.hidden) this.renderMenu(progress);
  }

  private renderCrew(progress: IslandProgress): void {
    const capacity = getWorkerCapacity(progress);
    const levelCap = getWorkerLevelCap(progress);
    const unlockedTasks = getUnlockedWorkerTasks(progress);
    const nursery = this.crewMode === 'nursery';
    const remote = this.crewMode === 'remote';
    const rosterManagement = nursery || remote;
    const workshop = this.crewMode === 'workshop';
    this.crewPanel.dataset.mode = this.crewMode;
    this.crewModeStages.forEach((stage) => {
      const mode = stage.dataset.crewStage;
      const activeMode = remote ? 'nursery' : this.crewMode;
      const unlocked = mode === 'nursery'
        || (mode === 'workshop' && progress.workshopBuilt)
        || (mode === 'foundry' && progress.foundryBuilt);
      stage.classList.toggle('active', mode === activeMode);
      stage.classList.toggle('locked', !unlocked);
      stage.setAttribute('aria-current', mode === activeMode ? 'step' : 'false');
      stage.setAttribute('aria-label', `${stage.textContent?.trim() ?? ''}${unlocked ? '' : ', verrouillé'}`);
    });
    this.crewKicker.textContent = rosterManagement
      ? remote ? 'CONSEIL ITINÉRANT · LIAISON DES TROIS VOIES' : 'NURSERIE DE L’ÎLOT CENTRAL'
      : workshop ? 'ATELIER DES PINS · FORMATION' : 'FONDERIE CUIVRÉE · MAÎTRISE';
    this.crewTitle.textContent = rosterManagement
      ? remote ? 'Dirige tes renards où que tu sois' : 'Recrute et place tes renards'
      : workshop ? 'Former au niveau 2' : 'Former au niveau 3';
    let selectedWorker = progress.workers.find((worker) => worker.id === this.selectedWorkerId);
    if (!selectedWorker && progress.workers[0]) {
      this.selectedWorkerId = progress.workers[0].id;
      selectedWorker = progress.workers[0];
    } else if (this.selectedWorkerId && !selectedWorker) this.selectedWorkerId = null;
    this.crewCapacity.textContent = rosterManagement
      ? `${progress.workers.length} / ${capacity}`
      : `${progress.workers.filter((worker) => workshop ? worker.level >= 2 : worker.level >= 3).length} FORMÉS`;
    this.crewHelp.textContent = rosterManagement
      ? selectedWorker
        ? remote
          ? `${selectedWorker.name} · métier et formation à distance débloqués.`
          : `${selectedWorker.name} · choisis son métier. Niveau 2 : atelier · niveau 3 : fonderie.`
        : progress.autoRegulation
          ? `Auto-régulation active · priorité actuelle : ${RESOURCE_LABELS[getPriorityShortage(progress)]}.`
          : '1. Choisis un renard · 2. Touche un métier.'
      : selectedWorker
        ? `${selectedWorker.name} sélectionné · lis sa fiche puis confirme sa formation.`
        : 'Choisis un renard pour ouvrir sa fiche de formation.';

    const recruitCost = getRecruitCost(progress);
    this.recruitCost.textContent = progress.workers.length >= capacity ? 'CAPACITÉ ATTEINTE' : formatCost(recruitCost);
    this.recruitButton.disabled = progress.workers.length >= capacity || !canAfford(progress, recruitCost);
    this.crewFooter.hidden = !rosterManagement;
    this.crewJobZone.hidden = !rosterManagement;

    const accessibleIslandCount = Math.min(ISLANDS.length, progress.bridgesBuilt.filter(Boolean).length + 1);
    this.jobDocks.replaceChildren();
    if (rosterManagement) RESOURCE_KINDS.forEach((task) => {
      const assigned = progress.workers.filter((worker) => worker.task === task).length;
      const enabled = unlockedTasks.includes(task);
      const accessibleProfiles = RESOURCE_SPAWN_PROFILES.slice(0, accessibleIslandCount);
      const rates = accessibleProfiles
        .map((profile, islandIndex) => {
          const islandName = ISLANDS[islandIndex]?.name
            .replace(/^Îlot des |^Île des |^Île de |^Île /, '') ?? `I${islandIndex + 1}`;
          return `${islandName} ${profile.weights[task]} %`;
        });
      const dock = element('button', `job-dock job-${task}`);
      dock.type = 'button';
      dock.dataset.task = task;
      dock.disabled = !enabled;
      dock.title = rates.join(' · ');
      dock.setAttribute('aria-pressed', String(selectedWorker?.task === task));
      dock.setAttribute('aria-label', enabled
        ? selectedWorker
          ? `Affecter ${selectedWorker.name} ${ASSIGNMENT_LABELS[task]}. ${rates.join(', ')}`
          : `Métier ${RESOURCE_LABELS[task]}, ${assigned} renard${assigned > 1 ? 's' : ''}. Choisir d’abord un renard.`
        : `${RESOURCE_LABELS[task]} verrouillé`);

      const icon = element('span', 'job-icon');
      icon.textContent = RESOURCE_ICONS[task];
      icon.setAttribute('aria-hidden', 'true');
      const copy = element('span', 'job-copy');
      const label = element('strong');
      label.textContent = selectedWorker?.task === task ? `${RESOURCE_LABELS[task]} ✓` : RESOURCE_LABELS[task];
      const chance = element('small');
      chance.textContent = enabled
        ? `${accessibleProfiles.map((profile) => profile.weights[task]).join(' · ')} % · I1→I${accessibleIslandCount}`
        : 'MÉTIER VERROUILLÉ';
      copy.append(label, chance);
      const count = element('span', 'job-count');
      count.textContent = String(assigned);
      count.setAttribute('aria-label', `${assigned} renard${assigned > 1 ? 's' : ''}`);
      dock.append(icon, copy, count);
      this.jobDocks.append(dock);
    });

    const previousRosterScroll = this.workerList.scrollTop;
    this.workerList.replaceChildren();
    if (progress.workers.length === 0) {
      const empty = element('div', 'crew-empty');
      empty.innerHTML = '<span aria-hidden="true">🦊</span><strong>Le terrier est vide</strong><small>Récolte le coût indiqué puis appelle ton premier renard.</small>';
      this.workerList.append(empty);
      this.workerDetail.className = 'worker-detail worker-detail-empty';
      this.workerDetail.innerHTML = '<span aria-hidden="true">🦊</span><strong>Premier terrier disponible</strong><small>Appelle un renard pour ouvrir sa fiche.</small>';
      return;
    }

    const pendingLevelVisual = this.levelUpWorker
      ? this.levelUpVisualPendingKey === `${this.levelUpWorker.id}:${this.levelUpWorker.level}`
      : false;
    progress.workers.forEach((worker) => {
      const isSelected = worker.id === this.selectedWorkerId;
      const isNew = worker.id === this.newRecruitWorkerId;
      const isLeveling = pendingLevelVisual && worker.id === this.levelUpWorker?.id;
      const card = element('article', [
        'worker-card',
        `task-${worker.task}`,
        isSelected ? 'selected' : '',
        isNew ? 'new-recruit' : '',
        isLeveling ? 'leveling-up' : '',
        !rosterManagement && ((workshop && worker.level === 1) || (!workshop && worker.level === 2)) ? 'training-ready' : '',
        !rosterManagement && ((workshop && worker.level >= 2) || (!workshop && worker.level >= 3)) ? 'training-complete' : '',
        !rosterManagement && !workshop && worker.level < 2 ? 'training-locked' : '',
      ].filter(Boolean).join(' '));
      const heading = element('button', 'worker-select');
      heading.type = 'button';
      heading.dataset.action = 'select';
      heading.dataset.workerId = worker.id;
      heading.setAttribute('aria-pressed', String(isSelected));
      const workerCapacity = getWorkerCargoCapacity(worker.level, progress);
      heading.setAttribute(
        'aria-label',
        `Sélectionner ${worker.name}, niveau ${worker.level}, métier ${RESOURCE_LABELS[worker.task]}, coup ${getWorkerYield(worker.level, progress)}, harnais ${workerCapacity}`,
      );
      const avatar = element('span', 'worker-avatar');
      avatar.textContent = '🦊';
      avatar.setAttribute('aria-hidden', 'true');
      const identity = element('div', 'worker-identity');
      const name = element('strong');
      name.textContent = worker.name;
      const level = element('small');
      level.textContent = `NIV ${worker.level} · COUP +${getWorkerYield(worker.level, progress)} · SAC ${workerCapacity}`;
      const pips = element('span', 'level-pips');
      pips.setAttribute('aria-hidden', 'true');
      for (let rank = 1; rank <= 3; rank += 1) {
        const pip = element('i', rank <= worker.level ? 'filled' : '');
        pips.append(pip);
      }
      identity.append(name, level, pips);
      const currentJob = element('span', 'current-job');
      currentJob.innerHTML = `<span aria-hidden="true">${RESOURCE_ICONS[worker.task]}</span><small>${RESOURCE_LABELS[worker.task]}</small>`;
      heading.append(avatar, identity, currentJob);

      if (!rosterManagement) {
        const trainingState = element('span', 'worker-training-state');
        trainingState.textContent = workshop
          ? worker.level >= 2 ? 'FORMÉ' : 'PRÊT'
          : worker.level >= 3 ? 'MAÎTRE' : worker.level === 2 ? 'PRÊT' : 'ATELIER REQUIS';
        heading.append(trainingState);
      }

      if (isNew) {
        const burst = element('span', 'worker-burst recruit-burst');
        burst.textContent = 'NOUVEAU !';
        burst.setAttribute('role', 'status');
        card.append(burst);
      }
      card.append(heading);
      this.workerList.append(card);
    });
    this.renderWorkerDetail(progress, selectedWorker ?? progress.workers[0]!, levelCap, pendingLevelVisual);
    if (pendingLevelVisual) this.levelUpVisualPendingKey = '';
    window.requestAnimationFrame(() => { this.workerList.scrollTop = previousRosterScroll; });
  }

  private renderWorkerDetail(
    progress: IslandProgress,
    worker: IslandProgress['workers'][number],
    levelCap: ReturnType<typeof getWorkerLevelCap>,
    showLevelVisual = false,
  ): void {
    this.workerDetail.replaceChildren();
    this.workerDetail.className = `worker-detail task-${worker.task}${showLevelVisual && worker.id === this.levelUpWorker?.id ? ' leveling-up' : ''}`;
    const currentCapacity = getWorkerCargoCapacity(worker.level, progress);
    const currentYield = getWorkerYield(worker.level, progress);
    const currentGather = getWorkerGatherSeconds(worker.level, progress);
    const currentSpeed = getWorkerTravelSpeed(worker.level, progress);
    this.workerDetail.setAttribute(
      'aria-label',
      `Fiche de ${worker.name}, niveau ${worker.level}, coup ${currentYield}, harnais ${currentCapacity}, récolte ${currentGather.toFixed(2)} secondes`,
    );

    const hero = element('div', 'worker-detail-hero');
    const avatar = element('span', 'worker-detail-avatar');
    avatar.textContent = '🦊';
    avatar.setAttribute('aria-hidden', 'true');
    const identity = element('div');
    const name = element('strong');
    name.textContent = worker.name;
    const formatStat = (value: number): string => value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const job = element('small');
    job.textContent = `${RESOURCE_ICONS[worker.task]} ${RESOURCE_LABELS[worker.task]} · COUP +${currentYield} · SAC ${currentCapacity}`;
    const timingStats = element('small', 'worker-timing-stats');
    timingStats.textContent = `${formatStat(currentGather)} s/frappe · ${formatStat(currentSpeed)} m/s`;
    identity.append(name, job, timingStats);
    const level = element('b', 'worker-detail-level');
    level.textContent = `NIV ${worker.level} · ${'★'.repeat(worker.level)}${'☆'.repeat(3 - worker.level)}`;
    hero.append(avatar, identity, level);

    const stats = element('div', 'worker-detail-stats');
    const statDefinitions = [
      ['COUP', `+${currentYield}`, 'ressources'],
      ['SAC', String(currentCapacity), 'places'],
      ['FRAPPE', `${formatStat(currentGather)} s`, 'par coup'],
      ['COURSE', `${formatStat(currentSpeed)} m/s`, 'déplacement'],
    ];
    statDefinitions.forEach(([label, value, hint]) => {
      const stat = element('div', 'worker-stat');
      stat.innerHTML = `<small>${label}</small><strong>${value}</strong><span>${hint}</span>`;
      stats.append(stat);
    });

    const nextLevel = Math.min(3, worker.level + 1) as 1 | 2 | 3;
    const progression = element('div', 'worker-progression');
    const currentStage = element('div', 'worker-stage current');
    currentStage.innerHTML = `<small>AUJOURD’HUI</small><strong>NIVEAU ${worker.level}</strong><span>+${currentYield}/coup · sac ${currentCapacity}</span>`;
    const arrow = element('span', 'worker-stage-arrow');
    arrow.textContent = worker.level >= 3 ? '★' : '→';
    arrow.setAttribute('aria-hidden', 'true');
    const nextStage = element('div', 'worker-stage next');
    nextStage.innerHTML = worker.level >= 3
      ? '<small>PARCOURS TERMINÉ</small><strong>MAÎTRE RENARD</strong><span>Niveau maximum atteint</span>'
      : `<small>APRÈS FORMATION</small><strong>NIVEAU ${nextLevel}</strong><span>+${getWorkerYield(nextLevel, progress)}/coup · sac ${getWorkerCargoCapacity(nextLevel, progress)}</span>`;
    progression.append(currentStage, arrow, nextStage);

    const action = element('div', 'worker-upgrade-action');
    const cost = element('div', 'worker-upgrade-cost');
    const upgrade = element('button', 'upgrade-button worker-detail-upgrade');
    upgrade.type = 'button';
    upgrade.dataset.action = 'upgrade';
    upgrade.dataset.workerId = worker.id;
    let actionLabel = 'FORMATION INDISPONIBLE';
    let costLabel = 'BÂTIMENT REQUIS';
    if (this.crewMode === 'nursery') {
      actionLabel = worker.level >= 3 ? 'NIVEAU MAXIMUM' : 'REJOINDRE LE BÂTIMENT';
      costLabel = worker.level >= 3 ? 'PARCOURS TERMINÉ' : worker.level === 2 ? 'FONDERIE REQUISE' : 'ATELIER REQUIS';
      upgrade.disabled = true;
    } else if (this.crewMode === 'workshop' && worker.level >= 2) {
      actionLabel = worker.level === 3 ? 'DÉJÀ MAÎTRE' : 'FORMATION TERMINÉE';
      costLabel = 'NIVEAU 2 VALIDÉ';
      upgrade.disabled = true;
    } else if (this.crewMode === 'foundry' && worker.level < 2) {
      actionLabel = 'PASSER PAR L’ATELIER';
      costLabel = 'NIVEAU 2 REQUIS';
      upgrade.disabled = true;
    } else if (worker.level >= 3) {
      actionLabel = 'NIVEAU MAXIMUM';
      costLabel = 'PARCOURS TERMINÉ';
      upgrade.disabled = true;
    } else if (worker.level >= levelCap) {
      actionLabel = 'BÂTIMENT REQUIS';
      costLabel = `${levelCap === 1 ? 'ATELIER' : 'FONDERIE'} À CONSTRUIRE`;
      upgrade.disabled = true;
    } else {
      const upgradeCost = getUpgradeCost(worker, progress);
      actionLabel = `FORMER AU NIVEAU ${nextLevel}`;
      costLabel = formatCost(upgradeCost);
      upgrade.setAttribute('aria-label', `Améliorer ${worker.name} au niveau ${worker.level + 1}, coût ${formatCost(upgradeCost)}`);
      upgrade.disabled = !canAfford(progress, upgradeCost);
    }
    cost.innerHTML = `<small>COÛT DE FORMATION</small><strong>${costLabel}</strong>`;
    upgrade.textContent = actionLabel;
    action.append(cost, upgrade);
    this.workerDetail.append(hero, stats, progression, action);

    if (showLevelVisual && worker.id === this.levelUpWorker?.id) {
      const burst = element('span', 'worker-detail-burst');
      burst.textContent = `LEVEL UP · NIV ${this.levelUpWorker.level}`;
      burst.setAttribute('role', 'status');
      this.workerDetail.append(burst);
    }
  }

  private renderProjects(progress: IslandProgress): void {
    const islandIndex = this.projectIslandIndex;
    if (islandIndex === null) return;
    const island = ISLANDS[islandIndex];
    const localProjects = ISLAND_PROJECTS.filter((definition) =>
      definition.islandIndex === islandIndex
      && isProjectVisible(progress, definition));
    const localCompleted = localProjects.filter((definition) => hasProject(progress, definition.id)).length;
    this.projectsKicker.textContent = `${island?.name.toUpperCase() ?? 'ÎLE'} · UNE MAISON · TROIS TRAVAUX`;
    this.projectsProgress.textContent = `${localCompleted} / 3 TRAVAUX ACHEVÉS`;
    this.projectsHelp.textContent = localCompleted >= 3
      ? 'Maison complète · ce palier restera définitivement validé.'
      : 'Touche une carte pour lire son bonus, son coût, puis la financer.';
    this.projectTiers.replaceChildren();
    if (!localProjects.length) {
      const empty = element('div', 'projects-empty');
      empty.innerHTML = '<span aria-hidden="true">⌂</span><strong>Maison encore fermée</strong><small>Construis le bâtiment principal de cette île pour révéler ses trois Travaux.</small>';
      this.projectTiers.append(empty);
      return;
    }

    const visibleTiers = [...new Set(localProjects.map((definition) => definition.tier))];
    visibleTiers.forEach((tier) => {
      const tierProjects = localProjects.filter((definition) => definition.tier === tier);
      const section = element('section', 'project-tier');
      const heading = element('header', 'project-tier-heading');
      const title = element('strong');
      title.textContent = `Les trois Travaux · palier ${tier}`;
      const count = element('small');
      const completedInTier = tierProjects.filter((definition) => hasProject(progress, definition.id)).length;
      count.textContent = `${completedInTier}/${tierProjects.length}`;
      heading.append(title, count);
      const grid = element('div', 'project-grid');

      tierProjects.forEach((definition) => {
        const built = hasProject(progress, definition.id);
        const prerequisites = projectPrerequisitesMet(progress, definition);
        const projectCost = getProjectCost(progress, definition);
        const affordable = canAfford(progress, projectCost);
        const button = element('button', `project-card${built ? ' completed' : ''}${!built && affordable ? ' affordable' : ''}`);
        button.type = 'button';
        button.dataset.project = definition.id;
        button.disabled = built || !prerequisites || !affordable;
        button.setAttribute('aria-label', built
          ? `${definition.name}, achevé. ${definition.effect}`
          : `Construire ${definition.name}, coût ${formatCost(projectCost)}. ${definition.effect}`);

        const icon = element('span', 'project-icon');
        icon.textContent = built ? '✓' : definition.icon;
        icon.setAttribute('aria-hidden', 'true');
        const copy = element('span', 'project-copy');
        const name = element('strong');
        name.textContent = definition.name;
        const detail = element('small');
        detail.textContent = definition.detail;
        const effect = element('b');
        effect.textContent = definition.effect;
        copy.append(name, detail, effect);
        const footer = element('span', 'project-card-footer');
        footer.textContent = built
          ? '✓ ACHEVÉ · BONUS ACTIF'
          : affordable
            ? `${formatCost(projectCost)} · +${definition.knowledge} Savoir · FINANCER`
            : `${formatCost(projectCost)} · RESSOURCES MANQUANTES`;
        button.append(icon, copy, footer);
        grid.append(button);
      });
      section.append(heading, grid);
      this.projectTiers.append(section);
    });
  }

  private renderTalents(progress: IslandProgress): void {
    const renderKey = JSON.stringify([
      progress.knowledge,
      progress.rebirths,
      progress.skills,
      progress.skillRanks,
      progress.autoRegulation,
      progress.industrySurge,
      progress.explorationFlow,
      progress.powerNotifications,
      progress.powerVfx,
    ]);
    const previouslyRendered = Boolean(this.skillBranches.querySelector('.skill-map-canvas'));
    if (renderKey === this.lastTalentRenderKey && previouslyRendered) {
      this.updateSkillSelection(progress);
      return;
    }
    // Ne jamais remplacer le graphe sous des doigts encore posés : sur iOS,
    // retirer la cible d'un pointeur actif peut faire disparaître son cancel.
    if (this.skillPointers.size > 0 && previouslyRendered) return;

    const previousScrollLeft = this.skillBranches.scrollLeft;
    const previousScrollTop = this.skillBranches.scrollTop;
    this.talentKnowledge.textContent = `${progress.knowledge} Savoir disponible${progress.knowledge > 1 ? 's' : ''}`;
    this.tideCount.textContent = `Marée ${progress.rebirths + 1} · exigence ×${getCycleMultiplier(progress).toFixed(2)}`;
    this.skillBranches.replaceChildren();
    const visibleSkills = SKILL_DEFINITIONS.filter((definition) => isSkillVisible(progress, definition));
    if (!this.selectedSkill || !visibleSkills.some((skill) => skill.id === this.selectedSkill)) {
      this.selectedSkill = visibleSkills[0]?.id ?? null;
    }
    this.forecastText.textContent = hasSkill(progress, 'forecasting')
      ? `Prévision : prochain manque probable, ${RESOURCE_LABELS[getPriorityShortage(progress)]} · pince pour zoomer.`
      : 'Touche un hexagone pour lire son pouvoir · pince à deux doigts pour zoomer.';
    this.talentKicker.textContent = `${visibleSkills.length}/${SKILL_DEFINITIONS.length} HEXAGONES DÉCOUVERTS · FUTUR MASQUÉ`;
    const stage = element('div', 'skill-map-stage');
    stage.style.width = `${SKILL_MAP_WIDTH * this.skillZoom}px`;
    stage.style.height = `${SKILL_MAP_HEIGHT * this.skillZoom}px`;
    const canvas = element('div', 'skill-map-canvas');
    canvas.setAttribute('role', 'group');
    canvas.setAttribute('aria-label', 'Constellation des savoirs');
    canvas.style.transform = `scale(${this.skillZoom})`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('skill-links');
    svg.setAttribute('viewBox', `0 0 ${SKILL_MAP_WIDTH} ${SKILL_MAP_HEIGHT}`);
    svg.setAttribute('aria-hidden', 'true');
    visibleSkills.forEach((definition) => {
      definition.requires?.forEach((requiredId) => {
        const required = visibleSkills.find((candidate) => candidate.id === requiredId);
        if (!required) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(required.x));
        line.setAttribute('y1', String(required.y));
        line.setAttribute('x2', String(definition.x));
        line.setAttribute('y2', String(definition.y));
        line.classList.add('skill-link');
        if (hasSkill(progress, required.id) && hasSkill(progress, definition.id)) line.classList.add('unlocked');
        else if (skillPrerequisitesMet(progress, definition)) line.classList.add('available');
        svg.append(line);
      });
    });
    canvas.append(svg);

    if (hasSkill(progress, 'awakening')) (Object.keys(SKILL_BRANCH_LABELS) as SkillBranch[]).forEach((branch, index) => {
      const copy = SKILL_BRANCH_LABELS[branch];
      const badge = element('div', `skill-map-badge branch-${branch}`);
      badge.style.left = `${[175, 580, 985][index]}px`;
      badge.innerHTML = `<span aria-hidden="true">${copy.icon}</span><strong>${copy.name}</strong>`;
      canvas.append(badge);
    });

    visibleSkills.forEach((skill) => {
      const rank = getSkillRank(progress, skill.id);
      const maximum = skill.maxRank ?? 1;
      const unlocked = rank > 0;
      const maxed = rank >= maximum;
      const prerequisiteMet = skillPrerequisitesMet(progress, skill);
      const priceValue = getSkillCost(progress, skill);
      const available = prerequisiteMet && progress.knowledge >= priceValue && !maxed;
      const locked = !available;
      const selected = skill.id === this.selectedSkill;
      const button = element('button', `skill-hex branch-${skill.branch}${unlocked ? ' unlocked' : ''}${available ? ' available' : ''}${locked ? ' locked' : ''}${selected ? ' selected' : ''}${skill.maxRank ? ' repeatable' : ''}${skill.id === 'archipelago_consciousness' ? ' final-skill' : ''}`);
      button.type = 'button';
      button.dataset.skill = skill.id;
      button.dataset.rank = String(rank);
      button.dataset.unlockable = String(available);
      button.style.left = `${skill.x}px`;
      button.style.top = `${skill.y}px`;
      button.setAttribute('aria-pressed', String(selected));
      const rankCopy = skill.maxRank ? `, rang ${rank} sur ${maximum}` : '';
      button.setAttribute(
        'aria-label',
        maxed
          ? `Voir ${skill.name}${rankCopy}, acquis. ${skill.detail}`
          : `Voir ${skill.name}${skill.maxRank ? ` rang ${rank + 1}` : ''}, prix ${priceValue} Savoir. ${skill.detail}`,
      );
      button.title = skill.detail;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.skillSuppressClick = false;
        this.selectSkill(skill.id);
      });

      const icon = element('span', 'skill-hex-icon');
      icon.textContent = maxed && !skill.maxRank ? '✓' : skill.icon;
      const name = element('strong', 'skill-hex-name');
      name.textContent = skill.name;
      const price = element('small', 'skill-hex-price');
      price.textContent = maxed
        ? skill.maxRank ? `MAX ${rank}/${maximum}` : 'ACQUIS'
        : skill.maxRank ? `RANG ${rank + 1} · ${priceValue}` : `${priceValue} SAVOIR`;
      button.append(icon, name, price);
      canvas.append(button);
    });
    stage.append(canvas);
    this.skillBranches.append(stage);
    this.lastTalentRenderKey = renderKey;
    window.cancelAnimationFrame(this.skillZoomFrame);
    this.skillZoomFrame = window.requestAnimationFrame(() => {
      this.skillZoomFrame = 0;
      if (this.talentPanel.hidden || !stage.isConnected) return;
      this.skillBranches.scrollLeft = previouslyRendered
        ? previousScrollLeft
        : Math.max(0, 580 * this.skillZoom - this.skillBranches.clientWidth / 2);
      this.skillBranches.scrollTop = previouslyRendered ? previousScrollTop : 0;
    });

    const autoUnlocked = hasSkill(progress, 'auto_regulation');
    this.autoRegulationButton.disabled = !autoUnlocked;
    this.autoRegulationButton.setAttribute('aria-pressed', String(progress.autoRegulation));
    this.autoRegulationButton.textContent = !autoUnlocked
      ? 'INTELLIGENCE · TALENT REQUIS'
      : progress.autoRegulation
        ? 'INTELLIGENCE · AUTO-RÉGULATION ACTIVE'
        : 'INTELLIGENCE · ACTIVER L’AUTO-RÉGULATION';

    const industryUnlocked = hasSkill(progress, 'endless_engine');
    this.industrySurgeButton.disabled = !industryUnlocked;
    this.industrySurgeButton.setAttribute('aria-pressed', String(progress.industrySurge));
    this.industrySurgeButton.textContent = !industryUnlocked
      ? 'TECHNIQUE · TALENT REQUIS'
      : progress.industrySurge
        ? 'TECHNIQUE · SURCHARGE ARMÉE'
        : 'TECHNIQUE · ACTIVER LA SURCHARGE';

    const explorationUnlocked = hasSkill(progress, 'ocean_legacy');
    this.explorationFlowButton.disabled = !explorationUnlocked;
    this.explorationFlowButton.setAttribute('aria-pressed', String(progress.explorationFlow));
    this.explorationFlowButton.textContent = !explorationUnlocked
      ? 'EXPLORATION · TALENT REQUIS'
      : progress.explorationFlow
        ? 'EXPLORATION · COURANT ARMÉ'
        : 'EXPLORATION · ACTIVER LE COURANT';

    this.powerMessagesButton.setAttribute('aria-pressed', String(progress.powerNotifications));
    this.powerMessagesButton.textContent = progress.powerNotifications
      ? 'MESSAGES AUTOMATIQUES · OUI'
      : 'MESSAGES AUTOMATIQUES · NON';
    this.powerVfxButton.setAttribute('aria-pressed', String(progress.powerVfx));
    this.powerVfxButton.textContent = progress.powerVfx
      ? 'EFFETS PLEIN ÉCRAN · OUI'
      : 'EFFETS PLEIN ÉCRAN · NON';
    this.renderSkillInspector(progress);
  }

  private updateSkillSelection(progress: IslandProgress): void {
    this.skillBranches.querySelectorAll<HTMLButtonElement>('button[data-skill]').forEach((button) => {
      const selected = button.dataset.skill === this.selectedSkill;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this.renderSkillInspector(progress);
  }

  private selectSkill(skill: SkillId): void {
    this.selectedSkill = skill;
    if (!this.latestProgress) return;
    this.renderTalents(this.latestProgress);
    this.skillInspector.classList.remove('skill-inspector-pulse');
    window.requestAnimationFrame(() => this.skillInspector.classList.add('skill-inspector-pulse'));
  }

  private renderSkillInspector(progress: IslandProgress): void {
    const definition = SKILL_DEFINITIONS.find((skill) => skill.id === this.selectedSkill);
    if (!definition) return;
    const rank = getSkillRank(progress, definition.id);
    const maximum = definition.maxRank ?? 1;
    const maxed = rank >= maximum;
    const prerequisites = skillPrerequisitesMet(progress, definition);
    const price = getSkillCost(progress, definition);
    const affordable = progress.knowledge >= price;
    const branch = definition.branch === 'core'
      ? 'ORIGINE'
      : definition.branch === 'hybrid'
        ? 'CONVERGENCE'
        : SKILL_BRANCH_LABELS[definition.branch].name.toUpperCase();
    const requiredNames = (definition.requires ?? [])
      .filter((id) => !hasSkill(progress, id))
      .map((id) => SKILL_DEFINITIONS.find((skill) => skill.id === id)?.name)
      .filter(Boolean);

    this.skillInspector.dataset.branch = definition.branch;
    this.skillInspectorIcon.textContent = definition.icon;
    this.skillInspectorBranch.textContent = `${branch} · PALIER ${definition.tier}`;
    this.skillInspectorName.textContent = definition.name;
    this.skillInspectorDetail.textContent = definition.detail;
    this.skillInspectorStatus.textContent = maxed
      ? definition.maxRank ? `RANG MAXIMUM ${rank}/${maximum}` : 'SAVOIR ACQUIS'
      : !prerequisites
        ? `REQUIS · ${requiredNames.join(' + ')}`
        : !affordable
          ? `IL MANQUE ${price - progress.knowledge} SAVOIR`
          : `PRÊT · COÛT ${price} SAVOIR`;
    this.skillBuyButton.disabled = maxed || !prerequisites || !affordable;
    this.skillBuyButton.textContent = maxed
      ? 'DÉJÀ ACQUIS'
      : !prerequisites
        ? 'PRÉREQUIS NON ACQUIS'
        : !affordable
          ? `${price} SAVOIR REQUIS`
          : `CONFIRMER · ${definition.maxRank ? `RANG ${rank + 1}` : 'ACHETER'} · ${price} SAVOIR`;
    this.skillBuyButton.setAttribute('aria-label', this.skillBuyButton.disabled
      ? this.skillInspectorStatus.textContent ?? ''
      : `Confirmer l’achat de ${definition.name} pour ${price} Savoir`);
  }

  private setSkillZoom(value: number, anchorClientX?: number, anchorClientY?: number): void {
    const next = Math.min(1.35, Math.max(0.18, value));
    const previous = this.skillZoom;
    if (Math.abs(next - previous) < 0.001) return;
    const rect = this.skillBranches.getBoundingClientRect();
    const anchorX = anchorClientX === undefined ? this.skillBranches.clientWidth / 2 : anchorClientX - rect.left;
    const anchorY = anchorClientY === undefined ? this.skillBranches.clientHeight / 2 : anchorClientY - rect.top;
    const contentX = (this.skillBranches.scrollLeft + anchorX) / previous;
    const contentY = (this.skillBranches.scrollTop + anchorY) / previous;
    this.skillZoom = next;
    const stage = this.skillBranches.querySelector<HTMLElement>('.skill-map-stage');
    const canvas = this.skillBranches.querySelector<HTMLElement>('.skill-map-canvas');
    if (stage && canvas) {
      stage.style.width = `${SKILL_MAP_WIDTH * next}px`;
      stage.style.height = `${SKILL_MAP_HEIGHT * next}px`;
      canvas.style.transform = `scale(${next})`;
      window.cancelAnimationFrame(this.skillZoomFrame);
      this.skillZoomFrame = window.requestAnimationFrame(() => {
        this.skillZoomFrame = 0;
        if (this.talentPanel.hidden || !stage.isConnected || !canvas.isConnected) return;
        this.skillBranches.scrollLeft = Math.max(0, contentX * next - anchorX);
        this.skillBranches.scrollTop = Math.max(0, contentY * next - anchorY);
      });
    }
  }

  private beginSkillPointer(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target;
    if (
      this.skillPointers.size === 0
      && target instanceof Element
      && target.closest('button[data-skill]')
    ) {
      return;
    }
    event.preventDefault();
    try {
      this.skillBranches.setPointerCapture(event.pointerId);
    } catch {
      // Le pointeur peut avoir disparu entre pointerdown et la capture sur iOS.
    }
    this.skillPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.rebaseSkillGesture();
  }

  private moveSkillPointer(event: PointerEvent): void {
    if (!this.skillPointers.has(event.pointerId) || !this.skillGesture) return;
    this.skillPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...this.skillPointers.values()];
    if (this.skillGesture.type === 'pinch' && pointers.length >= 2) {
      event.preventDefault();
      const [first, second] = pointers;
      if (!first || !second) return;
      const distance = Math.max(8, Math.hypot(second.x - first.x, second.y - first.y));
      const midpointX = (first.x + second.x) / 2;
      const midpointY = (first.y + second.y) / 2;
      if (Math.abs(distance - this.skillGesture.distance) > 2) this.skillSuppressClick = true;
      this.setSkillZoom(
        this.skillGesture.zoom * distance / this.skillGesture.distance,
        midpointX,
        midpointY,
      );
      return;
    }
    if (this.skillGesture.type === 'pan' && pointers.length === 1) {
      event.preventDefault();
      const pointer = pointers[0]!;
      const dx = pointer.x - this.skillGesture.x;
      const dy = pointer.y - this.skillGesture.y;
      if (Math.hypot(dx, dy) > 5) this.skillSuppressClick = true;
      this.skillBranches.scrollLeft = this.skillGesture.scrollLeft - dx;
      this.skillBranches.scrollTop = this.skillGesture.scrollTop - dy;
    }
  }

  private endSkillPointer(event: PointerEvent): void {
    if (!this.skillPointers.has(event.pointerId)) return;
    this.skillPointers.delete(event.pointerId);
    try {
      if (this.skillBranches.hasPointerCapture(event.pointerId)) {
        this.skillBranches.releasePointerCapture(event.pointerId);
      }
    } catch {
      // lostpointercapture signifie que le navigateur l'a déjà relâché.
    }
    this.rebaseSkillGesture();
    if (this.skillSuppressClick) window.setTimeout(() => { this.skillSuppressClick = false; }, 0);
    if (this.skillPointers.size === 0 && !this.talentPanel.hidden && this.latestProgress) {
      this.renderTalents(this.latestProgress);
    }
  }

  private resetSkillGesture(): void {
    const pointerIds = [...this.skillPointers.keys()];
    this.skillPointers.clear();
    this.skillGesture = null;
    this.skillSuppressClick = false;
    window.cancelAnimationFrame(this.skillZoomFrame);
    this.skillZoomFrame = 0;
    pointerIds.forEach((pointerId) => {
      try {
        if (this.skillBranches.hasPointerCapture(pointerId)) {
          this.skillBranches.releasePointerCapture(pointerId);
        }
      } catch {
        // Le navigateur peut avoir libéré toutes les captures lors d'un blur.
      }
    });
  }

  private rebaseSkillGesture(): void {
    const pointers = [...this.skillPointers.values()];
    if (pointers.length >= 2) {
      const [first, second] = pointers;
      if (!first || !second) return;
      this.skillGesture = {
        type: 'pinch',
        distance: Math.max(8, Math.hypot(second.x - first.x, second.y - first.y)),
        zoom: this.skillZoom,
        midpointX: (first.x + second.x) / 2,
        midpointY: (first.y + second.y) / 2,
        scrollLeft: this.skillBranches.scrollLeft,
        scrollTop: this.skillBranches.scrollTop,
      };
    } else if (pointers[0]) {
      this.skillGesture = {
        type: 'pan',
        x: pointers[0].x,
        y: pointers[0].y,
        scrollLeft: this.skillBranches.scrollLeft,
        scrollTop: this.skillBranches.scrollTop,
      };
    } else this.skillGesture = null;
  }

  updateIslandGoal(islandIndex: number): IslandGoal | null {
    if (!this.latestProgress) return null;
    const goal = getIslandGoal(this.latestProgress, islandIndex);
    const passageAlreadyCompleted = islandIndex < 4
      ? Boolean(this.latestProgress.bridgesBuilt[islandIndex])
      : this.latestProgress.completed;
    if (passageAlreadyCompleted) {
      this.islandGoal.hidden = true;
      this.lastGoalKey = '';
      this.lastGoalIsland = -1;
      return goal;
    }
    if (islandIndex !== this.lastGoalIsland) {
      this.lastGoalIsland = islandIndex;
      this.islandGoalExpanded = false;
      this.islandGoal.classList.remove('expanded');
      this.islandGoalToggle.setAttribute('aria-expanded', 'false');
    }
    const key = JSON.stringify([
      islandIndex,
      goal.completed,
      ...goal.items.map((item) => item.done),
      ...goal.items.map((item) => item.label),
    ]);
    this.islandGoal.hidden = false;
    if (key === this.lastGoalKey) return goal;
    this.lastGoalKey = key;
    const island = ISLANDS[islandIndex];
    const done = goal.items.filter((item) => item.done).length;
    const next = goal.items.find((item) => !item.done);
    this.islandGoal.classList.toggle('completed', goal.completed);
    if (goal.completed) {
      this.islandGoalExpanded = false;
      this.islandGoal.classList.remove('expanded');
    }
    this.islandGoalToggle.disabled = goal.completed;
    this.islandGoalToggle.setAttribute('aria-expanded', String(this.islandGoalExpanded));
    this.islandGoalToggle.setAttribute(
      'aria-label',
      goal.completed
        ? 'Toutes les étapes sont validées'
        : `${this.islandGoalExpanded ? 'Réduire' : 'Afficher'} toutes les étapes de cette île`,
    );
    this.islandGoalIsland.textContent = island?.name.toUpperCase() ?? 'ARCHIPEL';
    this.islandGoalTitle.textContent = goal.completed ? 'ÎLE PRÊTE · PASSAGE OUVERT' : goal.title;
    this.islandGoalCount.textContent = `${done}/${goal.items.length}`;
    this.islandGoalNextLabel.textContent = goal.completed
      ? 'Tous les objectifs sont validés · suis les flèches vers le pont.'
      : next?.label ?? 'Explore l’île pour révéler la suite.';
    this.islandGoalList.replaceChildren();
    goal.items.forEach((item) => {
      const row = element('li', item.done ? 'done' : '');
      const icon = element('span');
      icon.textContent = item.done ? '✓' : '○';
      icon.setAttribute('aria-hidden', 'true');
      const label = element('span');
      label.textContent = item.label;
      const status = element('small');
      status.textContent = item.done ? 'VALIDÉ' : 'À FAIRE';
      row.append(icon, label, status);
      this.islandGoalList.append(row);
    });
    return goal;
  }

  updateWorldTwoGoal(terraceIndex: number, peakReached: boolean): void {
    const progress = this.latestProgress;
    if (!progress) return;
    const currentIndex = Math.max(0, Math.min(WORLD_TWO_TERRACES.length - 1, terraceIndex));
    const current = WORLD_TWO_TERRACES[currentIndex]!;
    const next = WORLD_TWO_TERRACES[currentIndex + 1];
    const goalIdentity = 100 + currentIndex;
    if (goalIdentity !== this.lastGoalIsland) {
      this.lastGoalIsland = goalIdentity;
      this.islandGoalExpanded = false;
      this.islandGoal.classList.remove('expanded');
      this.islandGoalToggle.setAttribute('aria-expanded', 'false');
    }

    const milestones = [
      {
        label: 'Franchir la Faille du Zénith',
        done: true,
      },
      {
        label: 'Explorer librement les onze terrasses',
        done: true,
      },
      {
        label: `Ériger les chantiers de montagne · ${progress.worldTwoBuildings.length}/${WORLD_TWO_BUILDINGS.length}`,
        done: progress.worldTwoBuildings.length >= WORLD_TWO_BUILDINGS.length,
      },
      {
        label: `Maîtriser les deux lignées de crocs · ${Math.min(30, progress.worldTwoFangLevel) + Math.min(30, progress.worldTwoWolfFangLevel)}/60`,
        done: progress.worldTwoFangLevel >= 30 && progress.worldTwoWolfFangLevel >= 30,
      },
      {
        label: `Former la meute finale · ${progress.worldTwoWolves.length}/4 loups`,
        done: progress.worldTwoWolves.length >= 4,
      },
      {
        label: `Repousser les créatures · ${progress.worldTwoEnemyDefeats}/15`,
        done: progress.worldTwoEnemyDefeats >= 15,
      },
      {
        label: `Maîtriser les Savoirs du Zénith · ${progress.worldTwoSkills.length}/${WORLD_TWO_SKILLS.length}`,
        done: progress.worldTwoSkills.length >= WORLD_TWO_SKILLS.length,
      },
      {
        label: 'Éveiller le Cœur du Zénith',
        done: peakReached,
      },
    ];
    const key = JSON.stringify([
      'world-2',
      currentIndex,
      peakReached,
      progress.worldTwoFangLevel,
      progress.worldTwoWolfFangLevel,
      progress.worldTwoMoney,
      progress.worldTwoWolves.length,
      progress.worldTwoEnemyDefeats,
      progress.worldTwoSkills.length,
      progress.worldTwoBuildings.length,
      ...milestones.map((item) => item.done),
    ]);
    this.islandGoal.hidden = false;
    if (key === this.lastGoalKey) return;
    this.lastGoalKey = key;

    this.islandGoal.classList.toggle('completed', peakReached);
    this.islandGoalToggle.disabled = false;
    this.islandGoalToggle.setAttribute('aria-expanded', String(this.islandGoalExpanded));
    this.islandGoalToggle.setAttribute(
      'aria-label',
      `${this.islandGoalExpanded ? 'Réduire' : 'Afficher'} les étapes de l’ascension`,
    );
    this.islandGoalIsland.textContent = `WORLD 2 · ${current.name.toUpperCase()}`;
    this.islandGoalTitle.textContent = peakReached ? 'SOMMET ÉVEILLÉ · ASCENSION ACCOMPLIE' : 'ASCENSION DU ZÉNITH';
    this.islandGoalCount.textContent = `${currentIndex + 1}/${WORLD_TWO_TERRACES.length}`;
    this.islandGoalNextLabel.textContent = peakReached
      ? 'Le sommet est éveillé · les minerais du World 2 restent accessibles.'
      : next
        ? `Prochaine terrasse · ${next.name} · les filons noirs attendent de meilleurs crocs`
        : 'Construis le Cœur du Zénith pour achever réellement la campagne.';
    this.islandGoalList.replaceChildren();
    milestones.forEach((item) => {
      const row = element('li', item.done ? 'done' : '');
      const icon = element('span');
      icon.textContent = item.done ? '✓' : '○';
      icon.setAttribute('aria-hidden', 'true');
      const label = element('span');
      label.textContent = item.label;
      const status = element('small');
      status.textContent = item.done ? 'VALIDÉ' : 'À FAIRE';
      row.append(icon, label, status);
      this.islandGoalList.append(row);
    });
  }

  setContext(title: string, actionLabel = 'RÉCOLTER', icon = '⌁', affordable = true, detail = ''): void {
    this.contextTitle.textContent = title;
    this.contextDetail.textContent = detail;
    this.contextDetail.hidden = !detail;
    this.contextPrompt.classList.toggle('visible', Boolean(title));
    this.actionLabel.textContent = actionLabel;
    this.actionIcon.textContent = icon;
    this.actionButton.classList.toggle('disabled', !affordable);
    this.actionButton.setAttribute('aria-label', `${actionLabel.toLowerCase()} — ${title}${detail ? `. ${detail}` : ''}`);
  }

  clearContext(): void {
    this.contextPrompt.classList.remove('visible');
    this.contextDetail.hidden = true;
    this.actionLabel.textContent = 'EXPLORER';
    this.actionIcon.textContent = '⌁';
    this.actionButton.classList.remove('disabled');
  }

  toast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.classList.add('show');
    this.toastTimer = window.setTimeout(() => this.toastElement.classList.remove('show'), 2100);
  }

  showVictory(progress: IslandProgress): void {
    this.hideCrew();
    this.hideProjects();
    this.hideTalents();
    this.hideWorldTwoSkills();
    this.hideMenu();
    this.victoryWorkers.textContent = String(progress.workers.length);
    const total = Math.floor(progress.elapsedSeconds);
    this.victoryTime.textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    this.victoryKnowledge.textContent = String(progress.knowledge);
    this.victoryTide.textContent = String(progress.rebirths + 1);
    this.rebirthReward.textContent = `Nouvelle Marée : +${getRebirthReward(progress)} Savoir · talents conservés · exigences ×${(1 + Math.min(8, progress.rebirths + 1) * 0.22).toFixed(2)}`;
    this.victoryScreen.hidden = false;
  }

  hideVictory(): void {
    this.victoryScreen.hidden = true;
  }

  showFatal(): void {
    this.loadingScreen.hidden = true;
    this.startScreen.hidden = true;
    this.fatalError.hidden = false;
  }
}
