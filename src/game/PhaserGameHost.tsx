import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { cloneLevel } from '../levels/levelCommands';
import type { LevelDocument } from '../levels/levelTypes';
import { TestScene } from './TestScene';

interface PhaserGameHostProps {
  level: LevelDocument;
  onExit: () => void;
  onComplete?: () => void;
}

/** React owns the container lifecycle; Phaser owns only its isolated game state. */
export function PhaserGameHost({ level, onExit, onComplete }: PhaserGameHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<LevelDocument>(cloneLevel(level));
  const exitRef = useRef(onExit);
  const completeRef = useRef(onComplete);

  useEffect(() => { exitRef.current = onExit; }, [onExit]);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const snapshot = snapshotRef.current;
    const worldWidth = snapshot.width * snapshot.tileSize;
    const worldHeight = snapshot.height * snapshot.tileSize;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: Math.min(960, Math.max(480, worldWidth)),
      height: Math.min(640, Math.max(360, worldHeight)),
      backgroundColor: '#0b1020',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [new TestScene({
        level: snapshot,
        onExit: () => exitRef.current(),
        onComplete: () => completeRef.current?.(),
      })],
    });
    return () => game.destroy(true);
  }, []);

  return <div className="phaser-game-host" ref={containerRef} />;
}
