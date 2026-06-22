# JumpForge Git 分支工作流

## 目标

JumpForge 使用轻量的短生命周期分支流程，隔离功能开发、修复和高风险实验，同时保持项目容易维护。

- \`main\` 是稳定分支，必须始终可以构建。
- GitHub Pages 以 \`main\` 为部署来源。
- 不要直接在 \`main\` 上实现复杂功能；每项任务应从 \`main\` 创建独立分支。
- 验收通过后才合并回 \`main\`。失败的高风险实验可以直接删除分支，不污染 \`main\`。

## 分支命名

\`\`\`text
feat/<short-name>        新功能
fix/<short-name>         bug 修复
chore/<short-name>       工程维护
docs/<short-name>        文档
refactor/<short-name>    重构
experiment/<short-name>  高风险实验
\`\`\`

示例：

\`\`\`text
feat/checkpoint
feat/crumble-block
fix/testing-sidebar-layout
fix/half-block-brush
chore/git-workflow
experiment/custom-aabb-controller
experiment/partial-tile-collision
\`\`\`

\`experiment/*\` 专门用于高风险任务，例如自定义 AABB controller、半块碰撞彻底重构或地图 schema 大改。实验分支不应直接部署；若实验失败，可在确认无需保留改动后删除分支。

## 日常开发

开始一项任务前，先同步并确认稳定基线：

\`\`\`bash
git checkout main
git pull
git status
git checkout -b feat/some-feature
\`\`\`

完成任务后，先验证变更：

\`\`\`bash
npm run build
git status
git diff --stat
\`\`\`

内置 sample level 不是每个功能任务的固定产物。默认使用编辑器临时搭建验收场景，并在交付时说明手动验证步骤；只有用户明确要求、任务本身是整理内置关卡，或现有样例需要兼容性调整时，才修改 `sampleLevels.ts`。

### 默认合并方式：squash merge

JumpForge 目前是小型个人项目，默认推荐 squash merge：它让 \`main\` 保持线性历史，并将一次已验收的任务保留为一个清晰的提交，而不会把分支上的试验性提交带入稳定分支。

\`\`\`bash
git add .
git commit -m "feat: describe change"
git checkout main
git merge --squash feat/some-feature
git commit -m "feat: describe change"
npm run build
git push
\`\`\`

普通 merge 也可以用于希望保留分支内提交历史的任务：

\`\`\`bash
git checkout main
git merge feat/some-feature
npm run build
git push
\`\`\`

无论使用哪种方式，都必须在合并前完成验收；未经验收的实验不得合并到 \`main\`。

## 提交信息

推荐格式为 \`type: concise description\`：

\`\`\`text
feat: add checkpoint respawn tile
fix: prevent testing sidebar from covering canvas
chore: add Git workflow guide
docs: update deployment notes
refactor: split input keybinding storage
experiment: prototype custom AABB controller
\`\`\`

- 一次提交尽量对应一个完整任务。
- 不要把多个无关功能混进同一个提交。
- 构建失败不要提交到 \`main\`。
- 未验收的实验不要合并到 \`main\`。

## 任务风险分级

适合普通 \`feat/*\`、\`fix/*\` 或其他常规分支的任务：

- 新 tile；
- 小型 UI 改进；
- README 更新；
- keybindings 设置；
- sample level 调整；
- GitHub Pages workflow 修复。

以下任务必须从 \`experiment/*\` 开始，验收并明确决定后才可转入稳定实现：

- 自定义 kinematic AABB / swept collision controller；
- 改 Level JSON schema；
- 引入 object layer；
- 大规模编辑器重构；
- Phaser runtime 重构；
- collision merge 大改；
- 存储迁移；
- 新的导入导出格式。

## 回滚与清理

查看提交：

\`\`\`bash
git log --oneline
\`\`\`

撤销尚未提交的全部改动：

\`\`\`bash
git restore .
\`\`\`

撤销一个文件的未提交改动：

\`\`\`bash
git restore path/to/file
\`\`\`

删除失败的实验分支：

\`\`\`bash
git checkout main
git branch -D experiment/some-risky-task
\`\`\`

- 不要擅自使用 \`git reset --hard\`。
- 不要擅自使用 \`git push --force\`。
- 不要删除用户未提交的工作。
- 删除分支前必须确认该分支没有需要保留的改动。
- 已合并的改动如需撤销，应先询问用户；不要由 agent 擅自 reset 或强推。
