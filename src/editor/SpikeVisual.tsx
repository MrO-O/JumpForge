import { isSpikeTileId, type TileId, type TileLocalBox } from '../tiles/tileTypes';

type SpikeVisualProps = {
  tileId: TileId;
  box?: TileLocalBox;
  className?: string;
};

function spikeVariant(tileId: TileId): string {
  if (tileId === 'spike') return 'full';
  return tileId.slice('spike'.length).toLowerCase();
}

/** Shared CSS spike artwork for the palette, editor cell, and brush preview. */
export function SpikeVisual({ tileId, box, className }: SpikeVisualProps) {
  if (!isSpikeTileId(tileId)) return null;
  const style = box ? {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  } : undefined;
  return <span className={`spike-visual spike-visual--${spikeVariant(tileId)}${className ? ` ${className}` : ''}`} style={style} aria-hidden="true"><i /></span>;
}
