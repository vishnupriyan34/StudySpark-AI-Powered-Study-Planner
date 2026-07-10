import React, { useState, useEffect, useRef } from 'react';

export default function Chatbot({ token, apiBase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hi there! I am your AI Study Companion. How can I help you manage your studies today?\n\nTry asking me:\n- \"What should I study today?\"\n- \"How can I manage my time?\"\n- \"Give me a motivational quote.\""
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = { sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/ai/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: inputText })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I am having trouble connecting to the brain server. Please try again." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Network error. Make sure backend is running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-widget">
      
      {/* Floating Toggle Button */}
      <button 
        className="chatbot-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Chatbot"
      >
        {isOpen ? '❌' : '🤖'}
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span>🤖</span> Smart Study Assistant
            </h4>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>IST Helper</span>
          </div>

          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message bot" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                Typing study guidance...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-area">
            <input 
              type="text" 
              className="chat-input"
              placeholder="Ask anything about your study plan..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
              disabled={isLoading || !inputText.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
