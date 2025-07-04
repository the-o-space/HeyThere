const EventEmitter = require('events');
const Hyperswarm = require('hyperswarm');
const crypto = require('crypto');

class NetworkManager extends EventEmitter {
  constructor() {
    super();
    this.swarm = null;
    this.peers = new Map();
    this.topic = null;
    this.peerId = crypto.randomBytes(16).toString('hex');
    this.isConnected = false;
  }

  /**
   * Connect to the DHT network using a bootstrap address
   * @param {string} bootstrapAddress - Address in format "host:port" or topic hex
   */
  async connect(bootstrapAddress) {
    if (this.swarm) {
      await this.disconnect();
    }

    this.swarm = new Hyperswarm();
    
    // Generate or parse topic
    if (bootstrapAddress.includes(':')) {
      // It's a bootstrap server address, generate a common topic
      this.topic = crypto.createHash('sha256')
        .update('heythere-messenger-room')
        .digest();
    } else {
      // It's a topic hex string
      this.topic = Buffer.from(bootstrapAddress, 'hex');
    }

    // Join the topic
    this.swarm.join(this.topic, { server: true, client: true });

    // Handle peer connections
    this.swarm.on('connection', (connection, info) => {
      const peerId = info.publicKey.toString('hex');
      
      this.peers.set(peerId, {
        connection,
        info,
        nickname: `User_${peerId.substring(0, 6)}`
      });

      this.emit('peer-joined', peerId);

      // Handle incoming messages
      connection.on('data', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.emit('message', {
            ...message,
            peerId,
            timestamp: Date.now()
          });
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      });

      connection.on('close', () => {
        this.peers.delete(peerId);
        this.emit('peer-left', peerId);
      });

      connection.on('error', (err) => {
        console.error('Connection error:', err);
        this.peers.delete(peerId);
        this.emit('peer-left', peerId);
      });
    });

    // If bootstrap address includes host:port, configure DHT bootstrap
    if (bootstrapAddress.includes(':')) {
      const [host, port] = bootstrapAddress.split(':');
      this.swarm.dht.bootstrap([{ host, port: parseInt(port) }]);
    }

    this.isConnected = true;
    this.emit('connected');
  }

  /**
   * Broadcast a message to all connected peers
   * @param {Object} message - Message object to broadcast
   */
  async broadcast(message) {
    if (!this.isConnected) {
      throw new Error('Not connected to network');
    }

    const payload = JSON.stringify({
      ...message,
      senderId: this.peerId,
      timestamp: Date.now()
    });

    const buffer = Buffer.from(payload);
    
    for (const [peerId, peer] of this.peers) {
      try {
        peer.connection.write(buffer);
      } catch (err) {
        console.error(`Failed to send message to peer ${peerId}:`, err);
      }
    }
  }

  /**
   * Disconnect from the DHT network
   */
  async disconnect() {
    if (this.swarm) {
      await this.swarm.destroy();
      this.swarm = null;
    }
    
    this.peers.clear();
    this.isConnected = false;
    this.emit('disconnected');
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
    return Array.from(this.peers.keys());
  }
}

module.exports = NetworkManager; 