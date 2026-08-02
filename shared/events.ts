
export const SOCKET_EVENTS = {
    // Connection lifecycle
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
  
    // Room / lobby
    JOIN_ROOM: 'JOIN_ROOM',
    LEAVE_ROOM: 'LEAVE_ROOM',
    ROOM_UPDATED: 'ROOM_UPDATED',
  
    // Game lifecycle
    START_GAME: 'START_GAME',
    GAME_STARTED: 'GAME_STARTED',
    MATCH_FINISHED: 'MATCH_FINISHED',
  
    // Gameplay
    MOVE_PIECE: 'MOVE_PIECE',
    GRID_UPDATED: 'GRID_UPDATED',
    NEXT_PIECE: 'NEXT_PIECE',
    SPECTRUM_UPDATED: 'SPECTRUM_UPDATED',
  } as const;
  
  export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];