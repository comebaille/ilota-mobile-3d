export const RESOURCE_KINDS = ['wood', 'stone', 'copper', 'crystal'] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export type WorkerLevel = 1 | 2 | 3;
export type StructureKind = 'camp' | 'workshop' | 'foundry' | 'observatory';

export interface Cost {
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
}

export interface WorkerState {
  id: string;
  name: string;
  task: ResourceKind;
  level: WorkerLevel;
}

export interface IslandProgress {
  version: 2;
  wood: number;
  stone: number;
  copper: number;
  crystal: number;
  campBuilt: boolean;
  workshopBuilt: boolean;
  foundryBuilt: boolean;
  observatoryBuilt: boolean;
  bridgesBuilt: [boolean, boolean, boolean, boolean];
  cachesFound: string[];
  workers: WorkerState[];
  completed: boolean;
  elapsedSeconds: number;
}

interface LegacyProgress {
  version: 1;
  wood?: number;
  stone?: number;
  campBuilt?: boolean;
  woodWorker?: boolean;
  stoneWorker?: boolean;
  bridgeBuilt?: boolean;
  cacheFound?: boolean;
  completed?: boolean;
  elapsedSeconds?: number;
}

export interface ObjectiveCopy {
  chapter: number;
  eyebrow: string;
  title: string;
  detail: string;
}

const cost = (wood = 0, stone = 0, copper = 0, crystal = 0): Cost => ({ wood, stone, copper, crystal });

export const STRUCTURE_COSTS: Record<StructureKind, Cost> = {
  camp: cost(8, 5),
  workshop: cost(18, 14),
  foundry: cost(18, 18, 12),
  observatory: cost(24, 22, 18, 10),
};

export const BRIDGE_COSTS: readonly Cost[] = [
  cost(14, 12),
  cost(28, 22),
  cost(34, 30, 22),
  cost(42, 36, 28, 20),
];

export const FINAL_COST = cost(20, 20, 30, 28);

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  wood: 'bois',
  stone: 'pierre',
  copper: 'cuivre',
  crystal: 'cristal',
};

export const RESOURCE_ICONS: Record<ResourceKind, string> = {
  wood: '▰',
  stone: '◆',
  copper: '⬟',
  crystal: '✦',
};

const WORKER_NAMES = ['Milo', 'Nila', 'Sève', 'Roc', 'Pollen', 'Lune', 'Braise', 'Azur', 'Orme'];

const freshProgress = (): IslandProgress => ({
  version: 2,
  wood: 0,
  stone: 0,
  copper: 0,
  crystal: 0,
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

const nonNegativeInteger = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const isResourceKind = (value: unknown): value is ResourceKind =>
  typeof value === 'string' && RESOURCE_KINDS.includes(value as ResourceKind);

const sanitizeWorkers = (value: unknown): WorkerState[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const workers: WorkerState[] = [];
  value.slice(0, WORKER_NAMES.length).forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return;
    const source = candidate as Partial<WorkerState>;
    const fallbackId = `worker-${index + 1}`;
    const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : fallbackId;
    if (seen.has(id)) return;
    seen.add(id);
    const parsedLevel = Math.min(3, Math.max(1, nonNegativeInteger(source.level))) as WorkerLevel;
    workers.push({
      id,
      name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 18) : WORKER_NAMES[index] ?? `Renard ${index + 1}`,
      task: isResourceKind(source.task) ? source.task : index % 2 ? 'stone' : 'wood',
      level: parsedLevel,
    });
  });
  return workers;
};

export const getWorkerCapacity = (progress: IslandProgress): number => {
  if (progress.observatoryBuilt) return 9;
  if (progress.foundryBuilt) return 7;
  if (progress.workshopBuilt) return 5;
  if (progress.campBuilt) return 3;
  return 0;
};

export const getWorkerLevelCap = (progress: IslandProgress): WorkerLevel => {
  if (progress.foundryBuilt) return 3;
  if (progress.workshopBuilt) return 2;
  return 1;
};

export const getUnlockedWorkerTasks = (progress: IslandProgress): ResourceKind[] => {
  if (!progress.campBuilt) return [];
  const tasks: ResourceKind[] = ['wood', 'stone'];
  if (progress.foundryBuilt) tasks.push('copper');
  if (progress.observatoryBuilt) tasks.push('crystal');
  return tasks;
};

