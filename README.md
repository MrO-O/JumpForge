# JumpForge

JumpForge 是浏览器端 2D 平台跳跃关卡设计工具。它以地图编辑器、可扩展 tile 机制和可选动作能力为核心，用于实验动作挑战与解谜关卡。

当前完成 **Phase 4A：基础机制 tile runtime**。编辑器始终是本地优先的工作台；测试模式只使用关卡深拷贝快照，运行中的物品、门、开关、死亡和通关状态都不会修改编辑器地图或 localStorage。

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
- 基础 runtime tile：`solid`、真正的 `oneWayPlatform`、`spike`、`spawn`、`goal`、从上方触发的 `spring`。
- 机制 runtime tile：`key`、`lockedDoor`、`switch`、`switchDoor`。任意开关切换所有开关门；钥匙会被消耗以打开一扇锁门。
- HUD：显示按键提示、钥匙数量、全局开关门状态、死亡/通关信息和重开次数。

## 运行态重置规则

死亡重生和 `R` 重开都会恢复当前测试的初始机制状态：钥匙回到地图、已开锁门关闭、开关门关闭、keyCount 归零。该状态仅保存在 Phaser scene 的 `RuntimeLevelState`，不会回写 `LevelDocument`。

## 当前限制

- `oneWayPlatform` 采用 Arcade Physics 过程回调：向下落到平台顶部时碰撞，从下方上跳时穿过。复杂边缘情形仍待后续手感测试。
- dash、`dashCrystal`、`dashBlock` 尚未实现完整行为，留到 **Phase 4B**；冲刺样例仅作为后续机制布局参考。
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
