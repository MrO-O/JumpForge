# JumpForge v1 技术方案设计

> 版本：v1 设计稿  
> 原则：本地优先、编辑器优先、数据驱动、机制可组合。本文只定义可执行的 v1 方案，不包含项目代码实现。

## 1. Project Vision

JumpForge 是浏览器端的 2D 平台跳跃关卡实验室：玩家可在网格编辑器中组合 tile、选择本关启用的动作能力，并立即进入测试模式验证动作挑战与解谜路径。

它参考经典平台跳跃的清晰空间语言、精准动作与快速重开节奏，以及“由一个核心机制持续衍生关卡”的设计方法；不复用任何既有作品的角色、美术、素材、关卡或内容。

v1 的边界明确如下：

- 核心是单人本地关卡编辑、测试、保存与 JSON 导入/导出。
- 默认玩法只有左右移动和基础跳跃；dash 是首个可选、可实现的扩展能力。
- tile 是关卡机制的主要载体，且必须通过统一注册表定义，不能散落在 React 组件或游戏场景的条件分支中。
- v1 不做账号、后端、云同步、在线分享、敌人、战斗、复杂美术或无限地图。

## 2. Recommended Tech Stack

### 结论

建议采用 **Vite + React + TypeScript + Phaser 3**：React 管理编辑器与应用界面，Phaser 负责测试运行时的渲染、输入、物理和碰撞。两者只通过稳定的领域数据与窄接口通信。

| 层级 | 推荐技术 | 职责 |
| --- | --- | --- |
| 构建与语言 | Vite、TypeScript | 快速开发、静态类型、生产构建 |
| 应用与编辑器 UI | React | 页面布局、面板、关卡列表、palette、表单、导入导出 |
| 游戏运行时 | Phaser 3（Arcade Physics） | Tile 渲染、玩家更新、碰撞、输入、死亡、通关 |
| 数据校验 | TypeScript 类型 + 运行时 schema 校验库（实现期选用 Zod） | 导入 JSON 验证与版本迁移边界 |
| 本地存储 | localStorage | 保存关卡索引及完整关卡 JSON |
| 样式 | CSS Modules 或普通 CSS（实现期二选一） | 简洁的工具型界面，不引入大型设计系统 |

### 是否推荐 Phaser

推荐。v1 需要可靠的 2D 碰撞、重力、键盘输入、相机和每帧更新循环。Phaser 3 的 Arcade Physics 足以处理规则明确的平台跳跃，能减少自行维护碰撞检测、delta time、渲染循环和输入状态的成本。它也适合用简单色块/程序化绘制完成 v1，避免先被美术资产管线拖慢。

主要风险不是 Phaser 本身，而是让 React 与 Phaser 共同修改同一份游戏状态。方案是：React 只持有**编辑中的不可变 LevelDocument**；开始测试时传入一份深拷贝/冻结的快照；Phaser 只维护运行期状态（玩家速度、钥匙持有、门开关、已破坏方块等）。测试结束后仅回传明确的结果，不把临时运行状态写回地图。

### 可选替代方案

- **Kaboom.js**：API 更轻量，原型速度快；但编辑器与较复杂 tile 行为发展后，生态、调试资料和成熟物理工作流相对弱。适合极小型原型，不作为本方案首选。
- **PixiJS + 自定义物理**：渲染灵活，但要自行补齐平台碰撞、输入、场景生命周期，v1 没有收益。
- **纯 Canvas + 自定义引擎**：控制力最高，却会把 v1 时间花在引擎基础设施上，不推荐。

## 3. Architecture

整体采用“共享领域层 + 双宿主”的结构。`LevelDocument`、tile 定义和能力定义属于纯 TypeScript 领域层，可被编辑器、存储和运行时同时使用；React 和 Phaser 不互相导入业务 UI/场景实现。

```text
React App Shell
  ├─ Level Editor ────────┐
  ├─ Level Library        ├─ shared domain (level / tiles / abilities)
  └─ Import / Export ─────┤
                           ├─ localStorage repository
                           └─ Phaser Test Runtime (level snapshot)
```

