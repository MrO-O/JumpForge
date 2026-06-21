export interface RuntimePosition {
  x: number;
  y: number;
}

export interface RuntimeDirection {
  x: number;
  y: number;
}

export type WallSide = 'left' | 'right';

export type RuntimeCellKey = `${number},${number}`;

export const toCellKey = (x: number, y: number): RuntimeCellKey => `${x},${y}`;

/** Ephemeral state owned exclusively by one TestScene; it never modifies LevelDocument. */
export interface RuntimeLevelState {
  isDead: boolean;
  isComplete: boolean;
  spawnPosition: RuntimePosition | null;
  initialSpawnPosition: RuntimePosition | null;
  activeRespawnPosition: RuntimePosition | null;
  activeCheckpointCell: RuntimeCellKey | null;
  activatedCheckpointCells: Set<RuntimeCellKey>;
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
  currentStamina: number;
  isWallSliding: boolean;
  isClimbing: boolean;
  wallSide: WallSide | null;
  consumedStaminaRefillCells: Set<RuntimeCellKey>;
  triggeredCrumbleBlockCells: Set<RuntimeCellKey>;
  brokenCrumbleBlockCells: Set<RuntimeCellKey>;
}

export const createRuntimeLevelState = (dashEnabled = false): RuntimeLevelState => ({
  isDead: false,
  isComplete: false,
  spawnPosition: null,
  initialSpawnPosition: null,
  activeRespawnPosition: null,
  activeCheckpointCell: null,
  activatedCheckpointCells: new Set(),
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
  currentStamina: 0,
  isWallSliding: false,
  isClimbing: false,
  wallSide: null,
  consumedStaminaRefillCells: new Set(),
  triggeredCrumbleBlockCells: new Set(),
  brokenCrumbleBlockCells: new Set(),
});

/** Restore per-life mechanic progress; a death may retain an already activated checkpoint. */
export function resetRuntimeAttempt(
  state: RuntimeLevelState,
  message: string,
  dashEnabled = false,
  preserveCheckpoint = false,
): void {
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
  state.currentStamina = 0;
  state.isWallSliding = false;
  state.isClimbing = false;
  state.wallSide = null;
  state.consumedStaminaRefillCells.clear();
  state.triggeredCrumbleBlockCells.clear();
  state.brokenCrumbleBlockCells.clear();
  if (!preserveCheckpoint) {
    state.activeCheckpointCell = null;
    state.activatedCheckpointCells.clear();
    state.activeRespawnPosition = state.initialSpawnPosition ? { ...state.initialSpawnPosition } : null;
  }
  state.currentMessage = message;
}
