import {
  RESOURCE_ICONS,
  RESOURCE_KINDS,
  RESOURCE_LABELS,
  SKILL_BRANCH_LABELS,
  SKILL_DEFINITIONS,
  formatCost,
  getCycleMultiplier,
  getObjective,
  getPriorityShortage,
  getRecruitCost,
  getRebirthReward,
  getSkillCost,
  getSkillRank,
  getUnlockedWorkerTasks,
  getUpgradeCost,
  getWorkerCapacity,
  getWorkerLevelCap,
  getWorkerYield,
  hasSkill,
  isSkillVisible,
  skillPrerequisitesMet,
  type IslandProgress,
  type ResourceKind,
  type SkillBranch,
  type SkillId,
} from '../game/economy';

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
  private readonly workerList = byId<HTMLElement>('worker-list');
  private readonly recruitButton = byId<HTMLButtonElement>('recruit-button');
  private readonly recruitCost = byId<HTMLElement>('recruit-cost');
  private readonly talentButton = byId<HTMLButtonElement>('talent-button');
  private readonly talentButtonCount = byId<HTMLElement>('talent-button-count');
  private readonly talentPanel = byId<HTMLElement>('talent-panel');
  private readonly talentCloseButton = byId<HTMLButtonElement>('talent-close-button');
  private readonly talentKnowledge = byId<HTMLElement>('talent-knowledge');
  private readonly tideCount = byId<HTMLElement>('tide-count');
  private readonly forecastText = byId<HTMLElement>('forecast-text');
  private readonly skillBranches = byId<HTMLElement>('skill-branches');
  private readonly autoRegulationButton = byId<HTMLButtonElement>('auto-regulation-button');
  private toastTimer = 0;
  private installPrompt: InstallPrompt | null = null;
  private crewHandlers: CrewHandlers | null = null;
  private talentHandlers: TalentHandlers | null = null;
  private latestProgress: IslandProgress | null = null;
  private selectedSkill: SkillId | null = null;

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
      if (target.dataset.action === 'upgrade') this.crewHandlers?.onUpgrade(workerId);
      if (target.dataset.action === 'assign' && target.dataset.task) {
        this.crewHandlers?.onAssign(workerId, target.dataset.task as ResourceKind);
      }
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
    this.autoRegulationButton.addEventListener('click', () => {
      if (!this.latestProgress) return;
      this.talentHandlers?.onAutoToggle(!this.latestProgress.autoRegulation);
    });
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') return;
      if (!this.crewPanel.hidden) this.hideCrew();
      else if (!this.talentPanel.hidden) this.hideTalents();
    });
  }

  bindCrewHandlers(handlers: CrewHandlers): void {
    this.crewHandlers = handlers;
  }

  bindTalentHandlers(handlers: TalentHandlers): void {
    this.talentHandlers = handlers;
  }

  get isCrewOpen(): boolean {
    return !this.crewPanel.hidden;
  }

  get isTalentOpen(): boolean {
    return !this.talentPanel.hidden;
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
    this.talentButtonCount.textContent = String(progress.knowledge);
    this.talentButton.setAttribute('aria-label', `Ouvrir l’arbre de talents, ${progress.knowledge} points de Savoir disponibles`);
    if (!this.crewPanel.hidden) this.renderCrew(progress);
    if (!this.talentPanel.hidden) this.renderTalents(progress);
  }

  private renderCrew(progress: IslandProgress): void {
    const capacity = getWorkerCapacity(progress);
    const levelCap = getWorkerLevelCap(progress);
    const unlockedTasks = getUnlockedWorkerTasks(progress);
    this.crewCapacity.textContent = `${progress.workers.length} / ${capacity} postes · niveau max ${levelCap}`;
    this.crewHelp.textContent = progress.autoRegulation
      ? `Auto-régulation active · priorité actuelle : ${RESOURCE_LABELS[getPriorityShortage(progress)]}.`
      : progress.observatoryBuilt
      ? 'Tous les métiers sont ouverts : adapte l’équipe à ton prochain coût.'
      : progress.foundryBuilt
        ? 'Le cuivre est ouvert. L’observatoire débloquera le cristal.'
        : progress.workshopBuilt
          ? 'Améliore les renards ou rééquilibre bois et pierre avant le cuivre.'
          : 'Assigne au moins un bûcheron et un mineur pour ouvrir le premier pont.';

    const recruitCost = getRecruitCost(progress);
    this.recruitCost.textContent = progress.workers.length >= capacity ? 'CAPACITÉ ATTEINTE' : formatCost(recruitCost);
    this.recruitButton.disabled = progress.workers.length >= capacity || !canAfford(progress, recruitCost);

    this.workerList.replaceChildren();
    if (progress.workers.length === 0) {
      const empty = element('div', 'crew-empty');
      empty.innerHTML = '<span aria-hidden="true">♟</span><strong>Aucun travailleur</strong><small>Récolte le coût indiqué puis recrute ton premier renard.</small>';
      this.workerList.append(empty);
      return;
    }

    progress.workers.forEach((worker) => {
      const card = element('article', `worker-card task-${worker.task}`);
      const heading = element('header', 'worker-card-header');
      const avatar = element('span', 'worker-avatar');
      avatar.textContent = RESOURCE_ICONS[worker.task];
      avatar.setAttribute('aria-hidden', 'true');
      const identity = element('div', 'worker-identity');
      const name = element('strong');
      name.textContent = worker.name;
      const level = element('small');
      level.textContent = `Niveau ${worker.level} · +${getWorkerYield(worker.level, progress)} par livraison · trajet réel`;
      identity.append(name, level);
      heading.append(avatar, identity);

      const assignmentLabel = element('span', 'worker-section-label');
      assignmentLabel.textContent = 'AFFECTATION';
      const assignments = element('div', 'assignment-grid');
      RESOURCE_KINDS.forEach((task) => {
        const button = element('button', 'assignment-button');
        button.type = 'button';
        button.dataset.action = 'assign';
        button.dataset.workerId = worker.id;
        button.dataset.task = task;
        button.disabled = !unlockedTasks.includes(task);
        button.setAttribute('aria-pressed', String(worker.task === task));
        button.setAttribute('aria-label', `Assigner ${worker.name} ${ASSIGNMENT_LABELS[task]}`);
        button.innerHTML = `<span aria-hidden="true">${RESOURCE_ICONS[task]}</span><small>${RESOURCE_LABELS[task]}</small>`;
        assignments.append(button);
      });

      const upgrade = element('button', 'upgrade-button');
      upgrade.type = 'button';
      upgrade.dataset.action = 'upgrade';
      upgrade.dataset.workerId = worker.id;
      if (worker.level >= 3) {
        upgrade.textContent = 'NIVEAU MAXIMUM';
        upgrade.disabled = true;
      } else if (worker.level >= levelCap) {
        upgrade.textContent = levelCap === 1 ? 'ATELIER REQUIS POUR AMÉLIORER' : 'FONDERIE REQUISE POUR LE NIVEAU 3';
        upgrade.disabled = true;
      } else {
        const upgradeCost = getUpgradeCost(worker, progress);
        upgrade.textContent = `AMÉLIORER NIVEAU ${worker.level + 1} · ${formatCost(upgradeCost)}`;
        upgrade.disabled = !canAfford(progress, upgradeCost);
      }

      card.append(heading, assignmentLabel, assignments, upgrade);
      this.workerList.append(card);
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
    const canvas = element('div', 'skill-map-canvas');
    canvas.setAttribute('role', 'group');
    canvas.setAttribute('aria-label', 'Constellation des savoirs');

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
      const button = element('button', `skill-hex branch-${skill.branch}${unlocked ? ' unlocked' : ''}${available ? ' available' : ''}${locked ? ' locked' : ''}${skill.maxRank ? ' repeatable' : ''}`);
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
    this.skillBranches.append(canvas);
    window.requestAnimationFrame(() => {
      this.skillBranches.scrollLeft = previouslyRendered
        ? previousScrollLeft
        : Math.max(0, 580 - this.skillBranches.clientWidth / 2);
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
