// components/ChatComponent.tsx
import React, { useState, ChangeEvent } from 'react';
import axios from 'axios';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const ChatComponent: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Append user's message
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    
    try {
      const { data } = await axios.post<{ answer: string }>('/api/llm', { query: input });
      setMessages((prev) => [...prev, { sender: 'bot', text: data.answer }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Error processing your request.' },
      ]);
    }
    
    setInput('');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <p>
              <strong>{msg.sender === 'user' ? 'You' : 'Bot'}:</strong> {msg.text}
            </p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={input}
          placeholder="Type your question..."
          onChange={handleInputChange}
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={sendMessage} style={{ padding: '0.5rem 1rem' }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
