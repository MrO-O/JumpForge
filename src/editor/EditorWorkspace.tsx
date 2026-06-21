import { useEffect, useMemo, useState } from 'react';
import { exportLevelToJson } from '../storage/importExport';
import { placeTileAt, validateLevel } from '../levels/levelCommands';
import type { LevelDocument } from '../levels/levelTypes';
import type { TileId } from '../tiles/tileTypes';
import { GridEditor } from './GridEditor';
import { LevelInspector } from './LevelInspector';
import { TilePalette } from './TilePalette';

interface EditorWorkspaceProps {
  level: LevelDocument;
  onChange: (level: LevelDocument) => void;
  onSave: () => void;
  onTest: () => void;
  onBack: () => void;
  onNotice: (message: string) => void;
}

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function EditorWorkspace({ level, onChange, onSave, onTest, onBack, onNotice }: EditorWorkspaceProps) {
  const [selectedTileId, setSelectedTileId] = useState<TileId>('solid');
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const validation = useMemo(() => validateLevel(level), [level]);
  const halfVariants: TileId[] = ['halfBlockTop', 'halfBlockBottom', 'halfBlockLeft', 'halfBlockRight'];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== 'Space' || !halfVariants.includes(selectedTileId) || target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      const index = halfVariants.indexOf(selectedTileId);
      const direction = event.shiftKey ? -1 : 1;
      setSelectedTileId(halfVariants[(index + direction + halfVariants.length) % halfVariants.length]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTileId]);

  const exportCurrent = () => {
    try {
      downloadJson(`${level.id}.json`, exportLevelToJson(level));
      onNotice('已导出当前关卡 JSON。');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '导出失败。');
    }
  };

  const testCurrent = () => {
    if (!validation.valid) {
      onNotice(`关卡无效：${validation.errors.map((error) => error.message).join('；')}`);
      return;
    }
    onTest();
  };

  return (
    <main className="editor-workspace">
      <header className="editor-toolbar">
        <button type="button" className="secondary-button" onClick={onBack}>← 关卡列表</button>
        <div className="toolbar-title"><strong>{level.title || '未命名关卡'}</strong><span>{level.width} × {level.height}</span></div>
        <div className="toolbar-actions">
          <span className={validation.valid ? 'toolbar-valid' : 'toolbar-invalid'}>{validation.valid ? 'Level valid' : 'Level invalid'}</span>
          <button type="button" className="secondary-button" onClick={testCurrent}>测试关卡</button>
          <button type="button" className="secondary-button" onClick={exportCurrent}>导出 JSON</button>
          <button type="button" onClick={onSave}>保存</button>
        </div>
      </header>
      <div className="editor-layout">
        <TilePalette level={level} selectedTileId={selectedTileId} onSelect={setSelectedTileId} onNotice={onNotice} />
        <div className="editor-center">
          <GridEditor
            level={level}
            selectedTileId={selectedTileId}
            onPaint={(x, y, tileId) => onChange(placeTileAt(level, level.layers[0].id, x, y, tileId))}
            onHover={(x, y) => setHoverCell({ x, y })}
          />
          <footer className="editor-status">{hoverCell ? `Hover: (${hoverCell.x}, ${hoverCell.y})` : 'Hover a cell to see its coordinates'} · 选中：{selectedTileId}</footer>
        </div>
        <LevelInspector level={level} validation={validation} onChange={onChange} onNotice={onNotice} />
      </div>
    </main>
  );
}
