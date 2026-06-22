import Phaser from 'phaser';
import { mergeDashBlockClusters, mergeStaticTileRects, type DashBlockClusterRect, type MergeableStaticTileId, type MergedStaticRect } from './collisionMerge';
import type { LevelDocument } from '../levels/levelTypes';
import { getTileDefinition } from '../tiles/tileRegistry';
import type { RuntimeTileKind, TileLocalBox } from '../tiles/tileTypes';
import { toCellKey, type RuntimeCellKey, type RuntimePosition } from './runtimeTypes';

export interface RuntimeTileEntity {
  cellKey: RuntimeCellKey;
  kind: RuntimeTileKind;
  x: number;
  y: number;
  cellX: number;
  cellY: number;
  collisionBox?: TileLocalBox;
  color: number;
  visual: Phaser.GameObjects.Rectangle;
  glyph: Phaser.GameObjects.Text;
  collider?: Phaser.GameObjects.Rectangle;
  trigger?: Phaser.GameObjects.Rectangle;
}

export interface DashBlockCluster {
  id: string;
  cellKeys: RuntimeCellKey[];
  collider: Phaser.GameObjects.Rectangle;
}

export interface RuntimeLevelBuildResult {
  solids: Phaser.Physics.Arcade.StaticGroup;
  oneWayPlatforms: Phaser.Physics.Arcade.StaticGroup;
  spikes: Phaser.Physics.Arcade.StaticGroup;
  goals: Phaser.Physics.Arcade.StaticGroup;
  springs: Phaser.Physics.Arcade.StaticGroup;
  keys: Phaser.Physics.Arcade.StaticGroup;
  lockedDoors: Phaser.Physics.Arcade.StaticGroup;
  switches: Phaser.Physics.Arcade.StaticGroup;
  switchDoors: Phaser.Physics.Arcade.StaticGroup;
  dashCrystals: Phaser.Physics.Arcade.StaticGroup;
  dashBlocks: Phaser.Physics.Arcade.StaticGroup;
  climbWalls: Phaser.Physics.Arcade.StaticGroup;
  staminaRefills: Phaser.Physics.Arcade.StaticGroup;
  checkpoints: Phaser.Physics.Arcade.StaticGroup;
  collectibleBerries: Phaser.Physics.Arcade.StaticGroup;
  timedPlatforms: Phaser.Physics.Arcade.StaticGroup;
  crumbleBlocks: Phaser.Physics.Arcade.StaticGroup;
  partialSolids: Phaser.Physics.Arcade.StaticGroup;
  spawnPosition: RuntimePosition | null;
  goalPosition: RuntimePosition | null;
  entitiesByCell: Map<RuntimeCellKey, RuntimeTileEntity>;
  staticWallCells: Map<RuntimeCellKey, MergeableStaticTileId>;
  mergedStaticColliderCount: number;
  tileSize: number;
  collectibleTotal: number;
  dashBlockClusters: Map<string, DashBlockCluster>;
  dashBlockClustersByCell: Map<RuntimeCellKey, DashBlockCluster>;
}

interface TileBuildContext {
  scene: Phaser.Scene;
  result: RuntimeLevelBuildResult;
  entity: RuntimeTileEntity;
  tileSize: number;
}

type TileBuildHandler = (context: TileBuildContext) => void;

function colorValue(color: string): number {
  return Phaser.Display.Color.HexStringToColor(color).color;
}

function createPhysicalTile(context: TileBuildContext, group: Phaser.Physics.Arcade.StaticGroup): Phaser.GameObjects.Rectangle {
  const box = context.entity.collisionBox ?? { x: 0, y: 0, width: 1, height: 1 };
  const rectangle = context.scene.add.rectangle(
    (context.entity.cellX + box.x + box.width / 2) * context.tileSize,
    (context.entity.cellY + box.y + box.height / 2) * context.tileSize,
    context.tileSize * box.width,
    context.tileSize * box.height,
    context.entity.color,
  ).setVisible(false);
  rectangle.setData('runtimeCellKey', context.entity.cellKey);
  context.scene.physics.add.existing(rectangle, true);
  group.add(rectangle);
  return rectangle;
}

