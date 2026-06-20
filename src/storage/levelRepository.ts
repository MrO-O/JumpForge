import { cloneLevel, createLevelId, validateLevel } from '../levels/levelCommands';
import { migrateLevelDocument } from '../levels/levelMigrations';
import type { LevelDocument } from '../levels/levelTypes';

const STORAGE_PREFIX = 'jumpforge.level.';
const INDEX_KEY = 'jumpforge.level-index';

function getStorage(): Storage {
  if (typeof window === 'undefined' || !window.localStorage) throw new Error('当前环境不支持 localStorage。');
  return window.localStorage;
}

function readIndex(): string[] {
  const raw = getStorage().getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) return [...new Set(parsed)];
  } catch {
    // A corrupt index should not hide individually stored levels.
  }
  return [];
}

function writeIndex(ids: string[]): void {
  getStorage().setItem(INDEX_KEY, JSON.stringify([...new Set(ids)]));
}

export function saveLevel(level: LevelDocument): LevelDocument {
  const validation = validateLevel(level);
  if (!validation.valid) throw new Error(`无法保存无效关卡：${validation.errors.map((issue) => issue.message).join('；')}`);
  const saved = cloneLevel({ ...level, metadata: { ...level.metadata, updatedAt: new Date().toISOString() } });
  const storage = getStorage();
  storage.setItem(`${STORAGE_PREFIX}${saved.id}`, JSON.stringify(saved));
  writeIndex([...readIndex(), saved.id]);
  return saved;
}

export function loadLevel(id: string): LevelDocument | null {
  const raw = getStorage().getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return migrateLevelDocument(JSON.parse(raw));
  } catch (error) {
    throw new Error(`无法读取关卡 ${id}：${error instanceof Error ? error.message : String(error)}`);
  }
}

export function listLevels(): LevelDocument[] {
  const levels: LevelDocument[] = [];
  for (const id of readIndex()) {
    const level = loadLevel(id);
    if (level) levels.push(level);
  }
  return levels.sort((a, b) => (b.metadata?.updatedAt ?? '').localeCompare(a.metadata?.updatedAt ?? ''));
}

export function deleteLevel(id: string): void {
  const storage = getStorage();
  storage.removeItem(`${STORAGE_PREFIX}${id}`);
  writeIndex(readIndex().filter((storedId) => storedId !== id));
}

export function duplicateLevel(id: string): LevelDocument {
  const original = loadLevel(id);
  if (!original) throw new Error(`找不到要复制的关卡：${id}`);
  const copy = cloneLevel(original);
  copy.id = createLevelId('level');
  copy.title = `${copy.title} 副本`;
  copy.metadata = { ...copy.metadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  return saveLevel(copy);
}

export function storedLevelIds(): string[] {
  return readIndex();
}
