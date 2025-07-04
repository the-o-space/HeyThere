# HeyThere Messenger

A location-based ephemeral messaging application built with Electron and WebRTC.

## Features

- **Location-based discovery**: Find and chat with people nearby
- **P2P messaging**: Direct peer-to-peer connections via WebRTC
- **Ephemeral**: Messages are not stored anywhere, exist only during the session
- **Privacy-focused**: Manual location input option for enhanced privacy
- **Federated**: Anyone can run their own discovery server
- **Modern UI**: Clean dark theme with smooth animations

## Installation

```bash
npm install
```

## Usage

### Running the Application

```bash
npm start
```

### Running a Discovery Server

Navigate to the discovery-server directory and install dependencies:

```bash
cd discovery-server
npm install
npm start
```

The discovery server will run on port 3001 by default. You can configure:
- Port: `PORT=3001 npm start`
- Proximity radius: `RADIUS=10 npm start` (in kilometers)

### Connecting to Nearby People

1. Enter your nickname (optional - will generate one if empty)
2. Enter your location:
   - Manually input latitude and longitude, or
   - Click the 📍 button to detect your current location
3. Enter discovery server URL (default: `ws://localhost:3001`)
4. Click "Connect to Nearby"

Once connected, you'll see a list of nearby people and can connect to chat with them.

## Development

```bash
# Run in development mode with DevTools
npm run dev

# Build for distribution
npm run make
```

## Architecture

- **Main Process** (`src/index.js`): Handles Electron window management and IPC
- **LocationNetworkManager** (`src/network/LocationNetworkManager.js`): Manages WebRTC connections and discovery
- **Discovery Server** (`discovery-server/server.js`): Facilitates location-based peer discovery
- **Renderer** (`src/renderer.js`): UI logic and user interactions
- **Preload** (`src/preload.js`): Secure bridge between main and renderer processes

## How It Works

1. Users connect to a discovery server with their location
2. The server matches users within a configurable radius (default 5km)
3. Matched users establish direct P2P connections via WebRTC
4. Messages are sent directly between peers
5. Discovery server only handles matching - messages never pass through it

## Privacy

- Location data is only used for proximity matching
- You can manually enter any coordinates for privacy
- Messages are never stored or logged
- P2P connections continue even if discovery server disconnects

## Running Your Own Discovery Server

The discovery server is designed to be federated. To run your own:

1. Deploy the discovery-server to any Node.js host
2. Configure your domain/IP and port
3. Share the WebSocket URL with your community

## Requirements

- Node.js 16 or higher
- npm or yarn

## License

MIT 