### App shell

负责工作台布局和顶层模式切换：`editor`、`testing`、`levelLibrary`。它持有当前关卡 ID、编辑文档和未保存状态；测试模式挂载 Phaser 容器，退出后销毁 Phaser game 实例并回到编辑器。v1 不需要全局状态库，React `useReducer` 加领域操作即可；复杂度增长后再评估 Zustand。

### Level editor

以 LevelDocument 为唯一编辑源。负责网格绘制、图层选择、palette、地图尺寸、出生点/终点、能力开关、保存和导入导出。编辑操作应表示为纯函数，如 `paintCell(document, layerId, x, y, tileId)`，使将来补轻量撤销/重做不必重写数据模型。

### Game runtime

Phaser 场景从只读 level snapshot 和 registry 创建运行对象。场景中维护 `RuntimeLevelState`，记录消耗型/变化型机制，如已拾取的 key、开关状态、已破坏的 dashBlock；它绝不直接修改编辑文档。

### Level data model

地图以矩形网格为基础。静态地形与机制 tile 均存为稀疏或完整二维 tile 数据；v1 推荐完整扁平数组，便于编辑与导入校验。对象层预留给将来拥有独立属性的实体，v1 的 spawn/goal/key 等仍可先作为 tile，以降低编辑器复杂度。

### Tile registry

所有 tile 的 ID、编辑器表现、碰撞语义、能力要求和运行时行为关键字集中在一个 registry。运行时按 registry 的 `runtime.kind` 分派行为，而不是在多个地方比较字符串 ID。

### Ability system

能力注册表描述能力 ID、显示信息、默认状态、依赖以及运行时模块。地图只保存 `enabledAbilities`，不保存实现细节。能力模块订阅明确的玩家生命周期钩子（输入、更新、碰撞、死亡/重生），使 dash 可加入且不污染基础移动代码。

### Storage / import-export

本地 repository 负责保存、列出、删除和复制关卡；导入器负责解析、运行时校验、schemaVersion 迁移及非法 tile ID 提示；导出器只导出稳定的 LevelDocument JSON，不包含 UI 状态、运行时状态或 localStorage 包装信息。

## 4. File Structure Proposal

```text
docs/
  v1-design.md
src/
  app/
    App.tsx
    appReducer.ts
    routesOrModes.ts
  editor/
    EditorWorkspace.tsx
    GridCanvas.tsx
    TilePalette.tsx
    InspectorPanel.tsx
    editorCommands.ts
  game/
    PhaserGameHost.tsx
    TestScene.ts
    PlayerController.ts
    RuntimeLevelBuilder.ts
    runtimeTypes.ts
  levels/
    levelTypes.ts
    levelSchema.ts
    levelMigrations.ts
    levelCommands.ts
    sampleLevels.ts
  tiles/
    tileTypes.ts
    tileRegistry.ts
    tileRuntimeHandlers.ts
  abilities/
    abilityTypes.ts
    abilityRegistry.ts
    baseMoveAbility.ts
    baseJumpAbility.ts
    dashAbility.ts
  storage/
    levelRepository.ts
    importExport.ts
  types/
    common.ts
  styles/
    app.css
```

依赖方向应保持为：`app/editor/game/storage` 可以依赖 `levels/tiles/abilities/types`；领域层不得依赖 React、Phaser 或 localStorage。`game` 可使用 Phaser，但 `levels` 不能。

## 5. Level JSON Schema

### 示例

```json
{
  "schemaVersion": 1,
  "id": "level-forest-switch-001",
  "title": "开关练习",
  "author": "Player",
  "width": 24,
  "height": 14,
  "tileSize": 32,
  "enabledAbilities": ["move", "jump", "dash"],
  "layers": [
    {
      "id": "terrain",
      "name": "地形与机制",
      "kind": "tile",
      "visible": true,
      "tiles": ["empty", "empty", "solid", "... 共 width × height 项 ..."]
    }
  ],
  "metadata": {
    "createdAt": "2026-06-20T00:00:00.000Z",
    "updatedAt": "2026-06-20T00:00:00.000Z",
    "description": "使用 dash 水晶穿过障碍。",
    "tags": ["sample", "dash"]
  }
}
```

