import React, { useEffect, useState } from 'react';

type MessageResponse = {
  message: string;
};

function App() {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:3000/api/message') // Match backend route
      .then((res) => res.json())
      .then((data: MessageResponse) => setMessage(data.message))
      .catch((err) => console.error('Fetch error:', err));
  }, []);

  return (
    <div>
      <h1>React + TypeScript + Express</h1>
      <p>{message || 'Loading message from backend...'}</p>
    </div>
  );
}

export default App;
