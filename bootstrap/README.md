# Bootstrap Node Setup

This guide explains how to run a volunteer bootstrap node for HeyThere.

## What is a Bootstrap Node?

A bootstrap node helps new users discover the P2P network. It doesn't see or store messages - it only helps with initial peer discovery.

## Requirements

- Server with public IP or port forwarding
- Node.js 18+
- Open ports: 4001 (WebSocket), 4002 (TCP)

## Quick Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/the-o-space/HeyThere.git
   cd HeyThere/bootstrap
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your node:**
   Create `.env` file:
   ```
   PORT=4001
   ANNOUNCE_IP=YOUR_PUBLIC_IP
   ```

4. **Run bootstrap node:**
   ```bash
   npm start
   ```

5. **Get your multiaddr:**
   The console will display your multiaddr:
   ```
   Bootstrap node started with multiaddr:
   /ip4/YOUR_IP/tcp/4001/ws/p2p/QmYourPeerId
   ```

6. **Share your multiaddr:**
   - Submit PR to add to default bootstrap list
   - Post in community forum
   - Share with friends

## Running with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4001 4002
CMD ["npm", "start"]
```

```bash
docker build -t heythere-bootstrap .
docker run -p 4001:4001 -p 4002:4002 heythere-bootstrap
```

## Running with PM2

```bash
pm2 start npm --name "heythere-bootstrap" -- start
pm2 save
pm2 startup
```

## Security Considerations

- Use firewall to limit connections if needed
- Monitor bandwidth usage
- Consider using reverse proxy (nginx)
- Run as non-root user

## Monitoring

The bootstrap node logs:
- Connected peers count
- Bandwidth usage
- Error events

Check logs:
```bash
pm2 logs heythere-bootstrap
```

## Troubleshooting

**Port already in use:**
- Change PORT in .env file
- Check for other services on 4001

**Can't connect:**
- Verify firewall allows 4001/4002
- Check public IP is correct
- Test with: `telnet YOUR_IP 4001`

**High resource usage:**
- Limit max connections
- Add rate limiting
- Use cloud provider with DDoS protection 