`tiles` 采用行优先（row-major）的一维数组，索引公式为 `index = y * width + x`；数组长度必须严格等于 `width * height`。示例中的省略符仅为阅读便利，真实 JSON 必须是完整数组。

### 字段约定

| 字段 | 说明 |
| --- | --- |
| `schemaVersion` | 必填正整数。导入时先按此字段迁移到当前版本，禁止猜测旧格式。 |
| `id` | 本地稳定标识。导入冲突时生成新 ID，而不是覆盖原关卡。 |
| `title` / `author` | 标题必填；作者可选。 |
| `width` / `height` / `tileSize` | 网格尺寸与像素单元大小。v1 约束为有限正整数，建议 tileSize 固定为 32。 |
| `enabledAbilities` | 本关启用能力 ID 数组；必须包含 `move` 与 `jump`，导入器会校验未知能力。 |
| `layers` | 有序图层。v1 至少一层 `kind: "tile"`；预留装饰层和对象层。 |
| `metadata` | 不影响运行的可选信息。不得放入 React/Phaser 私有状态。 |

建议的 TypeScript 草案：

```ts
type SchemaVersion = 1;
type TileId = string;
type AbilityId = "move" | "jump" | "dash" | "wallJump" | "doubleJump" | "carry";

interface TileLayerData {
  id: string;
  name: string;
  kind: "tile";
  visible: boolean;
  tiles: TileId[];
}

interface LevelDocument {
  schemaVersion: SchemaVersion;
  id: string;
  title: string;
  author?: string;
  width: number;
  height: number;
  tileSize: number;
  enabledAbilities: AbilityId[];
  layers: TileLayerData[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    description?: string;
    tags?: string[];
  };
}
```

未来如果 key、门等需要每个实例拥有颜色、链接 ID 或方向，可新增 `objects` 图层，例如 `{ id, type, x, y, properties }`，而不是破坏 tile 字符串格式。v1 的交互 tile 暂以统一的全局状态语义实现：任一 key 可开任一 lockedDoor，任一 switch 可切换所有 switchDoor。

## 6. Tile Registry Design

### 设计原则

1. registry 是 tile ID 的唯一权威来源；关卡数据只保存 ID。
2. 编辑器显示（颜色、图标、分类、描述）与运行语义（碰撞、危险、交互、行为 kind）在同一条定义中，但渲染实现不写进数据。
3. 机制优先表达为通用行为标签；只有确实依赖特定能力时才标记 `requiredAbilities`。例如 spring 是通用 tile，dashCrystal/dashBlock 才是 dash 专用 tile。
4. 导入未知 tile 时应阻止测试并显示错误；绝不能静默当作 empty。

### TypeScript 类型草案

```ts
type TileCategory = "terrain" | "hazard" | "marker" | "interaction" | "ability";
type CollisionKind = "none" | "solid" | "oneWay";
type RuntimeTileKind =
  | "empty" | "solid" | "oneWay" | "spike" | "spawn" | "goal"
  | "spring" | "key" | "lockedDoor" | "switch" | "switchDoor"
  | "dashCrystal" | "dashBlock";

interface TileEditorVisual {
  color: string;
  glyph: string;
  label: string;
  paletteOrder: number;
}

interface TileDefinition {
  id: string;
  name: string;
  category: TileCategory;
  collision: CollisionKind;
  hazardous: boolean;
  interactive: boolean;
  requiredAbilities?: AbilityId[];
  tags: string[];
  editor: TileEditorVisual;
  runtime: { kind: RuntimeTileKind };
}

type TileRegistry = Readonly<Record<string, TileDefinition>>;
```

### v1 tile 清单

