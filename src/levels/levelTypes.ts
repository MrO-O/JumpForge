import type { AbilityId } from '../abilities/abilityTypes';
import type { TileId } from '../tiles/tileTypes';

export const CURRENT_SCHEMA_VERSION = 1 as const;
export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;

export interface TileLayerData {
  id: string;
  name: string;
  kind: 'tile';
  visible: boolean;
  tiles: TileId[];
}

export interface LevelMetadata {
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  tags?: string[];
}

export interface LevelDocument {
  schemaVersion: SchemaVersion;
  id: string;
  title: string;
  author?: string;
  width: number;
  height: number;
  tileSize: number;
  enabledAbilities: AbilityId[];
  layers: TileLayerData[];
  metadata?: LevelMetadata;
}

export interface LevelValidationIssue {
  path: string;
  message: string;
}

export interface LevelValidationResult {
  valid: boolean;
  errors: LevelValidationIssue[];
}
