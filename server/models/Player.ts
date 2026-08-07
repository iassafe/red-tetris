import type { Grid, ActivePiece, PieceKey, Spectrum } from '../../shared/types';
import { createEmptyGrid } from '../../shared/tetrisEngine'; 

export class Player {
  public readonly id: string;
  public name: string;
  public isHost: boolean;
  public isAlive: boolean;
  public score: number;
  public level: number;
  public linesCleared: number;
  public grid: Grid;
  public activePiece: ActivePiece | null;
  public nextQueue: PieceKey[];
  public heldPiece: PieceKey | null;
  public hasHeldThisDrop: boolean;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.isHost = false;
    this.isAlive = true;
    this.score = 0;
    this.level = 1;
    this.linesCleared = 0;
    this.grid = createEmptyGrid();
    this.activePiece = null;
    this.nextQueue = [];
    this.heldPiece = null;
    this.hasHeldThisDrop = false;
  }

  /** Returns the height-map spectrum for this player's current grid. */
  getSpectrum(): Spectrum {
    // delegates to the pure engine function — the class doesn't reimplement game math
    const { getSpectrum } = require('../../client/src/utils/tetrisEngine');
    return getSpectrum(this.grid);
  }

  /** Adds points to this player's score, based on lines cleared this drop. */
  addScore(points: number): void {
    this.score += points;
  }

  /** Increments lines cleared and recalculates level (every 10 lines = +1 level). */
  registerLinesCleared(count: number): void {
    this.linesCleared += count;
    this.level = Math.floor(this.linesCleared / 10) + 1;
  }

  /** Marks this player as eliminated (blocks reached the top). */
  eliminate(): void {
    this.isAlive = false;
  }
}