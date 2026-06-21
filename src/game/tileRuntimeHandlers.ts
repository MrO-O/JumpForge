import Phaser from 'phaser';
import type { PlayerBody, PlayerController, WallContact } from './PlayerController';
import type { DashBlockCluster, RuntimeLevelBuildResult, RuntimeTileEntity } from './RuntimeLevelBuilder';
import { toCellKey, type RuntimeCellKey, type RuntimeLevelState } from './runtimeTypes';

export interface TileRuntimeHandlerCallbacks {
  onDeath: (message: string) => void;
  onComplete: () => void;
  onMessage: (message: string) => void;
}

function getEntity(result: RuntimeLevelBuildResult, object: unknown): RuntimeTileEntity | undefined {
  const candidate = object as { getData?: (key: string) => unknown; gameObject?: { getData?: (key: string) => unknown } };
  const cellKey = (candidate.getData?.('runtimeCellKey') ?? candidate.gameObject?.getData?.('runtimeCellKey')) as RuntimeCellKey | undefined;
  return cellKey ? result.entitiesByCell.get(cellKey) : undefined;
}

function getDashBlockCluster(result: RuntimeLevelBuildResult, object: unknown): DashBlockCluster | undefined {
  const candidate = object as { getData?: (key: string) => unknown; gameObject?: { getData?: (key: string) => unknown } };
  const id = (candidate.getData?.('dashBlockClusterId') ?? candidate.gameObject?.getData?.('dashBlockClusterId')) as string | undefined;
  return id ? result.dashBlockClusters.get(id) : undefined;
}

function setColliderEnabled(entity: RuntimeTileEntity, enabled: boolean): void {
  const body = entity.collider?.body as Phaser.Physics.Arcade.StaticBody | undefined;
  if (!body) return;
  body.enable = enabled;
  if (enabled) body.updateFromGameObject();
}

function setVisible(entity: RuntimeTileEntity, visible: boolean): void {
  entity.visual.setVisible(visible);
  entity.glyph.setVisible(visible);
}

function setCheckpointAppearance(entity: RuntimeTileEntity, active: boolean): void {
  entity.visual.setFillStyle(active ? 0xef4444 : entity.color);
  entity.visual.setAlpha(active ? 1 : 0.82);
  entity.glyph.setText('⚑');
  entity.glyph.setAlpha(1);
}

function setClusterColliderEnabled(cluster: DashBlockCluster, enabled: boolean): void {
  const body = cluster.collider.body as Phaser.Physics.Arcade.StaticBody | undefined;
  if (!body) return;
  body.enable = enabled;
  if (enabled) body.updateFromGameObject();
}

