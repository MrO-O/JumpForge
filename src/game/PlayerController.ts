import Phaser from 'phaser';

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
};

export type PlayerBody = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export class PlayerController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpBufferedUntil = Number.NEGATIVE_INFINITY;
  private enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: PlayerBody,
    readonly tuning: Readonly<PlayerTuning> = defaultPlayerTuning,
  ) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.player.body.setMaxVelocity(tuning.moveSpeed, tuning.maxFallSpeed);
    this.player.body.setCollideWorldBounds(true);
  }

  update(deltaMs: number): void {
    if (!this.enabled) return;
    const body = this.player.body;
    const now = this.scene.time.now;
    const deltaSeconds = Math.min(deltaMs, 50) / 1000;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGroundedAt = now;

    if (Phaser.Input.Keyboard.JustDown(this.jumpKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.jumpBufferedUntil = now + this.tuning.jumpBufferMs;
    }

    const direction = Number(this.cursors.right?.isDown) - Number(this.cursors.left?.isDown);
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
    if (!this.enabled) return;
    if (this.player.body.velocity.y >= 0) this.player.body.setVelocityY(-this.tuning.springVelocity);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.player.body.setVelocity(0, 0);
  }

  reset(): void {
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpBufferedUntil = Number.NEGATIVE_INFINITY;
    this.enabled = true;
    this.player.body.setVelocity(0, 0);
  }
}
