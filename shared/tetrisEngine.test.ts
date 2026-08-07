import { rotateMatrix, 
  checkCollision, 
  mergePiece, 
  clearFullRows,
  calculateScore, 
  getSpectrum,
  getGhostPosition, 
  createSeededRandom,
  generateBag,
  getNextPiece,
  createEmptyGrid,
  tick,
  getDropInterval,
  addGarbageRows } from './tetrisEngine';
import { PIECE_KEYS, GARBAGE_CELL_ID } from './constants';
import type { PieceKey } from './types';

function emptyGrid(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

describe('rotateMatrix', () => {
  it('rotates a 3x3 T-piece 90 degrees clockwise', () => {
    const input = [
      [0, 6, 0],
      [6, 6, 6],
      [0, 0, 0],
    ];
    const expected = [
      [0, 6, 0],
      [0, 6, 6],
      [0, 6, 0],
    ];
    expect(rotateMatrix(input)).toEqual(expected);
  });

  it('does not mutate the input matrix', () => {
    const input = [
      [1, 0],
      [0, 1],
    ];
    const inputCopy = input.map((row) => [...row]);
    rotateMatrix(input);
    expect(input).toEqual(inputCopy);
  });

  it('returns to the original after 4 rotations', () => {
    const input = [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    let result = input;
    for (let i = 0; i < 4; i++) {
      result = rotateMatrix(result);
    }
    expect(result).toEqual(input);
  });
});

describe('checkCollision', () => {
  const oPiece = [
    [4, 4],
    [4, 4],
  ];

  it('returns false when the piece fits in open space', () => {
    const grid = emptyGrid(10, 20);
    expect(checkCollision(grid, oPiece, { x: 4, y: 0 })).toBe(false);
  });

  it('returns true when the piece goes past the left wall', () => {
    const grid = emptyGrid(10, 20);
    expect(checkCollision(grid, oPiece, { x: -1, y: 0 })).toBe(true);
  });

  it('returns true when the piece goes past the right wall', () => {
    const grid = emptyGrid(10, 20);
    expect(checkCollision(grid, oPiece, { x: 9, y: 0 })).toBe(true);
  });

  it('returns true when the piece goes past the floor', () => {
    const grid = emptyGrid(10, 20);
    expect(checkCollision(grid, oPiece, { x: 4, y: 19 })).toBe(true);
  });

  it('returns true when the piece overlaps a locked block', () => {
    const grid = emptyGrid(10, 20);
    grid[5]![4] = 2; // simulate a locked cell directly below the piece's landing spot
    expect(checkCollision(grid, oPiece, { x: 4, y: 4 })).toBe(true);
  });

  it('returns false when the piece is partially above the grid (spawning)', () => {
    const grid = emptyGrid(10, 20);
    expect(checkCollision(grid, oPiece, { x: 4, y: -1 })).toBe(false);
  });

  it('ignores empty cells within the piece matrix bounding box', () => {
    const grid = emptyGrid(10, 20);
    const tPiece = [
      [0, 6, 0],
      [6, 6, 6],
      [0, 0, 0],
    ];
    // Place a locked block exactly where the piece's empty top-left corner would land.
    // If the code treated the whole 3x3 box as solid, this would wrongly report a collision.
    grid[0]![4] = 9;

    expect(checkCollision(grid, tPiece, { x: 4, y: 0 })).toBe(false);
  });

  it('treats an empty grid as zero width (defensive fallback)', () => {
    const piece = [[1]];
    expect(checkCollision([], piece, { x: 0, y: 0 })).toBe(true);
  });
});

describe('mergePiece', () => {
  it('writes the piece cells into the grid at the given position', () => {
    const grid = emptyGrid(10, 20);
    const oPiece = [
      [4, 4],
      [4, 4],
    ];
    const result = mergePiece(grid, oPiece, { x: 4, y: 18 });

    expect(result[18]![4]).toBe(4);
    expect(result[18]![5]).toBe(4);
    expect(result[19]![4]).toBe(4);
    expect(result[19]![5]).toBe(4);
  });

  it('does not mutate the original grid', () => {
    const grid = emptyGrid(10, 20);
    const oPiece = [
      [4, 4],
      [4, 4],
    ];
    mergePiece(grid, oPiece, { x: 4, y: 18 });

    // original grid should still be all zeros
    expect(grid[18]![4]).toBe(0);
  });

  it('leaves pre-existing locked cells untouched when the piece cell there is empty', () => {
    const grid = emptyGrid(10, 20);
    grid[0]![4] = 3; // pre-existing locked cell, sits under tPiece's empty top-left corner
    const tPiece = [
      [0, 6, 0],
      [6, 6, 6],
      [0, 0, 0],
    ];
    const result = mergePiece(grid, tPiece, { x: 4, y: 0 });

    // tPiece's [0][0] is empty (maps to grid[0][4]) — should remain untouched.
    expect(result[0]![4]).toBe(3);
    // tPiece's [0][1] is filled (maps to grid[0][5]) — should now be written.
    expect(result[0]![5]).toBe(6);
  });

  it('ignores piece cells that fall outside the grid vertically (defensive)', () => {
    const grid = emptyGrid(10, 20);
    const oPiece = [
      [4, 4],
      [4, 4],
    ];
    // Piece partially above the grid (row -1) — should not throw, should just skip that row.
    const result = mergePiece(grid, oPiece, { x: 4, y: -1 });

    expect(result[0]![4]).toBe(4);
    expect(result[0]![5]).toBe(4);
  });

  it('ignores piece cells that fall outside the grid horizontally (defensive)', () => {
    const grid = emptyGrid(10, 20);
    const oPiece = [
      [4, 4],
      [4, 4],
    ];
    // Piece partially past the right wall — mergePiece should just skip that
    // out-of-bounds cell rather than throwing, even though checkCollision
    // would normally have rejected this position before we got here.
    const result = mergePiece(grid, oPiece, { x: 9, y: 0 });

    expect(result[0]![9]).toBe(4); // in-bounds cell still written
    expect(result[0]![10]).toBeUndefined(); // out-of-bounds cell simply doesn't exist
  });
});

describe('clearFullRows', () => {
  it('clears a single full row and pads the top with an empty row', () => {
    const grid = emptyGrid(4, 3); // small grid for readability: 4 wide, 3 tall
    grid[2] = [1, 2, 3, 4]; // bottom row fully packed

    const { newGrid, linesCleared } = clearFullRows(grid);

    expect(linesCleared).toBe(1);
    expect(newGrid).toEqual([
      [0, 0, 0, 0], // new empty row added at top
      [0, 0, 0, 0], // original row 0, still empty
      [0, 0, 0, 0], // original row 1, still empty
    ]);
  });

  it('does not clear a row with even one empty cell', () => {
    const grid = emptyGrid(4, 3);
    grid[2] = [1, 2, 0, 4]; // one empty cell — not full

    const { newGrid, linesCleared } = clearFullRows(grid);

    expect(linesCleared).toBe(0);
    expect(newGrid).toEqual(grid);
  });

  it('clears multiple full rows at once and preserves surviving row order', () => {
    const grid = [
      [1, 1, 1, 1], // full — will clear
      [2, 0, 2, 2], // not full — survives
      [3, 3, 3, 3], // full — will clear
    ];

    const { newGrid, linesCleared } = clearFullRows(grid);

    expect(linesCleared).toBe(2);
    expect(newGrid).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 2, 2], // the only survivor, still intact and in place
    ]);
  });

  it('does not mutate the original grid', () => {
    const grid = emptyGrid(4, 3);
    grid[2] = [1, 2, 3, 4];
    const gridSnapshot = grid.map((row) => [...row]);

    clearFullRows(grid);

    expect(grid).toEqual(gridSnapshot);
  });

  it('clears zero rows when nothing is full', () => {
    const grid = emptyGrid(4, 3);

    const { newGrid, linesCleared } = clearFullRows(grid);

    expect(linesCleared).toBe(0);
    expect(newGrid).toEqual(grid);
  });

  it('handles an empty grid without crashing (defensive)', () => {
    const { newGrid, linesCleared } = clearFullRows([]);
  
    expect(linesCleared).toBe(0);
    expect(newGrid).toEqual([]);
  });
});


