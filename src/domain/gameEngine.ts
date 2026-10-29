import type { MergeTile } from './game';

export const projectTileLevel = 3;

export type MergeResult =
  | { ok: true; board: Array<MergeTile | null>; reward: number; createdTile: MergeTile }
  | { ok: false; reason: 'missing' | 'same-tile' | 'different-kind' | 'different-stage' | 'already-project' };

/**
 * Pure board rule: equal parts improve one stage; a stage-three part is a project part.
 * Keeping this separate from the store makes the gameplay loop deterministic and testable.
 */
export function mergeBoardTiles(board: Array<MergeTile | null>, firstTileId: string, secondTileId: string): MergeResult {
  const firstIndex = board.findIndex(tile => tile?.id === firstTileId);
  const secondIndex = board.findIndex(tile => tile?.id === secondTileId);
  const first = board[firstIndex];
  const second = board[secondIndex];

  if (!first || !second) return { ok: false, reason: 'missing' };
  if (first.id === second.id) return { ok: false, reason: 'same-tile' };
  if (first.kind !== second.kind) return { ok: false, reason: 'different-kind' };
  if (first.level !== second.level) return { ok: false, reason: 'different-stage' };
  if (first.level === projectTileLevel) return { ok: false, reason: 'already-project' };

  const createdTile: MergeTile = { ...second, level: (first.level + 1) as MergeTile['level'] };
  const nextBoard = [...board];
  nextBoard[firstIndex] = null;
  nextBoard[secondIndex] = createdTile;
  return { ok: true, board: nextBoard, reward: first.level * 5, createdTile };
}

export function isProjectTile(tile: MergeTile | null | undefined) {
  return tile?.level === projectTileLevel;
}
