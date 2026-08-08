import { Player } from './Player';
import {
  createSeededRandom,
  getNextPiece,
  checkCollision,
  tick,
  calculateScore,
  addGarbageRows,
} from '../../shared/tetrisEngine';
import type { PieceKey, GameStatus } from '../../shared/types';
import { TETROMINOES } from '../../shared/constants';

// Standard spawn column: horizontally centered-ish for a piece up to 4 wide.
const SPAWN_X = 3;
const SPAWN_Y = 0;

export class Game {
  public readonly roomName: string;
  public players: Player[];
  public status: GameStatus;
  public hostId: string | null;
  private random: () => number;
  private pieceQueue: PieceKey[];

  constructor(roomName: string, seed: number = Date.now()) {
    this.roomName = roomName;
    this.players = [];
    this.status = 'WAITING';
    this.hostId = null;
    this.random = createSeededRandom(seed);
    this.pieceQueue = [];
  }

  /** Adds a player to the room. The first player added becomes host. */
  addPlayer(player: Player): void {
    if (this.players.length === 0) {
      player.isHost = true;
      this.hostId = player.id;
    }
    this.players.push(player);
  }

  /**
   * Removes a player by id. If they were host, reassigns host to the
   * next player remaining in the array (per README: "the next player in the room array").
   */
  removePlayer(id: string): void {
    const wasHost = this.hostId === id;
    this.players = this.players.filter((p) => p.id !== id);

    if (wasHost && this.players.length > 0) {
      const newHost = this.players[0]!;
      newHost.isHost = true;
      this.hostId = newHost.id;
    } else if (this.players.length === 0) {
      this.hostId = null;
    }
  }

  /**
   * Starts the game, but only if the requester is the current host.
   * Works identically whether there's 1 player (solo) or many.
   * Returns true if the game actually started, false if rejected.
   */
  startGame(requestingId: string): boolean {
    if (requestingId !== this.hostId) return false;
    if (this.status !== 'WAITING') return false;

    this.status = 'PLAYING';
    return true;
  }

  /**
   * Draws the next piece from this room's shared queue, refilling with a
   * fresh shuffled bag when empty. Mutates the room's queue (this is the
   * one place server-side state legitimately needs to change over time).
   */
  drawNextPiece(): PieceKey {
    const { piece, remainingQueue } = getNextPiece(this.pieceQueue, this.random);
    this.pieceQueue = remainingQueue;
    return piece;
  }

  /**
   * Draws the next piece for this player and places it at the spawn position.
   * If the spawn position immediately collides, the player is eliminated (topped out).
   */
  spawnPiece(player: Player): void {
    const key = this.drawNextPiece();
    const matrix = TETROMINOES[key];
    const position = { x: SPAWN_X, y: SPAWN_Y };

    if (checkCollision(player.grid, matrix, position)) {
      player.eliminate();
      return;
    }

    player.activePiece = { key, matrix, position, touchingGround: false };
    player.resetDropState();
  }

  /**
   * Advances gravity by one tick for the given player's active piece.
   * Handles movement, the lock-delay grace tick, locking, scoring, leveling,
   * garbage broadcast to opponents, and spawning the next piece after a lock.
   */
  tickPlayer(player: Player): void {
    if (!player.activePiece || !player.isAlive) return;

    const { matrix, position, touchingGround } = player.activePiece;
    const result = tick(player.grid, matrix, position, touchingGround ?? false);

    if (!result.locked) {
      player.activePiece = {
        ...player.activePiece,
        position: result.position,
        touchingGround: result.touchingGround,
      };
      return;
    }

    // Piece locked this tick.
    player.grid = result.grid!;
    const linesCleared = result.linesCleared ?? 0;

    if (linesCleared > 0) {
      player.addScore(calculateScore(linesCleared, player.level));
      player.registerLinesCleared(linesCleared);

      const garbagePenalty = linesCleared - 1;
      if (garbagePenalty > 0) {
        for (const opponent of this.players) {
          if (opponent.id !== player.id && opponent.isAlive) {
            opponent.grid = addGarbageRows(opponent.grid, garbagePenalty, this.random);
          }
        }
      }
    }

    this.spawnPiece(player);
  }

  /** Returns players still alive in the match. */
  getAlivePlayers(): Player[] {
    return this.players.filter((p) => p.isAlive);
  }

  /** True once the match has a winner (0 or 1 players remaining alive). */
  isMatchOver(): boolean {
    return this.status === 'PLAYING' && this.getAlivePlayers().length <= 1;
  }

  /** Marks the match finished. Called once isMatchOver() is confirmed true. */
  finishMatch(): void {
    this.status = 'FINISHED';
  }
}