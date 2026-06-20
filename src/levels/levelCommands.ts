import { abilityRegistry, validateAbilities } from '../abilities/abilityRegistry';
import { defaultMovementProfile, validateMovementProfile } from '../game/movementPresets';
import { getTileDefinition, isTileAllowedForAbilities } from '../tiles/tileRegistry';
import type { TileId } from '../tiles/tileTypes';
import { migrateLevelDocument } from './levelMigrations';
import { CURRENT_SCHEMA_VERSION, type LevelDocument, type LevelValidationResult, type TileLayerData } from './levelTypes';

const DEFAULT_WIDTH = 16;
const DEFAULT_HEIGHT = 10;
const DEFAULT_TILE_SIZE = 32;

export function createLevelId(prefix = 'level'): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

export function createEmptyLevel(overrides: Partial<Pick<LevelDocument, 'id' | 'title' | 'author' | 'width' | 'height' | 'tileSize' | 'enabledAbilities' | 'movementProfile'>> = {}): LevelDocument {
  const width = overrides.width ?? DEFAULT_WIDTH;
  const height = overrides.height ?? DEFAULT_HEIGHT;
  const now = new Date().toISOString();
  const tiles: TileId[] = Array(width * height).fill('empty');
  const set = (x: number, y: number, tile: TileId) => { tiles[y * width + x] = tile; };

  for (let x = 0; x < width; x += 1) set(x, height - 1, 'solid');
  set(1, Math.max(0, height - 2), 'spawn');
  set(Math.max(0, width - 2), Math.max(0, height - 2), 'goal');

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: overrides.id ?? createLevelId(),
    title: overrides.title ?? '未命名关卡',
    ...(overrides.author ? { author: overrides.author } : {}),
    width,
    height,
    tileSize: overrides.tileSize ?? DEFAULT_TILE_SIZE,
    enabledAbilities: overrides.enabledAbilities ?? ['move', 'jump'],
    movementProfile: overrides.movementProfile ?? defaultMovementProfile(),
    layers: [{ id: 'terrain', name: 'Terrain', kind: 'tile', visible: true, tiles }],
    metadata: { createdAt: now, updatedAt: now },
  };
}

function getLayer(level: LevelDocument, layerId: string): TileLayerData {
  const layer = level.layers.find((candidate) => candidate.id === layerId);
  if (!layer) throw new Error(`找不到图层：${layerId}`);
  return layer;
}

function getIndex(level: LevelDocument, x: number, y: number): number {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= level.width || y >= level.height) {
    throw new RangeError(`坐标超出地图范围：(${x}, ${y})。`);
  }
  return y * level.width + x;
}

export function getTileAt(level: LevelDocument, layerId: string, x: number, y: number): TileId {
  return getLayer(level, layerId).tiles[getIndex(level, x, y)];
}

export function setTileAt(level: LevelDocument, layerId: string, x: number, y: number, tileId: TileId): LevelDocument {
  if (!getTileDefinition(tileId)) throw new Error(`未知 tile：${tileId}`);
  const index = getIndex(level, x, y);
  return {
    ...level,
    layers: level.layers.map((layer) => layer.id === layerId ? { ...layer, tiles: layer.tiles.map((tile, tileIndex) => tileIndex === index ? tileId : tile) } : { ...layer, tiles: [...layer.tiles] }),
    metadata: { ...level.metadata, updatedAt: new Date().toISOString() },
  };
}

/** Places a tile while preserving the level-wide uniqueness of spawn and goal. */
export function placeTileAt(level: LevelDocument, layerId: string, x: number, y: number, tileId: TileId): LevelDocument {
  if (tileId !== 'spawn' && tileId !== 'goal') return setTileAt(level, layerId, x, y, tileId);
  const index = getIndex(level, x, y);
  const targetLayer = getLayer(level, layerId);
  return {
    ...level,
    layers: level.layers.map((layer) => {
      const tiles = layer.tiles.map((currentTile, tileIndex) => {
        if (layer.id === targetLayer.id && tileIndex === index) return tileId;
        if (currentTile === tileId) return 'empty';
        return currentTile;
      });
      return { ...layer, tiles };
    }),
    metadata: { ...level.metadata, updatedAt: new Date().toISOString() },
  };
}

export interface CroppedTile {
  layerId: string;
  x: number;
  y: number;
  tileId: TileId;
}

export function getNonEmptyTilesOutsideBounds(level: LevelDocument, newWidth: number, newHeight: number): CroppedTile[] {
  const cropped: CroppedTile[] = [];
  for (const layer of level.layers) {
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if ((x >= newWidth || y >= newHeight) && layer.tiles[y * level.width + x] !== 'empty') {
          cropped.push({ layerId: layer.id, x, y, tileId: layer.tiles[y * level.width + x] });
        }
      }
    }
  }
  return cropped;
}

