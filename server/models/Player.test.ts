import { Player } from './Player';

describe('Player', () => {
  it('initializes with sensible defaults', () => {
    const player = new Player('socket-1', 'Alice');

    expect(player.id).toBe('socket-1');
    expect(player.name).toBe('Alice');
    expect(player.isHost).toBe(false);
    expect(player.isAlive).toBe(true);
    expect(player.score).toBe(0);
    expect(player.level).toBe(1);
    expect(player.linesCleared).toBe(0);
    expect(player.grid).toHaveLength(20);
    expect(player.grid[0]).toHaveLength(10);
    expect(player.activePiece).toBeNull();
    expect(player.nextQueue).toEqual([]);
    expect(player.heldPiece).toBeNull();
    expect(player.hasHeldThisDrop).toBe(false);
  });

  describe('addScore', () => {
    it('adds points to the running score', () => {
      const player = new Player('socket-1', 'Alice');
      player.addScore(300);
      player.addScore(100);
      expect(player.score).toBe(400);
    });
  });

  describe('registerLinesCleared', () => {
    it('accumulates total lines cleared', () => {
      const player = new Player('socket-1', 'Alice');
      player.registerLinesCleared(3);
      player.registerLinesCleared(2);
      expect(player.linesCleared).toBe(5);
    });

    it('increases level every 10 lines cleared', () => {
      const player = new Player('socket-1', 'Alice');
      expect(player.level).toBe(1);

      player.registerLinesCleared(9);
      expect(player.level).toBe(1); // still under 10

      player.registerLinesCleared(1); // now at 10 total
      expect(player.level).toBe(2);

      player.registerLinesCleared(10); // now at 20 total
      expect(player.level).toBe(3);
    });
  });

  describe('eliminate', () => {
    it('sets isAlive to false', () => {
      const player = new Player('socket-1', 'Alice');
      player.eliminate();
      expect(player.isAlive).toBe(false);
    });
  });

  describe('resetDropState', () => {
    it('resets hasHeldThisDrop to false', () => {
      const player = new Player('socket-1', 'Alice');
      player.hasHeldThisDrop = true;
      player.resetDropState();
      expect(player.hasHeldThisDrop).toBe(false);
    });
  });
});