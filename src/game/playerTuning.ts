export interface PlayerTuning {
  maxMoveSpeed: number;
  acceleration: number;
  groundDrag: number;
  airAcceleration: number;
  airDrag: number;
  jumpVelocity: number;
  gravity: number;
  fallGravityMultiplier: number;
  lowJumpMultiplier: number;
  maxFallSpeed: number;
  coyoteTimeMs: number;
  jumpBufferMs: number;
  deathMargin: number;
  respawnDelayMs: number;
  springVelocity: number;
  dashSpeed: number;
  dashDurationMs: number;
  dashEndSpeedRetention: number;
  dashCooldownMs: number;
}

export type PlayerTuningKey = keyof PlayerTuning;

export interface PlayerTuningBound {
  min: number;
  max: number;
  step: number;
}

export const playerTuningBounds: Record<PlayerTuningKey, PlayerTuningBound> = {
  maxMoveSpeed: { min: 80, max: 500, step: 10 },
  acceleration: { min: 200, max: 3000, step: 50 },
  groundDrag: { min: 200, max: 4000, step: 50 },
  airAcceleration: { min: 100, max: 2500, step: 50 },
  airDrag: { min: 0, max: 2500, step: 50 },
  jumpVelocity: { min: 150, max: 700, step: 10 },
  gravity: { min: 200, max: 3000, step: 50 },
  fallGravityMultiplier: { min: 1, max: 3, step: 0.1 },
  lowJumpMultiplier: { min: 0.2, max: 1, step: 0.05 },
  maxFallSpeed: { min: 300, max: 1600, step: 20 },
  coyoteTimeMs: { min: 0, max: 250, step: 10 },
  jumpBufferMs: { min: 0, max: 250, step: 10 },
  deathMargin: { min: 32, max: 320, step: 16 },
  respawnDelayMs: { min: 0, max: 2000, step: 50 },
  springVelocity: { min: 200, max: 1200, step: 10 },
  dashSpeed: { min: 200, max: 1400, step: 20 },
  dashDurationMs: { min: 50, max: 600, step: 10 },
  dashEndSpeedRetention: { min: 0, max: 1, step: 0.05 },
  dashCooldownMs: { min: 0, max: 750, step: 10 },
};

export const editablePlayerTuningKeys = [
  'maxMoveSpeed', 'acceleration', 'airAcceleration', 'jumpVelocity', 'gravity',
  'fallGravityMultiplier', 'lowJumpMultiplier', 'coyoteTimeMs', 'jumpBufferMs',
  'dashSpeed', 'dashDurationMs', 'dashEndSpeedRetention', 'springVelocity',
] as const satisfies readonly PlayerTuningKey[];

export const playerTuningLabels: Record<PlayerTuningKey, string> = {
  maxMoveSpeed: '最大移动速度',
  acceleration: '地面加速度',
  groundDrag: '地面减速',
  airAcceleration: '空中加速度',
  airDrag: '空中减速',
  jumpVelocity: '跳跃速度',
  gravity: '重力',
  fallGravityMultiplier: '下落重力倍率',
  lowJumpMultiplier: '短跳倍率',
  maxFallSpeed: '最大下落速度',
  coyoteTimeMs: '土狼时间（ms）',
  jumpBufferMs: '跳跃缓冲（ms）',
  deathMargin: '坠落死亡边距',
  respawnDelayMs: '重生延迟（ms）',
  springVelocity: '弹簧速度',
  dashSpeed: '冲刺速度',
  dashDurationMs: '冲刺时长（ms）',
  dashEndSpeedRetention: '冲刺结束速度保留',
  dashCooldownMs: '冲刺冷却（ms）',
};

export function clampPlayerTuningValue(key: PlayerTuningKey, value: number): number {
  const { min, max } = playerTuningBounds[key];
  return Math.min(max, Math.max(min, value));
}

/** Makes runtime tuning safe even when a document was not validated by the editor first. */
export function sanitizePlayerTuning(candidate: Partial<Record<PlayerTuningKey, unknown>>, fallback: PlayerTuning): PlayerTuning {
  const sanitized = { ...fallback };
  for (const key of Object.keys(playerTuningBounds) as PlayerTuningKey[]) {
    const value = candidate[key];
    if (typeof value === 'number' && Number.isFinite(value)) sanitized[key] = clampPlayerTuningValue(key, value);
  }
  return sanitized;
}