| ID | 分类 | 碰撞 / 危险 / 交互 | 能力要求 | tags | 编辑器表现 | runtime 解释 |
| --- | --- | --- | --- | --- | --- | --- |
| `empty` | terrain | 无 / 否 / 否 | 无 | `background` | 深色空格 | 不创建实体 |
| `solid` | terrain | solid / 否 / 否 | 无 | `platform`,`block` | 灰色实心块 | 静态碰撞体 |
| `oneWayPlatform` | terrain | oneWay / 否 / 否 | 无 | `platform`,`one-way` | 浅色横板 | 仅下落时从上方承接玩家 |
| `spike` | hazard | 无 / 是 / 否 | 无 | `hazard`,`death` | 红色三角 | 接触 hitbox 即死亡 |
| `spawn` | marker | 无 / 否 / 否 | 无 | `marker`,`unique` | 绿色旗标 | 记录重生坐标；每关恰好一个 |
| `goal` | marker | 无 / 否 / 是 | 无 | `goal`,`unique` | 金色终点 | 接触后通关；每关恰好一个 |
| `spring` | interaction | 可站立 / 否 / 是 | 无 | `bounce`,`movement` | 紫色弹簧 | 从上方接触时赋予向上速度 |
| `key` | interaction | 无 / 否 / 是 | 无 | `collectible`,`unlock` | 黄色钥匙 | 接触后进入运行期 key 计数并隐藏 |
| `lockedDoor` | interaction | solid / 否 / 是 | 无 | `door`,`lock` | 棕色锁门 | 有 key 时消耗一把并移除；否则阻挡 |
| `switch` | interaction | 无 / 否 / 是 | 无 | `toggle`,`switch` | 蓝色按钮 | 接触/踩下切换 `switchDoorsOpen` |
| `switchDoor` | interaction | 状态决定 / 否 / 否 | 无 | `door`,`toggle` | 青色门 | 开关开时无碰撞/可见弱化，否则 solid |
| `dashCrystal` | ability | 无 / 否 / 是 | `dash` | `dash`,`refill` | 青色水晶 | 接触后重置 dash 可用次数；未启用 dash 时不可放置或标为无效 |
| `dashBlock` | ability | solid / 否 / 是 | `dash` | `dash`,`breakable` | 紫色裂纹块 | 被 dash 命中时移除；普通碰撞时阻挡 |

验证规则：地图必须有且仅有一个 spawn 与 goal；只有启用所需能力的关卡才能使用能力专用 tile；尺寸变化后仍须保持 tiles 数组长度正确。编辑器在 palette 中可将未启用能力的 tile 显示为锁定，并提供“启用 dash”快捷入口。

## 7. Ability System Design

基础移动和基础跳跃作为始终启用的基础能力；地图的 `enabledAbilities` 仍显式保存它们，让关卡意图和未来校验更清晰。能力定义与 tile 定义分离：tile 只声明需要的能力，能力本身不硬编码某个关卡。

```ts
interface AbilityDefinition {
  id: AbilityId;
  name: string;
  description: string;
  defaultEnabled: boolean;
  dependsOn?: AbilityId[];
  status: "implemented" | "reserved";
  configDefaults?: Record<string, number | boolean>;
}

interface AbilityRuntimeModule {
  id: AbilityId;
  onCreate?(ctx: AbilityContext): void;
  beforePlayerUpdate?(ctx: AbilityContext, deltaMs: number): void;
  afterPlayerUpdate?(ctx: AbilityContext, deltaMs: number): void;
  onTileContact?(ctx: AbilityContext, tile: TileDefinition): void;
  onRespawn?(ctx: AbilityContext): void;
}
```

v1 registry：

- `move`：已实现；水平加速、减速、最大速度。
- `jump`：已实现；起跳、可变跳高、土狼时间、跳跃缓冲。
- `dash`：建议 v1 实现；依赖 `move`，每次离地/晶体补充一次，短时固定方向高速移动。具体数值应集中在 `DashConfig`，不写在 tile handler 中。
- `wallJump`：`reserved`；未来需要墙面接触检测与脱离速度规则。
- `doubleJump`：`reserved`；未来需要空中跳跃次数和落地重置策略。
- `carry`：`reserved`；未来会引入可携带对象与投放规则，应使用对象层而非滥用 tile。

