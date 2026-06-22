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
- Phase 5A：Movement Tuning Profiles、关卡级预设与自定义调参、旧关卡 Balanced fallback。
- Phase 5B：wallJump、wallClimb、climbWall、staminaRefill 与运行期体力状态。
- Phase 6A：checkpoint tile、运行期检查点激活与最近检查点重生。
- Phase 6B：crumbleBlock tile、运行期触发延迟与死亡/重开恢复。
- Phase 6C：halfBlock 小规格 tile 变体与局部碰撞/编辑器表现。
- Phase 7A：collectibleBerry 可选收集品、运行期收集统计与死亡保留 / 完整重开清空规则。
- Phase 7B：timedPlatform 全局 active / inactive 节奏、运行期碰撞切换与占位延迟恢复。
- Phase 7C：movingPlatform 下半格水平往返、Arcade Physics 承载与运行期重置。
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
- Checkpoint activation and the active respawn position are TestScene runtime state only; never write them back to `LevelDocument` or level JSON.
- Crumble block trigger, timer, and broken state are runtime-only. Restore them on both death and full test restart.
- Collectible berry progress is TestScene runtime state only. It is optional, must not affect key/door behavior or goal completion, survives ordinary death, and resets only on full test restart or a new test session.
- Timed platform phase and collision state are runtime-only, reset on death, checkpoint respawn, and full restart, and must not gain per-tile timing settings without an explicit task.
- Moving platform position and direction are runtime-only, reset on death, checkpoint respawn, and full restart. Keep it a fixed horizontal bottom-half platform; do not add path editing, per-tile motion parameters, or object layers without an explicit task.

## Global Input Settings

- Keybindings are global browser preferences, stored separately in localStorage; they never belong to `LevelDocument` or exported level JSON.
- Do not add new hard-coded gameplay keys in `PlayerController` or `TestScene`; route runtime input through the shared keybinding map/input helper.
- When adding an input action, update default keybindings, the Controls settings UI, HUD hints, and README together.

## Tile System Rules

- tile 行为必须通过 tileRegistry 的 `runtime.kind` 和集中 runtime handler 管理。
- 不要把大量 `if tileId === "..."` 散落在 TestScene、PlayerController 或 React 组件中。
- 新增 tile 时同步更新：tileRegistry、必要的 validateLevel 规则、runtime handler、editor palette 表现、README 或相关文档。
- v1 tile：empty、solid、oneWayPlatform、spike、spawn、goal、spring、key、lockedDoor、switch、switchDoor、dashCrystal、dashBlock、climbWall、staminaRefill、checkpoint、crumbleBlock、collectibleBerry、timedPlatform、movingPlatform、halfBlockTop、halfBlockBottom、halfBlockLeft、halfBlockRight。
- Checkpoint tiles are non-unique runtime triggers. Death keeps the active checkpoint while a full test restart clears it and returns to the initial spawn.
- Crumble blocks use centralized runtime handlers; do not put their timers or collision toggles in `TestScene`.
- Small tile variants use registry-local collision/visual boxes; do not change global tileSize or introduce an object layer.
- Half-block palette grouping is UI-only; merge partial colliders by actual rectangles, not grid-cell occupancy.
- Half-block data remains four tile IDs while the editor exposes one grouped brush and replacement hover preview. Do not claim complex L/T partial-wall corner snag is fixed without manual verification; treat `halfBlockLeft` / `halfBlockRight` precision walls as a known Arcade Physics limitation. A full remedy is a separate kinematic AABB/swept-collision task, not incremental epsilon patches.
- Grouped brushes are UI-only: LevelDocument and exported JSON must continue to store the concrete tile ID selected by the brush.
- Partial hazards must keep their registry-local visual and damage boxes aligned. Hazards are triggers only: do not place them in solid, wall, collision-merge, or dash-block paths.

## Ability System Rules

- move 和 jump 是基础能力，始终启用。
- dash 是第一个可选动作能力，已在 Phase 4B 实现。
- wallJump 与 wallClimb 已实现，必须通过 enabledAbilities 控制；doubleJump、carry 当前为 reserved，不要擅自实现。
- ability 专用 tile 必须检查 enabledAbilities。
- dashCrystal 和 dashBlock 只在 dash 启用时才是有效机制。

## Editor Rules

- 编辑器是核心功能，不是附属功能。
- 复用 levelCommands、tileRegistry、abilityRegistry。
- spawn 和 goal 必须保持唯一。
- 保存、导入、导出必须经过校验；非法 JSON 不应导致应用崩溃。
- 关卡数据格式必须保持可导入导出；修改 schema 时必须考虑 migration。
- Built-in sample levels are optional, not a required deliverable for every feature. Do not modify `sampleLevels.ts` unless the user explicitly asks for a built-in level, the task is about sample levels, or an existing sample needs a compatibility adjustment. For normal feature work, describe manual editor-based validation instead.

## Phaser Runtime Rules

- TestScene 负责生命周期、HUD、场景协调。
- PlayerController 负责玩家移动和手感。
- RuntimeLevelBuilder / tileRuntimeHandlers 负责 tile runtime。
- 不要把所有逻辑塞进 TestScene。
- 运动参数集中在 tuning 对象中，不要散落魔法数字。
- movementProfile 属于 LevelDocument；新增预设或调参字段时同步更新 tuning registry、校验、编辑器 UI、README 和相关设计文档。
- Saved custom movement modes are a separate browser-local library (maximum five). Selecting one must copy its profile into LevelDocument so imports/exports remain self-contained; test-time editing and saving must never mutate the editor document.
- wallSlide、wallJump、climb 与 stamina 参数属于 PlayerTuning；墙面识别与 staminaRefill 由 runtime builder / handler 集中维护，不要散落到 TestScene。
- 不要宣称或尝试复刻任何商业游戏的具体手感。
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

## Git Workflow

- 开始任务前先运行 `git status`；如果工作区不干净，先报告，不要覆盖或删除用户改动。
- 简单、独立的工作可在当前分支处理；复杂任务应从干净的 `main` 创建独立短生命周期分支。
- 高风险物理、碰撞、schema 或 runtime 重构必须使用 `experiment/*` 分支；未验收实验不得合并或部署到 `main`。
- 修改后运行 `npm run build`，并在每次输出中包含当前 `git status` 摘要和建议提交信息。
- 除非用户明确要求，不要自动提交或推送。
- 除非用户明确要求且理解风险，不要使用 `git reset --hard` 或 `git push --force`。
- 完整分支命名、合并、提交和回滚流程见 `docs/git-workflow.md`。

## Documentation Rules

- 改变功能边界时更新 README。
- 改变设计原则时更新 docs。
- 改变 agent 维护规则时更新 AGENTS.md。
- README 必须准确说明已实现和未实现内容；不要夸大项目能力。
