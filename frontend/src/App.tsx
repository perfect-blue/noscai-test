import React, { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { ServerMessage, ClientMessage } from './types';
import './App.css';

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [message, setMessage] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  const connectWebSocket = (): void => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event: MessageEvent) => {
      const data: ServerMessage = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  // Disconnect from WebSocket
  const disconnectWebSocket = (): void => {
    if (socket) {
      socket.close();
    }
  };

  // Send message
  const sendMessage = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    if (!message.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageData: ClientMessage = {
      username: username,
      message: message.trim()
    };

    socket.send(JSON.stringify(messageData));
    setMessage('');
  };

  // Handle username input key press
  const handleUsernameKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      connectWebSocket();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-time Chat with WebSocket (TypeScript)</h1>
        
        {!isConnected ? (
          <div className="connection-form">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleUsernameKeyPress}
            />
            <button onClick={connectWebSocket}>Connect</button>
          </div>
        ) : (
          <div className="chat-container">
            <div className="connection-status">
              <span className="status-indicator connected"></span>
              Connected as: <strong>{username}</strong>
              <button onClick={disconnectWebSocket} className="disconnect-btn">
                Disconnect
              </button>
            </div>

            <div className="messages-container">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.type === 'system' ? 'system-message' : ''}`}
                >
                  {msg.type === 'system' ? (
                    <div className="system-text">
                      {msg.message} - {formatTime(msg.timestamp)}
                    </div>
                  ) : (
                    <div className="user-message">
                      <span className="username">{msg.username}:</span>
                      <span className="message-text">{msg.message}</span>
                      <span className="timestamp">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="message-input"
              />
              <button type="submit" disabled={!message.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </header>
    </div>
  );
};

export default App;