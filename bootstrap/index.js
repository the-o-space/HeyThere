/**
 * HeyThere Bootstrap Node
 * Helps peers discover each other on the P2P network
 */

import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { kadDHT } from '@libp2p/kad-dht';
import { identify } from '@libp2p/identify';
import { config } from 'dotenv';

// Load environment variables
config();

const PORT = process.env.PORT || 4001;
const ANNOUNCE_IP = process.env.ANNOUNCE_IP || '0.0.0.0';

async function startBootstrapNode() {
  try {
    // Create libp2p node
    const node = await createLibp2p({
      addresses: {
        listen: [
          `/ip4/0.0.0.0/tcp/${PORT}/ws`,
          `/ip4/0.0.0.0/tcp/${parseInt(PORT) + 1}`
        ],
        announce: ANNOUNCE_IP !== '0.0.0.0' ? [
          `/ip4/${ANNOUNCE_IP}/tcp/${PORT}/ws`,
          `/ip4/${ANNOUNCE_IP}/tcp/${parseInt(PORT) + 1}`
        ] : []
      },
      transports: [
        webSockets(),
        tcp()
      ],
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],
      services: {
        dht: kadDHT({
          clientMode: false, // Act as DHT server
          validators: {
            proximityChat: {
              func: () => {
                // Accept all proximity chat entries
                return { valid: true };
              }
            }
          },
          selectors: {
            proximityChat: () => 0
          }
        }),
        identify: identify()
      }
    });

    await node.start();
    
    console.log('Bootstrap node started!');
    console.log('Node ID:', node.peerId.toString());
    console.log('Listening on:');
    node.getMultiaddrs().forEach((addr) => {
      console.log(' ', addr.toString());
    });

    if (ANNOUNCE_IP !== '0.0.0.0') {
      console.log('\nYour multiaddr for sharing:');
      console.log(`/ip4/${ANNOUNCE_IP}/tcp/${PORT}/ws/p2p/${node.peerId.toString()}`);
    }

    // Log connection events
    node.addEventListener('peer:connect', (evt) => {
      console.log('Peer connected:', evt.detail.toString());
    });

    node.addEventListener('peer:disconnect', (evt) => {
      console.log('Peer disconnected:', evt.detail.toString());
    });

    // Log stats periodically
    setInterval(() => {
      const connections = node.getConnections();
      console.log(`\n[Stats] Connected peers: ${connections.length}`);
      
      // Log bandwidth if available
      if (node.metrics) {
        const stats = node.metrics.getComponentStats();
        console.log('[Stats] Bandwidth:', stats);
      }
    }, 30000); // Every 30 seconds

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.log('\nShutting down bootstrap node...');
      await node.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start bootstrap node:', error);
    process.exit(1);
  }
}

// Start the node
startBootstrapNode(); 