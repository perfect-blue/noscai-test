export interface ClientMessage {
  username: string;
  message: string;
}

export interface ServerMessage {
  type: 'message' | 'system';
  username?: string;
  message: string;
  timestamp: string;
}

export interface AppState {
  socket: WebSocket | null;
  messages: ServerMessage[];
  message: string;
  username: string;
  isConnected: boolean;
}