/** Concentrates tile interaction state and Phaser collision wiring for Phase 4A/4B. */
export class TileRuntimeController {
  private readonly switchCooldowns = new Map<RuntimeCellKey, number>();
  private lastDoorPromptAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: PlayerBody,
    private readonly playerController: PlayerController,
    private readonly state: RuntimeLevelState,
    private readonly level: RuntimeLevelBuildResult,
    private readonly callbacks: TileRuntimeHandlerCallbacks,
  ) {}

  bind(): void {
    this.scene.physics.add.collider(this.player, this.level.solids);
    this.scene.physics.add.collider(this.player, this.level.climbWalls);
    this.scene.physics.add.collider(this.player, this.level.oneWayPlatforms, undefined, (_player, platform) => this.canLandOnOneWay(platform));
    this.scene.physics.add.collider(this.player, this.level.lockedDoors, (_player, door) => this.handleLockedDoor(door));
    this.scene.physics.add.collider(this.player, this.level.switchDoors);
    this.scene.physics.add.collider(this.player, this.level.dashBlocks, (_player, dashBlock) => this.handleDashBlock(dashBlock));
    this.scene.physics.add.overlap(this.player, this.level.spikes, () => this.callbacks.onDeath('You touched spikes.'));
    this.scene.physics.add.overlap(this.player, this.level.goals, () => this.callbacks.onComplete());
    this.scene.physics.add.collider(this.player, this.level.springs, (_player, spring) => this.handleSpring(spring));
    this.scene.physics.add.overlap(this.player, this.level.keys, (_player, key) => this.handleKey(key));
    this.scene.physics.add.overlap(this.player, this.level.switches, (_player, switchTile) => this.handleSwitch(switchTile));
    this.scene.physics.add.overlap(this.player, this.level.dashCrystals, (_player, crystal) => this.handleDashCrystal(crystal));
    this.scene.physics.add.overlap(this.player, this.level.staminaRefills, (_player, refill) => this.handleStaminaRefill(refill));
    this.scene.physics.add.overlap(this.player, this.level.checkpoints, (_player, checkpoint) => this.handleCheckpoint(checkpoint));
  }

  resetForAttempt(preserveCheckpoint = false): void {
    this.switchCooldowns.clear();
    this.lastDoorPromptAt = Number.NEGATIVE_INFINITY;
    for (const entity of this.level.entitiesByCell.values()) {
      switch (entity.kind) {
        case 'key':
          setVisible(entity, true);
          this.setTriggerEnabled(entity, true);
          break;
        case 'lockedDoor':
          setVisible(entity, true);
          setColliderEnabled(entity, true);
          break;
        case 'switch':
          entity.visual.setAlpha(1);
          entity.glyph.setAlpha(1);
          break;
        case 'switchDoor':
          entity.visual.setAlpha(1);
          entity.glyph.setAlpha(1);
          setColliderEnabled(entity, true);
          break;
        case 'dashCrystal':
          setVisible(entity, true);
          this.setTriggerEnabled(entity, true);
          break;
        case 'staminaRefill':
          setVisible(entity, true);
          this.setTriggerEnabled(entity, true);
          break;
        case 'checkpoint':
          setCheckpointAppearance(entity, preserveCheckpoint && entity.cellKey === this.state.activeCheckpointCell);
          break;
        default:
          break;
      }
    }
    for (const cluster of this.level.dashBlockClusters.values()) {
      setClusterColliderEnabled(cluster, true);
      for (const cellKey of cluster.cellKeys) {
        const entity = this.level.entitiesByCell.get(cellKey);
        if (entity) setVisible(entity, true);
      }
    }
  }

  /** A small tile-neighbour probe is more reliable than Arcade side flags for wall abilities. */
  getWallContact(): WallContact | null {
    const body = this.player.body;
    const side = body.blocked.right || body.touching.right ? 'right' : body.blocked.left || body.touching.left ? 'left' : null;
    if (!side) return null;
    const playerLeft = body.x;
    const playerRight = body.x + body.width;
    const playerTop = body.y;
    const playerBottom = body.y + body.height;
    const tileSize = this.level.tileSize;
    const cellX = Math.floor((side === 'right' ? playerRight + 1 : playerLeft - 1) / tileSize);
    const startY = Math.floor((playerTop + Math.max(2, body.height * 0.2)) / tileSize);
    const endY = Math.floor((playerBottom - Math.max(2, body.height * 0.2)) / tileSize);

    for (let cellY = startY; cellY <= endY; cellY += 1) {
      const cellKey = toCellKey(cellX, cellY);
      const staticTile = this.level.staticWallCells.get(cellKey);
      if (staticTile) return { side, climbable: staticTile === 'climbWall' };
      const dashBlockCluster = this.level.dashBlockClustersByCell.get(cellKey);
      if (dashBlockCluster && !dashBlockCluster.cellKeys.every((key) => this.state.brokenDashBlockCells.has(key))) {
        return { side, climbable: false };
      }
      const entity = this.level.entitiesByCell.get(cellKey);
      if (entity?.collider && this.isWallEntity(entity) && this.isColliderEnabled(entity)) {
        return { side, climbable: false };
      }
    }
    return null;
  }

  private handleKey(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity || this.state.collectedKeys.has(entity.cellKey)) return;
    this.state.collectedKeys.add(entity.cellKey);
    this.state.hiddenTileCells.add(entity.cellKey);
    this.state.keyCount += 1;
    setVisible(entity, false);
    this.setTriggerEnabled(entity, false);
    this.callbacks.onMessage('Key collected.');
  }

  private handleStaminaRefill(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity || this.state.consumedStaminaRefillCells.has(entity.cellKey)) return;
    this.state.consumedStaminaRefillCells.add(entity.cellKey);
    this.state.hiddenTileCells.add(entity.cellKey);
    this.playerController.refillStamina();
    setVisible(entity, false);
    this.setTriggerEnabled(entity, false);
    this.callbacks.onMessage('Stamina refilled.');
  }

  private handleCheckpoint(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity || this.state.activeCheckpointCell === entity.cellKey) return;
    this.state.activeCheckpointCell = entity.cellKey;
    this.state.activatedCheckpointCells.add(entity.cellKey);
    this.state.activeRespawnPosition = {
      x: entity.x,
      y: entity.y - this.level.tileSize * 0.15,
    };
    for (const candidate of this.level.entitiesByCell.values()) {
      if (candidate.kind === 'checkpoint') setCheckpointAppearance(candidate, candidate.cellKey === entity.cellKey);
    }
    this.callbacks.onMessage('Checkpoint reached.');
  }

  private handleLockedDoor(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity || this.state.openedLockedDoors.has(entity.cellKey)) return;
    if (this.state.keyCount <= 0) {
      if (this.scene.time.now - this.lastDoorPromptAt > 700) {
        this.lastDoorPromptAt = this.scene.time.now;
        this.callbacks.onMessage('Need a key.');
      }
      return;
    }
    this.state.keyCount -= 1;
    this.state.openedLockedDoors.add(entity.cellKey);
    this.state.hiddenTileCells.add(entity.cellKey);
    setVisible(entity, false);
    setColliderEnabled(entity, false);
    this.callbacks.onMessage('Door opened.');
  }

  private handleSwitch(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity) return;
    const availableAt = this.switchCooldowns.get(entity.cellKey) ?? Number.NEGATIVE_INFINITY;
    if (this.scene.time.now < availableAt) return;
    this.switchCooldowns.set(entity.cellKey, this.scene.time.now + 450);
    this.state.pressedSwitches.add(entity.cellKey);
    this.state.switchDoorsOpen = !this.state.switchDoorsOpen;
    for (const candidate of this.level.entitiesByCell.values()) {
      if (candidate.kind !== 'switchDoor') continue;
      const open = this.state.switchDoorsOpen;
      setColliderEnabled(candidate, !open);
      candidate.visual.setAlpha(open ? 0.22 : 1);
      candidate.glyph.setAlpha(open ? 0.22 : 1);
    }
    entity.visual.setAlpha(this.state.switchDoorsOpen ? 0.55 : 1);
    entity.glyph.setAlpha(this.state.switchDoorsOpen ? 0.55 : 1);
    this.callbacks.onMessage(`Switch doors ${this.state.switchDoorsOpen ? 'open' : 'closed'}.`);
  }

  private handleDashCrystal(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity || this.state.consumedDashCrystalCells.has(entity.cellKey)) return;
    this.state.consumedDashCrystalCells.add(entity.cellKey);
    this.state.hiddenTileCells.add(entity.cellKey);
    setVisible(entity, false);
    this.setTriggerEnabled(entity, false);
    this.playerController.refillDash();
    this.callbacks.onMessage('Dash refilled.');
  }

  private handleDashBlock(object: unknown): void {
    const cluster = getDashBlockCluster(this.level, object);
    if (!cluster || !this.playerController.isDashing || cluster.cellKeys.every((cellKey) => this.state.brokenDashBlockCells.has(cellKey))) return;
    for (const cellKey of cluster.cellKeys) {
      this.state.brokenDashBlockCells.add(cellKey);
      this.state.hiddenTileCells.add(cellKey);
      const entity = this.level.entitiesByCell.get(cellKey);
      if (entity) setVisible(entity, false);
    }
    setClusterColliderEnabled(cluster, false);
    this.callbacks.onMessage('Dash block cluster broken.');
  }

  private handleSpring(object: unknown): void {
    const entity = getEntity(this.level, object);
    if (!entity) return;
    const springBody = entity.collider?.body as Phaser.Physics.Arcade.StaticBody | undefined;
    if (!springBody) return;
    const playerBody = this.player.body;
    // Collider resolution aligns a successful top landing with springBody.top.
    // A side collision leaves the player's bottom below that top edge, so it blocks without bouncing.
    const fromAbove = playerBody.bottom <= springBody.top + 4 && this.player.y < entity.y;
    if (fromAbove) this.playerController.bounce();
  }

  private canLandOnOneWay(object: unknown): boolean {
    const entity = getEntity(this.level, object);
    const platformBody = entity?.collider?.body as Phaser.Physics.Arcade.StaticBody | undefined;
    if (!platformBody) return false;
    const playerBody = this.player.body;
    return playerBody.velocity.y >= 0 && playerBody.bottom <= platformBody.top + 8;
  }

  private setTriggerEnabled(entity: RuntimeTileEntity, enabled: boolean): void {
    const body = entity.trigger?.body as Phaser.Physics.Arcade.StaticBody | undefined;
    if (body) body.enable = enabled;
  }

  private isColliderEnabled(entity: RuntimeTileEntity): boolean {
    const body = entity.collider?.body as Phaser.Physics.Arcade.StaticBody | undefined;
    return body?.enable === true;
  }

  private isWallEntity(entity: RuntimeTileEntity): boolean {
    return entity.kind === 'solid'
      || entity.kind === 'spring'
      || entity.kind === 'lockedDoor'
      || entity.kind === 'switchDoor'
      || entity.kind === 'dashBlock'
      || entity.kind === 'climbWall';
  }
}
