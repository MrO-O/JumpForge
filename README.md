# JumpForge

JumpForge 是浏览器端 2D 平台跳跃关卡设计工具。它以地图编辑器、可扩展 tile 机制和可选动作能力为核心，用于实验动作挑战与解谜关卡。

当前完成 **Phase 5B：Wall Movement Ability + Climb Stamina**。编辑器始终是本地优先的工作台；测试模式只使用关卡深拷贝快照，所有运行中状态都不会修改编辑器地图或 localStorage。

## 运行

```bash
npm install
npm run dev
```

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
- dash：仅在关卡启用 `dash` 后可用。按 `Shift` 或 `X` 触发，方向键决定八方向；无方向输入时向面朝方向冲刺。
- dash 规则：每次空中阶段可使用一次，落地恢复；dashCrystal 可在一次生命内补充一次；dashBlock 仅在 dash 接触时破坏。
- wallJump：按跳跃键可从空中接触的实体墙面蹬墙跳；下落时会墙滑。它可按关卡启用。
- wallClimb：仅在 `climbWall` 上按住 `C` 抓墙/攀爬并消耗体力；落地或接触 `staminaRefill` 会恢复体力。它可独立于 wallJump 启用。
- Movement Tuning Profiles：每关可选 Balanced、Precision、Floaty、Heavy 或 Dash Focused 预设，并可为当前关卡自定义移动、跳跃、dash 与 spring 参数。
- HUD：显示 movement preset、dash 状态、钥匙数量、全局开关门状态、死亡/通关信息和重开次数。

## Wall Movement + Stamina

`wallJump` 与 `wallClimb` 是独立的可选能力：前者适用于任何当前有效的实体墙面，后者只作用于 `climbWall`。`climbWall` 与 `staminaRefill` 都要求关卡启用 `wallClimb`，未启用时校验和 palette 会阻止使用。体力只属于一次 Phaser 测试运行：落地、体力补给、死亡和 `R` 重开均会恢复，绝不会写回关卡 JSON。

输入保持简洁：方向键移动，`Space` / `↑` 跳跃，`Shift` / `X` dash，`C` 抓墙/攀爬，`R` 重开，`Esc` 返回编辑器。墙面参数与体力参数都属于 movement profile，可用预设或本关卡自定义值调整。这是 JumpForge 自己的实验性 v1 机制，不复刻任何商业游戏的具体手感。

## Movement Tuning Profiles

手感参数属于 `LevelDocument`，而不是浏览器偏好：导出的关卡 JSON 会包含 `movementProfile`，导入后会恢复相同预设与自定义覆盖值。旧关卡没有此字段时会自动使用 Balanced，不会导致导入失败；本功能保持 schemaVersion 为 1。

- **Balanced**：默认的通用节奏。
- **Precision**：更快起停与更直接的空中控制。
- **Floaty**：更轻重力与更明显滞空。
- **Heavy**：较慢加速与更有重量的下落。
- **Dash Focused**：更突出的 dash 速度与节奏，适合 dashCrystal / dashBlock 路线。

属性面板的 Movement 区域可选择预设，或编辑本关卡的最大移动速度、加速度、空中加速度、跳跃、重力、短跳、土狼时间、跳跃缓冲、dash 与 spring 等参数。输入值会限制在安全范围内；极端但有效的参数仍可能改变关卡可玩性。它们只是为关卡实验提供的独立预设，不复制任何现有商业游戏的手感。

## Dash runtime 状态

dash 可用次数、水晶消耗、方块破坏与玩家冲刺方向均只保存在 Phaser 的 `RuntimeLevelState` 中。死亡重生和 `R` 重开都会恢复本次测试的初始机制状态：钥匙回到地图、门关闭、开关门关闭、水晶恢复、方块恢复、dash 重新可用。退出测试后编辑器 LevelDocument 保持不变。

`冲刺路线` 样例展示了跨越缺口、拾取 dashCrystal、破坏 dashBlock 并抵达终点的基本流程。

## 构建说明

Phaser 会使当前生产包较大，Vite 可能显示 chunk 体积提示；这不影响 `npm run build` 的成功结果。后续如有必要，可将测试运行时按需加载。

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
