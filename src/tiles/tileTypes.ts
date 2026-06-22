import type { AbilityId } from '../abilities/abilityTypes';

export type TileId =
  | 'empty'
  | 'solid'
  | 'oneWayPlatform'
  | 'spike'
  | 'spikeTop'
  | 'spikeBottom'
  | 'spikeLeft'
  | 'spikeRight'
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
  | 'staminaRefill'
  | 'checkpoint'
  | 'collectibleBerry'
  | 'timedPlatform'
  | 'movingPlatform'
  | 'crumbleBlock'
  | 'halfBlockTop'
  | 'halfBlockBottom'
  | 'halfBlockLeft'
  | 'halfBlockRight';

export type TileCategory = 'terrain' | 'hazard' | 'marker' | 'interaction' | 'ability';
export type CollisionKind = 'none' | 'solid' | 'oneWay';
export type RuntimeTileKind = TileId;

export interface TileLocalBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const spikeTileIds = ['spike', 'spikeTop', 'spikeBottom', 'spikeLeft', 'spikeRight'] as const;
export type SpikeTileId = (typeof spikeTileIds)[number];

export function isSpikeTileId(tileId: TileId): tileId is SpikeTileId {
  return spikeTileIds.includes(tileId as SpikeTileId);
}

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
  collisionBox?: TileLocalBox;
  /** Local damage area for hazardous tiles. Defaults to the full cell when omitted. */
  hazardBox?: TileLocalBox;
  visualBox?: TileLocalBox;
  editor: TileEditorVisual;
  runtime: { kind: RuntimeTileKind };
}

export type TileRegistry = Readonly<Record<TileId, TileDefinition>>;
