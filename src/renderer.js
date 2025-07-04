// UI elements
const connectionPanel = document.getElementById('connectionPanel');
const chatPanel = document.getElementById('chatPanel');
const nicknameInput = document.getElementById('nicknameInput');
const latitudeInput = document.getElementById('latitudeInput');
const longitudeInput = document.getElementById('longitudeInput');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const discoveryServerInput = document.getElementById('discoveryServerInput');
const connectBtn = document.getElementById('connectBtn');
const nicknameDisplay = document.getElementById('nicknameDisplay');
const locationDisplay = document.getElementById('locationDisplay');
const disconnectBtn = document.getElementById('disconnectBtn');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const peerCount = document.getElementById('peerCount');
const peersList = document.getElementById('peersList');

// State
let connectedPeers = new Set();
let nearbyPeers = new Map();
let myNickname = '';
let userLocation = null;

// Load saved preferences
const savedNickname = localStorage.getItem('heythere-nickname');
if (savedNickname) {
  nicknameInput.value = savedNickname;
}

const savedLat = localStorage.getItem('heythere-lat');
const savedLon = localStorage.getItem('heythere-lon');
if (savedLat && savedLon) {
  latitudeInput.value = savedLat;
  longitudeInput.value = savedLon;
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
nicknameDisplay.addEventListener('click', changeNickname);
detectLocationBtn.addEventListener('click', detectLocation);

// Detect current location
async function detectLocation() {
  detectLocationBtn.disabled = true;
  detectLocationBtn.textContent = '...';
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    
    latitudeInput.value = position.coords.latitude.toFixed(4);
    longitudeInput.value = position.coords.longitude.toFixed(4);
    
    // Save to localStorage
    localStorage.setItem('heythere-lat', latitudeInput.value);
    localStorage.setItem('heythere-lon', longitudeInput.value);
    
  } catch (error) {
    let errorMsg = 'Location detection failed: ';
    if (error.code === 1) {
      errorMsg += 'Permission denied';
    } else if (error.code === 2) {
      errorMsg += 'Position unavailable';
    } else if (error.code === 3) {
      errorMsg += 'Timeout';
    } else {
      errorMsg += error.message;
    }
    showError(errorMsg);
  } finally {
    detectLocationBtn.disabled = false;
    detectLocationBtn.textContent = '📍';
  }
}

// Connection function
async function connect() {
  const discoveryServer = discoveryServerInput.value.trim();
  const lat = parseFloat(latitudeInput.value);
  const lon = parseFloat(longitudeInput.value);
  
  if (!discoveryServer) {
    showError('Please enter a discovery server URL');
    return;
  }
  
  if (isNaN(lat) || isNaN(lon)) {
    showError('Please enter valid latitude and longitude');
    return;
  }
  
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    showError('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180');
    return;
  }

  // Get nickname
  const inputNickname = nicknameInput.value.trim();
  if (inputNickname) {
    myNickname = inputNickname;
    localStorage.setItem('heythere-nickname', myNickname);
  } else {
    myNickname = `User_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Save location
  userLocation = { lat, lon };
  localStorage.setItem('heythere-lat', lat);
  localStorage.setItem('heythere-lon', lon);

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  try {
    const result = await window.messenger.connect(discoveryServer, {
      nickname: myNickname,
      lat: userLocation.lat,
      lon: userLocation.lon
    });

    if (result.success) {
      connectionPanel.classList.add('hidden');
      chatPanel.classList.remove('hidden');
      nicknameDisplay.textContent = `${myNickname} •`;
      locationDisplay.textContent = `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)} •`;
      addSystemMessage('Connected to discovery server');
      addSystemMessage(`You joined as "${myNickname}"`);
      messageInput.focus();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showError(`Connection failed: ${error.message}`);
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect to Nearby';
  }
}

async function disconnect() {
  await window.messenger.disconnect();
  chatPanel.classList.add('hidden');
  connectionPanel.classList.remove('hidden');
  messagesArea.innerHTML = '';
  peersList.innerHTML = '';
  connectedPeers.clear();
  nearbyPeers.clear();
  updatePeerCount();
  connectBtn.disabled = false;
  connectBtn.textContent = 'Connect to Nearby';
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

function updateNearbyPeersList() {
  peersList.innerHTML = '';
  
  nearbyPeers.forEach((peer, peerId) => {
    const peerItem = document.createElement('div');
    peerItem.className = 'peer-item';
    
    const isConnected = connectedPeers.has(peerId);
    
    peerItem.innerHTML = `
      <div class="peer-info">
        <div class="peer-avatar">${peer.nickname.charAt(0).toUpperCase()}</div>
        <div class="peer-details">
          <div class="peer-nickname">${peer.nickname}</div>
          <div class="peer-distance">${peer.distance}km away</div>
        </div>
      </div>
      <div class="peer-status">
        ${isConnected 
          ? '<span class="peer-connected">Connected</span>' 
          : `<button class="connect-peer-btn" data-peer-id="${peerId}">Connect</button>`
        }
      </div>
    `;
    
    // Add connect button handler
    const connectBtn = peerItem.querySelector('.connect-peer-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => connectToPeer(peerId));
    }
    
    peersList.appendChild(peerItem);
  });
}

async function connectToPeer(peerId) {
  const btn = document.querySelector(`[data-peer-id="${peerId}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Connecting...';
  }
  
  try {
    await window.messenger.connectToPeer(peerId);
  } catch (error) {
    console.error('Failed to connect to peer:', error);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Connect';
    }
  }
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

function changeNickname() {
  const newNickname = prompt('Enter new nickname:', myNickname);
  if (newNickname && newNickname.trim() && newNickname.trim() !== myNickname) {
    const oldNickname = myNickname;
    myNickname = newNickname.trim().substring(0, 20);
    localStorage.setItem('heythere-nickname', myNickname);
    nicknameDisplay.textContent = `${myNickname} •`;
    addSystemMessage(`You changed your name from "${oldNickname}" to "${myNickname}"`);
    
    // Notify other peers about the name change
    window.messenger.sendMessage({
      type: 'nameChange',
      oldNickname,
      newNickname: myNickname
    });
  }
}

// Network event handlers
window.messenger.onNearbyPeers((peers) => {
  nearbyPeers.clear();
  peers.forEach(peer => {
    nearbyPeers.set(peer.id, peer);
  });
  updateNearbyPeersList();
});

window.messenger.onPeerJoined((peerId) => {
  connectedPeers.add(peerId);
  updatePeerCount();
  updateNearbyPeersList();
  
  const peer = nearbyPeers.get(peerId);
  if (peer) {
    addSystemMessage(`${peer.nickname} joined the chat`);
  }
});

window.messenger.onPeerLeft((peerId) => {
  connectedPeers.delete(peerId);
  updatePeerCount();
  updateNearbyPeersList();
  
  const peer = nearbyPeers.get(peerId);
  if (peer) {
    addSystemMessage(`${peer.nickname} left the chat`);
  }
});

window.messenger.onMessage((data) => {
  if (data.type === 'nameChange') {
    addSystemMessage(`"${data.oldNickname}" changed their name to "${data.newNickname}"`);
  } else {
    displayMessage(data);
  }
});

window.messenger.onConnected(() => {
  console.log('Connected to discovery server');
});

window.messenger.onDisconnected(() => {
  console.log('Disconnected from discovery server');
});

window.messenger.onDiscoveryDisconnected(() => {
  addSystemMessage('Lost connection to discovery server (P2P connections remain active)');
});

window.messenger.onError((error) => {
  console.error('Network error:', error);
  addSystemMessage(`Network error: ${error}`);
}); 