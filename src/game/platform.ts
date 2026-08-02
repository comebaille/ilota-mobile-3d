export type GameProfile = 'iphone' | 'tablet' | 'pc';

export interface GameProfileConfig {
  label: string;
  pixelRatio: number;
  maximumFps: number;
  shadows: boolean;
  shadowMapSize: number;
  particleScale: number;
  prewarm: boolean;
}

export const GAME_PROFILE_STORAGE_KEY = 'ilota-device-profile-v1';

export const GAME_PROFILE_CONFIGS: Record<GameProfile, GameProfileConfig> = {
  iphone: {
    label: 'iPhone',
    pixelRatio: 1.25,
    maximumFps: 60,
    shadows: true,
    shadowMapSize: 512,
    particleScale: 1,
    prewarm: true,
  },
  tablet: {
    label: 'Tablette',
    pixelRatio: 0.78,
    maximumFps: 30,
    shadows: false,
    shadowMapSize: 256,
    particleScale: 0.42,
    prewarm: false,
  },
  pc: {
    label: 'PC',
    pixelRatio: 1.5,
    maximumFps: 60,
    shadows: true,
    shadowMapSize: 1024,
    particleScale: 1.35,
    prewarm: true,
  },
};

const isGameProfile = (value: string | null): value is GameProfile =>
  value === 'iphone' || value === 'tablet' || value === 'pc';

export const detectRecommendedProfile = (): GameProfile => {
  const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  if (finePointer && touchPoints === 0) return 'pc';

  const screenWidth = Math.max(window.screen?.width || 0, window.innerWidth);
  const screenHeight = Math.max(window.screen?.height || 0, window.innerHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const longSide = Math.max(screenWidth, screenHeight);
  return shortSide >= 600 || longSide >= 960 ? 'tablet' : 'iphone';
};

export const restoreGameProfile = (): GameProfile => {
  try {
    const stored = localStorage.getItem(GAME_PROFILE_STORAGE_KEY);
    if (isGameProfile(stored)) return stored;
  } catch {
    // Le mode recommandé reste disponible si le stockage privé est bloqué.
  }
  return detectRecommendedProfile();
};

export const applyGameProfile = (profile: GameProfile, persist = true): void => {
  document.documentElement.dataset.profile = profile;
  if (!persist) return;
  try {
    localStorage.setItem(GAME_PROFILE_STORAGE_KEY, profile);
  } catch {
    // Le jeu reste utilisable dans les navigateurs qui refusent localStorage.
  }
};