describe('calculateScore', () => {
  it('awards 100 * level for a single line clear', () => {
    expect(calculateScore(1, 3)).toBe(300);
  });

  it('awards 300 * level for a double', () => {
    expect(calculateScore(2, 2)).toBe(600);
  });

  it('awards 500 * level for a triple', () => {
    expect(calculateScore(3, 1)).toBe(500);
  });

  it('awards 800 * level for a tetris (four lines)', () => {
    expect(calculateScore(4, 5)).toBe(4000);
  });

  it('awards 0 points when no lines are cleared', () => {
    expect(calculateScore(0, 3)).toBe(0);
  });
});


describe('getSpectrum', () => {
  it('returns 0 for every column on an empty grid', () => {
    const grid = emptyGrid(4, 5);
    expect(getSpectrum(grid)).toEqual([0, 0, 0, 0]);
  });

  it('returns the correct height for a column with one locked cell at the bottom', () => {
    const grid = emptyGrid(4, 5);
    grid[4]![1] = 3; // bottom row, column 1
    expect(getSpectrum(grid)).toEqual([0, 1, 0, 0]);
  });

  it('measures height from the topmost filled cell in each column', () => {
    const grid = emptyGrid(4, 5);
    grid[2]![0] = 1; // column 0 has a block starting at row 2
    grid[4]![0] = 1; // and another below it at row 4
    // topmost filled cell in column 0 is row 2, out of 5 total rows -> height 5-2=3
    expect(getSpectrum(grid)).toEqual([3, 0, 0, 0]);
  });

  it('handles an empty grid without crashing (defensive)', () => {
    expect(getSpectrum([])).toEqual([]);
  });
});


