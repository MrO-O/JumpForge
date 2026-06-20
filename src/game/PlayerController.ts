import Phaser from 'phaser';
import type { RuntimeLevelState } from './runtimeTypes';
import type { PlayerTuning } from './playerTuning';

export type { PlayerTuning } from './playerTuning';
export interface WallContact {
  side: 'left' | 'right';
  climbable: boolean;
}

export type PlayerBody = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export interface PlayerControllerOptions {
  dashEnabled: boolean;
  wallJumpEnabled: boolean;
  wallClimbEnabled: boolean;
  runtimeState: RuntimeLevelState;
  tuning: Readonly<PlayerTuning>;
  getWallContact: () => WallContact | null;
}

export class PlayerController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private readonly grabKey: Phaser.Input.Keyboard.Key;
  private readonly dashKeys: Phaser.Input.Keyboard.Key[];
  readonly tuning: Readonly<PlayerTuning>;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpBufferedUntil = Number.NEGATIVE_INFINITY;
  private enabled = true;
  private facingX = 1;
  private wallJumpLockUntil = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: PlayerBody,
    private readonly options: PlayerControllerOptions,
  ) {
    this.tuning = options.tuning;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.grabKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.dashKeys = [
      scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
    ];
    this.player.body.setMaxVelocity(this.tuning.dashSpeed, this.tuning.maxFallSpeed);
    this.player.body.setCollideWorldBounds(true);
    this.options.runtimeState.currentStamina = this.tuning.maxStamina;
  }

  get isDashing(): boolean {
    return this.options.runtimeState.isDashing;
  }

  get dashEnabled(): boolean {
    return this.options.dashEnabled;
  }

  get wallClimbEnabled(): boolean {
    return this.options.wallClimbEnabled;
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
    const wallContact = grounded ? null : this.options.getWallContact();
    state.isWallSliding = false;
    state.isClimbing = false;
    state.wallSide = wallContact?.side ?? null;

    if (state.isDashing) {
      this.updateDash(deltaMs);
      return;
    }

    if (grounded) {
      this.lastGroundedAt = now;
      if (this.dashEnabled) state.dashAvailable = true;
      state.currentStamina = Math.min(this.tuning.maxStamina, state.currentStamina + this.tuning.climbStaminaRecoveryOnGround * deltaSeconds);
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

    const canJump = now <= this.jumpBufferedUntil && now - this.lastGroundedAt <= this.tuning.coyoteTimeMs;
    if (canJump) {
      body.setVelocityY(-this.tuning.jumpVelocity);
      this.jumpBufferedUntil = Number.NEGATIVE_INFINITY;
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    } else if (this.options.wallJumpEnabled && wallContact && now <= this.jumpBufferedUntil) {
      this.performWallJump(wallContact, now);
      return;
    }

    if (this.updateClimb(wallContact, deltaSeconds)) return;

    if (now >= this.wallJumpLockUntil) {
      const targetVelocity = direction * this.tuning.maxMoveSpeed;
      const horizontalRate = direction === 0
        ? (grounded ? this.tuning.groundDrag : this.tuning.airDrag)
        : (grounded ? this.tuning.acceleration : this.tuning.airAcceleration);
      body.setVelocityX(Phaser.Math.Linear(body.velocity.x, targetVelocity, Math.min(1, horizontalRate * deltaSeconds / this.tuning.maxMoveSpeed)));
    }

    if ((Phaser.Input.Keyboard.JustUp(this.jumpKey) || Phaser.Input.Keyboard.JustUp(this.cursors.up!)) && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * this.tuning.lowJumpMultiplier);
    }
    const holdingJump = this.jumpKey.isDown || this.cursors.up?.isDown;
    const gravityMultiplier = body.velocity.y < 0 && holdingJump ? 1 : this.tuning.fallGravityMultiplier;
    body.setVelocityY(Math.min(this.tuning.maxFallSpeed, body.velocity.y + this.tuning.gravity * gravityMultiplier * deltaSeconds));

    if (this.options.wallJumpEnabled && wallContact && body.velocity.y > 0) {
      state.isWallSliding = true;
      body.setVelocityY(Math.min(body.velocity.y, state.currentStamina <= 0 ? this.tuning.exhaustedWallSlideSpeed : this.tuning.wallSlideMaxSpeed));
    }
  }

  bounce(): void {
    if (!this.enabled || this.options.runtimeState.isDashing) return;
    if (this.player.body.velocity.y >= 0) this.player.body.setVelocityY(-this.tuning.springVelocity);
  }

  refillDash(): void {
    if (!this.dashEnabled) return;
    this.options.runtimeState.dashAvailable = true;
  }

  refillStamina(): void {
    if (!this.options.wallClimbEnabled) return;
    this.options.runtimeState.currentStamina = this.tuning.maxStamina;
    this.options.runtimeState.currentMessage = 'Stamina refilled.';
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
    this.wallJumpLockUntil = Number.NEGATIVE_INFINITY;
    const state = this.options.runtimeState;
    state.dashAvailable = this.dashEnabled;
    state.isDashing = false;
    state.dashDirection = null;
    state.dashTimeRemainingMs = 0;
    state.dashCooldownMs = 0;
    state.lastDashStartedAt = null;
    state.currentStamina = this.tuning.maxStamina;
    state.isWallSliding = false;
    state.isClimbing = false;
    state.wallSide = null;
    this.player.body.setVelocity(0, 0);
  }

  private isDashPressed(): boolean {
    return this.dashKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  private performWallJump(wallContact: WallContact, now: number): void {
    const direction = wallContact.side === 'left' ? 1 : -1;
    this.facingX = direction;
    this.player.body.setVelocity(direction * this.tuning.wallJumpHorizontalVelocity, -this.tuning.wallJumpVerticalVelocity);
    this.wallJumpLockUntil = now + this.tuning.wallJumpLockMs;
    this.jumpBufferedUntil = Number.NEGATIVE_INFINITY;
    this.options.runtimeState.isWallSliding = false;
    this.options.runtimeState.isClimbing = false;
    this.options.runtimeState.wallSide = null;
    this.options.runtimeState.currentMessage = 'Wall jump!';
  }

  private updateClimb(wallContact: WallContact | null, deltaSeconds: number): boolean {
    const state = this.options.runtimeState;
    if (!this.options.wallClimbEnabled || !wallContact?.climbable || !this.grabKey.isDown || state.currentStamina <= 0) return false;
    const up = this.cursors.up?.isDown ?? false;
    const down = this.cursors.down?.isDown ?? false;
    const cost = (up ? this.tuning.climbUpCostPerSecond : this.tuning.climbStillCostPerSecond) * deltaSeconds;
    state.currentStamina = Math.max(0, state.currentStamina - cost);
    if (state.currentStamina <= 0) {
      state.currentMessage = 'Stamina exhausted.';
      return false;
    }
    state.isClimbing = true;
    state.isWallSliding = false;
    state.wallSide = wallContact.side;
    this.player.body.setVelocityX(0);
    this.player.body.setVelocityY(up ? -this.tuning.climbUpSpeed : down ? this.tuning.climbDownSpeed : 0);
    return true;
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
