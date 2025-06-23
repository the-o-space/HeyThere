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
  '/ip4/127.0.0.1/tcp/4001/ws/p2p/12D3KooWGoApCT8yP6xC6JDBMHdW5toCnMSFY1ykyuoR6Ssyr7Ck',
  '/ip4/192.168.50.77/tcp/4001/ws/p2p/12D3KooWGoApCT8yP6xC6JDBMHdW5toCnMSFY1ykyuoR6Ssyr7Ck',
  '/ip4/127.0.0.1/tcp/4002/p2p/12D3KooWGoApCT8yP6xC6JDBMHdW5toCnMSFY1ykyuoR6Ssyr7Ck',
  '/ip4/192.168.50.77/tcp/4002/p2p/12D3KooWGoApCT8yP6xC6JDBMHdW5toCnMSFY1ykyuoR6Ssyr7Ck',
];

export default process.env.NODE_ENV === 'development' ? devBootstrapNodes : bootstrapNodes; 