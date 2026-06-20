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
