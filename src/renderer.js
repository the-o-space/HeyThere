// UI elements
const connectionPanel = document.getElementById('connectionPanel');
const chatPanel = document.getElementById('chatPanel');
const bootstrapInput = document.getElementById('bootstrapInput');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const peerCount = document.getElementById('peerCount');

// State
let connectedPeers = new Set();
let myNickname = `User_${Math.random().toString(36).substring(2, 8)}`;

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Connection functions
async function connect() {
  const bootstrapAddress = bootstrapInput.value.trim();
  if (!bootstrapAddress) {
    showError('Please enter a bootstrap address');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  const result = await window.messenger.connect(bootstrapAddress);
  
  if (result.success) {
    connectionPanel.classList.add('hidden');
    chatPanel.classList.remove('hidden');
    addSystemMessage('Connected to network');
    messageInput.focus();
  } else {
    showError(`Connection failed: ${result.error}`);
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect';
  }
}

async function disconnect() {
  await window.messenger.disconnect();
  chatPanel.classList.add('hidden');
  connectionPanel.classList.remove('hidden');
  messagesArea.innerHTML = '';
  connectedPeers.clear();
  updatePeerCount();
  connectBtn.disabled = false;
  connectBtn.textContent = 'Connect';
}

// Message functions
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const message = {
    text,
    nickname: myNickname,
    type: 'chat'
  };

  await window.messenger.sendMessage(message);
  
  // Display own message
  displayMessage({
    ...message,
    timestamp: Date.now(),
    isOwn: true
  });

  messageInput.value = '';
}

function displayMessage(data) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${data.isOwn ? 'own' : ''}`;
  
  const time = new Date(data.timestamp).toLocaleTimeString();
  
  messageEl.innerHTML = `
    <div class="message-header">
      <span class="nickname">${data.nickname || 'Anonymous'}</span>
      <span class="time">${time}</span>
    </div>
    <div class="message-text">${escapeHtml(data.text)}</div>
  `;
  
  messagesArea.appendChild(messageEl);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function addSystemMessage(text) {
  const messageEl = document.createElement('div');
  messageEl.className = 'system-message';
  messageEl.textContent = text;
  messagesArea.appendChild(messageEl);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function updatePeerCount() {
  peerCount.textContent = `${connectedPeers.size} peer${connectedPeers.size !== 1 ? 's' : ''}`;
}

function showError(message) {
  // Simple error display - could be improved with a toast notification
  alert(message);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Network event handlers
window.messenger.onPeerJoined((peerId) => {
  connectedPeers.add(peerId);
  updatePeerCount();
  addSystemMessage(`A peer joined the chat`);
});

window.messenger.onPeerLeft((peerId) => {
  connectedPeers.delete(peerId);
  updatePeerCount();
  addSystemMessage(`A peer left the chat`);
});

window.messenger.onMessage((data) => {
  displayMessage(data);
});

window.messenger.onConnected(() => {
  console.log('Connected to DHT network');
});

window.messenger.onDisconnected(() => {
  console.log('Disconnected from DHT network');
}); 