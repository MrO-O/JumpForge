import type { LevelDocument } from '../levels/levelTypes';
import { PhaserGameHost } from './PhaserGameHost';

interface TestingWorkspaceProps {
  level: LevelDocument;
  onExit: () => void;
  onComplete: () => void;
}

export function TestingWorkspace({ level, onExit, onComplete }: TestingWorkspaceProps) {
  return (
    <main className="testing-workspace">
      <header className="testing-toolbar">
        <div><p className="eyebrow">PHASE 5B · TEST MODE</p><strong>{level.title}</strong></div>
        <button type="button" onClick={onExit}>返回编辑器</button>
      </header>
      <section className="testing-stage">
        <PhaserGameHost level={level} onExit={onExit} onComplete={onComplete} />
      </section>
      <p className="testing-help">当前测试使用一个独立的关卡快照。运行中的死亡、重开和通关状态不会修改编辑器地图。</p>
    </main>
  );
}
