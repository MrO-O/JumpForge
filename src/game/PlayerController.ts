import Phaser from 'phaser';
import type { RuntimeLevelState } from './runtimeTypes';

export interface PlayerTuning {
  moveSpeed: number;
  acceleration: number;
  drag: number;
  jumpVelocity: number;
  gravity: number;
  fallGravityMultiplier: number;
  jumpCutMultiplier: number;
  maxFallSpeed: number;
  coyoteTimeMs: number;
  jumpBufferMs: number;
  deathMargin: number;
  respawnDelayMs: number;
  springVelocity: number;
  dashSpeed: number;
  dashDurationMs: number;
  dashEndSpeedRetention: number;
  dashCooldownMs: number;
}

export const defaultPlayerTuning: Readonly<PlayerTuning> = {
  moveSpeed: 220,
  acceleration: 1800,
  drag: 2200,
  jumpVelocity: 420,
  gravity: 1350,
  fallGravityMultiplier: 1.7,
  jumpCutMultiplier: 0.48,
  maxFallSpeed: 760,
  coyoteTimeMs: 110,
  jumpBufferMs: 120,
  deathMargin: 96,
  respawnDelayMs: 650,
  springVelocity: 610,
  dashSpeed: 640,
  dashDurationMs: 210,
  dashEndSpeedRetention: 0.42,
  dashCooldownMs: 90,
};

export type PlayerBody = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export interface PlayerControllerOptions {
  dashEnabled: boolean;
  runtimeState: RuntimeLevelState;
  tuning?: Readonly<PlayerTuning>;
}

