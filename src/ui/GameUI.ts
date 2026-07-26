import {
  RESOURCE_ICONS,
  RESOURCE_KINDS,
  RESOURCE_LABELS,
  ISLAND_PROJECTS,
  SKILL_BRANCH_LABELS,
  SKILL_DEFINITIONS,
  formatCost,
  getCompletedProjectCount,
  getCycleMultiplier,
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
  getWorkerLevelCap,
  getWorkerYield,
  hasProject,
  hasSkill,
  isProjectVisible,
  isSkillVisible,
  projectPrerequisitesMet,
  skillPrerequisitesMet,
  type IslandProgress,
  type ProjectId,
  type ResourceKind,
  type SkillBranch,
  type SkillId,
} from '../game/economy';
import { ISLANDS, RESOURCE_SPAWN_PROFILES } from '../game/world';

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
}

interface ProjectHandlers {
  onOpenChange: (open: boolean) => void;
  onBuild: (project: ProjectId) => void;
}

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
  readonly rebirthButton = byId<HTMLButtonElement>('rebirth-button');
  readonly joystick = byId<HTMLElement>('joystick');
  readonly joystickKnob = byId<HTMLElement>('joystick-knob');
  readonly actionButton = byId<HTMLButtonElement>('action-button');
  readonly actionLabel = byId<HTMLElement>('action-label');
  readonly actionIcon = byId<HTMLElement>('action-icon');
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
  private readonly objectiveEyebrow = byId<HTMLElement>('objective-eyebrow');
  private readonly objectiveTitle = byId<HTMLElement>('objective-title');
  private readonly objectiveDetail = byId<HTMLElement>('objective-detail');
  private readonly contextPrompt = byId<HTMLElement>('context-prompt');
  private readonly toastElement = byId<HTMLElement>('toast');
  private readonly fatalError = byId<HTMLElement>('fatal-error');
  private readonly installButton = byId<HTMLButtonElement>('install-button');
  private readonly crewButton = byId<HTMLButtonElement>('crew-button');
  private readonly crewButtonCount = byId<HTMLElement>('crew-button-count');
  private readonly crewPanel = byId<HTMLElement>('crew-panel');
  private readonly crewCloseButton = byId<HTMLButtonElement>('crew-close-button');
  private readonly crewCapacity = byId<HTMLElement>('crew-capacity');
  private readonly crewHelp = byId<HTMLElement>('crew-help');
  private readonly jobDocks = byId<HTMLElement>('job-docks');
  private readonly workerList = byId<HTMLElement>('worker-list');
  private readonly workerDetail = byId<HTMLElement>('worker-detail');
  private readonly recruitButton = byId<HTMLButtonElement>('recruit-button');
  private readonly recruitCost = byId<HTMLElement>('recruit-cost');
  private readonly projectsButton = byId<HTMLButtonElement>('projects-button');
  private readonly projectsButtonCount = byId<HTMLElement>('projects-button-count');
  private readonly projectsPanel = byId<HTMLElement>('projects-panel');
  private readonly projectsCloseButton = byId<HTMLButtonElement>('projects-close-button');
  private readonly projectsProgress = byId<HTMLElement>('projects-progress');
  private readonly projectsHelp = byId<HTMLElement>('projects-help');
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
  private readonly skillZoomOut = byId<HTMLButtonElement>('skill-zoom-out');
  private readonly skillZoomIn = byId<HTMLButtonElement>('skill-zoom-in');
  private readonly skillZoomFit = byId<HTMLButtonElement>('skill-zoom-fit');
  private readonly skillZoomRange = byId<HTMLInputElement>('skill-zoom-range');
  private readonly skillZoomValue = byId<HTMLOutputElement>('skill-zoom-value');
  private readonly autoRegulationButton = byId<HTMLButtonElement>('auto-regulation-button');
  private toastTimer = 0;
  private installPrompt: InstallPrompt | null = null;
  private crewHandlers: CrewHandlers | null = null;
  private talentHandlers: TalentHandlers | null = null;
  private projectHandlers: ProjectHandlers | null = null;
  private latestProgress: IslandProgress | null = null;
  private selectedSkill: SkillId | null = null;
  private selectedWorkerId: string | null = null;
  private newRecruitWorkerId: string | null = null;
  private levelUpWorker: { id: string; level: number } | null = null;
  private recruitAnimationTimer = 0;
  private levelUpAnimationTimer = 0;
  private skillZoom = 0.7;

  constructor() {
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

    this.crewButton.addEventListener('click', () => this.showCrew());
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
    this.projectsButton.addEventListener('click', () => this.showProjects());
    this.projectsCloseButton.addEventListener('click', () => this.hideProjects());
    this.projectsPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.projectsPanel) this.hideProjects();
    });
    this.projectTiers.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-project]') : null;
      if (!target?.dataset.project || target.disabled) return;
      this.projectHandlers?.onBuild(target.dataset.project as ProjectId);
    });
    this.talentButton.addEventListener('click', () => this.showTalents());
    this.talentCloseButton.addEventListener('click', () => this.hideTalents());
    this.talentPanel.addEventListener('pointerdown', (event) => {
      if (event.target === this.talentPanel) this.hideTalents();
    });
    this.skillBranches.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-skill]') : null;
      if (!target?.dataset.skill) return;
      this.selectedSkill = target.dataset.skill as SkillId;
      const definition = SKILL_DEFINITIONS.find((skill) => skill.id === this.selectedSkill);
      if (definition) this.forecastText.textContent = `${definition.name} · ${definition.detail}`;
      if (target.dataset.unlockable !== 'true') return;
      this.talentHandlers?.onUnlock(this.selectedSkill);
    });
    this.skillZoomOut.addEventListener('click', () => this.setSkillZoom(this.skillZoom - 0.1));
    this.skillZoomIn.addEventListener('click', () => this.setSkillZoom(this.skillZoom + 0.1));
    this.skillZoomFit.addEventListener('click', () => this.fitSkillTree());
    this.skillZoomRange.addEventListener('input', () => this.setSkillZoom(Number(this.skillZoomRange.value) / 100));
    this.skillBranches.addEventListener('wheel', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      this.setSkillZoom(this.skillZoom + (event.deltaY < 0 ? 0.08 : -0.08));
    }, { passive: false });
    this.autoRegulationButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onAutoToggle(!this.latestProgress.autoRegulation);
    });
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') return;
      if (!this.crewPanel.hidden) this.hideCrew();
      else if (!this.projectsPanel.hidden) this.hideProjects();
      else if (!this.talentPanel.hidden) this.hideTalents();
    });
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

  celebrateRecruit(workerId: string): void {
    this.selectedWorkerId = workerId;
    this.newRecruitWorkerId = workerId;
    window.clearTimeout(this.recruitAnimationTimer);
    if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
    this.recruitAnimationTimer = window.setTimeout(() => {
      this.newRecruitWorkerId = null;
      if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
    }, 1450);
  }

  celebrateLevelUp(workerId: string, level: number): void {
    this.selectedWorkerId = workerId;
    this.levelUpWorker = { id: workerId, level };
    window.clearTimeout(this.levelUpAnimationTimer);
    if (this.latestProgress && !this.crewPanel.hidden) this.renderCrew(this.latestProgress);
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

  get isProjectsOpen(): boolean {
    return !this.projectsPanel.hidden;
  }

  showCrew(): void {
    if (!this.latestProgress?.campBuilt) return;
    this.crewPanel.hidden = false;
    this.renderCrew(this.latestProgress);
    this.crewHandlers?.onOpenChange(true);
    window.setTimeout(() => this.crewCloseButton.focus(), 0);
  }

  hideCrew(): void {
    if (this.crewPanel.hidden) return;
    this.crewPanel.hidden = true;
    this.crewHandlers?.onOpenChange(false);
    this.crewButton.focus({ preventScroll: true });
  }

  showProjects(): void {
    if (!this.latestProgress?.workshopBuilt) return;
    this.projectsPanel.hidden = false;
    this.renderProjects(this.latestProgress);
    this.projectHandlers?.onOpenChange(true);
    window.setTimeout(() => this.projectsCloseButton.focus(), 0);
  }

  hideProjects(): void {
    if (this.projectsPanel.hidden) return;
    this.projectsPanel.hidden = true;
    this.projectHandlers?.onOpenChange(false);
    this.projectsButton.focus({ preventScroll: true });
  }

  showTalents(): void {
    if (!this.latestProgress) return;
    this.talentPanel.hidden = false;
    this.renderTalents(this.latestProgress);
    this.talentHandlers?.onOpenChange(true);
    window.setTimeout(() => this.talentCloseButton.focus(), 0);
  }

  hideTalents(): void {
    if (this.talentPanel.hidden) return;
    this.talentPanel.hidden = true;
    this.talentHandlers?.onOpenChange(false);
    this.talentButton.focus({ preventScroll: true });
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
    RESOURCE_KINDS.forEach((kind) => { this.resourceCounts[kind].textContent = String(progress[kind]); });

    const objective = getObjective(progress);
    this.objectiveEyebrow.textContent = objective.eyebrow;
    this.objectiveTitle.textContent = objective.title;
    this.objectiveDetail.textContent = objective.detail;

    const capacity = getWorkerCapacity(progress);
    this.crewButton.hidden = !progress.campBuilt;
    this.crewButtonCount.textContent = `${progress.workers.length}/${capacity}`;
    this.crewButton.setAttribute('aria-label', `Gérer l’équipe, ${progress.workers.length} travailleurs sur ${capacity}`);
    const completedProjects = getCompletedProjectCount(progress);
    this.projectsButton.hidden = !progress.workshopBuilt;
    this.projectsButtonCount.textContent = `${completedProjects}/${ISLAND_PROJECTS.length}`;
    this.projectsButton.setAttribute('aria-label', `Ouvrir les Grands Travaux, ${completedProjects} sur ${ISLAND_PROJECTS.length} achevés`);
    this.talentButtonCount.textContent = String(progress.knowledge);
    this.talentButton.setAttribute('aria-label', `Ouvrir l’arbre de talents, ${progress.knowledge} points de Savoir disponibles`);
    if (!this.crewPanel.hidden) this.renderCrew(progress);
    if (!this.projectsPanel.hidden) this.renderProjects(progress);
    if (!this.talentPanel.hidden) this.renderTalents(progress);
  }

  private renderCrew(progress: IslandProgress): void {
    const capacity = getWorkerCapacity(progress);
    const levelCap = getWorkerLevelCap(progress);
    const unlockedTasks = getUnlockedWorkerTasks(progress);
    let selectedWorker = progress.workers.find((worker) => worker.id === this.selectedWorkerId);
    if (!selectedWorker && progress.workers[0]) {
      this.selectedWorkerId = progress.workers[0].id;
      selectedWorker = progress.workers[0];
    } else if (this.selectedWorkerId && !selectedWorker) this.selectedWorkerId = null;
    this.crewCapacity.textContent = `${progress.workers.length} / ${capacity} terriers · niveau max ${levelCap}`;
    this.crewHelp.textContent = selectedWorker
      ? `${selectedWorker.name} sélectionné · touche un grand métier ci-dessous pour le déplacer.`
      : progress.autoRegulation
        ? `Auto-régulation active · priorité actuelle : ${RESOURCE_LABELS[getPriorityShortage(progress)]}.`
        : '1. Choisis une carte de renard · 2. Touche un métier.';

    const recruitCost = getRecruitCost(progress);
    this.recruitCost.textContent = progress.workers.length >= capacity ? 'CAPACITÉ ATTEINTE' : formatCost(recruitCost);
    this.recruitButton.disabled = progress.workers.length >= capacity || !canAfford(progress, recruitCost);

    const accessibleIslandCount = Math.min(ISLANDS.length, progress.bridgesBuilt.filter(Boolean).length + 1);
    this.jobDocks.replaceChildren();
    RESOURCE_KINDS.forEach((task) => {
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

    progress.workers.forEach((worker) => {
      const isSelected = worker.id === this.selectedWorkerId;
      const isNew = worker.id === this.newRecruitWorkerId;
      const isLeveling = worker.id === this.levelUpWorker?.id;
      const card = element('article', [
        'worker-card',
        `task-${worker.task}`,
        isSelected ? 'selected' : '',
        isNew ? 'new-recruit' : '',
        isLeveling ? 'leveling-up' : '',
      ].filter(Boolean).join(' '));
      const heading = element('button', 'worker-select');
      heading.type = 'button';
      heading.dataset.action = 'select';
      heading.dataset.workerId = worker.id;
      heading.setAttribute('aria-pressed', String(isSelected));
      heading.setAttribute('aria-label', `Sélectionner ${worker.name}, niveau ${worker.level}, métier ${RESOURCE_LABELS[worker.task]}`);
      const avatar = element('span', 'worker-avatar');
      avatar.textContent = '🦊';
      avatar.setAttribute('aria-hidden', 'true');
      const identity = element('div', 'worker-identity');
      const name = element('strong');
      name.textContent = worker.name;
      const level = element('small');
      level.textContent = `NIV ${worker.level} · +${getWorkerYield(worker.level, progress)}`;
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

      if (isNew) {
        const burst = element('span', 'worker-burst recruit-burst');
        burst.textContent = 'NOUVEAU !';
        burst.setAttribute('role', 'status');
        card.append(burst);
      }
      if (isLeveling) {
        const burst = element('span', 'worker-burst level-up-burst');
        burst.textContent = 'LEVEL UP !';
        burst.setAttribute('aria-label', `${worker.name} passe niveau ${this.levelUpWorker?.level ?? worker.level}`);
        burst.setAttribute('role', 'status');
        card.append(burst);
      }

      card.append(heading);
      this.workerList.append(card);
    });
    this.renderWorkerDetail(progress, selectedWorker ?? progress.workers[0]!, levelCap);
    window.requestAnimationFrame(() => { this.workerList.scrollTop = previousRosterScroll; });
  }

  private renderWorkerDetail(
    progress: IslandProgress,
    worker: IslandProgress['workers'][number],
    levelCap: ReturnType<typeof getWorkerLevelCap>,
  ): void {
    this.workerDetail.replaceChildren();
    this.workerDetail.className = `worker-detail task-${worker.task}${worker.id === this.levelUpWorker?.id ? ' leveling-up' : ''}`;
    this.workerDetail.setAttribute('aria-label', `Fiche de ${worker.name}, niveau ${worker.level}`);

    const hero = element('div', 'worker-detail-hero');
    const avatar = element('span', 'worker-detail-avatar');
    avatar.textContent = '🦊';
    avatar.setAttribute('aria-hidden', 'true');
    const identity = element('div');
    const name = element('strong');
    name.textContent = worker.name;
    const job = element('small');
    job.textContent = `${RESOURCE_ICONS[worker.task]} ${RESOURCE_LABELS[worker.task]} · +${getWorkerYield(worker.level, progress)} · ${
      hasSkill(progress, 'optimal_routes') ? 'routes calculées' : 'cible aléatoire'
    }`;
    identity.append(name, job);
    const level = element('b', 'worker-detail-level');
    level.textContent = `NIV ${worker.level} · ${'★'.repeat(worker.level)}${'☆'.repeat(3 - worker.level)}`;
    hero.append(avatar, identity, level);

    const upgrade = element('button', 'upgrade-button worker-detail-upgrade');
    upgrade.type = 'button';
    upgrade.dataset.action = 'upgrade';
    upgrade.dataset.workerId = worker.id;
    if (worker.level >= 3) {
      upgrade.textContent = 'NIVEAU 3 · MAXIMUM';
      upgrade.disabled = true;
    } else if (worker.level >= levelCap) {
      upgrade.textContent = levelCap === 1 ? 'ATELIER REQUIS POUR LE NIVEAU 2' : 'FONDERIE REQUISE POUR LE NIVEAU 3';
      upgrade.disabled = true;
    } else {
      const upgradeCost = getUpgradeCost(worker, progress);
      upgrade.textContent = `LEVEL UP · NIV ${worker.level + 1} · ${formatCost(upgradeCost)}`;
      upgrade.setAttribute('aria-label', `Améliorer ${worker.name} au niveau ${worker.level + 1}, coût ${formatCost(upgradeCost)}`);
      upgrade.disabled = !canAfford(progress, upgradeCost);
    }
    this.workerDetail.append(hero, upgrade);

    if (worker.id === this.levelUpWorker?.id) {
      const burst = element('span', 'worker-detail-burst');
      burst.textContent = `LEVEL UP · NIV ${this.levelUpWorker.level}`;
      burst.setAttribute('role', 'status');
      this.workerDetail.append(burst);
    }
  }

  private renderProjects(progress: IslandProgress): void {
    const completed = getCompletedProjectCount(progress);
    this.projectsProgress.textContent = `${completed} / ${ISLAND_PROJECTS.length} achevés · +${progress.cycleMilestones.filter((id) => id.startsWith('project:')).length} jalons`;
    this.projectsHelp.textContent = completed < 3
      ? 'Achève les 3 travaux des Pins pour ouvrir le pont Cuivré.'
      : completed < 6
        ? 'Les 3 travaux Cuivrés ouvriront la route des Cristaux.'
        : completed < 9
          ? 'Équipe l’île de Cristal avant de rejoindre la Couronne.'
          : completed < ISLAND_PROJECTS.length
            ? 'Les trois derniers travaux synchroniseront le Cœur.'
            : 'Réseau complet · les quatre ressources alimentent désormais tout l’archipel.';

    this.projectTiers.replaceChildren();
    const visibleProjects = ISLAND_PROJECTS.filter((definition) => isProjectVisible(progress, definition));
    if (!visibleProjects.length) {
      const empty = element('div', 'projects-empty');
      empty.innerHTML = '<span aria-hidden="true">⌂</span><strong>Aucun chantier révélé</strong><small>Fais émerger l’île suivante et construis son bâtiment.</small>';
      this.projectTiers.append(empty);
      return;
    }

    const visibleTiers = [...new Set(visibleProjects.map((definition) => definition.tier))];
    visibleTiers.forEach((tier) => {
      const tierProjects = visibleProjects.filter((definition) => definition.tier === tier);
      const island = ISLANDS[tierProjects[0]?.islandIndex ?? 0];
      const section = element('section', 'project-tier');
      const heading = element('header', 'project-tier-heading');
      const title = element('strong');
      title.textContent = island?.name ?? `Palier ${tier}`;
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
        footer.textContent = built ? 'ACHEVÉ' : `${formatCost(projectCost)} · +${definition.knowledge} Savoir`;
        button.append(icon, copy, footer);
        grid.append(button);
      });
      section.append(heading, grid);
      this.projectTiers.append(section);
    });
  }

  private renderTalents(progress: IslandProgress): void {
    const previousScrollLeft = this.skillBranches.scrollLeft;
    const previousScrollTop = this.skillBranches.scrollTop;
    const previouslyRendered = Boolean(this.skillBranches.querySelector('.skill-map-canvas'));
    this.talentKnowledge.textContent = `${progress.knowledge} Savoir disponible${progress.knowledge > 1 ? 's' : ''}`;
    this.tideCount.textContent = `Marée ${progress.rebirths + 1} · exigence ×${getCycleMultiplier(progress).toFixed(2)}`;
    const selectedDefinition = SKILL_DEFINITIONS.find((definition) => definition.id === this.selectedSkill);
    this.forecastText.textContent = selectedDefinition
      ? `${selectedDefinition.name} · ${selectedDefinition.detail}`
      : hasSkill(progress, 'forecasting')
        ? `Prévision : la prochaine pénurie sera le ${RESOURCE_LABELS[getPriorityShortage(progress)]}.`
        : 'Touchez un hexagone pour lire son effet · Prévisions révélera aussi le prochain manque.';
    this.skillBranches.replaceChildren();
    const visibleSkills = SKILL_DEFINITIONS.filter((definition) => isSkillVisible(progress, definition));
    this.talentKicker.textContent = `${visibleSkills.length}/${SKILL_DEFINITIONS.length} HEXAGONES DÉCOUVERTS · FUTUR MASQUÉ`;
    const stage = element('div', 'skill-map-stage');
    stage.style.width = `${1160 * this.skillZoom}px`;
    stage.style.height = `${1250 * this.skillZoom}px`;
    const canvas = element('div', 'skill-map-canvas');
    canvas.setAttribute('role', 'group');
    canvas.setAttribute('aria-label', 'Constellation des savoirs');
    canvas.style.transform = `scale(${this.skillZoom})`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('skill-links');
    svg.setAttribute('viewBox', '0 0 1160 1250');
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
      const button = element('button', `skill-hex branch-${skill.branch}${unlocked ? ' unlocked' : ''}${available ? ' available' : ''}${locked ? ' locked' : ''}${skill.maxRank ? ' repeatable' : ''}${skill.id === 'archipelago_consciousness' ? ' final-skill' : ''}`);
      button.type = 'button';
      button.dataset.skill = skill.id;
      button.dataset.rank = String(rank);
      button.dataset.unlockable = String(available);
      button.style.left = `${skill.x}px`;
      button.style.top = `${skill.y}px`;
      button.setAttribute('aria-disabled', String(locked));
      const rankCopy = skill.maxRank ? `, rang ${rank} sur ${maximum}` : '';
      button.setAttribute(
        'aria-label',
        maxed
          ? `${skill.name}${rankCopy}, acquis. ${skill.detail}`
          : `Débloquer ${skill.name}${skill.maxRank ? ` rang ${rank + 1}` : ''} pour ${priceValue} Savoir. ${skill.detail}`,
      );
      button.title = skill.detail;

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
    this.skillZoomRange.value = String(Math.round(this.skillZoom * 100));
    this.skillZoomValue.value = `${Math.round(this.skillZoom * 100)} %`;
    window.requestAnimationFrame(() => {
      this.skillBranches.scrollLeft = previouslyRendered
        ? previousScrollLeft
        : Math.max(0, 580 * this.skillZoom - this.skillBranches.clientWidth / 2);
      this.skillBranches.scrollTop = previouslyRendered ? previousScrollTop : 0;
    });

    const autoUnlocked = hasSkill(progress, 'auto_regulation');
    this.autoRegulationButton.disabled = !autoUnlocked;
    this.autoRegulationButton.setAttribute('aria-pressed', String(progress.autoRegulation));
    this.autoRegulationButton.textContent = !autoUnlocked
      ? 'AUTO-RÉGULATION · TALENT REQUIS'
      : progress.autoRegulation
        ? 'AUTO-RÉGULATION ACTIVE'
        : 'ACTIVER L’AUTO-RÉGULATION';
  }

  private setSkillZoom(value: number): void {
    const next = Math.min(1.3, Math.max(0.1, value));
    const previous = this.skillZoom;
    if (Math.abs(next - previous) < 0.001) return;
    const contentCenterX = (this.skillBranches.scrollLeft + this.skillBranches.clientWidth / 2) / previous;
    const contentCenterY = (this.skillBranches.scrollTop + this.skillBranches.clientHeight / 2) / previous;
    this.skillZoom = next;
    const stage = this.skillBranches.querySelector<HTMLElement>('.skill-map-stage');
    const canvas = this.skillBranches.querySelector<HTMLElement>('.skill-map-canvas');
    if (stage && canvas) {
      stage.style.width = `${1160 * next}px`;
      stage.style.height = `${1250 * next}px`;
      canvas.style.transform = `scale(${next})`;
      window.requestAnimationFrame(() => {
        this.skillBranches.scrollLeft = Math.max(0, contentCenterX * next - this.skillBranches.clientWidth / 2);
        this.skillBranches.scrollTop = Math.max(0, contentCenterY * next - this.skillBranches.clientHeight / 2);
      });
    }
    this.skillZoomRange.value = String(Math.round(next * 100));
    this.skillZoomValue.value = `${Math.round(next * 100)} %`;
  }

  private fitSkillTree(): void {
    const horizontal = (this.skillBranches.clientWidth - 10) / 1160;
    const vertical = (this.skillBranches.clientHeight - 10) / 1250;
    const fit = Math.floor(Math.min(horizontal, vertical) * 20) / 20;
    this.setSkillZoom(Math.max(0.1, fit));
    window.requestAnimationFrame(() => {
      this.skillBranches.scrollLeft = Math.max(0, (1160 * this.skillZoom - this.skillBranches.clientWidth) / 2);
      this.skillBranches.scrollTop = 0;
    });
  }

  setContext(text: string, actionLabel = 'RÉCOLTER', icon = '⌁', affordable = true): void {
    this.contextPrompt.textContent = text;
    this.contextPrompt.classList.toggle('visible', Boolean(text));
    this.actionLabel.textContent = actionLabel;
    this.actionIcon.textContent = icon;
    this.actionButton.classList.toggle('disabled', !affordable);
    this.actionButton.setAttribute('aria-label', `${actionLabel.toLowerCase()} — ${text}`);
  }

  clearContext(): void {
    this.contextPrompt.classList.remove('visible');
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