export const getRecruitCost = (progress: IslandProgress): Cost => {
  const count = progress.workers.length;
  return cost(
    4 + count * 2,
    2 + Math.floor((count + 1) / 2) * 2,
    count >= 5 ? (count - 4) * 2 : 0,
    count >= 8 ? 2 : 0,
  );
};

export const getUpgradeCost = (worker: WorkerState): Cost =>
  worker.level === 1 ? cost(8, 6) : worker.level === 2 ? cost(14, 12, 6) : cost();

export const getWorkerYield = (level: WorkerLevel): number => level === 1 ? 2 : level === 2 ? 4 : 7;

export const getWorkerCycleSeconds = (level: WorkerLevel): number => level === 1 ? 8.2 : level === 2 ? 6.4 : 4.9;

export const getTotalWorkerLevels = (progress: IslandProgress): number =>
  progress.workers.reduce((total, worker) => total + worker.level, 0);

export const getChapter = (progress: IslandProgress): number => {
  if (progress.bridgesBuilt[3]) return 5;
  if (progress.bridgesBuilt[2]) return 4;
  if (progress.bridgesBuilt[1]) return 3;
  if (progress.bridgesBuilt[0]) return 2;
  return 1;
};

export const formatCost = (value: Cost): string => RESOURCE_KINDS
  .filter((kind) => value[kind] > 0)
  .map((kind) => `${value[kind]} ${RESOURCE_LABELS[kind]}`)
  .join(' · ') || 'gratuit';

export const formatBridgeRequirement = (progress: IslandProgress, index: number): string => {
  switch (index) {
    case 0:
      return progress.workers.length < 2 ? '2 travailleurs requis' : '1 bûcheron et 1 mineur requis';
    case 1:
      return progress.workers.length < 4 ? '4 travailleurs requis' : 'un travailleur niveau 2 requis';
    case 2:
      return progress.workers.length < 5 ? '5 travailleurs requis' : 'un cuivrier assigné requis';
    case 3:
      return progress.workers.length < 7 ? '7 travailleurs requis' : 'un cristallier et 10 niveaux cumulés requis';
    default:
      return '';
  }
};

export const getObjective = (progress: IslandProgress): ObjectiveCopy => {
  const chapter = getChapter(progress);
  const eyebrow = `CHAPITRE ${chapter}/5`;
  if (!progress.campBuilt) return { chapter, eyebrow, title: 'Bâtis le camp des Marées', detail: `Coût : ${formatCost(STRUCTURE_COSTS.camp)}` };
  if (progress.workers.length < 2) return { chapter, eyebrow, title: 'Forme ta première équipe', detail: 'Recrute 2 renards et assigne bois + pierre.' };
  if (!progress.bridgesBuilt[0]) return { chapter, eyebrow, title: 'Ouvre le pont des Pins', detail: `Coût : ${formatCost(BRIDGE_COSTS[0]!)}` };
  if (!progress.workshopBuilt) return { chapter, eyebrow, title: 'Construis l’atelier des Pins', detail: `Coût : ${formatCost(STRUCTURE_COSTS.workshop)}` };
  if (progress.workers.length < 4) return { chapter, eyebrow, title: 'Agrandis l’équipe à 4', detail: 'L’atelier porte la capacité à 5 travailleurs.' };
  if (!progress.workers.some((worker) => worker.level >= 2)) return { chapter, eyebrow, title: 'Améliore un travailleur', detail: 'Passe un renard au niveau 2 depuis ÉQUIPE.' };
  if (!progress.bridgesBuilt[1]) return { chapter, eyebrow, title: 'Relie l’île Cuivrée', detail: `Coût : ${formatCost(BRIDGE_COSTS[1]!)}` };
  if (!progress.foundryBuilt) return { chapter, eyebrow, title: 'Récolte le cuivre et bâtis la fonderie', detail: `Coût : ${formatCost(STRUCTURE_COSTS.foundry)}` };
  if (!progress.workers.some((worker) => worker.task === 'copper')) return { chapter, eyebrow, title: 'Assigne un cuivrier', detail: 'La fonderie débloque le cuivre et le niveau 3.' };
  if (progress.workers.length < 5) return { chapter, eyebrow, title: 'Dirige au moins 5 travailleurs', detail: 'Diversifie la production avant la prochaine traversée.' };
  if (!progress.bridgesBuilt[2]) return { chapter, eyebrow, title: 'Ouvre la voie des Cristaux', detail: `Coût : ${formatCost(BRIDGE_COSTS[2]!)}` };
  if (!progress.observatoryBuilt) return { chapter, eyebrow, title: 'Bâtis l’observatoire de Cristal', detail: `Coût : ${formatCost(STRUCTURE_COSTS.observatory)}` };
  if (!progress.workers.some((worker) => worker.task === 'crystal')) return { chapter, eyebrow, title: 'Forme un cristallier', detail: 'Réassigne un renard depuis le panneau ÉQUIPE.' };
  if (progress.workers.length < 7 || getTotalWorkerLevels(progress) < 10) return { chapter, eyebrow, title: 'Prépare l’expédition finale', detail: '7 travailleurs et 10 niveaux cumulés requis.' };
  if (!progress.bridgesBuilt[3]) return { chapter, eyebrow, title: 'Bâtis le pont de la Couronne', detail: `Coût : ${formatCost(BRIDGE_COSTS[3]!)}` };
  if (!Economy.finalRequirementsMet(progress)) return { chapter, eyebrow, title: 'Rassemble les quatre métiers', detail: '8 travailleurs, chaque ressource et 12 niveaux cumulés.' };
  if (!progress.completed) return { chapter, eyebrow, title: 'Éveille le Cœur de l’Archipel', detail: `Offrande : ${formatCost(FINAL_COST)}` };
  return { chapter, eyebrow, title: 'L’archipel prospère', detail: 'Optimise librement les neuf travailleurs.' };
};