export class PlayerController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private readonly dashKeys: Phaser.Input.Keyboard.Key[];
  readonly tuning: Readonly<PlayerTuning>;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpBufferedUntil = Number.NEGATIVE_INFINITY;
  private enabled = true;
  private facingX = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: PlayerBody,
    private readonly options: PlayerControllerOptions,
  ) {
    this.tuning = options.tuning ?? defaultPlayerTuning;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dashKeys = [
      scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
    ];
    this.player.body.setMaxVelocity(this.tuning.dashSpeed, this.tuning.maxFallSpeed);
    this.player.body.setCollideWorldBounds(true);
  }

  get isDashing(): boolean {
    return this.options.runtimeState.isDashing;
  }

  get dashEnabled(): boolean {
    return this.options.dashEnabled;
  }

  get dashStatus(): 'Disabled' | 'Ready' | 'Used' | 'Dashing' {
    if (!this.dashEnabled) return 'Disabled';
    if (this.options.runtimeState.isDashing) return 'Dashing';
    return this.options.runtimeState.dashAvailable ? 'Ready' : 'Used';
  }

  update(deltaMs: number): void {
    if (!this.enabled) return;
    const state = this.options.runtimeState;
    const body = this.player.body;
    const now = this.scene.time.now;
    const deltaSeconds = Math.min(deltaMs, 50) / 1000;
    const grounded = body.blocked.down || body.touching.down;

    if (state.isDashing) {
      this.updateDash(deltaMs);
      return;
    }

    if (grounded) {
      this.lastGroundedAt = now;
      if (this.dashEnabled) state.dashAvailable = true;
    }
    if (this.dashEnabled && this.isDashPressed() && state.dashAvailable && now >= state.dashCooldownMs) {
      this.startDash(now);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.jumpKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.jumpBufferedUntil = now + this.tuning.jumpBufferMs;
    }

    const direction = Number(this.cursors.right?.isDown) - Number(this.cursors.left?.isDown);
    if (direction !== 0) this.facingX = direction;
    const targetVelocity = direction * this.tuning.moveSpeed;
    const horizontalRate = direction === 0 ? this.tuning.drag : this.tuning.acceleration;
    body.setVelocityX(Phaser.Math.Linear(body.velocity.x, targetVelocity, Math.min(1, horizontalRate * deltaSeconds / this.tuning.moveSpeed)));

    const canJump = now <= this.jumpBufferedUntil && now - this.lastGroundedAt <= this.tuning.coyoteTimeMs;
    if (canJump) {
      body.setVelocityY(-this.tuning.jumpVelocity);
      this.jumpBufferedUntil = Number.NEGATIVE_INFINITY;
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    }

    if ((Phaser.Input.Keyboard.JustUp(this.jumpKey) || Phaser.Input.Keyboard.JustUp(this.cursors.up!)) && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * this.tuning.jumpCutMultiplier);
    }
    const holdingJump = this.jumpKey.isDown || this.cursors.up?.isDown;
    const gravityMultiplier = body.velocity.y < 0 && holdingJump ? 1 : this.tuning.fallGravityMultiplier;
    body.setVelocityY(Math.min(this.tuning.maxFallSpeed, body.velocity.y + this.tuning.gravity * gravityMultiplier * deltaSeconds));
  }

  bounce(): void {
    if (!this.enabled || this.options.runtimeState.isDashing) return;
    if (this.player.body.velocity.y >= 0) this.player.body.setVelocityY(-this.tuning.springVelocity);
  }

  refillDash(): void {
    if (!this.dashEnabled) return;
    this.options.runtimeState.dashAvailable = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.options.runtimeState.isDashing = false;
      this.options.runtimeState.dashDirection = null;
      this.options.runtimeState.dashTimeRemainingMs = 0;
      this.player.body.setVelocity(0, 0);
    }
  }

  reset(): void {
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpBufferedUntil = Number.NEGATIVE_INFINITY;
    this.enabled = true;
    this.facingX = 1;
    const state = this.options.runtimeState;
    state.dashAvailable = this.dashEnabled;
    state.isDashing = false;
    state.dashDirection = null;
    state.dashTimeRemainingMs = 0;
    state.dashCooldownMs = 0;
    state.lastDashStartedAt = null;
    this.player.body.setVelocity(0, 0);
  }

  private isDashPressed(): boolean {
    return this.dashKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  private startDash(now: number): void {
    const state = this.options.runtimeState;
    const x = Number(this.cursors.right?.isDown) - Number(this.cursors.left?.isDown);
    const y = Number(this.cursors.down?.isDown) - Number(this.cursors.up?.isDown);
    const direction = new Phaser.Math.Vector2(x, y);
    if (direction.lengthSq() === 0) direction.set(this.facingX, 0);
    direction.normalize();
    if (direction.x !== 0) this.facingX = Math.sign(direction.x);
    state.dashAvailable = false;
    state.isDashing = true;
    state.dashDirection = { x: direction.x, y: direction.y };
    state.dashTimeRemainingMs = this.tuning.dashDurationMs;
    state.dashCooldownMs = now + this.tuning.dashCooldownMs;
    state.lastDashStartedAt = now;
    state.currentMessage = 'Dash!';
    this.player.body.setVelocity(direction.x * this.tuning.dashSpeed, direction.y * this.tuning.dashSpeed);
  }

  private updateDash(deltaMs: number): void {
    const state = this.options.runtimeState;
    const direction = state.dashDirection;
    if (!direction) {
      this.endDash();
      return;
    }
    state.dashTimeRemainingMs -= deltaMs;
    this.player.body.setVelocity(direction.x * this.tuning.dashSpeed, direction.y * this.tuning.dashSpeed);
    if (state.dashTimeRemainingMs <= 0) this.endDash();
  }

  private endDash(): void {
    const state = this.options.runtimeState;
    const direction = state.dashDirection;
    if (direction) this.player.body.setVelocity(direction.x * this.tuning.dashSpeed * this.tuning.dashEndSpeedRetention, direction.y * this.tuning.dashSpeed * this.tuning.dashEndSpeedRetention);
    state.isDashing = false;
    state.dashDirection = null;
    state.dashTimeRemainingMs = 0;
  }
}