能力装配流程：校验 level 中的 ID → 自动加入基础能力 → 按依赖拓扑排序 → 创建已实现模块。对于 `reserved` 能力，v1 导入器应允许数据存在但不允许测试，并提示“该能力尚未实现”；编辑器可先不在正常开关中暴露它们。

## 8. Editor Design

### 工作区与交互

- 中心：可缩放/滚动的网格画布；v1 使用 React Canvas 或 DOM grid 均可，推荐 Canvas 以避免大网格产生大量 DOM 节点。
- 左侧：按 `terrain`、`hazard`、`marker`、`interaction`、`ability` 分组的 tile palette，展示 registry 的 glyph、名称、说明和锁定状态。
- 右侧：关卡属性（标题、作者、宽高、tileSize、启用能力）及当前 tile 说明。
- 顶部：新建、保存、测试、返回编辑器、导入、导出与关卡列表入口。

绘制操作包括：单击落 tile、拖拽连续绘制、右键或橡皮擦清空为 `empty`。选择 spawn/goal 后再次落点时，编辑器应移动已有 marker，不允许制造多个。尺寸调整必须显式选择“从右/下扩展或裁剪”，裁剪前预览受影响的非空格并确认。

### 测试模式

点击“测试当前关卡”先运行完整校验（结构、唯一 spawn/goal、未知 tile、能力依赖），成功后将不可变快照交给 Phaser。测试层应覆盖编辑画布或切换工作区，提供“返回编辑器”和提示：`R` 快速重开；通关/死亡后均可返回。结束测试后恢复原编辑状态，不写回已消耗物品和开门状态。

### 保存、列表、导入导出

- 自动保存可以延后；v1 用显式保存按钮与未保存标记，避免 localStorage 写入时机不透明。
- 关卡列表显示标题、更新时间、尺寸、能力标签，并支持新建、加载、复制、删除。
- 导入使用文件选择器读取单一 JSON：校验、迁移、显示错误或新建副本后保存。
- 导出下载格式化 JSON，文件名建议为 `jumpforge-<slug>-v<schemaVersion>.json`。
- 内置 2–3 个样例应作为只读模板（复制后编辑），覆盖基础跳跃、钥匙/开关解谜、dash 机制各一关。

## 9. Runtime Design

`TestScene` 的输入是 `{ level: LevelDocument, tileRegistry, abilityRegistry }`。启动时依次执行：

1. 校验并定位 spawn、goal；计算世界尺寸 `width * tileSize` 与 `height * tileSize`。
2. 遍历可见 tile 层，按 registry 的碰撞与 runtime kind 创建静态物理体/触发区；v1 可按单格创建，后续再做相邻 solid 合并优化。
3. 在 spawn 创建玩家；装配当前关卡启用且已实现的能力模块。
4. 每帧读取键盘，执行基础移动/跳跃和可选能力更新；使用 Arcade Physics 完成重力与实体碰撞。
5. 处理触发：spike/坠出世界死亡，spring 弹跳，key/门/开关修改 `RuntimeLevelState`，goal 触发通关，dash tile 调用 dash 行为。

玩家控制器的基础行为：

- 水平移动使用加速度、最大速度和地面/空中不同的减速参数，先保证可调，后打磨手感。
- 跳跃按下时优先消耗跳跃缓冲；离开地面后在土狼时间内允许起跳。
- 持续按住跳跃键时降低上升阶段的额外重力；松开后提高重力或截断上升速度，形成可变跳高。
- 死亡后短延迟或立即在 spawn 重置运行态并重建玩家；`R` 无条件从初始运行态重开。
- 掉出 `worldHeight + deathMargin` 即死亡；相机 v1 可固定或轻跟随，优先确保编辑坐标和运行坐标一致。

编辑器与 runtime 必须共用 `tileSize`、坐标原点（左上）和 tile registry。为避免显示不一致，v1 使用 registry 的 `editor.color` 作为 Phaser 临时图形的基准色；之后替换美术时仍保留同一 ID 与碰撞语义。

