# JumpForge Agent Guide

## Project Overview

JumpForge 是浏览器端 2D 平台跳跃关卡设计工具。核心不是单纯游戏，而是由“地图编辑器 + tile 机制 + 可选动作能力”组成的关卡实验室。

- 本地优先：不需要账号、后端、云同步或 AI。
- 关卡保存在 localStorage，通过 JSON 导入导出分享。
- 技术栈：Vite、React、TypeScript、Phaser、普通 CSS。

## Current Status

- Phase 1：领域层、LevelDocument、Tile Registry、Ability Registry、校验、样例关卡。
- Phase 2：关卡库、网格编辑器、Tile Palette、属性面板、保存、导入导出。
- Phase 3A：Phaser 测试模式、基础移动、跳跃、死亡、通关、R 重开。
- Phase 4A：key / lockedDoor、switch / switchDoor、spring、oneWayPlatform 基础实现。
- Phase 4B：dash、dashCrystal、dashBlock 基础实现。
- 后续能力扩展必须由用户明确提出。

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

- 修改代码后优先运行 `npm run build`。
- 环境无法构建时不要卡住；报告尝试命令和完整错误。
- 不要把环境问题伪装成代码已验证通过。

## Architecture Rules

- `src/levels`：LevelDocument、schema、migrations、commands、sample levels。
- `src/tiles`：tile types 和 tileRegistry。
- `src/abilities`：ability types 和 abilityRegistry。
- `src/editor`：编辑器 UI。
- `src/game`：Phaser runtime。
- `src/storage`：localStorage repository 和 import/export。
- 领域层不得依赖 React、Phaser 或 localStorage。
- 编辑器和 runtime 必须共用 LevelDocument、tileRegistry、abilityRegistry。
- 不要复制一套平行数据模型。

## Runtime Separation

- 编辑文档和 Phaser 运行态必须严格分离。
- 测试模式只接收 LevelDocument 快照。
- 玩家位置、钥匙数量、门状态、开关状态、死亡、通关、dash 状态均属于 runtime state。
- runtime state 不得回写 LevelDocument。
- 退出测试后编辑器地图必须保持不变。

## Tile System Rules

- tile 行为必须通过 tileRegistry 的 `runtime.kind` 和集中 runtime handler 管理。
- 不要把大量 `if tileId === "..."` 散落在 TestScene、PlayerController 或 React 组件中。
- 新增 tile 时同步更新：tileRegistry、必要的 validateLevel 规则、runtime handler、editor palette 表现、README 或相关文档。
- v1 tile：empty、solid、oneWayPlatform、spike、spawn、goal、spring、key、lockedDoor、switch、switchDoor、dashCrystal、dashBlock。

## Ability System Rules

- move 和 jump 是基础能力，始终启用。
- dash 是第一个可选动作能力，已在 Phase 4B 实现。
- wallJump、doubleJump、carry 当前为 reserved，不要擅自实现。
- ability 专用 tile 必须检查 enabledAbilities。
- dashCrystal 和 dashBlock 只在 dash 启用时才是有效机制。

## Editor Rules

- 编辑器是核心功能，不是附属功能。
- 复用 levelCommands、tileRegistry、abilityRegistry。
- spawn 和 goal 必须保持唯一。
- 保存、导入、导出必须经过校验；非法 JSON 不应导致应用崩溃。
- 关卡数据格式必须保持可导入导出；修改 schema 时必须考虑 migration。

## Phaser Runtime Rules

- TestScene 负责生命周期、HUD、场景协调。
- PlayerController 负责玩家移动和手感。
- RuntimeLevelBuilder / tileRuntimeHandlers 负责 tile runtime。
- 不要把所有逻辑塞进 TestScene。
- 运动参数集中在 tuning 对象中，不要散落魔法数字。
- Phaser mount/unmount 必须清理干净，避免重复 canvas 或幽灵碰撞体。

## Design Boundaries

除非用户明确要求，不要擅自添加：

- 敌人、战斗、复杂动画、音效系统、粒子特效或大型美术素材。
- 多人、排行榜、后端、账号、云同步、在线关卡分享或 AI API。
- 移动端触屏控制、外部 Tiled 导入、复杂撤销/重做、自动地形连接。
- 多图层或对象属性系统。

## Game Design Direction

- 参考优秀平台跳跃的设计思想，但不复制任何现有游戏的角色、美术、关卡、音乐或素材。
- 优先级：地图编辑器 > tile 系统 > ability 系统 > 角色手感 > 美术表现。
- 目标是支持动作挑战和解谜关卡设计。
- tile 要平衡“普适机制”和“能力专用机制”。

## Before Making Changes

- 先阅读 `docs/v1-design.md`、`README.md` 和本文件，并确认当前 Phase。
- 小步修改，不要大规模重构。
- 不要在一个任务中同时改编辑器、runtime、schema、样式和关卡内容，除非任务明确要求。
- 修改核心逻辑后运行 `npm run build`。
- 涉及 runtime 的修改，应说明手动测试步骤。

## Documentation Rules

- 改变功能边界时更新 README。
- 改变设计原则时更新 docs。
- 改变 agent 维护规则时更新 AGENTS.md。
- README 必须准确说明已实现和未实现内容；不要夸大项目能力。
