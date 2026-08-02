
export function rotateMatrix(matrix: number[][]): number[][] {
    const size = matrix.length;
    const rotated: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        rotated[col]![size - 1 - row] = matrix[row]![col]!;
      }
    }
  
    return rotated;
  }


