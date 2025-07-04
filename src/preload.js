// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('messenger', {
  connect: (bootstrapAddress) => ipcRenderer.invoke('connect', bootstrapAddress),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  sendMessage: (message) => ipcRenderer.invoke('sendMessage', message),
  
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
  }
});
