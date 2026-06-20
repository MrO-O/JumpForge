export interface RuntimePosition {
  x: number;
  y: number;
}

export type RuntimeCellKey = `${number},${number}`;

export const toCellKey = (x: number, y: number): RuntimeCellKey => `${x},${y}`;

/** Ephemeral state owned exclusively by one TestScene; it never modifies LevelDocument. */
export interface RuntimeLevelState {
  isDead: boolean;
  isComplete: boolean;
  spawnPosition: RuntimePosition | null;
  currentMessage: string;
  restartCount: number;
  elapsedMs: number;
  keyCount: number;
  collectedKeys: Set<RuntimeCellKey>;
  hiddenTileCells: Set<RuntimeCellKey>;
  openedLockedDoors: Set<RuntimeCellKey>;
  pressedSwitches: Set<RuntimeCellKey>;
  switchDoorsOpen: boolean;
}

export const createRuntimeLevelState = (): RuntimeLevelState => ({
  isDead: false,
  isComplete: false,
  spawnPosition: null,
  currentMessage: '',
  restartCount: 0,
  elapsedMs: 0,
  keyCount: 0,
  collectedKeys: new Set(),
  hiddenTileCells: new Set(),
  openedLockedDoors: new Set(),
  pressedSwitches: new Set(),
  switchDoorsOpen: false,
});

/** Restore all mechanic progress to the start of the current test attempt. */
export function resetRuntimeAttempt(state: RuntimeLevelState, message: string): void {
  state.isDead = false;
  state.isComplete = false;
  state.elapsedMs = 0;
  state.keyCount = 0;
  state.collectedKeys.clear();
  state.hiddenTileCells.clear();
  state.openedLockedDoors.clear();
  state.pressedSwitches.clear();
  state.switchDoorsOpen = false;
  state.currentMessage = message;
}
