import type { TileDefinition } from '../tiles/tileTypes';
import { type AbilityDefinition, type AbilityId, type AbilityValidationResult } from './abilityTypes';

export const abilityRegistry: Readonly<Record<AbilityId, AbilityDefinition>> = {
  move: {
    id: 'move',
    name: '基础移动',
    description: '允许玩家左右移动。',
    defaultEnabled: true,
    status: 'implemented',
    configDefaults: { maxSpeed: 220, acceleration: 1800 },
  },
  jump: {
    id: 'jump',
    name: '基础跳跃',
    description: '允许玩家从地面起跳。',
    defaultEnabled: true,
    dependsOn: ['move'],
    status: 'implemented',
    configDefaults: { jumpVelocity: 420, coyoteTimeMs: 100, jumpBufferMs: 100 },
  },
  dash: {
    id: 'dash',
    name: '冲刺',
    description: '短时间向指定方向高速移动，可与 dash 专用 tile 联动。',
    defaultEnabled: false,
    dependsOn: ['move'],
    status: 'implemented',
    configDefaults: { speed: 640, durationMs: 210 },
  },
  wallJump: {
    id: 'wallJump',
    name: '蹬墙跳',
    description: '预留：从墙面跳离。',
    defaultEnabled: false,
    status: 'reserved',
  },
  doubleJump: {
    id: 'doubleJump',
    name: '二段跳',
    description: '预留：空中额外跳跃一次。',
    defaultEnabled: false,
    dependsOn: ['jump'],
    status: 'reserved',
  },
  carry: {
    id: 'carry',
    name: '携带',
    description: '预留：拾取、携带和投放对象。',
    defaultEnabled: false,
    status: 'reserved',
  },
};

export function getAbilityDefinition(abilityId: string): AbilityDefinition | undefined {
  return abilityRegistry[abilityId as AbilityId];
}

export function normalizeEnabledAbilities(abilityIdsToNormalize: readonly string[]): AbilityId[] {
  const known = abilityIdsToNormalize.filter((id): id is AbilityId => id in abilityRegistry);
  return [...new Set<AbilityId>(['move', 'jump', ...known])];
}

export function validateAbilities(abilityIdsToValidate: readonly string[]): AbilityValidationResult {
  const uniqueIds = [...new Set(abilityIdsToValidate)];
  const unknownAbilityIds = uniqueIds.filter((id) => !(id in abilityRegistry));
  const knownIds = uniqueIds.filter((id): id is AbilityId => id in abilityRegistry);
  const missingRequiredAbilityIds: AbilityId[] = [];

  for (const abilityId of knownIds) {
    for (const dependency of abilityRegistry[abilityId].dependsOn ?? []) {
      if (!knownIds.includes(dependency) && !missingRequiredAbilityIds.includes(dependency)) {
        missingRequiredAbilityIds.push(dependency);
      }
    }
  }

  return {
    valid: unknownAbilityIds.length === 0 && missingRequiredAbilityIds.length === 0,
    unknownAbilityIds,
    missingRequiredAbilityIds,
  };
}

export function abilitySupportsTile(tileDefinition: TileDefinition, abilityIdsToCheck: readonly string[]): boolean {
  const enabled = normalizeEnabledAbilities(abilityIdsToCheck);
  return (tileDefinition.requiredAbilities ?? []).every((abilityId) => enabled.includes(abilityId));
}
