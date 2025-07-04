#!/usr/bin/env node

const Hyperswarm = require('hyperswarm');
const crypto = require('crypto');

const PORT = process.env.PORT || 4001;

console.log('Starting HeyThere Bootstrap Server...');

// Create a swarm instance
const swarm = new Hyperswarm();

// Generate the common topic for all clients
const topic = crypto.createHash('sha256')
  .update('heythere-messenger-room')
  .digest();

// Join the topic as both server and client
swarm.join(topic, { server: true, client: true });

// Track connected peers
const peers = new Set();

swarm.on('connection', (connection, info) => {
  const peerId = info.publicKey.toString('hex').substring(0, 8);
  peers.add(peerId);
  
  console.log(`[${new Date().toLocaleTimeString()}] Peer connected: ${peerId} (Total: ${peers.size})`);
  
  connection.on('close', () => {
    peers.delete(peerId);
    console.log(`[${new Date().toLocaleTimeString()}] Peer disconnected: ${peerId} (Total: ${peers.size})`);
  });
  
  connection.on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] Connection error with ${peerId}:`, err.message);
  });
});

// Ensure the DHT is bootstrapped
swarm.on('update', () => {
  console.log(`[${new Date().toLocaleTimeString()}] DHT update - Active peers: ${peers.size}`);
});

console.log(`Bootstrap server ready!`);
console.log(`Topic: ${topic.toString('hex')}`);
console.log(`\nClients can connect using:`);
console.log(`  - Bootstrap address: localhost:${PORT}`);
console.log(`  - Topic hex: ${topic.toString('hex')}`);
console.log(`\nListening for connections...`);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down bootstrap server...');
  await swarm.destroy();
  process.exit(0);
}); 