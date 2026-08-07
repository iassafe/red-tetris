import { Game } from './Game';
import { Player } from './Player';

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