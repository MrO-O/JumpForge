import { isTileAllowedForAbilities, listTilesByCategory } from '../tiles/tileRegistry';
import type { TileId } from '../tiles/tileTypes';
import type { LevelDocument } from '../levels/levelTypes';

const categoryLabels = {
  terrain: '地形',
  hazard: '危险',
  marker: '标记',
  interaction: '交互',
  ability: '能力专用',
} as const;

interface TilePaletteProps {
  level: LevelDocument;
  selectedTileId: TileId;
  onSelect: (tileId: TileId) => void;
  onNotice: (message: string) => void;
}

export function TilePalette({ level, selectedTileId, onSelect, onNotice }: TilePaletteProps) {
  const groups = listTilesByCategory();
  const halfVariants: TileId[] = ['halfBlockTop', 'halfBlockBottom', 'halfBlockLeft', 'halfBlockRight'];
  const activeHalf = halfVariants.includes(selectedTileId) ? selectedTileId : 'halfBlockTop';
  return (
    <aside className="tile-palette" aria-label="Tile palette">
      <div className="panel-title-row"><h2>Tile palette</h2><span>左键绘制</span></div>
      {Object.entries(groups).map(([category, tiles]) => (
        <section className="palette-group" key={category}>
          <h3>{categoryLabels[category as keyof typeof categoryLabels]}</h3>
          <div className="palette-tiles">
            {category === 'terrain' && <button className={`palette-tile${halfVariants.includes(selectedTileId) ? ' selected' : ''}`} type="button" onClick={() => onSelect(activeHalf)}><span className="palette-glyph" style={{ color: '#475569' }}>◐</span><span>Half Block: {activeHalf.replace('halfBlock', '')}</span></button>}
            {tiles.filter((tile) => !halfVariants.includes(tile.id)).map((tile) => {
              const allowed = isTileAllowedForAbilities(tile.id, level.enabledAbilities);
              const selected = tile.id === selectedTileId;
              const required = tile.requiredAbilities?.join(', ');
              return (
                <button
                  className={`palette-tile${selected ? ' selected' : ''}${allowed ? '' : ' locked'}`}
                  key={tile.id}
                  type="button"
                  title={allowed ? `${tile.name} (${tile.id})` : `需要启用：${required}`}
                  onClick={() => allowed ? onSelect(tile.id) : onNotice(`${tile.name} 需要先启用 ${required}。`)}
                  aria-pressed={selected}
                >
                  <span className="palette-glyph" style={{ color: tile.editor.color }}>{tile.editor.glyph}</span>
                  <span>{tile.id === 'empty' ? '橡皮擦' : tile.editor.label}</span>
                  {!allowed && <small>锁定</small>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </aside>
  );
}
