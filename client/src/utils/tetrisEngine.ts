import { PIECE_KEYS } from './constants';
import type { PieceKey } from '../../../shared/types';

/**
 * Rotates a square NxN matrix 90 degrees clockwise.
 * Pure function: does not mutate the input, returns a new matrix.
 */
export function rotateMatrix(matrix: number[][]): number[][] {
  const size = matrix.length;
  const rotated: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // The cell at [row][col] moves to [col][size - 1 - row] under a 90° clockwise rotation.
      rotated[col]![size - 1 - row] = matrix[row]![col]!;
    }
  }

  return rotated;
}

/**
 * Checks whether placing `piece` (a matrix) at `position` (top-left corner)
 * on `grid` would collide with a wall, the floor, or an already-locked cell.
 * Pure function: does not mutate grid or piece.
 */
export function checkCollision(
  grid: number[][],
  piece: number[][],
  position: { x: number; y: number }
): boolean {
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;

  for (let row = 0; row < piece.length; row++) {
    for (let col = 0; col < piece[row]!.length; col++) {
      // Empty cells of the piece's bounding box never collide.
      if (piece[row]![col] === 0) continue;

      const targetX = position.x + col;
      const targetY = position.y + row;

      // Wall collision: piece cell would land outside the grid horizontally.
      if (targetX < 0 || targetX >= gridWidth) return true;

      // Floor collision: piece cell would land below the grid.
      if (targetY >= gridHeight) return true;

      // Above the ceiling is allowed (piece spawning in), so skip the locked-cell
      // check for negative Y rather than treating it as a collision.
      if (targetY < 0) continue;

      // Locked-block collision: grid already has a nonzero cell here.
      if (grid[targetY]![targetX] !== 0) return true;
    }
  }

  return false;
}

/**
 * Stamps a piece's filled cells into the grid at the given position, permanently.
 * Pure function: returns a new grid, does not mutate the original.
 * Assumes the placement is already valid (call checkCollision first).
 */
export function mergePiece(
  grid: number[][],
  piece: number[][],
  position: { x: number; y: number }
): number[][] {
  // Deep copy: a plain grid.map(row => row) would copy the outer array
  // but leave inner rows pointing at the same arrays — mutating a cell
  // would still corrupt the original grid.
  const newGrid = grid.map((row) => [...row]);

  for (let row = 0; row < piece.length; row++) {
    for (let col = 0; col < piece[row]!.length; col++) {
      if (piece[row]![col] === 0) continue;

      const targetX = position.x + col;
      const targetY = position.y + row;

      // Only write cells that are actually within the grid.
      // (A piece cell above row 0, or past any edge, has nowhere valid to be written.)
      if (targetY < 0 || targetY >= newGrid.length) continue;
      if (targetX < 0 || targetX >= newGrid[0]!.length) continue;

      newGrid[targetY]![targetX] = piece[row]![col]!;
    }
  }

  return newGrid;
}

/**
 * Scans the grid for fully-packed rows, removes them, and pads the top
 * with the same number of empty rows to preserve grid height.
 * Pure function: returns a new grid, does not mutate the original.
 */
export function clearFullRows(grid: number[][]): { newGrid: number[][]; linesCleared: number } {
  const width = grid[0]?.length ?? 0;

  // Keep only rows that have at least one empty (0) cell.
  const remainingRows = grid.filter((row) => row.some((cell) => cell === 0));

  const linesCleared = grid.length - remainingRows.length;

  // Build fresh empty rows to replace the ones removed, then place them on top.
  const newEmptyRows = Array.from({ length: linesCleared }, () => Array(width).fill(0));

  return {
    newGrid: [...newEmptyRows, ...remainingRows],
    linesCleared,
  };
}

const LINE_CLEAR_BASE_SCORE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};


/**
 * Computes score awarded for clearing `linesCleared` lines simultaneously at `level`.
 * Pure function.
 */
export function calculateScore(linesCleared: number, level: number): number {
  const baseScore = LINE_CLEAR_BASE_SCORE[linesCleared] ?? 0;
  return baseScore * level;
}


/**
 * Computes a column height map (spectrum) from a grid — one number per column,
 * representing how many rows from the top the highest locked cell sits.
 * Pure function.
 */
export function getSpectrum(grid: number[][]): number[] {
  const width = grid[0]?.length ?? 0;
  const height = grid.length;

  return Array.from({ length: width }, (_, col) => {
    const column = grid.map((row) => row[col]);
    const firstFilledRow = column.findIndex((cell) => cell !== 0);
    return firstFilledRow === -1 ? 0 : height - firstFilledRow;
  });
}


/**
 * Computes the landing position of `piece` if hard-dropped from its current
 * position, by repeatedly testing one row lower until a collision would occur.
 * Pure function.
 */
export function getGhostPosition(
  grid: number[][],
  piece: number[][],
  position: { x: number; y: number }
): { x: number; y: number } {
  let ghostY = position.y;

  while (!checkCollision(grid, piece, { x: position.x, y: ghostY + 1 })) {
    ghostY++;
  }

  return { x: position.x, y: ghostY };
}


/**
 * Creates a seeded pseudo-random number generator (mulberry32 algorithm).
 * Same seed always produces the same infinite sequence of numbers in [0, 1).
 * Returns a function you call repeatedly to draw the next number.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/**
 * Produces one shuffled "bag" containing each of the 7 piece keys exactly once,
 * using Fisher-Yates shuffle driven by the given random function.
 * Pure given a fixed sequence of outputs from `random`.
 */
export function generateBag(random: () => number): PieceKey[] {
  const bag = [...PIECE_KEYS];

  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }

  return bag;
}

/**
 * Draws the next piece from the queue. If the queue is empty, refills it
 * with a freshly shuffled bag of all 7 pieces first.
 * Pure: does not mutate the input queue, returns a new queue alongside the drawn piece.
 */
export function getNextPiece(
  queue: PieceKey[],
  random: () => number
): { piece: PieceKey; remainingQueue: PieceKey[] } {
  const currentQueue = queue.length > 0 ? queue : generateBag(random);
  const [piece, ...remainingQueue] = currentQueue;

  return { piece: piece!, remainingQueue };
}