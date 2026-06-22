import { useMemo, useState } from 'react';
import { formatKeyBinding } from '../input/keybindingLabels';
import { loadKeybindings } from '../input/keybindingStorage';
import type { LevelDocument, MovementProfile } from '../levels/levelTypes';
import { saveCustomMovementProfile } from '../storage/customMovementProfileStorage';
import { defaultMovementProfile, getMovementPreset, movementPresetRegistry, resolveMovementProfile } from './movementPresets';
import { clampPlayerTuningValue, editablePlayerTuningKeys, playerTuningBounds, playerTuningLabels, type PlayerTuning, type PlayerTuningKey } from './playerTuning';
import { PhaserGameHost } from './PhaserGameHost';
import type { TestRuntimeStatus } from './TestScene';

interface TestingWorkspaceProps {
  level: LevelDocument;
  onExit: () => void;
  onComplete: () => void;
}

function cloneProfile(profile: MovementProfile | undefined): MovementProfile {
  return { ...(profile ?? defaultMovementProfile()), tuningOverrides: profile?.tuningOverrides ? { ...profile.tuningOverrides } : undefined };
}

export function TestingWorkspace({ level, onExit, onComplete }: TestingWorkspaceProps) {
  const [keybindings] = useState(() => loadKeybindings());
  const [status, setStatus] = useState<TestRuntimeStatus | null>(null);
  const [testProfile, setTestProfile] = useState<MovementProfile>(() => cloneProfile(level.movementProfile));
  const initialMovement = resolveMovementProfile(level.movementProfile);
  const [basePresetId, setBasePresetId] = useState(initialMovement.preset.id);
  const [draftTuning, setDraftTuning] = useState<PlayerTuning>(initialMovement.tuning);
  const [editingCustom, setEditingCustom] = useState(false);
  const [customName, setCustomName] = useState(level.movementProfile?.customName ?? '自定义手感');
  const [movementMessage, setMovementMessage] = useState('');
  const testLevel = useMemo(() => ({ ...level, movementProfile: testProfile }), [level, testProfile]);
  const currentPreset = getMovementPreset(basePresetId) ?? initialMovement.preset;

  const startCustomEditing = () => {
    const resolved = resolveMovementProfile(testProfile);
    setBasePresetId(resolved.preset.id);
    setDraftTuning(resolved.tuning);
    setCustomName(testProfile.customName ?? '自定义手感');
    setEditingCustom(true);
    setMovementMessage('');
  };

  const selectBasePreset = (presetId: string) => {
    const preset = getMovementPreset(presetId);
    if (!preset) return;
    setBasePresetId(preset.id);
    setDraftTuning({ ...preset.tuning });
  };

  const updateTuning = (key: PlayerTuningKey, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    setDraftTuning((current) => ({ ...current, [key]: clampPlayerTuningValue(key, value) }));
  };

  const applyCustomToTest = () => {
    setTestProfile({ presetId: basePresetId, customName: customName.trim() || '测试自定义', tuningOverrides: { ...draftTuning } });
    setStatus(null);
    setMovementMessage('已应用自定义数值，并从初始出生点重新开始测试。');
  };

  const saveCustom = () => {
    try {
      const saved = saveCustomMovementProfile({ name: customName, presetId: basePresetId, tuningOverrides: { ...draftTuning } });
      setCustomName(saved.name);
      setMovementMessage(`已保存“${saved.name}”。返回编辑器后可直接在模式下拉框中选择。`);
    } catch (error) {
      setMovementMessage(error instanceof Error ? error.message : '保存自定义手感失败。');
    }
  };

  return (
    <main className="testing-workspace">
      <aside className="testing-sidebar" aria-label="Test controls and status">
        <header className="testing-sidebar-header">
          <p className="eyebrow">TEST MODE</p>
          <h1>{level.title}</h1>
          <button type="button" onClick={onExit}>Return to editor</button>
        </header>

        <section className="testing-sidebar-section" aria-labelledby="testing-controls-heading">
          <h2 id="testing-controls-heading">Controls</h2>
          <dl className="testing-key-list">
            <div><dt>Move</dt><dd>{formatKeyBinding(keybindings.moveLeft)} / {formatKeyBinding(keybindings.moveRight)}</dd></div>
            <div><dt>Jump</dt><dd>{formatKeyBinding(keybindings.jump)} / {formatKeyBinding(keybindings.moveUp)}</dd></div>
            <div><dt>Dash</dt><dd>{formatKeyBinding(keybindings.dash)}</dd></div>
            <div><dt>Grab / climb</dt><dd>{formatKeyBinding(keybindings.grab)}</dd></div>
            <div><dt>Restart initial</dt><dd>{formatKeyBinding(keybindings.restart)}</dd></div>
            <div><dt>Return</dt><dd>{formatKeyBinding(keybindings.exitTest)}</dd></div>
          </dl>
        </section>

        <section className="testing-sidebar-section testing-movement-panel" aria-labelledby="testing-movement-heading">
          <h2 id="testing-movement-heading">Movement 手感</h2>
          <p className="testing-movement-current">本次测试：{testProfile.tuningOverrides ? (testProfile.customName ?? '自定义') : currentPreset.name}</p>
          {!editingCustom ? <button type="button" className="secondary-button" onClick={startCustomEditing}>编辑自定义数值</button> : <>
            <label>基准预设
              <select value={basePresetId} onChange={(event) => selectBasePreset(event.target.value)}>
                {Object.values(movementPresetRegistry).map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
              </select>
            </label>
            <div className="testing-tuning-grid">
              {editablePlayerTuningKeys.map((key) => {
                const bounds = playerTuningBounds[key];
                return <label key={key}>{playerTuningLabels[key]}
                  <input type="number" min={bounds.min} max={bounds.max} step={bounds.step} value={draftTuning[key]} onChange={(event) => updateTuning(key, event.target.value)} />
                </label>;
              })}
            </div>
            <button type="button" className="secondary-button" onClick={applyCustomToTest}>应用并重新开始测试</button>
            <label>保存名称<input maxLength={40} value={customName} onChange={(event) => setCustomName(event.target.value)} /></label>
            <button type="button" onClick={saveCustom}>保存为可选手感模式</button>
            <button type="button" className="text-button" onClick={() => setEditingCustom(false)}>收起数值编辑</button>
          </>}
          {movementMessage && <p className="testing-runtime-message" role="status">{movementMessage}</p>}
        </section>

        <section className="testing-sidebar-section" aria-labelledby="testing-status-heading">
          <h2 id="testing-status-heading">Status</h2>
          {status ? <>
            <dl className="testing-status-list">
              <div><dt>Movement</dt><dd>{status.movementPresetName}</dd></div>
              <div><dt>Dash</dt><dd>{status.dashStatus}</dd></div>
              <div><dt>Wall</dt><dd>{status.wallStatus}</dd></div>
              <div><dt>Stamina</dt><dd>{status.stamina}</dd></div>
              <div><dt>Checkpoint</dt><dd>{status.checkpointStatus}</dd></div>
              <div><dt>Keys</dt><dd>{status.keyCount}</dd></div>
              <div><dt>Berries</dt><dd>{status.collectibleCollectedCount} / {status.collectibleTotal}</dd></div>
              <div><dt>Switch doors</dt><dd>{status.switchDoorsOpen ? 'OPEN' : 'CLOSED'}</dd></div>
              <div><dt>Time</dt><dd>{status.elapsedSeconds}s</dd></div>
              <div><dt>Restarts</dt><dd>{status.restartCount}</dd></div>
            </dl>
            <p className="testing-runtime-message" role="status">{status.message}</p>
          </> : <p className="testing-runtime-message">Starting test…</p>}
        </section>
      </aside>

      <section className="testing-game-panel" aria-label="Level test game">
        <PhaserGameHost level={testLevel} keybindings={keybindings} onExit={onExit} onComplete={onComplete} onStatusChange={setStatus} />
      </section>
    </main>
  );
}
