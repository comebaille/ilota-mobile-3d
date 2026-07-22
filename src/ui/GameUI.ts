import { COSTS, formatCost, type IslandProgress } from '../game/economy';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément #${id} introuvable.`);
  return element as T;
};

export class GameUI {
  readonly startButton = byId<HTMLButtonElement>('start-button');
  readonly continueButton = byId<HTMLButtonElement>('continue-button');
  readonly resetButton = byId<HTMLButtonElement>('reset-button');
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
  private readonly woodCount = byId<HTMLElement>('wood-count');
  private readonly stoneCount = byId<HTMLElement>('stone-count');
  private readonly objectiveTitle = byId<HTMLElement>('objective-title');
  private readonly objectiveDetail = byId<HTMLElement>('objective-detail');
  private readonly contextPrompt = byId<HTMLElement>('context-prompt');
  private readonly toastElement = byId<HTMLElement>('toast');
  private readonly fatalError = byId<HTMLElement>('fatal-error');
  private readonly installButton = byId<HTMLButtonElement>('install-button');
  private toastTimer = 0;
  private installPrompt: InstallPrompt | null = null;

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
  }

  setLoading(progress: number, label: string): void {
    this.loadingBar.style.width = `${Math.max(4, progress * 100)}%`;
    this.loadingLabel.textContent = label === 'renards' ? 'Les bâtisseurs arrivent' : `Plantation : ${label}`;
  }

  finishLoading(): void {
    this.loadingBar.style.width = '100%';
    this.loadingLabel.textContent = 'Île prête';
    window.setTimeout(() => { this.loadingScreen.hidden = true; }, 240);
  }

  start(): void {
    this.startScreen.hidden = true;
  }

  update(progress: IslandProgress): void {
    this.woodCount.textContent = String(progress.wood);
    this.stoneCount.textContent = String(progress.stone);

    if (!progress.campBuilt) {
      this.objectiveTitle.textContent = 'Construis le camp central';
      this.objectiveDetail.textContent = `Coût : ${formatCost(COSTS.camp)}`;
    } else if (!progress.woodWorker || !progress.stoneWorker) {
      const missing = [!progress.woodWorker ? 'bûcheron' : '', !progress.stoneWorker ? 'mineur' : ''].filter(Boolean).join(' et ');
      this.objectiveTitle.textContent = `Recrute ${missing}`;
      this.objectiveDetail.textContent = 'Les travailleurs récoltent automatiquement.';
    } else if (!progress.bridgeBuilt) {
      this.objectiveTitle.textContent = 'Ouvre le pont de la marée';
      this.objectiveDetail.textContent = `Coût : ${formatCost(COSTS.bridge)}`;
    } else if (!progress.completed) {
      this.objectiveTitle.textContent = 'Rejoins la grande balise';
      this.objectiveDetail.textContent = 'Traverse le nouveau passage.';
    } else {
      this.objectiveTitle.textContent = 'Ton archipel prospère';
      this.objectiveDetail.textContent = 'Continue à récolter librement.';
    }
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
    this.toastTimer = window.setTimeout(() => this.toastElement.classList.remove('show'), 1500);
  }

  showVictory(progress: IslandProgress): void {
    this.victoryWorkers.textContent = String(Number(progress.woodWorker) + Number(progress.stoneWorker));
    const total = Math.floor(progress.elapsedSeconds);
    this.victoryTime.textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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
