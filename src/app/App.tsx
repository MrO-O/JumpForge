import { useRef, useState } from 'react';
import { EditorWorkspace } from '../editor/EditorWorkspace';
import { TestingWorkspace } from '../game/TestingWorkspace';
import { cloneLevel, createEmptyLevel, createLevelId } from '../levels/levelCommands';
import { validateLevel } from '../levels/levelCommands';
import { sampleLevels } from '../levels/sampleLevels';
import type { LevelDocument } from '../levels/levelTypes';
import { exportLevelToJson, importLevelFromJson } from '../storage/importExport';
import { deleteLevel, duplicateLevel, listLevels, saveLevel, storedLevelIds } from '../storage/levelRepository';
import { LevelLibrary } from './LevelLibrary';
import { ControlsSettings } from '../input/ControlsSettings';
import type { KeyBindingMap } from '../input/inputTypes';
import { loadKeybindings, saveKeybindings } from '../input/keybindingStorage';
import '../styles/app.css';

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [mode, setMode] = useState<'library' | 'editor' | 'testing'>('library');
  const [activeLevel, setActiveLevel] = useState<LevelDocument | null>(null);
  const [testSnapshot, setTestSnapshot] = useState<LevelDocument | null>(null);
  const [savedLevels, setSavedLevels] = useState<LevelDocument[]>(() => {
    try { return listLevels(); } catch { return []; }
  });
  const [notice, setNotice] = useState<string>('');
  const [keybindings, setKeybindings] = useState<KeyBindingMap>(() => loadKeybindings());
  const [controlsOpen, setControlsOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refreshLevels = () => {
    try { setSavedLevels(listLevels()); } catch (error) { setNotice(error instanceof Error ? error.message : '无法读取本地关卡。'); }
  };
  const openEditor = (level: LevelDocument) => { setActiveLevel(cloneLevel(level)); setMode('editor'); };
  const createLevel = () => { openEditor(createEmptyLevel()); setNotice('已创建新关卡。保存后会出现在“我的关卡”中。'); };
  const copyTemplate = (template: LevelDocument) => {
    const copy = cloneLevel(template);
    copy.id = createLevelId('level');
    copy.title = `${copy.title} 副本`;
    copy.metadata = { ...copy.metadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    openEditor(copy);
    setNotice('模板已复制为可编辑关卡。');
  };
  const saveActive = () => {
    if (!activeLevel) return;
    try {
      const saved = saveLevel(activeLevel);
      setActiveLevel(saved);
      refreshLevels();
      setNotice('关卡已保存到浏览器本地存储。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败。请先修正校验错误。');
    }
  };
  const startTest = () => {
    if (!activeLevel) return;
    const validation = validateLevel(activeLevel);
    if (!validation.valid) {
      setNotice(`关卡无效：${validation.errors.map((error) => error.message).join('；')}`);
      return;
    }
    setTestSnapshot(cloneLevel(activeLevel));
    setMode('testing');
  };
  const exitTest = () => {
    setTestSnapshot(null);
    setMode('editor');
  };
  const updateKeybindings = (next: KeyBindingMap) => {
    try {
      setKeybindings(saveKeybindings(next));
    } catch {
      setKeybindings(next);
      setNotice('Unable to save controls in browser storage. They will remain active until this page is reloaded.');
    }
  };
  const exportLevel = (level: LevelDocument) => {
    try { downloadJson(`${level.id}.json`, exportLevelToJson(level)); setNotice('JSON 已导出。'); }
    catch (error) { setNotice(error instanceof Error ? error.message : '导出失败。'); }
  };
  const duplicateSaved = (id: string) => {
    try { const copy = duplicateLevel(id); refreshLevels(); openEditor(copy); setNotice('已创建本地副本。'); }
    catch (error) { setNotice(error instanceof Error ? error.message : '复制失败。'); }
  };
  const removeSaved = (id: string) => {
    if (!window.confirm('确定删除这个本地关卡吗？此操作无法撤销。')) return;
    try { deleteLevel(id); refreshLevels(); setNotice('本地关卡已删除。'); }
    catch (error) { setNotice(error instanceof Error ? error.message : '删除失败。'); }
  };
  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const level = importLevelFromJson(await file.text(), storedLevelIds());
      const saved = saveLevel(level);
      refreshLevels();
      openEditor(saved);
      setNotice('关卡导入并保存成功。');
    } catch (error) {
      const details = error instanceof Error && 'details' in error && Array.isArray(error.details) ? error.details.join('；') : '';
      setNotice(`${error instanceof Error ? error.message : '导入失败。'}${details ? ` ${details}` : ''}`);
    }
  };

  return (
    <>
      {mode === 'testing' && testSnapshot ? (
        <TestingWorkspace level={testSnapshot} onExit={exitTest} onComplete={() => setNotice('关卡测试已通关。')} />
      ) : mode === 'library' || !activeLevel ? (
        <LevelLibrary samples={sampleLevels} savedLevels={savedLevels} onCreate={createLevel} onEditTemplate={copyTemplate} onLoad={openEditor} onDuplicate={duplicateSaved} onDelete={removeSaved} onExport={exportLevel} onImport={() => importInputRef.current?.click()} />
      ) : (
        <EditorWorkspace level={activeLevel} onChange={setActiveLevel} onSave={saveActive} onTest={startTest} onBack={() => { refreshLevels(); setMode('library'); }} onNotice={setNotice} />
      )}
      <input ref={importInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFile} />
      {(mode === 'library' || !activeLevel) && <button type="button" className="app-controls-button secondary-button" onClick={() => setControlsOpen(true)}>Controls</button>}
      {controlsOpen && <ControlsSettings bindings={keybindings} onChange={updateKeybindings} onClose={() => setControlsOpen(false)} />}
      {notice && <div className="app-notice" role="status">{notice}<button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    </>
  );
}
