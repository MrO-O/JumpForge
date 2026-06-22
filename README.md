# JumpForge

JumpForge 是浏览器端 2D 平台跳跃关卡设计工具。它以地图编辑器、可扩展 tile 机制和可选动作能力为核心，用于实验动作挑战与解谜关卡。

当前完成 **Phase 7C：Moving Platform**。编辑器始终是本地优先的工作台；测试模式只使用关卡深拷贝快照，所有运行中状态都不会修改编辑器地图或 localStorage。

## 运行

```bash
npm install
npm run dev
```

在 Windows 上，也可以直接双击项目根目录的 `start-local.bat`。它会在首次运行时安装依赖，随后启动本地开发服务并自动打开浏览器；关闭弹出的终端窗口即可停止服务。需要预先安装 [Node.js](https://nodejs.org/)。

生产构建与本地预览：

```bash
npm run build
npm run preview
```

## 当前功能

- 关卡库与编辑器：新建、加载、复制、删除、导入、导出、网格绘制、属性编辑和实时校验。
- Phaser 测试模式：有效关卡可从编辑器启动；`Esc` 或“返回编辑器”会销毁测试实例。
- 玩家：左右移动、可变跳高、土狼时间、跳跃缓冲、掉出地图死亡和 `R` 重开。
- 基础机制：`solid`、`oneWayPlatform`、`spike`、`spawn`、`goal`、从上方触发的 `spring`、`key` / `lockedDoor`、`switch` / `switchDoor`。
- 尖刺笔刷：`spike` 保持完整 32×32 危险格，并提供 `spikeTop`、`spikeBottom`、`spikeLeft`、`spikeRight` 四种半格危险区域；它们不阻挡移动，只在各自可见的危险区域触发死亡。
- dash：仅在关卡启用 `dash` 后可用。按 `Shift` 或 `X` 触发，方向键决定八方向；无方向输入时向面朝方向冲刺。
- dash 规则：每次空中阶段可使用一次，落地恢复；dashCrystal 可在一次生命内补充一次；dashBlock 仅在 dash 接触时破坏。
- wallJump：按跳跃键可从空中接触的实体墙面蹬墙跳；下落时会墙滑。它可按关卡启用。
- wallClimb：仅在 `climbWall` 上按住 `C` 抓墙/攀爬并消耗体力；落地或接触 `staminaRefill` 会恢复体力。它可独立于 wallJump 启用。
- Movement Tuning Profiles：每关可选择 Balanced、Precision、Floaty、Heavy、Dash Focused 或已保存的自定义手感模式；手感与动作能力一起显示为关卡标签。
- HUD：显示 movement preset、dash 状态、钥匙数量、全局开关门状态、死亡/通关信息和重开次数。
- 可选收集品：`collectibleBerry` 可在关卡中放置多个；它不影响终点、门或钥匙，只增加挑战与完成度统计。
- 定时平台：`timedPlatform` 按全局固定节奏在可站立与不可碰撞之间切换，用于节奏跳跃和路线规划。
- 移动平台：`movingPlatform` 是与下半块同规格的 32×16 平台，当前以固定全局参数水平往返移动。

## 内置样例关卡

现有内置样例关卡会继续保留，但后续新增机制、tile 或 UI 默认不再自动增加内置样例。验收优先通过编辑器临时搭建测试场景完成；只有明确需要演示、教学、回归测试，或任务本身是整理内置关卡时，才修改 `sampleLevels.ts`。

## Wall Movement + Stamina

`wallJump` 与 `wallClimb` 是独立的可选能力：前者适用于任何当前有效的实体墙面，后者只作用于 `climbWall`。`climbWall` 与 `staminaRefill` 都要求关卡启用 `wallClimb`，未启用时校验和 palette 会阻止使用。体力只属于一次 Phaser 测试运行：落地、体力补给、死亡和 `R` 重开均会恢复，绝不会写回关卡 JSON。

输入保持简洁：方向键移动，`Space` / `↑` 跳跃，`Shift` / `X` dash，`C` 抓墙/攀爬，`R` 重开，`Esc` 返回编辑器。墙面参数与体力参数都属于 movement profile，可用预设或本关卡自定义值调整。这是 JumpForge 自己的实验性 v1 机制，不复刻任何商业游戏的具体手感。

## Movement Tuning Profiles

关卡会保存所选手感的 `movementProfile` 快照，并作为关卡标签显示：导出的 JSON 包含预设与自定义覆盖值，导入后不依赖浏览器本地库也能恢复相同效果。旧关卡没有此字段时会自动使用 Balanced，不会导致导入失败；本功能保持 schemaVersion 为 1。

- **Balanced**：默认的通用节奏。
- **Precision**：更快起停与更直接的空中控制。
- **Floaty**：更轻重力与更明显滞空。
- **Heavy**：较慢加速与更有重量的下落。
- **Dash Focused**：更突出的 dash 速度与节奏，适合 dashCrystal / dashBlock 路线。

编辑器的 Movement 下拉框会立即选中预设或已保存的自定义模式，不需要“应用”步骤；编辑器不再提供数值调参。测试关卡侧栏可编辑数值，并用“应用并重新开始测试”生成新的运行期快照。编辑后的设置可按名称保存到浏览器本地的可选模式库，最多 5 套；选择已保存模式时，数值会复制到当前关卡，因此不会让导出 JSON 引用浏览器本地数据。输入值会限制在安全范围内；极端但有效的参数仍可能改变关卡可玩性。

## Dash runtime 状态

dash 可用次数、水晶消耗、方块破坏与玩家冲刺方向均只保存在 Phaser 的 `RuntimeLevelState` 中。死亡重生和 `R` 重开都会恢复本次测试的初始机制状态：钥匙回到地图、门关闭、开关门关闭、水晶恢复、方块恢复、dash 重新可用。退出测试后编辑器 LevelDocument 保持不变。

`冲刺路线` 样例展示了跨越缺口、拾取 dashCrystal、破坏 dashBlock 并抵达终点的基本流程。

## 构建说明

Phaser 会使当前生产包较大，Vite 可能显示 chunk 体积提示；这不影响 `npm run build` 的成功结果。后续如有必要，可将测试运行时按需加载。

## Global controls

JumpForge supports global custom keyboard controls. Use the **Controls** button available in both the level library and editor to click a primary or secondary slot, then press the desired physical key. A secondary binding can be cleared, and **Reset to defaults** restores the complete default layout.

Default controls are:

- Move left/right: `Left Arrow` / `A`, `Right Arrow` / `D`
- Move up/down: `Up Arrow` / `W`, `Down Arrow` / `S`
- Jump: `Space` (moving up also jumps)
- Dash: `Left Shift` / `X`
- Grab / climb: `C` / `Z`
- Restart test: `R`
- Exit test: `Esc`

Each physical key can belong to only one action. While recording a binding, modifier combinations, `Tab`, and `F5` are rejected; clear the existing binding first when a key is already in use. The test toolbar always has a return button, so changing the exit binding cannot trap a test session.

Controls are stored as a global browser preference in localStorage under `jumpforge:keybindings:v1`. They are not part of `LevelDocument`, do not appear in exported level JSON, and importing a level never changes them. GitHub Pages and local development use different browser origins, so their controls (like their local levels) are stored independently.

## Checkpoints

`checkpoint` is a reusable interaction tile that records a respawn point for the current Phaser test only. Touching it makes it visibly active and updates the test sidebar. On death from spikes or falling out of the level, JumpForge restores the usual per-life mechanism state (keys, doors, switches, crystals, dash blocks, and stamina refills) but respawns the player at the latest checkpoint. Pressing the configured restart key performs a full test restart instead: it clears checkpoint progress and returns to the initial `spawn`.

Checkpoint tiles are exported as ordinary level tiles, so shared JSON retains their placement. Their activated state and any runtime respawn position are never saved to `LevelDocument` or exported JSON. Place checkpoints near safe ground with clear headroom; the v1 respawn point is the checkpoint center slightly above the tile.

## Crumble blocks

`crumbleBlock` is a solid, reusable fragile-platform tile. Landing on its top starts a 500ms delay: it changes color to show that it is cracking, then disappears and stops colliding. Side contact does not trigger it. Each tile tracks its own delay and broken state in the Phaser runtime only; neither state is written to `LevelDocument` or exported JSON.

Death and the configured restart key restore every crumble block, including any block that was cracking or already broken. When combining crumble blocks with checkpoints, place the checkpoint on stable terrain or another safe area so a collapsed route cannot create an accidental soft lock.

## Collectible berries

`collectibleBerry` is an optional, non-blocking collectible tile. Touching it hides it for the current test and the test HUD shows `Berries: collected / total`. Reaching the goal never requires collecting berries, and the completion message records the final total.

Berry progress belongs only to the Phaser runtime: it is never written to `LevelDocument`, localStorage, or exported level JSON. In this Phase 7A simplified rule set, death and checkpoint respawn retain berries already collected during the test; the configured restart key and leaving then re-entering test mode clear that progress and restore every berry. A future phase may add more demanding uncommitted-collectible rules, including rollback on death.

## Timed platforms

`timedPlatform` is a solid platform only while active. Every timed platform in a test shares one global rhythm: 1200ms active, then 900ms inactive. Inactive platforms are faded and do not collide. When the inactive phase ends, each platform waits to become active until the player has left its own platform area, so it never appears inside the player.

The timer is Phaser runtime-only and is never saved to `LevelDocument`, localStorage, or exported JSON. Death, checkpoint respawn, and the configured restart key reset the shared rhythm to active, keeping attempts predictable. Phase 7B does not support per-tile timing settings or moving platforms.

## Moving platforms

`movingPlatform` uses the same 32×16 bottom-half geometry as `halfBlockBottom`: its editor preview, runtime visual, and collider occupy only the lower half of its grid cell. It moves horizontally back and forth from its placement position with one shared speed and travel distance. Phaser Arcade Physics carries a player standing on top through the platform body's horizontal friction.

Moving platform position and direction are Phaser runtime-only. Death, checkpoint respawn, the configured restart key, and a new test session restore every platform to its placed position and initial direction. Phase 7C supports neither per-tile speed, distance, or paths, nor moving-platform path editing or object layers.

## Small tile variants

`halfBlockTop`, `halfBlockBottom`, `halfBlockLeft`, and `halfBlockRight` remain normal grid tile IDs. Their registry-local `collisionBox` and `visualBox` make their collider and editor visual occupy a half-cell without changing `tileSize` or LevelDocument. Partial blocks use individual colliders and do not join the full-cell solid merge; they are not a free-size object system.

The palette presents these IDs as one Half Block brush. Space cycles direction and Shift+Space cycles backward; the grid shows a ghost preview. Partial colliders merge only when their actual world rectangles touch, reducing seams without becoming an object layer.

Half blocks are suitable for basic platform geometry, but different directions in complex L- or T-shaped joins can still snag under Phaser Arcade Physics. Avoid using `halfBlockLeft` / `halfBlockRight` as long precision walls; prefer `solid` or `climbWall` where stable wall movement matters. A complete fix should be a separate controller-level task using kinematic AABB or swept collision, not further epsilon tweaks.

## Partial spikes

The hazard palette presents `spike`, `spikeTop`, `spikeBottom`, `spikeLeft`, and `spikeRight` as one Spike brush: **尖刺：全 / 上 / 下 / 左 / 右**. With a spike selected, `Space` cycles forward through those five variants and `Shift+Space` cycles backward; the same shortcut continues to cycle Half Block only when a Half Block is selected.

The full-cell spike keeps the original red-square-and-`▲` appearance in the palette, editor, preview, and runtime. Partial spikes draw a red, striped danger region and runtime triangle teeth only inside their corresponding half-cell; their hover preview uses the same simple red preview style as the full spike, with its half-cell position distinguishing the direction. Their `hazardBox` uses the same rectangle as the partial visual, so touching the blank half of the cell is safe while touching the displayed region causes death. Spikes never block movement and are not treated as solid, climbable walls, or merged terrain. As with other mechanisms, no built-in sample level is added for this feature; create a temporary editor scene for acceptance.

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库并将代码推送到 `main` 分支。
2. 打开仓库的 **Settings → Pages**，将 **Source** 选择为 **GitHub Actions**。
3. 推送到 `main` 后，`.github/workflows/deploy.yml` 会自动安装依赖、构建 `dist` 并部署；也可以在 **Actions** 页面手动运行该 workflow。

默认部署地址通常为：

```text
https://<username>.github.io/<repo-name>/
```

工作流通过 `VITE_BASE_PATH` 为 Vite 设置项目页子路径。当前默认值为 `/JumpForge/`；如果 GitHub 仓库名不是 `JumpForge`，请修改 `.github/workflows/deploy.yml` 中的 `VITE_BASE_PATH`，例如仓库为 `level-lab` 时设为 `/level-lab/`。本地开发和默认的 `npm run build` 均使用 `/`，不会受此配置影响。可用以下命令在本地模拟 GitHub Pages 的构建路径：

```bash
VITE_BASE_PATH=/JumpForge/ npm run build
```

在 PowerShell 中可使用：

```powershell
$env:VITE_BASE_PATH = '/JumpForge/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

JumpForge 是纯前端应用：没有后端、账号或云同步。关卡保存在当前浏览器的 localStorage 中，JSON 导入/导出可用于备份和分享地图；GitHub Pages 与本地开发环境使用不同来源，因此两处 localStorage 数据互不共享。Phaser 带来的包体积提示不影响 GitHub Pages 部署成功。

## 当前限制

- dash 是基础、可调的 v1 机制，并非完整的高阶动作系统。
- `oneWayPlatform` 采用 Arcade Physics 过程回调：向下落到平台顶部时碰撞，从下方上跳时穿过；复杂边缘情形仍需后续手感测试。
- 测试 runtime 会把连续的 `solid` 与 `climbWall` 合并为少量静态矩形碰撞体；连续 `dashBlock` 则合并为动态 cluster collider。视觉仍按 tile 显示；门、开关门、弹簧、单向平台等动态或特殊机制保持独立碰撞。v1 中 dash 命中连续 dashBlock cluster 会整体破坏该 cluster；如需独立破坏的方块，请让 dashBlock 不相邻放置。HUD 会显示静态矩形与 dashBlock cluster 数量。逐格 dashBlock 局部破坏属于后续扩展；极端高速或复杂边缘布局仍建议手动测试。
- doubleJump、carry、敌人、战斗、音效、粒子、移动端控制、后端、账号、云同步和在线分享均未实现。

## Level JSON 概览

```json
{
  "schemaVersion": 1,
  "id": "my-level",
  "title": "我的关卡",
  "width": 16,
  "height": 10,
  "tileSize": 32,
  "enabledAbilities": ["move", "jump"],
  "movementProfile": {
    "presetId": "balanced",
    "tuningOverrides": {
      "jumpVelocity": 440
    }
  },
  "layers": [{
    "id": "terrain",
    "name": "Terrain",
    "kind": "tile",
    "visible": true,
    "tiles": ["empty"]
  }]
}
```

`tiles` 使用 row-major 一维数组，索引为 `y * width + x`，真实数组长度必须等于 `width * height`。完整设计见 [docs/v1-design.md](docs/v1-design.md)。

JumpForge 只借鉴平台跳跃和关卡设计的通用思想；不复制任何既有游戏的素材、角色、关卡、音乐或具体内容。
