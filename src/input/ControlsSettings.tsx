import { useEffect, useState } from 'react';
import { createDefaultKeybindings, isSupportedKeyCode } from './defaultKeybindings';
import { formatKeyBinding, inputActionLabels, keybindingLabel } from './keybindingLabels';
import { findKeybindingConflicts } from './keybindingStorage';
import { inputActions, type InputAction, type KeyBindingMap, type KeyBindingSlot } from './inputTypes';

interface RecordingTarget {
  action: InputAction;
  slot: KeyBindingSlot;
}

interface ControlsSettingsProps {
  bindings: KeyBindingMap;
  onChange: (bindings: KeyBindingMap) => void;
  onClose: () => void;
}

export function ControlsSettings({ bindings, onChange, onClose }: ControlsSettingsProps) {
  const [recording, setRecording] = useState<RecordingTarget | null>(null);
  const [message, setMessage] = useState('');

  const applyBinding = (target: RecordingTarget, code: string) => {
    if (!isSupportedKeyCode(code)) {
      setMessage('That key is not available for a JumpForge binding.');
      return;
    }
    const current = bindings[target.action];
    if (target.slot === 'secondary' && current.primary === code) {
      setMessage('Primary and secondary bindings must be different.');
      return;
    }
    const conflicts = findKeybindingConflicts(bindings, target.action, code);
    if (conflicts.length > 0) {
      setMessage(`${keybindingLabel(code)} is already used by ${inputActionLabels[conflicts[0].action]}. Clear that binding first.`);
      return;
    }
    const nextBinding = target.slot === 'primary'
      ? { primary: code, secondary: current.secondary === code ? undefined : current.secondary }
      : { ...current, secondary: code };
    onChange({ ...bindings, [target.action]: nextBinding });
    setRecording(null);
    setMessage(`${inputActionLabels[target.action]} updated to ${formatKeyBinding(nextBinding)}.`);
  };

  useEffect(() => {
    if (!recording) return undefined;
    const captureKey = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.repeat) return;
      if (event.ctrlKey || event.altKey || event.metaKey) {
        setMessage('Modifier-key combinations are not supported.');
        return;
      }
      if (event.code === 'Tab' || event.code === 'F5') {
        setMessage(`${event.code === 'F5' ? 'F5' : 'Tab'} cannot be used as a binding.`);
        return;
      }
      applyBinding(recording, event.code);
    };
    window.addEventListener('keydown', captureKey, true);
    return () => window.removeEventListener('keydown', captureKey, true);
  });

  const clearSecondary = (action: InputAction) => {
    onChange({ ...bindings, [action]: { primary: bindings[action].primary } });
    setMessage(`Secondary ${inputActionLabels[action]} binding cleared.`);
  };

  const resetDefaults = () => {
    onChange(createDefaultKeybindings());
    setRecording(null);
    setMessage('Controls restored to their defaults.');
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="controls-settings" role="dialog" aria-modal="true" aria-labelledby="controls-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="controls-settings-header">
          <div><p className="eyebrow">GLOBAL SETTINGS</p><h2 id="controls-settings-title">Controls</h2></div>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </header>
        <p className="controls-intro">Bindings apply to every test level in this browser. Click a slot, then press one physical key. Primary bindings are required; secondary bindings are optional.</p>
        {recording && <div className="recording-notice" role="status">Waiting for a key for {inputActionLabels[recording.action]} ({recording.slot}). <button type="button" className="secondary-button" onClick={() => setRecording(null)}>Cancel recording</button></div>}
        <div className="controls-list">
          {inputActions.map((action) => {
            const binding = bindings[action];
            return <div className="control-row" key={action}>
              <strong>{inputActionLabels[action]}</strong>
              <div className="binding-slots">
                <button type="button" className={recording?.action === action && recording.slot === 'primary' ? 'binding-button is-recording' : 'binding-button'} onClick={() => { setRecording({ action, slot: 'primary' }); setMessage(''); }}>{keybindingLabel(binding.primary)}</button>
                {binding.secondary ? <>
                  <button type="button" className={recording?.action === action && recording.slot === 'secondary' ? 'binding-button is-recording' : 'binding-button'} onClick={() => { setRecording({ action, slot: 'secondary' }); setMessage(''); }}>{keybindingLabel(binding.secondary)}</button>
                  <button type="button" className="text-button" onClick={() => clearSecondary(action)}>Clear</button>
                </> : <button type="button" className={recording?.action === action && recording.slot === 'secondary' ? 'binding-button is-recording' : 'binding-button'} onClick={() => { setRecording({ action, slot: 'secondary' }); setMessage(''); }}>Add secondary</button>}
              </div>
            </div>;
          })}
        </div>
        {message && <p className="controls-message" role="status">{message}</p>}
        <footer className="controls-settings-footer"><button type="button" className="secondary-button" onClick={resetDefaults}>Reset to defaults</button></footer>
      </section>
    </div>
  );
}
