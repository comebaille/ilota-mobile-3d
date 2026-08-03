export const SAVE_PROFILE_IDS = ['1', '2', '3'] as const;
export type SaveProfileId = (typeof SAVE_PROFILE_IDS)[number];

export interface SaveProfileSummary {
  id: SaveProfileId;
  name: string;
  active: boolean;
  hasSave: boolean;
  currentWorld: 1 | 2;
  tide: number;
  workers: number;
  completed: boolean;
}

const ACTIVE_PROFILE_KEY = 'ilota-save-profile-active-v1';
const PROFILE_NAMES_KEY = 'ilota-save-profile-names-v1';
const LEGACY_SAVE_KEY = 'ilota-save-v1';
const LEGACY_BACKUP_KEY = 'ilota-save-backup-v1';

const isProfileId = (value: string | null): value is SaveProfileId => (
  SAVE_PROFILE_IDS.includes(value as SaveProfileId)
);

const saveKey = (id: SaveProfileId): string => `ilota-save-profile-${id}-v1`;
const backupKey = (id: SaveProfileId): string => `ilota-save-profile-${id}-backup-v1`;

const validJson = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
};

const readNames = (): Partial<Record<SaveProfileId, string>> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_NAMES_KEY) ?? '{}') as Record<string, unknown>;
    return Object.fromEntries(SAVE_PROFILE_IDS.flatMap((id) => {
      const value = parsed[id];
      return typeof value === 'string' && value.trim() ? [[id, value.trim().slice(0, 18)]] : [];
    }));
  } catch {
    return {};
  }
};

export const ensureLegacySaveMigrated = (): void => {
  try {
    if (!localStorage.getItem(saveKey('1'))) {
      const legacy = validJson(localStorage.getItem(LEGACY_SAVE_KEY));
      if (legacy) localStorage.setItem(saveKey('1'), legacy);
    }
    if (!localStorage.getItem(backupKey('1'))) {
      const backup = validJson(localStorage.getItem(LEGACY_BACKUP_KEY));
      if (backup) localStorage.setItem(backupKey('1'), backup);
    }
    localStorage.removeItem(LEGACY_SAVE_KEY);
    localStorage.removeItem(LEGACY_BACKUP_KEY);
  } catch {
    // Le jeu reste utilisable si le stockage privé est indisponible.
  }
};

export const getActiveSaveProfileId = (): SaveProfileId => {
  try {
    const stored = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return isProfileId(stored) ? stored : '1';
  } catch {
    return '1';
  }
};

export const setActiveSaveProfileId = (id: SaveProfileId): void => {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // Le profil courant reste celui par défaut sans stockage persistant.
  }
};

export const renameSaveProfile = (id: SaveProfileId, requestedName: string): string => {
  const fallback = `Joueur ${id}`;
  const name = requestedName.trim().replace(/\s+/g, ' ').slice(0, 18) || fallback;
  try {
    const names = readNames();
    names[id] = name;
    localStorage.setItem(PROFILE_NAMES_KEY, JSON.stringify(names));
  } catch {
    // Le nom affiché reste disponible pour la session courante.
  }
  return name;
};

export const readActiveSave = (): string | null => {
  ensureLegacySaveMigrated();
  const id = getActiveSaveProfileId();
  try {
    return validJson(localStorage.getItem(saveKey(id)))
      ?? validJson(localStorage.getItem(backupKey(id)));
  } catch {
    return null;
  }
};

export const writeActiveSave = (serialized: string): void => {
  ensureLegacySaveMigrated();
  const id = getActiveSaveProfileId();
  try {
    const key = saveKey(id);
    const previous = validJson(localStorage.getItem(key));
    if (previous && previous !== serialized) localStorage.setItem(backupKey(id), previous);
    localStorage.setItem(key, serialized);
  } catch {
    // La partie continue même si le navigateur refuse l’écriture.
  }
};

export const clearActiveSaveProfile = (): void => {
  const id = getActiveSaveProfileId();
  try {
    localStorage.removeItem(saveKey(id));
    localStorage.removeItem(backupKey(id));
  } catch {
    // Aucun plantage si le stockage est verrouillé.
  }
};

export const getSaveProfileSummaries = (): SaveProfileSummary[] => {
  ensureLegacySaveMigrated();
  const active = getActiveSaveProfileId();
  const names = readNames();
  return SAVE_PROFILE_IDS.map((id) => {
    let parsed: Record<string, unknown> | null = null;
    try {
      const raw = validJson(localStorage.getItem(saveKey(id)))
        ?? validJson(localStorage.getItem(backupKey(id)));
      if (raw) parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    const workers = Array.isArray(parsed?.workers) ? parsed.workers.length : 0;
    const rebirths = typeof parsed?.rebirths === 'number' ? Math.max(0, Math.floor(parsed.rebirths)) : 0;
    return {
      id,
      name: names[id] ?? `Joueur ${id}`,
      active: id === active,
      hasSave: Boolean(parsed),
      currentWorld: parsed?.currentWorld === 2 ? 2 : 1,
      tide: rebirths + 1,
      workers,
      completed: parsed?.completed === true,
    };
  });
};