function createMergedStaticCollider(scene: Phaser.Scene, result: RuntimeLevelBuildResult, rect: MergedStaticRect, tileSize: number): void {
  const width = rect.width * tileSize;
  const height = rect.height * tileSize;
  const rectangle = scene.add.rectangle((rect.x + rect.width / 2) * tileSize, (rect.y + rect.height / 2) * tileSize, width, height, 0x000000, 0).setVisible(false);
  scene.physics.add.existing(rectangle, true);
  (rect.tileId === 'climbWall' ? result.climbWalls : result.solids).add(rectangle);
  result.mergedStaticColliderCount += 1;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) result.staticWallCells.set(toCellKey(x, y), rect.tileId);
  }
}

function createDashBlockCluster(scene: Phaser.Scene, result: RuntimeLevelBuildResult, rect: DashBlockClusterRect, tileSize: number): void {
  const width = rect.width * tileSize;
  const height = rect.height * tileSize;
  const id = `dash-block-cluster-${result.dashBlockClusters.size}`;
  const collider = scene.add.rectangle((rect.x + rect.width / 2) * tileSize, (rect.y + rect.height / 2) * tileSize, width, height, 0x000000, 0).setVisible(false);
  collider.setData('dashBlockClusterId', id);
  scene.physics.add.existing(collider, true);
  result.dashBlocks.add(collider);
  const cluster: DashBlockCluster = { id, cellKeys: rect.cellKeys.map((cellKey) => cellKey as RuntimeCellKey), collider };
  result.dashBlockClusters.set(id, cluster);
  for (const cellKey of cluster.cellKeys) result.dashBlockClustersByCell.set(cellKey, cluster);
}

const tileBuildHandlers: Partial<Record<RuntimeTileKind, TileBuildHandler>> = {
  oneWayPlatform: (context) => { context.entity.collider = createPhysicalTile(context, context.result.oneWayPlatforms); },
  spike: (context) => { context.entity.trigger = createPhysicalTile(context, context.result.spikes); },
  goal: (context) => {
    context.result.goalPosition = { x: context.entity.x, y: context.entity.y };
    context.entity.trigger = createPhysicalTile(context, context.result.goals);
  },
  spring: (context) => {
    context.entity.collider = createPhysicalTile(context, context.result.springs);
  },
  spawn: (context) => { context.result.spawnPosition = { x: context.entity.x, y: context.entity.y }; },
  key: (context) => { context.entity.trigger = createPhysicalTile(context, context.result.keys); },
  lockedDoor: (context) => { context.entity.collider = createPhysicalTile(context, context.result.lockedDoors); },
  switch: (context) => { context.entity.trigger = createPhysicalTile(context, context.result.switches); },
  switchDoor: (context) => { context.entity.collider = createPhysicalTile(context, context.result.switchDoors); },
  dashCrystal: (context) => { context.entity.trigger = createPhysicalTile(context, context.result.dashCrystals); },
  staminaRefill: (context) => { context.entity.trigger = createPhysicalTile(context, context.result.staminaRefills); },
  checkpoint: (context) => { context.entity.trigger = createPhysicalTile(context, context.result.checkpoints); },
  collectibleBerry: (context) => {
    context.entity.trigger = createPhysicalTile(context, context.result.collectibleBerries);
    context.result.collectibleTotal += 1;
  },
  timedPlatform: (context) => { context.entity.collider = createPhysicalTile(context, context.result.timedPlatforms); },
  crumbleBlock: (context) => { context.entity.collider = createPhysicalTile(context, context.result.crumbleBlocks); },
};

function buildMergedPartialColliders(scene: Phaser.Scene, result: RuntimeLevelBuildResult): void {
  type Rect = { x: number; y: number; width: number; height: number; entities: RuntimeTileEntity[] };
  let rects: Rect[] = Array.from(result.entitiesByCell.values()).flatMap((entity) => {
    if (!entity.collisionBox) return [];
    const box = entity.collisionBox;
    return [{ x: (entity.cellX + box.x) * result.tileSize, y: (entity.cellY + box.y) * result.tileSize, width: box.width * result.tileSize, height: box.height * result.tileSize, entities: [entity] }];
  });
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i]; const b = rects[j];
      const vertical = a.x === b.x && a.width === b.width && (a.y + a.height === b.y || b.y + b.height === a.y);
      const horizontal = a.y === b.y && a.height === b.height && (a.x + a.width === b.x || b.x + b.width === a.x);
      if (!vertical && !horizontal) continue;
      const next: Rect = vertical ? { x: a.x, y: Math.min(a.y, b.y), width: a.width, height: a.height + b.height, entities: [...a.entities, ...b.entities] } : { x: Math.min(a.x, b.x), y: a.y, width: a.width + b.width, height: a.height, entities: [...a.entities, ...b.entities] };
      rects = rects.filter((_, index) => index !== i && index !== j); rects.push(next); merged = true; break outer;
    }
  }
  for (const rect of rects) {
    const collider = scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x000000, 0).setVisible(false);
    scene.physics.add.existing(collider, true); result.partialSolids.add(collider);
    for (const entity of rect.entities) entity.collider = collider;
  }
}

