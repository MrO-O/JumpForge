# JumpForge

JumpForge 是浏览器端 2D 平台跳跃关卡设计工具。它以地图编辑器、可扩展 tile 机制和可选动作能力为核心，用于实验动作挑战与解谜关卡。

当前完成 **Phase 4B：基础 dash ability 与 dash tile runtime**。编辑器始终是本地优先的工作台；测试模式只使用关卡深拷贝快照，所有运行中状态都不会修改编辑器地图或 localStorage。

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
- HUD：显示 dash 状态、钥匙数量、全局开关门状态、死亡/通关信息和重开次数。

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
- wallJump、doubleJump、carry、敌人、战斗、音效、粒子、移动端控制、后端、账号、云同步和在线分享均未实现。

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
