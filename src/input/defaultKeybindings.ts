import type { InputAction, KeyBinding, KeyBindingMap } from './inputTypes';

export const supportedKeyCodes = [
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Space', 'ShiftLeft', 'ShiftRight', 'Escape', 'Enter', 'Backspace',
  ...Array.from({ length: 26 }, (_, index) => `Key${String.fromCharCode(65 + index)}`),
  ...Array.from({ length: 10 }, (_, index) => `Digit${index}`),
] as const;

const supportedKeyCodeSet = new Set<string>(supportedKeyCodes);

export const defaultKeybindings: KeyBindingMap = {
  moveLeft: { primary: 'ArrowLeft', secondary: 'KeyA' },
  moveRight: { primary: 'ArrowRight', secondary: 'KeyD' },
  moveUp: { primary: 'ArrowUp', secondary: 'KeyW' },
  moveDown: { primary: 'ArrowDown', secondary: 'KeyS' },
  jump: { primary: 'Space' },
  dash: { primary: 'ShiftLeft', secondary: 'KeyX' },
  grab: { primary: 'KeyC', secondary: 'KeyZ' },
  restart: { primary: 'KeyR' },
  exitTest: { primary: 'Escape' },
};

export function isSupportedKeyCode(value: unknown): value is string {
  return typeof value === 'string' && supportedKeyCodeSet.has(value);
}

export function cloneKeyBinding(binding: KeyBinding): KeyBinding {
  return binding.secondary ? { primary: binding.primary, secondary: binding.secondary } : { primary: binding.primary };
}

export function createDefaultKeybindings(): KeyBindingMap {
  return Object.fromEntries(
    Object.entries(defaultKeybindings).map(([action, binding]) => [action, cloneKeyBinding(binding)]),
  ) as KeyBindingMap;
}

export function fallbackPrimary(action: InputAction, usedCodes: ReadonlySet<string>): string {
  const preferred = [defaultKeybindings[action].primary, defaultKeybindings[action].secondary, ...supportedKeyCodes];
  return preferred.find((code): code is string => code !== undefined && !usedCodes.has(code)) ?? defaultKeybindings[action].primary;
}
