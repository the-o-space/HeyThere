#!/usr/bin/env node

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3001;
const PROXIMITY_RADIUS_KM = process.env.RADIUS || 5; // Default 5km radius

// Active connections indexed by geohash
const peersByLocation = new Map();
const connections = new Map();

// Simple in-memory rate limiting
const rateLimits = new Map();

/**
 * Calculate distance between two coordinates in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Generate geohash for grouping nearby peers
 */
function getGeohash(lat, lon, precision = 4) {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (lon > mid) {
        idx |= (1 << (4 - bit));
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        idx |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    evenBit = !evenBit;

    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/**
 * Find nearby peers within radius
 */
function findNearbyPeers(location, radius = PROXIMITY_RADIUS_KM) {
  const nearbyPeers = [];
  const geohash = getGeohash(location.lat, location.lon);
  
  // Check same geohash and neighboring geohashes
  for (const [hash, peers] of peersByLocation) {
    if (Math.abs(hash.length - geohash.length) <= 1) {
      for (const peer of peers.values()) {
        if (peer.id !== location.peerId) {
          const distance = calculateDistance(
            location.lat, location.lon,
            peer.location.lat, peer.location.lon
          );
          
          if (distance <= radius) {
            nearbyPeers.push({
              id: peer.id,
              nickname: peer.nickname,
              distance: Math.round(distance * 100) / 100,
              signaling: peer.signaling
            });
          }
        }
      }
    }
  }
  
  return nearbyPeers.sort((a, b) => a.distance - b.distance);
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const peerId = crypto.randomBytes(16).toString('hex');
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`[${new Date().toLocaleTimeString()}] New connection: ${peerId} from ${clientIp}`);
  
  // Rate limiting check
  const now = Date.now();
  const lastConnect = rateLimits.get(clientIp) || 0;
  if (now - lastConnect < 1000) { // 1 second cooldown
    ws.close(1008, 'Rate limit exceeded');
    return;
  }
  rateLimits.set(clientIp, now);
  
  // Initialize connection
  const connection = {
    id: peerId,
    ws,
    location: null,
    nickname: null,
    signaling: null,
    lastActivity: now
  };
  
  connections.set(peerId, connection);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    peerId,
    config: {
      radius: PROXIMITY_RADIUS_KM,
      maxPeers: 50
    }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(connection, data);
    } catch (err) {
      console.error('Invalid message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(connection);
  });
  
  ws.on('error', (err) => {
    console.error(`WebSocket error for ${peerId}:`, err);
    handleDisconnect(connection);
  });
});

/**
 * Handle incoming messages
 */
function handleMessage(connection, message) {
  connection.lastActivity = Date.now();
  
  switch (message.type) {
    case 'updateLocation':
      handleLocationUpdate(connection, message);
      break;
      
    case 'signal':
      handleSignaling(connection, message);
      break;
      
    case 'disconnect':
      handleDisconnect(connection);
      break;
      
    default:
      connection.ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Unknown message type: ${message.type}` 
      }));
  }
}

/**
 * Handle location updates
 */
function handleLocationUpdate(connection, message) {
  const { lat, lon, nickname } = message;
  
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lon !== 'number' ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    connection.ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Invalid coordinates' 
    }));
    return;
  }
  
  // Remove from old location
  if (connection.location) {
    const oldGeohash = getGeohash(connection.location.lat, connection.location.lon);
    const oldPeers = peersByLocation.get(oldGeohash);
    if (oldPeers) {
      oldPeers.delete(connection.id);
      if (oldPeers.size === 0) {
        peersByLocation.delete(oldGeohash);
      }
    }
  }
  
  // Update location
  connection.location = { lat, lon };
  connection.nickname = nickname || `User_${connection.id.substring(0, 6)}`;
  
  // Add to new location
  const geohash = getGeohash(lat, lon);
  if (!peersByLocation.has(geohash)) {
    peersByLocation.set(geohash, new Map());
  }
  peersByLocation.get(geohash).set(connection.id, connection);
  
  // Find nearby peers
  const nearbyPeers = findNearbyPeers({
    lat, lon,
    peerId: connection.id
  });
  
  // Notify the peer about nearby users
  connection.ws.send(JSON.stringify({
    type: 'nearbyPeers',
    peers: nearbyPeers.map(p => ({
      id: p.id,
      nickname: p.nickname,
      distance: p.distance
    }))
  }));
  
  // Store signaling info for WebRTC
  connection.signaling = {
    id: connection.id,
    nickname: connection.nickname
  };
  
  console.log(`[${new Date().toLocaleTimeString()}] ${connection.nickname} updated location: ${geohash} (${nearbyPeers.length} nearby)`);
}

/**
 * Handle WebRTC signaling
 */
function handleSignaling(connection, message) {
  const { targetId, signal } = message;
  const target = connections.get(targetId);
  
  if (!target || !target.ws || target.ws.readyState !== WebSocket.OPEN) {
    connection.ws.send(JSON.stringify({
      type: 'error',
      message: 'Target peer not found or disconnected'
    }));
    return;
  }
  
  // Verify peers are nearby
  if (connection.location && target.location) {
    const distance = calculateDistance(
      connection.location.lat, connection.location.lon,
      target.location.lat, target.location.lon
    );
    
    if (distance > PROXIMITY_RADIUS_KM) {
      connection.ws.send(JSON.stringify({
        type: 'error',
        message: 'Target peer is out of range'
      }));
      return;
    }
  }
  
  // Forward signal
  target.ws.send(JSON.stringify({
    type: 'signal',
    fromId: connection.id,
    fromNickname: connection.nickname,
    signal
  }));
}

/**
 * Handle peer disconnect
 */
function handleDisconnect(connection) {
  // Remove from location index
  if (connection.location) {
    const geohash = getGeohash(connection.location.lat, connection.location.lon);
    const peers = peersByLocation.get(geohash);
    if (peers) {
      peers.delete(connection.id);
      if (peers.size === 0) {
        peersByLocation.delete(geohash);
      }
    }
  }
  
  // Remove from connections
  connections.delete(connection.id);
  
  // Close WebSocket
  if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
    connection.ws.close();
  }
  
  console.log(`[${new Date().toLocaleTimeString()}] Peer disconnected: ${connection.nickname || connection.id}`);
}

// REST API endpoints
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    peers: connections.size,
    locations: peersByLocation.size,
    uptime: process.uptime()
  });
});

// Server info
app.get('/info', (req, res) => {
  res.json({
    name: 'HeyThere Discovery Server',
    version: '1.0.0',
    radius: PROXIMITY_RADIUS_KM,
    protocol: 'ws',
    federationEnabled: true
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`HeyThere Discovery Server running on port ${PORT}`);
  console.log(`Proximity radius: ${PROXIMITY_RADIUS_KM}km`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Cleanup inactive connections periodically
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 1 minute
  
  for (const [id, conn] of connections) {
    if (now - conn.lastActivity > timeout) {
      console.log(`Removing inactive peer: ${id}`);
      handleDisconnect(conn);
    }
  }
  
  // Clean up old rate limits
  for (const [ip, time] of rateLimits) {
    if (now - time > 60000) {
      rateLimits.delete(ip);
    }
  }
}, 30000); // Every 30 seconds 