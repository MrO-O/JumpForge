import type { AbilityId } from '../abilities/abilityTypes';

export type TileId =
  | 'empty'
  | 'solid'
  | 'oneWayPlatform'
  | 'spike'
  | 'spawn'
  | 'goal'
  | 'spring'
  | 'key'
  | 'lockedDoor'
  | 'switch'
  | 'switchDoor'
  | 'dashCrystal'
  | 'dashBlock'
  | 'climbWall'
  | 'staminaRefill';

export type TileCategory = 'terrain' | 'hazard' | 'marker' | 'interaction' | 'ability';
export type CollisionKind = 'none' | 'solid' | 'oneWay';
export type RuntimeTileKind = TileId;

export interface TileEditorVisual {
  color: string;
  glyph: string;
  label: string;
  paletteOrder: number;
}

export interface TileDefinition {
  id: TileId;
  name: string;
  category: TileCategory;
  collision: CollisionKind;
  hazardous: boolean;
  interactive: boolean;
  requiredAbilities?: AbilityId[];
  tags: string[];
  editor: TileEditorVisual;
  runtime: { kind: RuntimeTileKind };
}

export type TileRegistry = Readonly<Record<TileId, TileDefinition>>;
