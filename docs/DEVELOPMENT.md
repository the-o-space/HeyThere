# Development Guide

This guide helps new developers get started with the HeyThere proximity chat project.

## Project Structure

```
src/
├── components/     # React UI components
├── services/       # Core services (P2P, geolocation)
├── config/         # Configuration files
├── utils/          # Helper functions
├── hooks/          # React hooks
└── pages/          # Page components

bootstrap/          # Bootstrap node code
docs/              # Documentation
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Core Services

### P2P Service (`src/services/p2p.js`)
Handles all peer-to-peer networking:
- Initialize P2P node: `p2p.init()`
- Join a cell: `p2p.joinCell(cellId)`
- Send message: `p2p.sendMessage(message)`
- Listen for messages: `p2p.onMessage(id, handler)`

### Geolocation Service (`src/services/geolocation.js`)
Manages location and cell calculation:
- Get current location: `geo.getCurrentLocation()`
- Convert to cell: `geo.coordinatesToCell(lat, lon)`
- Watch location: `geo.watchLocation(callback)`

## Development Workflow

### Adding a New Component

1. Create component in `src/components/`
2. Use clear, descriptive names
3. Add JSDoc comments for props
4. Example:

```jsx
/**
 * Chat message component
 * @param {Object} props
 * @param {string} props.text - Message text
 * @param {string} props.from - Sender ID
 * @param {number} props.timestamp - Unix timestamp
 */
function ChatMessage({ text, from, timestamp }) {
  // Component logic
}
```

### Testing Locally

1. **Without location:** Use manual cell override
2. **With mock peers:** Run multiple browser tabs
3. **With local bootstrap:** See `/bootstrap/README.md`

### Common Tasks

**Adding a bootstrap node:**
1. Edit `src/config/bootstrapNodes.js`
2. Add multiaddr string to array

**Changing cell size:**
1. Edit `CELL_SIZE_METERS` in `src/services/geolocation.js`
2. Default is 500m

**Debugging P2P connections:**
1. Check browser console for peer events
2. Verify bootstrap nodes are reachable
3. Check WebRTC/WebSocket connectivity

## Key Concepts

### Cell IDs
- Format: `{latCell}_{lonCell}`
- Example: `1234_5678`
- Calculated by snapping coordinates to grid

### P2P Topics
- Format: `proximity-chat-cell-{cellId}`
- All peers in same cell subscribe to same topic

### Message Format
```json
{
  "text": "Hello!",
  "from": "QmPeerId...",
  "timestamp": 1234567890
}
```

## Troubleshooting

**No peers connecting:**
- Check bootstrap nodes are configured
- Verify no firewall blocking
- Try different network (mobile hotspot)

**Location not working:**
- Check browser permissions
- Test with manual cell entry
- Verify HTTPS in production

**Messages not sending:**
- Ensure joined a cell first
- Check P2P node is initialized
- Verify peer connections

## Resources

- [libp2p docs](https://docs.libp2p.io/)
- [WebRTC guide](https://webrtc.org/getting-started/overview)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) 