export type ResourceKind = 'wood' | 'stone';
export type WorkerKind = 'wood' | 'stone';

export interface Cost {
  wood: number;
  stone: number;
}

export interface IslandProgress {
  version: 1;
  wood: number;
  stone: number;
  campBuilt: boolean;
  woodWorker: boolean;
  stoneWorker: boolean;
  bridgeBuilt: boolean;
  cacheFound: boolean;
  completed: boolean;
  elapsedSeconds: number;
}

export const COSTS = {
  camp: { wood: 6, stone: 4 },
  woodWorker: { wood: 4, stone: 2 },
  stoneWorker: { wood: 2, stone: 4 },
  bridge: { wood: 8, stone: 8 },
} satisfies Record<string, Cost>;

const FRESH_PROGRESS: IslandProgress = {
  version: 1,
  wood: 0,
  stone: 0,
  campBuilt: false,
  woodWorker: false,
  stoneWorker: false,
  bridgeBuilt: false,
  cacheFound: false,
  completed: false,
  elapsedSeconds: 0,
};

const nonNegativeInteger = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

export class Economy {
  readonly progress: IslandProgress;

  constructor(initial?: Partial<IslandProgress>) {
    this.progress = {
      ...FRESH_PROGRESS,
      ...initial,
      version: 1,
      wood: nonNegativeInteger(initial?.wood),
      stone: nonNegativeInteger(initial?.stone),
      elapsedSeconds: Math.max(0, Number(initial?.elapsedSeconds) || 0),
    };
  }

  add(kind: ResourceKind, amount = 1): void {
    const safeAmount = nonNegativeInteger(amount);
    this.progress[kind] += safeAmount;
  }

  canAfford(cost: Cost): boolean {
    return this.progress.wood >= cost.wood && this.progress.stone >= cost.stone;
  }

  missing(cost: Cost): Cost {
    return {
      wood: Math.max(0, cost.wood - this.progress.wood),
      stone: Math.max(0, cost.stone - this.progress.stone),
    };
  }

  private spend(cost: Cost): boolean {
    if (!this.canAfford(cost)) return false;
    this.progress.wood -= cost.wood;
    this.progress.stone -= cost.stone;
    return true;
  }

  buildCamp(): boolean {
    if (this.progress.campBuilt || !this.spend(COSTS.camp)) return false;
    this.progress.campBuilt = true;
    return true;
  }

  hire(kind: WorkerKind): boolean {
    if (!this.progress.campBuilt) return false;
    const flag = kind === 'wood' ? 'woodWorker' : 'stoneWorker';
    if (this.progress[flag]) return false;
    const cost = kind === 'wood' ? COSTS.woodWorker : COSTS.stoneWorker;
    if (!this.spend(cost)) return false;
    this.progress[flag] = true;
    return true;
  }

  buildBridge(): boolean {
    if (this.progress.bridgeBuilt || !this.progress.woodWorker || !this.progress.stoneWorker) return false;
    if (!this.spend(COSTS.bridge)) return false;
    this.progress.bridgeBuilt = true;
    return true;
  }

  complete(): boolean {
    if (!this.progress.bridgeBuilt || this.progress.completed) return false;
    this.progress.completed = true;
    return true;
  }

  findCache(): boolean {
    if (this.progress.cacheFound) return false;
    this.progress.cacheFound = true;
    this.add('wood', 3);
    this.add('stone', 3);
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
      const value = JSON.parse(raw) as Partial<IslandProgress>;
      if (value.version !== 1) return new Economy();
      return new Economy(value);
    } catch {
      return new Economy();
    }
  }
}

export const formatCost = (cost: Cost): string => `${cost.wood} bois · ${cost.stone} pierre`;