export class Economy {
  readonly progress: IslandProgress;

  constructor(initial?: Partial<IslandProgress>) {
    const fresh = freshProgress();
    const sourceBridges = Array.isArray(initial?.bridgesBuilt) ? initial.bridgesBuilt : fresh.bridgesBuilt;
    this.progress = {
      ...fresh,
      ...initial,
      version: 2,
      wood: nonNegativeInteger(initial?.wood),
      stone: nonNegativeInteger(initial?.stone),
      copper: nonNegativeInteger(initial?.copper),
      crystal: nonNegativeInteger(initial?.crystal),
      campBuilt: Boolean(initial?.campBuilt),
      workshopBuilt: Boolean(initial?.workshopBuilt),
      foundryBuilt: Boolean(initial?.foundryBuilt),
      observatoryBuilt: Boolean(initial?.observatoryBuilt),
      bridgesBuilt: [Boolean(sourceBridges[0]), Boolean(sourceBridges[1]), Boolean(sourceBridges[2]), Boolean(sourceBridges[3])],
      cachesFound: Array.isArray(initial?.cachesFound) ? [...new Set(initial.cachesFound.filter((id): id is string => typeof id === 'string'))] : [],
      workers: sanitizeWorkers(initial?.workers),
      completed: Boolean(initial?.completed),
      elapsedSeconds: Math.max(0, Number(initial?.elapsedSeconds) || 0),
    };
  }

  add(kind: ResourceKind, amount = 1): void {
    this.progress[kind] += nonNegativeInteger(amount);
  }

  canAfford(value: Cost): boolean {
    return RESOURCE_KINDS.every((kind) => this.progress[kind] >= value[kind]);
  }

  missing(value: Cost): Cost {
    return {
      wood: Math.max(0, value.wood - this.progress.wood),
      stone: Math.max(0, value.stone - this.progress.stone),
      copper: Math.max(0, value.copper - this.progress.copper),
      crystal: Math.max(0, value.crystal - this.progress.crystal),
    };
  }

  private spend(value: Cost): boolean {
    if (!this.canAfford(value)) return false;
    RESOURCE_KINDS.forEach((kind) => { this.progress[kind] -= value[kind]; });
    return true;
  }

  buildStructure(kind: StructureKind): boolean {
    const flag = `${kind}Built` as const;
    if (this.progress[flag]) return false;
    const accessible = kind === 'camp'
      || (kind === 'workshop' && this.progress.bridgesBuilt[0])
      || (kind === 'foundry' && this.progress.bridgesBuilt[1])
      || (kind === 'observatory' && this.progress.bridgesBuilt[2]);
    if (!accessible || !this.spend(STRUCTURE_COSTS[kind])) return false;
    this.progress[flag] = true;
    return true;
  }

