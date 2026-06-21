import type { KeyBindingMap, InputAction } from '../input/inputTypes';

/** Converts the React-owned keybinding snapshot into frame-safe Phaser input queries. */
export class GameInput {
  private readonly downCodes = new Set<string>();
  private readonly pressedCodes = new Set<string>();
  private readonly releasedCodes = new Set<string>();

  constructor(private readonly scene: Phaser.Scene, private readonly bindings: KeyBindingMap) {
    scene.input.keyboard?.on('keydown', this.handleKeyDown);
    scene.input.keyboard?.on('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearState);
  }

  isDown(action: InputAction): boolean {
    return this.codesFor(action).some((code) => this.downCodes.has(code));
  }

  justDown(action: InputAction): boolean {
    return this.consume(this.pressedCodes, action);
  }

  justUp(action: InputAction): boolean {
    return this.consume(this.releasedCodes, action);
  }

  dispose(): void {
    this.scene.input.keyboard?.off('keydown', this.handleKeyDown);
    this.scene.input.keyboard?.off('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearState);
    this.clearState();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat) this.pressedCodes.add(event.code);
    this.downCodes.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.downCodes.delete(event.code);
    this.releasedCodes.add(event.code);
  };

  private readonly clearState = (): void => {
    this.downCodes.clear();
    this.pressedCodes.clear();
    this.releasedCodes.clear();
  };

  private codesFor(action: InputAction): string[] {
    const binding = this.bindings[action];
    return binding.secondary ? [binding.primary, binding.secondary] : [binding.primary];
  }

  private consume(events: Set<string>, action: InputAction): boolean {
    const codes = this.codesFor(action);
    const active = codes.some((code) => events.has(code));
    if (active) codes.forEach((code) => events.delete(code));
    return active;
  }
}
