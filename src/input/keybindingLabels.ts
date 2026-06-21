import type { InputAction, KeyBinding } from './inputTypes';

const labels: Record<string, string> = {
  ArrowLeft: 'Left Arrow',
  ArrowRight: 'Right Arrow',
  ArrowUp: 'Up Arrow',
  ArrowDown: 'Down Arrow',
  Space: 'Space',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  Escape: 'Esc',
  Enter: 'Enter',
  Backspace: 'Backspace',
};

export const inputActionLabels: Record<InputAction, string> = {
  moveLeft: 'Move left',
  moveRight: 'Move right',
  moveUp: 'Move up',
  moveDown: 'Move down',
  jump: 'Jump',
  dash: 'Dash',
  grab: 'Grab / climb',
  restart: 'Restart test',
  exitTest: 'Exit test',
};

export function keybindingLabel(code: string): string {
  if (labels[code]) return labels[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return code;
}

export function formatKeyBinding(binding: KeyBinding): string {
  return [binding.primary, binding.secondary].filter((code): code is string => Boolean(code)).map(keybindingLabel).join(' / ');
}
