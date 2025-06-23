/**
 * P2P Service - Handles all peer-to-peer networking
 * This file manages libp2p node creation, peer discovery, and messaging
 */

import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { kadDHT } from '@libp2p/kad-dht';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import bootstrapNodes from '../config/bootstrapNodes.js';

class P2PService {
  constructor() {
    this.node = null;
    this.currentCell = null;
    this.messageHandlers = new Map();
  }

  /**
   * Initialize the P2P node
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this.node = await createLibp2p({
        // Network transports
        transports: [
          webSockets(),
          webRTC()
        ],
        
        // Connection encryption
        connectionEncryption: [noise()],
        
        // Stream multiplexing
        streamMuxers: [yamux()],
        
        // Peer discovery
        peerDiscovery: bootstrapNodes.length > 0 ? [
          bootstrap({
            list: bootstrapNodes,
            timeout: 60 * 1000 // 1 minute
          })
        ] : [],
        
        // Services
        services: {
          pubsub: gossipsub(),
          dht: kadDHT({
            clientMode: true // Mobile devices act as DHT clients only
          }),
          identify: identify()
        }
      });

      await this.node.start();
      console.log('P2P node started with ID:', this.node.peerId.toString());
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize P2P node:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for P2P events
   */
  setupEventListeners() {
    // Peer discovery
    this.node.addEventListener('peer:discovery', (evt) => {
      console.log('Discovered peer:', evt.detail.id.toString());
    });

    // Peer connection
    this.node.addEventListener('peer:connect', (evt) => {
      console.log('Connected to peer:', evt.detail.toString());
    });

    // Peer disconnection
    this.node.addEventListener('peer:disconnect', (evt) => {
      console.log('Disconnected from peer:', evt.detail.toString());
    });
  }

  /**
   * Join a geographic cell for chat
   * @param {string} cellId - The cell identifier
   */
  async joinCell(cellId) {
    if (this.currentCell) {
      await this.leaveCell();
    }

    const topic = `proximity-chat-cell-${cellId}`;
    
    // Subscribe to the cell's pubsub topic
    this.node.services.pubsub.subscribe(topic);
    
    // Set up message handler for this topic
    this.node.services.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === topic) {
        this.handleMessage(evt.detail);
      }
    });

    this.currentCell = cellId;
    console.log(`Joined cell: ${cellId}`);
    
    // Announce presence in DHT (for discovery)
    try {
      const key = `/proximity-chat/cell/${cellId}/${this.node.peerId.toString()}`;
      await this.node.services.dht.put(
        new TextEncoder().encode(key),
        new TextEncoder().encode(Date.now().toString())
      );
    } catch (error) {
      console.warn('Failed to announce in DHT:', error);
      // Not critical - continue without DHT announcement
    }
  }

  /**
   * Leave the current cell
   */
  async leaveCell() {
    if (!this.currentCell) return;

    const topic = `proximity-chat-cell-${this.currentCell}`;
    this.node.services.pubsub.unsubscribe(topic);
    
    this.currentCell = null;
    console.log('Left cell');
  }

  /**
   * Send a message to the current cell
   * @param {Object} message - Message object to send
   */
  async sendMessage(message) {
    if (!this.currentCell) {
      throw new Error('Not in any cell');
    }

    const topic = `proximity-chat-cell-${this.currentCell}`;
    const msgData = {
      ...message,
      from: this.node.peerId.toString(),
      timestamp: Date.now()
    };

    await this.node.services.pubsub.publish(
      topic,
      new TextEncoder().encode(JSON.stringify(msgData))
    );
  }

  /**
   * Handle incoming messages
   * @param {Object} message - The message event detail
   */
  handleMessage(message) {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.data));
      
      // Notify all registered handlers
      this.messageHandlers.forEach(handler => {
        handler(data);
      });
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Register a message handler
   * @param {string} id - Handler identifier
   * @param {Function} handler - Handler function
   */
  onMessage(id, handler) {
    this.messageHandlers.set(id, handler);
  }

  /**
   * Unregister a message handler
   * @param {string} id - Handler identifier
   */
  offMessage(id) {
    this.messageHandlers.delete(id);
  }

  /**
   * Get connected peers count
   * @returns {number}
   */
  getPeerCount() {
    return this.node.getPeers().length;
  }

  /**
   * Shutdown the P2P node
   */
  async shutdown() {
    if (this.node) {
      await this.node.stop();
      this.node = null;
    }
  }
}

// Export singleton instance
export default new P2PService(); 