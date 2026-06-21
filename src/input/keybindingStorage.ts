import { createDefaultKeybindings, fallbackPrimary, isSupportedKeyCode } from './defaultKeybindings';
import { inputActions, type InputAction, type KeyBinding, type KeyBindingMap } from './inputTypes';

export const KEYBINDINGS_STORAGE_KEY = 'jumpforge:keybindings:v1';

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isBinding(value: unknown): value is Partial<KeyBinding> {
  return typeof value === 'object' && value !== null;
}

/** Restores missing actions, drops unknown actions, and makes every physical key unique. */
export function sanitizeKeybindings(raw: unknown): KeyBindingMap {
  const defaults = createDefaultKeybindings();
  const source = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const result = createDefaultKeybindings();
  const usedCodes = new Set<string>();

  for (const action of inputActions) {
    const candidate = source[action];
    const binding = isBinding(candidate) ? candidate : defaults[action];
    const requestedPrimary = binding.primary;
    const primary = isSupportedKeyCode(requestedPrimary) && !usedCodes.has(requestedPrimary)
      ? requestedPrimary
      : fallbackPrimary(action, usedCodes);
    usedCodes.add(primary);

    const requestedSecondary = binding.secondary;
    const secondary = isSupportedKeyCode(requestedSecondary)
      && requestedSecondary !== primary
      && !usedCodes.has(requestedSecondary)
      ? requestedSecondary
      : undefined;
    if (secondary) usedCodes.add(secondary);
    result[action] = secondary ? { primary, secondary } : { primary };
  }
  return result;
}

export function loadKeybindings(): KeyBindingMap {
  const storage = getStorage();
  if (!storage) return createDefaultKeybindings();
  const raw = storage.getItem(KEYBINDINGS_STORAGE_KEY);
  if (!raw) return createDefaultKeybindings();
  try {
    return sanitizeKeybindings(JSON.parse(raw));
  } catch {
    return createDefaultKeybindings();
  }
}

export function saveKeybindings(bindings: KeyBindingMap): KeyBindingMap {
  const sanitized = sanitizeKeybindings(bindings);
  getStorage()?.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function resetKeybindings(): KeyBindingMap {
  getStorage()?.removeItem(KEYBINDINGS_STORAGE_KEY);
  return createDefaultKeybindings();
}

export interface KeybindingConflict {
  action: InputAction;
  slot: 'primary' | 'secondary';
}

export function findKeybindingConflicts(bindings: KeyBindingMap, action: InputAction, code: string): KeybindingConflict[] {
  return inputActions.flatMap((otherAction) => {
    if (otherAction === action) return [];
    const binding = bindings[otherAction];
    const conflicts: KeybindingConflict[] = [];
    if (binding.primary === code) conflicts.push({ action: otherAction, slot: 'primary' });
    if (binding.secondary === code) conflicts.push({ action: otherAction, slot: 'secondary' });
    return conflicts;
  });
}
