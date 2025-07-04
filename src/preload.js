// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('messenger', {
  connect: (serverUrl, options) => ipcRenderer.invoke('connect', serverUrl, options),
  updateLocation: (lat, lon) => ipcRenderer.invoke('updateLocation', lat, lon),
  connectToPeer: (peerId) => ipcRenderer.invoke('connectToPeer', peerId),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  sendMessage: (message) => ipcRenderer.invoke('sendMessage', message),
  
  // Event listeners
  onPeerJoined: (callback) => {
    ipcRenderer.on('peer-joined', (event, peerId) => callback(peerId));
  },
  
  onPeerLeft: (callback) => {
    ipcRenderer.on('peer-left', (event, peerId) => callback(peerId));
  },
  
  onMessage: (callback) => {
    ipcRenderer.on('message', (event, data) => callback(data));
  },
  
  onConnected: (callback) => {
    ipcRenderer.on('connected', () => callback());
  },
  
  onDisconnected: (callback) => {
    ipcRenderer.on('disconnected', () => callback());
  },
  
  onNearbyPeers: (callback) => {
    ipcRenderer.on('nearbyPeers', (event, peers) => callback(peers));
  },
  
  onDiscoveryDisconnected: (callback) => {
    ipcRenderer.on('discovery-disconnected', () => callback());
  },
  
  onError: (callback) => {
    ipcRenderer.on('error', (event, error) => callback(error));
  }
});
