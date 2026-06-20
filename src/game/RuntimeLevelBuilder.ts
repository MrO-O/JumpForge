import Phaser from 'phaser';
import { mergeDashBlockClusters, mergeStaticTileRects, type DashBlockClusterRect, type MergeableStaticTileId, type MergedStaticRect } from './collisionMerge';
import type { LevelDocument } from '../levels/levelTypes';
import { getTileDefinition } from '../tiles/tileRegistry';
import type { RuntimeTileKind } from '../tiles/tileTypes';
import { toCellKey, type RuntimeCellKey, type RuntimePosition } from './runtimeTypes';

export interface RuntimeTileEntity {
  cellKey: RuntimeCellKey;
  kind: RuntimeTileKind;
  x: number;
  y: number;
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
  spawnPosition: RuntimePosition | null;
  goalPosition: RuntimePosition | null;
  entitiesByCell: Map<RuntimeCellKey, RuntimeTileEntity>;
  staticWallCells: Map<RuntimeCellKey, MergeableStaticTileId>;
  mergedStaticColliderCount: number;
  tileSize: number;
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
  const rectangle = context.scene.add.rectangle(context.entity.x, context.entity.y, context.tileSize, context.tileSize, context.entity.color).setVisible(false);
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
};

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
    spawnPosition: null,
    goalPosition: null,
    entitiesByCell: new Map(),
    staticWallCells: new Map(),
    mergedStaticColliderCount: 0,
    tileSize: level.tileSize,
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
      const x = cellX * level.tileSize + level.tileSize / 2;
      const y = cellY * level.tileSize + level.tileSize / 2;
      const color = colorValue(tile.editor.color);
      const entity: RuntimeTileEntity = {
        cellKey: toCellKey(cellX, cellY),
        kind: tile.runtime.kind,
        x,
        y,
        color,
        visual: scene.add.rectangle(x, y, level.tileSize, level.tileSize, color).setDepth(0),
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
  return result;
}
