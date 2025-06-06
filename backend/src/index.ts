import WebSocket from 'ws';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ClientMessage, ServerMessage, HealthResponse } from './types';

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set<WebSocket>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');
  clients.add(ws);

  // Send welcome message
  const welcomeMessage: ServerMessage = {
    type: 'system',
    message: 'Connected to chat server',
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(welcomeMessage));

  // Handle incoming messages
  ws.on('message', (data: WebSocket.RawData) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      console.log('Received:', message);

      // Broadcast message to all connected clients
      const broadcastMessage: ServerMessage = {
        type: 'message',
        username: message.username || 'Anonymous',
        message: message.message,
        timestamp: new Date().toISOString()
      };

      // Send to all connected clients
      clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Basic HTTP endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  const response: HealthResponse = {
    status: 'OK',
    connections: clients.size,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});