export function resizeLevel(level: LevelDocument, newWidth: number, newHeight: number): LevelDocument {
  if (!Number.isInteger(newWidth) || !Number.isInteger(newHeight) || newWidth <= 0 || newHeight <= 0) {
    throw new RangeError('地图宽度和高度必须是正整数。');
  }
  return {
    ...level,
    width: newWidth,
    height: newHeight,
    layers: level.layers.map((layer) => {
      const tiles: TileId[] = Array(newWidth * newHeight).fill('empty');
      const copyWidth = Math.min(level.width, newWidth);
      const copyHeight = Math.min(level.height, newHeight);
      for (let y = 0; y < copyHeight; y += 1) {
        for (let x = 0; x < copyWidth; x += 1) tiles[y * newWidth + x] = layer.tiles[y * level.width + x];
      }
      return { ...layer, tiles };
    }),
    metadata: { ...level.metadata, updatedAt: new Date().toISOString() },
  };
}

export function cloneLevel(level: LevelDocument): LevelDocument {
  return structuredClone(level);
}

export function validateLevel(value: unknown): LevelValidationResult {
  const errors: LevelValidationResult['errors'] = [];
  let level: LevelDocument;
  try {
    level = migrateLevelDocument(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : '无法读取关卡数据。';
    const details = error instanceof Error && 'details' in error && Array.isArray(error.details) ? error.details : [];
    return { valid: false, errors: [{ path: 'root', message }, ...details.map((detail) => ({ path: 'schema', message: detail }))] };
  }

  if (level.width > 256 || level.height > 256) errors.push({ path: 'dimensions', message: 'v1 地图宽高不能超过 256。' });
  if (level.tileSize < 8 || level.tileSize > 128) errors.push({ path: 'tileSize', message: 'tileSize 必须介于 8 到 128。' });
  if (!level.enabledAbilities.includes('move')) errors.push({ path: 'enabledAbilities', message: 'enabledAbilities 必须包含 move。' });
  if (!level.enabledAbilities.includes('jump')) errors.push({ path: 'enabledAbilities', message: 'enabledAbilities 必须包含 jump。' });

  const abilityValidation = validateAbilities(level.enabledAbilities);
  for (const abilityId of abilityValidation.unknownAbilityIds) errors.push({ path: 'enabledAbilities', message: `未知能力：${abilityId}` });
  for (const abilityId of abilityValidation.missingRequiredAbilityIds) errors.push({ path: 'enabledAbilities', message: `能力依赖缺失：${abilityId}` });
  for (const abilityId of level.enabledAbilities) {
    const ability = abilityRegistry[abilityId];
    if (!ability) errors.push({ path: 'enabledAbilities', message: `未知能力：${abilityId}` });
  }

  errors.push(...validateMovementProfile(level.movementProfile));

  const seenLayerIds = new Set<string>();
  let spawnCount = 0;
  let goalCount = 0;
  for (const layer of level.layers) {
    if (seenLayerIds.has(layer.id)) errors.push({ path: `layers.${layer.id}`, message: '图层 id 必须唯一。' });
    seenLayerIds.add(layer.id);
    if (layer.tiles.length !== level.width * level.height) {
      errors.push({ path: `layers.${layer.id}.tiles`, message: `tiles 长度应为 ${level.width * level.height}，实际为 ${layer.tiles.length}。` });
    }
    for (const [index, tileId] of layer.tiles.entries()) {
      const tile = getTileDefinition(tileId);
      if (!tile) {
        errors.push({ path: `layers.${layer.id}.tiles.${index}`, message: `未知 tile：${tileId}` });
        continue;
      }
      if (tileId === 'spawn') spawnCount += 1;
      if (tileId === 'goal') goalCount += 1;
      if (!isTileAllowedForAbilities(tileId, level.enabledAbilities)) {
        errors.push({ path: `layers.${layer.id}.tiles.${index}`, message: `${tile.name} 需要启用 ${(tile.requiredAbilities ?? []).join(', ')}。` });
      }
    }
  }

  if (spawnCount !== 1) errors.push({ path: 'layers', message: `关卡必须有且只有一个 spawn，当前为 ${spawnCount} 个。` });
  if (goalCount !== 1) errors.push({ path: 'layers', message: `关卡必须有且只有一个 goal，当前为 ${goalCount} 个。` });
  return { valid: errors.length === 0, errors };
}
