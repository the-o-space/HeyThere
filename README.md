# Proximity P2P Chat - Decentralized Proximity Messenger

A privacy-friendly, decentralized chat web app for real-time communication with people physically nearby. No centralized server, no persistence, no tracking. Works in browsers on desktop and mobile devices.

## Project Overview

Proximity P2P Chat enables real-time chat with users in the same geographic "cell" using peer-to-peer networking and geolocation. All data is ephemeral - when users leave, messages vanish completely.

**Core Features:**
- Mobile-friendly web app for modern browsers (Android, iOS, desktop)
- Geographic cell-based chat (e.g., 500m grid squares)
- No user accounts, tracking, or chat history
- Volunteer-run bootstrap nodes for network discovery
- Completely ephemeral messaging

## Tech Stack

- **Frontend:** React (or Vue/Plain JS), mobile-first CSS
- **P2P Networking:** libp2p in browser (WebRTC, WebSockets, PubSub)
- **Location:** Browser Geolocation API with manual override
- **Bootstrap:** Volunteer-run nodes
- **Hosting:** Static hosting (Netlify, Vercel, GitHub Pages)

## Architecture

Users get location permission, snap coordinates to a grid cell, and join a PubSub topic for that cell. P2P discovery and messaging occurs within the cell. Bootstrap nodes provide initial network discovery only - they don't store data or see messages.

## Quick Start

1. **Clone and install:**
   ```bash
   git clone https://github.com/yourusername/proximity-p2p-chat.git
   cd proximity-p2p-chat
   npm install
   ```

2. **Configure bootstrap nodes in `src/config/bootstrapNodes.js`:**
   ```javascript
   export default [
     '/ip4/203.0.113.42/tcp/4001/ws/p2p/QmPeerIdBootstrap1',
     // Add more multiaddrs as available
   ]
   ```

3. **Run locally:**
   ```bash
   npm start
   ```
   Open http://localhost:3000

4. **Deploy:** Use any static hosting service

## Running a Bootstrap Node

1. Clone repo on server with public IP or port forwarding
2. Run `npm run bootstrap` (see `/bootstrap/README.md`)
3. Share your multiaddr: `/ip4/YOUR_IP/tcp/4001/ws/p2p/QmYourPeerId...`

## Project Structure

```
proximity-p2p-chat/
├── public/
├── src/
│   ├── components/        # React/Vue components
│   ├── libp2p/            # libp2p configuration and logic
│   ├── config/            # Bootstrap nodes, cell logic
│   └── App.js
└── bootstrap/             # Bootstrap node setup instructions
```

## Implementation Requirements

- **Geolocation:** Browser geolocation API with cell grid snapping
- **P2P Network:** libp2p with WebRTC transport for direct connections
- **PubSub:** Topic-based messaging for cell-specific chat rooms
- **Bootstrap Discovery:** Static list of volunteer nodes for initial peer discovery
- **Mobile Support:** Responsive design for mobile browsers
- **Privacy:** No data persistence, fuzzy location matching only

## Features Roadmap

- Geographic cell-based group chat
- Mobile browser support
- Volunteer bootstrap network
- Direct 1:1 P2P messaging
- Optional message encryption
- Geolocation + manual cell override
- Web push notifications (if possible)

## Privacy & Security

- Only fuzzy cell IDs used for matching, never precise coordinates
- Zero data persistence when no users online
- No tracking, accounts, or message history
- Local, real-time P2P communication only

## Contributing

To run a bootstrap node, submit your multiaddr via PR to `/src/config/bootstrapNodes.js` or open an issue. All contributions welcome.

## License

MIT
