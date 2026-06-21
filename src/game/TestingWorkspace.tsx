import { useState } from 'react';
import { formatKeyBinding } from '../input/keybindingLabels';
import type { LevelDocument } from '../levels/levelTypes';
import { loadKeybindings } from '../input/keybindingStorage';
import { PhaserGameHost } from './PhaserGameHost';
import type { TestRuntimeStatus } from './TestScene';

interface TestingWorkspaceProps {
  level: LevelDocument;
  onExit: () => void;
  onComplete: () => void;
}

export function TestingWorkspace({ level, onExit, onComplete }: TestingWorkspaceProps) {
  const keybindings = loadKeybindings();
  const [status, setStatus] = useState<TestRuntimeStatus | null>(null);

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
            <div><dt>Restart</dt><dd>{formatKeyBinding(keybindings.restart)}</dd></div>
            <div><dt>Return</dt><dd>{formatKeyBinding(keybindings.exitTest)}</dd></div>
          </dl>
        </section>

        <section className="testing-sidebar-section" aria-labelledby="testing-status-heading">
          <h2 id="testing-status-heading">Status</h2>
          {status ? <>
            <dl className="testing-status-list">
              <div><dt>Movement</dt><dd>{status.movementPresetName}</dd></div>
              <div><dt>Dash</dt><dd>{status.dashStatus}</dd></div>
              <div><dt>Wall</dt><dd>{status.wallStatus}</dd></div>
              <div><dt>Stamina</dt><dd>{status.stamina}</dd></div>
              <div><dt>Keys</dt><dd>{status.keyCount}</dd></div>
              <div><dt>Switch doors</dt><dd>{status.switchDoorsOpen ? 'OPEN' : 'CLOSED'}</dd></div>
              <div><dt>Time</dt><dd>{status.elapsedSeconds}s</dd></div>
              <div><dt>Restarts</dt><dd>{status.restartCount}</dd></div>
            </dl>
            <p className="testing-runtime-message" role="status">{status.message}</p>
          </> : <p className="testing-runtime-message">Starting test…</p>}
        </section>
      </aside>

      <section className="testing-game-panel" aria-label="Level test game">
        <PhaserGameHost level={level} keybindings={keybindings} onExit={onExit} onComplete={onComplete} onStatusChange={setStatus} />
      </section>
    </main>
  );
}
