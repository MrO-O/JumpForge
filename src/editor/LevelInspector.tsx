import { useEffect, useState } from 'react';
import { normalizeEnabledAbilities } from '../abilities/abilityRegistry';
import type { AbilityId } from '../abilities/abilityTypes';
import { defaultMovementProfile, getMovementPreset, movementPresetRegistry, resolveMovementProfile } from '../game/movementPresets';
import { getNonEmptyTilesOutsideBounds, resizeLevel } from '../levels/levelCommands';
import type { LevelDocument, LevelValidationResult, MovementProfile } from '../levels/levelTypes';
import { deleteCustomMovementProfile, loadCustomMovementProfiles, type SavedCustomMovementProfile } from '../storage/customMovementProfileStorage';

interface LevelInspectorProps {
  level: LevelDocument;
  validation: LevelValidationResult;
  onChange: (level: LevelDocument) => void;
  onNotice: (message: string) => void;
}

function isSavedProfileSelected(profile: MovementProfile, savedProfile: SavedCustomMovementProfile): boolean {
  return profile.presetId === savedProfile.presetId
    && profile.customName === savedProfile.name
    && JSON.stringify(profile.tuningOverrides) === JSON.stringify(savedProfile.tuningOverrides);
}

export function LevelInspector({ level, validation, onChange, onNotice }: LevelInspectorProps) {
  const [width, setWidth] = useState(String(level.width));
  const [height, setHeight] = useState(String(level.height));
  const [savedCustomProfiles, setSavedCustomProfiles] = useState<SavedCustomMovementProfile[]>(() => loadCustomMovementProfiles());
  const profile = level.movementProfile ?? defaultMovementProfile();
  const resolvedMovement = resolveMovementProfile(profile);
  const selectedSavedProfile = savedCustomProfiles.find((savedProfile) => isSavedProfileSelected(profile, savedProfile));
  const selectionValue = selectedSavedProfile ? `saved:${selectedSavedProfile.id}` : profile.tuningOverrides ? 'current-custom' : profile.presetId;

  useEffect(() => setWidth(String(level.width)), [level.width]);
  useEffect(() => setHeight(String(level.height)), [level.height]);

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

  const selectMovementProfile = (value: string) => {
    if (value === 'current-custom') return;
    const savedProfile = value.startsWith('saved:') ? savedCustomProfiles.find((candidate) => candidate.id === value.slice('saved:'.length)) : undefined;
    if (savedProfile) {
      update({ movementProfile: { presetId: savedProfile.presetId, customName: savedProfile.name, tuningOverrides: { ...savedProfile.tuningOverrides } } });
      return;
    }
    if (!getMovementPreset(value)) return;
    update({ movementProfile: { presetId: value } });
  };

  const deleteSelectedCustomProfile = () => {
    if (!selectedSavedProfile) return;
    if (!window.confirm(`删除已保存的自定义手感“${selectedSavedProfile.name}”？当前关卡会保留自己的数值。`)) return;
    try {
      setSavedCustomProfiles(deleteCustomMovementProfile(selectedSavedProfile.id));
      onNotice('已删除保存的自定义手感。');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '删除自定义手感失败。');
    }
  };

  const selectedPreset = getMovementPreset(profile.presetId) ?? resolvedMovement.preset;

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
        <label>模式
          <select value={selectionValue} onChange={(event) => selectMovementProfile(event.target.value)}>
            {Object.values(movementPresetRegistry).map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            {profile.tuningOverrides && !selectedSavedProfile && <option value="current-custom">当前自定义：{profile.customName ?? '未保存'}</option>}
            {savedCustomProfiles.map((savedProfile) => <option key={savedProfile.id} value={`saved:${savedProfile.id}`}>自定义：{savedProfile.name}</option>)}
          </select>
        </label>
        <p className="movement-description">{selectedPreset.description}{selectedPreset.recommendedFor ? ` 推荐：${selectedPreset.recommendedFor}` : ''}</p>
        <p className="reserved-note">选择后立即成为本关卡的手感标签。自定义数值请在“测试关卡”中编辑和保存。</p>
        {selectedSavedProfile && <button type="button" className="text-button" onClick={deleteSelectedCustomProfile}>删除保存的“{selectedSavedProfile.name}”</button>}
      </section>

      <section className={`validation-panel${validation.valid ? ' is-valid' : ' is-invalid'}`}>
        <h3>{validation.valid ? 'Level valid' : 'Level invalid'}</h3>
        {validation.valid ? <p>可保存并导出。</p> : <ul>{validation.errors.map((error) => <li key={`${error.path}-${error.message}`}>{error.message}</li>)}</ul>}
      </section>
    </aside>
  );
}
