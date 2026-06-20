import Phaser from 'phaser';
import type { LevelDocument } from '../levels/levelTypes';
import { PlayerController, type PlayerBody } from './PlayerController';
import { buildRuntimeLevel, type RuntimeLevelBuildResult } from './RuntimeLevelBuilder';
import { resetRuntimeAttempt, createRuntimeLevelState, type RuntimeLevelState } from './runtimeTypes';
import { TileRuntimeController } from './tileRuntimeHandlers';

export interface TestSceneOptions {
  level: LevelDocument;
  onExit: () => void;
  onComplete?: () => void;
}

export class TestScene extends Phaser.Scene {
  private readonly options: TestSceneOptions;
  private state: RuntimeLevelState = createRuntimeLevelState();
  private builtLevel?: RuntimeLevelBuildResult;
  private player?: PlayerBody;
  private controller?: PlayerController;
  private tileRuntime?: TileRuntimeController;
  private hud?: Phaser.GameObjects.Text;
  private respawnEvent?: Phaser.Time.TimerEvent;
  private worldHeight = 0;
  private dashEnabled = false;

  constructor(options: TestSceneOptions) {
    super({ key: 'jumpforge-test-scene' });
    this.options = options;
  }

  create(): void {
    const { level } = this.options;
    this.dashEnabled = level.enabledAbilities.includes('dash');
    this.state = createRuntimeLevelState(this.dashEnabled);
    const worldWidth = level.width * level.tileSize;
    this.worldHeight = level.height * level.tileSize;
    this.cameras.main.setBackgroundColor('#0b1020');
    this.physics.world.setBounds(0, 0, worldWidth, this.worldHeight, true, true, true, false);
    this.builtLevel = buildRuntimeLevel(this, level);
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
      this.input.keyboard?.once('keydown-ESC', this.exitToEditor, this);
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
    this.input.keyboard?.on('keydown-R', this.restartLevel, this);
    this.input.keyboard?.on('keydown-ESC', this.exitToEditor, this);
    this.state.currentMessage = 'Reach the gold goal.';
    this.refreshHud();
  }

  update(_time: number, deltaMs: number): void {
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
    player.body.setSize(Math.round(size * 0.62), Math.round(size * 0.82), true);
    this.player = player;
    this.controller = new PlayerController(this, player, { dashEnabled: this.dashEnabled, runtimeState: this.state });
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
    this.input.keyboard?.off('keydown-R', this.restartLevel, this);
    this.input.keyboard?.off('keydown-ESC', this.exitToEditor, this);
    this.controller?.setEnabled(false);
    this.tileRuntime = undefined;
  }

  private refreshHud(): void {
    this.hud?.setText([
      '← → move · Space / ↑ jump · R restart · Esc return',
      `Shift / X dash · Dash: ${this.controller?.dashStatus ?? 'Disabled'}`,
      `Keys: ${this.state.keyCount} · Switch doors: ${this.state.switchDoorsOpen ? 'OPEN' : 'CLOSED'}`,
      this.state.currentMessage,
      `Time: ${(this.state.elapsedMs / 1000).toFixed(1)}s · Restarts: ${this.state.restartCount}`,
    ]);
  }
}
