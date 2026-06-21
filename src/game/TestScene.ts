import Phaser from 'phaser';
import { formatKeyBinding } from '../input/keybindingLabels';
import type { KeyBindingMap } from '../input/inputTypes';
import { GameInput } from './GameInput';
import { resolveMovementProfile } from './movementPresets';
import type { LevelDocument } from '../levels/levelTypes';
import { configurePlayerCollisionBody, PlayerController, type PlayerBody } from './PlayerController';
import type { PlayerTuning } from './playerTuning';
import { buildRuntimeLevel, type RuntimeLevelBuildResult } from './RuntimeLevelBuilder';
import { resetRuntimeAttempt, createRuntimeLevelState, type RuntimeLevelState } from './runtimeTypes';
import { TileRuntimeController } from './tileRuntimeHandlers';

export interface TestSceneOptions {
  level: LevelDocument;
  keybindings: KeyBindingMap;
  onExit: () => void;
  onComplete?: () => void;
}

export class TestScene extends Phaser.Scene {
  private readonly options: TestSceneOptions;
  private state: RuntimeLevelState = createRuntimeLevelState();
  private builtLevel?: RuntimeLevelBuildResult;
  private player?: PlayerBody;
  private controller?: PlayerController;
  private gameInput?: GameInput;
  private tileRuntime?: TileRuntimeController;
  private hud?: Phaser.GameObjects.Text;
  private respawnEvent?: Phaser.Time.TimerEvent;
  private worldHeight = 0;
  private dashEnabled = false;
  private wallJumpEnabled = false;
  private wallClimbEnabled = false;
  private movementPresetName = 'Balanced';
  private movementTuning?: PlayerTuning;
  private mergedStaticColliderCount = 0;
  private dashBlockClusterCount = 0;

  constructor(options: TestSceneOptions) {
    super({ key: 'jumpforge-test-scene' });
    this.options = options;
  }

  create(): void {
    const { level } = this.options;
    this.dashEnabled = level.enabledAbilities.includes('dash');
    this.wallJumpEnabled = level.enabledAbilities.includes('wallJump');
    this.wallClimbEnabled = level.enabledAbilities.includes('wallClimb');
    const movement = resolveMovementProfile(level.movementProfile);
    const isCustomMovement = level.movementProfile?.tuningOverrides !== undefined;
    this.movementPresetName = isCustomMovement
      ? 'Custom'
      : movement.preset.name;
    this.movementTuning = movement.tuning;
    this.state = createRuntimeLevelState(this.dashEnabled);
    this.gameInput = new GameInput(this, this.options.keybindings);
    const worldWidth = level.width * level.tileSize;
    this.worldHeight = level.height * level.tileSize;
    this.cameras.main.setBackgroundColor('#0b1020');
    this.physics.world.setBounds(0, 0, worldWidth, this.worldHeight, true, true, true, false);
    this.builtLevel = buildRuntimeLevel(this, level);
    this.mergedStaticColliderCount = this.builtLevel.mergedStaticColliderCount;
    this.dashBlockClusterCount = this.builtLevel.dashBlockClusters.size;
    this.state.spawnPosition = this.builtLevel.spawnPosition;
    this.hud = this.add.text(14, 12, '', {
      color: '#e5edf9', fontFamily: 'system-ui, sans-serif', fontSize: '14px', lineSpacing: 5,
      backgroundColor: '#10182acc', padding: { x: 9, y: 7 },
    }).setScrollFactor(0).setDepth(20);
    this.events.once('shutdown', this.shutdown, this);

    if (!this.builtLevel.spawnPosition || !this.builtLevel.goalPosition) {
      this.state.currentMessage = 'Runtime error: spawn or goal is missing. Return to the editor to fix this level.';
      this.refreshHud();
      this.add.text(worldWidth / 2, this.worldHeight / 2, '无法启动：缺少 spawn 或 goal', {
        color: '#fecaca', fontFamily: 'system-ui, sans-serif', fontSize: '20px', align: 'center',
      }).setOrigin(0.5);
      return;
    }

    this.createPlayer(this.builtLevel.spawnPosition.x, this.builtLevel.spawnPosition.y);
    this.tileRuntime = new TileRuntimeController(this, this.player!, this.controller!, this.state, this.builtLevel, {
      onDeath: (message) => this.killPlayer(message),
      onComplete: () => this.completeLevel(),
      onMessage: (message) => { this.state.currentMessage = message; },
    });
    this.tileRuntime.bind();
    this.cameras.main.setBounds(0, 0, worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player!, true, 0.12, 0.12);
    this.state.currentMessage = 'Reach the gold goal.';
    this.refreshHud();
  }

