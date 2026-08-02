
export type Grid = number[][];

export type PieceKey = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface ActivePiece {
  key: PieceKey;
  matrix: number[][];
  position: { x: number; y: number };
}

export type Spectrum = number[];

export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface PlayerState {
  id: string; // socket.id
  name: string;
  isHost: boolean;
  isAlive: boolean;
  score: number;
  level: number;
  linesCleared: number;
  spectrum: Spectrum;
}

export interface GameState {
  roomName: string;
  status: GameStatus;
  players: PlayerState[];
  grid?: Grid;
  activePiece?: ActivePiece;
  nextPieces?: PieceKey[];
  heldPiece?: PieceKey | null;
}