describe('getGhostPosition', () => {
  const oPiece = [
    [4, 4],
    [4, 4],
  ];

  it('drops straight to the floor on an empty grid', () => {
    const grid = emptyGrid(10, 20);
    const result = getGhostPosition(grid, oPiece, { x: 4, y: 0 });
    expect(result).toEqual({ x: 4, y: 18 }); // O-piece is 2 tall, floor is row 19 -> lands at 18
  });

  it('stops just above a locked pile', () => {
    const grid = emptyGrid(10, 20);
    grid[10]![4] = 1;
    grid[10]![5] = 1;
    const result = getGhostPosition(grid, oPiece, { x: 4, y: 0 });
    expect(result).toEqual({ x: 4, y: 8 }); // piece bottom (row+1) must sit just above row 10
  });

  it('does not move if already resting on the floor', () => {
    const grid = emptyGrid(10, 20);
    const result = getGhostPosition(grid, oPiece, { x: 4, y: 18 });
    expect(result).toEqual({ x: 4, y: 18 });
  });
});


describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const randomA = createSeededRandom(42);
    const randomB = createSeededRandom(42);

    const sequenceA = [randomA(), randomA(), randomA()];
    const sequenceB = [randomB(), randomB(), randomB()];

    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces different sequences for different seeds', () => {
    const randomA = createSeededRandom(1);
    const randomB = createSeededRandom(2);

    expect(randomA()).not.toBe(randomB());
  });

  it('produces numbers in the range [0, 1)', () => {
    const random = createSeededRandom(7);
    for (let i = 0; i < 20; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('generateBag', () => {
  it('contains each of the 7 piece keys exactly once', () => {
    const random = createSeededRandom(123);
    const bag = generateBag(random);

    expect(bag).toHaveLength(7);
    expect([...bag].sort()).toEqual([...PIECE_KEYS].sort());
  });

  it('produces a different order for a different seed', () => {
    const bagA = generateBag(createSeededRandom(1));
    const bagB = generateBag(createSeededRandom(2));

    expect(bagA).not.toEqual(bagB);
  });
});

describe('getNextPiece', () => {
  it('draws pieces from the existing queue without refilling', () => {
    const random = createSeededRandom(1);
    const queue: PieceKey[] = ['I', 'O', 'T'];

    const { piece, remainingQueue } = getNextPiece(queue, random);

    expect(piece).toBe('I');
    expect(remainingQueue).toEqual(['O', 'T']);
  });

  it('refills with a fresh bag when the queue is empty', () => {
    const random = createSeededRandom(99);

    const { piece, remainingQueue } = getNextPiece([], random);

    expect(PIECE_KEYS).toContain(piece);
    expect(remainingQueue).toHaveLength(6); // 7-piece bag minus the one just drawn
  });

  it('does not mutate the original queue', () => {
    const random = createSeededRandom(1);
    const queue: PieceKey[] = ['I', 'O', 'T'];
    const queueSnapshot = [...queue];

    getNextPiece(queue, random);

    expect(queue).toEqual(queueSnapshot);
  });
});


describe('createEmptyGrid', () => {
  it('creates a grid at standard Tetris dimensions (10 wide, 20 tall)', () => {
    const grid = createEmptyGrid();

    expect(grid).toHaveLength(20);
    expect(grid[0]).toHaveLength(10);
  });

  it('fills every cell with 0', () => {
    const grid = createEmptyGrid();
    const allZero = grid.every((row) => row.every((cell) => cell === 0));

    expect(allZero).toBe(true);
  });
});


describe('tick', () => {
  const oPiece = [
    [4, 4],
    [4, 4],
  ];

  it('moves the piece down one row when space is open below', () => {
    const grid = emptyGrid(10, 20);
    const result = tick(grid, oPiece, { x: 4, y: 0 }, false);

    expect(result.locked).toBe(false);
    expect(result.touchingGround).toBe(false);
    expect(result.position).toEqual({ x: 4, y: 1 });
  });

  it('holds position and flags touchingGround on first contact with the floor', () => {
    const grid = emptyGrid(10, 20);
    // O-piece is 2 tall; at y=18 its bottom edge is at row 19, the last row.
    const result = tick(grid, oPiece, { x: 4, y: 18 }, false);

    expect(result.locked).toBe(false);
    expect(result.touchingGround).toBe(true);
    expect(result.position).toEqual({ x: 4, y: 18 }); // unchanged
  });

  it('locks the piece if it was already touching ground on the previous tick', () => {
    const grid = emptyGrid(10, 20);
    const result = tick(grid, oPiece, { x: 4, y: 18 }, true);

    expect(result.locked).toBe(true);
    expect(result.grid).toBeDefined();
    expect(result.grid![18]![4]).toBe(4);
    expect(result.grid![19]![4]).toBe(4);
    expect(result.linesCleared).toBe(0);
  });

  it('reports lines cleared when locking completes a full row', () => {
    const grid = emptyGrid(4, 20);
    // Fill row 19 except for columns 4 and 5 (where a 1-wide piece could complete it)
    // Use a 1-cell piece for a minimal, easy-to-reason-about test.
    grid[19] = [1, 1, 0, 1];
    const singleCellPiece = [[1]];

    const result = tick(grid, singleCellPiece, { x: 2, y: 19 }, true);

    expect(result.locked).toBe(true);
    expect(result.linesCleared).toBe(1);
  });

  it('gives one grace tick before locking even when landing directly on the pile', () => {
    const grid = emptyGrid(10, 20);
    grid[19]!.fill(1); // solid floor of locked blocks at row 19
    // Piece sits right above the pile, first tick touching it (wasTouchingGround = false)
    const result = tick(grid, oPiece, { x: 4, y: 17 }, false);

    expect(result.locked).toBe(false);
    expect(result.touchingGround).toBe(true);
  });
});

describe('getDropInterval', () => {
  it('returns 1000ms at level 1', () => {
    expect(getDropInterval(1)).toBe(1000);
  });

  it('decreases by 50ms per level', () => {
    expect(getDropInterval(2)).toBe(950);
    expect(getDropInterval(5)).toBe(800);
  });

  it('never drops below the 100ms floor', () => {
    expect(getDropInterval(100)).toBe(100);
  });
});


describe('addGarbageRows', () => {
  it('returns the grid unchanged when count is 0', () => {
    const grid = emptyGrid(4, 5);
    const result = addGarbageRows(grid, 0, createSeededRandom(1));
    expect(result).toEqual(grid);
  });

  it('pushes the grid up, dropping the top row and adding one garbage row at the bottom', () => {
    const grid = emptyGrid(4, 5);
    grid[4] = [1, 1, 1, 1]; // mark bottom row so we can trace it moved up

    const result = addGarbageRows(grid, 1, createSeededRandom(1));

    expect(result).toHaveLength(5);
    expect(result[3]).toEqual([1, 1, 1, 1]); // original bottom row is now one higher
  });

  it('fills garbage rows with GARBAGE_CELL_ID except for one gap per row', () => {
    const grid = emptyGrid(4, 5);
    const result = addGarbageRows(grid, 1, createSeededRandom(1));

    const garbageRow = result[4]!;
    const gapCount = garbageRow.filter((cell) => cell === 0).length;
    const filledCount = garbageRow.filter((cell) => cell === GARBAGE_CELL_ID).length;

    expect(gapCount).toBe(1);
    expect(filledCount).toBe(3);
  });

  it('does not mutate the original grid', () => {
    const grid = emptyGrid(4, 5);
    const snapshot = grid.map((row) => [...row]);

    addGarbageRows(grid, 2, createSeededRandom(1));

    expect(grid).toEqual(snapshot);
  });
  it('handles an empty grid without crashing (defensive)', () => {
    const result = addGarbageRows([], 2, createSeededRandom(1));
    expect(result).toEqual([[], []]);
  });
});