## 10. v1 Development Phases

### Phase 1：项目骨架与领域类型

建立 Vite/React/TypeScript 项目，定义 `LevelDocument`、schema 校验、迁移入口、tile registry、ability registry 和纯编辑命令。完成空白关卡创建及基本校验测试。

### Phase 2：编辑器基础

实现网格绘制、橡皮擦、palette、单一 tile 层、spawn/goal 唯一约束、地图尺寸调整与关卡属性面板。此阶段可只显示色块。

### Phase 3：运行时与基础物理

接入 Phaser，建立从编辑器启动/退出测试的桥接。实现移动、基础跳跃、可变跳高、土狼时间、跳跃缓冲、实体/单向平台碰撞、死亡、终点和 `R` 重开。

### Phase 4：机制 tile 与 dash

实现 spike、spring、key/lockedDoor、switch/switchDoor 的运行期状态；实现 dash 及 dashCrystal/dashBlock，补齐“能力未启用时不可使用专用 tile”的编辑器与校验提示。

### Phase 5：本地库、导入导出与样例

实现 localStorage repository、关卡列表、复制/删除、JSON 导入导出、版本迁移提示。加入 2–3 个只读模板关卡。

### Phase 6：打磨与 build

集中调动作参数、错误提示和编辑/运行画面一致性；验证刷新后保存内容、导出后可再导入、生产构建可运行。只在此时考虑简单 UI 美化。

## 11. Risks and Decisions

| 风险 | 决策与缓解 |
| --- | --- |
| Phaser 与 React 状态同步 | 编辑文档和运行态严格分离；测试只接收快照，退出测试不回写。Phaser 容器由单一 React host 统一创建/销毁。 |
| tile 行为扩展导致条件分支爆炸 | 以 `TileDefinition.runtime.kind` 和集中 handler 表分派；新增 tile 必须先补 registry、校验和 handler。 |
| 地图格式兼容 | 每份地图强制 `schemaVersion`；导入先校验再迁移，迁移函数链保留且有样本 JSON 测试。 |
| 平台跳跃手感调试 | 所有运动参数集中为 `PlayerTuning`；先锁定帧率无关的 delta 更新和可观测调试面板，再调数值。 |
| 编辑器与 runtime 显示不一致 | 共用 registry、tileSize、坐标换算和临时色彩；每新增 tile 至少建立编辑预览与 runtime 验证关。 |
| 机制组合不可控 | v1 将 key/door 与 switch/door 定义为全局简单语义；带通道、颜色、定时器等实例参数延后到对象层。 |
| localStorage 容量与损坏 | v1 仅存小型网格 JSON；写入前校验，读取失败时保留原始备份并提示导出恢复。 |

## 12. Recommended v1 Scope

### 必须完成

- React 编辑器：网格绘制、palette、擦除、尺寸设置、spawn/goal、能力开关、测试入口。
- 统一 tile registry，覆盖本文列出的 13 个 tile，并具备关卡校验。
- Phaser 测试运行时：移动、可变跳跃、土狼时间、跳跃缓冲、重力、碰撞、死亡、通关、R 重开、返回编辑器。
- `move`、`jump` 与 `dash` 的能力模型；dash、dashCrystal、dashBlock 的完整最小联动。
- localStorage 保存/关卡列表、JSON 导入导出、schemaVersion、2–3 个模板关卡。

### 明确延后

- wallJump、doubleJump、carry 的运行时实现（保留 ID 和扩展接口即可）。
- 多图层编辑、对象实例属性、颜色钥匙/配对门、移动平台、检查点、计时器和复杂机关。
- 复杂撤销/重做、自动地形连接、外部 Tiled 导入、移动端控制。
- 敌人、战斗、多人、排行榜、账号、云同步、在线分享、复杂资源/音乐/粒子。

v1 成功标准不是内容量，而是能在本地从空白网格快速做出一个可测试、可保存、可导出的短关卡，并且新增一种 tile 或能力时只需在清晰的注册表、handler 和校验边界内扩展。
