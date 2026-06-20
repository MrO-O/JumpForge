export const abilityIds = [
  'move',
  'jump',
  'dash',
  'wallJump',
  'wallClimb',
  'doubleJump',
  'carry',
] as const;

export type AbilityId = (typeof abilityIds)[number];
export type AbilityStatus = 'implemented' | 'planned-for-v1' | 'reserved';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  description: string;
  defaultEnabled: boolean;
  dependsOn?: AbilityId[];
  status: AbilityStatus;
  configDefaults?: Record<string, number | boolean>;
}

export interface AbilityValidationResult {
  valid: boolean;
  unknownAbilityIds: string[];
  missingRequiredAbilityIds: AbilityId[];
}
