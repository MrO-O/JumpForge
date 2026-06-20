import { useEffect, useState } from 'react';
import { normalizeEnabledAbilities } from '../abilities/abilityRegistry';
import type { AbilityId } from '../abilities/abilityTypes';
import { defaultMovementProfile, getMovementPreset, resolveMovementProfile } from '../game/movementPresets';
import { clampPlayerTuningValue, editablePlayerTuningKeys, playerTuningBounds, playerTuningLabels, type PlayerTuningKey } from '../game/playerTuning';
import { getNonEmptyTilesOutsideBounds, resizeLevel } from '../levels/levelCommands';
import type { LevelDocument, LevelValidationResult, MovementProfile } from '../levels/levelTypes';

interface LevelInspectorProps {
  level: LevelDocument;
  validation: LevelValidationResult;
  onChange: (level: LevelDocument) => void;
  onNotice: (message: string) => void;
}

export function LevelInspector({ level, validation, onChange, onNotice }: LevelInspectorProps) {
  const [width, setWidth] = useState(String(level.width));
  const [height, setHeight] = useState(String(level.height));
  const profile = level.movementProfile ?? defaultMovementProfile();
  const resolvedMovement = resolveMovementProfile(profile);
  const [selectedPresetId, setSelectedPresetId] = useState(profile.presetId);
  const [editingCustom, setEditingCustom] = useState(Boolean(profile.tuningOverrides));

  useEffect(() => setWidth(String(level.width)), [level.width]);
  useEffect(() => setHeight(String(level.height)), [level.height]);
  useEffect(() => setSelectedPresetId(profile.presetId), [profile.presetId]);
  useEffect(() => setEditingCustom(Boolean(profile.tuningOverrides)), [profile.tuningOverrides]);

  const update = (patch: Partial<LevelDocument>) => onChange({ ...level, ...patch, metadata: { ...level.metadata, updatedAt: new Date().toISOString() } });
  const resize = () => {
    const nextWidth = Number(width);
    const nextHeight = Number(height);
    if (!Number.isInteger(nextWidth) || !Number.isInteger(nextHeight) || nextWidth < 1 || nextHeight < 1) {
      onNotice('宽度和高度必须是正整数。');
      return;
    }
    const cropped = getNonEmptyTilesOutsideBounds(level, nextWidth, nextHeight);
    if (cropped.length > 0 && !window.confirm(`缩小地图会裁剪 ${cropped.length} 个非空 tile。要继续吗？`)) return;
    onChange(resizeLevel(level, nextWidth, nextHeight));
  };

  const setDash = (enabled: boolean) => {
    const hasDashTiles = level.layers.some((layer) => layer.tiles.some((tile) => tile === 'dashCrystal' || tile === 'dashBlock'));
    if (!enabled && hasDashTiles) {
      onNotice('地图中仍有 dashCrystal 或 dashBlock；请先清理这些 tile，才能关闭 dash。');
      return;
    }
    update({ enabledAbilities: enabled ? normalizeEnabledAbilities([...level.enabledAbilities, 'dash']) : level.enabledAbilities.filter((ability) => ability !== 'dash') });
  };
  const setOptionalAbility = (abilityId: Extract<AbilityId, 'wallJump' | 'wallClimb'>, enabled: boolean) => {
    const requiredTiles = abilityId === 'wallClimb' ? ['climbWall', 'staminaRefill'] : [];
    const hasRequiredTiles = requiredTiles.length > 0 && level.layers.some((layer) => layer.tiles.some((tile) => requiredTiles.includes(tile)));
    if (!enabled && hasRequiredTiles) {
      onNotice(`地图中仍有 ${requiredTiles.join(' 或 ')}；请先清理这些 tile，才能关闭 ${abilityId}。`);
      return;
    }
    update({ enabledAbilities: enabled ? normalizeEnabledAbilities([...level.enabledAbilities, abilityId]) : level.enabledAbilities.filter((ability) => ability !== abilityId) });
  };

  const updateMovementProfile = (movementProfile: MovementProfile) => update({ movementProfile });
  const applyPreset = () => {
    if (!getMovementPreset(selectedPresetId)) {
      onNotice('请选择有效的 movement preset。');
      return;
    }
    updateMovementProfile({ presetId: selectedPresetId });
    setEditingCustom(false);
  };
  const setCustomEditing = (enabled: boolean) => {
    if (!enabled) {
      updateMovementProfile({ presetId: profile.presetId });
      setEditingCustom(false);
      return;
    }
    updateMovementProfile({
      presetId: profile.presetId,
      customName: profile.customName ?? '本关卡自定义',
      tuningOverrides: { ...profile.tuningOverrides },
    });
    setEditingCustom(true);
  };
  const updateTuning = (key: PlayerTuningKey, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    updateMovementProfile({
      presetId: profile.presetId,
      customName: profile.customName ?? '本关卡自定义',
      tuningOverrides: { ...profile.tuningOverrides, [key]: clampPlayerTuningValue(key, value) },
    });
  };
  const saveCustom = () => {
    updateMovementProfile({
      presetId: profile.presetId,
      customName: profile.customName ?? '本关卡自定义',
      tuningOverrides: { ...profile.tuningOverrides },
    });
    onNotice('已保存为当前关卡的自定义手感；请点击顶部“保存”写入 localStorage。');
  };

  const selectedPreset = getMovementPreset(selectedPresetId) ?? resolvedMovement.preset;

  return (
    <aside className="inspector" aria-label="Level inspector">
      <div className="panel-title-row"><h2>关卡属性</h2><span>tile 32px</span></div>
      <label>标题<input value={level.title} onChange={(event) => update({ title: event.target.value })} /></label>
      <label>作者<input value={level.author ?? ''} onChange={(event) => update({ author: event.target.value || undefined })} /></label>
      <label>说明<textarea rows={3} value={level.metadata?.description ?? ''} onChange={(event) => update({ metadata: { ...level.metadata, description: event.target.value } })} /></label>
      <label>标签（逗号分隔）<input value={(level.metadata?.tags ?? []).join(', ')} onChange={(event) => update({ metadata: { ...level.metadata, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) } })} /></label>

      <section className="inspector-section">
        <h3>地图尺寸</h3>
        <div className="dimension-fields">
          <label>宽<input inputMode="numeric" value={width} onChange={(event) => setWidth(event.target.value)} /></label>
          <label>高<input inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value)} /></label>
        </div>
        <button type="button" className="secondary-button" onClick={resize}>应用尺寸</button>
      </section>

      <section className="inspector-section">
        <h3>动作能力</h3>
        <label className="checkbox-row"><input type="checkbox" checked disabled />move <small>基础</small></label>
        <label className="checkbox-row"><input type="checkbox" checked disabled />jump <small>基础</small></label>
        <label className="checkbox-row"><input type="checkbox" checked={level.enabledAbilities.includes('dash')} onChange={(event) => setDash(event.target.checked)} />dash <small>可选</small></label>
        <label className="checkbox-row"><input type="checkbox" checked={level.enabledAbilities.includes('wallJump')} onChange={(event) => setOptionalAbility('wallJump', event.target.checked)} />wallJump <small>可选</small></label>
        <label className="checkbox-row"><input type="checkbox" checked={level.enabledAbilities.includes('wallClimb')} onChange={(event) => setOptionalAbility('wallClimb', event.target.checked)} />wallClimb <small>可选</small></label>
        <p className="reserved-note">doubleJump、carry：reserved，尚不能启用。</p>
      </section>

      <section className="inspector-section movement-panel">
        <h3>Movement 手感</h3>
        <label>预设
          <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)}>
            <option value="balanced">Balanced</option>
            <option value="precision">Precision</option>
            <option value="floaty">Floaty</option>
            <option value="heavy">Heavy</option>
            <option value="dashFocused">Dash Focused</option>
          </select>
        </label>
        <p className="movement-description">{selectedPreset.description}{selectedPreset.recommendedFor ? ` 推荐：${selectedPreset.recommendedFor}` : ''}</p>
        <div className="movement-actions">
          <button type="button" className="secondary-button" onClick={applyPreset}>应用预设</button>
          <button type="button" className="secondary-button" onClick={() => { updateMovementProfile({ presetId: profile.presetId }); setEditingCustom(false); }}>重置为预设</button>
        </div>
        <label className="checkbox-row"><input type="checkbox" checked={editingCustom} onChange={(event) => setCustomEditing(event.target.checked)} />编辑本关卡自定义数值</label>
        {editingCustom && <>
          <div className="movement-tuning-grid">
            {editablePlayerTuningKeys.map((key) => {
              const bounds = playerTuningBounds[key];
              return <label key={key}>{playerTuningLabels[key]}
                <input type="number" min={bounds.min} max={bounds.max} step={bounds.step} value={resolvedMovement.tuning[key]} onChange={(event) => updateTuning(key, event.target.value)} />
              </label>;
            })}
          </div>
          <button type="button" className="secondary-button" onClick={saveCustom}>保存为本关卡自定义</button>
        </>}
      </section>

      <section className={`validation-panel${validation.valid ? ' is-valid' : ' is-invalid'}`}>
        <h3>{validation.valid ? 'Level valid' : 'Level invalid'}</h3>
        {validation.valid ? <p>可保存并导出。</p> : <ul>{validation.errors.map((error) => <li key={`${error.path}-${error.message}`}>{error.message}</li>)}</ul>}
      </section>
    </aside>
  );
}
