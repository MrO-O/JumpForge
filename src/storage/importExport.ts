import { cloneLevel, createLevelId, validateLevel } from '../levels/levelCommands';
import { migrateLevelDocument } from '../levels/levelMigrations';
import type { LevelDocument } from '../levels/levelTypes';
import { storedLevelIds } from './levelRepository';

export class LevelImportError extends Error {
  constructor(message: string, public readonly details: string[] = []) {
    super(message);
    this.name = 'LevelImportError';
  }
}

export function exportLevelToJson(level: LevelDocument): string {
  const normalized = migrateLevelDocument(level);
  const validation = validateLevel(normalized);
  if (!validation.valid) throw new Error(`无法导出无效关卡：${validation.errors.map((issue) => issue.message).join('；')}`);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

export function importLevelFromJson(jsonText: string, existingIds: Iterable<string> = storedLevelIds()): LevelDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new LevelImportError(`JSON 解析失败：${error instanceof Error ? error.message : String(error)}`);
  }

  let level: LevelDocument;
  try {
    level = migrateLevelDocument(parsed);
  } catch (error) {
    const details = error instanceof Error && 'details' in error && Array.isArray(error.details) ? error.details.filter((item): item is string => typeof item === 'string') : [];
    throw new LevelImportError(error instanceof Error ? error.message : '关卡结构无效。', details);
  }

  const validation = validateLevel(level);
  if (!validation.valid) throw new LevelImportError('关卡规则校验失败。', validation.errors.map((issue) => `${issue.path}：${issue.message}`));

  const ids = new Set(existingIds);
  if (ids.has(level.id)) {
    const imported = cloneLevel(level);
    imported.id = createLevelId('imported-level');
    imported.metadata = { ...imported.metadata, updatedAt: new Date().toISOString() };
    return imported;
  }
  return cloneLevel(level);
}
