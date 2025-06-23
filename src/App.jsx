import { useState, useEffect } from 'react';
import p2pService from './services/p2p';
import geoService from './services/geolocation';
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentCell, setCurrentCell] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
    return () => {
      // Cleanup on unmount
      p2pService.shutdown();
      geoService.stopWatching();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize P2P
      await p2pService.init();
      
      // Set up message handler
      p2pService.onMessage('app', (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Update peer count periodically
      const peerInterval = setInterval(() => {
        setPeerCount(p2pService.getPeerCount());
      }, 2000);

      setIsInitialized(true);

      // Try to get location and join cell
      try {
        const cellId = await geoService.getCurrentCell();
        await joinCell(cellId);
      } catch (geoError) {
        console.warn('Location access denied:', geoError);
        setError('Location access denied. Please enter a cell manually.');
      }

      return () => clearInterval(peerInterval);
    } catch (err) {
      console.error('Initialization failed:', err);
      setError('Failed to initialize P2P network');
    }
  };

  const joinCell = async (cellId) => {
    try {
      await p2pService.joinCell(cellId);
      setCurrentCell(cellId);
      setMessages([]); // Clear messages when joining new cell
      setError(null);
    } catch (err) {
      console.error('Failed to join cell:', err);
      setError('Failed to join cell');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentCell) return;

    try {
      await p2pService.sendMessage({
        text: inputMessage.trim()
      });
      setInputMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  };

  const handleManualCellEntry = () => {
    const cellId = prompt('Enter cell ID (e.g., 1234_5678):');
    if (cellId) {
      joinCell(cellId);
    }
  };

  if (!isInitialized) {
    return (
      <div className="app loading">
        <h1>HeyThere</h1>
        <p>Initializing P2P network...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>HeyThere</h1>
        <div className="status">
          {currentCell ? (
            <>
              <span>Cell: {geoService.formatCellName(currentCell)}</span>
              <span>Peers: {peerCount}</span>
            </>
          ) : (
            <span>Not in any cell</span>
          )}
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={handleManualCellEntry}>Enter Cell Manually</button>
        </div>
      )}

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              No messages yet. Say hello!
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="message">
                <div className="message-header">
                  <span className="peer-id">{msg.from.slice(-8)}</span>
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            ))
          )}
        </div>

        {currentCell && (
          <div className="input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
