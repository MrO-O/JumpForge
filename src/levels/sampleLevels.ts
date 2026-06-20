import { createEmptyLevel, setTileAt } from './levelCommands';
import type { LevelDocument } from './levelTypes';

function paint(level: LevelDocument, entries: Array<[number, number, Parameters<typeof setTileAt>[4]]>): LevelDocument {
  return entries.reduce((current, [x, y, tile]) => setTileAt(current, 'terrain', x, y, tile), level);
}

const basicJumpLevel = paint(
  createEmptyLevel({ id: 'sample-basic-jump', title: '基础跳跃', author: 'JumpForge', width: 16, height: 10 }),
  [[4, 7, 'solid'], [5, 7, 'solid'], [6, 7, 'solid'], [9, 6, 'solid'], [10, 6, 'solid'], [11, 6, 'solid'], [7, 8, 'spike']],
);

const keyDoorLevel = paint(
  createEmptyLevel({ id: 'sample-key-door', title: '钥匙与开关走廊', author: 'JumpForge', width: 22, height: 10, movementProfile: { presetId: 'floaty' } }),
  [[4, 8, 'key'], [8, 8, 'lockedDoor'], [12, 8, 'switch'], [15, 8, 'switchDoor'], [10, 7, 'oneWayPlatform'], [11, 7, 'oneWayPlatform']],
);

const dashLevel = paint(
  createEmptyLevel({ id: 'sample-dash', title: '冲刺路线', author: 'JumpForge', width: 20, height: 10, enabledAbilities: ['move', 'jump', 'dash'], movementProfile: { presetId: 'dashFocused' } }),
  [
    [6, 9, 'empty'], [7, 9, 'empty'], [8, 9, 'empty'], [9, 9, 'empty'],
    [11, 8, 'dashCrystal'],
    [14, 6, 'dashBlock'], [14, 7, 'dashBlock'], [14, 8, 'dashBlock'],
  ],
);

const wallTrainingLevel = paint(
  createEmptyLevel({ id: 'sample-wall-training', title: '墙面训练', author: 'JumpForge', width: 20, height: 12, enabledAbilities: ['move', 'jump', 'wallJump', 'wallClimb'] }),
  [
    [18, 10, 'empty'], [16, 6, 'goal'],
    [6, 5, 'climbWall'], [6, 6, 'climbWall'], [6, 7, 'climbWall'], [6, 8, 'climbWall'], [6, 9, 'climbWall'], [6, 10, 'climbWall'],
    [8, 7, 'solid'], [9, 7, 'solid'], [10, 7, 'solid'], [11, 7, 'solid'], [12, 7, 'solid'], [13, 7, 'solid'], [14, 7, 'solid'], [15, 7, 'solid'], [16, 7, 'solid'],
    [9, 6, 'staminaRefill'],
  ],
);

export const sampleLevels: readonly LevelDocument[] = [basicJumpLevel, keyDoorLevel, dashLevel, wallTrainingLevel];
