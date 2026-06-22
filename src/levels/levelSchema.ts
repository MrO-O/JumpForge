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

const tuningOverridesSchema = z.object({
  maxMoveSpeed: z.number().finite().optional(),
  acceleration: z.number().finite().optional(),
  groundDrag: z.number().finite().optional(),
  airAcceleration: z.number().finite().optional(),
  airDrag: z.number().finite().optional(),
  jumpVelocity: z.number().finite().optional(),
  gravity: z.number().finite().optional(),
  fallGravityMultiplier: z.number().finite().optional(),
  lowJumpMultiplier: z.number().finite().optional(),
  maxFallSpeed: z.number().finite().optional(),
  coyoteTimeMs: z.number().finite().optional(),
  jumpBufferMs: z.number().finite().optional(),
  deathMargin: z.number().finite().optional(),
  respawnDelayMs: z.number().finite().optional(),
  springVelocity: z.number().finite().optional(),
  dashSpeed: z.number().finite().optional(),
  dashDurationMs: z.number().finite().optional(),
  dashEndSpeedRetention: z.number().finite().optional(),
  dashCooldownMs: z.number().finite().optional(),
  wallSlideMaxSpeed: z.number().finite().optional(),
  wallJumpHorizontalVelocity: z.number().finite().optional(),
  wallJumpVerticalVelocity: z.number().finite().optional(),
  wallJumpLockMs: z.number().finite().optional(),
  maxStamina: z.number().finite().optional(),
  climbUpSpeed: z.number().finite().optional(),
  climbDownSpeed: z.number().finite().optional(),
  climbStillCostPerSecond: z.number().finite().optional(),
  climbUpCostPerSecond: z.number().finite().optional(),
  climbStaminaRecoveryOnGround: z.number().finite().optional(),
  exhaustedWallSlideSpeed: z.number().finite().optional(),
}).strict();

const movementProfileSchema = z.object({
  presetId: z.string().min(1),
  customName: z.string().min(1).max(80).optional(),
  tuningOverrides: tuningOverridesSchema.optional(),
}).strict();

export const levelSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tileSize: z.number().int().positive(),
  enabledAbilities: z.array(z.enum(abilityIds)),
  movementProfile: movementProfileSchema.optional(),
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
