import { validateLevel } from '../levels/levelCommands';
import type { LevelDocument } from '../levels/levelTypes';
import { getMovementPreset } from '../game/movementPresets';

interface LevelLibraryProps {
  samples: readonly LevelDocument[];
  savedLevels: readonly LevelDocument[];
  onCreate: () => void;
  onEditTemplate: (level: LevelDocument) => void;
  onLoad: (level: LevelDocument) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (level: LevelDocument) => void;
  onImport: () => void;
}

function updatedAt(level: LevelDocument): string {
  const value = level.metadata?.updatedAt;
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '未保存';
}

function movementLabel(level: LevelDocument): string {
  const profile = level.movementProfile;
  if (profile?.tuningOverrides) return profile.customName ?? '自定义手感';
  return getMovementPreset(profile?.presetId)?.name ?? 'Balanced';
}

function LevelCard({ level, source, onOpen, onDuplicate, onDelete, onExport }: {
  level: LevelDocument;
  source: 'template' | 'saved';
  onOpen: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport: () => void;
}) {
  const validation = validateLevel(level);
  return (
    <article className="level-card">
      <div className="level-card-heading">
        <div>
          <span className={`status ${validation.valid ? 'valid' : 'invalid'}`}>{validation.valid ? 'valid' : 'invalid'}</span>
          <h3>{level.title}</h3>
        </div>
        <span className="source-badge">{source === 'template' ? '模板' : '本地'}</span>
      </div>
      <p className="muted">{level.width} × {level.height} · {level.tileSize}px</p>
      <div className="level-tags"><span className="level-tag">手感：{movementLabel(level)}</span>{level.enabledAbilities.map((ability) => <span className="level-tag" key={ability}>{ability}</span>)}</div>
      <p className="updated-at">更新：{updatedAt(level)}</p>
      <div className="card-actions">
        <button type="button" onClick={onOpen}>{source === 'template' ? '复制并编辑' : '加载编辑'}</button>
        <button type="button" className="secondary-button" onClick={onExport}>导出</button>
        {onDuplicate && <button type="button" className="secondary-button" onClick={onDuplicate}>复制</button>}
        {onDelete && <button type="button" className="danger-button" onClick={onDelete}>删除</button>}
      </div>
    </article>
  );
}

export function LevelLibrary({ samples, savedLevels, onCreate, onEditTemplate, onLoad, onDuplicate, onDelete, onExport, onImport }: LevelLibraryProps) {
  return (
    <main className="library-page">
      <header className="library-header">
        <div>
          <p className="eyebrow">PHASE 2 · LEVEL EDITOR</p>
          <h1>JumpForge</h1>
          <p>创建、保存、导入并编辑浏览器本地关卡。</p>
        </div>
        <div className="library-primary-actions">
          <button type="button" className="secondary-button" onClick={onImport}>导入 JSON</button>
          <button type="button" onClick={onCreate}>新建关卡</button>
        </div>
      </header>

      <section className="library-section" aria-labelledby="my-levels-heading">
        <div className="section-heading"><h2 id="my-levels-heading">我的关卡</h2><span>{savedLevels.length} 个本地关卡</span></div>
        {savedLevels.length === 0 ? <div className="empty-state">还没有保存的关卡。新建一个，或从下方模板复制开始。</div> : (
          <div className="level-card-grid">
            {savedLevels.map((level) => <LevelCard key={level.id} level={level} source="saved" onOpen={() => onLoad(level)} onExport={() => onExport(level)} onDuplicate={() => onDuplicate(level.id)} onDelete={() => onDelete(level.id)} />)}
          </div>
        )}
      </section>

      <section className="library-section" aria-labelledby="templates-heading">
        <div className="section-heading"><h2 id="templates-heading">内置模板</h2><span>模板不会被直接修改</span></div>
        <div className="level-card-grid">
          {samples.map((level) => <LevelCard key={level.id} level={level} source="template" onOpen={() => onEditTemplate(level)} onExport={() => onExport(level)} />)}
        </div>
      </section>
    </main>
  );
}
