import { abilitySupportsTile } from '../abilities/abilityRegistry';
import type { AbilityId } from '../abilities/abilityTypes';
import type { TileCategory, TileDefinition, TileId, TileRegistry } from './tileTypes';

const defineTile = (definition: TileDefinition): TileDefinition => definition;

export const tileRegistry: TileRegistry = {
  empty: defineTile({ id: 'empty', name: '空白', category: 'terrain', collision: 'none', hazardous: false, interactive: false, tags: ['background'], editor: { color: '#172033', glyph: '·', label: '空白', paletteOrder: 0 }, runtime: { kind: 'empty' } }),
  solid: defineTile({ id: 'solid', name: '实体方块', category: 'terrain', collision: 'solid', hazardous: false, interactive: false, tags: ['platform', 'block'], editor: { color: '#64748b', glyph: '■', label: '方块', paletteOrder: 10 }, runtime: { kind: 'solid' } }),
  oneWayPlatform: defineTile({ id: 'oneWayPlatform', name: '单向平台', category: 'terrain', collision: 'oneWay', hazardous: false, interactive: false, tags: ['platform', 'one-way'], editor: { color: '#94a3b8', glyph: '━', label: '单向平台', paletteOrder: 20 }, runtime: { kind: 'oneWayPlatform' } }),
  spike: defineTile({ id: 'spike', name: '尖刺', category: 'hazard', collision: 'none', hazardous: true, interactive: false, tags: ['hazard', 'death'], editor: { color: '#ef4444', glyph: '▲', label: '尖刺', paletteOrder: 30 }, runtime: { kind: 'spike' } }),
  spawn: defineTile({ id: 'spawn', name: '出生点', category: 'marker', collision: 'none', hazardous: false, interactive: false, tags: ['marker', 'unique'], editor: { color: '#22c55e', glyph: '⚑', label: '出生点', paletteOrder: 40 }, runtime: { kind: 'spawn' } }),
  goal: defineTile({ id: 'goal', name: '终点', category: 'marker', collision: 'none', hazardous: false, interactive: true, tags: ['goal', 'unique'], editor: { color: '#fbbf24', glyph: '★', label: '终点', paletteOrder: 50 }, runtime: { kind: 'goal' } }),
  spring: defineTile({ id: 'spring', name: '弹簧', category: 'interaction', collision: 'solid', hazardous: false, interactive: true, tags: ['bounce', 'movement'], editor: { color: '#a855f7', glyph: '↟', label: '弹簧', paletteOrder: 60 }, runtime: { kind: 'spring' } }),
  key: defineTile({ id: 'key', name: '钥匙', category: 'interaction', collision: 'none', hazardous: false, interactive: true, tags: ['collectible', 'unlock'], editor: { color: '#eab308', glyph: '⚿', label: '钥匙', paletteOrder: 70 }, runtime: { kind: 'key' } }),
  lockedDoor: defineTile({ id: 'lockedDoor', name: '锁门', category: 'interaction', collision: 'solid', hazardous: false, interactive: true, tags: ['door', 'lock'], editor: { color: '#a16207', glyph: '▣', label: '锁门', paletteOrder: 80 }, runtime: { kind: 'lockedDoor' } }),
  switch: defineTile({ id: 'switch', name: '开关', category: 'interaction', collision: 'none', hazardous: false, interactive: true, tags: ['toggle', 'switch'], editor: { color: '#3b82f6', glyph: '⌾', label: '开关', paletteOrder: 90 }, runtime: { kind: 'switch' } }),
  switchDoor: defineTile({ id: 'switchDoor', name: '开关门', category: 'interaction', collision: 'solid', hazardous: false, interactive: false, tags: ['door', 'toggle'], editor: { color: '#06b6d4', glyph: '▥', label: '开关门', paletteOrder: 100 }, runtime: { kind: 'switchDoor' } }),
  dashCrystal: defineTile({ id: 'dashCrystal', name: '冲刺水晶', category: 'ability', collision: 'none', hazardous: false, interactive: true, requiredAbilities: ['dash'], tags: ['dash', 'refill'], editor: { color: '#22d3ee', glyph: '◇', label: '冲刺水晶', paletteOrder: 110 }, runtime: { kind: 'dashCrystal' } }),
  dashBlock: defineTile({ id: 'dashBlock', name: '冲刺破坏块', category: 'ability', collision: 'solid', hazardous: false, interactive: true, requiredAbilities: ['dash'], tags: ['dash', 'breakable'], editor: { color: '#8b5cf6', glyph: '▧', label: '冲刺破坏块', paletteOrder: 120 }, runtime: { kind: 'dashBlock' } }),
  climbWall: defineTile({ id: 'climbWall', name: '可攀墙面', category: 'ability', collision: 'solid', hazardous: false, interactive: true, requiredAbilities: ['wallClimb'], tags: ['wall', 'climb', 'ability'], editor: { color: '#0f766e', glyph: '╫', label: '可攀墙面', paletteOrder: 130 }, runtime: { kind: 'climbWall' } }),
  staminaRefill: defineTile({ id: 'staminaRefill', name: '体力补给', category: 'ability', collision: 'none', hazardous: false, interactive: true, requiredAbilities: ['wallClimb'], tags: ['stamina', 'refill', 'ability'], editor: { color: '#34d399', glyph: '✦', label: '体力补给', paletteOrder: 140 }, runtime: { kind: 'staminaRefill' } }),
  checkpoint: defineTile({ id: 'checkpoint', name: '检查点', category: 'interaction', collision: 'none', hazardous: false, interactive: true, tags: ['checkpoint', 'respawn'], editor: { color: '#f97316', glyph: '⚑', label: '检查点', paletteOrder: 145 }, runtime: { kind: 'checkpoint' } }),
  collectibleBerry: defineTile({ id: 'collectibleBerry', name: '可选莓果', category: 'interaction', collision: 'none', hazardous: false, interactive: true, tags: ['collectible', 'optional', 'score'], visualBox: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 }, editor: { color: '#fb7185', glyph: '◆', label: '莓果', paletteOrder: 147 }, runtime: { kind: 'collectibleBerry' } }),
  crumbleBlock: defineTile({ id: 'crumbleBlock', name: '碎裂平台', category: 'terrain', collision: 'solid', hazardous: false, interactive: true, tags: ['platform', 'crumble', 'timing'], editor: { color: '#b45309', glyph: '▧', label: '碎裂平台', paletteOrder: 150 }, runtime: { kind: 'crumbleBlock' } }),
  halfBlockTop: defineTile({ id: 'halfBlockTop', name: '半块（上）', category: 'terrain', collision: 'solid', hazardous: false, interactive: false, tags: ['platform', 'solid', 'partial', 'half'], collisionBox: { x: 0, y: 0, width: 1, height: 0.5 }, visualBox: { x: 0, y: 0, width: 1, height: 0.5 }, editor: { color: '#475569', glyph: '', label: '上', paletteOrder: 160 }, runtime: { kind: 'halfBlockTop' } }),
  halfBlockBottom: defineTile({ id: 'halfBlockBottom', name: '半块（下）', category: 'terrain', collision: 'solid', hazardous: false, interactive: false, tags: ['platform', 'solid', 'partial', 'half'], collisionBox: { x: 0, y: 0.5, width: 1, height: 0.5 }, visualBox: { x: 0, y: 0.5, width: 1, height: 0.5 }, editor: { color: '#475569', glyph: '', label: '下', paletteOrder: 161 }, runtime: { kind: 'halfBlockBottom' } }),
  halfBlockLeft: defineTile({ id: 'halfBlockLeft', name: '半块（左）', category: 'terrain', collision: 'solid', hazardous: false, interactive: false, tags: ['platform', 'solid', 'partial', 'half'], collisionBox: { x: 0, y: 0, width: 0.5, height: 1 }, visualBox: { x: 0, y: 0, width: 0.5, height: 1 }, editor: { color: '#475569', glyph: '', label: '左', paletteOrder: 162 }, runtime: { kind: 'halfBlockLeft' } }),
  halfBlockRight: defineTile({ id: 'halfBlockRight', name: '半块（右）', category: 'terrain', collision: 'solid', hazardous: false, interactive: false, tags: ['platform', 'solid', 'partial', 'half'], collisionBox: { x: 0.5, y: 0, width: 0.5, height: 1 }, visualBox: { x: 0.5, y: 0, width: 0.5, height: 1 }, editor: { color: '#475569', glyph: '', label: '右', paletteOrder: 163 }, runtime: { kind: 'halfBlockRight' } }),
};

export function getTileDefinition(tileId: string): TileDefinition | undefined {
  return tileRegistry[tileId as TileId];
}

export function listTilesByCategory(): Readonly<Record<TileCategory, TileDefinition[]>> {
  const categories: Record<TileCategory, TileDefinition[]> = {
    terrain: [], hazard: [], marker: [], interaction: [], ability: [],
  };
  for (const tile of Object.values(tileRegistry)) categories[tile.category].push(tile);
  for (const tiles of Object.values(categories)) tiles.sort((a, b) => a.editor.paletteOrder - b.editor.paletteOrder);
  return categories;
}

export function isTileAllowedForAbilities(tileId: string, enabledAbilities: readonly AbilityId[]): boolean {
  const tile = getTileDefinition(tileId);
  return tile !== undefined && abilitySupportsTile(tile, enabledAbilities);
}
