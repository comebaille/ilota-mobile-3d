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
  hasPassword: boolean;
}

interface SaveProfilePasswordRecord {
  version: 1;
  iterations: number;
  salt: string;
  hash: string;
}

const ACTIVE_PROFILE_KEY = 'ilota-save-profile-active-v1';
const PROFILE_NAMES_KEY = 'ilota-save-profile-names-v1';
const PROFILE_PASSWORDS_KEY = 'ilota-save-profile-passwords-v1';
const LEGACY_SAVE_KEY = 'ilota-save-v1';
const LEGACY_BACKUP_KEY = 'ilota-save-backup-v1';
// v2 force une nouvelle remise à zéro ponctuelle, même pour les appareils qui
// avaient déjà exécuté la première migration demandée pour le Joueur 2.
const PLAYER_TWO_SKILL_RESET_KEY = 'ilota-player-2-skill-tree-reset-v2';

const isProfileId = (value: string | null): value is SaveProfileId => (
  SAVE_PROFILE_IDS.includes(value as SaveProfileId)
);

const saveKey = (id: SaveProfileId): string => `ilota-save-profile-${id}-v1`;
const backupKey = (id: SaveProfileId): string => `ilota-save-profile-${id}-backup-v1`;
const PASSWORD_ITERATIONS = 120_000;

const bytesToBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

const base64ToBytes = (value: string): Uint8Array => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const readPasswordRecords = (): Partial<Record<SaveProfileId, SaveProfilePasswordRecord>> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_PASSWORDS_KEY) ?? '{}') as Record<string, unknown>;
    return Object.fromEntries(SAVE_PROFILE_IDS.flatMap((id) => {
      const record = parsed[id] as Partial<SaveProfilePasswordRecord> | undefined;
      return record?.version === 1
        && typeof record.iterations === 'number'
        && typeof record.salt === 'string'
        && typeof record.hash === 'string'
        ? [[id, record as SaveProfilePasswordRecord]]
        : [];
    }));
  } catch {
    return {};
  }
};

const derivePasswordHash = async (password: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
};

export const hasSaveProfilePassword = (id: SaveProfileId): boolean => Boolean(readPasswordRecords()[id]);

export const setSaveProfilePassword = async (id: SaveProfileId, password: string): Promise<void> => {
  if (password.length < 4) throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const record: SaveProfilePasswordRecord = {
    version: 1,
    iterations: PASSWORD_ITERATIONS,
    salt: bytesToBase64(salt),
    hash: await derivePasswordHash(password, salt, PASSWORD_ITERATIONS),
  };
  const records = readPasswordRecords();
  records[id] = record;
  localStorage.setItem(PROFILE_PASSWORDS_KEY, JSON.stringify(records));
};

export const verifySaveProfilePassword = async (id: SaveProfileId, password: string): Promise<boolean> => {
  const record = readPasswordRecords()[id];
  if (!record) return false;
  const actual = await derivePasswordHash(password, base64ToBytes(record.salt), record.iterations);
  if (actual.length !== record.hash.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ record.hash.charCodeAt(index);
  }
  return difference === 0;
};

const validJson = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
};

const enforceProfileWorldLock = (id: SaveProfileId, serialized: string | null): string | null => {
  if (id !== '2' || !serialized) return serialized;
  try {
    const progress = JSON.parse(serialized) as Record<string, unknown>;
    progress.currentWorld = 1;
    return JSON.stringify(progress);
  } catch {
    return serialized;
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

const resetPlayerTwoSkillTreeOnce = (): void => {
  if (localStorage.getItem(PLAYER_TWO_SKILL_RESET_KEY) === 'done') return;
  const raw = validJson(localStorage.getItem(saveKey('2')))
    ?? validJson(localStorage.getItem(backupKey('2')));
  if (!raw) return;
  try {
    const progress = JSON.parse(raw) as Record<string, unknown>;
    progress.skills = [];
    progress.skillRanks = {};
    progress.autoRegulation = false;
    progress.industrySurge = false;
    progress.explorationFlow = false;
    progress.currentWorld = 1;
    const migrated = JSON.stringify(progress);
    localStorage.setItem(saveKey('2'), migrated);
    localStorage.setItem(backupKey('2'), migrated);
    localStorage.setItem(PLAYER_TWO_SKILL_RESET_KEY, 'done');
  } catch {
    // Une sauvegarde illisible sera laissée intacte pour éviter toute perte supplémentaire.
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
    resetPlayerTwoSkillTreeOnce();
  } catch {
    // Le jeu reste utilisable si le stockage privé est indisponible.
  }
};

export const isWorldTwoBlockedForActiveProfile = (): boolean => getActiveSaveProfileId() === '2';

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
    const serialized = validJson(localStorage.getItem(saveKey(id)))
      ?? validJson(localStorage.getItem(backupKey(id)));
    return enforceProfileWorldLock(id, serialized);
  } catch {
    return null;
  }
};

export const writeActiveSave = (serialized: string): void => {
  ensureLegacySaveMigrated();
  const id = getActiveSaveProfileId();
  try {
    const safeSerialized = enforceProfileWorldLock(id, serialized) ?? serialized;
    const key = saveKey(id);
    const previous = validJson(localStorage.getItem(key));
    if (previous && previous !== safeSerialized) localStorage.setItem(backupKey(id), previous);
    localStorage.setItem(key, safeSerialized);
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
      hasPassword: hasSaveProfilePassword(id),
    };
  });
};
