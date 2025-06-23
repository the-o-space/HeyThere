/**
 * Bootstrap nodes for initial P2P network discovery
 * Format: multiaddr strings that include IP/DNS, port, and peer ID
 */

export const bootstrapNodes = [
  // Example format - replace with actual bootstrap nodes
  // '/ip4/YOUR_IP/tcp/4001/ws/p2p/QmYourPeerId',
  // '/dns4/bootstrap.example.com/tcp/4001/ws/p2p/QmYourPeerId',
];

// Development bootstrap nodes (local testing)
export const devBootstrapNodes = [
  // Add local bootstrap nodes for development
];

export default process.env.NODE_ENV === 'development' ? devBootstrapNodes : bootstrapNodes; 