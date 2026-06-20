import { z } from 'zod';
import { abilityIds } from '../abilities/abilityTypes';
import { CURRENT_SCHEMA_VERSION, type LevelDocument } from './levelTypes';
import { tileRegistry } from '../tiles/tileRegistry';

const tileIds = Object.keys(tileRegistry) as [string, ...string[]];

export const tileLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal('tile'),
  visible: z.boolean(),
  tiles: z.array(z.enum(tileIds)),
});

export const levelSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileSize: z.number().int().positive(),
  enabledAbilities: z.array(z.enum(abilityIds)),
  layers: z.array(tileLayerSchema).min(1),
  metadata: z.object({
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
}).strict();

export function parseLevelDocument(value: unknown): LevelDocument {
  return levelSchema.parse(value) as LevelDocument;
}
