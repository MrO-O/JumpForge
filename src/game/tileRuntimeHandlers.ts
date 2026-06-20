import Phaser from 'phaser';
import type { PlayerBody, PlayerController } from './PlayerController';
import type { RuntimeLevelBuildResult, RuntimeTileEntity } from './RuntimeLevelBuilder';
import type { RuntimeCellKey, RuntimeLevelState } from './runtimeTypes';

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
    this.scene.physics.add.collider(this.player, this.level.oneWayPlatforms, undefined, (_player, platform) => this.canLandOnOneWay(platform));
    this.scene.physics.add.collider(this.player, this.level.lockedDoors, (_player, door) => this.handleLockedDoor(door));
    this.scene.physics.add.collider(this.player, this.level.switchDoors);
    this.scene.physics.add.collider(this.player, this.level.dashBlocks, (_player, dashBlock) => this.handleDashBlock(dashBlock));
    this.scene.physics.add.overlap(this.player, this.level.spikes, () => this.callbacks.onDeath('You touched spikes.'));
    this.scene.physics.add.overlap(this.player, this.level.goals, () => this.callbacks.onComplete());
    this.scene.physics.add.overlap(this.player, this.level.springs, (_player, spring) => this.handleSpring(spring));
    this.scene.physics.add.overlap(this.player, this.level.keys, (_player, key) => this.handleKey(key));
    this.scene.physics.add.overlap(this.player, this.level.switches, (_player, switchTile) => this.handleSwitch(switchTile));
    this.scene.physics.add.overlap(this.player, this.level.dashCrystals, (_player, crystal) => this.handleDashCrystal(crystal));
  }

  resetForAttempt(): void {
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
        case 'dashBlock':
          setVisible(entity, true);
          setColliderEnabled(entity, true);
          break;
        default:
          break;
      }
    }
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
    const entity = getEntity(this.level, object);
    if (!entity || this.state.brokenDashBlockCells.has(entity.cellKey) || !this.playerController.isDashing) return;
    this.state.brokenDashBlockCells.add(entity.cellKey);
    this.state.hiddenTileCells.add(entity.cellKey);
    setVisible(entity, false);
    setColliderEnabled(entity, false);
    this.callbacks.onMessage('Dash block broken.');
  }

  private handleSpring(object: unknown): void {
    const entity = getEntity(this.level, object);
    const springBody = entity?.trigger?.body as Phaser.Physics.Arcade.StaticBody | undefined;
    if (!springBody) return;
    const playerBody = this.player.body;
    const fromAbove = playerBody.velocity.y >= 0 && playerBody.bottom <= springBody.top + playerBody.height * 0.55;
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
}
