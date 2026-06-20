import type { TileId } from '../tiles/tileTypes';

export type MergeableStaticTileId = Extract<TileId, 'solid' | 'climbWall'>;
export type DashBlockTileId = Extract<TileId, 'dashBlock'>;

export interface MergedStaticRect {
  tileId: MergeableStaticTileId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashBlockClusterRect {
  tileId: DashBlockTileId;
  x: number;
  y: number;
  width: number;
  height: number;
  cellKeys: string[];
}

function isMergeableStaticTile(tileId: TileId): tileId is MergeableStaticTileId {
  return tileId === 'solid' || tileId === 'climbWall';
}

/** Greedily coalesces matching static tiles without changing their visual grid cells. */
function mergeMatchingTileRects<T extends TileId>(tiles: readonly TileId[], width: number, height: number, isMergeable: (tileId: TileId) => tileId is T): Array<{ tileId: T; x: number; y: number; width: number; height: number }> {
  const visited = new Set<number>();
  const merged: Array<{ tileId: T; x: number; y: number; width: number; height: number }> = [];
  const at = (x: number, y: number) => tiles[y * width + x];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      const tileId = at(x, y);
      if (visited.has(start) || !isMergeable(tileId)) continue;

      let rectWidth = 0;
      while (x + rectWidth < width && at(x + rectWidth, y) === tileId && !visited.has(y * width + x + rectWidth)) rectWidth += 1;

      let rectHeight = 1;
      while (y + rectHeight < height) {
        let rowMatches = true;
        for (let dx = 0; dx < rectWidth; dx += 1) {
          const index = (y + rectHeight) * width + x + dx;
          if (visited.has(index) || at(x + dx, y + rectHeight) !== tileId) {
            rowMatches = false;
            break;
          }
        }
        if (!rowMatches) break;
        rectHeight += 1;
      }

      for (let dy = 0; dy < rectHeight; dy += 1) {
        for (let dx = 0; dx < rectWidth; dx += 1) visited.add((y + dy) * width + x + dx);
      }
      merged.push({ tileId, x, y, width: rectWidth, height: rectHeight });
    }
  }
  return merged;
}

export function mergeStaticTileRects(tiles: readonly TileId[], width: number, height: number): MergedStaticRect[] {
  return mergeMatchingTileRects(tiles, width, height, isMergeableStaticTile);
}

export function mergeDashBlockClusters(tiles: readonly TileId[], width: number, height: number): DashBlockClusterRect[] {
  return mergeMatchingTileRects(tiles, width, height, (tileId): tileId is DashBlockTileId => tileId === 'dashBlock')
    .map((rect) => ({
      ...rect,
      cellKeys: Array.from({ length: rect.width * rect.height }, (_, index) => {
        const x = rect.x + index % rect.width;
        const y = rect.y + Math.floor(index / rect.width);
        return `${x},${y}`;
      }),
    }));
}
