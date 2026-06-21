import { useEffect, useRef, useState } from 'react';
import { getTileDefinition } from '../tiles/tileRegistry';
import type { TileId } from '../tiles/tileTypes';
import type { LevelDocument } from '../levels/levelTypes';

interface GridEditorProps {
  level: LevelDocument;
  selectedTileId: TileId;
  onPaint: (x: number, y: number, tileId: TileId) => void;
  onHover: (x: number, y: number) => void;
}

export function GridEditor({ level, selectedTileId, onPaint, onHover }: GridEditorProps) {
  const paintingTile = useRef<TileId | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const terrain = level.layers[0];

  useEffect(() => {
    const stopPainting = () => { paintingTile.current = null; };
    window.addEventListener('pointerup', stopPainting);
    return () => window.removeEventListener('pointerup', stopPainting);
  }, []);

  const paint = (x: number, y: number, tileId: TileId) => onPaint(x, y, tileId);
  return (
    <section className="grid-editor" aria-label="Level grid">
      <div className="grid-scroller">
        <div
          className="level-grid"
          style={{ gridTemplateColumns: `repeat(${level.width}, ${level.tileSize}px)`, gridTemplateRows: `repeat(${level.height}, ${level.tileSize}px)` }}
          onContextMenu={(event) => event.preventDefault()}
        >
          {terrain.tiles.map((tileId, index) => {
            const x = index % level.width;
            const y = Math.floor(index / level.width);
            const tile = getTileDefinition(tileId);
            const visualBox = tile?.visualBox ?? tile?.collisionBox;
            const previewTile = getTileDefinition(selectedTileId);
            const previewBox = previewTile?.visualBox ?? previewTile?.collisionBox;
            return (
              <button
                className="grid-cell"
                type="button"
                key={`${x}-${y}`}
                style={{ backgroundColor: '#172033', width: level.tileSize, height: level.tileSize }}
                aria-label={`cell ${x}, ${y}: ${tile?.name ?? tileId}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  const paintTile = event.button === 2 ? 'empty' : selectedTileId;
                  paintingTile.current = paintTile;
                  paint(x, y, paintTile);
                }}
                onPointerEnter={() => {
                  setHoverCell({ x, y });
                  onHover(x, y);
                  if (paintingTile.current) paint(x, y, paintingTile.current);
                }}
                onPointerLeave={() => { setHoverCell(null); onHover(x, y); }}
              >
                {!(hoverCell?.x === x && hoverCell?.y === y) && <span className="grid-tile-visual" style={{ backgroundColor: tile?.editor.color ?? '#7f1d1d', left: `${(visualBox?.x ?? 0) * 100}%`, top: `${(visualBox?.y ?? 0) * 100}%`, width: `${(visualBox?.width ?? 1) * 100}%`, height: `${(visualBox?.height ?? 1) * 100}%` }}>{tile?.editor.glyph ?? '?'}</span>}
                {hoverCell?.x === x && hoverCell?.y === y && <span className={`grid-brush-preview${selectedTileId === 'empty' ? ' is-eraser' : ''}`} style={selectedTileId === 'empty' ? undefined : { backgroundColor: previewTile?.editor.color, left: `${(previewBox?.x ?? 0) * 100}%`, top: `${(previewBox?.y ?? 0) * 100}%`, width: `${(previewBox?.width ?? 1) * 100}%`, height: `${(previewBox?.height ?? 1) * 100}%` }} />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="grid-help">左键绘制 · 拖拽连续绘制 · 右键擦除 · 当前图层：{terrain.name}</p>
    </section>
  );
}
