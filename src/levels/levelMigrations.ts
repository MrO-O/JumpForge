import { ZodError } from 'zod';
import { parseLevelDocument } from './levelSchema';
import type { LevelDocument } from './levelTypes';

export class LevelMigrationError extends Error {
  constructor(message: string, public readonly details: string[] = []) {
    super(message);
    this.name = 'LevelMigrationError';
  }
}

/**
 * Phase 1 only supports schemaVersion 1. Keeping this entry point means future
 * migrations can be added without changing storage or import callers.
 */
export function migrateLevelDocument(value: unknown): LevelDocument {
  if (typeof value !== 'object' || value === null) {
    throw new LevelMigrationError('关卡根节点必须是一个 JSON 对象。');
  }
  const schemaVersion = (value as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion !== 1) {
    throw new LevelMigrationError(`不支持的 schemaVersion：${String(schemaVersion)}。当前仅支持 1。`);
  }
  try {
    return parseLevelDocument(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new LevelMigrationError('关卡 JSON 结构无效。', error.issues.map((issue) => `${issue.path.join('.') || 'root'}：${issue.message}`));
    }
    throw error;
  }
}
