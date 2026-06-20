export interface RuntimePosition {
  x: number;
  y: number;
}

export interface RuntimeDirection {
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
  dashAvailable: boolean;
  isDashing: boolean;
  dashDirection: RuntimeDirection | null;
  dashTimeRemainingMs: number;
  dashCooldownMs: number;
  consumedDashCrystalCells: Set<RuntimeCellKey>;
  brokenDashBlockCells: Set<RuntimeCellKey>;
  lastDashStartedAt: number | null;
}

export const createRuntimeLevelState = (dashEnabled = false): RuntimeLevelState => ({
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
  dashAvailable: dashEnabled,
  isDashing: false,
  dashDirection: null,
  dashTimeRemainingMs: 0,
  dashCooldownMs: 0,
  consumedDashCrystalCells: new Set(),
  brokenDashBlockCells: new Set(),
  lastDashStartedAt: null,
});

/** Restore all mechanic progress to the start of the current test attempt. */
export function resetRuntimeAttempt(state: RuntimeLevelState, message: string, dashEnabled = false): void {
  state.isDead = false;
  state.isComplete = false;
  state.elapsedMs = 0;
  state.keyCount = 0;
  state.collectedKeys.clear();
  state.hiddenTileCells.clear();
  state.openedLockedDoors.clear();
  state.pressedSwitches.clear();
  state.switchDoorsOpen = false;
  state.dashAvailable = dashEnabled;
  state.isDashing = false;
  state.dashDirection = null;
  state.dashTimeRemainingMs = 0;
  state.dashCooldownMs = 0;
  state.consumedDashCrystalCells.clear();
  state.brokenDashBlockCells.clear();
  state.lastDashStartedAt = null;
  state.currentMessage = message;
}