  hireWorker(): WorkerState | null {
    if (!this.progress.campBuilt || this.progress.workers.length >= getWorkerCapacity(this.progress)) return null;
    if (!this.spend(getRecruitCost(this.progress))) return null;
    const index = this.progress.workers.length;
    const tasks = getUnlockedWorkerTasks(this.progress);
    const counts = new Map(tasks.map((task) => [task, this.progress.workers.filter((worker) => worker.task === task).length]));
    const task = [...tasks].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0] ?? 'wood';
    const worker: WorkerState = {
      id: `worker-${index + 1}`,
      name: WORKER_NAMES[index] ?? `Renard ${index + 1}`,
      task,
      level: 1,
    };
    this.progress.workers.push(worker);
    return worker;
  }

  assignWorker(id: string, task: ResourceKind): boolean {
    if (!getUnlockedWorkerTasks(this.progress).includes(task)) return false;
    const worker = this.progress.workers.find((candidate) => candidate.id === id);
    if (!worker || worker.task === task) return false;
    worker.task = task;
    return true;
  }

  upgradeWorker(id: string): boolean {
    const worker = this.progress.workers.find((candidate) => candidate.id === id);
    if (!worker || worker.level >= getWorkerLevelCap(this.progress) || worker.level >= 3) return false;
    if (!this.spend(getUpgradeCost(worker))) return false;
    worker.level = (worker.level + 1) as WorkerLevel;
    return true;
  }

  bridgeRequirementsMet(index: number): boolean {
    const workers = this.progress.workers;
    switch (index) {
      case 0:
        return this.progress.campBuilt && workers.length >= 2
          && workers.some((worker) => worker.task === 'wood')
          && workers.some((worker) => worker.task === 'stone');
      case 1:
        return this.progress.workshopBuilt && workers.length >= 4 && workers.some((worker) => worker.level >= 2);
      case 2:
        return this.progress.foundryBuilt && workers.length >= 5 && workers.some((worker) => worker.task === 'copper');
      case 3:
        return this.progress.observatoryBuilt && workers.length >= 7
          && workers.some((worker) => worker.task === 'crystal')
          && getTotalWorkerLevels(this.progress) >= 10;
      default:
        return false;
    }
  }

  buildBridge(index: number): boolean {
    const bridgeCost = BRIDGE_COSTS[index];
    if (!bridgeCost || this.progress.bridgesBuilt[index] || !this.bridgeRequirementsMet(index)) return false;
    if (!this.spend(bridgeCost)) return false;
    this.progress.bridgesBuilt[index] = true;
    return true;
  }

  static finalRequirementsMet(progress: IslandProgress): boolean {
    return progress.bridgesBuilt[3]
      && progress.workers.length >= 8
      && RESOURCE_KINDS.every((kind) => progress.workers.some((worker) => worker.task === kind))
      && getTotalWorkerLevels(progress) >= 12;
  }

  complete(): boolean {
    if (this.progress.completed || !Economy.finalRequirementsMet(this.progress) || !this.spend(FINAL_COST)) return false;
    this.progress.completed = true;
    return true;
  }

  findCache(id: string, reward: Cost): boolean {
    if (this.progress.cachesFound.includes(id)) return false;
    this.progress.cachesFound.push(id);
    RESOURCE_KINDS.forEach((kind) => this.add(kind, reward[kind]));
    return true;
  }

  tick(delta: number): void {
    if (!this.progress.completed) this.progress.elapsedSeconds += Math.max(0, delta);
  }

  serialize(): string {
    return JSON.stringify(this.progress);
  }

  static restore(raw: string | null): Economy {
    if (!raw) return new Economy();
    try {
      const value = JSON.parse(raw) as Partial<IslandProgress> | LegacyProgress;
      if (value.version === 2) return new Economy(value as Partial<IslandProgress>);
      if (value.version === 1) {
        const legacy = value as LegacyProgress;
        const workers: WorkerState[] = [];
        if (legacy.woodWorker) workers.push({ id: 'worker-1', name: WORKER_NAMES[0]!, task: 'wood', level: 1 });
        if (legacy.stoneWorker) workers.push({ id: 'worker-2', name: WORKER_NAMES[1]!, task: 'stone', level: 1 });
        return new Economy({
          wood: nonNegativeInteger(legacy.wood),
          stone: nonNegativeInteger(legacy.stone),
          campBuilt: Boolean(legacy.campBuilt),
          bridgesBuilt: [Boolean(legacy.bridgeBuilt), false, false, false],
          cachesFound: legacy.cacheFound ? ['main-cache'] : [],
          workers,
          completed: false,
          elapsedSeconds: Math.max(0, Number(legacy.elapsedSeconds) || 0),
        });
      }
      return new Economy();
    } catch {
      return new Economy();
    }
  }
}
