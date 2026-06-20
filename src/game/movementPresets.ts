import type { MovementProfile } from '../levels/levelTypes';
import { playerTuningBounds, sanitizePlayerTuning, type PlayerTuning, type PlayerTuningKey } from './playerTuning';

export interface MovementPreset {
  id: string;
  name: string;
  description: string;
  recommendedFor?: string;
  tuning: Readonly<PlayerTuning>;
}

const balancedTuning: Readonly<PlayerTuning> = {
  maxMoveSpeed: 220,
  acceleration: 1800,
  groundDrag: 2200,
  airAcceleration: 1800,
  airDrag: 2200,
  jumpVelocity: 420,
  gravity: 1350,
  fallGravityMultiplier: 1.7,
  lowJumpMultiplier: 0.48,
  maxFallSpeed: 760,
  coyoteTimeMs: 110,
  jumpBufferMs: 120,
  deathMargin: 96,
  respawnDelayMs: 650,
  springVelocity: 610,
  dashSpeed: 640,
  dashDurationMs: 210,
  dashEndSpeedRetention: 0.42,
  dashCooldownMs: 90,
};

function tune(overrides: Partial<PlayerTuning>): Readonly<PlayerTuning> {
  return { ...balancedTuning, ...overrides };
}

export const movementPresetRegistry: Readonly<Record<string, MovementPreset>> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: '稳定通用的移动节奏，适合普通平台跳跃与编辑器测试。',
    recommendedFor: '通用关卡',
    tuning: balancedTuning,
  },
  precision: {
    id: 'precision',
    name: 'Precision',
    description: '更快起停，空中控制更直接，便于设计精密动作挑战。',
    recommendedFor: '精密跳跃',
    tuning: tune({ maxMoveSpeed: 235, acceleration: 2500, groundDrag: 3200, airAcceleration: 2400, airDrag: 2500, coyoteTimeMs: 85, jumpBufferMs: 100 }),
  },
  floaty: {
    id: 'floaty',
    name: 'Floaty',
    description: '重力较轻、滞空更明显，适合轻松探索与解谜路径。',
    recommendedFor: '探索与解谜',
    tuning: tune({ gravity: 980, fallGravityMultiplier: 1.35, jumpVelocity: 390, maxFallSpeed: 620, airAcceleration: 1500, airDrag: 1500, coyoteTimeMs: 135, jumpBufferMs: 140 }),
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy',
    description: '加速较慢、下落更有重量，适合厚重的平台节奏。',
    recommendedFor: '厚重平台感',
    tuning: tune({ maxMoveSpeed: 195, acceleration: 1050, groundDrag: 1500, airAcceleration: 800, airDrag: 1400, gravity: 1650, fallGravityMultiplier: 2.05, maxFallSpeed: 980, jumpVelocity: 450 }),
  },
  dashFocused: {
    id: 'dashFocused',
    name: 'Dash Focused',
    description: '冲刺速度与持续时间更突出，便于围绕水晶和破坏块设计路线。',
    recommendedFor: 'dashCrystal / dashBlock 关卡',
    tuning: tune({ dashSpeed: 780, dashDurationMs: 250, dashEndSpeedRetention: 0.5, dashCooldownMs: 70 }),
  },
};

export const defaultMovementProfile = (): MovementProfile => ({ presetId: 'balanced' });

export function getMovementPreset(id: string | undefined): MovementPreset | undefined {
  return id ? movementPresetRegistry[id] : undefined;
}

export function resolveMovementProfile(profile: MovementProfile | undefined): { preset: MovementPreset; tuning: PlayerTuning } {
  const requestedPreset = getMovementPreset(profile?.presetId);
  const preset = requestedPreset ?? movementPresetRegistry.balanced;
  return {
    preset,
    tuning: sanitizePlayerTuning(requestedPreset ? (profile?.tuningOverrides ?? {}) : {}, preset.tuning as PlayerTuning),
  };
}

export function validateMovementProfile(profile: MovementProfile | undefined): Array<{ path: string; message: string }> {
  if (!profile) return [];
  const issues: Array<{ path: string; message: string }> = [];
  if (!getMovementPreset(profile.presetId)) issues.push({ path: 'movementProfile.presetId', message: `未知 movement preset：${profile.presetId}` });
  for (const [key, value] of Object.entries(profile.tuningOverrides ?? {})) {
    const tuningKey = key as PlayerTuningKey;
    if (!(tuningKey in movementPresetRegistry.balanced.tuning)) {
      issues.push({ path: `movementProfile.tuningOverrides.${key}`, message: '未知调参字段。' });
      continue;
    }
    const { min, max } = playerTuningBounds[tuningKey];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({ path: `movementProfile.tuningOverrides.${key}`, message: '必须是有限数字。' });
    } else if (value < min || value > max) {
      issues.push({ path: `movementProfile.tuningOverrides.${key}`, message: `必须介于 ${min} 到 ${max}。` });
    }
  }
  return issues;
}
