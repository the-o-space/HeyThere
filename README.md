# HeyThere Messenger

A decentralized, ephemeral messaging application built with Electron and Hyperswarm DHT.

## Features

- **Decentralized**: No central server required, uses DHT for peer discovery
- **Ephemeral**: Messages are not stored anywhere, exist only during the session
- **Simple**: Clean, modern UI with dark theme
- **Secure**: Electron's context isolation and secure IPC communication

## Installation

```bash
npm install
```

## Usage

### Running the Application

```bash
npm start
```

### Running a Bootstrap Server (Optional)

For initial peer discovery, you can run a bootstrap server:

```bash
node bootstrap/server.js
```

The bootstrap server will display connection information including:
- Bootstrap address (e.g., `localhost:4001`)
- Topic hex for direct connection

### Connecting to a Chat Room

1. **Using a Bootstrap Server**: Enter the bootstrap address (e.g., `localhost:4001`)
2. **Using Topic Hex**: Enter the topic hex directly to join a specific room

## Development

```bash
# Run in development mode with DevTools
npm run dev

# Build for distribution
npm run make
```

## Architecture

- **Main Process** (`src/index.js`): Handles Electron window management and IPC
- **NetworkManager** (`src/network/NetworkManager.js`): Manages DHT connections and messaging
- **Renderer** (`src/renderer.js`): UI logic and user interactions
- **Preload** (`src/preload.js`): Secure bridge between main and renderer processes

## How It Works

1. The app uses Hyperswarm to create a DHT network
2. Peers discover each other through the DHT using a shared topic
3. Messages are broadcast directly between connected peers
4. No messages are stored - everything is ephemeral

## Requirements

- Node.js 16 or higher
- npm or yarn

## License

MIT 