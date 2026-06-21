import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { cloneLevel } from '../levels/levelCommands';
import type { LevelDocument } from '../levels/levelTypes';
import type { KeyBindingMap } from '../input/inputTypes';
import { TestScene, type TestRuntimeStatus } from './TestScene';

interface PhaserGameHostProps {
  level: LevelDocument;
  keybindings: KeyBindingMap;
  onExit: () => void;
  onComplete?: () => void;
  onStatusChange?: (status: TestRuntimeStatus) => void;
}

/** React owns the container lifecycle; Phaser owns only its isolated game state. */
export function PhaserGameHost({ level, keybindings, onExit, onComplete, onStatusChange }: PhaserGameHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<LevelDocument>(cloneLevel(level));
  const exitRef = useRef(onExit);
  const completeRef = useRef(onComplete);
  const statusRef = useRef(onStatusChange);

  useEffect(() => { exitRef.current = onExit; }, [onExit]);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { statusRef.current = onStatusChange; }, [onStatusChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let disposed = false;
    const snapshot = snapshotRef.current;
    const readContainerSize = () => ({
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
    });
    const initialSize = readContainerSize();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: initialSize.width,
      height: initialSize.height,
      backgroundColor: '#0b1020',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [new TestScene({
        level: snapshot,
        keybindings,
        onExit: () => { if (!disposed) exitRef.current(); },
        onComplete: () => { if (!disposed) completeRef.current?.(); },
        onStatusChange: (status) => { if (!disposed) statusRef.current?.(status); },
      })],
    });
    const resizeGame = () => {
      const { width, height } = readContainerSize();
      if (!disposed && (game.scale.width !== width || game.scale.height !== height)) game.scale.resize(width, height);
    };
    const resizeObserver = new ResizeObserver(resizeGame);
    resizeObserver.observe(container);
    window.addEventListener('resize', resizeGame);
    return () => {
      disposed = true;
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeGame);
      game.destroy(true);
      container.replaceChildren();
    };
  }, []);

  return <div className="phaser-game-host" ref={containerRef} />;
}
