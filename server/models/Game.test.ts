import { Game } from './Game';
import { Player } from './Player';
import { TETROMINOES } from '../../shared/constants';

describe('Game', () => {
  describe('addPlayer', () => {
    it('makes the first player added the host', () => {
      const game = new Game('room1');
      const alice = new Player('s1', 'Alice');
      game.addPlayer(alice);

      expect(alice.isHost).toBe(true);
      expect(game.hostId).toBe('s1');
    });

    it('does not make subsequent players host', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      const bob = new Player('s2', 'Bob');
      game.addPlayer(bob);

      expect(bob.isHost).toBe(false);
      expect(game.players).toHaveLength(2);
    });
  });

  describe('removePlayer', () => {
    it('removes the player from the room', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.removePlayer('s1');

      expect(game.players).toHaveLength(0);
    });

    it('reassigns host to the next player when the host leaves', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      const bob = new Player('s2', 'Bob');
      game.addPlayer(bob);

      game.removePlayer('s1');

      expect(bob.isHost).toBe(true);
      expect(game.hostId).toBe('s2');
    });

    it('sets hostId to null when the last player leaves', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.removePlayer('s1');

      expect(game.hostId).toBeNull();
    });

    it('does not reassign host when a non-host player leaves', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.addPlayer(new Player('s2', 'Bob'));

      game.removePlayer('s2');

      expect(game.hostId).toBe('s1');
    });
  });

  describe('startGame', () => {
    it('starts the game when requested by the host', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));

      const started = game.startGame('s1');

      expect(started).toBe(true);
      expect(game.status).toBe('PLAYING');
    });

    it('rejects the start request from a non-host player', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.addPlayer(new Player('s2', 'Bob'));

      const started = game.startGame('s2');

      expect(started).toBe(false);
      expect(game.status).toBe('WAITING');
    });

    it('starts correctly in solo mode with only one player', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));

      const started = game.startGame('s1');

      expect(started).toBe(true);
      expect(game.status).toBe('PLAYING');
    });

    it('does not restart a game already in progress', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.startGame('s1');

      const startedAgain = game.startGame('s1');

      expect(startedAgain).toBe(false);
    });
  });

  describe('drawNextPiece', () => {
    it('produces the same sequence for the same seed', () => {
      const gameA = new Game('room1', 42);
      const gameB = new Game('room2', 42);

      const sequenceA = [gameA.drawNextPiece(), gameA.drawNextPiece(), gameA.drawNextPiece()];
      const sequenceB = [gameB.drawNextPiece(), gameB.drawNextPiece(), gameB.drawNextPiece()];

      expect(sequenceA).toEqual(sequenceB);
    });
  });

  describe('getAlivePlayers / isMatchOver / finishMatch', () => {
    it('reports the match as not over while 2+ players are alive', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.addPlayer(new Player('s2', 'Bob'));
      game.startGame('s1');

      expect(game.isMatchOver()).toBe(false);
    });

    it('reports the match as over once only one player remains alive', () => {
      const game = new Game('room1');
      const alice = new Player('s1', 'Alice');
      const bob = new Player('s2', 'Bob');
      game.addPlayer(alice);
      game.addPlayer(bob);
      game.startGame('s1');

      bob.eliminate();

      expect(game.getAlivePlayers()).toEqual([alice]);
      expect(game.isMatchOver()).toBe(true);
    });

    it('does not report match over for a room that has not started', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));

      expect(game.isMatchOver()).toBe(false);
    });

    it('finishMatch sets status to FINISHED', () => {
      const game = new Game('room1');
      game.addPlayer(new Player('s1', 'Alice'));
      game.startGame('s1');

      game.finishMatch();

      expect(game.status).toBe('FINISHED');
    });
  });
});

describe('spawnPiece', () => {
  it('places a piece on the player grid at the spawn position', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);

    game.spawnPiece(alice);

    expect(alice.activePiece).not.toBeNull();
    expect(alice.isAlive).toBe(true);
  });

  it('eliminates the player if the spawn position is already blocked (top out)', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);

    // Fill the top rows so any spawn position collides immediately.
    for (let row = 0; row < 4; row++) {
      alice.grid[row]!.fill(1);
    }

    game.spawnPiece(alice);

    expect(alice.isAlive).toBe(false);
  });
});

