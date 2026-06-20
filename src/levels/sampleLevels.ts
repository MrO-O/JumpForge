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
  createEmptyLevel({ id: 'sample-key-door', title: '钥匙与开关走廊', author: 'JumpForge', width: 22, height: 10 }),
  [[4, 8, 'key'], [8, 8, 'lockedDoor'], [12, 8, 'switch'], [15, 8, 'switchDoor'], [10, 7, 'oneWayPlatform'], [11, 7, 'oneWayPlatform']],
);

const dashLevel = paint(
  createEmptyLevel({ id: 'sample-dash', title: '冲刺展示（待 Phase 4B）', author: 'JumpForge', width: 20, height: 10, enabledAbilities: ['move', 'jump', 'dash'] }),
  [[5, 8, 'dashCrystal'], [9, 8, 'dashBlock'], [10, 8, 'dashBlock'], [11, 8, 'dashBlock'], [14, 6, 'solid'], [15, 6, 'solid'], [16, 6, 'solid']],
);

export const sampleLevels: readonly LevelDocument[] = [basicJumpLevel, keyDoorLevel, dashLevel];