  update(_time: number, deltaMs: number): void {
    if (this.gameInput?.justDown('exitTest')) {
      this.exitToEditor();
      return;
    }
    if (this.gameInput?.justDown('restart')) this.restartLevel();
    if (!this.player || !this.controller || !this.builtLevel) return;
    this.state.elapsedMs += deltaMs;
    if (!this.state.isDead && !this.state.isComplete) {
      this.controller.update(deltaMs);
      if (this.player.y > this.worldHeight + this.controller.tuning.deathMargin) this.killPlayer('You fell out of the level.');
    }
    this.refreshHud();
  }

  private createPlayer(x: number, y: number): void {
    const size = this.options.level.tileSize;
    const player = this.add.rectangle(x, y, Math.round(size * 0.62), Math.round(size * 0.82), 0x60a5fa).setDepth(4) as PlayerBody;
    this.physics.add.existing(player);
    configurePlayerCollisionBody(player);
    this.player = player;
    this.controller = new PlayerController(this, player, {
      dashEnabled: this.dashEnabled,
      wallJumpEnabled: this.wallJumpEnabled,
      wallClimbEnabled: this.wallClimbEnabled,
      runtimeState: this.state,
      tuning: this.movementTuning ?? resolveMovementProfile(undefined).tuning,
      input: this.gameInput!,
      getWallContact: () => this.tileRuntime?.getWallContact() ?? null,
    });
  }

  private killPlayer(message: string): void {
    if (this.state.isDead || this.state.isComplete || !this.player || !this.controller) return;
    resetRuntimeAttempt(this.state, `${message} Respawning…`, this.dashEnabled);
    this.state.isDead = true;
    this.tileRuntime?.resetForAttempt();
    this.player.setFillStyle(0xef4444);
    this.controller.setEnabled(false);
    this.respawnEvent = this.time.delayedCall(this.controller.tuning.respawnDelayMs, () => this.respawnPlayer());
  }

  private respawnPlayer(): void {
    if (!this.player || !this.controller || !this.state.spawnPosition) return;
    this.player.setFillStyle(0x60a5fa);
    this.player.setPosition(this.state.spawnPosition.x, this.state.spawnPosition.y);
    this.player.body.reset(this.state.spawnPosition.x, this.state.spawnPosition.y);
    this.controller.reset();
    this.state.isDead = false;
    this.state.currentMessage = 'Respawned. Mechanisms reset.';
  }

  private completeLevel(): void {
    if (this.state.isDead || this.state.isComplete || !this.controller) return;
    this.state.isComplete = true;
    this.state.currentMessage = 'Level complete! Return to the editor when ready.';
    this.controller.setEnabled(false);
    this.options.onComplete?.();
  }

  private restartLevel(): void {
    const spawnPosition = this.state.spawnPosition;
    if (!this.player || !this.controller || !spawnPosition) return;
    this.respawnEvent?.remove(false);
    const nextRestartCount = this.state.restartCount + 1;
    resetRuntimeAttempt(this.state, 'Restarted. Mechanisms reset.', this.dashEnabled);
    this.state.spawnPosition = spawnPosition;
    this.state.restartCount = nextRestartCount;
    this.tileRuntime?.resetForAttempt();
    this.player.setFillStyle(0x60a5fa);
    this.player.setPosition(spawnPosition.x, spawnPosition.y);
    this.player.body.reset(spawnPosition.x, spawnPosition.y);
    this.controller.reset();
  }

  private exitToEditor(): void {
    this.options.onExit();
  }

  private shutdown(): void {
    this.respawnEvent?.remove(false);
    this.gameInput?.dispose();
    this.gameInput = undefined;
    this.controller?.setEnabled(false);
    this.tileRuntime = undefined;
  }

  private refreshHud(): void {
    const bindings = this.options.keybindings;
    this.hud?.setText([
      `${formatKeyBinding(bindings.moveLeft)} / ${formatKeyBinding(bindings.moveRight)} move · ${formatKeyBinding(bindings.jump)} / ${formatKeyBinding(bindings.moveUp)} jump`,
      `${formatKeyBinding(bindings.grab)} grab / climb · ${formatKeyBinding(bindings.restart)} restart · ${formatKeyBinding(bindings.exitTest)} return`,
      `Movement: ${this.movementPresetName}`,
      `${formatKeyBinding(bindings.dash)} dash · Dash: ${this.controller?.dashStatus ?? 'Disabled'}`,
      `Wall: ${this.state.isClimbing ? 'CLIMB' : this.state.isWallSliding ? 'SLIDE' : '—'} · Stamina: ${this.controller?.wallClimbEnabled ? `${Math.ceil(this.state.currentStamina)}/${Math.round(this.controller.tuning.maxStamina)}` : '—'}`,
      `Static collision rects: ${this.mergedStaticColliderCount} · Dash block clusters: ${this.dashBlockClusterCount}`,
      `Keys: ${this.state.keyCount} · Switch doors: ${this.state.switchDoorsOpen ? 'OPEN' : 'CLOSED'}`,
      this.state.currentMessage,
      `Time: ${(this.state.elapsedMs / 1000).toFixed(1)}s · Restarts: ${this.state.restartCount}`,
    ]);
  }
}