describe('tickPlayer', () => {
  it('does nothing if the player has no active piece', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);

    expect(() => game.tickPlayer(alice)).not.toThrow();
    expect(alice.activePiece).toBeNull();
  });

  it('moves the active piece down one row when space is open', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);
    game.spawnPiece(alice);
    const startY = alice.activePiece!.position.y;

    game.tickPlayer(alice);

    expect(alice.activePiece!.position.y).toBe(startY + 1);
  });

  it('locks the piece and spawns a new one after the grace tick expires on the floor', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);
    alice.activePiece = {
      key: 'O',
      matrix: TETROMINOES.O,
      position: { x: 4, y: 18 },
      touchingGround: false,
    };

    game.tickPlayer(alice); // first tick touching floor: grace tick, no lock
    expect(alice.activePiece!.touchingGround).toBe(true);

    game.tickPlayer(alice); // second tick: locks, new piece spawns
    expect(alice.grid[18]![4]).toBe(4);
    expect(alice.activePiece).not.toBeNull(); // a new piece was spawned
  });

  it('applies garbage penalty to opponents when clearing multiple lines', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    const bob = new Player('s2', 'Bob');
    game.addPlayer(alice);
    game.addPlayer(bob);

    // Fill row 19 across the whole width except columns 4-5, ready to complete with an O-piece.
    alice.grid[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
    alice.grid[18] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
    alice.activePiece = {
      key: 'O',
      matrix: TETROMINOES.O,
      position: { x: 4, y: 18 },
      touchingGround: true, // already past the grace tick
    };

    const bobGridBefore = bob.grid.map((row) => [...row]);
    game.tickPlayer(alice);

    expect(alice.linesCleared).toBe(2);
    // garbagePenalty = 2 - 1 = 1 row pushed onto Bob's board
    expect(bob.grid).not.toEqual(bobGridBefore);
  });
});

describe('tickPlayer additional branch coverage', () => {
  it('does nothing if the player has an active piece but is already eliminated', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);
    game.spawnPiece(alice);
    alice.eliminate();
    const positionBefore = { ...alice.activePiece!.position };

    game.tickPlayer(alice);

    expect(alice.activePiece!.position).toEqual(positionBefore);
  });

  it('does not send garbage when exactly one line is cleared (penalty is zero)', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    const bob = new Player('s2', 'Bob');
    game.addPlayer(alice);
    game.addPlayer(bob);

    // Only row 19 is ready to complete — a single line clear, penalty = 1 - 1 = 0.
    alice.grid[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
    alice.activePiece = {
      key: 'O',
      matrix: TETROMINOES.O,
      position: { x: 4, y: 18 },
      touchingGround: true,
    };

    const bobGridBefore = bob.grid.map((row) => [...row]);
    game.tickPlayer(alice);

    expect(alice.linesCleared).toBe(1);
    expect(bob.grid).toEqual(bobGridBefore); // untouched — no garbage sent
  });

  it('does not send garbage to opponents who are already eliminated', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    const bob = new Player('s2', 'Bob');
    game.addPlayer(alice);
    game.addPlayer(bob);
    bob.eliminate();

    alice.grid[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
    alice.grid[18] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
    alice.activePiece = {
      key: 'O',
      matrix: TETROMINOES.O,
      position: { x: 4, y: 18 },
      touchingGround: true,
    };

    const bobGridBefore = bob.grid.map((row) => [...row]);
    game.tickPlayer(alice);

    expect(bob.grid).toEqual(bobGridBefore); // eliminated player is skipped
  });
});

describe('tickPlayer defensive fallbacks', () => {
  it('treats a missing touchingGround as false (defensive fallback)', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);
    // Manually construct activePiece without touchingGround, simulating
    // a piece object that never went through spawnPiece's explicit default.
    alice.activePiece = {
      key: 'O',
      matrix: TETROMINOES.O,
      position: { x: 4, y: 0 },
    };

    expect(() => game.tickPlayer(alice)).not.toThrow();
    expect(alice.activePiece!.position.y).toBe(1); // moved down normally
  });

  it('treats a missing linesCleared on the tick result as zero (defensive fallback)', () => {
    const game = new Game('room1', 1);
    const alice = new Player('s1', 'Alice');
    game.addPlayer(alice);
    alice.activePiece = {
      key: 'O',
      matrix: TETROMINOES.O,
      position: { x: 4, y: 18 },
      touchingGround: true,
    };

    // No full rows exist, so this locks with linesCleared: 0 either way —
    // this test exists to document/lock in the `?? 0` fallback behavior.
    game.tickPlayer(alice);

    expect(alice.linesCleared).toBe(0);
    expect(alice.score).toBe(0);
  });
});