/** Builds registry-driven visuals and physics primitives; behavior is bound by tileRuntimeHandlers. */
export function buildRuntimeLevel(scene: Phaser.Scene, level: LevelDocument): RuntimeLevelBuildResult {
  const result: RuntimeLevelBuildResult = {
    solids: scene.physics.add.staticGroup(),
    oneWayPlatforms: scene.physics.add.staticGroup(),
    spikes: scene.physics.add.staticGroup(),
    goals: scene.physics.add.staticGroup(),
    springs: scene.physics.add.staticGroup(),
    keys: scene.physics.add.staticGroup(),
    lockedDoors: scene.physics.add.staticGroup(),
    switches: scene.physics.add.staticGroup(),
    switchDoors: scene.physics.add.staticGroup(),
    dashCrystals: scene.physics.add.staticGroup(),
    dashBlocks: scene.physics.add.staticGroup(),
    climbWalls: scene.physics.add.staticGroup(),
    staminaRefills: scene.physics.add.staticGroup(),
    checkpoints: scene.physics.add.staticGroup(),
    collectibleBerries: scene.physics.add.staticGroup(),
    timedPlatforms: scene.physics.add.staticGroup(),
    crumbleBlocks: scene.physics.add.staticGroup(),
    partialSolids: scene.physics.add.staticGroup(),
    spawnPosition: null,
    goalPosition: null,
    entitiesByCell: new Map(),
    staticWallCells: new Map(),
    mergedStaticColliderCount: 0,
    tileSize: level.tileSize,
    collectibleTotal: 0,
    dashBlockClusters: new Map(),
    dashBlockClustersByCell: new Map(),
  };

  for (const layer of level.layers) {
    if (!layer.visible) continue;
    for (const [index, tileId] of layer.tiles.entries()) {
      const tile = getTileDefinition(tileId);
      if (!tile || tile.runtime.kind === 'empty') continue;
      const cellX = index % level.width;
      const cellY = Math.floor(index / level.width);
      const visualBox = tile.visualBox ?? tile.collisionBox ?? { x: 0, y: 0, width: 1, height: 1 };
      const x = (cellX + visualBox.x + visualBox.width / 2) * level.tileSize;
      const y = (cellY + visualBox.y + visualBox.height / 2) * level.tileSize;
      const color = colorValue(tile.editor.color);
      const entity: RuntimeTileEntity = {
        cellKey: toCellKey(cellX, cellY),
        kind: tile.runtime.kind,
        x,
        y,
        cellX,
        cellY,
        collisionBox: tile.collisionBox,
        color,
        visual: scene.add.rectangle(x, y, level.tileSize * visualBox.width, level.tileSize * visualBox.height, color).setDepth(0),
        glyph: scene.add.text(x, y, tile.editor.glyph, {
          color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontSize: `${Math.max(12, Math.floor(level.tileSize * 0.54))}px`,
        }).setOrigin(0.5).setDepth(1),
      };
      result.entitiesByCell.set(entity.cellKey, entity);
      tileBuildHandlers[entity.kind]?.({ scene, result, entity, tileSize: level.tileSize });
    }
    for (const rect of mergeStaticTileRects(layer.tiles, level.width, level.height)) {
      createMergedStaticCollider(scene, result, rect, level.tileSize);
    }
    for (const cluster of mergeDashBlockClusters(layer.tiles, level.width, level.height)) {
      createDashBlockCluster(scene, result, cluster, level.tileSize);
    }
  }
  buildMergedPartialColliders(scene, result);
  return result;
}
