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

export interface HealthResponse {
  status: string;
  connections: number;
  timestamp: string;
}