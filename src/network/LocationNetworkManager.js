const EventEmitter = require('events');
const crypto = require('crypto');

class LocationNetworkManager extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.peers = new Map();
    this.peerId = null;
    this.nickname = '';
    this.location = null;
    this.discoveryServer = null;
    this.isConnected = false;
    
    // WebRTC configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  /**
   * Connect to discovery server with location
   * @param {string} serverUrl - Discovery server URL (e.g., ws://localhost:3001)
   * @param {Object} options - Connection options
   */
  async connectWithLocation(serverUrl, options = {}) {
    const { nickname, lat, lon } = options;
    
    if (this.ws) {
      await this.disconnect();
    }

    this.nickname = nickname || `User_${Math.random().toString(36).substring(2, 8)}`;
    this.discoveryServer = serverUrl;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);
        
        this.ws.onopen = () => {
          console.log('Connected to discovery server');
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleDiscoveryMessage(message);
          
          if (message.type === 'welcome') {
            this.peerId = message.peerId;
            this.isConnected = true;
            
            // Send location update
            if (lat && lon) {
              this.updateLocation(lat, lon);
            }
            
            this.emit('connected');
            resolve({ success: true, peerId: this.peerId });
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('Failed to connect to discovery server'));
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Update location and find nearby peers
   */
  updateLocation(lat, lon) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to discovery server');
    }

    this.location = { lat, lon };
    
    this.ws.send(JSON.stringify({
      type: 'updateLocation',
      lat,
      lon,
      nickname: this.nickname
    }));
  }

  /**
   * Handle messages from discovery server
   */
  handleDiscoveryMessage(message) {
    switch (message.type) {
      case 'nearbyPeers':
        this.emit('nearbyPeers', message.peers);
        break;
        
      case 'signal':
        this.handleIncomingSignal(message);
        break;
        
      case 'error':
        console.error('Discovery server error:', message.message);
        this.emit('error', message.message);
        break;
    }
  }

  /**
   * Connect to a specific peer using WebRTC
   */
  async connectToPeer(targetId) {
    if (this.peers.has(targetId)) {
      console.log('Already connected to peer:', targetId);
      return;
    }

    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    const dataChannel = peerConnection.createDataChannel('chat');
    
    const peer = {
      id: targetId,
      connection: peerConnection,
      dataChannel: null,
      nickname: ''
    };
    
    this.peers.set(targetId, peer);
    
    // Set up data channel handlers
    dataChannel.onopen = () => {
      peer.dataChannel = dataChannel;
      this.emit('peer-joined', targetId);
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit('message', {
          ...message,
          peerId: targetId,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };
    
    dataChannel.onclose = () => {
      this.handlePeerDisconnect(targetId);
    };
    
    // Set up WebRTC handlers
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };
    
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      peer.dataChannel = channel;
      
      channel.onmessage = dataChannel.onmessage;
      channel.onclose = dataChannel.onclose;
    };
    
    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    this.sendSignal(targetId, {
      type: 'offer',
      offer
    });
  }

  /**
   * Handle incoming WebRTC signals
   */
  async handleIncomingSignal(message) {
    const { fromId, fromNickname, signal } = message;
    
    let peer = this.peers.get(fromId);
    
    if (!peer && signal.type === 'offer') {
      // Incoming connection request
      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      
      peer = {
        id: fromId,
        connection: peerConnection,
        dataChannel: null,
        nickname: fromNickname
      };
      
      this.peers.set(fromId, peer);
      
      // Set up handlers
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(fromId, {
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      };
      
      peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        peer.dataChannel = channel;
        
        channel.onopen = () => {
          this.emit('peer-joined', fromId);
        };
        
        channel.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.emit('message', {
              ...message,
              peerId: fromId,
              timestamp: Date.now()
            });
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };
        
        channel.onclose = () => {
          this.handlePeerDisconnect(fromId);
        };
      };
    }
    
    if (!peer) return;
    
    // Handle signal types
    switch (signal.type) {
      case 'offer':
        await peer.connection.setRemoteDescription(signal.offer);
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        
        this.sendSignal(fromId, {
          type: 'answer',
          answer
        });
        break;
        
      case 'answer':
        await peer.connection.setRemoteDescription(signal.answer);
        break;
        
      case 'ice-candidate':
        await peer.connection.addIceCandidate(signal.candidate);
        break;
    }
  }

  /**
   * Send signal through discovery server
   */
  sendSignal(targetId, signal) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Not connected to discovery server');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'signal',
      targetId,
      signal
    }));
  }

  /**
   * Broadcast message to all connected peers
   */
  async broadcast(message) {
    if (!this.isConnected) {
      throw new Error('Not connected to network');
    }

    const payload = JSON.stringify({
      ...message,
      senderId: this.peerId,
      nickname: this.nickname,
      timestamp: Date.now()
    });

    for (const [peerId, peer] of this.peers) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(payload);
        } catch (err) {
          console.error(`Failed to send message to peer ${peerId}:`, err);
        }
      }
    }
  }

  /**
   * Handle peer disconnect
   */
  handlePeerDisconnect(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
      if (peer.connection) {
        peer.connection.close();
      }
      this.peers.delete(peerId);
      this.emit('peer-left', peerId);
    }
  }

  /**
   * Disconnect from network
   */
  async disconnect() {
    // Close all peer connections
    for (const [peerId, peer] of this.peers) {
      this.handlePeerDisconnect(peerId);
    }
    
    // Close discovery server connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Handle discovery server disconnect
   */
  handleDisconnect() {
    console.log('Disconnected from discovery server');
    this.isConnected = false;
    
    // Keep peer connections alive if possible
    // They can continue P2P even if discovery server is down
    
    this.emit('discovery-disconnected');
  }

  /**
   * Get current peer count
   */
  getPeerCount() {
    return this.peers.size;
  }

  /**
   * Get list of connected peers
   */
  getPeers() {
    return Array.from(this.peers.entries()).map(([id, peer]) => ({
      id,
      nickname: peer.nickname
    }));
  }
}

module.exports = LocationNetworkManager; 