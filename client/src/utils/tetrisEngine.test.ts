import { rotateMatrix, 
  checkCollision, 
  mergePiece, 
  clearFullRows,
  calculateScore, 
  getSpectrum,
  getGhostPosition } from './tetrisEngine';

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