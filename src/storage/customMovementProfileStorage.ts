import { getMovementPreset } from '../game/movementPresets';
import { playerTuningBounds, sanitizePlayerTuning, type PlayerTuning } from '../game/playerTuning';

export const CUSTOM_MOVEMENT_PROFILES_STORAGE_KEY = 'jumpforge:custom-movement-profiles:v1';
export const MAX_CUSTOM_MOVEMENT_PROFILES = 5;

export interface SavedCustomMovementProfile {
  id: string;
  name: string;
  presetId: string;
  tuningOverrides: Partial<PlayerTuning>;
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function normalizeProfile(value: unknown): SavedCustomMovementProfile | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<SavedCustomMovementProfile>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const preset = getMovementPreset(candidate.presetId);
  if (typeof candidate.id !== 'string' || !candidate.id || !name || name.length > 40 || !preset) return null;
  const tuning = sanitizePlayerTuning(candidate.tuningOverrides ?? {}, preset.tuning as PlayerTuning);
  const tuningOverrides = Object.fromEntries(Object.keys(playerTuningBounds).map((key) => [key, tuning[key as keyof PlayerTuning]])) as Partial<PlayerTuning>;
  return { id: candidate.id, name, presetId: preset.id, tuningOverrides };
}

export function loadCustomMovementProfiles(): SavedCustomMovementProfile[] {
  const raw = getStorage()?.getItem(CUSTOM_MOVEMENT_PROFILES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    return parsed.flatMap((value) => {
      const profile = normalizeProfile(value);
      if (!profile || seenIds.has(profile.id) || seenNames.has(profile.name)) return [];
      seenIds.add(profile.id);
      seenNames.add(profile.name);
      return [profile];
    }).slice(0, MAX_CUSTOM_MOVEMENT_PROFILES);
  } catch {
    return [];
  }
}

function writeCustomMovementProfiles(profiles: readonly SavedCustomMovementProfile[]): void {
  const storage = getStorage();
  if (!storage) throw new Error('当前环境不支持保存自定义手感。');
  storage.setItem(CUSTOM_MOVEMENT_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function saveCustomMovementProfile(input: Omit<SavedCustomMovementProfile, 'id'>): SavedCustomMovementProfile {
  const profiles = loadCustomMovementProfiles();
  if (profiles.length >= MAX_CUSTOM_MOVEMENT_PROFILES) throw new Error(`最多保存 ${MAX_CUSTOM_MOVEMENT_PROFILES} 套自定义手感；请先在编辑器中删除一套。`);
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `custom-movement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const profile = normalizeProfile({ ...input, id });
  if (!profile) throw new Error('自定义手感名称或数值无效。');
  if (profiles.some((candidate) => candidate.name === profile.name)) throw new Error('已有同名自定义手感，请换一个名称。');
  writeCustomMovementProfiles([...profiles, profile]);
  return profile;
}

export function deleteCustomMovementProfile(id: string): SavedCustomMovementProfile[] {
  const profiles = loadCustomMovementProfiles();
  const next = profiles.filter((profile) => profile.id !== id);
  writeCustomMovementProfiles(next);
  return next;
}
