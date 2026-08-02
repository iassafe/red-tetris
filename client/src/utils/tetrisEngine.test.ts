import { rotateMatrix } from './tetrisEngine';

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




