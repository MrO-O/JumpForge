export const inputActions = [
  'moveLeft',
  'moveRight',
  'moveUp',
  'moveDown',
  'jump',
  'dash',
  'grab',
  'restart',
  'exitTest',
] as const;

export type InputAction = (typeof inputActions)[number];

export interface KeyBinding {
  primary: string;
  secondary?: string;
}

export type KeyBindingSlot = 'primary' | 'secondary';

export type KeyBindingMap = Record<InputAction, KeyBinding>;

export function isInputAction(value: string): value is InputAction {
  return inputActions.includes(value as InputAction);
}
